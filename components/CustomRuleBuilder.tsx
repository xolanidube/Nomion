'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Trash2,
  Edit2,
  Play,
  Save,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Code,
  FileText,
  Search
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5205';

interface CustomRule {
  ruleId: string;
  userId: string;
  name: string;
  description?: string;
  platform: string;
  targetType: string;
  targetField: string;
  conditionType: string;
  pattern: string;
  caseSensitive: boolean;
  severity: string;
  errorMessage?: string;
  category?: string;
  tags?: string[];
  isActive: boolean;
  isShared: boolean;
  timesTriggered: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TestResult {
  ruleId: string;
  testInput: string;
  passed: boolean;
  message: string;
}

const PLATFORMS = ['blueprism', 'uipath', 'powerautomate'];

const CONDITION_TYPES = [
  { value: 'Contains', label: 'Contains', description: 'Field contains the pattern' },
  { value: 'NotContains', label: 'Does not contain', description: 'Field must not contain the pattern' },
  { value: 'StartsWith', label: 'Starts with', description: 'Field starts with the pattern' },
  { value: 'EndsWith', label: 'Ends with', description: 'Field ends with the pattern' },
  { value: 'Equals', label: 'Equals', description: 'Field exactly matches the pattern' },
  { value: 'NotEquals', label: 'Does not equal', description: 'Field must not equal the pattern' },
  { value: 'Matches', label: 'Matches regex', description: 'Field matches the regex pattern' },
  { value: 'NotMatches', label: 'Does not match regex', description: 'Field must not match the regex pattern' },
  { value: 'IsEmpty', label: 'Is empty', description: 'Field is empty or whitespace' },
  { value: 'IsNotEmpty', label: 'Is not empty', description: 'Field has a value' },
  { value: 'LengthGreaterThan', label: 'Length greater than', description: 'Field length exceeds the number' },
  { value: 'LengthLessThan', label: 'Length less than', description: 'Field length is less than the number' },
  { value: 'LengthEquals', label: 'Length equals', description: 'Field length equals the number' },
];

const TARGET_TYPES: Record<string, string[]> = {
  blueprism: ['Stage', 'Page', 'Variable', 'DataItem', 'Process', 'Object', 'Action', 'EnvironmentVariable'],
  uipath: ['Activity', 'Variable', 'Argument', 'Sequence', 'Workflow', 'Selector'],
  powerautomate: ['Action', 'Trigger', 'Variable', 'Connection', 'Flow'],
};

const TARGET_FIELDS: Record<string, string[]> = {
  blueprism: ['Name', 'Description', 'Type', 'Narrative', 'InitialValue', 'Exposure', 'DataType'],
  uipath: ['Name', 'Description', 'Type', 'DisplayName', 'Selector', 'DefaultValue'],
  powerautomate: ['Name', 'Description', 'Type', 'Expression', 'ConnectionName'],
};

const SEVERITY_OPTIONS = [
  { value: 'Error', label: 'Error', color: 'text-red-500', icon: XCircle },
  { value: 'Warning', label: 'Warning', color: 'text-yellow-500', icon: AlertTriangle },
  { value: 'Info', label: 'Info', color: 'text-blue-500', icon: Info },
];

interface CustomRuleBuilderProps {
  userId: string;
}

export function CustomRuleBuilder({ userId }: CustomRuleBuilderProps) {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<Partial<CustomRule> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testingRule, setTestingRule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');

  useEffect(() => {
    fetchRules();
  }, [userId]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/customrules/user/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch rules');
      const data = await response.json();
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingRule({
      userId,
      name: '',
      description: '',
      platform: 'blueprism',
      targetType: 'Stage',
      targetField: 'Name',
      conditionType: 'Contains',
      pattern: '',
      caseSensitive: false,
      severity: 'Warning',
      errorMessage: '',
      category: '',
      tags: [],
      isActive: true,
      isShared: false,
    });
    setIsCreating(true);
    setTestResult(null);
  };

  const handleEdit = (rule: CustomRule) => {
    setEditingRule({ ...rule });
    setIsCreating(false);
    setTestResult(null);
  };

  const handleCancel = () => {
    setEditingRule(null);
    setIsCreating(false);
    setTestResult(null);
    setTestInput('');
  };

  const handleSave = async () => {
    if (!editingRule?.name || !editingRule?.pattern) {
      setError('Name and pattern are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = isCreating
        ? `${API_URL}/api/customrules`
        : `${API_URL}/api/customrules/${editingRule.ruleId}`;

      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save rule');
      }

      await fetchRules();
      handleCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`${API_URL}/api/customrules/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete rule');

      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const handleTestRule = async () => {
    if (!editingRule || !testInput) return;

    try {
      setTestingRule(true);
      setTestResult(null);

      const url = editingRule.ruleId
        ? `${API_URL}/api/customrules/${editingRule.ruleId}/test`
        : `${API_URL}/api/customrules/test`;

      const body = editingRule.ruleId
        ? { testInput }
        : {
            conditionType: editingRule.conditionType,
            pattern: editingRule.pattern,
            caseSensitive: editingRule.caseSensitive,
            errorMessage: editingRule.errorMessage,
            testInput,
          };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Test failed');
      }

      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestingRule(false);
    }
  };

  const handleToggleActive = async (rule: CustomRule) => {
    try {
      const response = await fetch(`${API_URL}/api/customrules/${rule.ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, isActive: !rule.isActive }),
      });

