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

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('read')

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
      if (episodes.length > 0 && !selectedChapterId) {
        const urlChapter = searchParams?.get('chapter')
        if (urlChapter && episodes.some((ep: Chapter) => ep.id === urlChapter)) {
          setSelectedChapterId(urlChapter)
        } else {
          setSelectedChapterId(episodes[0].id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [projectId, selectedChapterId, searchParams])

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

  // 当前选中的章节
  const selectedChapter = useMemo(() => {
    if (!selectedChapterId || !chapters.length) return null
    return chapters.find(ch => ch.id === selectedChapterId) || null
  }, [selectedChapterId, chapters])

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

  // 选择章节
  const handleChapterSelect = (chapterId: string) => {
    setSelectedChapterId(chapterId)
    updateUrl(chapterId)
  }

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
        setSelectedChapterId(data.episode.id)
        updateUrl(data.episode.id)
      }
    } catch (err) {
      console.error('创建章节失败:', err)
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
      <div className="glass-page min-h-screen flex items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">{tc('loading')}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="glass-page min-h-screen">
        <Navbar />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[var(--glass-accent-from)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--glass-text-secondary)]">{tc('loading')}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="glass-page min-h-screen">
        <Navbar />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="glass-surface p-6 text-center">
            <p className="text-[var(--glass-tone-danger-fg)] mb-4">{error || '项目不存在'}</p>
            <button
              onClick={() => router.push({ pathname: '/novel' })}
              className="glass-btn-base glass-btn-primary px-6 py-2"
            >
              返回项目列表
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="glass-page min-h-screen">
      <Navbar />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* 项目标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push({ pathname: '/novel' })}
              className="text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)] transition-colors"
            >
              <AppIcon name="chevronLeft" className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-[var(--glass-text-primary)]">
              {project.name}
            </h1>
            <span className="text-sm text-[var(--glass-text-tertiary)]">
              {chapters.length} 章节
            </span>
          </div>

          {/* 视图切换按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('read')}
              className={`glass-btn-base px-4 py-2 text-sm ${
                viewMode === 'read' ? 'glass-btn-primary' : 'glass-btn-secondary'
              }`}
            >
              <AppIcon name="bookOpen" className="w-4 h-4 mr-2 inline" />
              阅读
            </button>
            <button
              onClick={() => setViewMode('analyze')}
              className={`glass-btn-base px-4 py-2 text-sm ${
                viewMode === 'analyze' ? 'glass-btn-primary' : 'glass-btn-secondary'
              }`}
            >
              <AppIcon name="sparkles" className="w-4 h-4 mr-2 inline" />
              {t('aiAnalyze')}
            </button>
            <button
              onClick={() => setViewMode('rewrite')}
              className={`glass-btn-base px-4 py-2 text-sm ${
                viewMode === 'rewrite' ? 'glass-btn-primary' : 'glass-btn-secondary'
              }`}
              disabled={!selectedChapter}
            >
              <AppIcon name="edit" className="w-4 h-4 mr-2 inline" />
              {t('aiRewrite')}
            </button>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex gap-6">
          {/* 章节侧边栏 */}
          <ChapterSidebar
            chapters={chapters}
            selectedChapterIds={selectedChapterId ? [selectedChapterId] : []}
            onChapterSelect={(chapterIds: string[]) => {
              if (chapterIds.length > 0) {
                handleChapterSelect(chapterIds[0])
              }
            }}
            onNewChapter={handleNewChapter}
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
