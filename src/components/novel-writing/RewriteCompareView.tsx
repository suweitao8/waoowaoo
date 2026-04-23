'use client'

import { useState, ReactElement } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

interface RewriteCompareViewProps {
  originalText: string
  rewrittenText: string
  onAccept: () => void
  onReject: () => void
  isApplying: boolean
}

export default function RewriteCompareView({
  originalText,
  rewrittenText,
  onAccept,
  onReject,
  isApplying,
}: RewriteCompareViewProps) {
  const t = useTranslations('novel-writing.rewrite')
  const [viewMode, setViewMode] = useState<'side' | 'diff'>('side')

  // 格式化文本显示
  const formatText = (text: string) => {
    return text.split('\n').map((paragraph, index) => {
      const trimmed = paragraph.trim()
      if (!trimmed) return null

      const isDialogue = /^[「"']/.test(trimmed)

      return (
        <p
          key={index}
          className={`mb-3 leading-relaxed text-sm ${
            isDialogue
              ? 'text-[var(--pin-text-primary)]'
              : 'text-[var(--pin-text-secondary)]'
          }`}
          style={{ textIndent: isDialogue ? 0 : '2em' }}
        >
          {trimmed}
        </p>
      )
    })
  }

  // 计算差异统计
  const getDiffStats = () => {
    const originalWords = originalText.length
    const rewrittenWords = rewrittenText.length
    const diff = rewrittenWords - originalWords
    const percentage = originalWords > 0 ? Math.round((diff / originalWords) * 100) : 0

    return {
      originalWords,
      rewrittenWords,
      diff,
      percentage,
    }
  }

  const stats = getDiffStats()

  return (
    <div className="space-y-4">
      {/* 视图切换 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('side')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              viewMode === 'side'
                ? 'bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)]'
                : 'text-[var(--pin-text-tertiary)] hover:text-[var(--pin-text-secondary)]'
            }`}
          >
            <AppIcon name="bookOpen" className="w-3.5 h-3.5 mr-1.5 inline" />
            并排对比
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              viewMode === 'diff'
                ? 'bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)]'
                : 'text-[var(--pin-text-tertiary)] hover:text-[var(--pin-text-secondary)]'
            }`}
          >
            <AppIcon name="fileText" className="w-3.5 h-3.5 mr-1.5 inline" />
            差异视图
          </button>
        </div>

        {/* 统计信息 */}
        <div className="text-xs text-[var(--pin-text-tertiary)]">
          原文 {stats.originalWords.toLocaleString()} 字 → 改写后 {stats.rewrittenWords.toLocaleString()} 字
          <span
            className={`ml-2 ${
              stats.diff > 0
                ? 'text-green-500'
                : stats.diff < 0
                ? 'text-orange-500'
                : ''
            }`}
          >
            ({stats.diff > 0 ? '+' : ''}{stats.diff}字, {stats.percentage > 0 ? '+' : ''}{stats.percentage}%)
          </span>
        </div>
      </div>

      {/* 对比内容 */}
      {viewMode === 'side' ? (
        <div className="grid grid-cols-2 gap-4">
          {/* 原文 */}
          <div className="pin-surface-soft rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--pin-stroke-base)]">
              <h4 className="text-sm font-medium text-[var(--pin-text-primary)]">
                {t('originalText')}
              </h4>
              <span className="text-xs text-[var(--pin-text-tertiary)]">
                {stats.originalWords.toLocaleString()} 字
              </span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {formatText(originalText)}
            </div>
          </div>

          {/* 改写后 */}
          <div className="pin-surface-soft rounded-xl p-4 ring-2 ring-[var(--pin-color-brand)]/30">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--pin-stroke-base)]">
              <h4 className="text-sm font-medium text-[var(--pin-text-primary)]">
                {t('rewrittenText')}
              </h4>
              <span className="text-xs text-[var(--pin-text-tertiary)]">
                {stats.rewrittenWords.toLocaleString()} 字
              </span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {formatText(rewrittenText)}
            </div>
          </div>
        </div>
      ) : (
        <div className="pin-surface-soft rounded-xl p-4">
          <div className="max-h-[500px] overflow-y-auto">
            {formatDiffView(originalText, rewrittenText)}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--pin-stroke-base)]">
        <button
          onClick={onReject}
          disabled={isApplying}
          className="pin-btn-base pin-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
        >
          <AppIcon name="close" className="w-4 h-4 mr-2 inline" />
          放弃
        </button>
        <button
          onClick={onAccept}
          disabled={isApplying}
          className="pin-btn-base pin-btn-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {isApplying ? (
            <>
              <AppIcon name="loader" className="w-4 h-4 mr-2 inline animate-spin" />
              应用中...
            </>
          ) : (
            <>
              <AppIcon name="check" className="w-4 h-4 mr-2 inline" />
              {t('applyChanges')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// 差异视图格式化
function formatDiffView(original: string, rewritten: string) {
  const originalLines = original.split('\n')
  const rewrittenLines = rewritten.split('\n')

  const result: ReactElement[] = []

  const maxLines = Math.max(originalLines.length, rewrittenLines.length)

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i] || ''
    const rewrLine = rewrittenLines[i] || ''

    if (origLine === rewrLine) {
      // 相同的行
      result.push(
        <div key={i} className="flex py-1 text-sm">
          <span className="w-8 text-[var(--pin-text-tertiary)] text-right pr-2 select-none">
            {i + 1}
          </span>
          <span className="flex-1 text-[var(--pin-text-secondary)]">
            {origLine}
          </span>
        </div>
      )
    } else {
      // 不同的行
      if (origLine) {
        result.push(
          <div key={`${i}-orig`} className="flex py-1 text-sm bg-red-500/10">
            <span className="w-8 text-red-400 text-right pr-2 select-none">
              -
            </span>
            <span className="flex-1 text-red-400/80 line-through">
              {origLine}
            </span>
          </div>
        )
      }
      if (rewrLine) {
        result.push(
          <div key={`${i}-rewr`} className="flex py-1 text-sm bg-green-500/10">
            <span className="w-8 text-green-400 text-right pr-2 select-none">
              +
            </span>
            <span className="flex-1 text-green-400">
              {rewrLine}
            </span>
          </div>
        )
      }
    }
  }

  return <div className="font-mono space-y-0.5">{result}</div>
}
