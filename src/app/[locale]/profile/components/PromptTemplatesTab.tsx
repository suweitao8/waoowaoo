'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import GlassTextarea from '@/components/ui/primitives/GlassTextarea'
import { SelectVariantCard } from '@/components/ui/select-variants'
import type { ArtStyleValue } from '@/lib/constants'

interface StyleTemplateGroup {
  value: string
  label: string
  templates: {
    character: string
    location: string
    prop: string
  }
  variables: {
    character: Array<{ name: string; description: string }>
    location: Array<{ name: string; description: string }>
    prop: Array<{ name: string; description: string }>
  }
}

interface UserPromptTemplates {
  [style: string]: {
    characterTemplate?: string
    locationTemplate?: string
    propTemplate?: string
  }
}

interface PromptTemplatesResponse {
  styles: StyleTemplateGroup[]
  userTemplates: UserPromptTemplates
}

type TemplateType = 'character' | 'location' | 'prop'

export default function PromptTemplatesTab() {
  const t = useTranslations('profile')
  const [styles, setStyles] = useState<StyleTemplateGroup[]>([])
  const [userTemplates, setUserTemplates] = useState<UserPromptTemplates>({})
  const [selectedStyle, setSelectedStyle] = useState<string>('default')
  const [activeType, setActiveType] = useState<TemplateType>('character')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // 本地编辑状态
  const [editedTemplates, setEditedTemplates] = useState<{
    character: string
    location: string
    prop: string
  }>({
    character: '',
    location: '',
    prop: '',
  })

  // 加载数据
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/user/prompt-templates')
        if (!response.ok) throw new Error('Failed to load')
        const data: PromptTemplatesResponse = await response.json()
        setStyles(data.styles)
        setUserTemplates(data.userTemplates)
      } catch (error) {
        console.error('Failed to load prompt templates:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // 当切换风格时，更新编辑器内容
  useEffect(() => {
    const styleData = styles.find((s) => s.value === selectedStyle)
    if (!styleData) return

    const userOverride = userTemplates[selectedStyle]

    setEditedTemplates({
      character: userOverride?.characterTemplate || styleData.templates.character,
      location: userOverride?.locationTemplate || styleData.templates.location,
      prop: userOverride?.propTemplate || styleData.templates.prop,
    })
    setHasChanges(false)
  }, [selectedStyle, styles, userTemplates])

  // 处理模板编辑
  const handleTemplateChange = useCallback((value: string) => {
    setEditedTemplates((prev) => ({
      ...prev,
      [activeType]: value,
    }))

    // 检查是否有变更
    const styleData = styles.find((s) => s.value === selectedStyle)
    if (!styleData) return

    const originalTemplate = styleData.templates[activeType]
    const userOverride = userTemplates[selectedStyle]?.[`${activeType}Template` as const]
    const currentBase = userOverride || originalTemplate

    setHasChanges(value !== currentBase)
  }, [activeType, selectedStyle, styles, userTemplates])

  // 重置为默认模板
  const handleReset = useCallback(() => {
    const styleData = styles.find((s) => s.value === selectedStyle)
    if (!styleData) return

    setEditedTemplates({
      character: styleData.templates.character,
      location: styleData.templates.location,
      prop: styleData.templates.prop,
    })

    // 清除用户自定义
    setUserTemplates((prev) => {
      const next = { ...prev }
      delete next[selectedStyle]
      return next
    })
    setHasChanges(false)
  }, [selectedStyle, styles])

  // 保存模板
  const handleSave = useCallback(async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      // 构建新的用户模板配置
      const newUserTemplates = { ...userTemplates }
      const styleData = styles.find((s) => s.value === selectedStyle)
      if (!styleData) return

      // 检查哪些模板被修改了
      const modified: {
        characterTemplate?: string
        locationTemplate?: string
        propTemplate?: string
      } = {}

      for (const type of ['character', 'location', 'prop'] as const) {
        const edited = editedTemplates[type]
        const original = styleData.templates[type]
        if (edited !== original) {
          modified[`${type}Template`] = edited
        }
      }

      if (Object.keys(modified).length > 0) {
        newUserTemplates[selectedStyle] = modified
      } else {
        delete newUserTemplates[selectedStyle]
      }

      const response = await fetch('/api/user/prompt-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: newUserTemplates }),
      })

      if (!response.ok) throw new Error('Failed to save')

      setUserTemplates(newUserTemplates)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save prompt templates:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editedTemplates, isSaving, selectedStyle, styles, userTemplates])

  // 当前模板类型的变量说明
  const currentVariables = styles
    .find((s) => s.value === selectedStyle)
    ?.variables[activeType] || []

  // 风格选项
  const styleOptions = styles.map((s) => ({
    value: s.value,
    label: s.label,
  }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--glass-text-secondary)]">{t('loading')}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--glass-stroke-base)]">
        <h2 className="text-lg font-semibold text-[var(--glass-text-primary)]">
          {t('promptTemplates')}
        </h2>
        <p className="text-sm text-[var(--glass-text-secondary)] mt-1">
          {t('promptTemplatesDesc')}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-6">
        {/* 左侧：风格选择和类型切换 */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4">
          {/* 风格选择器 */}
          <div>
            <label className="block text-sm font-medium text-[var(--glass-text-primary)] mb-2">
              {t('selectStyle')}
            </label>
            <SelectVariantCard
              options={styleOptions}
              value={selectedStyle}
              onChange={setSelectedStyle}
              placeholder={t('selectStylePlaceholder')}
            />
          </div>

          {/* 类型切换 */}
          <div>
            <label className="block text-sm font-medium text-[var(--glass-text-primary)] mb-2">
              {t('templateType')}
            </label>
            <div className="flex flex-col gap-2">
              {(['character', 'location', 'prop'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeType === type
                    ? 'glass-btn-base glass-btn-tone-info'
                    : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)] border border-[var(--glass-stroke-base)]'
                    }`}
                >
                  <AppIcon
                    name={
                      type === 'character'
                        ? 'user'
                        : type === 'location'
                          ? 'globe'
                          : 'package'
                    }
                    className="w-5 h-5"
                  />
                  <span className="font-medium">{t(`templateType_${type}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 变量说明 */}
          <div className="flex-1 overflow-auto">
            <label className="block text-sm font-medium text-[var(--glass-text-primary)] mb-2">
              {t('availableVariables')}
            </label>
            <div className="glass-surface-soft rounded-xl border border-[var(--glass-stroke-base)] p-4 space-y-3">
              {currentVariables.length === 0 ? (
                <p className="text-sm text-[var(--glass-text-tertiary)]">
                  {t('noVariables')}
                </p>
              ) : (
                currentVariables.map((variable, index) => (
                  <div key={index} className="space-y-1">
                    <code className="text-xs font-mono px-2 py-1 rounded bg-[var(--glass-bg-muted)] text-[var(--glass-text-accent)]">
                      {variable.name}
                    </code>
                    <p className="text-xs text-[var(--glass-text-secondary)] pl-2">
                      {variable.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右侧：模板编辑器 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-[var(--glass-text-primary)]">
                {t(`templateType_${activeType}`)}
              </h3>
              {hasChanges && (
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--glass-bg-warning)] text-[var(--glass-text-warning)]">
                  {t('unsavedChanges')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
              >
                <AppIcon name="refresh" className="w-4 h-4" />
                {t('resetToDefault')}
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`glass-btn-base px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${hasChanges && !isSaving
                  ? 'glass-btn-primary'
                  : 'glass-btn-secondary opacity-50 cursor-not-allowed'
                  }`}
              >
                <AppIcon name="check" className="w-4 h-4" />
                {isSaving ? t('saving') : t('save')}
              </button>
            </div>
          </div>

          {/* 模板编辑区 */}
          <div className="flex-1 flex flex-col min-h-0">
            <GlassTextarea
              value={editedTemplates[activeType]}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="flex-1 min-h-[300px] font-mono text-sm leading-relaxed"
              placeholder={t('templatePlaceholder')}
            />
          </div>

          {/* 提示信息 */}
          <div className="mt-3 flex items-start gap-2 text-xs text-[var(--glass-text-tertiary)]">
            <AppIcon name="info" className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{t('templateEditHint')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
