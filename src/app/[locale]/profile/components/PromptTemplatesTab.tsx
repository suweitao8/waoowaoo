'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import GlassTextarea from '@/components/ui/primitives/GlassTextarea'
import type { ArtStyleValue } from '@/lib/constants'
import type { TemplateType } from '@/lib/prompt-templates'

// ========== 类型定义 ==========

interface StylePromptItem {
  value: ArtStyleValue
  label: string
  defaultPrompt: string
  userPrompt?: string
}

interface TemplateTypeItem {
  value: TemplateType
  label: string
  defaultTemplate: string
  userTemplate?: string
  variables: Array<{ name: string; description: string }>
}

interface PromptTemplatesResponse {
  styles: StylePromptItem[]
  templateTypes: TemplateTypeItem[]
}

// 用户自定义配置
interface UserPromptConfig {
  stylePrompts: Partial<Record<ArtStyleValue, string>>
  templateTypePrompts: Partial<Record<TemplateType, string>>
}

// 编辑模式
type EditMode = 'style' | 'templateType'

export default function PromptTemplatesTab() {
  const t = useTranslations('profile')

  // 数据状态
  const [styles, setStyles] = useState<StylePromptItem[]>([])
  const [templateTypes, setTemplateTypes] = useState<TemplateTypeItem[]>([])
  const [userConfig, setUserConfig] = useState<UserPromptConfig>({
    stylePrompts: {},
    templateTypePrompts: {},
  })

  // 选择状态
  const [editMode, setEditMode] = useState<EditMode>('style')
  const [selectedStyle, setSelectedStyle] = useState<ArtStyleValue>('xianxia-3d')
  const [selectedTemplateType, setSelectedTemplateType] = useState<TemplateType>('character')

  // UI 状态
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // 本地编辑状态
  const [editedContent, setEditedContent] = useState('')

  // 加载数据
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/user/prompt-templates')
        if (!response.ok) throw new Error('Failed to load')
        const data: PromptTemplatesResponse = await response.json()

        setStyles(data.styles)
        setTemplateTypes(data.templateTypes)

        // 解析用户配置
        const stylePrompts: Partial<Record<ArtStyleValue, string>> = {}
        const templateTypePrompts: Partial<Record<TemplateType, string>> = {}

        for (const style of data.styles) {
          if (style.userPrompt) {
            stylePrompts[style.value] = style.userPrompt
          }
        }

        for (const type of data.templateTypes) {
          if (type.userTemplate) {
            templateTypePrompts[type.value] = type.userTemplate
          }
        }

        setUserConfig({ stylePrompts, templateTypePrompts })

        // 从 localStorage 恢复用户上次选择
        const savedStyle = localStorage.getItem('prompt-template-selected-style') as ArtStyleValue | null
        if (savedStyle && data.styles.some(s => s.value === savedStyle)) {
          setSelectedStyle(savedStyle)
        }
      } catch (error) {
        console.error('Failed to load prompt templates:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // 当选择变化时，同步编辑内容
  useEffect(() => {
    if (editMode === 'style') {
      const style = styles.find(s => s.value === selectedStyle)
      if (style) {
        setEditedContent(style.userPrompt || style.defaultPrompt)
      }
    } else {
      const type = templateTypes.find(t => t.value === selectedTemplateType)
      if (type) {
        setEditedContent(type.userTemplate || type.defaultTemplate)
      }
    }
    setHasChanges(false)
  }, [editMode, selectedStyle, selectedTemplateType, styles, templateTypes])

  // 处理内容编辑
  const handleContentChange = useCallback((value: string) => {
    setEditedContent(value)

    // 检查是否有变更
    if (editMode === 'style') {
      const style = styles.find(s => s.value === selectedStyle)
      if (style) {
        const original = style.userPrompt || style.defaultPrompt
        setHasChanges(value !== original)
      }
    } else {
      const type = templateTypes.find(t => t.value === selectedTemplateType)
      if (type) {
        const original = type.userTemplate || type.defaultTemplate
        setHasChanges(value !== original)
      }
    }
  }, [editMode, selectedStyle, selectedTemplateType, styles, templateTypes])

  // 重置为默认
  const handleReset = useCallback(() => {
    if (editMode === 'style') {
      const style = styles.find(s => s.value === selectedStyle)
      if (style) {
        setEditedContent(style.defaultPrompt)
        setUserConfig(prev => {
          const next = { ...prev }
          if (next.stylePrompts) {
            delete next.stylePrompts[selectedStyle]
          }
          return next
        })
      }
    } else {
      const type = templateTypes.find(t => t.value === selectedTemplateType)
      if (type) {
        setEditedContent(type.defaultTemplate)
        setUserConfig(prev => {
          const next = { ...prev }
          if (next.templateTypePrompts) {
            delete next.templateTypePrompts[selectedTemplateType]
          }
          return next
        })
      }
    }
    setHasChanges(false)
  }, [editMode, selectedStyle, selectedTemplateType, styles, templateTypes])

  // 保存
  const handleSave = useCallback(async () => {
    if (isSaving || !hasChanges) return

    setIsSaving(true)
    try {
      const newConfig: UserPromptConfig = {
        stylePrompts: { ...userConfig.stylePrompts },
        templateTypePrompts: { ...userConfig.templateTypePrompts },
      }

      if (editMode === 'style') {
        const style = styles.find(s => s.value === selectedStyle)
        if (style && editedContent !== style.defaultPrompt) {
          newConfig.stylePrompts = {
            ...newConfig.stylePrompts,
            [selectedStyle]: editedContent,
          }
        } else if (newConfig.stylePrompts) {
          delete newConfig.stylePrompts[selectedStyle]
        }
      } else {
        const type = templateTypes.find(t => t.value === selectedTemplateType)
        if (type && editedContent !== type.defaultTemplate) {
          newConfig.templateTypePrompts = {
            ...newConfig.templateTypePrompts,
            [selectedTemplateType]: editedContent,
          }
        } else if (newConfig.templateTypePrompts) {
          delete newConfig.templateTypePrompts[selectedTemplateType]
        }
      }

      const response = await fetch('/api/user/prompt-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })

      if (!response.ok) throw new Error('Failed to save')

      setUserConfig(newConfig)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save prompt templates:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editMode, editedContent, hasChanges, isSaving, selectedStyle, selectedTemplateType, styles, templateTypes, userConfig])

  // 获取当前变量说明
  const currentVariables = editMode === 'style'
    ? []
    : templateTypes.find(t => t.value === selectedTemplateType)?.variables || []

  // 获取当前编辑项的标题
  const currentEditTitle = editMode === 'style'
    ? styles.find(s => s.value === selectedStyle)?.label || ''
    : templateTypes.find(t => t.value === selectedTemplateType)?.label || ''

  // 处理风格选择，保存到 localStorage
  const handleStyleSelect = useCallback((style: ArtStyleValue) => {
    setSelectedStyle(style)
    localStorage.setItem('prompt-template-selected-style', style)
  }, [])

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
        {/* 左侧栏 */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-6">
          {/* 风格提示词区 */}
          <div>
            <label className="block text-sm font-medium text-[var(--glass-text-primary)] mb-2">
              {t('stylePrompts')}
            </label>
            <div className="flex flex-col gap-2">
              {styles.map((style) => (
                <button
                  key={style.value}
                  onClick={() => {
                    setEditMode('style')
                    handleStyleSelect(style.value)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${
                    editMode === 'style' && selectedStyle === style.value
                      ? 'glass-btn-base glass-btn-tone-info'
                      : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)] border border-[var(--glass-stroke-base)]'
                  }`}
                >
                  <span className="font-medium">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 模板类型提示词区 */}
          <div>
            <label className="block text-sm font-medium text-[var(--glass-text-primary)] mb-2">
              {t('templateTypePrompts')}
            </label>
            <div className="flex flex-col gap-2">
              {templateTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setEditMode('templateType')
                    setSelectedTemplateType(type.value)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${
                    editMode === 'templateType' && selectedTemplateType === type.value
                      ? 'glass-btn-base glass-btn-tone-info'
                      : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)] border border-[var(--glass-stroke-base)]'
                  }`}
                >
                  <AppIcon
                    name={
                      type.value === 'character'
                        ? 'user'
                        : type.value === 'location'
                          ? 'globe'
                          : 'package'
                    }
                    className="w-5 h-5"
                  />
                  <span className="font-medium">{type.label}</span>
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

        {/* 右侧编辑区 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-[var(--glass-text-primary)]">
                {currentEditTitle}
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
                className={`glass-btn-base px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${
                  hasChanges && !isSaving
                    ? 'glass-btn-primary'
                    : 'glass-btn-secondary opacity-50 cursor-not-allowed'
                }`}
              >
                <AppIcon name="check" className="w-4 h-4" />
                {isSaving ? t('saving') : t('save')}
              </button>
            </div>
          </div>

          {/* 编辑区 */}
          <div className="flex-1 flex flex-col min-h-0">
            <GlassTextarea
              value={editedContent}
              onChange={(e) => handleContentChange(e.target.value)}
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
