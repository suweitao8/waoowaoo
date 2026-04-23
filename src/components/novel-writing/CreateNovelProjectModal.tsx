'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'
import { readApiErrorMessage } from '@/lib/api/read-error-message'

// 编码检测函数
function detectEncodingAndDecode(uint8Array: Uint8Array): string {
  const len = uint8Array.length

  // UTF-8 BOM
  if (len >= 3 && uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(uint8Array)
  }

  // UTF-16 LE BOM
  if (len >= 2 && uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(uint8Array)
  }

  // 尝试 UTF-8
  const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
  try {
    const text = utf8Decoder.decode(uint8Array)
    if (!text.includes('�')) {
      return text
    }
  } catch {
    // 继续尝试其他编码
  }

  // 尝试 GB18030
  try {
    const gb18030Decoder = new TextDecoder('gb18030', { fatal: true })
    const text = gb18030Decoder.decode(uint8Array)
    if (!text.includes('�') && /[一-龥]/.test(text)) {
      return text
    }
  } catch {
    // 忽略
  }

  // 最终回退
  return new TextDecoder('utf-8').decode(uint8Array)
}

// 预处理小说文本
function preprocessNovelContent(content: string): string {
  if (!content || content.length < 100) return content

  let processed = content
  processed = processed.replace(/^[^\n]*[一-龥]+\s*\d+\s*[-~至到]\s*\d+\s*[章回集部卷]?\s*$/gm, '')
  processed = processed.replace(/^第[一二三四五六七八九十百千\d零壹贰叁肆伍陆柒捌玖拾]+卷[^\n]*$/gm, '')
  processed = processed.replace(/^[──\-_=*~·•]{3,}$/gm, '')
  processed = processed.replace(/\n{3,}/g, '\n\n')
  processed = processed.trim()

  return processed
}

// 章节拆分函数
interface ChapterSplit {
  title: string
  chapterNumber: string
  chapterName: string
  content: string
  startIndex: number
  endIndex: number
}

function splitNovelByChapters(content: string): ChapterSplit[] {
  const chapterRegex = /(?:^|\n)(第[一二三四五六七八九十百千万\d]+章[^\n]*)/g
  const chapters: ChapterSplit[] = []
  let match

  const matches: { title: string; index: number }[] = []
  while ((match = chapterRegex.exec(content)) !== null) {
    const title = match[1].trim()
    if (title.length <= 50) {
      matches.push({ title, index: match.index + (match[0].length - match[1].length) })
    }
  }

  if (matches.length === 0) {
    const trimmedContent = content.trim()
    if (trimmedContent.length > 0) {
      return [{
        title: '第一章',
        chapterNumber: '第一章',
        chapterName: '',
        content: trimmedContent,
        startIndex: 0,
        endIndex: trimmedContent.length
      }]
    }
    return []
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]

    if (i === 0 && current.index > 0) {
      const prologueContent = content.substring(0, current.index).trim()
      if (prologueContent.length > 100) {
        chapters.push({
          title: '序章',
          chapterNumber: '序章',
          chapterName: '',
          content: prologueContent,
          startIndex: 0,
          endIndex: current.index
        })
      }
    }

    const endIndex = next ? next.index : content.length
    const rawContent = content.substring(current.index, endIndex)

    if (rawContent.trim().length > 50) {
      const titleMatch = current.title.match(/(第[一二三四五六七八九十百千万\d]+章)\s*(.*)/)
      const chapterNumber = titleMatch ? titleMatch[1] : '第一章'
      const chapterName = titleMatch && titleMatch[2] ? titleMatch[2].trim() : ''
      const contentWithoutTitle = rawContent.replace(/^[^\n]*\n/, '').trim()

      chapters.push({
        title: chapterName ? `${chapterNumber} ${chapterName}` : chapterNumber,
        chapterNumber,
        chapterName,
        content: contentWithoutTitle,
        startIndex: current.index,
        endIndex: endIndex
      })
    }
  }

  return chapters
}

interface CreateNovelProjectModalProps {
  show: boolean
  onClose: () => void
  onSuccess: (projectId: string) => void
}

