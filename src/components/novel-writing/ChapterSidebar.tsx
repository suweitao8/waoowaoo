'use client'

import { useState, useCallback } from 'react'
import { AppIcon } from '@/components/ui/icons'
import { useTranslations } from 'next-intl'
import ChapterContextMenu from './ChapterContextMenu'

interface Chapter {
  id: string
  name: string
  novelText?: string | null
  analysisStatus?: string | null
}

interface ChapterSidebarProps {
  chapters: Chapter[]
  selectedChapterIds: string[]
  onChapterSelect: (chapterIds: string[], isMulti?: boolean) => void
  onNewChapter: () => void
  onImportNovel?: () => void
  onAnalyzeChapters?: (chapterIds: string[]) => void
  onRenameChapter?: (chapterId: string) => void
  onDeleteChapters?: (chapterIds: string[]) => void
  onSummarize?: () => void
}

export default function ChapterSidebar({
  chapters,
  selectedChapterIds,
  onChapterSelect,
  onNewChapter,
  onAnalyzeChapters,
  onRenameChapter,
  onDeleteChapters,
  onSummarize,
}: ChapterSidebarProps) {
  const t = useTranslations('novel-writing.sidebar')

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    chapterIds: string[]
  } | null>(null)

  // 处理章节点击
  const handleChapterClick = useCallback(
    (e: React.MouseEvent, chapterId: string) => {
      // 右键点击
      if (e.button === 2) {
        e.preventDefault()

        // 如果点击的章节不在已选中列表中，则只选中这个章节
        const ids = selectedChapterIds.includes(chapterId)
          ? selectedChapterIds
          : [chapterId]

        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          chapterIds: ids,
        })
        return
      }

      // 左键点击
      if (e.button === 0) {
        // Ctrl/Cmd + 点击 = 多选
        if (e.ctrlKey || e.metaKey) {
          const isSelected = selectedChapterIds.includes(chapterId)
          if (isSelected) {
            // 取消选中
            onChapterSelect(
              selectedChapterIds.filter(id => id !== chapterId),
              true
            )
          } else {
            // 添加选中
            onChapterSelect([...selectedChapterIds, chapterId], true)
          }
        } else {
          // 单选
          onChapterSelect([chapterId], false)
        }
      }
    },
    [selectedChapterIds, onChapterSelect]
  )

  // 关闭右键菜单
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // 分析选中章节
  const handleAnalyze = useCallback(() => {
    if (contextMenu && onAnalyzeChapters) {
      onAnalyzeChapters(contextMenu.chapterIds)
    }
  }, [contextMenu, onAnalyzeChapters])

  // 重命名章节
  const handleRename = useCallback(() => {
    if (contextMenu && contextMenu.chapterIds.length === 1 && onRenameChapter) {
      onRenameChapter(contextMenu.chapterIds[0])
    }
  }, [contextMenu, onRenameChapter])

  // 删除章节
  const handleDelete = useCallback(() => {
    if (contextMenu && onDeleteChapters) {
      onDeleteChapters(contextMenu.chapterIds)
    }
  }, [contextMenu, onDeleteChapters])

  // 阻止默认右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div
      className="w-64 flex-shrink-0 pin-surface-soft rounded-xl p-4 h-[calc(100vh-200px)] flex flex-col"
      onContextMenu={handleContextMenu}
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--pin-text-primary)]">
          章节 ({chapters.length})
        </h3>
        {selectedChapterIds.length > 1 && (
          <span className="text-xs text-[var(--pin-text-tertiary)]">
            已选 {selectedChapterIds.length} 章
          </span>
        )}
      </div>

      {/* 章节列表 */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {chapters.map((chapter) => {
          const wordCount = chapter.novelText?.length || 0
          const isSelected = selectedChapterIds.includes(chapter.id)
          const isAnalyzed = chapter.analysisStatus === 'completed'

          return (
            <button
              key={chapter.id}
              onClick={(e) => handleChapterClick(e, chapter.id)}
              onContextMenu={(e) => handleChapterClick(e, chapter.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-all relative ${
                isSelected
                  ? 'bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)]'
                  : 'hover:bg-[var(--pin-bg-muted)] text-[var(--pin-text-secondary)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{chapter.name}</div>
                  <div className="text-xs text-[var(--pin-text-tertiary)] mt-0.5 flex items-center gap-2">
                    <span>{wordCount.toLocaleString()} 字</span>
                    {isAnalyzed && (
                      <span className="text-green-500">✓ 已分析</span>
                    )}
                  </div>
                </div>
                {isSelected && selectedChapterIds.length > 1 && (
                  <div className="w-5 h-5 rounded bg-[var(--pin-color-brand)] text-white text-xs flex items-center justify-center">
                    ✓
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* 底部操作 */}
      <div className="pt-4 border-t border-[var(--pin-stroke-base)] space-y-2">
        <button
          onClick={onNewChapter}
          className="w-full pin-btn-base pin-btn-secondary px-3 py-2 text-sm flex items-center justify-center gap-2"
        >
          <AppIcon name="plus" className="w-4 h-4" />
          {t('newChapter')}
        </button>

        {onSummarize && (
          <button
            onClick={onSummarize}
            className="w-full pin-btn-base pin-btn-primary px-3 py-2 text-sm flex items-center justify-center gap-2"
          >
            <AppIcon name="barChart" className="w-4 h-4" />
            总结
          </button>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <ChapterContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedCount={contextMenu.chapterIds.length}
          onAnalyze={handleAnalyze}
          onRename={handleRename}
          onDelete={handleDelete}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  )
}
