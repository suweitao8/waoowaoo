'use client'

import { AppIcon } from '@/components/ui/icons'

interface Chapter {
  id: string
  name: string
  novelText?: string | null
}

interface ChapterReaderProps {
  chapter: Chapter | null
  loading?: boolean
}

export default function ChapterReader({
  chapter,
  loading,
}: ChapterReaderProps) {
  // 格式化文本显示

  if (loading) {
    return (
      <div className="flex-1 pin-surface-soft rounded-xl p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--pin-color-brand)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--pin-text-secondary)]">加载中...</p>
        </div>
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="flex-1 pin-surface-soft rounded-xl p-6 flex items-center justify-center">
        <div className="text-center">
          <AppIcon name="bookOpen" className="w-12 h-12 text-[var(--pin-text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--pin-text-primary)] mb-2">
            选择章节开始阅读
          </h3>
          <p className="text-[var(--pin-text-secondary)]">
            从左侧列表选择一个章节，或创建新章节
          </p>
        </div>
      </div>
    )
  }

  // 格式化文本显示
  const formatText = (text: string) => {
    return text.split('\n').map((paragraph, index) => {
      const trimmed = paragraph.trim()
      if (!trimmed) return null

      // 检测是否为对话（以引号开头）
      const isDialogue = /^[「"']/.test(trimmed)

      return (
        <p
          key={index}
          className={`mb-4 leading-relaxed ${
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

  return (
    <div className="flex-1 pin-surface-soft rounded-xl p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* 章节标题 */}
      <h2 className="text-xl font-bold text-[var(--pin-text-primary)] mb-6 pb-4 border-b border-[var(--pin-stroke-base)]">
        {chapter.name}
      </h2>

      {/* 章节内容 */}
      <div className="prose prose-sm max-w-none">
        {chapter.novelText ? (
          formatText(chapter.novelText)
        ) : (
          <div className="text-center py-8 text-[var(--pin-text-tertiary)]">
            该章节暂无内容
          </div>
        )}
      </div>

      {/* 字数统计 */}
      {chapter.novelText && (
        <div className="mt-8 pt-4 border-t border-[var(--pin-stroke-base)] text-xs text-[var(--pin-text-tertiary)]">
          共 {chapter.novelText.length.toLocaleString()} 字
        </div>
      )}
    </div>
  )
}
