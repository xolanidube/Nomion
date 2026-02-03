const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5205/api'

export interface UploadedFile {
  fileId: string
  fileName: string
  fileType: string
  filePath: string
  uploadedAt: string
}

export interface ValidationRequest {
  fileId: string
  ruleConfigId?: string
  selectedRules?: string[]
  platform?: string
}

export interface ValidationResult {
  ruleId: string
  ruleName: string
  description: string
  severity: string
  passed: boolean
  occurrences: number
  messages: ValidationMessage[]
  message?: string
}

export interface ValidationMessage {
  message: string
  detail?: string
  location?: {
    artifactName?: string
    stageName?: string
    pageName?: string
    lineNumber?: number
  }
}

export interface ValidationReport {
  validationId: string
  fileName: string
  fileType: string
  timestamp: string
  summary: {
    totalRules: number
    passed: number
    failed: number
    warnings: number
    durationMs: number
  }
  results: ValidationResult[]
}

export interface ArtifactValidationResult {
  artifactId: string
  artifactName: string
  artifactType: string
  metadata?: Record<string, string | null>
  summary: {
    totalRules: number
    passed: number
    failed: number
    warnings: number
    durationMs: number
  }
  results: ValidationResult[]
}

export interface ArtifactMetadata {
  artifactId: string
  artifactName: string
  artifactType: string
  metadata?: Record<string, string | null>
}

export interface ArtifactGroup {
  artifactType: string
  groupName: string
  count: number
  artifacts: ArtifactMetadata[]
}

export interface ReleaseInfo {
  releaseName: string
  fileName: string
  artifactsSummary: {
    totalArtifacts: number
    processCount: number
    objectCount: number
    workQueueCount: number
    environmentVariableCount: number
    credentialCount: number
    calendarCount: number
    schedulerCount: number
    sessionCount: number
    processTemplateCount: number
    objectTemplateCount: number
  }
  artifacts: ArtifactMetadata[]
  artifactGroups: ArtifactGroup[]
}

