'use client'

import { AppIcon } from '@/components/ui/icons'
import { Link } from '@/i18n/navigation'

interface NovelProjectCardProps {
  id: string
  name: string
  description: string | null
  chapterCount: number
  wordCount: number
  updatedAt: string
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function NovelProjectCard({
  id,
  name,
  description,
  chapterCount,
  wordCount,
  updatedAt,
}: NovelProjectCardProps) {
  return (
    <Link
      href={{ pathname: `/novel/${id}` }}
      className="pin-surface cursor-pointer relative group block hover:border-[var(--pin-tone-info-fg)]/40 transition-all duration-300 overflow-hidden"
    >
      {/* 悬停光效 */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="p-5 relative z-10">
        {/* 标题 */}
        <h3 className="text-lg font-bold text-[var(--pin-text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--pin-tone-info-fg)] transition-colors">
          {name}
        </h3>

        {/* 描述 */}
        {description && (
          <p className="text-sm text-[var(--pin-text-secondary)] line-clamp-2 mb-4">
            {description}
          </p>
        )}

        {/* 统计信息 */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <span className="flex items-center gap-1 text-[var(--pin-text-secondary)]">
            <AppIcon name="bookOpen" className="w-4 h-4" />
            {chapterCount} 章节
          </span>
          <span className="flex items-center gap-1 text-[var(--pin-text-secondary)]">
            <AppIcon name="fileText" className="w-4 h-4" />
            {wordCount.toLocaleString()} 字
          </span>
        </div>

        {/* 更新时间 */}
        <div className="text-xs text-[var(--pin-text-tertiary)]">
          更新于 {formatDate(updatedAt)}
        </div>
      </div>
    </Link>
  )
}