      if (!response.ok) throw new Error('Failed to update rule');

      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    }
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rule.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || rule.platform === filterPlatform;
    return matchesSearch && matchesPlatform;
  });

  const patternNeedsValue = (conditionType: string) => {
    return !['IsEmpty', 'IsNotEmpty'].includes(conditionType);
  };

  const patternIsNumber = (conditionType: string) => {
    return ['LengthGreaterThan', 'LengthLessThan', 'LengthEquals'].includes(conditionType);
  };

  const patternIsRegex = (conditionType: string) => {
    return ['Matches', 'NotMatches'].includes(conditionType);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Custom Rules</h2>
          <p className="text-muted-foreground">Create and manage your own validation rules</p>
        </div>
        <Button onClick={handleCreateNew} disabled={!!editingRule}>
          <Plus className="w-4 h-4 mr-2" />
          New Rule
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Rule Editor */}
      {editingRule && (
        <Card>
          <CardHeader>
            <CardTitle>{isCreating ? 'Create New Rule' : 'Edit Rule'}</CardTitle>
            <CardDescription>
              Define conditions that will be checked during validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="definition" className="space-y-4">
              <TabsList>
                <TabsTrigger value="definition">Rule Definition</TabsTrigger>
                <TabsTrigger value="test">Test Rule</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="definition" className="space-y-4">
                {/* Name and Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Rule Name *</Label>
                    <Input
                      id="name"
                      value={editingRule.name || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                      placeholder="e.g., No hardcoded paths"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={editingRule.category || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value })}
                      placeholder="e.g., Security, Naming"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingRule.description || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                    placeholder="Describe what this rule checks for..."
                    rows={2}
                  />
                </div>

                {/* Target Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Platform *</Label>
                    <Select
                      value={editingRule.platform}
                      onValueChange={(value) => setEditingRule({
                        ...editingRule,
                        platform: value,
                        targetType: TARGET_TYPES[value]?.[0] || 'Stage',
                        targetField: TARGET_FIELDS[value]?.[0] || 'Name',
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(p => (
                          <SelectItem key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Type *</Label>
                    <Select
                      value={editingRule.targetType}
                      onValueChange={(value) => setEditingRule({ ...editingRule, targetType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(TARGET_TYPES[editingRule.platform || 'blueprism'] || []).map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Field *</Label>
                    <Select
                      value={editingRule.targetField}
                      onValueChange={(value) => setEditingRule({ ...editingRule, targetField: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(TARGET_FIELDS[editingRule.platform || 'blueprism'] || []).map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Condition */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Condition *</Label>
                    <Select
                      value={editingRule.conditionType}
                      onValueChange={(value) => setEditingRule({ ...editingRule, conditionType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_TYPES.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex flex-col">
                              <span>{c.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {CONDITION_TYPES.find(c => c.value === editingRule.conditionType)?.description}
                    </p>
                  </div>

                  {patternNeedsValue(editingRule.conditionType || '') && (
                    <div className="space-y-2">
                      <Label htmlFor="pattern">
                        {patternIsNumber(editingRule.conditionType || '')
                          ? 'Number *'
                          : patternIsRegex(editingRule.conditionType || '')
                            ? 'Regex Pattern *'
                            : 'Pattern *'}
                      </Label>
                      <Input
                        id="pattern"
                        value={editingRule.pattern || ''}
                        onChange={(e) => setEditingRule({ ...editingRule, pattern: e.target.value })}
                        placeholder={
                          patternIsNumber(editingRule.conditionType || '')
                            ? 'e.g., 100'
                            : patternIsRegex(editingRule.conditionType || '')
                              ? 'e.g., ^[A-Z][a-z]+$'
                              : 'e.g., C:\\'
                        }
                        className={patternIsRegex(editingRule.conditionType || '') ? 'font-mono' : ''}
                      />
                      {patternIsRegex(editingRule.conditionType || '') && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Code className="w-3 h-3" />
                          Regular expression pattern
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Case Sensitivity */}
                {patternNeedsValue(editingRule.conditionType || '') &&
                 !patternIsNumber(editingRule.conditionType || '') && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingRule.caseSensitive || false}
                      onCheckedChange={(checked) => setEditingRule({ ...editingRule, caseSensitive: checked })}
                    />
                    <Label>Case sensitive</Label>
                  </div>
                )}

                {/* Error Message and Severity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="errorMessage">Error Message</Label>
                    <Input
                      id="errorMessage"
                      value={editingRule.errorMessage || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, errorMessage: e.target.value })}
                      placeholder="Message shown when rule fails..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={editingRule.severity}
                      onValueChange={(value) => setEditingRule({ ...editingRule, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_OPTIONS.map(s => {
                          const Icon = s.icon;
                          return (
                            <SelectItem key={s.value} value={s.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${s.color}`} />
                                {s.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="test" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testInput">Test Input</Label>
                  <Textarea
                    id="testInput"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter a sample value to test against..."
                    rows={3}
                    className="font-mono"
                  />
                </div>

                <Button
                  onClick={handleTestRule}
                  disabled={testingRule || !testInput}
                  variant="secondary"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {testingRule ? 'Testing...' : 'Run Test'}
                </Button>

                {testResult && (
                  <Alert variant={testResult.passed ? "default" : "destructive"}>
                    <div className="flex items-center gap-2">
                      {testResult.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                      <AlertDescription>
                        <strong>{testResult.passed ? 'PASSED' : 'FAILED'}</strong>: {testResult.message}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Rule Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    Check if <strong>{editingRule.targetType}</strong>&apos;s <strong>{editingRule.targetField}</strong>{' '}
                    <strong>{editingRule.conditionType?.toLowerCase()}</strong>{' '}
                    {patternNeedsValue(editingRule.conditionType || '') && (
                      <>
                        <code className="bg-background px-1 rounded">{editingRule.pattern}</code>
                        {!editingRule.caseSensitive && ' (case insensitive)'}
                      </>
                    )}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Active</Label>
                      <p className="text-sm text-muted-foreground">Enable or disable this rule</p>
                    </div>
                    <Switch
                      checked={editingRule.isActive ?? true}
                      onCheckedChange={(checked) => setEditingRule({ ...editingRule, isActive: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Shared</Label>
                      <p className="text-sm text-muted-foreground">Make this rule available to other users</p>
                    </div>
                    <Switch
                      checked={editingRule.isShared ?? false}
                      onCheckedChange={(checked) => setEditingRule({ ...editingRule, isShared: checked })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Rule'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      {!editingRule && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Your Rules</CardTitle>
                <CardDescription>{rules.length} custom rules</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search rules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading rules...</p>
            ) : filteredRules.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {rules.length === 0
                    ? "No custom rules yet. Create your first rule!"
                    : "No rules match your search."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRules.map((rule) => {
                  const SeverityIcon = SEVERITY_OPTIONS.find(s => s.value === rule.severity)?.icon || AlertTriangle;
                  const severityColor = SEVERITY_OPTIONS.find(s => s.value === rule.severity)?.color || 'text-yellow-500';

                  return (
                    <div
                      key={rule.ruleId}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        rule.isActive ? 'bg-card' : 'bg-muted/50 opacity-60'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <SeverityIcon className={`w-4 h-4 ${severityColor}`} />
                          <h4 className="font-medium truncate">{rule.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {rule.platform}
                          </Badge>
                          {rule.isShared && (
                            <Badge variant="secondary" className="text-xs">Shared</Badge>
                          )}
                          {!rule.isActive && (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {rule.targetType}.{rule.targetField} {rule.conditionType.toLowerCase()}{' '}
                          {!['IsEmpty', 'IsNotEmpty'].includes(rule.conditionType) && (
                            <code className="text-xs">{rule.pattern}</code>
                          )}
                        </p>
                        {rule.timesTriggered > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Triggered {rule.timesTriggered} times
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleActive(rule)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(rule.ruleId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