export default function CreateNovelProjectModal({
  show,
  onClose,
  onSuccess,
}: CreateNovelProjectModalProps) {
  const t = useTranslations('novel-writing')
  const tc = useTranslations('common')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [novelFile, setNovelFile] = useState<File | null>(null)
  const [novelContent, setNovelContent] = useState('')
  const [novelFileName, setNovelFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['.txt', '.md', '.text']
    const fileName = file.name.toLowerCase()
    const isValidType = validTypes.some(ext => fileName.endsWith(ext))
    if (!isValidType) {
      setError(t('validation.invalidFileType'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t('validation.fileTooLarge'))
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const rawContent = detectEncodingAndDecode(uint8Array)
      const content = preprocessNovelContent(rawContent)

      setNovelFile(file)
      setNovelContent(content)
      setNovelFileName(file.name)

      if (!name) {
        let nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        nameWithoutExt = nameWithoutExt
          .replace(/\s*\d+\s*[-~至到]\s*\d+\s*[章回集部卷]?\s*$/, '')
          .replace(/\s*第?\s*\d+\s*[-~至到]\s*\d+\s*[章回集部卷]?\s*$/, '')
          .trim()
        setName(nameWithoutExt)
      }
      setError(null)
    } catch {
      setError(t('validation.fileReadError'))
    }
  }, [name, t])

  const handleClearFile = useCallback(() => {
    setNovelFile(null)
    setNovelContent('')
    setNovelFileName('')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError(t('validation.nameRequired'))
      return
    }

    setError(null)
    setLoading(true)

    try {
      // 创建写小说项目（使用专用 API）
      const response = await apiFetch('/api/novel-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
        }),
      })

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, t('createProject')))
      }

      const projectData = await response.json()
      const projectId = projectData.project?.id

      if (!projectId) {
        throw new Error('Failed to get project ID')
      }

      // 如果有小说内容，拆分章节
      if (novelContent && novelContent.length >= 100) {
        const chapters = splitNovelByChapters(novelContent)

        for (const chapter of chapters) {
          await apiFetch(`/api/novel-writing/${projectId}/episodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: chapter.title,
              description: `共${chapter.content.length}字`,
              novelText: chapter.content,
            }),
          })
        }
      }

      // 重置表单
      setName('')
      setDescription('')
      setNovelFile(null)
      setNovelContent('')
      setNovelFileName('')

      onSuccess(projectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createProject'))
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 pin-overlay flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="pin-surface-modal p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-[var(--pin-text-primary)] mb-4">
          {t('createProject')}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* 小说文件上传 */}
          <div className="mb-4">
            <label className="pin-field-label block mb-2">
              {t('novelFile')}
            </label>
            {!novelFile ? (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[var(--pin-stroke-strong)] rounded-xl cursor-pointer hover:border-[var(--pin-tone-info-fg)]/40 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <AppIcon name="upload" className="w-6 h-6 mb-2 text-[var(--pin-text-tertiary)]" />
                  <p className="text-sm text-[var(--pin-text-secondary)]">
                    {t('dragDropFile')} <span className="font-semibold">{t('browse')}</span>
                  </p>
                  <p className="text-xs text-[var(--pin-text-tertiary)]">{t('supportedFormats')}</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.text"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 border border-[var(--pin-stroke-strong)] rounded-xl bg-[var(--pin-bg-muted)]">
                <div className="flex items-center gap-2">
                  <AppIcon name="fileText" className="w-5 h-5 text-[var(--pin-tone-info-fg)]" />
                  <span className="text-sm text-[var(--pin-text-primary)] truncate max-w-[200px]">{novelFileName}</span>
                  <span className="text-xs text-[var(--pin-text-tertiary)]">({Math.round(novelContent.length / 1024)}KB)</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="text-[var(--pin-text-tertiary)] hover:text-[var(--pin-tone-danger-fg)] transition-colors"
                >
                  <AppIcon name="close" className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 项目名称 */}
          <div className="mb-4">
            <label htmlFor="name" className="pin-field-label block mb-2">
              {t('projectName')} *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              className="pin-input-base w-full px-3 py-2"
              placeholder={t('projectNamePlaceholder')}
              maxLength={100}
              required
              autoFocus
            />
          </div>

          {/* 项目描述 */}
          <div className="mb-6">
            <label htmlFor="description" className="pin-field-label block mb-2">
              {t('projectDescription')}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="pin-textarea-base w-full px-3 py-2"
              placeholder={t('projectDescriptionPlaceholder')}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* 按钮 */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="pin-btn-base pin-btn-secondary px-4 py-2"
              disabled={loading}
            >
              {tc('cancel')}
            </button>
            <button
              type="submit"
              className="pin-btn-base pin-btn-primary px-4 py-2 disabled:opacity-50"
              disabled={loading || !name.trim()}
            >
              {loading ? t('creating') : (novelContent ? t('createProjectWithNovel') : t('createProject'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
