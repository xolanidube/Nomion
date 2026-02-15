'use client'

import { useState, useEffect } from 'react'

interface Integration {
  integrationId: string
  provider: string
  name: string
  description: string | null
  externalAccount: string | null
  status: string
  lastSyncAt: string | null
  errorMessage: string | null
  createdAt: string
}

interface IntegrationRepo {
  repoId: string
  integrationId: string
  externalId: string
  name: string
  fullName: string | null
  url: string | null
  defaultBranch: string
  autoValidate: boolean
  validateOnPr: boolean
  validateOnPush: boolean
  failOnError: boolean
  postComments: boolean
  status: string
}

interface IntegrationsProps {
  userId: string
  apiUrl: string
}

export default function Integrations({ userId, apiUrl }: IntegrationsProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [repos, setRepos] = useState<IntegrationRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingProvider, setAddingProvider] = useState<string | null>(null)

  useEffect(() => {
    fetchIntegrations()
  }, [userId])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${apiUrl}/api/integrations?userId=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch integrations')
      const data = await response.json()
      setIntegrations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchRepos = async (integrationId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/integrations/${integrationId}/repos`)
      if (!response.ok) throw new Error('Failed to fetch repositories')
      const data = await response.json()
      setRepos(data)
    } catch (err) {
      console.error('Error fetching repos:', err)
    }
  }

  const selectIntegration = (integration: Integration) => {
    setSelectedIntegration(integration)
    fetchRepos(integration.integrationId)
  }

  const startOAuth = async (provider: string) => {
    setAddingProvider(provider)
    try {
      const response = await fetch(`${apiUrl}/api/${provider}/oauth/url?userId=${userId}`)
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(`Failed to start ${provider} authentication`)
      setAddingProvider(null)
    }
  }

  const deleteIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return

    try {
      const response = await fetch(`${apiUrl}/api/integrations/${integrationId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete integration')
      fetchIntegrations()
      if (selectedIntegration?.integrationId === integrationId) {
        setSelectedIntegration(null)
        setRepos([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const updateRepoSettings = async (repoId: string, settings: Partial<IntegrationRepo>) => {
    if (!selectedIntegration) return

    try {
      const response = await fetch(
        `${apiUrl}/api/integrations/${selectedIntegration.integrationId}/repos/${repoId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        }
      )
      if (!response.ok) throw new Error('Failed to update repository settings')
      fetchRepos(selectedIntegration.integrationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'github':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
          </svg>
        )
      case 'bitbucket':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.9zM14.52 15.53H9.522L8.17 8.466h7.561z"/>
          </svg>
        )
      case 'azure_devops':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 8.877L2.247 5.91l8.405-3.416V.022l7.37 5.393L2.966 8.338v8.225L0 15.707zm24-4.45v14.651l-5.753 4.9-9.303-3.057v3.056l-5.978-7.416 15.057 1.798V5.415z"/>
          </svg>
        )
      case 'jira':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.057A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.004-1.005zm5.723-5.756H5.736a5.215 5.215 0 005.215 5.214h2.129v2.058a5.218 5.218 0 005.215 5.214V6.758a1.001 1.001 0 00-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 005.215 5.215h2.129v2.057A5.215 5.215 0 0024 12.483V1.005A1.005 1.005 0 0023.013 0z"/>
          </svg>
        )
      case 'slack':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 012.52-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 01-2.521 2.521 2.528 2.528 0 01-2.521-2.521V2.522A2.528 2.528 0 0115.166 0a2.528 2.528 0 012.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 012.521 2.52A2.528 2.528 0 0115.166 24a2.528 2.528 0 01-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 01-2.521-2.521 2.528 2.528 0 012.521-2.521h6.312A2.528 2.528 0 0124 15.166a2.528 2.528 0 01-2.522 2.521h-6.312z"/>
          </svg>
        )
      case 'teams':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.625 8.073h-2.188V6.499a.937.937 0 00-.937-.938h-6.563a.937.937 0 00-.937.938v1.574H7.813a.937.937 0 00-.938.937v6.563c0 .517.42.937.938.937h2.187v1.574c0 .518.42.938.938.938h6.562a.937.937 0 00.938-.938V16.51h2.187a.937.937 0 00.938-.937V9.01a.937.937 0 00-.938-.937z"/>
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    }
  }

  const providers = [
    { id: 'github', name: 'GitHub', description: 'Connect GitHub repositories for PR validation' },
    { id: 'bitbucket', name: 'Bitbucket', description: 'Connect Bitbucket repositories for PR validation' },
    { id: 'azure_devops', name: 'Azure DevOps', description: 'Connect Azure DevOps repos and pipelines' },
    { id: 'jira', name: 'Jira', description: 'Create issues for validation violations' },
    { id: 'slack', name: 'Slack', description: 'Send notifications to Slack channels' },
    { id: 'teams', name: 'Microsoft Teams', description: 'Send notifications to Teams channels' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Integration
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Integrations List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Connected</h2>
          {integrations.length === 0 ? (
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-gray-500 dark:text-gray-400">No integrations connected</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 text-blue-600 hover:underline"
              >
                Add your first integration
              </button>
            </div>
          ) : (
            integrations.map((integration) => (
              <div
                key={integration.integrationId}
                onClick={() => selectIntegration(integration)}
                className={`p-4 bg-white dark:bg-gray-800 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedIntegration?.integrationId === integration.integrationId
                    ? 'border-blue-500'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-gray-600 dark:text-gray-400">
                    {getProviderIcon(integration.provider)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {integration.externalAccount}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(integration.status)}`}>
                    {integration.status}
                  </span>
                </div>
                {integration.errorMessage && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 truncate">
                    {integration.errorMessage}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Selected Integration Details */}
        <div className="lg:col-span-2">
          {selectedIntegration ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-gray-600 dark:text-gray-400">
                    {getProviderIcon(selectedIntegration.provider)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedIntegration.name}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      Connected: {new Date(selectedIntegration.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteIntegration(selectedIntegration.integrationId)}
                  className="text-red-600 hover:text-red-700 p-2"
                  title="Delete integration"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Repository Settings */}
              {['github', 'bitbucket', 'azure_devops'].includes(selectedIntegration.provider) && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Connected Repositories
                  </h3>
                  {repos.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      No repositories connected. Repositories will appear here when webhooks are received.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {repos.map((repo) => (
                        <div
                          key={repo.repoId}
                          className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {repo.fullName || repo.name}
                              </h4>
                              {repo.url && (
                                <a
                                  href={repo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  View repository
                                </a>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(repo.status)}`}>
                              {repo.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={repo.validateOnPr}
                                onChange={(e) => updateRepoSettings(repo.repoId, { validateOnPr: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Validate on PR
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={repo.validateOnPush}
                                onChange={(e) => updateRepoSettings(repo.repoId, { validateOnPush: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Validate on Push
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={repo.failOnError}
                                onChange={(e) => updateRepoSettings(repo.repoId, { failOnError: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Fail on Error
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={repo.postComments}
                                onChange={(e) => updateRepoSettings(repo.repoId, { postComments: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Post Comments
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                Select an integration
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Choose an integration from the list to view its settings
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Integration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add Integration
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => startOAuth(provider.id)}
                  disabled={addingProvider === provider.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600 dark:text-gray-400">
                      {getProviderIcon(provider.id)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {provider.description}
                      </p>
                    </div>
                    {addingProvider === provider.id && (
                      <div className="ml-auto animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
