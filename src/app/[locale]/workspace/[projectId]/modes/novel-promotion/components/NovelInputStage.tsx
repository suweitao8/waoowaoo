'use client'

/**
 * 小说推文模式 - 故事输入阶段 (Story View)
 * V3.3 UI: 基于 MDXEditor 的 Markdown 编辑器
 */

import { useTranslations } from 'next-intl'
import { useState, useEffect, useCallback } from 'react'
import '@/styles/animations.css'
import StoryInputComposer from '@/components/story-input/StoryInputComposer'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'
import { DEFAULT_STYLE_PRESET_VALUE, STYLE_PRESETS } from '@/lib/style-presets'
import { PROJECT_STORY_INPUT_MIN_ROWS } from '@/lib/ui/textarea-height'

interface NovelInputStageProps {
  // 核心数据
  novelText: string
  // 当前剧集名称
  episodeName?: string
  // 回调函数
  onNovelTextChange: (value: string) => void
  onNext: () => void
  // 状态
  isSubmittingTask?: boolean
  isSwitchingStage?: boolean
  // 旁白开关
  enableNarration?: boolean
  onEnableNarrationChange?: (enabled: boolean) => void
}

export default function NovelInputStage({
  novelText,
  episodeName,
  onNovelTextChange,
  onNext,
  isSubmittingTask = false,
  isSwitchingStage = false,
  enableNarration = false,
  onEnableNarrationChange,
}: NovelInputStageProps) {
  const t = useTranslations('novelPromotion')

  const [localText, setLocalText] = useState(novelText)
  const [stylePresetValue, setStylePresetValue] = useState<string>(DEFAULT_STYLE_PRESET_VALUE)

  // 当父组件的 novelText 变化时，同步到本地 state
  useEffect(() => {
    setLocalText(novelText)
  }, [novelText])

  // 处理文本变化，直接同步到父组件
  const handleTextChange = useCallback((value: string) => {
    setLocalText(value)
    onNovelTextChange(value)
  }, [onNovelTextChange])

  const hasContent = localText.trim().length > 0

  /** 点击"开始创作"时，直接进入创作流程 */
  const handleStartClick = useCallback(() => {
    onNext()
  }, [onNext])

  const stageSwitchingState = isSwitchingStage
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'generate',
      resource: 'text',
      hasOutput: false,
    })
    : null

  return (
    <div className="w-full max-w-[1664px] mx-auto space-y-5">

      {/* 主输入区域（Markdown 编辑器） */}
      <div className="relative z-10">
        <StoryInputComposer
          value={localText}
          onValueChange={handleTextChange}
          placeholder={`请输入您的剧本或小说内容...

AI 将根据您的文本智能分析：
• 自动识别场景切换
• 提取角色对话和动作
• 生成分镜脚本

例如：
清晨，阳光透过窗帘洒进房间。小明揉着惺忪的睡眼从床上坐起，看了一眼床头的闹钟——已经八点了！他猛地跳下床，手忙脚乱地开始穿衣服...`}
          minRows={PROJECT_STORY_INPUT_MIN_ROWS}
          maxHeightViewportRatio={0.5}
          disabled={isSubmittingTask || isSwitchingStage}
          stylePresetValue={stylePresetValue}
          onStylePresetChange={setStylePresetValue}
          stylePresetOptions={STYLE_PRESETS}
          primaryAction={(
            <button
              onClick={handleStartClick}
              disabled={!hasContent || isSubmittingTask || isSwitchingStage}
              className="pin-btn-base pin-btn-primary h-10 flex-shrink-0 px-5 text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSwitchingStage ? (
                <TaskStatusInline state={stageSwitchingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
              ) : (
                <>
                  <span>{t("smartImport.manualCreate.button")}</span>
                  <AppIcon name="arrowRight" className="w-4 h-4" />
                </>
              )}
            </button>
          )}
          leftTitle={episodeName && (
            <div className="text-sm">
              <span className="text-[var(--pin-text-tertiary)]">当前剧集：</span>
              <span className="font-medium text-[var(--pin-text-primary)]">{episodeName}</span>
            </div>
          )}
        />
      </div>

      {/* 旁白开关 */}
      {onEnableNarrationChange && (
        <div className="pin-surface p-6">
          <div className="pin-surface-soft flex items-center justify-between p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)] font-semibold text-sm">VO</span>
              <div>
                <div className="font-medium text-[var(--pin-text-primary)]">{t("storyInput.narration.title")}</div>
                <div className="text-xs text-[var(--pin-text-tertiary)]">{t("storyInput.narration.description")}</div>
              </div>
            </div>
            <button
              onClick={() => onEnableNarrationChange(!enableNarration)}
              className={`relative w-14 h-8 rounded-full transition-colors ${enableNarration
                ? 'bg-[var(--pin-color-brand)]'
                : 'bg-[var(--pin-stroke-strong)]'
                }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-[var(--pin-bg-surface)] rounded-full shadow-sm transition-transform ${enableNarration ? 'translate-x-6' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
