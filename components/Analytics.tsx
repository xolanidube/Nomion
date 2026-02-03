'use client'

import { useState, useEffect } from 'react'
import { apiClient, DashboardSummary, TrendData } from '@/lib/api'
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
import { Line, Bar } from 'react-chartjs-2'

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

export default function Analytics() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDays, setSelectedDays] = useState(30)

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    loadTrendData()
  }, [selectedDays])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getDashboard()
      setDashboard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadTrendData = async () => {
    try {
      const data = await apiClient.getTrends(selectedDays)
      setTrendData(data)
    } catch (err) {
      console.error('Failed to load trend data:', err)
    }
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

  const topRulesChartData = {
    labels: dashboard.topViolatedRules.map((r) => r.ruleName),
    datasets: [
      {
        label: 'Violations',
        data: dashboard.topViolatedRules.map((r) => r.violationCount),
        backgroundColor: [
          'rgba(220, 38, 38, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(99, 102, 241, 0.8)',
        ],
      },
    ],
  }

  return (
    <div className="space-y-6">
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

      {/* Top Violated Rules */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-blueprism-darkblue mb-4">Top Violated Rules</h2>
        {dashboard.topViolatedRules.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Bar
                data={topRulesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      display: false,
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
            <div>
              <div className="space-y-3">
                {dashboard.topViolatedRules.map((rule, index) => (
                  <div key={rule.ruleId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blueprism-blue rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{rule.ruleName}</p>
                        <p className="text-sm text-gray-500">{rule.ruleId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-red-600">{rule.violationCount}</p>
                      <p className="text-xs text-gray-500">{rule.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No violation data available</p>
        )}
      </div>
    </div>
  )
}
