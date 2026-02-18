'use client'

import { Fragment, useState, useCallback, useRef, useEffect } from 'react'
import { apiClient, ReleaseValidationReport, ReleaseInfo, ArtifactValidationResult, ValidationResult, ConfigInfo } from '@/lib/api'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'

interface ReleaseUploadProps {
  onFileUploaded: (fileData: { fileId: string; fileName: string; fileType: string }) => void
  onValidationComplete: (report: ReleaseValidationReport) => void
  uploadedFile: { fileId: string; fileName: string; fileType: string } | null
}

export default function ReleaseUpload({
  onFileUploaded,
  onValidationComplete,
  uploadedFile,
}: ReleaseUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validatingArtifacts, setValidatingArtifacts] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null)
  const [artifactValidations, setArtifactValidations] = useState<Map<string, ArtifactValidationResult>>(new Map())
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [progressStatus, setProgressStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Artifact detail view state
  const [selectedArtifactResult, setSelectedArtifactResult] = useState<ArtifactValidationResult | null>(null)
  const [detailFilterSeverity, setDetailFilterSeverity] = useState<string>('all')
  const [detailFilterStatus, setDetailFilterStatus] = useState<string>('all')
  const [detailSearchQuery, setDetailSearchQuery] = useState<string>('')
  const [detailExpandedRules, setDetailExpandedRules] = useState<Record<string, boolean>>({})
  type SortColumn = 'ruleId' | 'severity' | 'status' | 'occurrences'
  const [detailSortBy, setDetailSortBy] = useState<SortColumn>('ruleId')
  const [detailSortOrder, setDetailSortOrder] = useState<'asc' | 'desc'>('asc')

  // Config management
  const [configList, setConfigList] = useState<ConfigInfo[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [loadingConfigs, setLoadingConfigs] = useState(true)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('blueprism')

  // Load configs on mount
  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    setLoadingConfigs(true)
    try {
      const configs = await apiClient.getConfigsByPlatform(selectedPlatform)
      setConfigList(configs)

      // Select default config if available
      const defaultConfig = configs.find(c => c.isDefault)
      if (defaultConfig) {
        setSelectedConfigId(defaultConfig.configId)
      } else if (configs.length > 0) {
        setSelectedConfigId(configs[0].configId)
      }
    } catch (err: any) {
      console.error('Failed to load configurations:', err)
      setConfigList([])
      setSelectedConfigId(null)
    } finally {
      setLoadingConfigs(false)
    }
  }

  // Reload configs when platform changes
  useEffect(() => {
    if (selectedPlatform) {
      loadConfigs()
    }
  }, [selectedPlatform])

  const resetProgress = useCallback(() => {
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current)
      progressTimeoutRef.current = null
    }
    setProgress(0)
    setProgressMessage(null)
    setProgressStatus('idle')
  }, [])

  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current)
      }
    }
  }, [])


  const getValidExtensions = (platform: string): string[] => {
    switch (platform) {
      case 'blueprism':
        return ['.bprelease', '.bpprocess', '.bpobject']
      case 'powerautomate':
        return ['.zip']
      case 'uipath':
        return ['.nupkg', '.zip']
      case 'automationanywhere':
        return ['.json']
      default:
        return ['.bprelease']
    }
  }
  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      resetProgress()
      setProgressStatus('running')
      setProgress(5)
      setProgressMessage('Preparing upload...')
      setIsUploading(true)

      try {
        const validExtensions = getValidExtensions(selectedPlatform)
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
        const isReleaseFile = fileExtension === '.bprelease'

        if (!validExtensions.includes(fileExtension)) {
          throw new Error(`Invalid file type for ${selectedPlatform}. Please upload one of: ${validExtensions.join(", ")}`)
        }

        setProgress(12)
        setProgressMessage('Uploading file...')
        const uploadedFileData = await apiClient.uploadFile(file)

        onFileUploaded({
          fileId: uploadedFileData.fileId,
          fileName: uploadedFileData.fileName,
          fileType: uploadedFileData.fileType,
        })

        if (!isReleaseFile) {
          // For single artifacts (.bpprocess, .bpobject, etc.), just complete the upload
          // The parent component will switch to FileUpload component
          setReleaseInfo(null)
          setArtifactValidations(new Map())
          setExpandedGroups({})
          setProgress(100)
          setProgressMessage('File uploaded successfully.')
          setProgressStatus('success')
          progressTimeoutRef.current = setTimeout(() => {
            resetProgress()
          }, 1500)
          return
        }

        setProgress(55)
        setProgressMessage('Upload complete. Analyzing release contents...')

        const info = await apiClient.getReleaseInfo(uploadedFileData.fileId)

        setProgress(85)
        setProgressMessage('Finalizing release analysis...')

        setReleaseInfo(info)
        setExpandedGroups(
          Object.fromEntries((info.artifactGroups ?? []).map((group) => [group.groupName, true]))
        )
        setArtifactValidations(new Map())

        setProgress(100)
        setProgressMessage('Release analysis complete.')
        setProgressStatus('success')
        progressTimeoutRef.current = setTimeout(() => {
          resetProgress()
        }, 2000)
      } catch (err: any) {
        if (progressTimeoutRef.current) {
          clearTimeout(progressTimeoutRef.current)
          progressTimeoutRef.current = null
        }
        const message = err?.message || 'Failed to process release'
        setError(message)
        setProgressStatus('error')
        setProgress(100)
        setProgressMessage(message)
      } finally {
        setIsUploading(false)
      }
    },
    [onFileUploaded, resetProgress, selectedPlatform]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        await handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        await handleFile(files[0])
      }
    },
    [handleFile]
  )


  const handleValidateAll = async () => {
    if (!uploadedFile) return

    setError(null)
    setIsValidating(true)

    try {
      const report = await apiClient.validateRelease({
        fileId: uploadedFile.fileId,
        ruleConfigId: selectedConfigId || undefined,
        platform: selectedPlatform,
      })
      onValidationComplete(report)
    } catch (err: any) {
      setError(err.message || 'Failed to validate release')
    } finally {
      setIsValidating(false)
    }
  }

  const handleValidateArtifact = async (artifactId: string) => {
    if (!uploadedFile) return

    setError(null)
    setValidatingArtifacts(prev => new Set(prev).add(artifactId))

    try {
      const result = await apiClient.validateArtifact({
        fileId: uploadedFile.fileId,
        artifactId: artifactId,
        ruleConfigId: selectedConfigId || undefined,
        platform: selectedPlatform,
      })

      setArtifactValidations(prev => new Map(prev).set(artifactId, result))
    } catch (err: any) {
      setError(err.message || 'Failed to validate artifact')
    } finally {
      setValidatingArtifacts(prev => {
        const newSet = new Set(prev)
        newSet.delete(artifactId)
        return newSet
      })
    }
  }

  const getRuleGroupsForArtifact = (artifactType: string): string[] => {
    if (artifactType === 'Object') {
      return ['Variables', 'Pages', 'APM', 'Security', 'Environment Variable', 'General']
    } else if (artifactType === 'Process') {
      return ['Variables', 'Pages', 'Security', 'Environment Variable', 'WAIT', 'Navigation', 'Work Queue', 'General', 'Exceptions', 'Logging']
    } else if (artifactType === 'Process Template') {
      return ['Variables', 'Pages', 'Security', 'Environment Variable', 'WAIT', 'Navigation', 'Work Queue', 'General', 'Exceptions', 'Logging']
    } else if (artifactType === 'Object Template') {
      return ['Variables', 'Pages', 'APM', 'Security', 'Environment Variable', 'General']
    } else if (artifactType === 'Work Queue') {
      return ['Work Queue']
    } else if (artifactType === 'Environment Variable') {
      return ['Environment Variable']
    }
    return []
  }

  const handleViewResults = (artifactId: string) => {
    const result = artifactValidations.get(artifactId)
    if (result) {
      setSelectedArtifactResult(result)
      setDetailFilterSeverity('all')
      setDetailFilterStatus('all')
      setDetailSearchQuery('')
      setDetailExpandedRules({})
      setDetailSortBy('ruleId')
      setDetailSortOrder('asc')
    }
  }

  const handleBackToArtifacts = () => {
    setSelectedArtifactResult(null)
  }

  // ─── Export Helpers ──────────────────────────────────────────────────

  const formatMessagesForExport = (result: ValidationResult) => {
    if (!result.messages.length) return 'Rule passed'
    return result.messages
      .map((msg) => {
        const parts: string[] = [msg.message]
        if (msg.detail) parts.push(`Detail: ${msg.detail}`)
        const loc: string[] = []
        if (msg.location?.pageName) loc.push(`Page: ${msg.location.pageName}`)
        if (msg.location?.stageName) loc.push(`Stage: ${msg.location.stageName}`)
        if (msg.location?.lineNumber) loc.push(`Line: ${msg.location.lineNumber}`)
        if (loc.length > 0) parts.push(loc.join(', '))
        return parts.join(' | ')
      })
      .join(' | ')
  }

  const getExportRows = (results: ValidationResult[]) =>
    results.map((r) => ({
      'Rule ID': r.ruleId,
      'Rule Name': r.ruleName,
      Status: r.passed ? 'Passed' : 'Failed',
      Severity: r.severity,
      Occurrences: r.occurrences ?? r.messages.length,
      Description: r.description,
      Messages: formatMessagesForExport(r),
    }))

  const exportArtifactCSV = (art: ArtifactValidationResult) => {
    const csv = Papa.unparse(getExportRows(art.results))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `validation-${art.artifactName}-${Date.now()}.csv`
    link.click()
  }

  const exportArtifactExcel = (art: ArtifactValidationResult) => {
    const ws = XLSX.utils.json_to_sheet(getExportRows(art.results))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Validation Results')
    const summary = [
      ['Artifact Validation Report'],
      ['Artifact', art.artifactName],
      ['Type', art.artifactType],
      ['Total Rules', art.summary.totalRules],
      ['Passed', art.summary.passed],
      ['Failed', art.summary.failed],
      ['Warnings', art.summary.warnings],
      ['Duration (ms)', art.summary.durationMs],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary')
    XLSX.writeFile(wb, `validation-${art.artifactName}-${Date.now()}.xlsx`)
  }

  const exportArtifactPDF = (art: ArtifactValidationResult) => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.setTextColor(26, 72, 140)
    doc.text('Artifact Validation Report', 14, 20)
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(`Artifact: ${art.artifactName}`, 14, 30)
    doc.text(`Type: ${art.artifactType}`, 14, 37)
    doc.text(`Total Rules: ${art.summary.totalRules} | Passed: ${art.summary.passed} | Failed: ${art.summary.failed}`, 14, 44)
    const tableData = art.results.map((r) => [
      r.ruleId,
      r.passed ? 'Pass' : 'Fail',
      r.severity,
      r.occurrences ?? r.messages.length,
      r.description.substring(0, 60) + (r.description.length > 60 ? '...' : ''),
      formatMessagesForExport(r).substring(0, 60),
    ])
    autoTable(doc, {
      startY: 50,
      head: [['Rule ID', 'Status', 'Severity', 'Occurrences', 'Description', 'Messages']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 72, 140], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })
    doc.save(`validation-${art.artifactName}-${Date.now()}.pdf`)
  }

  const toggleDetailRule = (ruleId: string) => {
    setDetailExpandedRules((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }))
  }

  const handleDetailSort = (column: SortColumn) => {
    if (detailSortBy === column) {
      setDetailSortOrder(detailSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setDetailSortBy(column)
      setDetailSortOrder('asc')
    }
  }

  const getFilteredSortedResults = (results: ValidationResult[]) => {
    return results
      .filter((result) => {
        if (detailFilterSeverity !== 'all' && result.severity.toLowerCase() !== detailFilterSeverity) return false
        if (detailFilterStatus === 'passed' && !result.passed) return false
        if (detailFilterStatus === 'failed' && result.passed) return false
        if (detailSearchQuery) {
          const query = detailSearchQuery.toLowerCase()
          return (
            result.ruleId.toLowerCase().includes(query) ||
            result.ruleName.toLowerCase().includes(query) ||
            result.description.toLowerCase().includes(query) ||
            result.messages.some((msg) =>
              msg.message.toLowerCase().includes(query) ||
              msg.location?.pageName?.toLowerCase().includes(query) ||
              msg.location?.stageName?.toLowerCase().includes(query)
            )
          )
        }
        return true
      })
      .sort((a, b) => {
        let comparison = 0
        if (detailSortBy === 'ruleId') comparison = a.ruleId.localeCompare(b.ruleId)
        else if (detailSortBy === 'severity') {
          const order = { Error: 0, Warning: 1, Info: 2 }
          comparison = (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3)
        } else if (detailSortBy === 'status') comparison = (a.passed ? 1 : 0) - (b.passed ? 1 : 0)
        else if (detailSortBy === 'occurrences') comparison = (a.occurrences ?? 0) - (b.occurrences ?? 0)
        return detailSortOrder === 'asc' ? comparison : -comparison
      })
  }

  const progressPercentage = Math.min(Math.max(progress, 0), 100)
  const progressBarColor =
    progressStatus === 'error'
      ? 'bg-red-500'
      : progressStatus === 'success'
      ? 'bg-green-500'
      : 'bg-blueprism-blue'

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-blueprism-darkblue mb-6">
        {uploadedFile ? 'Release Details' : 'Upload File'}
      </h2>

      {progressMessage && (
        <div
          className={`mb-6 border rounded-lg p-4 ${
            progressStatus === 'error'
              ? 'border-red-200 bg-red-50'
              : progressStatus === 'success'
              ? 'border-green-200 bg-green-50'
              : 'border-blueprism-blue bg-blueprism-lightblue'
          }`}
        >
          <div className="flex items-center justify-between text-sm">
            <span
              className={`${
                progressStatus === 'error' ? 'text-red-700' : progressStatus === 'success' ? 'text-green-700' : 'text-blueprism-darkblue'
              } font-medium flex items-center space-x-2`}
            >
              {progressStatus === 'running' && (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {progressStatus === 'success' && (
                <svg
                  className="h-4 w-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {progressStatus === 'error' && (
                <svg
                  className="h-4 w-4 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{progressMessage}</span>
            </span>
            {progressStatus !== 'error' && (
              <span className="text-xs text-gray-600">{progressPercentage}%</span>
            )}
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${progressBarColor}`}
              style={{ width: `${progressStatus === 'error' ? 100 : progressPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {!uploadedFile ? (
        <>
          {/* Platform Selector */}
          <div className="mb-6 space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Automation Platform
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
            >
              <option value="blueprism">Blue Prism</option>
              <option value="powerautomate">Power Automate</option>
              <option value="uipath">UiPath</option>
              <option value="automationanywhere">Automation Anywhere</option>
            </select>
            <p className="text-xs text-gray-500">
              Select the automation platform for your release package
            </p>
          </div>

          {/* Config Selector */}
          <div className="mb-6 space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Rule Configuration
            </label>
            {loadingConfigs ? (
              <div className="flex items-center justify-center py-2">
                <svg className="animate-spin h-5 w-5 text-blueprism-blue" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <select
                value={selectedConfigId || ''}
                onChange={(e) => setSelectedConfigId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
              >
                {configList.map((cfg) => (
                  <option key={cfg.configId} value={cfg.configId}>
                    {cfg.name} {cfg.isDefault && '(Default)'} - {cfg.activeRules}/{cfg.totalRules} active
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500">
              Showing {selectedPlatform} configurations only
            </p>
          </div>

          <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-blueprism-blue bg-blueprism-lightblue'
              : 'border-gray-300 hover:border-blueprism-blue'
          }`}
        >
          <div className="space-y-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div>
              <label
                htmlFor="file-upload"
                className="cursor-pointer rounded-md bg-blueprism-blue px-6 py-3 text-white font-medium hover:bg-blueprism-darkblue transition-colors inline-block"
              >
                Choose Release File
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept={getValidExtensions(selectedPlatform).join(',')}
                  onChange={handleFileInput}
                  disabled={isUploading}
                />
              </label>
            </div>

            <p className="text-sm text-gray-600">or drag and drop</p>
            <p className="text-xs text-gray-500">
              {getValidExtensions(selectedPlatform).join(', ')} files
            </p>
          </div>
        </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* File uploaded card */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">{uploadedFile.fileName}</p>
                  <p className="text-sm text-gray-600">Release Package</p>
                </div>
              </div>
              <button
                onClick={() => {
                  onFileUploaded(null as any)
                  setReleaseInfo(null)
                  setArtifactValidations(new Map())
                  setExpandedGroups({})
                  setValidatingArtifacts(new Set<string>())
                  setError(null)
                  resetProgress()
                }}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Remove
              </button>
            </div>
          </div>

          {releaseInfo && selectedArtifactResult && (
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={handleBackToArtifacts}
                className="flex items-center space-x-2 text-blueprism-blue hover:text-blueprism-darkblue font-medium transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Artifacts</span>
              </button>

              {/* Artifact Summary Card */}
              {(() => {
                const detailPassRate = selectedArtifactResult.summary.totalRules === 0
                  ? 0
                  : Math.round((selectedArtifactResult.summary.passed / selectedArtifactResult.summary.totalRules) * 100)
                const filteredResults = getFilteredSortedResults(selectedArtifactResult.results)

                return (
                  <>
                    <div className="bg-gradient-to-r from-blueprism-blue to-blueprism-darkblue rounded-lg p-6 text-white">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm opacity-90">Artifact</p>
                          <p className="text-lg font-bold truncate" title={selectedArtifactResult.artifactName}>{selectedArtifactResult.artifactName}</p>
                          <p className="text-xs opacity-75">{selectedArtifactResult.artifactType}</p>
                        </div>
                        <div>
                          <p className="text-sm opacity-90">Total Rules</p>
                          <p className="text-lg font-bold">{selectedArtifactResult.summary.totalRules}</p>
                        </div>
                        <div>
                          <p className="text-sm opacity-90">Pass Rate</p>
                          <p className="text-lg font-bold">{detailPassRate}%</p>
                        </div>
                        <div>
                          <p className="text-sm opacity-90">Duration</p>
                          <p className="text-lg font-bold">{selectedArtifactResult.summary.durationMs}ms</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="bg-white bg-opacity-20 rounded p-3 text-center">
                          <p className="text-2xl font-bold">{selectedArtifactResult.summary.passed}</p>
                          <p className="text-sm">Passed</p>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded p-3 text-center">
                          <p className="text-2xl font-bold">{selectedArtifactResult.summary.failed}</p>
                          <p className="text-sm">Failed</p>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded p-3 text-center">
                          <p className="text-2xl font-bold">{selectedArtifactResult.summary.warnings}</p>
                          <p className="text-sm">Warnings</p>
                        </div>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex-1 min-w-[300px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                        <input
                          type="text"
                          value={detailSearchQuery}
                          onChange={(e) => setDetailSearchQuery(e.target.value)}
                          placeholder="Search by rule ID, name, description, or location..."
                          className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                          value={detailFilterStatus}
                          onChange={(e) => setDetailFilterStatus(e.target.value)}
                          className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
                        >
                          <option value="all">All</option>
                          <option value="passed">Passed Only</option>
                          <option value="failed">Failed Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                        <select
                          value={detailFilterSeverity}
                          onChange={(e) => setDetailFilterSeverity(e.target.value)}
                          className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
                        >
                          <option value="all">All</option>
                          <option value="error">Error</option>
                          <option value="warning">Warning</option>
                          <option value="info">Info</option>
                        </select>
                      </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => exportArtifactCSV(selectedArtifactResult)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export CSV</span>
                      </button>
                      <button
                        onClick={() => exportArtifactExcel(selectedArtifactResult)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export Excel</span>
                      </button>
                      <button
                        onClick={() => exportArtifactPDF(selectedArtifactResult)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>Export PDF</span>
                      </button>
                    </div>

                    {/* Results Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleDetailSort('status')}>
                              <div className="flex items-center space-x-1">
                                <span>Status</span>
                                {detailSortBy === 'status' && <span>{detailSortOrder === 'asc' ? '\u2191' : '\u2193'}</span>}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleDetailSort('ruleId')}>
                              <div className="flex items-center space-x-1">
                                <span>Rule ID</span>
                                {detailSortBy === 'ruleId' && <span>{detailSortOrder === 'asc' ? '\u2191' : '\u2193'}</span>}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleDetailSort('severity')}>
                              <div className="flex items-center space-x-1">
                                <span>Severity</span>
                                {detailSortBy === 'severity' && <span>{detailSortOrder === 'asc' ? '\u2191' : '\u2193'}</span>}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleDetailSort('occurrences')}>
                              <div className="flex items-center space-x-1">
                                <span>Occurrences</span>
                                {detailSortBy === 'occurrences' && <span>{detailSortOrder === 'asc' ? '\u2191' : '\u2193'}</span>}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredResults.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                No results match the selected filters
                              </td>
                            </tr>
                          ) : (
                            filteredResults.map((result, index) => (
                              <Fragment key={`${result.ruleId}-${index}`}>
                                <tr
                                  className={`cursor-pointer ${result.passed ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'} transition-colors`}
                                  onClick={() => { if (result.messages.length > 0) toggleDetailRule(result.ruleId) }}
                                >
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center space-x-3">
                                      <span className="text-gray-500">
                                        {result.messages.length > 0 ? (detailExpandedRules[result.ruleId] ? '\u2212' : '+') : '\u2013'}
                                      </span>
                                      {result.passed ? (
                                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      ) : (
                                        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      )}
                                      <span className="ml-2 text-sm font-medium text-gray-900">{result.passed ? 'Pass' : 'Fail'}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{result.ruleId}</div>
                                    <div className="text-xs text-gray-500">{result.ruleName}</div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      result.severity.toLowerCase() === 'error' ? 'bg-red-100 text-red-800'
                                      : result.severity.toLowerCase() === 'warning' ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {result.severity}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900">{result.occurrences}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-sm text-gray-900 max-w-md">{result.description}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {result.messages.length === 0 ? (
                                      <div className="text-sm text-gray-600">Rule passed</div>
                                    ) : (
                                      <div className="space-y-1">
                                        <div className="text-sm text-gray-700">
                                          {result.messages[0]?.message ?? 'See occurrences for details'}
                                          {result.messages.length > 1 && (
                                            <span className="ml-1 text-xs text-gray-500">(+{result.messages.length - 1} more)</span>
                                          )}
                                        </div>
                                        <div className="text-xs text-blueprism-blue">
                                          {detailExpandedRules[result.ruleId] ? 'Click row to hide occurrences' : 'Click row to view detailed occurrences'}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                                {result.messages.length > 0 && detailExpandedRules[result.ruleId] && (
                                  <tr className="bg-white">
                                    <td colSpan={6} className="px-6 pb-6">
                                      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                          <thead className="bg-gray-100">
                                            <tr>
                                              <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase tracking-wider text-xs">Page</th>
                                              <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase tracking-wider text-xs">Stage</th>
                                              <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase tracking-wider text-xs">Line</th>
                                              <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase tracking-wider text-xs">Message</th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-200">
                                            {result.messages.map((msg, msgIndex) => (
                                              <tr key={msgIndex}>
                                                <td className="px-3 py-2 text-gray-700">{msg.location?.pageName ?? 'N/A'}</td>
                                                <td className="px-3 py-2 text-gray-700">{msg.location?.stageName ?? 'N/A'}</td>
                                                <td className="px-3 py-2 text-gray-700">{msg.location?.lineNumber ?? '\u2014'}</td>
                                                <td className="px-3 py-2">
                                                  <div className="text-sm text-gray-700">{msg.message}</div>
                                                  {msg.detail && <div className="text-xs text-gray-500 mt-1">{msg.detail}</div>}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Results Count */}
                    <div className="text-sm text-gray-600">
                      Showing {filteredResults.length} of {selectedArtifactResult.results.length} results
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {releaseInfo && !selectedArtifactResult && (
            <>
              {/* Summary Card */}
              <div className="bg-blueprism-lightblue border border-blueprism-blue rounded-lg p-4">
                <h3 className="font-bold text-blueprism-darkblue mb-3">
                  {releaseInfo.releaseName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                  {releaseInfo.artifactsSummary.processCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blueprism-blue">
                        {releaseInfo.artifactsSummary.processCount}
                      </p>
                      <p className="text-gray-600">Processes</p>
                    </div>
                  )}
                  {releaseInfo.artifactsSummary.objectCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blueprism-blue">
                        {releaseInfo.artifactsSummary.objectCount}
                      </p>
                      <p className="text-gray-600">Objects</p>
                    </div>
                  )}
                  {releaseInfo.artifactsSummary.workQueueCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blueprism-blue">
                        {releaseInfo.artifactsSummary.workQueueCount}
                      </p>
                      <p className="text-gray-600">Work Queues</p>
                    </div>
                  )}
                  {releaseInfo.artifactsSummary.environmentVariableCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blueprism-blue">
                        {releaseInfo.artifactsSummary.environmentVariableCount}
                      </p>
                      <p className="text-gray-600">Env Vars</p>
                    </div>
                  )}
                  {releaseInfo.artifactsSummary.credentialCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blueprism-blue">
                        {releaseInfo.artifactsSummary.credentialCount}
                      </p>
                      <p className="text-gray-600">Credentials</p>
                    </div>
                  )}
                  {releaseInfo.artifactsSummary.calendarCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blueprism-blue">
                        {releaseInfo.artifactsSummary.calendarCount}
                      </p>
                      <p className="text-gray-600">Calendars</p>
                    </div>
                  )}
                  {releaseInfo.artifactsSummary.schedulerCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blueprism-blue">
                        {releaseInfo.artifactsSummary.schedulerCount}
                      </p>
                      <p className="text-gray-600">Schedulers</p>
                    </div>
                  )}
                  {releaseInfo.artifactsSummary.sessionCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blueprism-blue">
                        {releaseInfo.artifactsSummary.sessionCount}
                      </p>
                      <p className="text-gray-600">Sessions</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Config Selector */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Rule Configuration
                </label>
                {loadingConfigs ? (
                  <div className="flex items-center justify-center py-2">
                    <svg className="animate-spin h-5 w-5 text-blueprism-blue" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <select
                    value={selectedConfigId || ''}
                    onChange={(e) => setSelectedConfigId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
                  >
                    {configList.map((cfg) => (
                      <option key={cfg.configId} value={cfg.configId}>
                        {cfg.name} {cfg.isDefault && '(Default)'} - {cfg.activeRules}/{cfg.totalRules} active
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500">
                  Showing {selectedPlatform} configurations only
                </p>
              </div>

              {/* Validate All Button */}
              <button
                onClick={handleValidateAll}
                disabled={isValidating}
                className="w-full bg-blueprism-blue text-white font-bold py-3 px-6 rounded-lg hover:bg-blueprism-darkblue transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isValidating ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Validating All Artifacts...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Validate All Artifacts</span>
                  </>
                )}
              </button>

              {/* Artifacts List */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900">
                  Artifacts ({(releaseInfo.artifactsSummary.totalArtifacts > 0
                    ? releaseInfo.artifactsSummary.totalArtifacts
                    : releaseInfo.artifacts.length)})
                </h3>

                {(releaseInfo.artifactGroups ?? []).map((group) => {
                  const isGroupExpanded = expandedGroups[group.groupName] ?? true
                  const toggleGroup = () =>
                    setExpandedGroups((prev) => ({
                      ...prev,
                      [group.groupName]: !isGroupExpanded,
                    }))

                  return (
                    <div key={group.groupName} className="border border-gray-200 rounded-lg">
                      <button
                        type="button"
                        onClick={toggleGroup}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-semibold text-gray-900">{group.groupName}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            {group.count}
                          </span>
                        </div>
                        <span className="text-gray-500 text-xl">
                          {isGroupExpanded ? '−' : '+'}
                        </span>
                      </button>

                      {isGroupExpanded && (
                        <div className="p-4 space-y-3">
                          {group.artifacts.map((artifact) => {
                  const ruleGroups = getRuleGroupsForArtifact(artifact.artifactType)
                  const validation = artifactValidations.get(artifact.artifactId)
                  const isValidating = validatingArtifacts.has(artifact.artifactId)
                  const passRate = validation && validation.summary.totalRules > 0
                    ? Math.round((validation.summary.passed / validation.summary.totalRules) * 100)
                    : null

                  return (
                    <div
                      key={artifact.artifactId}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blueprism-blue transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-bold text-gray-900">{artifact.artifactName}</h4>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              {artifact.artifactType}
                            </span>
                            {passRate !== null && (
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                passRate === 100
                                  ? 'bg-green-100 text-green-800'
                                  : passRate >= 80
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {passRate}% Pass
                              </span>
                            )}
                          </div>

                          {/* Rule Groups */}
                          {ruleGroups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {ruleGroups.map((group) => (
                                <span
                                  key={group}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                  {group}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Artifact metadata */}
                          {artifact.metadata && Object.keys(artifact.metadata).length > 0 && (
                            <div className="mt-2 text-xs text-gray-600 space-y-1">
                            {Object.entries(artifact.metadata)
                              .filter(([_, value]) => value !== undefined && value !== null && value !== '')
                              .map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-semibold">{key}: </span>
                                  <span className="whitespace-pre-wrap break-all">{value ?? '—'}</span>
                                </div>
                              ))}
                          </div>
                        )}

                          {/* Validation Results */}
                          {validation && (
                            <div className="flex items-center space-x-4 text-sm mt-2">
                              <span className="text-green-600">
                                ✓ {validation.summary.passed} passed
                              </span>
                              <span className="text-red-600">
                                ✗ {validation.summary.failed} failed
                              </span>
                              <span className="text-gray-600">
                                Total: {validation.summary.totalRules} rules
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Validate + View Results Buttons */}
                        <div className="ml-4 flex flex-col space-y-2">
                          <button
                            onClick={() => handleValidateArtifact(artifact.artifactId)}
                            disabled={isValidating}
                            className="bg-blueprism-blue text-white px-4 py-2 rounded hover:bg-blueprism-darkblue transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
                          >
                            {isValidating ? (
                              <>
                                <svg
                                  className="animate-spin h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                <span>Validating...</span>
                              </>
                            ) : (
                              <span>Validate</span>
                            )}
                          </button>
                          {validation && (
                            <button
                              onClick={() => handleViewResults(artifact.artifactId)}
                              className="bg-white border border-blueprism-blue text-blueprism-blue px-4 py-2 rounded hover:bg-blueprism-lightblue transition-colors flex items-center space-x-2 text-sm"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>View Results</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
    </div>
  )
}
