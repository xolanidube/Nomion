'use client'

import { useState, useEffect } from 'react'
import { apiClient, ValidationHistoryItem } from '@/lib/api'

export default function History() {
  const [history, setHistory] = useState<ValidationHistoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ValidationHistoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const historyData = await apiClient.getValidationHistory()
      setHistory(historyData)
    } catch (err: any) {
      console.error('Failed to load history:', err)
      setError(err.message || 'Failed to load validation history')
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const getPassRate = (item: ValidationHistoryItem) => {
    return Math.round((item.passed / item.totalRules) * 100)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-blueprism-darkblue">Validation History</h2>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <svg
            className="animate-spin mx-auto h-12 w-12 text-blueprism-blue mb-4"
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
          <p className="text-gray-600">Loading validation history...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-16 w-16 text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading History</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadHistory}
            className="bg-blueprism-blue text-white px-4 py-2 rounded-lg hover:bg-blueprism-darkblue"
          >
            Retry
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No History Yet</h3>
          <p className="text-gray-600">
            Your validation history will appear here after you validate your first release
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                selectedItem?.id === item.id
                  ? 'border-blueprism-blue bg-blueprism-lightblue'
                  : 'border-gray-200 hover:border-blueprism-blue'
              }`}
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-bold text-gray-900">{item.fileName}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                      {item.fileType.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {item.passed} Passed
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {item.failed} Failed
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-blueprism-blue">
                        {getPassRate(item)}% Pass Rate
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
