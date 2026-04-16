'use client'

import { useWorkspaceStageRuntime } from '../WorkspaceStageRuntimeContext'
import { useWorkspaceEpisodeStageData } from '../hooks/useWorkspaceEpisodeStageData'
import NovelInputStage from './NovelInputStage'

/**
 * 配置阶段 — 小说输入阶段
 *
 * 用户直接点击"开始创作"即可进入创作流程。
 */
export default function ConfigStage() {
  const runtime = useWorkspaceStageRuntime()
  const { episodeName, novelText } = useWorkspaceEpisodeStageData()

  return (
    <NovelInputStage
      novelText={novelText}
      episodeName={episodeName}
      onNovelTextChange={runtime.onNovelTextChange}
      isSubmittingTask={runtime.isSubmittingTTS || runtime.isStartingStoryToScript}
      isSwitchingStage={runtime.isTransitioning}
      videoRatio={runtime.videoRatio ?? undefined}
      artStyle={runtime.artStyle ?? undefined}
      onVideoRatioChange={runtime.onVideoRatioChange}
      onArtStyleChange={runtime.onArtStyleChange}
      onNext={runtime.onRunStoryToScript}
    />
  )
}
