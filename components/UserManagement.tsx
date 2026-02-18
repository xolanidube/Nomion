'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

interface User {
  userId: string
  username: string
  email: string
  displayName: string | null
  plan: string
  role: string
  isActive: boolean
  createdAt: string
}

interface AuditLogEntry {
  auditId: string
  timestamp: string
  userId: string
  action: string
  resourceType: string
  resourceId: string | null
  details: string | null
}

interface UserManagementProps {
  userId: string
  apiUrl: string
  userRole: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLANS = ['free', 'team', 'business', 'enterprise'] as const
const ROLES = ['user', 'admin', 'owner'] as const

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getPlanBadgeClasses(plan: string): string {
  switch (plan.toLowerCase()) {
    case 'free':
      return 'bg-green-900/60 text-green-300 border border-green-700'
    case 'team':
      return 'bg-blue-900/60 text-blue-300 border border-blue-700'
    case 'business':
      return 'bg-purple-900/60 text-purple-300 border border-purple-700'
    case 'enterprise':
      return 'bg-yellow-900/60 text-yellow-300 border border-yellow-700'
    default:
      return 'bg-gray-700 text-gray-300 border border-gray-600'
  }
}

function getRoleBadgeClasses(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-blue-900/60 text-blue-300 border border-blue-700'
    case 'owner':
      return 'bg-yellow-900/60 text-yellow-300 border border-yellow-700'
    default:
      return 'bg-gray-700 text-gray-300 border border-gray-600'
  }
}

function getStatusBadgeClasses(active: boolean): string {
  return active
    ? 'bg-green-900/60 text-green-300 border border-green-700'
    : 'bg-red-900/60 text-red-300 border border-red-700'
}

// ── Component ────────────────────────────────────────────────────────────────

