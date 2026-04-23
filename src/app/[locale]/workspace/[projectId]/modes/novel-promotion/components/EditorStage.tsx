'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useWorkspaceProvider } from '../WorkspaceProvider'
import { useEpisodeData } from '@/lib/query/hooks/useProjectData'
import { useVoiceLines } from '@/lib/query/hooks/useVoiceLines'
import { VideoEditorStage } from '@/features/video-editor'
import { apiFetch } from '@/lib/api-fetch'
import { AppIcon } from '@/components/ui/icons'
import type { VideoEditorProject } from '@/features/video-editor/types/editor.types'

/**
 * 剪辑阶段
 * 使用 Remotion 进行视频编辑
 * 从剧本配音和分镜画面构建有声书
 */
export default function EditorStage() {
  const t = useTranslations('video')
  const { projectId, episodeId } = useWorkspaceProvider()
  const { data: episode } = useEpisodeData(projectId, episodeId || null)
  const { data: voiceLinesData } = useVoiceLines(episodeId || null)
  const [project, setProject] = useState<VideoEditorProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载或创建编辑器项目
  useEffect(() => {
    const loadProject = async () => {
      if (!episodeId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // 尝试加载已保存的项目
        const res = await apiFetch(`/api/novel-promotion/${projectId}/editor?episodeId=${episodeId}`)

        if (res.ok) {
          const data = await res.json()
          if (data.project) {
            setProject(data.project)
            setLoading(false)
            return
          }
        }

        // 没有已保存的项目
        setLoading(false)
      } catch (err) {
        console.error('Failed to load editor project:', err)
        setError(t('editor.error.loadFailed'))
        setLoading(false)
      }
    }

    loadProject()
  }, [projectId, episodeId, t])

  // 构建有声书项目
  const handleBuild = async () => {
    if (!episodeId) return

    try {
      setBuilding(true)
      setError(null)

      const buildRes = await apiFetch(
        `/api/novel-promotion/${projectId}/episodes/${episodeId}/build-audiobook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fps: 12, width: 1920, height: 1080 }),
        }
      )

      if (buildRes.ok) {
        const buildData = await buildRes.json()
        if (buildData.editorProject) {
          setProject(buildData.editorProject)
        } else if (buildData.error) {
          setError(buildData.error)
        }
      } else {
        const errorData = await buildRes.json()
        setError(errorData.error || '构建失败')
      }
    } catch (err) {
      console.error('Failed to build audiobook:', err)
      setError('构建失败，请重试')
    } finally {
      setBuilding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--pin-color-brand)] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[var(--pin-text-secondary)]">{t('editor.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center pin-surface-soft p-8 rounded-xl">
          <AppIcon name="alert" className="w-12 h-12 text-[var(--pin-tone-danger-fg)] mx-auto mb-4" />
          <p className="text-[var(--pin-text-primary)] mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              handleBuild()
            }}
            className="pin-btn-base pin-btn-primary px-4 py-2"
          >
            {t('editor.retry')}
          </button>
        </div>
      </div>
    )
  }

  if (!project) {
    const hasVoiceLines = voiceLinesData?.lines && voiceLinesData.lines.length > 0
    const hasEpisode = !!episode

    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center pin-surface-soft p-8 rounded-xl max-w-md">
          <AppIcon name="video" className="w-12 h-12 text-[var(--pin-text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--pin-text-primary)] mb-2">
            有声书剪辑
          </h3>
          <p className="text-[var(--pin-text-secondary)] text-sm mb-4">
            从剧本配音和分镜画面构建视频
          </p>

          {!hasEpisode && (
            <p className="text-[var(--pin-tone-warning-fg)] text-sm mb-4">
              请先选择一个剧集
            </p>
          )}

          {hasEpisode && !hasVoiceLines && (
            <p className="text-[var(--pin-tone-warning-fg)] text-sm mb-4">
              当前剧集暂无配音数据，请先在剧本阶段生成配音
            </p>
          )}

          {hasEpisode && hasVoiceLines && (
            <button
              onClick={handleBuild}
              disabled={building}
              className="pin-btn-base pin-btn-primary px-6 py-2 disabled:opacity-50"
            >
              {building ? '构建中...' : '生成有声书'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <VideoEditorStage
      projectId={projectId}
      episodeId={episodeId!}
      initialProject={project}
    />
  )
}
