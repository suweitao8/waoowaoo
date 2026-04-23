'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'
import { useTaskStatus } from '@/lib/query/hooks/useTaskStatus'
import { TASK_TYPE } from '@/lib/task/types'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'

interface Chapter {
  id: string
  name: string
  worldContext?: string | null
  writingStyle?: string | null
  analysisStatus?: string | null
}

interface AIAnalysisPanelProps {
  projectId: string
  worldContext?: string | null
  writingStyle?: string | null
  extractedCharacters?: string | null
  chapters?: Chapter[]
  onComplete: () => void
}

export default function AIAnalysisPanel({
  projectId,
  worldContext: initialWorldContext,
  writingStyle: initialWritingStyle,
  extractedCharacters: initialExtractedCharacters,
  chapters = [],
  onComplete,
}: AIAnalysisPanelProps) {
  const t = useTranslations('novel-writing.analyze')

  const [activeTab, setActiveTab] = useState<'project' | 'chapters'>('project')
  const [worldContext, setWorldContext] = useState(initialWorldContext || '')
  const [writingStyle, setWritingStyle] = useState(initialWritingStyle || '')
  const [characters, setCharacters] = useState<Array<{ name: string; description?: string; relationships?: string }>>(() => {
    if (!initialExtractedCharacters) return []
    try {
      return JSON.parse(initialExtractedCharacters)
    } catch {
      return []
    }
  })

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 监听分析任务状态
  const taskStatus = useTaskStatus({
    projectId,
    targetType: 'NovelWritingProject',
    targetId: projectId,
    type: [TASK_TYPE.ANALYZE_NOVEL_WRITING],
    enabled: !!projectId,
  })

  const isAnalyzing = taskStatus.data?.hasActive ?? false
  const hasAnalysis = worldContext || writingStyle || characters.length > 0
  const analyzedChapters = chapters.filter(ch => ch.analysisStatus === 'completed')

  // 当任务完成时刷新数据
  useEffect(() => {
    if (taskStatus.data?.latest?.status === 'completed') {
      // 获取分析结果
      const fetchAnalysisResult = async () => {
        try {
          const response = await apiFetch(`/api/novel-writing/${projectId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.novelWritingData) {
              setWorldContext(data.novelWritingData.worldContext || '')
              setWritingStyle(data.novelWritingData.writingStyle || '')
              try {
                setCharacters(JSON.parse(data.novelWritingData.extractedCharacters || '[]'))
              } catch {
                setCharacters([])
              }
            }
            onComplete()
          }
        } catch (err) {
          console.error('获取分析结果失败:', err)
        }
      }
      fetchAnalysisResult()
    }
  }, [taskStatus.data?.latest?.status, projectId, onComplete])

  // 当任务失败时显示错误
  useEffect(() => {
    if (taskStatus.data?.lastError) {
      setError(taskStatus.data.lastError.message || '分析失败')
    }
  }, [taskStatus.data?.lastError])

  // 执行 AI 分析（项目级别）
  const handleAnalyze = useCallback(async () => {
    setError(null)

    try {
      const response = await apiFetch(`/api/novel-writing/${projectId}/analyze`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error?.message || '分析失败')
      }

      // 任务已提交，taskStatus hook 会自动追踪进度
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    }
  }, [projectId])

  // 保存分析结果
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await apiFetch(`/api/novel-writing/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldContext,
          writingStyle,
          extractedCharacters: JSON.stringify(characters),
        }),
      })

      if (!response.ok) {
        throw new Error('保存失败')
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  // 解析章节的分析结果
  const parseChapterAnalysis = (jsonStr: string | null | undefined) => {
    if (!jsonStr) return null
    try {
      return JSON.parse(jsonStr)
    } catch {
      return null
    }
  }

  return (
    <div className="flex-1 glass-surface-soft rounded-xl p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      <div className="max-w-2xl mx-auto">
        {/* 标题和标签页 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--glass-text-primary)]">
            {t('title')}
          </h2>

          {/* 标签页切换 */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--glass-bg-muted)]">
            <button
              onClick={() => setActiveTab('project')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                activeTab === 'project'
                  ? 'bg-[var(--glass-bg-surface)] text-[var(--glass-text-primary)]'
                  : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'
              }`}
            >
              {t('projectSummary')}
            </button>
            <button
              onClick={() => setActiveTab('chapters')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                activeTab === 'chapters'
                  ? 'bg-[var(--glass-bg-surface)] text-[var(--glass-text-primary)]'
                  : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'
              }`}
            >
              {t('chapterAnalysis')} ({analyzedChapters.length})
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* 任务进度 */}
        {isAnalyzing && taskStatus.data?.latest && (
          <div className="mb-4 p-4 rounded-xl border border-[var(--glass-stroke-strong)] bg-[var(--glass-bg-muted)]">
            <div className="flex items-center gap-3">
              <TaskStatusInline
                state={resolveTaskPresentationState({
                  phase: 'processing',
                  intent: 'analyze',
                  resource: 'text',
                  hasOutput: false,
                  progress: taskStatus.data.latest.progress,
                })}
              />
              <span className="text-sm text-[var(--glass-text-secondary)]">
                正在分析中，请稍候...
              </span>
            </div>
          </div>
        )}

        {/* 项目汇总标签页 */}
        {activeTab === 'project' && (
          <>
            <p className="text-[var(--glass-text-secondary)] mb-6">
              {t('description')}
            </p>

            {hasAnalysis && (
              <div className="space-y-6">
                {/* 世界观设定 */}
                <div>
                  <label className="glass-field-label block mb-2">
                    {t('worldContext')}
                  </label>
                  <textarea
                    value={worldContext}
                    onChange={(e) => setWorldContext(e.target.value)}
                    placeholder={t('worldContextPlaceholder')}
                    className="glass-textarea-base w-full px-3 py-2 min-h-[120px]"
                    disabled={isAnalyzing}
                  />
                </div>

                {/* 写作风格 */}
                <div>
                  <label className="glass-field-label block mb-2">
                    {t('writingStyle')}
                  </label>
                  <textarea
                    value={writingStyle}
                    onChange={(e) => setWritingStyle(e.target.value)}
                    placeholder={t('writingStylePlaceholder')}
                    className="glass-textarea-base w-full px-3 py-2 min-h-[80px]"
                    disabled={isAnalyzing}
                  />
                </div>

                {/* 角色信息 */}
                {characters.length > 0 && (
                  <div>
                    <label className="glass-field-label block mb-2">
                      {t('characters')} ({characters.length})
                    </label>
                    <div className="space-y-3">
                      {characters.map((char, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)]"
                        >
                          <div className="font-medium text-[var(--glass-text-primary)] mb-1">
                            {char.name}
                          </div>
                          {char.description && (
                            <div className="text-sm text-[var(--glass-text-secondary)]">
                              {char.description}
                            </div>
                          )}
                          {char.relationships && (
                            <div className="text-xs text-[var(--glass-text-tertiary)] mt-1">
                              关系：{char.relationships}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 保存按钮 */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--glass-stroke-base)]">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="glass-btn-base glass-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    重新分析
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || isAnalyzing}
                    className="glass-btn-base glass-btn-primary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {isSaving ? '保存中...' : t('saveButton')}
                  </button>
                </div>
              </div>
            )}

            {/* 空状态 */}
            {!hasAnalysis && !isAnalyzing && (
              <div className="text-center py-12">
                <AppIcon name="sparkles" className="w-16 h-16 text-[var(--glass-text-tertiary)] mx-auto mb-4" />
                <p className="text-[var(--glass-text-secondary)] mb-4">
                  点击「开始分析」按钮，AI 将自动提取小说的世界观、写作风格和角色信息
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="glass-btn-base glass-btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  <AppIcon name="sparkles" className="w-4 h-4 mr-2 inline" />
                  {t('analyzeButton')}
                </button>
              </div>
            )}
          </>
        )}

        {/* 章节分析标签页 */}
        {activeTab === 'chapters' && (
          <div className="space-y-4">
            {analyzedChapters.length === 0 ? (
              <div className="text-center py-12">
                <AppIcon name="bookOpen" className="w-16 h-16 text-[var(--glass-text-tertiary)] mx-auto mb-4" />
                <p className="text-[var(--glass-text-secondary)]">
                  {t('noAnalyzedChapters')}
                </p>
                <p className="text-sm text-[var(--glass-text-tertiary)] mt-2">
                  在左侧章节列表中右键选择&ldquo;分析选中章节&rdquo;
                </p>
              </div>
            ) : (
              analyzedChapters.map((chapter) => {
                const worldContextData = parseChapterAnalysis(chapter.worldContext)
                const writingStyleData = parseChapterAnalysis(chapter.writingStyle)

                return (
                  <div
                    key={chapter.id}
                    className="p-4 rounded-lg border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)]"
                  >
                    <h3 className="font-medium text-[var(--glass-text-primary)] mb-3">
                      {chapter.name}
                    </h3>

                    {worldContextData && (
                      <div className="mb-3">
                        <div className="text-xs text-[var(--glass-text-tertiary)] mb-1">世界观</div>
                        <div className="text-sm text-[var(--glass-text-secondary)]">
                          {worldContextData.scenes?.length > 0 && (
                            <div>场景：{worldContextData.scenes.map((s: { description?: string }) => s.description).join('、')}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {writingStyleData && (
                      <div>
                        <div className="text-xs text-[var(--glass-text-tertiary)] mb-1">写作风格</div>
                        <div className="text-sm text-[var(--glass-text-secondary)]">
                          {writingStyleData.perspective}，{writingStyleData.languageStyle}
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
    </div>
  )
}