export interface ReleaseValidationReport {
  validationId: string
  releaseName: string
  fileName: string
  timestamp: string
  artifactsSummary: {
    totalArtifacts: number
    processCount: number
    objectCount: number
    workQueueCount: number
    environmentVariableCount: number
    credentialCount: number
    calendarCount: number
    schedulerCount: number
    sessionCount: number
    processTemplateCount: number
    objectTemplateCount: number
  }
  overallSummary: {
    totalRules: number
    passed: number
    failed: number
    warnings: number
    durationMs: number
  }
  artifactResults: ArtifactValidationResult[]
  durationMs: number
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async uploadFile(file: File): Promise<UploadedFile> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseUrl}/fileupload/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload file')
    }

    return response.json()
  }

  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/fileupload/${fileId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete file')
    }
  }

  async validateFile(request: ValidationRequest, fileType?: string): Promise<ValidationReport> {
    // Route to platform-specific endpoint if fileType is provided
    if (fileType) {
      if (fileType === 'uipath-workflow' || fileType === 'uipath_workflow') {
        return this.validateUiPathWorkflow(request)
      }
      if (fileType === 'uipath-package' || fileType === 'uipath') {
        return this.validateUiPathPackage(request)
      }
    }

    // Fall back to generic validation endpoint
    const response = await fetch(`${this.baseUrl}/validation/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to validate file')
    }

    return response.json()
  }

  // UiPath-specific methods

  async getUiPathRules(category?: string): Promise<UiPathRulesResponse> {
    let url = `${this.baseUrl}/uipath/rules`
    if (category) {
      url += `?category=${encodeURIComponent(category)}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get UiPath rules')
    }

    return response.json()
  }

  async validateUiPathWorkflow(request: ValidationRequest): Promise<ValidationReport> {
    const response = await fetch(`${this.baseUrl}/uipath/validate-workflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to validate UiPath workflow')
    }

    return response.json()
  }

  async validateUiPathPackage(request: ValidationRequest): Promise<ValidationReport> {
    const response = await fetch(`${this.baseUrl}/uipath/validate-package`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to validate UiPath package')
    }

    return response.json()
  }

  async validateUiPathBatch(request: UiPathBatchValidationRequest): Promise<UiPathBatchValidationResponse> {
    const response = await fetch(`${this.baseUrl}/uipath/validate-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to validate UiPath batch')
    }

    return response.json()
  }

  async getUiPathWorkflowInfo(fileId: string): Promise<UiPathWorkflowMetadata> {
    const response = await fetch(`${this.baseUrl}/uipath/workflow-info/${fileId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get UiPath workflow info')
    }

    return response.json()
  }

  async getUiPathProjectInfo(fileId: string): Promise<UiPathProjectMetadata> {
    const response = await fetch(`${this.baseUrl}/uipath/project-info/${fileId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get UiPath project info')
    }

    return response.json()
  }

  async validateRelease(request: ValidationRequest): Promise<ReleaseValidationReport> {
    const response = await fetch(`${this.baseUrl}/validation/analyze-release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to validate release')
    }

    return response.json()
  }

  async getReleaseInfo(fileId: string): Promise<ReleaseInfo> {
    const response = await fetch(`${this.baseUrl}/validation/release-info/${fileId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get release info')
    }

    return response.json()
  }

  async validateArtifact(request: {
    fileId: string
    artifactId: string
    ruleConfigId?: string
    selectedRules?: string[]
    platform?: string
  }): Promise<ArtifactValidationResult> {
    const response = await fetch(`${this.baseUrl}/validation/validate-artifact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to validate artifact')
    }

    return response.json()
  }

  async getRuleConfiguration(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/configuration/rules`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to load configuration')
    }

    return response.json()
  }

  async updateRuleConfiguration(config: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/configuration/rules`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update configuration')
    }
  }

  // Config Management Methods

  async getAllConfigs(): Promise<ConfigInfo[]> {
    const response = await fetch(`${this.baseUrl}/configuration/configs`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get configurations')
    }

    return response.json()
  }

  async getConfigsByPlatform(platform: string): Promise<ConfigInfo[]> {
    const response = await fetch(`${this.baseUrl}/config/by-platform/${platform}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get configurations by platform')
    }

    return response.json()
  }

  async getUserConfigs(userId: string): Promise<ConfigInfo[]> {
    const response = await fetch(`${this.baseUrl}/configuration/user/${userId}/configs`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get user configurations')
    }

    return response.json()
  }

  async getConfig(configId: string): Promise<ConfigInfo> {
    const response = await fetch(`${this.baseUrl}/configuration/configs/${configId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get configuration')
    }

    return response.json()
  }

  async getConfigData(configId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/configuration/configs/${configId}/data`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get configuration data')
    }

    return response.json()
  }

  async createConfig(request: CreateConfigRequest): Promise<ConfigInfo> {
    const response = await fetch(`${this.baseUrl}/configuration/configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create configuration')
    }

    return response.json()
  }

  async updateConfig(configId: string, request: UpdateConfigRequest): Promise<ConfigInfo> {
    const response = await fetch(`${this.baseUrl}/configuration/configs/${configId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update configuration')
    }

    return response.json()
  }

  async deleteConfig(configId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/configuration/configs/${configId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete configuration')
    }
  }

  async revertConfig(configId: string): Promise<ConfigInfo> {
    const response = await fetch(`${this.baseUrl}/configuration/configs/${configId}/revert`, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to revert configuration')
    }

    return response.json()
  }

  // Authentication Methods

  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to login')
    }

    return response.json()
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to register')
    }

    return response.json()
  }

  async logout(token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to logout')
    }
  }

  async getCurrentUser(token: string): Promise<UserInfo> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get current user')
    }

    return response.json()
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to refresh token')
    }

    return response.json()
  }

  async getValidationHistory(token: string, limit = 50): Promise<ValidationHistoryItem[]> {
    const response = await fetch(`${this.baseUrl}/validation/history?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get validation history')
    }

    return response.json()
  }

  // Analytics Methods

  async getDashboard(): Promise<DashboardSummary> {
    const response = await fetch(`${this.baseUrl}/analytics/dashboard`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get dashboard data')
    }

    return response.json()
  }

  async getTrends(days: number = 30): Promise<TrendData[]> {
    const response = await fetch(`${this.baseUrl}/analytics/trends?days=${days}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get trend data')
    }

    return response.json()
  }

  async getTopViolatedRules(limit: number = 10): Promise<RuleViolationStats[]> {
    const response = await fetch(`${this.baseUrl}/analytics/top-violated-rules?limit=${limit}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get top violated rules')
    }

    return response.json()
  }

  async getUserStats(startDate?: string, endDate?: string): Promise<UserStats[]> {
    let url = `${this.baseUrl}/analytics/user-stats`
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (params.toString()) url += `?${params.toString()}`

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get user statistics')
    }

    return response.json()
  }

  async getSnapshots(startDate?: string, endDate?: string): Promise<AnalyticsSnapshot[]> {
    let url = `${this.baseUrl}/analytics/snapshots`
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (params.toString()) url += `?${params.toString()}`

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get snapshots')
    }

    return response.json()
  }

  async generateSnapshot(snapshotDate?: string): Promise<{ snapshotId: string; snapshotDate: string }> {
    let url = `${this.baseUrl}/analytics/snapshots/generate`
    if (snapshotDate) url += `?snapshotDate=${snapshotDate}`

    const response = await fetch(url, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate snapshot')
    }

    return response.json()
  }

  // Auto-Fix Methods

  async generateFixes(request: AutoFixGenerateRequest): Promise<AutoFixGenerateResponse> {
    const response = await fetch(`${this.baseUrl}/autofix/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate fixes')
    }

    return response.json()
  }

  async previewFixes(request: AutoFixPreviewRequest): Promise<AutoFixPreviewResponse> {
    const response = await fetch(`${this.baseUrl}/autofix/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to preview fixes')
    }

    return response.json()
  }

  async applyFixes(request: AutoFixApplyRequest): Promise<AutoFixApplyResponse> {
    const response = await fetch(`${this.baseUrl}/autofix/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to apply fixes')
    }

    return response.json()
  }
}

