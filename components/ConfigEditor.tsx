'use client'

import { useState, useEffect, useRef } from 'react'
import { apiClient, ConfigInfo } from '@/lib/api'

export default function ConfigEditor() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [editingRule, setEditingRule] = useState<any>(null)
  const [originalRule, setOriginalRule] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Config management state
  const [configList, setConfigList] = useState<ConfigInfo[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [loadingConfigs, setLoadingConfigs] = useState(true)
  const [showNewConfigModal, setShowNewConfigModal] = useState(false)
  const [newConfigName, setNewConfigName] = useState('')
  const [newConfigDescription, setNewConfigDescription] = useState('')

  useEffect(() => {
    loadConfigs()
  }, [])

  useEffect(() => {
    if (selectedConfigId) {
      loadConfig(selectedConfigId)
    }
  }, [selectedConfigId])

  const loadConfigs = async () => {
    setLoadingConfigs(true)
    try {
      // Load all available configs (not user-specific for now)
      const configs = await apiClient.getAllConfigs()
      setConfigList(configs)

      // Select default config if available
      const defaultConfig = configs.find(c => c.isDefault)
      if (defaultConfig) {
        setSelectedConfigId(defaultConfig.configId)
      } else if (configs.length > 0) {
        setSelectedConfigId(configs[0].configId)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load configurations')
    } finally {
      setLoadingConfigs(false)
      setLoading(false)
    }
  }

  const loadConfig = async (configId?: string) => {
    setLoading(true)
    setError(null)
    setExpandedRule(null)
    setEditingRule(null)
    try {
      const data = configId
        ? await apiClient.getConfigData(configId)
        : await apiClient.getRuleConfiguration()
      setConfig(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectConfig = (configId: string) => {
    setSelectedConfigId(configId)
  }

  const handleCreateConfig = async () => {
    if (!newConfigName.trim()) {
      setError('Config name is required')
      return
    }

    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : null
      if (!user?.userId) {
        setError('Not authenticated. Please log in again.')
        return
      }

      // Get the platform from the selected config or default to blueprism
      const selectedConfig = configList.find(c => c.configId === selectedConfigId)
      const platform = selectedConfig?.platform || 'blueprism'

      const newConfig = await apiClient.createConfig({
        name: newConfigName,
        description: newConfigDescription,
        platform: platform,
        cloneFromConfigId: selectedConfigId || undefined,
        userId: user.userId
      })

      await loadConfigs()
      setSelectedConfigId(newConfig.configId)
      setShowNewConfigModal(false)
      setNewConfigName('')
      setNewConfigDescription('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to create configuration')
    }
  }

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return
    }

    try {
      await apiClient.deleteConfig(configId)
      await loadConfigs()

      // Select another config if the deleted one was selected
      if (selectedConfigId === configId) {
        const remainingConfigs = configList.filter(c => c.configId !== configId)
        if (remainingConfigs.length > 0) {
          setSelectedConfigId(remainingConfigs[0].configId)
        } else {
          setSelectedConfigId(null)
          setConfig(null)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete configuration')
    }
  }

  const handleSave = async () => {
    if (!selectedConfigId) {
      setError('No configuration selected')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      // Extract metadata and config data
      const metadata = config._metadata || {}

      await apiClient.updateConfig(selectedConfigId, {
        name: metadata.name || 'Unnamed Configuration',
        description: metadata.description || '',
        configData: config
      })

      // Reload config list to update counts from database
      await loadConfigs()

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const toggleRuleActive = (groupKey: string, ruleKey: string) => {
    setConfig((prev: any) => {
      const newConfig = JSON.parse(JSON.stringify(prev)) // Deep copy
      const isActive = newConfig.RuleGroups[groupKey].Rules[ruleKey].Active
      newConfig.RuleGroups[groupKey].Rules[ruleKey].Active = !isActive
      return newConfig
    })
  }

  const toggleAllRules = (active: boolean) => {
    setConfig((prev: any) => {
      const newConfig = JSON.parse(JSON.stringify(prev)) // Deep copy
      Object.keys(newConfig.RuleGroups).forEach((groupKey) => {
        Object.keys(newConfig.RuleGroups[groupKey].Rules).forEach((ruleKey) => {
          newConfig.RuleGroups[groupKey].Rules[ruleKey].Active = active
        })
      })
      return newConfig
    })
  }

  const toggleGroupRules = (groupKey: string, active: boolean) => {
    setConfig((prev: any) => {
      const newConfig = JSON.parse(JSON.stringify(prev)) // Deep copy
      Object.keys(newConfig.RuleGroups[groupKey].Rules).forEach((ruleKey) => {
        newConfig.RuleGroups[groupKey].Rules[ruleKey].Active = active
      })
      return newConfig
    })
  }

  const getGroupStats = (group: any) => {
    const rules = Object.values(group.Rules || {}) as any[]
    const total = rules.length
    const active = rules.filter(r => r.Active).length
    return { total, active, allActive: active === total, noneActive: active === 0 }
  }

  // Calculate total active rules from local config state
  const getLocalConfigStats = () => {
    if (!config?.RuleGroups) return { total: 0, active: 0 }
    let total = 0
    let active = 0
    Object.values(config.RuleGroups).forEach((group: any) => {
      Object.values(group.Rules || {}).forEach((rule: any) => {
        total++
        if (rule.Active) active++
      })
    })
    return { total, active }
  }

  const handleRuleClick = (groupKey: string, ruleKey: string) => {
    const ruleId = `${groupKey}:${ruleKey}`
    if (expandedRule === ruleId) {
      setExpandedRule(null)
      setEditingRule(null)
      setOriginalRule(null)
    } else {
      setExpandedRule(ruleId)
      const rule = { ...config.RuleGroups[groupKey].Rules[ruleKey] }
      setEditingRule(rule)
      setOriginalRule({ ...rule })
    }
  }

  const handleRuleFieldChange = (field: string, value: any) => {
    setEditingRule((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveRule = (groupKey: string, ruleKey: string) => {
    setConfig((prev: any) => {
      const newConfig = { ...prev }
      newConfig.RuleGroups[groupKey].Rules[ruleKey] = { ...editingRule }
      return newConfig
    })
    setExpandedRule(null)
    setEditingRule(null)
    setOriginalRule(null)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  const handleCancelRule = () => {
    setEditingRule(originalRule)
    setExpandedRule(null)
    setOriginalRule(null)
  }

  const handleUploadConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string)
          setConfig(json)
          setSuccess(true)
          setTimeout(() => setSuccess(false), 3000)
        } catch (err) {
          setError('Invalid JSON file')
          setTimeout(() => setError(null), 3000)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleCloneConfig = () => {
    const clonedConfig = JSON.parse(JSON.stringify(config))
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const blob = new Blob([JSON.stringify(clonedConfig, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rulesConfig-clone-${timestamp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCreateDerivative = () => {
    const derivativeConfig = JSON.parse(JSON.stringify(config))
    // Add metadata to indicate it's a derivative
    derivativeConfig.Metadata = {
      ...derivativeConfig.Metadata,
      isDerivedFrom: 'base-config',
      derivedAt: new Date().toISOString()
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const blob = new Blob([JSON.stringify(derivativeConfig, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rulesConfig-derivative-${timestamp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin h-8 w-8 text-blueprism-blue"
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
          <span className="ml-3 text-gray-600">Loading configuration...</span>
        </div>
      </div>
    )
  }

  if (error && !config) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
        <button
          onClick={() => loadConfig()}
          className="mt-4 bg-blueprism-blue text-white font-medium px-6 py-2 rounded-lg hover:bg-blueprism-darkblue transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  // Helper function to render dynamic form fields based on rule properties
  const renderRuleField = (key: string, value: any) => {
    if (key === 'Active' || key === 'Category') return null // Handle separately

    if (Array.isArray(value)) {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{key}</label>
          <textarea
            value={value.join(', ')}
            onChange={(e) => handleRuleFieldChange(key, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
            rows={3}
            placeholder="Comma-separated values"
          />
        </div>
      )
    }

    if (typeof value === 'number') {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{key}</label>
          <input
            type="number"
            value={value}
            onChange={(e) => handleRuleFieldChange(key, parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
          />
        </div>
      )
    }

    if (typeof value === 'boolean') {
      return (
        <div key={key} className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleRuleFieldChange(key, e.target.checked)}
            className="w-4 h-4 text-blueprism-blue border-gray-300 rounded focus:ring-blueprism-blue"
          />
          <label className="text-sm font-medium text-gray-700">{key}</label>
        </div>
      )
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{key}</label>
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                handleRuleFieldChange(key, JSON.parse(e.target.value))
              } catch {}
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent font-mono text-xs"
            rows={5}
          />
        </div>
      )
    }

    return (
      <div key={key} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{key}</label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleRuleFieldChange(key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
        />
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Config List Sidebar */}
      <div className="w-80 bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Configurations</h3>
          <button
            onClick={() => setShowNewConfigModal(true)}
            className="p-2 text-blueprism-blue hover:bg-blue-50 rounded-lg transition-colors"
            title="Create new configuration"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {loadingConfigs ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-blueprism-blue" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <div className="space-y-2">
            {configList.map((cfg) => (
              <div
                key={cfg.configId}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConfigId === cfg.configId
                    ? 'bg-blueprism-blue bg-opacity-10 border-2 border-blueprism-blue'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
                onClick={() => handleSelectConfig(cfg.configId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{cfg.name}</h4>
                      {cfg.isBaseConfig && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Base Config
                        </span>
                      )}
                      {cfg.isDefault && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{cfg.description}</p>
                    <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                      {cfg.configId === selectedConfigId && config ? (
                        <span className="text-blueprism-blue font-medium">
                          {getLocalConfigStats().active}/{getLocalConfigStats().total} active
                        </span>
                      ) : (
                        <span>{cfg.activeRules}/{cfg.totalRules} active</span>
                      )}
                      <span>•</span>
                      <span>{new Date(cfg.modifiedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {!cfg.isDefault && !cfg.isBaseConfig && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteConfig(cfg.configId)
                      }}
                      className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete configuration"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  {cfg.isBaseConfig && (
                    <div className="ml-2 p-1 text-gray-400" title="Base configurations cannot be deleted">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Config Editor */}
      <div className="flex-1 bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blueprism-darkblue">
            Rule Configuration
          </h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blueprism-blue text-white font-medium px-6 py-2 rounded-lg hover:bg-blueprism-darkblue transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
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
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">Configuration saved successfully!</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Config Management Toolbar */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Bulk Actions:</span>
            <button
              onClick={() => toggleAllRules(true)}
              className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
            >
              Enable All
            </button>
            <button
              onClick={() => toggleAllRules(false)}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
            >
              Disable All
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300"></div>

          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Config Management:</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadConfig}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Upload</span>
            </button>
            <button
              onClick={handleCloneConfig}
              className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-300 rounded-lg hover:bg-purple-100 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Clone</span>
            </button>
            <button
              onClick={handleCreateDerivative}
              className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-300 rounded-lg hover:bg-indigo-100 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Create Derivative</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {config &&
          Object.entries(config.RuleGroups || {}).map(([groupKey, group]: [string, any]) => {
            const stats = getGroupStats(group)
            return (
            <div key={groupKey} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-bold text-gray-900">{groupKey}</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    {stats.active}/{stats.total} active
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleGroupRules(groupKey, true)}
                    disabled={stats.allActive}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      stats.allActive
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                    }`}
                  >
                    Enable All
                  </button>
                  <button
                    onClick={() => toggleGroupRules(groupKey, false)}
                    disabled={stats.noneActive}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      stats.noneActive
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                    }`}
                  >
                    Disable All
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(group.Rules || {}).map(([ruleKey, rule]: [string, any]) => {
                  const ruleId = `${groupKey}:${ruleKey}`
                  const isExpanded = expandedRule === ruleId

                  return (
                    <div
                      key={ruleKey}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* Rule Header - Clickable */}
                      <div
                        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-blueprism-blue bg-opacity-5' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => handleRuleClick(groupKey, ruleKey)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <svg
                              className={`w-5 h-5 text-gray-500 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                            <h4 className="font-medium text-gray-900">{ruleKey}</h4>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                rule.Severity?.toLowerCase() === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : rule.Severity?.toLowerCase() === 'warning'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {rule.Severity || 'Info'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 ml-8">{rule.Description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={rule.Active || false}
                            onChange={() => toggleRuleActive(groupKey, ruleKey)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blueprism-blue peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blueprism-blue"></div>
                          <span className="ml-3 text-sm font-medium text-gray-700">
                            {rule.Active ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      </div>

                      {/* Expandable Configuration Form */}
                      {isExpanded && editingRule && (
                        <div className="p-6 bg-white border-t border-gray-200">
                          <h5 className="text-lg font-semibold text-gray-900 mb-4">
                            Configure {ruleKey}
                          </h5>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {Object.entries(editingRule)
                              .filter(([key]) => key !== 'Active' && key !== 'Category')
                              .map(([key, value]) => renderRuleField(key, value))}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                            <button
                              onClick={handleCancelRule}
                              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveRule(groupKey, ruleKey)}
                              className="px-6 py-2 text-sm font-medium text-white bg-blueprism-blue rounded-lg hover:bg-blueprism-darkblue transition-colors"
                            >
                              Save Rule
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )})}
      </div>
    </div>

      {/* New Config Modal */}
      {showNewConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Configuration Name *
                </label>
                <input
                  type="text"
                  value={newConfigName}
                  onChange={(e) => setNewConfigName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
                  placeholder="e.g., Production Config"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newConfigDescription}
                  onChange={(e) => setNewConfigDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent"
                  rows={3}
                  placeholder="Describe this configuration..."
                />
              </div>

              <div className="text-sm text-gray-600">
                {selectedConfigId
                  ? 'New config will be cloned from the currently selected configuration.'
                  : 'New config will be created with default rules.'}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewConfigModal(false)
                  setNewConfigName('')
                  setNewConfigDescription('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConfig}
                className="px-4 py-2 text-sm font-medium text-white bg-blueprism-blue rounded-lg hover:bg-blueprism-darkblue transition-colors"
              >
                Create Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
