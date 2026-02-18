'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient, DashboardSummary, TrendData, RuleViolationStats, PaginatedRuleViolationStats } from '@/lib/api'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const PLATFORMS = [
  { value: '', label: 'All Platforms' },
  { value: 'blueprism', label: 'Blue Prism' },
  { value: 'powerautomate', label: 'Power Automate' },
  { value: 'uipath', label: 'UiPath' },
]

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  Error: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Warning: 'bg-yellow-100 text-yellow-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-blue-100 text-blue-800',
  Info: 'bg-blue-100 text-blue-800',
}

export default function Analytics() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDays, setSelectedDays] = useState(30)
  const [selectedPlatform, setSelectedPlatform] = useState('')

  // Paginated rules state
  const [rulesData, setRulesData] = useState<PaginatedRuleViolationStats | null>(null)
  const [rulesPage, setRulesPage] = useState(1)
  const [rulesLoading, setRulesLoading] = useState(false)
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)

  const platformParam = selectedPlatform || undefined

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getDashboard(platformParam)
      setDashboard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [platformParam])

  const loadTrendData = useCallback(async () => {
    try {
      const data = await apiClient.getTrends(selectedDays, platformParam)
      setTrendData(data)
    } catch (err) {
      console.error('Failed to load trend data:', err)
    }
  }, [selectedDays, platformParam])

  const loadRulesData = useCallback(async (page: number) => {
    try {
      setRulesLoading(true)
      const data = await apiClient.getTopViolatedRules(platformParam, page, 15)
      setRulesData(data)
    } catch (err) {
      console.error('Failed to load rules data:', err)
    } finally {
      setRulesLoading(false)
    }
  }, [platformParam])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  useEffect(() => {
    loadTrendData()
  }, [loadTrendData])

  useEffect(() => {
    setRulesPage(1)
    loadRulesData(1)
  }, [loadRulesData])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (rulesPage > 1) loadRulesData(rulesPage)
  }, [rulesPage])

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform)
    setRulesPage(1)
    setExpandedRuleId(null)
  }

  const formatTrend = (value: number | null) => {
    if (value === null) return 'N/A'
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getTrendColor = (value: number | null, inverse = false) => {
    if (value === null) return 'text-gray-500'
    const isPositive = value >= 0
    if (inverse) {
      return isPositive ? 'text-red-600' : 'text-green-600'
    }
    return isPositive ? 'text-green-600' : 'text-red-600'
  }

  const totalPages = rulesData ? Math.ceil(rulesData.totalCount / rulesData.pageSize) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blueprism-blue"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-red-800 font-semibold">Error Loading Analytics</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">No analytics data available yet. Start validating files to see analytics.</p>
      </div>
    )
  }

  // Prepare chart data
  const trendChartData = {
    labels: trendData.map((d) => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Critical',
        data: trendData.map((d) => d.criticalViolations),
        borderColor: 'rgb(220, 38, 38)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        fill: true,
      },
      {
        label: 'High',
        data: trendData.map((d) => d.highViolations),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
      },
      {
        label: 'Medium',
        data: trendData.map((d) => d.mediumViolations),
        borderColor: 'rgb(234, 179, 8)',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        fill: true,
      },
      {
        label: 'Low',
        data: trendData.map((d) => d.lowViolations),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      },
    ],
  }

  const complianceChartData = {
    labels: trendData.map((d) => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Compliance Score',
        data: trendData.map((d) => d.complianceScore ?? 0),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
      },
    ],
  }

  return (
    <div className="space-y-6">
      {/* Platform Filter */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Platform:</label>
          <div className="flex space-x-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePlatformChange(p.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPlatform === p.value
                    ? 'bg-blueprism-blue text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Validations Today</p>
              <p className="text-3xl font-bold text-blueprism-darkblue">{dashboard.totalValidationsToday}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Violations</p>
              <p className="text-3xl font-bold text-red-600">{dashboard.totalViolationsToday}</p>
              {dashboard.violationTrend !== null && (
                <p className={`text-sm mt-1 ${getTrendColor(dashboard.violationTrend, true)}`}>
                  {formatTrend(dashboard.violationTrend)} vs yesterday
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Compliance Score</p>
              <p className="text-3xl font-bold text-green-600">
                {dashboard.avgComplianceScore?.toFixed(1) ?? 'N/A'}
              </p>
              {dashboard.complianceScoreTrend !== null && (
                <p className={`text-sm mt-1 ${getTrendColor(dashboard.complianceScoreTrend)}`}>
                  {formatTrend(dashboard.complianceScoreTrend)} vs yesterday
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Critical Violations</p>
              <p className="text-3xl font-bold text-red-700">{dashboard.criticalViolations}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Violations Trend */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-blueprism-darkblue">Violations Trend</h2>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
          <Line
            data={trendChartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom' as const,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>

        {/* Compliance Score Trend */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-blueprism-darkblue mb-4">Compliance Score Trend</h2>
          <Line
            data={complianceChartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom' as const,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                },
              },
            }}
          />
        </div>
      </div>

      {/* Violated Rules — Paginated with Expandable Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-blueprism-darkblue">
            Violated Rules
            {rulesData && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({rulesData.totalCount} total)
              </span>
            )}
          </h2>
        </div>

        {rulesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blueprism-blue"></div>
          </div>
        ) : rulesData && rulesData.items.length > 0 ? (
          <>
            <div className="space-y-2">
              {rulesData.items.map((rule, index) => {
                const rank = (rulesData.page - 1) * rulesData.pageSize + index + 1
                const isExpanded = expandedRuleId === rule.ruleId
                return (
                  <div key={rule.ruleId} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedRuleId(isExpanded ? null : rule.ruleId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 bg-blueprism-blue rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {rank}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{rule.ruleName}</p>
                          <p className="text-sm text-gray-500">{rule.ruleId}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${SEVERITY_COLORS[rule.severity] || 'bg-gray-100 text-gray-800'}`}>
                          {rule.severity}
                        </span>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-red-600">{rule.violationCount}</p>
                          <p className="text-xs text-gray-500">{rule.percentage.toFixed(1)}%</p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">What this rule validates</h4>
                            <p className="text-sm text-gray-600">
                              {rule.description || 'No description available for this rule.'}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase">Severity</span>
                              <p className="text-sm font-medium text-gray-900">{rule.severity}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase">Applies to</span>
                              <p className="text-sm font-medium text-gray-900 capitalize">{rule.applicability === 'both' ? 'Process & Object' : rule.applicability}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase">Violation share</span>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-red-500 h-2 rounded-full"
                                    style={{ width: `${Math.min(rule.percentage, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-700">{rule.percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {(rulesData.page - 1) * rulesData.pageSize + 1}–{Math.min(rulesData.page * rulesData.pageSize, rulesData.totalCount)} of {rulesData.totalCount} rules
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setRulesPage((p) => Math.max(1, p - 1))}
                    disabled={rulesPage === 1}
                    className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {rulesPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setRulesPage((p) => Math.min(totalPages, p + 1))}
                    disabled={rulesPage === totalPages}
                    className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-center py-8">No violation data available</p>
        )}
      </div>
    </div>
  )
}
