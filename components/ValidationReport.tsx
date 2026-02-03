'use client'

import { Fragment, useState, useEffect } from 'react'
import { ValidationReport as ValidationReportType, apiClient, AutoFixDto, AutoFixGenerateResponse } from '@/lib/api'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'
import AutoFixPreview from './AutoFixPreview'

interface ValidationReportProps {
  report: ValidationReportType
  fileId?: string
  onRevalidate?: () => void
}

export default function ValidationReport({ report, fileId, onRevalidate }: ValidationReportProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({})
  type SortColumn = 'ruleId' | 'severity' | 'status' | 'occurrences'
  const [sortBy, setSortBy] = useState<SortColumn>('ruleId')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Auto-fix state
  const [fixes, setFixes] = useState<AutoFixDto[]>([])
  const [fixesLoading, setFixesLoading] = useState(false)
  const [selectedFix, setSelectedFix] = useState<AutoFixDto | null>(null)
  const [showFixPreview, setShowFixPreview] = useState(false)

  // Generate fixes when report loads (only for failed rules)
  useEffect(() => {
    const generateFixes = async () => {
      if (!fileId) return

      const failedResults = report.results.filter(r => !r.passed)
      if (failedResults.length === 0) return

      setFixesLoading(true)
      try {
        const violations = failedResults.flatMap(result =>
          result.messages.map(msg => ({
            ruleId: result.ruleId,
            stageName: msg.location?.stageName,
            pageName: msg.location?.pageName,
            message: msg.message,
          }))
        )

        const response = await apiClient.generateFixes({
          fileId,
          violations,
        })

        setFixes(response.fixes)
      } catch (err) {
        console.error('Failed to generate fixes:', err)
      } finally {
        setFixesLoading(false)
      }
    }

    generateFixes()
  }, [fileId, report])

  // Find a fix for a specific violation
  const findFixForViolation = (ruleId: string, pageName?: string, stageName?: string): AutoFixDto | undefined => {
    return fixes.find(fix =>
      fix.ruleId === ruleId &&
      ((!fix.pageName && !pageName) || fix.pageName === pageName) &&
      ((!fix.targetName && !stageName) || fix.targetName === stageName)
    )
  }

  const handleApplyFixClick = (fix: AutoFixDto) => {
    setSelectedFix(fix)
    setShowFixPreview(true)
  }

  const handleFixApplied = () => {
    // Trigger revalidation if callback provided
    if (onRevalidate) {
      onRevalidate()
    }
  }

  const toggleRule = (ruleId: string) => {
    setExpandedRules((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }))
  }

  const filteredAndSortedResults = report.results
    .filter((result) => {
      // Filter by severity
      if (filterSeverity !== 'all' && result.severity.toLowerCase() !== filterSeverity) {
        return false
      }

      // Filter by status
      if (filterStatus === 'passed' && !result.passed) {
        return false
      }
      if (filterStatus === 'failed' && result.passed) {
        return false
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
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

      if (sortBy === 'ruleId') {
        comparison = a.ruleId.localeCompare(b.ruleId)
      } else if (sortBy === 'severity') {
        const severityOrder = { Error: 0, Warning: 1, Info: 2 }
        const aSev = severityOrder[a.severity as keyof typeof severityOrder] ?? 3
        const bSev = severityOrder[b.severity as keyof typeof severityOrder] ?? 3
        comparison = aSev - bSev
      } else if (sortBy === 'status') {
        comparison = (a.passed ? 1 : 0) - (b.passed ? 1 : 0)
      } else if (sortBy === 'occurrences') {
        comparison = (a.occurrences ?? 0) - (b.occurrences ?? 0)
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const formatMessagesForExport = (result: ValidationReportType['results'][number]) => {
    if (!result.messages.length) {
      return 'Rule passed'
    }

    return result.messages
      .map((msg) => {
        const parts: string[] = []
        parts.push(msg.message)
        if (msg.detail) {
          parts.push(`Detail: ${msg.detail}`)
        }
        const locationParts: string[] = []
        if (msg.location?.artifactName) locationParts.push(`Artifact: ${msg.location.artifactName}`)
        if (msg.location?.pageName) locationParts.push(`Page: ${msg.location.pageName}`)
        if (msg.location?.stageName) locationParts.push(`Stage: ${msg.location.stageName}`)
        if (msg.location?.lineNumber) locationParts.push(`Line: ${msg.location.lineNumber}`)
        if (locationParts.length > 0) {
          parts.push(locationParts.join(', '))
        }
        return parts.join(' | ')
      })
      .join(' | ')
  }

  const exportToCSV = () => {
    const data = report.results.map(result => ({
      'Rule ID': result.ruleId,
      'Rule Name': result.ruleName,
      'Status': result.passed ? 'Passed' : 'Failed',
      'Severity': result.severity,
      'Occurrences': result.occurrences ?? result.messages.length,
      'Description': result.description,
      'Messages': formatMessagesForExport(result)
    }))

    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `validation-report-${report.fileName}-${Date.now()}.csv`
    link.click()
  }

  const exportToExcel = () => {
    const data = report.results.map(result => ({
      'Rule ID': result.ruleId,
      'Rule Name': result.ruleName,
      'Status': result.passed ? 'Passed' : 'Failed',
      'Severity': result.severity,
      'Occurrences': result.occurrences ?? result.messages.length,
      'Description': result.description,
      'Messages': formatMessagesForExport(result)
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Results')

    // Add summary sheet
    const summary = [
      ['Validation Report Summary'],
      ['File Name', report.fileName],
      ['Validation ID', report.validationId],
      ['Timestamp', report.timestamp],
      ['Total Rules', report.summary.totalRules],
      ['Passed', report.summary.passed],
      ['Failed', report.summary.failed],
      ['Warnings', report.summary.warnings],
      ['Duration (ms)', report.summary.durationMs]
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summary)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    XLSX.writeFile(workbook, `validation-report-${report.fileName}-${Date.now()}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.setTextColor(26, 72, 140) // blueprism-darkblue
    doc.text('Validation Report', 14, 20)

    // Summary
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(`File: ${report.fileName}`, 14, 30)
    doc.text(`Validation ID: ${report.validationId}`, 14, 37)
    doc.text(`Total Rules: ${report.summary.totalRules} | Passed: ${report.summary.passed} | Failed: ${report.summary.failed}`, 14, 44)

    // Results table
    const tableData = report.results.map(result => [
      result.ruleId,
      result.passed ? 'Pass' : 'Fail',
      result.severity,
      result.occurrences ?? result.messages.length,
      result.description.substring(0, 60) + (result.description.length > 60 ? '...' : ''),
      formatMessagesForExport(result).substring(0, 60)
    ])

    autoTable(doc, {
      startY: 50,
      head: [['Rule ID', 'Status', 'Severity', 'Occurrences', 'Description', 'Messages']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 72, 140], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawCell: (data: any) => {
        if (data.column.index === 1 && data.section === 'body') {
          const status = data.cell.raw
          if (status === 'Fail') {
            doc.setTextColor(220, 38, 38) // red
          } else {
            doc.setTextColor(22, 163, 74) // green
          }
        }
      }
    })

    doc.save(`validation-report-${report.fileName}-${Date.now()}.pdf`)
  }

  const passRate = report.summary.totalRules === 0
    ? 0
    : Math.round((report.summary.passed / report.summary.totalRules) * 100)

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-blueprism-darkblue mb-6">
        Validation Report
      </h2>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blueprism-blue to-blueprism-darkblue rounded-lg p-6 text-white mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm opacity-90">File Name</p>
            <p className="text-lg font-bold truncate" title={report.fileName}>{report.fileName}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Total Rules</p>
            <p className="text-lg font-bold">{report.summary.totalRules}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Pass Rate</p>
            <p className="text-lg font-bold">{passRate}%</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Duration</p>
            <p className="text-lg font-bold">{report.summary.durationMs}ms</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-20 rounded p-3 text-center">
            <p className="text-2xl font-bold">{report.summary.passed}</p>
            <p className="text-sm">Passed</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-3 text-center">
            <p className="text-2xl font-bold">{report.summary.failed}</p>
            <p className="text-sm">Failed</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-3 text-center">
            <p className="text-2xl font-bold">{report.summary.warnings}</p>
            <p className="text-sm">Warnings</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by rule ID, name, description, or location..."
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="passed">Passed Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Severity
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export CSV</span>
        </button>
        <button
          onClick={exportToExcel}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export Excel</span>
        </button>
        <button
          onClick={exportToPDF}
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
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {sortBy === 'status' && (
                    <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('ruleId')}
              >
                <div className="flex items-center space-x-1">
                  <span>Rule ID</span>
                  {sortBy === 'ruleId' && (
                    <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('severity')}
              >
                <div className="flex items-center space-x-1">
                  <span>Severity</span>
                  {sortBy === 'severity' && (
                    <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('occurrences')}
              >
                <div className="flex items-center space-x-1">
                  <span>Occurrences</span>
                  {sortBy === 'occurrences' && (
                    <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedResults.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No results match the selected filters
                </td>
              </tr>
            ) : (
              filteredAndSortedResults.map((result, index) => (
                <Fragment key={`${result.ruleId}-${index}`}>
                <tr
                  className={`cursor-pointer ${
                    result.passed ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'
                  } transition-colors`}
                  onClick={() => {
                    if (result.messages.length > 0) {
                      toggleRule(result.ruleId)
                    }
                  }}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500">
                        {result.messages.length > 0 ? (
                          expandedRules[result.ruleId] ? '−' : '+'
                        ) : (
                          '–'
                        )}
                      </span>
                      {result.passed ? (
                        <svg
                          className="h-5 w-5 text-green-600"
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
                      ) : (
                        <svg
                          className="h-5 w-5 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {result.passed ? 'Pass' : 'Fail'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{result.ruleId}</div>
                    <div className="text-xs text-gray-500">{result.ruleName}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        result.severity.toLowerCase() === 'error'
                          ? 'bg-red-100 text-red-800'
                          : result.severity.toLowerCase() === 'warning'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {result.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {result.occurrences}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 max-w-md">{result.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    {result.messages.length === 0 ? (
                      <div className="text-sm text-gray-600">Rule passed</div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          Rule {result.ruleId} failed:
                        </div>
                        <div className="text-sm text-gray-700">
                          {result.messages[0]?.message ?? 'See occurrences for details'}
                          {result.messages.length > 1 && (
                            <span className="ml-1 text-xs text-gray-500">
                              (+{result.messages.length - 1} more)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-blueprism-blue">
                          {expandedRules[result.ruleId]
                            ? 'Click row to hide occurrences'
                            : 'Click row to view detailed occurrences'}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
                {result.messages.length > 0 && expandedRules[result.ruleId] && (
                  <tr className="bg-white">
                    <td colSpan={6} className="px-6 pb-6">
                      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase tracking-wider text-xs">
                                Artifact
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase tracking-wider text-xs">
                                Page
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase tracking-wider text-xs">
                                Stage
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase tracking-wider text-xs">
                                Line
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase tracking-wider text-xs">
                                Message
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase tracking-wider text-xs">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {result.messages.map((msg, msgIndex) => {
                              const artifactName =
                                msg.location?.artifactName ??
                                report.fileName ??
                                'N/A'
                              return (
                                <tr key={msgIndex}>
                                  <td className="px-3 py-2 text-gray-900">
                                    {artifactName || 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">
                                    {msg.location?.pageName ?? 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">
                                    {msg.location?.stageName ?? 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">
                                    {msg.location?.lineNumber ?? '—'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="text-sm text-gray-700">{msg.message}</div>
                                    {msg.detail && (
                                      <div className="text-xs text-gray-500 mt-1">{msg.detail}</div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    {(() => {
                                      const fix = findFixForViolation(
                                        result.ruleId,
                                        msg.location?.pageName,
                                        msg.location?.stageName
                                      )
                                      return fix ? (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            handleApplyFixClick(fix)
                                          }}
                                          className="inline-flex items-center px-3 py-1.5 border border-blueprism-blue text-xs font-medium rounded-md text-blueprism-blue hover:bg-blueprism-lightblue transition"
                                        >
                                          {fix.isDestructive && (
                                            <svg className="w-3 h-3 mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                          )}
                                          Apply Fix
                                          <span className="ml-1 text-gray-400">
                                            ({Math.round(fix.confidence * 100)}%)
                                          </span>
                                        </button>
                                      ) : (
                                        <span className="text-xs text-gray-400">
                                          {fixesLoading ? 'Loading...' : 'No fix available'}
                                        </span>
                                      )
                                    })()}
                                  </td>
                                </tr>
                              )
                            })}
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

      {/* Results Summary */}
      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredAndSortedResults.length} of {report.results.length} results
        {fixes.length > 0 && (
          <span className="ml-4 text-blueprism-blue">
            {fixes.length} auto-fix{fixes.length !== 1 ? 'es' : ''} available
          </span>
        )}
      </div>

      {/* Auto-Fix Preview Modal */}
      {fileId && (
        <AutoFixPreview
          isOpen={showFixPreview}
          onClose={() => {
            setShowFixPreview(false)
            setSelectedFix(null)
          }}
          fileId={fileId}
          fix={selectedFix}
          onFixApplied={handleFixApplied}
        />
      )}
    </div>
  )
}
