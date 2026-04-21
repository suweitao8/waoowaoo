'use client'

import { useCallback, useEffect, useMemo } from 'react'
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  ListsToggle,
  UndoRedo,
  Separator,
  type MDXEditorMethods,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: number
  className?: string
}

/**
 * Markdown 编辑器组件
 * 基于 MDXEditor，支持：
 * - 标题、列表、引用
 * - 加粗、斜体、下划线
 * - 链接、图片、表格
 * - 代码块
 * - 源码模式切换
 */
export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '请输入内容...',
  disabled = false,
  minHeight = 300,
  className = '',
}: MarkdownEditorProps) {
  const plugins = useMemo(() => [
    // 基础 Markdown 语法支持
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    // 链接和图片
    linkPlugin(),
    linkDialogPlugin(),
    imagePlugin({
      imageUploadHandler: async () => {
        // TODO: 实现图片上传
        return Promise.resolve('https://via.placeholder.com/150')
      },
    }),
    // 表格
    tablePlugin(),
    // 代码块
    codeBlockPlugin({ defaultCodeBlockLanguage: 'javascript' }),
    codeMirrorPlugin({
      codeBlockLanguages: {
        js: 'JavaScript',
        ts: 'TypeScript',
        tsx: 'TypeScript (React)',
        jsx: 'JavaScript (React)',
        css: 'CSS',
        html: 'HTML',
        json: 'JSON',
        python: 'Python',
        bash: 'Bash',
        markdown: 'Markdown',
      },
    }),
    // 源码编辑模式
    diffSourcePlugin({ viewMode: 'rich-text' }),
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
          <InsertImage />
          <InsertTable />
        </>
      ),
    }),
  ], [])

  const handleChange = useCallback((markdown: string) => {
    if (!disabled) {
      onChange(markdown)
    }
  }, [disabled, onChange])

  return (
    <div
      className={`markdown-editor-wrapper ${className}`}
      style={{
        minHeight,
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <MDXEditor
        markdown={value}
        onChange={handleChange}
        plugins={plugins}
        placeholder={placeholder}
        contentEditableClassName="mdx-editor-content"
        className="mdx-editor-root"
      />
    </div>
  )
}
