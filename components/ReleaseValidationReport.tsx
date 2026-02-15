'use client'

import { useState } from 'react'
import { ReleaseValidationReport as ReleaseValidationReportType, ValidationResult } from '@/lib/api'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'

interface ReleaseValidationReportProps {
  report: ReleaseValidationReportType
}

export default function ReleaseValidationReport({ report }: ReleaseValidationReportProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterArtifact, setFilterArtifact] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  type SortColumn = 'ruleId' | 'severity' | 'status' | 'occurrences'
  const [sortBy, setSortBy] = useState<SortColumn>('ruleId')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const overallPassRate = report.overallSummary.totalRules === 0
    ? 0
    : Math.round((report.overallSummary.passed / report.overallSummary.totalRules) * 100)

  // Filter and sort results for each artifact
const getFilteredAndSortedResults = (results: ValidationResult[]) => {
    return results
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
          comparison = (a.occurrences ?? a.messages.length) - (b.occurrences ?? b.messages.length)
        }

        return sortOrder === 'asc' ? comparison : -comparison
      })
  }

  // Filter artifacts based on artifact filter and search
  const filteredArtifacts = report.artifactResults.filter((artifact) => {
    if (filterArtifact !== 'all' && artifact.artifactId !== filterArtifact) {
      return false
    }

    // If there's a search query, only show artifacts that have matching results
    if (searchQuery) {
    const hasMatchingResults = artifact.results.some((result) => {
        const query = searchQuery.toLowerCase()
        return (
          result.ruleId.toLowerCase().includes(query) ||
          result.ruleName.toLowerCase().includes(query) ||
          result.description.toLowerCase().includes(query) ||
          artifact.artifactName.toLowerCase().includes(query) ||
          result.messages.some((msg) =>
            msg.message.toLowerCase().includes(query) ||
            msg.location?.pageName?.toLowerCase().includes(query) ||
            msg.location?.stageName?.toLowerCase().includes(query)
          )
        )
      })
      return hasMatchingResults
    }

    return true
  })

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

