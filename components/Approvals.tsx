'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Type definitions ──

interface ApprovalWorkflow {
  workflowId: string
  name: string
  description: string | null
  triggerOnValidation: boolean
  minSeverity: string
  maxViolations: number | null
  requiredApprovers: number
  autoApproveOnPass: boolean
  blockMerge: boolean
  notifyOnRequest?: boolean
  notifyOnApproval?: boolean
  status: string
  createdAt: string
}

interface ApprovalRequest {
  requestId: string
  workflowId: string
  validationRunId: string | null
  prValidationId: string | null
  requestedBy: string | null
  status: string
  expiresAt: string | null
  context: string | null
  createdAt: string
}

interface ApprovalDecision {
  decisionId: string
  requestId: string
  approverId: string
  decision: string
  comment: string | null
  decidedAt: string
}

interface WorkflowFormData {
  name: string
  description: string
  triggerOnValidation: boolean
  minSeverity: string
  maxViolations: number | null
  requiredApprovers: number
  autoApproveOnPass: boolean
  blockMerge: boolean
  notifyOnRequest: boolean
  notifyOnApproval: boolean
}

interface ApprovalsProps {
  userId: string
  apiUrl: string
}

// ── Helper: auth headers ──

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

// ── Default form values ──

const defaultWorkflowForm: WorkflowFormData = {
  name: '',
  description: '',
  triggerOnValidation: true,
  minSeverity: 'error',
  maxViolations: null,
  requiredApprovers: 1,
  autoApproveOnPass: false,
  blockMerge: true,
  notifyOnRequest: true,
  notifyOnApproval: true,
}

// ── Component ──

