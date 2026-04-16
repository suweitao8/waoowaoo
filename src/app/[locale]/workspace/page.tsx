'use client'
import { logError as _ulogError } from '@/lib/logging/core'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import ConfirmDialog from '@/components/ConfirmDialog'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { AppIcon, IconGradientDefs } from '@/components/ui/icons'
import { shouldGuideToModelSetup } from '@/lib/workspace/model-setup'
import { Link, useRouter } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { readApiErrorMessage } from '@/lib/api/read-error-message'
import { validateProjectDraft } from '@/lib/projects/validation'

interface ProjectStats {
  episodes: number
  images: number
  videos: number
  panels: number
  firstEpisodePreview: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  totalCost?: number  // 项目总费用（CNY）
  stats?: ProjectStats
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const PAGE_SIZE = 7 // 加上新建项目按钮正好8个，4列布局下2行
const DEFAULT_BILLING_CURRENCY = 'CNY'

/**
 * 章节拆分接口
 */
interface ChapterSplit {
  title: string        // 完整标题：第X章 章节名
  chapterNumber: string // 章节号：第X章
  chapterName: string   // 章节名：章节名（不含第X章）
  content: string
  startIndex: number
  endIndex: number
}

/**
 * 使用正则表达式按章节标题拆分小说内容
 * 支持：第X章、第一章、第1章 等格式
 */
function splitNovelByChapters(content: string): ChapterSplit[] {
  // 匹配章节标题：第X章 或 第X章 章节名（X可以是中文数字或阿拉伯数字）
  const chapterRegex = /(?:^|\n)(第[一二三四五六七八九十百千万\d]+章[^\n]*)/g

  const chapters: ChapterSplit[] = []
  let match

  // 找到所有章节标题的位置
  const matches: { title: string; index: number }[] = []
  while ((match = chapterRegex.exec(content)) !== null) {
    const title = match[1].trim()
    // 确保标题长度合理（过滤掉可能的误匹配）
    if (title.length <= 50) {
      matches.push({ title, index: match.index + (match[0].length - match[1].length) })
    }
  }

  // 如果没有找到章节，返回整个内容作为一章
  if (matches.length === 0) {
    const trimmedContent = content.trim()
    if (trimmedContent.length > 0) {
      return [{
        title: '第一章',
        chapterNumber: '第一章',
        chapterName: '',
        content: '\t' + trimmedContent,
        startIndex: 0,
        endIndex: trimmedContent.length
      }]
    }
    return []
  }

  // 按章节分割内容
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]

    // 如果是第一个匹配，检查前面是否有内容（序章）
    if (i === 0 && current.index > 0) {
      const prologueContent = content.substring(0, current.index).trim()
      if (prologueContent.length > 100) {
        chapters.push({
          title: '序章',
          chapterNumber: '序章',
          chapterName: '',
          content: '\t' + prologueContent,
          startIndex: 0,
          endIndex: current.index
        })
      }
    }

    // 提取章节内容
    const endIndex = next ? next.index : content.length
    const rawContent = content.substring(current.index, endIndex)

    // 只有内容足够长才添加（避免空章节）
    if (rawContent.trim().length > 50) {
      // 提取章节号和章节名
      const titleMatch = current.title.match(/(第[一二三四五六七八九十百千万\d]+章)\s*(.*)/)
      const chapterNumber = titleMatch ? titleMatch[1] : '第一章'
      const chapterName = titleMatch && titleMatch[2] ? titleMatch[2].trim() : ''

      // 从内容中移除章节标题行（第一行）
      const contentWithoutTitle = rawContent.replace(/^[^\n]*\n/, '').trim()

      // 给正文第一行加tab缩进
      const contentWithIndent = '\t' + contentWithoutTitle

      chapters.push({
        title: chapterName ? `${chapterNumber} ${chapterName}` : chapterNumber,
        chapterNumber,
        chapterName,
        content: contentWithIndent,
        startIndex: current.index,
        endIndex: endIndex
      })
    }
  }

  return chapters
}

function formatProjectCost(amount: number, currency = DEFAULT_BILLING_CURRENCY): string {
  if (currency === 'USD') return `$${amount.toFixed(2)}`
  return `¥${amount.toFixed(2)}`
}

