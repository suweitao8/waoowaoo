'use client'

import { useEffect, useRef } from 'react'
import { AppIcon } from '@/components/ui/icons'

interface ChapterContextMenuProps {
  x: number
  y: number
  selectedCount: number
  onAnalyze: () => void
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}

export default function ChapterContextMenu({
  x,
  y,
  selectedCount,
  onAnalyze,
  onRename,
  onDelete,
  onClose,
}: ChapterContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // 调整位置确保菜单在视口内
  const adjustedX = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 180)
  const adjustedY = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 150)

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] py-1 rounded-lg shadow-lg border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <button
        onClick={() => {
          onAnalyze()
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm text-[var(--glass-text-primary)] hover:bg-[var(--glass-bg-muted)] flex items-center gap-2"
      >
        <AppIcon name="sparkles" className="w-4 h-4" />
        分析选中章节
        {selectedCount > 1 && (
          <span className="text-xs text-[var(--glass-text-tertiary)]">
            ({selectedCount})
          </span>
        )}
      </button>

      {selectedCount === 1 && (
        <button
          onClick={() => {
            onRename()
            onClose()
          }}
          className="w-full px-4 py-2 text-left text-sm text-[var(--glass-text-primary)] hover:bg-[var(--glass-bg-muted)] flex items-center gap-2"
        >
          <AppIcon name="edit" className="w-4 h-4" />
          重命名
        </button>
      )}

      <button
        onClick={() => {
          onDelete()
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm text-[var(--glass-tone-danger-fg)] hover:bg-[var(--glass-bg-muted)] flex items-center gap-2"
      >
        <AppIcon name="trash" className="w-4 h-4" />
        删除
        {selectedCount > 1 && (
          <span className="text-xs">
            ({selectedCount})
          </span>
        )}
      </button>
    </div>
  )
}
