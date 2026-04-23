'use client'

import { useCallback, useRef, useMemo, type ReactNode } from 'react'
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  ListsToggle,
  UndoRedo,
  Separator,
  type MDXEditorMethods,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import '@/styles/mdx-editor.css'
import { StylePresetSelector } from '@/components/selectors/RatioStyleSelectors'

interface StoryInputComposerStylePresetOption {
  value: string
  label: string
  description: string
}

interface StoryInputComposerProps {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  minRows: number
  disabled?: boolean
  /** @deprecated 不再使用，保留仅为 API 兼容 */
  maxHeightViewportRatio?: number
  topRight?: ReactNode
  footer?: ReactNode
  secondaryActions?: ReactNode
  primaryAction: ReactNode
  /** 左侧标题显示（如剧集名称） */
  leftTitle?: ReactNode
  stylePresetValue: string
  onStylePresetChange: (value: string) => void
  stylePresetOptions: readonly StoryInputComposerStylePresetOption[]
  /** @deprecated 不再使用，保留仅为 API 兼容 */
  onCompositionStart?: () => void
  /** @deprecated 不再使用，保留仅为 API 兼容 */
  onCompositionEnd?: (event: React.CompositionEvent<HTMLTextAreaElement>) => void
  /** @deprecated 不再使用，保留仅为 API 兼容 */
  textareaClassName?: string
}

/**
 * 故事输入编辑器
 * 基于 MDXEditor，支持完整的 Markdown 编辑功能
 */
export default function StoryInputComposer({
  value,
  onValueChange,
  placeholder,
  minRows,
  disabled = false,
  topRight,
  footer,
  secondaryActions,
  primaryAction,
  leftTitle,
  stylePresetValue,
  onStylePresetChange,
  stylePresetOptions,
}: StoryInputComposerProps) {
  const editorRef = useRef<MDXEditorMethods>(null)

  // 计算最小高度
  const minHeight = useMemo(() => {
    // 每行约 24px，加上工具栏和 padding
    // 增大基础高度，提供更宽敞的编辑空间
    return Math.max(minRows * 24 + 100, 400)
  }, [minRows])

  const plugins = useMemo(() => [
    // 基础 Markdown 语法支持
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    // 链接
    linkPlugin(),
    // 表格
    tablePlugin(),
    // 代码块
    codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
    codeMirrorPlugin({
      codeBlockLanguages: {
        text: 'Plain Text',
        js: 'JavaScript',
        ts: 'TypeScript',
        python: 'Python',
        bash: 'Bash',
      },
    }),
    // 工具栏
    toolbarPlugin({
      toolbarContents: () => (
        <>
          <UndoRedo />
          <Separator />
          <BlockTypeSelect />
          <Separator />
          <BoldItalicUnderlineToggles />
          <Separator />
          <ListsToggle />
          <Separator />
          <CreateLink />
          <InsertTable />
        </>
      ),
    }),
  ], [])

  const handleChange = useCallback((markdown: string) => {
    if (!disabled) {
      onValueChange(markdown)
    }
  }, [disabled, onValueChange])

  return (
    <div className="relative w-full glass-surface-elevated rounded-2xl">
      <div className="p-4">
        {/* 顶部工具栏：左侧标题 + 风格选择 + 操作按钮 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 border-b border-[var(--glass-stroke-base)]">
          {/* 左侧标题（剧集名称） */}
          {leftTitle && (
            <div className="flex-shrink-0">
              {leftTitle}
            </div>
          )}
          <div className="flex min-w-max flex-1 items-center gap-2">
            {stylePresetOptions.length > 0 ? (
              <div className="w-[152px] flex-shrink-0">
                <StylePresetSelector
                  value={stylePresetValue}
                  onChange={onStylePresetChange}
                  options={stylePresetOptions}
                />
              </div>
            ) : null}
          </div>
          <div className="ml-auto flex min-w-max items-center gap-2">
            {secondaryActions}
            {primaryAction}
          </div>
        </div>

        {topRight && (
          <div className="mb-3 flex items-center justify-end">
            {topRight}
          </div>
        )}

        {/* Markdown 编辑器 */}
        <div
          className="story-editor-container"
          style={{
            minHeight,
            opacity: disabled ? 0.6 : 1,
            pointerEvents: disabled ? 'none' : 'auto',
          }}
        >
          <MDXEditor
            ref={editorRef}
            markdown={value}
            onChange={handleChange}
            plugins={plugins}
            placeholder={placeholder}
            contentEditableClassName="story-editor-content"
            className="story-editor-root"
          />
        </div>
      </div>

      {footer && (
        <div className="px-4 pb-4">
          {footer}
        </div>
      )}
    </div>
  )
}
