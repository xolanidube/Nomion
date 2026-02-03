'use client'

import { useState } from 'react'
import { apiClient, AutoFixDto, FixPreviewDto } from '@/lib/api'

interface AutoFixPreviewProps {
  isOpen: boolean
  onClose: () => void
  fileId: string
  fix: AutoFixDto | null
  onFixApplied: () => void
}

export default function AutoFixPreview({
  isOpen,
  onClose,
  fileId,
  fix,
  onFixApplied,
}: AutoFixPreviewProps) {
  const [preview, setPreview] = useState<FixPreviewDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPreview = async () => {
    if (!fix) return

    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.previewFixes({
        fileId,
        fixIds: [fix.fixId],
      })

      if (response.previews.length > 0) {
        setPreview(response.previews[0])
        if (!response.previews[0].success) {
          setError(response.previews[0].errorMessage || 'Failed to generate preview')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFix = async () => {
    if (!fix) return

    setApplying(true)
    setError(null)

    try {
      const response = await apiClient.applyFixes({
        fileId,
        fixIds: [fix.fixId],
        createBackup: true,
      })

      if (response.success) {
        onFixApplied()
        onClose()
      } else {
        setError(response.errorMessage || 'Failed to apply fix')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply fix')
    } finally {
      setApplying(false)
    }
  }

  // Load preview when modal opens
  if (isOpen && fix && !preview && !loading && !error) {
    loadPreview()
  }

  // Reset state when modal closes
  const handleClose = () => {
    setPreview(null)
    setError(null)
    onClose()
  }

  if (!isOpen || !fix) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Apply Fix Preview</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Fix Details */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Fix Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Rule ID:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">{fix.ruleId}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Fix Type:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">{fix.fixType}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Target:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {fix.targetName || 'N/A'} ({fix.targetType})
                  </span>
                </div>
                {fix.pageName && (
                  <div>
                    <span className="text-sm text-gray-500">Page:</span>
                    <span className="ml-2 text-sm font-medium text-gray-900">{fix.pageName}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-500">Description:</span>
                <p className="mt-1 text-sm text-gray-900">{fix.description}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500">Confidence:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                    fix.confidence >= 0.8
                      ? 'bg-green-100 text-green-800'
                      : fix.confidence >= 0.5
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {Math.round(fix.confidence * 100)}%
                  </span>
                </div>
                {fix.isDestructive && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">
                    Destructive Change
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blueprism-blue" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="ml-3 text-gray-600">Loading preview...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          ) : preview && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Changes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Before
                  </h4>
                  <pre className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                    {preview.beforeXml || '(empty)'}
                  </pre>
                </div>
                {/* After */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    After
                  </h4>
                  <pre className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                    {preview.afterXml || '(empty)'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Warning for destructive changes */}
          {fix.isDestructive && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Warning: Destructive Change</h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    This fix may affect references to this element in other parts of the file.
                    A backup will be created before applying.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyFix}
            disabled={applying || loading || !!error}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center ${
              applying || loading || error
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blueprism-blue hover:bg-blueprism-darkblue'
            }`}
          >
            {applying ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Applying...
              </>
            ) : (
              'Apply Fix'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
