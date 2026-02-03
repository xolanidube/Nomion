'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import LoginForm from '@/components/LoginForm'
import FileUpload from '@/components/FileUpload'
import ReleaseUpload from '@/components/ReleaseUpload'
import ValidationReport from '@/components/ValidationReport'
import ReleaseValidationReport from '@/components/ReleaseValidationReport'
import ConfigEditor from '@/components/ConfigEditor'
import History from '@/components/History'
import Analytics from '@/components/Analytics'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [currentView, setCurrentView] = useState<'upload' | 'config' | 'history' | 'analytics'>('upload')
  const [uploadedFile, setUploadedFile] = useState<{
    fileId: string
    fileName: string
    fileType: string
  } | null>(null)
  const [validationReport, setValidationReport] = useState<any>(null)
  const [releaseValidationReport, setReleaseValidationReport] = useState<any>(null)
  const [isRelease, setIsRelease] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const savedUsername = sessionStorage.getItem('username')
    if (savedUsername) {
      setIsLoggedIn(true)
      setUsername(savedUsername)
    }
  }, [])

  const handleLogin = (user: string) => {
    setIsLoggedIn(true)
    setUsername(user)
    sessionStorage.setItem('username', user)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUsername('')
    sessionStorage.removeItem('username')
    setUploadedFile(null)
    setValidationReport(null)
  }

  const handleFileUploaded = (fileData: { fileId: string; fileName: string; fileType: string }) => {
    setUploadedFile(fileData)
    setValidationReport(null)
    setReleaseValidationReport(null)
    setIsRelease(fileData.fileType === 'bprelease')
  }

  const handleValidationComplete = (report: any) => {
    setValidationReport(report)
    setReleaseValidationReport(null)

    // Save to history
    const historyItem = {
      id: report.validationId,
      fileName: report.fileName,
      fileType: report.fileType,
      timestamp: report.timestamp,
      passed: report.summary.passed,
      failed: report.summary.failed,
      totalRules: report.summary.totalRules,
    }

    const existingHistory = localStorage.getItem('validation-history')
    const history = existingHistory ? JSON.parse(existingHistory) : []
    history.unshift(historyItem) // Add to beginning

    // Keep only last 50 items
    if (history.length > 50) {
      history.pop()
    }

    localStorage.setItem('validation-history', JSON.stringify(history))
  }

  const handleReleaseValidationComplete = (report: any) => {
    setReleaseValidationReport(report)
    setValidationReport(null)

    // Save to history
    const historyItem = {
      id: report.validationId,
      fileName: report.fileName,
      fileType: 'bprelease',
      timestamp: report.timestamp,
      passed: report.overallSummary.passed,
      failed: report.overallSummary.failed,
      totalRules: report.overallSummary.totalRules,
    }

    const existingHistory = localStorage.getItem('validation-history')
    const history = existingHistory ? JSON.parse(existingHistory) : []
    history.unshift(historyItem)

    if (history.length > 50) {
      history.pop()
    }

    localStorage.setItem('validation-history', JSON.stringify(history))
  }

  // Get display name for artifact type
  const getArtifactTypeDisplay = (fileType: string): string => {
    const typeMap: Record<string, string> = {
      'bprelease': 'Release',
      'bpprocess': 'Process',
      'bpobject': 'Object',
      'powerautomate': 'Solution',
      'uipath': 'Package',
      'uipath_workflow': 'Workflow',
      'uipath_project': 'Project',
      'nupkg': 'Package',
      'xaml': 'Workflow',
    }
    return typeMap[fileType.toLowerCase()] || 'Artifact'
  }

  // Show login if not authenticated
  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isLoggedIn={isLoggedIn}
        username={username}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-blueprism-darkblue mb-2">
              {currentView === 'upload' && (uploadedFile
                ? `Validate ${getArtifactTypeDisplay(uploadedFile.fileType)}`
                : 'Upload Artifact')}
              {currentView === 'analytics' && 'Analytics & Insights'}
              {currentView === 'config' && 'Configure Rules'}
              {currentView === 'history' && 'Validation History'}
            </h1>
            <p className="text-gray-600">
              {currentView === 'upload' && !uploadedFile &&
                'Upload and validate your automation artifacts across supported platforms'}
              {currentView === 'upload' && uploadedFile &&
                `Review and validate your ${getArtifactTypeDisplay(uploadedFile.fileType).toLowerCase()} against configured rules`}
              {currentView === 'analytics' && 'Track compliance trends and analyze validation patterns'}
              {currentView === 'config' && 'Customize rule sets and validation criteria'}
              {currentView === 'history' && 'View past validation results'}
            </p>
          </header>

          {/* Content */}
          {currentView === 'upload' && (
            <div className="space-y-8">
              {/* Show ReleaseUpload for .bprelease files, FileUpload for single artifacts */}
              {(!uploadedFile || uploadedFile.fileType === 'bprelease') ? (
                <>
                  <ReleaseUpload
                    onFileUploaded={handleFileUploaded}
                    onValidationComplete={handleReleaseValidationComplete}
                    uploadedFile={uploadedFile}
                  />
                  {releaseValidationReport && (
                    <ReleaseValidationReport report={releaseValidationReport} />
                  )}
                </>
              ) : (
                <>
                  <FileUpload
                    onFileUploaded={handleFileUploaded}
                    onValidationComplete={handleValidationComplete}
                    uploadedFile={uploadedFile}
                  />
                  {validationReport && (
                    <ValidationReport
                      report={validationReport}
                      fileId={uploadedFile?.fileId}
                      onRevalidate={() => {
                        // Trigger revalidation by re-running validation
                        if (uploadedFile) {
                          // Signal to FileUpload to revalidate
                          const event = new CustomEvent('revalidate', { detail: uploadedFile })
                          window.dispatchEvent(event)
                        }
                      }}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {currentView === 'analytics' && <Analytics />}

          {currentView === 'config' && <ConfigEditor />}

          {currentView === 'history' && <History />}
        </div>
      </main>
    </div>
  )
}
