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
 */
export default function EditorStage() {
  const t = useTranslations('video')
  const { projectId, episodeId } = useWorkspaceProvider()
  const { data: episode } = useEpisodeData(projectId, episodeId || null)
  const { data: voiceLinesData } = useVoiceLines(episodeId || null)
  const [project, setProject] = useState<VideoEditorProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载或创建编辑器项目
  useEffect(() => {
    const loadProject = async () => {
      if (!episodeId || !episode) {
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

        // 没有已保存的项目，尝试构建有声书项目
        if (voiceLinesData?.lines && voiceLinesData.lines.length > 0) {
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
              setLoading(false)
              return
            }
          }
        }

        // 没有配音数据，创建空项目
        setProject(null)
      } catch (err) {
        console.error('Failed to load editor project:', err)
        setError(t('editor.error.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [projectId, episodeId, episode, voiceLinesData, t])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--glass-accent-from)] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[var(--glass-text-secondary)]">{t('editor.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center glass-surface-soft p-8 rounded-xl">
          <AppIcon name="alert" className="w-12 h-12 text-[var(--glass-tone-danger-fg)] mx-auto mb-4" />
          <p className="text-[var(--glass-text-primary)] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="glass-btn-base glass-btn-primary px-4 py-2"
          >
            {t('editor.retry')}
          </button>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center glass-surface-soft p-8 rounded-xl max-w-md">
          <AppIcon name="video" className="w-12 h-12 text-[var(--glass-text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--glass-text-primary)] mb-2">
            {t('editor.empty.title')}
          </h3>
          <p className="text-[var(--glass-text-secondary)] text-sm">
            {t('editor.empty.description')}
          </p>
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
