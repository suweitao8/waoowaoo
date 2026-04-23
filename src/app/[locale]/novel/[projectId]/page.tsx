'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'
import { readApiErrorMessage } from '@/lib/api/read-error-message'
import ChapterSidebar from '@/components/novel-writing/ChapterSidebar'
import ChapterReader from '@/components/novel-writing/ChapterReader'
import AIAnalysisPanel from '@/components/novel-writing/AIAnalysisPanel'
import AIRewritePanel from '@/components/novel-writing/AIRewritePanel'

type ViewMode = 'read' | 'analyze' | 'rewrite'

interface Chapter {
  id: string
  name: string
  novelText?: string | null
  analysisStatus?: string | null
  worldContext?: string | null
  writingStyle?: string | null
  createdAt: string
}

interface ProjectData {
  id: string
  name: string
  description: string | null
  novelWritingData?: {
    id: string
    projectId: string
    worldContext?: string | null
    writingStyle?: string | null
    extractedCharacters?: string | null
    episodes?: Chapter[]
  }
}

export default function NovelProjectDetailPage() {
  const params = useParams<{ projectId?: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const t = useTranslations('novel-writing')
  const tc = useTranslations('common')

  const projectId = params?.projectId

  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 改为多选
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('read')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)

  // 检查登录状态
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
    }
  }, [session, status, router])

  // 获取项目数据
  const fetchProject = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const response = await apiFetch(`/api/novel-writing/${projectId}`)

      if (!response.ok) {
        throw new Error('获取项目失败')
      }

      const data = await response.json()
      // 合并 project 和 novelWritingData 到一个对象
      setProject({
        ...data.project,
        novelWritingData: data.novelWritingData
      })
      setError(null)

      // 自动选择第一个章节
      const episodes = data.novelWritingData?.episodes || []
      if (episodes.length > 0 && selectedChapterIds.length === 0) {
        const urlChapter = searchParams?.get('chapter')
        if (urlChapter && episodes.some((ep: Chapter) => ep.id === urlChapter)) {
          setSelectedChapterIds([urlChapter])
        } else {
          setSelectedChapterIds([episodes[0].id])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [projectId, selectedChapterIds.length, searchParams])

  useEffect(() => {
    if (session && projectId) {
      fetchProject()
    }
  }, [session, projectId, fetchProject])

  // 获取章节列表
  const chapters = useMemo<Chapter[]>(() => {
    if (!project?.novelWritingData?.episodes) return []

    const getNum = (name: string) => {
      const m = name.match(/\d+/)
      return m ? parseInt(m[0], 10) : Infinity
    }

    return [...project.novelWritingData.episodes].sort((a, b) => {
      const diff = getNum(a.name) - getNum(b.name)
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'zh')
    })
  }, [project])

  // 当前选中的章节（取第一个作为主章节）
  const selectedChapter = useMemo(() => {
    if (selectedChapterIds.length === 0 || !chapters.length) return null
    return chapters.find(ch => ch.id === selectedChapterIds[0]) || null
  }, [selectedChapterIds, chapters])

  // 更新 URL
  const updateUrl = useCallback((chapterId: string | null) => {
    if (!chapterId) return

    const params = new URLSearchParams()
    params.set('chapter', chapterId)

    router.replace(
      {
        pathname: `/novel/${projectId}`,
        query: Object.fromEntries(params.entries()),
      },
      { scroll: false }
    )
  }, [router, projectId])

  // 选择章节（支持多选）
  const handleChapterSelect = useCallback((chapterIds: string[], isMulti?: boolean) => {
    setSelectedChapterIds(chapterIds)

    // 单选时更新 URL
    if (!isMulti && chapterIds.length === 1) {
      updateUrl(chapterIds[0])
    }
  }, [updateUrl])

  // 创建新章节
  const handleNewChapter = async () => {
    if (!projectId) return

    try {
      const chapterName = `第${chapters.length + 1}章`

      const response = await apiFetch(`/api/novel-writing/${projectId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: chapterName,
          description: '',
          novelText: '',
        }),
      })

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, '创建失败'))
      }

      const data = await response.json()
      fetchProject()

      // 选择新创建的章节
      if (data.episode?.id) {
        setSelectedChapterIds([data.episode.id])
        updateUrl(data.episode.id)
      }
    } catch (err) {
      console.error('创建章节失败:', err)
    }
  }

  // 分析选中章节
  const handleAnalyzeChapters = async (chapterIds: string[]) => {
    if (!projectId || chapterIds.length === 0) return

    setIsAnalyzing(true)
    try {
      const response = await apiFetch(`/api/novel-writing/${projectId}/analyze-chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterIds }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '分析失败')
      }

      // 刷新项目数据
      fetchProject()
    } catch (err) {
      console.error('分析失败:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 汇总项目
  const handleSummarize = async () => {
    if (!projectId) return

    setIsSummarizing(true)
    try {
      const response = await apiFetch(`/api/novel-writing/${projectId}/summarize-project`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '汇总失败')
      }

      // 刷新项目数据
      fetchProject()
    } catch (err) {
      console.error('汇总失败:', err)
    } finally {
      setIsSummarizing(false)
    }
  }

  // 重命名章节
  const handleRenameChapter = async (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId)
    if (!chapter) return

    const newName = prompt('请输入新的章节名称', chapter.name)
    if (!newName || newName === chapter.name) return

    try {
      const response = await apiFetch(`/api/novel-writing/${projectId}/episodes/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })

      if (!response.ok) {
        throw new Error('重命名失败')
      }

      fetchProject()
    } catch (err) {
      console.error('重命名失败:', err)
    }
  }

  // 删除章节
  const handleDeleteChapters = async (chapterIds: string[]) => {
    if (!confirm(`确定要删除 ${chapterIds.length} 个章节吗？`)) return

    try {
      for (const chapterId of chapterIds) {
        await apiFetch(`/api/novel-writing/${projectId}/episodes/${chapterId}`, {
          method: 'DELETE',
        })
      }

      // 清除已删除章节的选中状态
      setSelectedChapterIds(prev => prev.filter(id => !chapterIds.includes(id)))
      fetchProject()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  // 分析完成后刷新项目数据
  const handleAnalysisComplete = () => {
    fetchProject()
  }

  // 改写完成后刷新章节数据
  const handleRewriteComplete = () => {
    fetchProject()
  }

  if (status === 'loading' || !session) {
    return (
      <div className="pin-page min-h-screen flex items-center justify-center">
        <div className="text-[var(--pin-text-secondary)]">{tc('loading')}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="pin-page min-h-screen">
        <Navbar />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[var(--pin-color-brand)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--pin-text-secondary)]">{tc('loading')}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="pin-page min-h-screen">
        <Navbar />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="pin-surface p-6 text-center">
            <p className="text-[var(--pin-tone-danger-fg)] mb-4">{error || '项目不存在'}</p>
            <button
              onClick={() => router.push({ pathname: '/novel' })}
              className="pin-btn-base pin-btn-primary px-6 py-2"
            >
              返回项目列表
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="pin-page min-h-screen">
      <Navbar />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* 项目标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push({ pathname: '/novel' })}
              className="text-[var(--pin-text-tertiary)] hover:text-[var(--pin-text-secondary)] transition-colors"
            >
              <AppIcon name="chevronLeft" className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-[var(--pin-text-primary)]">
              {project.name}
            </h1>
            <span className="text-sm text-[var(--pin-text-tertiary)]">
              {chapters.length} 章节
            </span>
          </div>

          {/* 视图切换按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('read')}
              className={`pin-btn-base px-4 py-2 text-sm ${
                viewMode === 'read' ? 'pin-btn-primary' : 'pin-btn-secondary'
              }`}
            >
              <AppIcon name="bookOpen" className="w-4 h-4 mr-2 inline" />
              阅读
            </button>
            <button
              onClick={() => setViewMode('analyze')}
              className={`pin-btn-base px-4 py-2 text-sm ${
                viewMode === 'analyze' ? 'pin-btn-primary' : 'pin-btn-secondary'
              }`}
            >
              <AppIcon name="sparkles" className="w-4 h-4 mr-2 inline" />
              {t('aiAnalyze')}
            </button>
            <button
              onClick={() => setViewMode('rewrite')}
              className={`pin-btn-base px-4 py-2 text-sm ${
                viewMode === 'rewrite' ? 'pin-btn-primary' : 'pin-btn-secondary'
              }`}
              disabled={selectedChapterIds.length !== 1}
            >
              <AppIcon name="edit" className="w-4 h-4 mr-2 inline" />
              {t('aiRewrite')}
            </button>
          </div>
        </div>

        {/* 分析/汇总状态提示 */}
        {(isAnalyzing || isSummarizing) && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)] text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {isAnalyzing ? '正在分析选中章节...' : '正在汇总项目设定...'}
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex gap-6">
          {/* 章节侧边栏 */}
          <ChapterSidebar
            chapters={chapters}
            selectedChapterIds={selectedChapterIds}
            onChapterSelect={handleChapterSelect}
            onNewChapter={handleNewChapter}
            onAnalyzeChapters={handleAnalyzeChapters}
            onRenameChapter={handleRenameChapter}
            onDeleteChapters={handleDeleteChapters}
            onSummarize={handleSummarize}
          />

          {/* 主内容 */}
          {viewMode === 'read' && (
            <ChapterReader chapter={selectedChapter} />
          )}

          {viewMode === 'analyze' && (
            <AIAnalysisPanel
              projectId={projectId!}
              worldContext={project.novelWritingData?.worldContext}
              writingStyle={project.novelWritingData?.writingStyle}
              extractedCharacters={project.novelWritingData?.extractedCharacters}
              chapters={chapters}
              onComplete={handleAnalysisComplete}
            />
          )}

          {viewMode === 'rewrite' && selectedChapter && (
            <AIRewritePanel
              projectId={projectId!}
              chapterId={selectedChapter.id}
              chapterName={selectedChapter.name}
              novelText={selectedChapter.novelText || ''}
              worldContext={project.novelWritingData?.worldContext}
              writingStyle={project.novelWritingData?.writingStyle}
              extractedCharacters={project.novelWritingData?.extractedCharacters}
              onComplete={handleRewriteComplete}
            />
          )}
        </div>
      </main>
    </div>
  )
}