function toProjectValidationMessage(
  issue: ReturnType<typeof validateProjectDraft>,
  t: ReturnType<typeof useTranslations>,
): string | null {
  if (!issue) return null

  switch (issue.code) {
    case 'PROJECT_NAME_REQUIRED':
      return t('validation.nameRequired')
    case 'PROJECT_NAME_TOO_LONG':
      return t('validation.nameTooLong')
    case 'PROJECT_DESCRIPTION_TOO_LONG':
      return t('validation.descriptionTooLong')
  }

  return null
}

export default function WorkspacePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: ''
  })
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  // 分页和搜索状态
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [modelNotConfigured, setModelNotConfigured] = useState(false)

  // 小说文件上传状态
  const [novelFile, setNovelFile] = useState<File | null>(null)
  const [novelContent, setNovelContent] = useState<string>('')
  const [novelFileName, setNovelFileName] = useState<string>('')

  // 拆解进度状态
  const [splitProgress, setSplitProgress] = useState<{ current: number; total: number; status: string } | null>(null)

  const t = useTranslations('workspace')
  const tc = useTranslations('common')

  // 检查用户是否已登录
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
      return
    }
  }, [session, status, router])

  // 获取项目列表
  const fetchProjects = useCallback(async (page: number = 1, search: string = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString()
      })
      if (search.trim()) {
        params.set('search', search.trim())
      }

      const response = await apiFetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
        setPagination(data.pagination)
      }
    } catch (error) {
      _ulogError('获取项目失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载和搜索/分页变化时重新获取
  useEffect(() => {
    if (session) {
      fetchProjects(pagination.page, searchQuery)
    }
  }, [session, pagination.page, searchQuery, fetchProjects])

  // 搜索处理
  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // 打开新建项目弹窗并检测模型配置
  const openCreateModal = useCallback(() => {
    setCreateError(null)
    setNovelFile(null)
    setNovelContent('')
    setNovelFileName('')
    setSplitProgress(null)
    setShowCreateModal(true)
    // 异步检测模型配置状态
    void (async () => {
      try {
        const res = await apiFetch('/api/user-preference')
        if (res.ok) {
          const payload: unknown = await res.json()
          setModelNotConfigured(shouldGuideToModelSetup(payload))
        }
      } catch {
        // 忽略检测失败
      }
    })()
  }, [])

  // 处理小说文件上传
  const handleNovelFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型
    const validTypes = ['.txt', '.md', '.text']
    const fileName = file.name.toLowerCase()
    const isValidType = validTypes.some(ext => fileName.endsWith(ext))
    if (!isValidType) {
      setCreateError(t('invalidFileType'))
      return
    }

    // 检查文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setCreateError(t('fileTooLarge'))
      return
    }

    try {
      const content = await file.text()
      setNovelFile(file)
      setNovelContent(content)
      setNovelFileName(file.name)
      // 自动填充项目名称（去掉扩展名）
      if (!formData.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setFormData(prev => ({ ...prev, name: nameWithoutExt }))
      }
      setCreateError(null)
    } catch {
      setCreateError(t('fileReadError'))
    }
  }, [formData.name, t])

  // 清除已上传的小说文件
  const handleClearNovelFile = useCallback(() => {
    setNovelFile(null)
    setNovelContent('')
    setNovelFileName('')
  }, [])

  // 分页处理
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationMessage = toProjectValidationMessage(validateProjectDraft(formData), t)
    if (validationMessage) {
      setCreateError(validationMessage)
      return
    }

    setCreateError(null)
    setCreateLoading(true)
    try {
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const projectData = await response.json()
        const projectId = projectData.project?.id

        // 如果有小说内容，使用脚本自动拆分章节并创建剧集
        if (novelContent && novelContent.length >= 100 && projectId) {
          try {
            // 保存项目配置
            setSplitProgress({ current: 0, total: 1, status: '正在初始化...' })
            await apiFetch(`/api/novel-promotion/${projectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoRatio: '16:9', artStyle: 'realistic' }),
            })

            // 使用正则脚本拆分章节
            setSplitProgress({ current: 0, total: 1, status: '正在分析章节结构...' })
            const chapters = splitNovelByChapters(novelContent)

            if (chapters.length > 0) {
              // 先清空现有剧集
              await apiFetch(`/api/novel-promotion/${projectId}/episodes/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearExisting: true, episodes: [], importStatus: 'splitting' }),
              })

              // 逐个创建剧集以显示进度
              const total = chapters.length
              for (let i = 0; i < chapters.length; i++) {
                const ch = chapters[i]
                setSplitProgress({
                  current: i + 1,
                  total,
                  status: `正在创建：${ch.title}（${i + 1}/${total}）`
                })

                // 调用单个创建API
                const createResponse = await apiFetch(`/api/novel-promotion/${projectId}/episodes`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: ch.title || `第${i + 1}章`,
                    description: `共${ch.content.length}字`,
                    novelText: ch.content
                  }),
                })

                if (!createResponse.ok) {
                  _ulogError(`创建剧集 ${ch.title} 失败:`, await createResponse.text())
                }
              }

              // 更新导入状态为完成
              await apiFetch(`/api/novel-promotion/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ importStatus: 'split' }),
              })

              setSplitProgress({ current: total, total, status: '拆解完成！' })

              // 剧集创建成功，跳转到项目工作区
              setTimeout(() => {
                router.push({ pathname: `/workspace/${projectId}` })
              }, 500)
              return
            }
          } catch (splitError) {
            _ulogError('章节拆分失败:', splitError)
            setSplitProgress(null)
            // 即使拆分失败，也跳转到工作区让用户手动处理
            router.push({ pathname: `/workspace/${projectId}` })
            return
          }
        }

        // 原有逻辑：检查模型配置
        let shouldOpenModelSetup = true
        const preferenceResponse = await apiFetch('/api/user-preference')
        if (preferenceResponse.ok) {
          const preferencePayload: unknown = await preferenceResponse.json()
          shouldOpenModelSetup = shouldGuideToModelSetup(preferencePayload)
        } else {
          _ulogError('获取用户偏好失败:', { status: preferenceResponse.status })
        }

        // 创建成功后刷新第一页
        setSearchQuery('')
        setSearchInput('')
        setPagination(prev => ({ ...prev, page: 1 }))
        void fetchProjects(1, '')
        setShowCreateModal(false)
        setFormData({ name: '', description: '' })

        if (shouldOpenModelSetup) {
          alert(t('analysisModelRequiredAfterCreate'))
          router.push({ pathname: '/profile' })
        }
      } else {
        setCreateError(await readApiErrorMessage(response, t('createFailed')))
      }
    } catch (error) {
      _ulogError('创建项目失败:', error)
      setCreateError(error instanceof Error ? error.message : t('createFailed'))
    } finally {
      setCreateLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    // 转换为北京时间 (UTC+8)
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    return beijingTime.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    })
  }

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    const validationMessage = toProjectValidationMessage(validateProjectDraft(editFormData), t)
    if (validationMessage) {
      setEditError(validationMessage)
      return
    }

    setEditError(null)
    setCreateLoading(true)
    try {
      const response = await apiFetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(projects.map(p => p.id === editingProject.id ? data.project : p))
        setShowEditModal(false)
        setEditingProject(null)
        setEditFormData({ name: '', description: '' })
      } else {
        setEditError(await readApiErrorMessage(response, t('updateFailed')))
      }
    } catch (error) {
      setEditError(error instanceof Error ? error.message : t('updateFailed'))
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    setDeletingProjectId(projectToDelete.id)
    setShowDeleteConfirm(false)

    try {
      const response = await apiFetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // 删除成功后重新获取当前页
        fetchProjects(pagination.page, searchQuery)
      } else {
        alert(t('deleteFailed'))
      }
    } catch {
      alert(t('deleteFailed'))
    } finally {
      setDeletingProjectId(null)
      setProjectToDelete(null)
    }
  }

  const openDeleteConfirm = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()  // 阻止 Link 导航
    e.stopPropagation()
    setProjectToDelete(project)
    setShowDeleteConfirm(true)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setProjectToDelete(null)
  }

  const openEditModal = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()  // 阻止 Link 导航
    e.stopPropagation()
    setEditingProject(project)
    setEditError(null)
    setEditFormData({
      name: project.name,
      description: project.description || ''
    })
    setShowEditModal(true)
  }

  if (status === 'loading' || !session) {
    return (
      <div className="glass-page min-h-screen flex items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">{tc('loading')}</div>
      </div>
    )
  }

  return (
    <div className="glass-page min-h-screen">
      {/* Header - 统一导航栏 */}
      <Navbar />

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--glass-text-primary)] mb-2">{t('title')}</h1>
            <p className="text-[var(--glass-text-secondary)]">{t('subtitle')}</p>
          </div>

          {/* 搜索框 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('searchPlaceholder')}
              className="glass-input-base w-64 px-3 py-2"
            />
            <button
              onClick={handleSearch}
              className="glass-btn-base glass-btn-primary px-4 py-2"
            >
              {t('searchButton')}
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchInput('')
                  setSearchQuery('')
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="glass-btn-base glass-btn-secondary px-4 py-2"
              >
                {t('clearButton')}
              </button>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* New Project Card */}
          <div
            onClick={() => openCreateModal()}
            className="glass-surface p-6 cursor-pointer group flex items-center justify-center bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-blue-600/5 hover:from-blue-500/10 hover:via-cyan-500/10 hover:to-blue-600/10 transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 group-hover:scale-110 transition-all duration-300">
                <AppIcon name="plus" className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--glass-text-secondary)] group-hover:text-[var(--glass-text-primary)] transition-colors">{t('newProject')}</span>
            </div>
          </div>

          {/* Project Cards */}
          {loading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="glass-surface p-6 animate-pulse">
                <div className="h-4 bg-[var(--glass-bg-muted)] rounded mb-3"></div>
                <div className="h-3 bg-[var(--glass-bg-muted)] rounded mb-2"></div>
                <div className="h-3 bg-[var(--glass-bg-muted)] rounded w-2/3"></div>
              </div>
            ))
          ) : (
            projects.map((project) => (
              <Link
                key={project.id}
                href={{ pathname: `/workspace/${project.id}` }}
                className="glass-surface cursor-pointer relative group block hover:border-[var(--glass-tone-info-fg)]/40 transition-all duration-300 overflow-hidden"
              >
                {/* 悬停光效 */}
                <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="p-5 relative z-10">
                  {/* 操作按钮 */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                      onClick={(e) => openEditModal(project, e)}
                      className="glass-btn-base glass-btn-secondary p-2 rounded-lg transition-colors"
                      title={t('editProject')}
                    >
                      <AppIcon name="editSquare" className="w-4 h-4 text-[var(--glass-tone-info-fg)]" />
                    </button>
                    <button
                      onClick={(e) => openDeleteConfirm(project, e)}
                      className="glass-btn-base glass-btn-secondary p-2 rounded-lg transition-colors"
                      title={t('deleteProject')}
                      disabled={deletingProjectId === project.id}
                    >
                      {deletingProjectId === project.id ? (
                        <TaskStatusInline
                          state={resolveTaskPresentationState({
                            phase: 'processing',
                            intent: 'process',
                            resource: 'text',
                            hasOutput: true,
                          })}
                          className="[&>span]:sr-only"
                        />
                      ) : (
                        <AppIcon name="trash" className="w-4 h-4 text-[var(--glass-tone-danger-fg)]" />
                      )}
                    </button>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-lg font-bold text-[var(--glass-text-primary)] mb-2 line-clamp-2 pr-20 group-hover:text-[var(--glass-tone-info-fg)] transition-colors">
                    {project.name}
                  </h3>

                  {/* 描述：优先用户描述，fallback 到第一集故事 */}
                  {(project.description || project.stats?.firstEpisodePreview) && (
                    <div className="flex items-start gap-2 mb-4">
                      <AppIcon name="fileText" className="w-4 h-4 text-[var(--glass-text-tertiary)] mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-[var(--glass-text-secondary)] line-clamp-2 leading-relaxed">
                        {project.description || project.stats?.firstEpisodePreview}
                      </p>
                    </div>
                  )}

                  {/* 统计信息 - 整行统一渐变 */}
                  {project.stats && (project.stats.episodes > 0 || project.stats.images > 0 || project.stats.videos > 0) ? (
                    <div className="flex items-center gap-2 mb-3">
                      {/* 共享渐变定义 */}
                      <IconGradientDefs className="w-0 h-0 absolute" aria-hidden="true" />
                      <AppIcon name="statsBarGradient" className="w-4 h-4 flex-shrink-0" />
                      <div className="flex items-center gap-3 text-sm font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                        {project.stats.episodes > 0 && (
                          <span className="flex items-center gap-1" title={t('statsEpisodes')}>
                            <AppIcon name="statsEpisodeGradient" className="w-3.5 h-3.5" />
                            {project.stats.episodes}
                          </span>
                        )}
                        {project.stats.images > 0 && (
                          <span className="flex items-center gap-1" title={t('statsImages')}>
                            <AppIcon name="statsImageGradient" className="w-3.5 h-3.5" />
                            {project.stats.images}
                          </span>
                        )}
                        {project.stats.videos > 0 && (
                          <span className="flex items-center gap-1" title={t('statsVideos')}>
                            <AppIcon name="statsVideoGradient" className="w-3.5 h-3.5" />
                            {project.stats.videos}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 mb-3">
                      <AppIcon name="statsBar" className="w-4 h-4 text-[var(--glass-text-tertiary)] flex-shrink-0" />
                      <span className="text-xs text-[var(--glass-text-tertiary)]">{t('noContent')}</span>
                    </div>
                  )}

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between text-[11px] text-[var(--glass-text-tertiary)]">
                    <div className="flex items-center gap-1">
                      <AppIcon name="clock" className="w-3 h-3" />
                      {formatDate(project.updatedAt)}
                    </div>
                    {project.totalCost !== undefined && project.totalCost > 0 && (
                      <span className="text-[11px] font-mono font-medium text-[var(--glass-text-secondary)]">
                        {formatProjectCost(project.totalCost)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[var(--glass-bg-muted)] rounded-xl flex items-center justify-center mx-auto mb-4">
              <AppIcon name="folderCards" className="w-8 h-8 text-[var(--glass-text-tertiary)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--glass-text-primary)] mb-2">
              {searchQuery ? t('noResults') : t('noProjects')}
            </h3>
            <p className="text-[var(--glass-text-secondary)] mb-6">
              {searchQuery ? t('noResultsDesc') : t('noProjectsDesc')}
            </p>
            {!searchQuery && (
              <button
                onClick={() => openCreateModal()}
                className="glass-btn-base glass-btn-primary px-6 py-3"
              >
                {t('newProject')}
              </button>
            )}
          </div>
        )}

        {/* 分页控件 */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="glass-btn-base glass-btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AppIcon name="chevronLeft" className="w-5 h-5" />
            </button>

            {/* 页码按钮 */}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(page => {
                // 显示第一页、最后一页、当前页及其前后两页
                return page === 1 ||
                  page === pagination.totalPages ||
                  Math.abs(page - pagination.page) <= 2
              })
              .map((page, index, array) => (
                <span key={page} className="flex items-center">
                  {/* 显示省略号 */}
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-2 text-[var(--glass-text-tertiary)]">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(page)}
                    className={`glass-btn-base px-4 py-2 ${page === pagination.page
                      ? 'glass-btn-primary'
                      : 'glass-btn-secondary'
                      }`}
                  >
                    {page}
                  </button>
                </span>
              ))}

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="glass-btn-base glass-btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AppIcon name="chevronRight" className="w-5 h-5" />
            </button>

            <span className="ml-4 text-sm text-[var(--glass-text-tertiary)]">
              {t('totalProjects', { count: pagination.total })}
            </span>
          </div>
        )}
      </main>

      {/* Create Project Modal - 简化版，只有名称和描述 */}
      {showCreateModal && (
        <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="glass-surface-modal p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-[var(--glass-text-primary)] mb-4">{t('createProject')}</h2>
            {modelNotConfigured && (
              <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                <AppIcon name="alert" className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-[12px] leading-relaxed">
                  {t('modelNotConfigured.before')}
                  <Link
                    href={{ pathname: '/profile' }}
                    className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300 mx-0.5"
                    onClick={() => setShowCreateModal(false)}
                  >
                    {t('modelNotConfigured.link')}
                  </Link>
                  {t('modelNotConfigured.after')}
                </span>
              </div>
            )}
            <form onSubmit={handleCreateProject}>
              {/* 小说文件上传区域 */}
              <div className="mb-4">
                <label className="glass-field-label block mb-2">
                  {t('novelFile')} ({t('optional')})
                </label>
                {!novelFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[var(--glass-stroke-strong)] rounded-xl cursor-pointer hover:border-[var(--glass-tone-info-fg)]/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <AppIcon name="upload" className="w-6 h-6 mb-2 text-[var(--glass-text-tertiary)]" />
                      <p className="text-sm text-[var(--glass-text-secondary)]">
                        {t('dragDropFile')} <span className="font-semibold">{t('browse')}</span>
                      </p>
                      <p className="text-xs text-[var(--glass-text-tertiary)]">{t('supportedFormats')}</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".txt,.md,.text"
                      onChange={handleNovelFileChange}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 border border-[var(--glass-stroke-strong)] rounded-xl bg-[var(--glass-bg-muted)]">
                    <div className="flex items-center gap-2">
                      <AppIcon name="fileText" className="w-5 h-5 text-[var(--glass-tone-info-fg)]" />
                      <span className="text-sm text-[var(--glass-text-primary)] truncate max-w-[200px]">{novelFileName}</span>
                      <span className="text-xs text-[var(--glass-text-tertiary)]">({Math.round(novelContent.length / 1024)}KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearNovelFile}
                      className="text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-danger-fg)] transition-colors"
                    >
                      <AppIcon name="close" className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {novelContent && (
                  <p className="mt-2 text-xs text-[var(--glass-text-tertiary)]">
                    {t('novelWillBeSplit', { chars: novelContent.length.toLocaleString() })}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="name" className="glass-field-label block mb-2">
                  {t('projectName')} *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    if (createError) {
                      setCreateError(null)
                    }
                  }}
                  className="glass-input-base w-full px-3 py-2"
                  placeholder={t('projectNamePlaceholder')}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label htmlFor="description" className="glass-field-label block mb-2">
                  {t('projectDescription')}
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value })
                    if (createError) {
                      setCreateError(null)
                    }
                  }}
                  className="glass-textarea-base w-full px-3 py-2"
                  placeholder={t('projectDescriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              {createError && (
                <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                  {createError}
                </p>
              )}

              {/* 拆解进度条 */}
              {splitProgress && (
                <div className="mb-4 p-4 rounded-xl border border-[var(--glass-stroke-strong)] bg-[var(--glass-bg-muted)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--glass-text-primary)]">{splitProgress.status}</span>
                    <span className="text-xs text-[var(--glass-text-tertiary)]">{splitProgress.current}/{splitProgress.total}</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--glass-stroke-subtle)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out"
                      style={{ width: `${splitProgress.total > 0 ? (splitProgress.current / splitProgress.total * 100) : 0}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateError(null)
                    setFormData({ name: '', description: '' })
                    setNovelFile(null)
                    setNovelContent('')
                    setNovelFileName('')
                    setSplitProgress(null)
                  }}
                  className="glass-btn-base glass-btn-secondary px-4 py-2"
                  disabled={createLoading}
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="glass-btn-base glass-btn-primary px-4 py-2 disabled:opacity-50"
                  disabled={createLoading || !formData.name.trim()}
                >
                  {createLoading ? t('creating') : (novelContent ? t('createProjectWithNovel') : t('createProject'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="glass-surface-modal p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-[var(--glass-text-primary)] mb-4">{t('editProject')}</h2>
            <form onSubmit={handleEditProject}>
              <div className="mb-4">
                <label htmlFor="edit-name" className="glass-field-label block mb-2">
                  {t('projectName')} *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, name: e.target.value })
                    if (editError) {
                      setEditError(null)
                    }
                  }}
                  className="glass-input-base w-full px-3 py-2"
                  placeholder={t('projectNamePlaceholder')}
                  maxLength={100}
                  required
                />
              </div>
              <div className="mb-6">
                <label htmlFor="edit-description" className="glass-field-label block mb-2">
                  {t('projectDescription')}
                </label>
                <textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, description: e.target.value })
                    if (editError) {
                      setEditError(null)
                    }
                  }}
                  className="glass-textarea-base w-full px-3 py-2"
                  placeholder={t('projectDescriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              {editError && (
                <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                  {editError}
                </p>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingProject(null)
                    setEditError(null)
                    setEditFormData({ name: '', description: '' })
                  }}
                  className="glass-btn-base glass-btn-secondary px-4 py-2"
                  disabled={createLoading}
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="glass-btn-base glass-btn-primary px-4 py-2 disabled:opacity-50"
                  disabled={createLoading || !editFormData.name.trim()}
                >
                  {createLoading ? t('saving') : tc('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        show={showDeleteConfirm}
        title={t('deleteProject')}
        message={t('deleteConfirm', { name: projectToDelete?.name || '' })}
        confirmText={tc('delete')}
        cancelText={tc('cancel')}
        type="danger"
        onConfirm={handleDeleteProject}
        onCancel={cancelDelete}
      />
    </div>
  )
}