export interface ConfigInfo {
  configId: string
  name: string
  description: string
  platform: string
  isDefault: boolean
  isBaseConfig: boolean
  basedOn?: string
  createdAt: string
  modifiedAt: string
  totalRules: number
  activeRules: number
}

export interface CreateConfigRequest {
  name: string
  description: string
  platform: string
  cloneFromConfigId?: string
  userId?: string
}

export interface UpdateConfigRequest {
  name: string
  description: string
  configData: any
}

// Authentication types
export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email?: string
  password: string
  displayName?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: UserInfo
}

export interface UserInfo {
  userId: string
  username: string
  email?: string
  displayName?: string
}

export interface ValidationHistoryItem {
  id: string
  fileName: string
  fileType: string
  timestamp: string
  passed: number
  failed: number
  totalRules: number
}

// Analytics types
export interface TrendData {
  date: string
  totalViolations: number
  criticalViolations: number
  highViolations: number
  mediumViolations: number
  lowViolations: number
  complianceScore: number | null
}

export interface RuleViolationStats {
  ruleId: string
  ruleName: string
  violationCount: number
  percentage: number
}

export interface UserStats {
  userId: string
  username: string
  validationCount: number
  violationCount: number
  avgComplianceScore: number | null
}

export interface DashboardSummary {
  totalValidationsToday: number
  totalViolationsToday: number
  avgComplianceScore: number | null
  criticalViolations: number
  complianceScoreTrend: number | null
  violationTrend: number | null
  topViolatedRules: RuleViolationStats[]
  last30DaysTrend: TrendData[]
}

export interface AnalyticsSnapshot {
  snapshotId: string
  snapshotDate: string
  totalValidations: number
  totalViolations: number
  criticalViolations: number
  highViolations: number
  mediumViolations: number
  lowViolations: number
  avgComplianceScore: number | null
  totalFilesValidated: number
  createdAt: string
}

// UiPath-specific types

export interface UiPathRuleInfo {
  ruleId: string
  category: string
  description: string
  severity: string
  active: boolean
}

export interface UiPathRulesResponse {
  totalRules: number
  rules: UiPathRuleInfo[]
}

export interface UiPathBatchValidationRequest {
  fileId?: string
  workflowPaths?: string[]
  useParallel?: boolean
  ruleConfigId?: string
  selectedRules?: string[]
}

export interface UiPathFileValidationResult {
  filePath: string
  fileName: string
  summary: {
    totalRules: number
    passed: number
    failed: number
    warnings: number
    durationMs: number
  }
  results: ValidationResult[]
}

export interface UiPathBatchValidationResponse {
  validationId: string
  totalFiles: number
  successfulFiles: number
  failedFiles: number
  overallSummary: {
    totalRules: number
    passed: number
    failed: number
    warnings: number
    durationMs: number
  }
  fileResults: UiPathFileValidationResult[]
}

export interface UiPathWorkflowMetadata {
  fileName: string
  workflowType: string
  variableCount: number
  argumentCount: number
  activityCount: number
  variables: string[]
  arguments: string[]
}

export interface UiPathProjectMetadata {
  fileName: string
  projectName: string
  projectVersion: string
  description: string
  mainWorkflow: string
  dependencies: string[]
  workflowCount: number
}

// Auto-Fix Types

export interface ViolationInfo {
  ruleId: string
  stageName?: string
  pageName?: string
  message?: string
}

export interface AutoFixGenerateRequest {
  fileId: string
  violations: ViolationInfo[]
}

export interface AutoFixDto {
  fixId: string
  ruleId: string
  fixType: string
  targetType: string
  targetName?: string
  pageName?: string
  description: string
  currentValue?: string
  newValue?: string
  confidence: number
  isDestructive: boolean
}

export interface AutoFixGenerateResponse {
  fixes: AutoFixDto[]
  totalFixable: number
  highConfidenceCount: number
  lowConfidenceCount: number
  destructiveCount: number
}

export interface AutoFixPreviewRequest {
  fileId: string
  fixIds: string[]
}

export interface FixPreviewDto {
  fixId: string
  beforeXml?: string
  afterXml?: string
  success: boolean
  errorMessage?: string
}

export interface AutoFixPreviewResponse {
  previews: FixPreviewDto[]
}

export interface AutoFixApplyRequest {
  fileId: string
  fixIds: string[]
  createBackup?: boolean
}

export interface FixApplicationDetailDto {
  fixId: string
  applied: boolean
  errorMessage?: string
}

export interface AutoFixApplyResponse {
  success: boolean
  appliedCount: number
  failedCount: number
  backupFileId?: string
  newFileId?: string
  details: FixApplicationDetailDto[]
  errorMessage?: string
}

export const apiClient = new ApiClient()
