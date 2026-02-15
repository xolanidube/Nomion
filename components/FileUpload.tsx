'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'

interface FileUploadProps {
  onFileUploaded: (fileData: { fileId: string; fileName: string; fileType: string }) => void
  onValidationComplete: (report: any) => void
  uploadedFile: { fileId: string; fileName: string; fileType: string } | null
}

export default function FileUpload({
  onFileUploaded,
  onValidationComplete,
  uploadedFile,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setIsUploading(true)

      try {
        const validExtensions = ['.bpprocess', '.bpobject', '.bprelease', '.nupkg', '.xaml', '.zip', '.json']
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

        if (!validExtensions.includes(fileExtension)) {
          throw new Error(
            `Invalid file type. Please upload a ${validExtensions.join(', ')} file.`
          )
        }

        const uploadedFileData = await apiClient.uploadFile(file)
        onFileUploaded({
          fileId: uploadedFileData.fileId,
          fileName: uploadedFileData.fileName,
          fileType: uploadedFileData.fileType,
        })
      } catch (err: any) {
        setError(err.message || 'Failed to upload file')
      } finally {
        setIsUploading(false)
      }
    },
    [onFileUploaded]
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


  const handleValidate = async () => {
    if (!uploadedFile) return

    setError(null)
    setIsValidating(true)

    try {
      // Use platform-specific validation endpoint based on file type
      const report = await apiClient.validateFile(
        {
          fileId: uploadedFile.fileId,
        },
        uploadedFile.fileType // Pass file type for platform routing
      )
      onValidationComplete(report)
    } catch (err: any) {
      setError(err.message || 'Failed to validate file')
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-blueprism-darkblue mb-6">
        {uploadedFile ? 'Artifact Details' : 'Upload File'}
      </h2>

      {!uploadedFile ? (
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
                Choose File
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".bpprocess,.bpobject,.bprelease,.nupkg,.xaml,.zip,.json"
                  onChange={handleFileInput}
                  disabled={isUploading}
                />
              </label>
            </div>

            <p className="text-sm text-gray-600">or drag and drop</p>
            <p className="text-xs text-gray-500">
              Blue Prism (.bpprocess, .bpobject, .bprelease), UiPath (.xaml, .nupkg), Power Automate (.zip), or Automation Anywhere (.json) files
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
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
                  <p className="text-sm text-gray-600">
                    Type: {uploadedFile.fileType.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onFileUploaded(null as any)}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Remove
              </button>
            </div>
          </div>

          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="w-full bg-blueprism-blue text-white font-bold py-4 px-6 rounded-lg hover:bg-blueprism-darkblue transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                <span>Validating...</span>
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
                <span>Validate</span>
              </>
            )}
          </button>
        </div>
      )}

      {isUploading && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2">
            <svg
              className="animate-spin h-5 w-5 text-blueprism-blue"
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
            <span className="text-gray-600">Uploading...</span>
          </div>
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