export default function Approvals({ userId, apiUrl }: ApprovalsProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState<'pending' | 'workflows' | 'history'>('pending')

  // Shared
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tab 1 – Pending Approvals
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Tab 2 – Workflows
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([])
  const [showWorkflowForm, setShowWorkflowForm] = useState(false)
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null)
  const [workflowForm, setWorkflowForm] = useState<WorkflowFormData>(defaultWorkflowForm)
  const [savingWorkflow, setSavingWorkflow] = useState(false)

  // Tab 3 – History
  const [historyRequests, setHistoryRequests] = useState<ApprovalRequest[]>([])
  const [historyDecisions, setHistoryDecisions] = useState<Record<string, ApprovalDecision[]>>({})
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)

  // ── Data fetching ──

  const fetchPendingRequests = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`${apiUrl}/api/approvals/requests?userId=${userId}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to fetch pending requests')
      const data: ApprovalRequest[] = await res.json()
      setPendingRequests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [userId, apiUrl])

  const fetchWorkflows = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`${apiUrl}/api/approvals/workflows?userId=${userId}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to fetch workflows')
      const data: ApprovalWorkflow[] = await res.json()
      setWorkflows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [userId, apiUrl])

  const fetchHistory = useCallback(async () => {
    if (!userId) return
    try {
      // Fetch both workflows and all requests, then filter to non-pending
      const [reqRes, wfRes] = await Promise.all([
        fetch(`${apiUrl}/api/approvals/requests?userId=${userId}`, { headers: authHeaders() }),
        fetch(`${apiUrl}/api/approvals/workflows?userId=${userId}`, { headers: authHeaders() }),
      ])
      if (!reqRes.ok) throw new Error('Failed to fetch request history')
      if (!wfRes.ok) throw new Error('Failed to fetch workflows')

      const allRequests: ApprovalRequest[] = await reqRes.json()
      const wfData: ApprovalWorkflow[] = await wfRes.json()

      setWorkflows(wfData)
      const pastRequests = allRequests.filter((r) => r.status !== 'pending')
      setHistoryRequests(pastRequests)

      // Fetch decisions for each past request
      const decisionsMap: Record<string, ApprovalDecision[]> = {}
      await Promise.all(
        pastRequests.map(async (r) => {
          try {
            const dRes = await fetch(`${apiUrl}/api/approvals/requests/${r.requestId}/decisions`, { headers: authHeaders() })
            if (dRes.ok) {
              decisionsMap[r.requestId] = await dRes.json()
            }
          } catch {
            // silently skip
          }
        })
      )
      setHistoryDecisions(decisionsMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [userId, apiUrl])

  // Initial load based on active tab
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        if (activeTab === 'pending') {
          await fetchPendingRequests()
        } else if (activeTab === 'workflows') {
          await fetchWorkflows()
        } else if (activeTab === 'history') {
          await fetchHistory()
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [activeTab, userId, fetchPendingRequests, fetchWorkflows, fetchHistory])

  // ── Tab 1: Approve / Reject ──

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/approvals/requests/${requestId}/approve`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ approverId: userId, comment: comments[requestId] || null }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to approve')
      }
      await fetchPendingRequests()
      setComments((prev) => ({ ...prev, [requestId]: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/approvals/requests/${requestId}/reject`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ approverId: userId, comment: comments[requestId] || null }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to reject')
      }
      await fetchPendingRequests()
      setComments((prev) => ({ ...prev, [requestId]: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Tab 2: Workflow CRUD ──

  const openCreateWorkflow = () => {
    setWorkflowForm(defaultWorkflowForm)
    setEditingWorkflowId(null)
    setShowWorkflowForm(true)
  }

  const openEditWorkflow = (wf: ApprovalWorkflow) => {
    setWorkflowForm({
      name: wf.name,
      description: wf.description || '',
      triggerOnValidation: wf.triggerOnValidation,
      minSeverity: wf.minSeverity,
      maxViolations: wf.maxViolations,
      requiredApprovers: wf.requiredApprovers,
      autoApproveOnPass: wf.autoApproveOnPass,
      blockMerge: wf.blockMerge,
      notifyOnRequest: wf.notifyOnRequest ?? true,
      notifyOnApproval: wf.notifyOnApproval ?? true,
    })
    setEditingWorkflowId(wf.workflowId)
    setShowWorkflowForm(true)
  }

  const handleSaveWorkflow = async () => {
    if (!workflowForm.name.trim()) {
      setError('Workflow name is required')
      return
    }
    setSavingWorkflow(true)
    setError(null)
    try {
      const isEditing = !!editingWorkflowId
      const url = isEditing
        ? `${apiUrl}/api/approvals/workflows/${editingWorkflowId}`
        : `${apiUrl}/api/approvals/workflows`
      const method = isEditing ? 'PUT' : 'POST'

      const body: Record<string, unknown> = { ...workflowForm }
      if (!isEditing) body.userId = userId

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to save workflow')
      }
      setShowWorkflowForm(false)
      setEditingWorkflowId(null)
      await fetchWorkflows()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow')
    } finally {
      setSavingWorkflow(false)
    }
  }

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/approvals/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Failed to delete workflow')
      await fetchWorkflows()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  // ── Helpers ──

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-900 text-green-300'
      case 'rejected':
        return 'bg-red-900 text-red-300'
      case 'pending':
        return 'bg-yellow-900 text-yellow-300'
      case 'active':
        return 'bg-green-900 text-green-300'
      case 'inactive':
        return 'bg-gray-700 text-gray-300'
      case 'expired':
        return 'bg-orange-900 text-orange-300'
      default:
        return 'bg-gray-700 text-gray-300'
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---'
    return new Date(dateStr).toLocaleString()
  }

  const workflowNameById = (workflowId: string) => {
    const wf = workflows.find((w) => w.workflowId === workflowId)
    return wf?.name || workflowId.slice(0, 8)
  }

  // ── Loading state ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // ── Render ──

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approvals</h1>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/40 border border-red-700 text-red-300 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-300 hover:text-white underline text-sm">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
        {[
          { key: 'pending' as const, label: 'Pending Approvals' },
          { key: 'workflows' as const, label: 'Workflows' },
          { key: 'history' as const, label: 'History' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ──────────────────── TAB 1: PENDING APPROVALS ──────────────────── */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="p-12 bg-gray-800 rounded-lg text-center">
              <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-1">No pending approvals</h3>
              <p className="text-gray-400">When validation workflows require approval, they will appear here.</p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div key={req.requestId} className="bg-gray-800 rounded-lg border border-gray-700 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">
                        Request {req.requestId.slice(0, 8)}...
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Workflow: {workflowNameById(req.workflowId)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Request ID</span>
                    <span className="text-gray-300 font-mono text-xs">{req.requestId.slice(0, 12)}...</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Status</span>
                    <span className="text-gray-300 capitalize">{req.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Requested At</span>
                    <span className="text-gray-300">{formatDate(req.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Expires At</span>
                    <span className="text-gray-300">{formatDate(req.expiresAt)}</span>
                  </div>
                </div>

                {/* Comment & Actions */}
                <div className="border-t border-gray-700 pt-4">
                  <label className="block text-sm text-gray-400 mb-1">Comment (optional)</label>
                  <textarea
                    value={comments[req.requestId] || ''}
                    onChange={(e) => setComments((prev) => ({ ...prev, [req.requestId]: e.target.value }))}
                    placeholder="Add a comment with your decision..."
                    rows={2}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleApprove(req.requestId)}
                      disabled={actionLoading === req.requestId}
                      className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                    >
                      {actionLoading === req.requestId ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.requestId)}
                      disabled={actionLoading === req.requestId}
                      className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                    >
                      {actionLoading === req.requestId ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ──────────────────── TAB 2: WORKFLOWS ──────────────────── */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex justify-end">
            <button
              onClick={openCreateWorkflow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Workflow
            </button>
          </div>

          {/* Workflow Form (Create / Edit) */}
          {showWorkflowForm && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">
                {editingWorkflowId ? 'Edit Workflow' : 'Create New Workflow'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={workflowForm.name}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                    placeholder="e.g., Production Deployment Review"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Min Severity */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Minimum Severity</label>
                  <select
                    value={workflowForm.minSeverity}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, minSeverity: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="error">Error</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={workflowForm.description}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
                    placeholder="Describe the purpose of this approval workflow..."
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                </div>

                {/* Max Violations */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Violations Threshold</label>
                  <input
                    type="number"
                    min={0}
                    value={workflowForm.maxViolations ?? ''}
                    onChange={(e) =>
                      setWorkflowForm({
                        ...workflowForm,
                        maxViolations: e.target.value === '' ? null : parseInt(e.target.value, 10),
                      })
                    }
                    placeholder="Leave blank for any count"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Approval required only when violations exceed this number</p>
                </div>

                {/* Required Approvers */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Required Approvers</label>
                  <input
                    type="number"
                    min={1}
                    value={workflowForm.requiredApprovers}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, requiredApprovers: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of approvals needed before proceeding</p>
                </div>
              </div>

              {/* Toggle options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[
                  { key: 'triggerOnValidation' as const, label: 'Trigger on Validation', desc: 'Automatically create approval requests after validation runs' },
                  { key: 'autoApproveOnPass' as const, label: 'Auto-Approve on Pass', desc: 'Skip approval when validation passes with no violations' },
                  { key: 'blockMerge' as const, label: 'Block Merge', desc: 'Prevent merging until approval is granted' },
                  { key: 'notifyOnRequest' as const, label: 'Notify on Request', desc: 'Send notifications when an approval is requested' },
                  { key: 'notifyOnApproval' as const, label: 'Notify on Approval', desc: 'Send notifications when a decision is made' },
                ].map((toggle) => (
                  <label
                    key={toggle.key}
                    className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors"
                  >
                    <div className="relative flex items-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={workflowForm[toggle.key]}
                        onChange={(e) => setWorkflowForm({ ...workflowForm, [toggle.key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-200 block">{toggle.label}</span>
                      <span className="text-xs text-gray-500">{toggle.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Form actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    setShowWorkflowForm(false)
                    setEditingWorkflowId(null)
                  }}
                  className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWorkflow}
                  disabled={savingWorkflow}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                >
                  {savingWorkflow ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {editingWorkflowId ? 'Update Workflow' : 'Create Workflow'}
                </button>
              </div>
            </div>
          )}

          {/* Existing Workflows */}
          {workflows.length === 0 && !showWorkflowForm ? (
            <div className="p-12 bg-gray-800 rounded-lg text-center">
              <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-1">No workflows configured</h3>
              <p className="text-gray-400 mb-4">Create your first approval workflow to automate validation reviews.</p>
              <button
                onClick={openCreateWorkflow}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Create Workflow
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((wf) => (
                <div key={wf.workflowId} className="bg-gray-800 rounded-lg border border-gray-700 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white truncate">{wf.name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(wf.status)}`}>
                          {wf.status}
                        </span>
                      </div>
                      {wf.description && (
                        <p className="text-sm text-gray-400 mb-3">{wf.description}</p>
                      )}

                      {/* Trigger settings summary */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {wf.triggerOnValidation && (
                          <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded">Trigger on validation</span>
                        )}
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded">
                          Severity: {wf.minSeverity}
                        </span>
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded">
                          {wf.requiredApprovers} approver{wf.requiredApprovers !== 1 ? 's' : ''}
                        </span>
                        {wf.autoApproveOnPass && (
                          <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded">Auto-approve on pass</span>
                        )}
                        {wf.blockMerge && (
                          <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded">Blocks merge</span>
                        )}
                        {wf.maxViolations != null && (
                          <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded">
                            Max violations: {wf.maxViolations}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => openEditWorkflow(wf)}
                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Edit workflow"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(wf.workflowId)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete workflow"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────── TAB 3: HISTORY ──────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {historyRequests.length === 0 ? (
            <div className="p-12 bg-gray-800 rounded-lg text-center">
              <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-1">No approval history</h3>
              <p className="text-gray-400">Completed approval requests will appear here.</p>
            </div>
          ) : (
            historyRequests.map((req) => {
              const decisions = historyDecisions[req.requestId] || []
              const isExpanded = expandedHistory === req.requestId

              return (
                <div key={req.requestId} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  {/* Request header – clickable to expand */}
                  <button
                    onClick={() => setExpandedHistory(isExpanded ? null : req.requestId)}
                    className="w-full p-5 text-left hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-white">
                          Request {req.requestId.slice(0, 8)}...
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                        <span className="text-sm text-gray-400">
                          Workflow: {workflowNameById(req.workflowId)}
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Timeline – shown when expanded */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-700">
                      <div className="relative ml-4 mt-4">
                        {/* Vertical line */}
                        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-700"></div>

                        {/* Created event */}
                        <div className="relative flex items-start gap-4 pb-6">
                          <div className="relative z-10 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">Request Created</p>
                            <p className="text-xs text-gray-400">{formatDate(req.createdAt)}</p>
                            {req.context && (
                              <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-900 rounded px-2 py-1 inline-block">
                                {req.context}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Decision events */}
                        {decisions.map((dec) => (
                          <div key={dec.decisionId} className="relative flex items-start gap-4 pb-6">
                            <div
                              className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                dec.decision.toLowerCase() === 'approved' ? 'bg-green-600' : 'bg-red-600'
                              }`}
                            >
                              {dec.decision.toLowerCase() === 'approved' ? (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white capitalize">
                                {dec.decision} by {dec.approverId.slice(0, 8)}...
                              </p>
                              <p className="text-xs text-gray-400">{formatDate(dec.decidedAt)}</p>
                              {dec.comment && (
                                <p className="text-sm text-gray-300 mt-1 italic">&ldquo;{dec.comment}&rdquo;</p>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Final status event */}
                        <div className="relative flex items-start gap-4">
                          <div
                            className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              req.status.toLowerCase() === 'approved'
                                ? 'bg-green-600'
                                : req.status.toLowerCase() === 'rejected'
                                ? 'bg-red-600'
                                : 'bg-gray-600'
                            }`}
                          >
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white capitalize">
                              Final Status: {req.status}
                            </p>
                            {req.expiresAt && (
                              <p className="text-xs text-gray-400">
                                {new Date(req.expiresAt) < new Date() ? 'Expired' : 'Expires'}: {formatDate(req.expiresAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
