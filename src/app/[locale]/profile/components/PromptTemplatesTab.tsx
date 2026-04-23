'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'
import {
  DEFAULT_CHARACTER_PROMPT_TEMPLATE,
  DEFAULT_LOCATION_PROMPT_TEMPLATE,
  DEFAULT_PROP_PROMPT_TEMPLATE,
  PROMPT_TEMPLATE_VARIABLES,
  type PromptTemplateType,
} from '@/lib/prompt-templates'

interface PromptTemplatesState {
  characterPromptTemplate: string
  locationPromptTemplate: string
  propPromptTemplate: string
}

type TemplateKey = keyof PromptTemplatesState

const TEMPLATE_TABS: { key: TemplateKey; type: PromptTemplateType; labelKey: string }[] = [
  { key: 'characterPromptTemplate', type: 'character', labelKey: 'characterTemplate' },
  { key: 'locationPromptTemplate', type: 'location', labelKey: 'locationTemplate' },
  { key: 'propPromptTemplate', type: 'prop', labelKey: 'propTemplate' },
]

const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  characterPromptTemplate: DEFAULT_CHARACTER_PROMPT_TEMPLATE,
  locationPromptTemplate: DEFAULT_LOCATION_PROMPT_TEMPLATE,
  propPromptTemplate: DEFAULT_PROP_PROMPT_TEMPLATE,
}

export default function PromptTemplatesTab() {
  const t = useTranslations('profile')
  const [templates, setTemplates] = useState<PromptTemplatesState>({
    characterPromptTemplate: '',
    locationPromptTemplate: '',
    propPromptTemplate: '',
  })
  const [activeTab, setActiveTab] = useState<TemplateKey>('characterPromptTemplate')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载用户配置
  useEffect(() => {
    async function loadTemplates() {
      try {
        const response = await apiFetch('/api/user/prompt-templates')
        if (!response.ok) {
          throw new Error('加载失败')
        }
        const data = await response.json()
        setTemplates({
          characterPromptTemplate: data.characterPromptTemplate || '',
          locationPromptTemplate: data.locationPromptTemplate || '',
          propPromptTemplate: data.propPromptTemplate || '',
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }
    loadTemplates()
  }, [])

  // 保存配置
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await apiFetch('/api/user/prompt-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templates),
      })
      if (!response.ok) {
        throw new Error('保存失败')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 重置为默认模板
  const handleReset = () => {
    setTemplates((prev) => ({
      ...prev,
      [activeTab]: DEFAULT_TEMPLATES[activeTab],
    }))
  }

  // 清空模板（使用默认值）
  const handleClear = () => {
    setTemplates((prev) => ({
      ...prev,
      [activeTab]: '',
    }))
  }

  const activeTabConfig = TEMPLATE_TABS.find((tab) => tab.key === activeTab)!
  const variables = PROMPT_TEMPLATE_VARIABLES[activeTabConfig.type]
  const currentTemplate = templates[activeTab]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--pin-accent-from)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--pin-stroke-base)]">
        <h2 className="text-lg font-semibold text-[var(--pin-text-primary)]">
          {t('promptTemplates')}
        </h2>
        <p className="text-sm text-[var(--pin-text-secondary)] mt-1">
          {t('promptTemplatesDesc')}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Tab 切换 */}
        <div className="flex gap-2 mb-4">
          {TEMPLATE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'pin-btn-base pin-btn-tone-info'
                  : 'pin-btn-base pin-btn-secondary'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* 变量说明 */}
        <div className="pin-surface-soft rounded-xl border border-[var(--pin-stroke-base)] p-4 mb-4">
          <h4 className="text-sm font-medium text-[var(--pin-text-primary)] mb-2">
            {t('availableVariables')}
          </h4>
          <div className="space-y-1">
            {variables.map((variable) => (
              <div key={variable.name} className="flex items-start gap-2 text-sm">
                <code className="px-2 py-0.5 rounded bg-[var(--pin-bg-muted)] text-[var(--pin-tone-info-fg)] font-mono text-xs">
                  {variable.name}
                </code>
                <span className="text-[var(--pin-text-secondary)]">{variable.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 模板编辑区 */}
        <div className="space-y-4">
          <textarea
            value={currentTemplate}
            onChange={(e) =>
              setTemplates((prev) => ({
                ...prev,
                [activeTab]: e.target.value,
              }))
            }
            placeholder={DEFAULT_TEMPLATES[activeTab]}
            className="w-full h-64 px-4 py-3 rounded-xl border border-[var(--pin-stroke-base)] bg-[var(--pin-bg-surface)] text-[var(--pin-text-primary)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--pin-tone-info-bg)] placeholder:text-[var(--pin-text-tertiary)]"
          />

          {/* 提示信息 */}
          <p className="text-xs text-[var(--pin-text-tertiary)]">
            {t('templateEmptyHint')}
          </p>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="pin-btn-base pin-btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('saving')}
                </>
              ) : saved ? (
                <>
                  <AppIcon name="check" className="w-4 h-4" />
                  {t('saved')}
                </>
              ) : (
                <>
                  <AppIcon name="download" className="w-4 h-4" />
                  {t('save')}
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              className="pin-btn-base pin-btn-secondary px-4 py-2 text-sm rounded-lg flex items-center gap-2"
            >
              <AppIcon name="refresh" className="w-4 h-4" />
              {t('resetToDefault')}
            </button>

            <button
              onClick={handleClear}
              className="pin-btn-base pin-btn-secondary px-4 py-2 text-sm rounded-lg"
            >
              {t('clear')}
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-[var(--pin-tone-danger-bg)] text-[var(--pin-tone-danger-fg)] text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