const formatMessagesForExport = (result: ValidationResult) => {
    if (!result.messages.length) {
      return 'Rule passed'
    }

    return result.messages
      .map((msg) => {
        const locationParts: string[] = []
        if (msg.location?.pageName) locationParts.push(`Page: ${msg.location.pageName}`)
        if (msg.location?.stageName) locationParts.push(`Stage: ${msg.location.stageName}`)
        if (msg.location?.lineNumber) locationParts.push(`Line: ${msg.location.lineNumber}`)
        return locationParts.length > 0
          ? `${msg.message} (${locationParts.join(', ')})`
          : msg.message
      })
      .join(' | ')
  }

  const exportToCSV = () => {
    const allResults: any[] = []

    report.artifactResults.forEach(artifact => {
      artifact.results.forEach(result => {
        allResults.push({
          'Artifact': artifact.artifactName,
          'Artifact Type': artifact.artifactType,
          'Rule ID': result.ruleId,
          'Rule Name': result.ruleName,
          'Status': result.passed ? 'Passed' : 'Failed',
          'Severity': result.severity,
          'Occurrences': result.occurrences ?? result.messages.length,
          'Description': result.description,
          'Messages': formatMessagesForExport(result)
        })
      })
    })

    const csv = Papa.unparse(allResults)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `release-validation-${report.releaseName}-${Date.now()}.csv`
    link.click()
  }

  const exportToExcel = () => {
    const allResults: any[] = []

    report.artifactResults.forEach(artifact => {
      artifact.results.forEach(result => {
        allResults.push({
          'Artifact': artifact.artifactName,
          'Artifact Type': artifact.artifactType,
          'Rule ID': result.ruleId,
          'Rule Name': result.ruleName,
          'Status': result.passed ? 'Passed' : 'Failed',
          'Severity': result.severity,
          'Occurrences': result.occurrences ?? result.messages.length,
          'Description': result.description,
          'Messages': formatMessagesForExport(result)
        })
      })
    })

    const worksheet = XLSX.utils.json_to_sheet(allResults)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Results')

    // Add summary sheet
    const summary = [
      ['Release Validation Summary'],
      ['Release Name', report.releaseName],
      ['Validation ID', report.validationId],
      ['Timestamp', report.timestamp],
      ['Total Artifacts', report.artifactsSummary.totalArtifacts],
      ['Total Rules', report.overallSummary.totalRules],
      ['Passed', report.overallSummary.passed],
      ['Failed', report.overallSummary.failed],
      ['Warnings', report.overallSummary.warnings],
      ['Duration (ms)', report.durationMs]
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summary)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // Add artifact summary sheet
    const artifactSummary = report.artifactResults.map(artifact => ({
      'Artifact Name': artifact.artifactName,
      'Artifact Type': artifact.artifactType,
      'Total Rules': artifact.summary.totalRules,
      'Passed': artifact.summary.passed,
      'Failed': artifact.summary.failed,
      'Warnings': artifact.summary.warnings,
      'Duration (ms)': artifact.summary.durationMs
    }))
    const artifactSheet = XLSX.utils.json_to_sheet(artifactSummary)
    XLSX.utils.book_append_sheet(workbook, artifactSheet, 'Artifacts')

    XLSX.writeFile(workbook, `release-validation-${report.releaseName}-${Date.now()}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.setTextColor(26, 72, 140)
    doc.text('Release Validation Report', 14, 20)

    // Summary
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(`Release: ${report.releaseName}`, 14, 30)
    doc.text(`Total Artifacts: ${report.artifactsSummary.totalArtifacts} | Total Rules: ${report.overallSummary.totalRules}`, 14, 37)
    doc.text(`Passed: ${report.overallSummary.passed} | Failed: ${report.overallSummary.failed} | Overall Pass Rate: ${overallPassRate}%`, 14, 44)

    // Results table
    const tableData: any[] = []
    report.artifactResults.forEach(artifact => {
      artifact.results.forEach(result => {
        tableData.push([
          artifact.artifactName.substring(0, 20),
          result.ruleId,
          result.passed ? 'Pass' : 'Fail',
          result.severity,
          result.occurrences ?? result.messages.length,
          result.description.substring(0, 40) + (result.description.length > 40 ? '...' : ''),
          formatMessagesForExport(result).substring(0, 40)
        ])
      })
    })

    autoTable(doc, {
      startY: 50,
      head: [['Artifact', 'Rule ID', 'Status', 'Severity', 'Occurrences', 'Description', 'Messages']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [26, 72, 140], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawCell: (data: any) => {
        if (data.column.index === 2 && data.section === 'body') {
          const status = data.cell.raw
          if (status === 'Fail') {
            doc.setTextColor(220, 38, 38)
          } else {
            doc.setTextColor(22, 163, 74)
          }
        }
      }
    })

    doc.save(`release-validation-${report.releaseName}-${Date.now()}.pdf`)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-blueprism-darkblue mb-6">
        Release Validation Report
      </h2>

      {/* Overall Summary Card */}
      <div className="bg-gradient-to-r from-blueprism-blue to-blueprism-darkblue rounded-lg p-6 text-white mb-8">
        <h3 className="text-xl font-bold mb-4">{report.releaseName}</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm opacity-90">Total Artifacts</p>
            <p className="text-2xl font-bold">{report.artifactsSummary.totalArtifacts}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Total Rules Checked</p>
            <p className="text-2xl font-bold">{report.overallSummary.totalRules}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Overall Pass Rate</p>
            <p className="text-2xl font-bold">{overallPassRate}%</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Duration</p>
            <p className="text-2xl font-bold">{report.durationMs}ms</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-20 rounded p-3 text-center">
            <p className="text-2xl font-bold">{report.overallSummary.passed}</p>
            <p className="text-sm">Passed</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-3 text-center">
            <p className="text-2xl font-bold">{report.overallSummary.failed}</p>
            <p className="text-sm">Failed</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-3 text-center">
            <p className="text-2xl font-bold">{report.overallSummary.warnings}</p>
            <p className="text-sm">Warnings</p>
          </div>
        </div>
      </div>

      {/* Artifacts Breakdown */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Artifacts Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {report.artifactsSummary.processCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">
                {report.artifactsSummary.processCount}
              </p>
              <p className="text-sm text-gray-700">Processes</p>
            </div>
          )}
          {report.artifactsSummary.objectCount > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">
                {report.artifactsSummary.objectCount}
              </p>
              <p className="text-sm text-gray-700">Objects</p>
            </div>
          )}
          {report.artifactsSummary.workQueueCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {report.artifactsSummary.workQueueCount}
              </p>
              <p className="text-sm text-gray-700">Work Queues</p>
            </div>
          )}
          {report.artifactsSummary.environmentVariableCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {report.artifactsSummary.environmentVariableCount}
              </p>
              <p className="text-sm text-gray-700">Env Variables</p>
            </div>
          )}
          {report.artifactsSummary.credentialCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-red-600">
                {report.artifactsSummary.credentialCount}
              </p>
              <p className="text-sm text-gray-700">Credentials</p>
            </div>
          )}
          {report.artifactsSummary.calendarCount > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">
                {report.artifactsSummary.calendarCount}
              </p>
              <p className="text-sm text-gray-700">Calendars</p>
            </div>
          )}
          {report.artifactsSummary.schedulerCount > 0 && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-pink-600">
                {report.artifactsSummary.schedulerCount}
              </p>
              <p className="text-sm text-gray-700">Schedulers</p>
            </div>
          )}
          {report.artifactsSummary.sessionCount > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-teal-600">
                {report.artifactsSummary.sessionCount}
              </p>
              <p className="text-sm text-gray-700">Sessions</p>
            </div>
          )}
        </div>
      </div>

      {/* Filter Controls and Export Buttons */}
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
              placeholder="Search by rule ID, name, description, artifact, or location..."
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Artifact
            </label>
            <select
              value={filterArtifact}
              onChange={(e) => setFilterArtifact(e.target.value)}
              className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blueprism-blue focus:border-transparent min-w-[200px]"
            >
              <option value="all">All Artifacts</option>
              {report.artifactResults.map((artifact) => (
                <option key={artifact.artifactId} value={artifact.artifactId}>
                  {artifact.artifactName}
                </option>
              ))}
            </select>
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

        <div className="flex flex-wrap gap-3">
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
      </div>

      {/* Validation Results Grouped by Artifact */}
      <div className="space-y-8">
        {filteredArtifacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No artifacts match the selected filters
          </div>
        ) : (
          filteredArtifacts.map((artifact) => {
            const filteredResults = getFilteredAndSortedResults(artifact.results)

            if (filteredResults.length === 0) {
              return null
            }

            const passRate = artifact.summary.totalRules > 0
              ? Math.round((artifact.summary.passed / artifact.summary.totalRules) * 100)
              : 0

            return (
              <div key={artifact.artifactId} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Artifact Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-bold text-gray-900">{artifact.artifactType}</h3>
                      <span className="text-xl font-semibold text-blueprism-darkblue">
                        {artifact.artifactName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 text-sm font-medium rounded ${
                        passRate === 100
                          ? 'bg-green-100 text-green-800'
                          : passRate >= 80
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {passRate}% Pass Rate
                      </span>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-green-600">{artifact.summary.passed} passed</span>
                        {' / '}
                        <span className="font-medium text-red-600">{artifact.summary.failed} failed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
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
                      {filteredResults.map((result, index) => (
                        <tr
                          key={`${artifact.artifactId}-${result.ruleId}-${index}`}
                          className={`${
                            result.passed ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'
                          } transition-colors`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
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
                              {result.occurrences ?? result.messages.length}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900 max-w-md">{result.description}</div>
                          </td>
                          <td className="px-4 py-3">
                            {result.messages.length ? (
                              <ul className="space-y-2">
                                {result.messages.map((msg, msgIndex) => (
                                  <li key={msgIndex} className="text-sm text-gray-700">
                                    <div>{msg.message}</div>
                                    {(msg.location?.pageName || msg.location?.stageName || msg.location?.lineNumber) && (
                                      <div className="text-xs text-gray-500">
                                        {[
                                          msg.location?.pageName ? `Page: ${msg.location.pageName}` : null,
                                          msg.location?.stageName ? `Stage: ${msg.location.stageName}` : null,
                                          msg.location?.lineNumber ? `Line: ${msg.location.lineNumber}` : null,
                                        ]
                                          .filter(Boolean)
                                          .join(' | ')}
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-sm text-gray-600">Rule passed</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Artifact Results Summary */}
                <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600 border-t border-gray-200">
                  Showing {filteredResults.length} of {artifact.results.length} rules for this artifact
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
