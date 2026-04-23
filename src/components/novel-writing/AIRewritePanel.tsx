'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'
import RewriteCompareView from './RewriteCompareView'

interface AIRewritePanelProps {
  projectId: string
  chapterId: string
  chapterName: string
  novelText: string
  worldContext?: string | null
  writingStyle?: string | null
  extractedCharacters?: string | null
  onComplete: () => void
}

interface RewriteResult {
  originalText: string
  rewrittenText: string
}

export default function AIRewritePanel({
  projectId,
  chapterId,
  chapterName,
  novelText,
  worldContext,
  writingStyle,
  extractedCharacters,
  onComplete,
}: AIRewritePanelProps) {
  const t = useTranslations('novel-writing.rewrite')

  const [instruction, setInstruction] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null)

  // 预设的改写指令
  const presetInstructions = [
    { label: '简化描写', value: '简化文本，去除冗余描写' },
    { label: '丰富细节', value: '丰富文本，增加细节描写' },
    { label: '轻松语气', value: '用轻松幽默的语气改写' },
    { label: '增加对话', value: '增加角色对话和互动' },
  ]

  // 执行改写
  const handleRewrite = async () => {
    if (!instruction.trim()) {
      setError('请输入改写指令')
      return
    }

    setIsRewriting(true)
    setError(null)
    setRewriteResult(null)

    try {
      const response = await apiFetch(
        `/api/novel-writing/${projectId}/episodes/${chapterId}/rewrite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '改写失败')
      }

      const data = await response.json()
      setRewriteResult({
        originalText: data.originalText,
        rewrittenText: data.rewrittenText,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '改写失败')
    } finally {
      setIsRewriting(false)
    }
  }

  // 应用改写结果
  const handleApply = async () => {
    if (!rewriteResult) return

    setIsApplying(true)
    setError(null)

    try {
      const response = await apiFetch(
        `/api/novel-writing/${projectId}/episodes/${chapterId}/rewrite`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newText: rewriteResult.rewrittenText }),
        }
      )

      if (!response.ok) {
        throw new Error('应用改写失败')
      }

      setRewriteResult(null)
      setInstruction('')
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : '应用改写失败')
    } finally {
      setIsApplying(false)
    }
  }

  // 拒绝改写结果
  const handleReject = () => {
    setRewriteResult(null)
  }

  // 获取角色列表
  const characters = (() => {
    if (!extractedCharacters) return []
    try {
      return JSON.parse(extractedCharacters)
    } catch {
      return []
    }
  })()

  return (
    <div className="flex-1 pin-surface-soft rounded-xl p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--pin-text-primary)]">
            {t('title')} - {chapterName}
          </h2>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* 上下文信息 */}
        {(worldContext || writingStyle || characters.length > 0) && (
          <div className="mb-6 p-4 rounded-xl border border-[var(--pin-stroke-base)] bg-[var(--pin-bg-muted)]">
            <h3 className="text-sm font-medium text-[var(--pin-text-primary)] mb-3">
              项目分析信息
            </h3>
            <div className="space-y-2 text-sm">
              {worldContext && (
                <div>
                  <span className="text-[var(--pin-text-tertiary)]">世界观：</span>
                  <span className="text-[var(--pin-text-secondary)]">
                    {worldContext.slice(0, 100)}...
                  </span>
                </div>
              )}
              {writingStyle && (
                <div>
                  <span className="text-[var(--pin-text-tertiary)]">写作风格：</span>
                  <span className="text-[var(--pin-text-secondary)]">{writingStyle}</span>
                </div>
              )}
              {characters.length > 0 && (
                <div>
                  <span className="text-[var(--pin-text-tertiary)]">角色：</span>
                  <span className="text-[var(--pin-text-secondary)]">
                    {characters.map((c: { name: string }) => c.name).join('、')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 如果有改写结果，显示对比视图 */}
        {rewriteResult ? (
          <RewriteCompareView
            originalText={rewriteResult.originalText}
            rewrittenText={rewriteResult.rewrittenText}
            onAccept={handleApply}
            onReject={handleReject}
            isApplying={isApplying}
          />
        ) : (
          <>
            {/* 原文预览 */}
            <div className="mb-6">
              <label className="pin-field-label block mb-2">
                {t('currentContent')}
              </label>
              <div className="pin-textarea-base w-full px-3 py-2 min-h-[120px] max-h-[200px] overflow-y-auto">
                {novelText ? (
                  <div className="text-sm text-[var(--pin-text-secondary)] whitespace-pre-wrap">
                    {novelText.slice(0, 500)}
                    {novelText.length > 500 && '...'}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--pin-text-tertiary)]">
                    暂无内容
                  </div>
                )}
              </div>
              {novelText && (
                <div className="text-xs text-[var(--pin-text-tertiary)] mt-1">
                  共 {novelText.length.toLocaleString()} 字
                </div>
              )}
            </div>

            {/* 预设指令 */}
            <div className="mb-4">
              <label className="pin-field-label block mb-2">
                快捷指令
              </label>
              <div className="flex flex-wrap gap-2">
                {presetInstructions.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setInstruction(preset.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      instruction === preset.value
                        ? 'bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)]'
                        : 'bg-[var(--pin-bg-muted)] text-[var(--pin-text-secondary)] hover:bg-[var(--pin-bg-fog)]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 改写指令输入 */}
            <div className="mb-6">
              <label className="pin-field-label block mb-2">
                {t('instruction')}
              </label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={t('instructionPlaceholder')}
                className="pin-textarea-base w-full px-3 py-2 min-h-[100px]"
              />
              <p className="text-xs text-[var(--pin-text-tertiary)] mt-1">
                详细描述你希望如何改写这一章节，AI 会根据你的指令进行调整
              </p>
            </div>

            {/* 执行按钮 */}
            <div className="flex justify-end">
              <button
                onClick={handleRewrite}
                disabled={isRewriting || !instruction.trim()}
                className="pin-btn-base pin-btn-primary px-6 py-2 text-sm disabled:opacity-50"
              >
                {isRewriting ? (
                  <>
                    <AppIcon name="loader" className="w-4 h-4 mr-2 inline animate-spin" />
                    {t('rewriting')}
                  </>
                ) : (
                  <>
                    <AppIcon name="sparkles" className="w-4 h-4 mr-2 inline" />
                    {t('startRewrite')}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
