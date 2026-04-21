import type { VideoClip } from '../types/editor.types'

/**
 * 配音数据接口
 */
export interface VoiceLineForBuild {
  id: string
  speaker: string
  content: string
  audioUrl: string | null
  audioDuration: number | null  // 毫秒
  matchedPanelId: string | null
}

/**
 * 分镜数据接口
 */
export interface PanelForBuild {
  id: string
  imageUrl: string | null
}

/**
 * 毫秒转帧数
 */
export function msToFrames(ms: number, fps: number): number {
  return Math.ceil(ms / 1000 * fps)
}

/**
 * 构建有声书时间轴
 *
 * @param voiceLines 配音数据数组（按顺序）
 * @param panels 分镜数据 Map（key: panelId）
 * @param fps 帧率，默认 12
 * @returns VideoClip 数组
 */
export function buildAudiobookTimeline(
  voiceLines: VoiceLineForBuild[],
  panels: Map<string, PanelForBuild>,
  fps: number = 12
): VideoClip[] {
  return voiceLines
    .filter(vl => vl.audioUrl && vl.matchedPanelId && vl.audioDuration)
    .map((vl) => {
      const panel = panels.get(vl.matchedPanelId!)

      return {
        id: `clip_${vl.id}`,
        src: panel?.imageUrl || '',
        durationInFrames: msToFrames(vl.audioDuration!, fps),
        attachment: {
          audio: {
            src: vl.audioUrl!,
            volume: 1.0,
            voiceLineId: vl.id,
          },
          subtitle: {
            text: vl.content,
            style: 'default' as const,
          },
        },
        metadata: {
          panelId: vl.matchedPanelId!,
          storyboardId: '',
          description: `${vl.speaker}: ${vl.content.slice(0, 30)}...`,
        },
      }
    })
}
