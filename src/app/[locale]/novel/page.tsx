'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'
import NovelProjectCard from '@/components/novel-writing/NovelProjectCard'
import CreateNovelProjectModal from '@/components/novel-writing/CreateNovelProjectModal'

interface NovelProject {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  novelWritingData?: {
    id: string
    projectId: string
    worldContext: string | null
    writingStyle: string | null
    artStyle: string
    videoRatio: string
    episodes?: Array<{
      id: string
      name: string
      novelText?: string | null
    }>
    episodeCount: number
    characterCount: number
    locationCount: number
  }
}

export default function NovelWritingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('novel-writing')
  const tc = useTranslations('common')

  const [projects, setProjects] = useState<NovelProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 检查登录状态
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
    }
  }, [session, status, router])

  // 获取项目列表
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/novel-writing')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('获取项目失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchProjects()
    }
  }, [session, fetchProjects])

  // 过滤项目
  const filteredProjects = projects.filter(p => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(query) ||
      (p.description?.toLowerCase().includes(query))
    )
  })

  // 计算项目统计
  const getProjectStats = (project: NovelProject) => {
    const episodes = project.novelWritingData?.episodes || []
    const chapterCount = project.novelWritingData?.episodeCount || 0
    const wordCount = episodes.reduce((sum, ep) => {
      return sum + (ep.novelText?.length || 0)
    }, 0)
    return { chapterCount, wordCount }
  }

  // 创建成功后跳转
  const handleCreateSuccess = (projectId: string) => {
    setShowCreateModal(false)
    router.push({ pathname: `/novel/${projectId}` })
  }

  if (status === 'loading' || !session) {
    return (
      <div className="pin-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--pin-color-brand)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--pin-text-secondary)]">{tc('loading')}</p>
        </div>
      </div>
    )
  }

  // 数据加载中，显示完整加载状态
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

  return (
    <div className="pin-page min-h-screen">
      <Navbar />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* 标题区域 */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--pin-text-primary)] mb-2">
              {t('title')}
            </h1>
            <p className="text-[var(--pin-text-secondary)]">
              {t('subtitle')}
            </p>
          </div>

          {/* 搜索框 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pin-input-base w-64 px-3 py-2"
            />
          </div>
        </div>

        {/* 项目网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* 新建项目卡片 */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="pin-surface p-6 cursor-pointer group flex items-center justify-center bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-600/5 hover:from-purple-500/10 hover:via-pink-500/10 hover:to-purple-600/10 transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 group-hover:scale-110 transition-all duration-300">
                <AppIcon name="plus" className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--pin-text-secondary)] group-hover:text-[var(--pin-text-primary)] transition-colors">
                {t('newProject')}
              </span>
            </div>
          </div>

          {/* 项目卡片 */}
          {filteredProjects.map((project) => {
            const stats = getProjectStats(project)
            return (
              <NovelProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={project.description}
                chapterCount={stats.chapterCount}
                wordCount={stats.wordCount}
                updatedAt={project.updatedAt}
              />
            )
          })}
        </div>

        {/* 空状态 - 仅在搜索无结果时显示 */}
        {projects.length === 0 && !loading && (
          <div className="col-span-full text-center py-8">
            <p className="text-[var(--pin-text-secondary)]">
              点击左侧「新建小说项目」卡片开始创作
            </p>
          </div>
        )}

        {/* 搜索无结果 */}
        {projects.length > 0 && filteredProjects.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-[var(--pin-text-secondary)]">
              没有找到匹配的项目，请尝试其他搜索词
            </p>
          </div>
        )}
      </main>

      {/* 新建项目弹窗 */}
      <CreateNovelProjectModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