export default function UserManagement({ userId, apiUrl, userRole }: UserManagementProps) {
  // User list state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(true)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all')

  // Inline editing state
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null)
  const [editingPlanUserId, setEditingPlanUserId] = useState<string | null>(null)
  const [pendingRole, setPendingRole] = useState<string>('')
  const [pendingPlan, setPendingPlan] = useState<string>('')

  // Operation feedback
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isOwner = userRole === 'owner'
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner'

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true)
      setUsersError(null)
      const response = await fetch(`${apiUrl}/api/auth/users`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error(`Failed to fetch users (${response.status})`)
      const data = await response.json()
      setUsers(data)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }, [apiUrl])

  const fetchAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true)
      setAuditError(null)
      const response = await fetch(`${apiUrl}/api/audit?limit=50`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error(`Failed to fetch audit logs (${response.status})`)
      const data = await response.json()
      setAuditLogs(data)
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setAuditLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    fetchUsers()
    fetchAuditLogs()
  }, [fetchUsers, fetchAuditLogs])

  // ── Actions ──────────────────────────────────────────────────────────────

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) {
      setEditingRoleUserId(null)
      return
    }
    try {
      setActionLoading(targetUserId)
      const response = await fetch(`${apiUrl}/api/auth/users/${targetUserId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole }),
      })
      if (!response.ok) throw new Error(`Failed to update role (${response.status})`)
      await fetchUsers()
      showSuccess(`Role updated to "${newRole}" successfully.`)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setActionLoading(null)
      setEditingRoleUserId(null)
    }
  }

  const handleChangePlan = async (targetUserId: string, newPlan: string) => {
    try {
      setActionLoading(targetUserId)
      const response = await fetch(`${apiUrl}/api/auth/users/${targetUserId}/plan`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan: newPlan }),
      })
      if (!response.ok) throw new Error(`Failed to update plan (${response.status})`)
      await fetchUsers()
      showSuccess(`Plan updated to "${newPlan}" successfully.`)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to update plan')
    } finally {
      setActionLoading(null)
      setEditingPlanUserId(null)
    }
  }

  const handleDeactivateUser = async (targetUserId: string, username: string) => {
    if (targetUserId === userId) {
      setUsersError('You cannot deactivate your own account.')
      return
    }
    if (!confirm(`Are you sure you want to deactivate user "${username}"? This action cannot be easily undone.`)) {
      return
    }
    try {
      setActionLoading(targetUserId)
      const response = await fetch(`${apiUrl}/api/auth/users/${targetUserId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error(`Failed to deactivate user (${response.status})`)
      await fetchUsers()
      showSuccess(`User "${username}" has been deactivated.`)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to deactivate user')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Audit log filtering ─────────────────────────────────────────────────

  const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action))).sort()
  const filteredAuditLogs =
    auditActionFilter === 'all'
      ? auditLogs
      : auditLogs.filter((l) => l.action === auditActionFilter)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage users, roles, plans, and review audit activity.
          </p>
        </div>
        <button
          onClick={() => { fetchUsers(); fetchAuditLogs() }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Success message ──────────────────────────────────────────────── */}
      {successMessage && (
        <div className="p-4 bg-green-900/40 border border-green-700 text-green-300 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* ── Users error ──────────────────────────────────────────────────── */}
      {usersError && (
        <div className="p-4 bg-red-900/40 border border-red-700 text-red-300 rounded-lg flex items-center justify-between">
          <span>{usersError}</span>
          <button onClick={() => setUsersError(null)} className="ml-4 underline text-sm hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          USER LIST TABLE
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {users.length} user{users.length !== 1 ? 's' : ''} registered
          </p>
        </div>

        {usersLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="mt-4 text-gray-500 dark:text-gray-400">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Display Name</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  {isAdminOrOwner && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => {
                  const isCurrentUser = user.userId === userId
                  const isRowLoading = actionLoading === user.userId

                  return (
                    <tr
                      key={user.userId}
                      className={`transition-colors ${
                        isRowLoading
                          ? 'opacity-50 pointer-events-none'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      {/* Username */}
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {user.username}
                          {isCurrentUser && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
                              you
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {user.email}
                      </td>

                      {/* Display Name */}
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {user.displayName || <span className="text-gray-400 dark:text-gray-500 italic">--</span>}
                      </td>

                      {/* Plan */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isOwner && editingPlanUserId === user.userId ? (
                          <select
                            value={pendingPlan}
                            onChange={(e) => setPendingPlan(e.target.value)}
                            onBlur={() => {
                              if (pendingPlan !== user.plan) {
                                handleChangePlan(user.userId, pendingPlan)
                              } else {
                                setEditingPlanUserId(null)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditingPlanUserId(null)
                              if (e.key === 'Enter') {
                                if (pendingPlan !== user.plan) {
                                  handleChangePlan(user.userId, pendingPlan)
                                } else {
                                  setEditingPlanUserId(null)
                                }
                              }
                            }}
                            autoFocus
                            className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
                          >
                            {PLANS.map((p) => (
                              <option key={p} value={p}>
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => {
                              if (isOwner) {
                                setEditingPlanUserId(user.userId)
                                setPendingPlan(user.plan)
                                setEditingRoleUserId(null)
                              }
                            }}
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${getPlanBadgeClasses(user.plan)} ${
                              isOwner ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                            }`}
                            title={isOwner ? 'Click to change plan' : ''}
                          >
                            {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                          </button>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isOwner && editingRoleUserId === user.userId ? (
                          <select
                            value={pendingRole}
                            onChange={(e) => setPendingRole(e.target.value)}
                            onBlur={() => {
                              if (pendingRole !== user.role) {
                                handleChangeRole(user.userId, pendingRole)
                              } else {
                                setEditingRoleUserId(null)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditingRoleUserId(null)
                              if (e.key === 'Enter') {
                                if (pendingRole !== user.role) {
                                  handleChangeRole(user.userId, pendingRole)
                                } else {
                                  setEditingRoleUserId(null)
                                }
                              }
                            }}
                            autoFocus
                            className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => {
                              if (isOwner) {
                                setEditingRoleUserId(user.userId)
                                setPendingRole(user.role)
                                setEditingPlanUserId(null)
                              }
                            }}
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadgeClasses(user.role)} ${
                              isOwner ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                            }`}
                            title={isOwner ? 'Click to change role' : ''}
                          >
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeClasses(user.isActive)}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      {isAdminOrOwner && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {!isCurrentUser && user.isActive && (
                            <button
                              onClick={() => handleDeactivateUser(user.userId, user.username)}
                              disabled={isRowLoading}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-300 bg-red-900/40 border border-red-700 rounded-lg hover:bg-red-900/70 transition-colors disabled:opacity-50"
                              title="Deactivate user"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              Deactivate
                            </button>
                          )}
                          {isCurrentUser && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">--</span>
                          )}
                          {!isCurrentUser && !user.isActive && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">Deactivated</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          AUDIT LOG SECTION
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Log</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Recent activity across the platform (last 50 entries)
            </p>
          </div>

          {/* Action filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="audit-filter" className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Filter by action:
            </label>
            <select
              id="audit-filter"
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="bg-gray-700 text-white text-xs rounded-lg px-3 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit error */}
        {auditError && (
          <div className="mx-6 mt-4 p-4 bg-red-900/40 border border-red-700 text-red-300 rounded-lg flex items-center justify-between">
            <span>{auditError}</span>
            <button onClick={() => setAuditError(null)} className="ml-4 underline text-sm hover:text-red-200">
              Dismiss
            </button>
          </div>
        )}

        {auditLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredAuditLogs.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {auditActionFilter !== 'all' ? 'No entries match the selected filter.' : 'No audit log entries found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">User ID</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Resource Type</th>
                  <th className="px-6 py-3">Resource ID</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAuditLogs.map((entry) => (
                  <tr key={entry.auditId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs">
                      {entry.userId}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-700 text-gray-200 border border-gray-600">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">
                      {entry.resourceType}
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs">
                      {entry.resourceId || <span className="text-gray-500 italic">--</span>}
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300 text-xs max-w-xs truncate" title={entry.details || ''}>
                      {entry.details || <span className="text-gray-500 italic">--</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
