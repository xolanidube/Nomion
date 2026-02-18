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
import Integrations from '@/components/Integrations'
import { CustomRuleBuilder } from '@/components/CustomRuleBuilder'
import Approvals from '@/components/Approvals'
import UserManagement from '@/components/UserManagement'

type ViewType = 'upload' | 'config' | 'history' | 'analytics' | 'integrations' | 'customrules' | 'approvals' | 'users'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [currentView, setCurrentView] = useState<ViewType>('upload')
  const [userId, setUserId] = useState<string>('')
  const [userPlan, setUserPlan] = useState<string>('free')
  const [userRole, setUserRole] = useState<string>('user')
  const [usageUsed, setUsageUsed] = useState<number>(0)
  const [usageLimit, setUsageLimit] = useState<number | null>(null)
  const [uploadedFile, setUploadedFile] = useState<{
    fileId: string
    fileName: string
    fileType: string
  } | null>(null)
  const [validationReport, setValidationReport] = useState<any>(null)
  const [releaseValidationReport, setReleaseValidationReport] = useState<any>(null)
  const [isRelease, setIsRelease] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5205'

  // Check if user is already logged in
  useEffect(() => {
    const savedUsername = sessionStorage.getItem('username')
    const savedUserId = sessionStorage.getItem('userId')
    if (savedUsername) {
      setIsLoggedIn(true)
      setUsername(savedUsername)
      setUserId(savedUserId || '')
    }
  }, [])

  // Fetch user plan/role and usage when logged in
  useEffect(() => {
    if (!isLoggedIn) return

    const token = sessionStorage.getItem('token')
    if (!token) return

    // Fetch user info (plan, role)
    fetch(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.plan) setUserPlan(data.plan)
        if (data.role) setUserRole(data.role)
      })
      .catch(() => {})

    // Fetch usage
    fetch(`${apiUrl}/api/validation/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setUsageUsed(data.used || 0)
        setUsageLimit(data.limit ?? null)
      })
      .catch(() => {})
  }, [isLoggedIn, apiUrl])

  const handleLogin = (user: string) => {
    setIsLoggedIn(true)
    setUsername(user)
    sessionStorage.setItem('username', user)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUsername('')
    setUserPlan('free')
    setUserRole('user')
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('userId')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('refreshToken')
    sessionStorage.removeItem('user')
    setUploadedFile(null)
    setValidationReport(null)
  }

  const handleFileUploaded = (fileData: { fileId: string; fileName: string; fileType: string } | null) => {
    setUploadedFile(fileData)
    setValidationReport(null)
    setReleaseValidationReport(null)
    setIsRelease(fileData?.fileType === 'bprelease')
  }

  const handleValidationComplete = (report: any) => {
    setValidationReport(report)
    setReleaseValidationReport(null)
    setUsageUsed((prev) => prev + 1)
  }

  const handleReleaseValidationComplete = (report: any) => {
    setReleaseValidationReport(report)
    setValidationReport(null)
    setUsageUsed((prev) => prev + 1)
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
      'automationanywhere': 'Bot',
    }
    return typeMap[fileType.toLowerCase()] || 'Artifact'
  }

  const viewTitles: Record<ViewType, string> = {
    upload: uploadedFile ? `Validate ${getArtifactTypeDisplay(uploadedFile.fileType)}` : 'Upload Artifact',
    analytics: 'Analytics & Insights',
    config: 'Configure Rules',
    history: 'Validation History',
    customrules: 'Custom Rules',
    integrations: 'Integrations',
    approvals: 'Approval Workflows',
    users: 'User Management',
  }

  const viewSubtitles: Record<ViewType, string> = {
    upload: uploadedFile
      ? `Review and validate your ${getArtifactTypeDisplay(uploadedFile.fileType).toLowerCase()} against configured rules`
      : 'Upload and validate your automation artifacts across supported platforms',
    analytics: 'Track compliance trends and analyze validation patterns',
    config: 'Customize rule sets and validation criteria',
    history: 'View past validation results',
    customrules: 'Create and manage your own validation rules',
    integrations: 'Connect to GitHub, Jira, and other tools',
    approvals: 'Manage approval workflows and review pending requests',
    users: 'Manage users, roles, plans, and view audit logs',
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
        userPlan={userPlan}
        userRole={userRole}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-blueprism-darkblue mb-2">
                  {viewTitles[currentView]}
                </h1>
                <p className="text-gray-600">
                  {viewSubtitles[currentView]}
                </p>
              </div>

              {/* Usage indicator for free tier */}
              {userPlan === 'free' && usageLimit && (
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">
                    {usageUsed} / {usageLimit} validations this month
                  </div>
                  <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usageUsed / usageLimit > 0.8 ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min((usageUsed / usageLimit) * 100, 100)}%` }}
                    />
                  </div>
                  {usageUsed / usageLimit > 0.8 && (
                    <a href="/#pricing" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                      Upgrade for unlimited
                    </a>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          {currentView === 'upload' && (
            <div className="space-y-8">
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
                        if (uploadedFile) {
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

          {currentView === 'customrules' && <CustomRuleBuilder userId={userId} />}

          {currentView === 'integrations' && <Integrations userId={userId} apiUrl={apiUrl} />}

          {currentView === 'approvals' && <Approvals userId={userId} apiUrl={apiUrl} />}

          {currentView === 'users' && <UserManagement userId={userId} apiUrl={apiUrl} userRole={userRole} />}
        </div>
      </main>
    </div>
  )
}
