import { describe, it, expect } from 'vitest'
import { buildAudiobookTimeline, msToFrames } from '@/features/video-editor/utils/audiobook-builder'
import type { VideoClip } from '@/features/video-editor/types/editor.types'

describe('audiobook-builder', () => {
  describe('msToFrames', () => {
    it('should convert milliseconds to frames correctly', () => {
      // 1000ms at 12fps = 12 frames
      expect(msToFrames(1000, 12)).toBe(12)
      // 500ms at 12fps = 6 frames
      expect(msToFrames(500, 12)).toBe(6)
      // 2500ms at 12fps = 30 frames
      expect(msToFrames(2500, 12)).toBe(30)
    })

    it('should round up partial frames', () => {
      // 100ms at 12fps = 1.2 frames, should round up to 2
      expect(msToFrames(100, 12)).toBe(2)
    })
  })

  describe('buildAudiobookTimeline', () => {
    const mockVoiceLines = [
      {
        id: 'vl-1',
        speaker: '旁白',
        content: '这是一个测试字幕',
        audioUrl: 'https://example.com/audio1.wav',
        audioDuration: 3000, // 3秒 = 36帧
        matchedPanelId: 'panel-1',
      },
      {
        id: 'vl-2',
        speaker: '角色A',
        content: '角色说的台词',
        audioUrl: 'https://example.com/audio2.wav',
        audioDuration: 2000, // 2秒 = 24帧
        matchedPanelId: 'panel-2',
      },
    ]

    const mockPanels = new Map([
      ['panel-1', { id: 'panel-1', imageUrl: 'https://example.com/image1.png' }],
      ['panel-2', { id: 'panel-2', imageUrl: 'https://example.com/image2.png' }],
    ])

    it('should build timeline from voice lines and panels', () => {
      const result = buildAudiobookTimeline(mockVoiceLines, mockPanels, 12)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('clip_vl-1')
      expect(result[0].src).toBe('https://example.com/image1.png')
      expect(result[0].durationInFrames).toBe(36)
      expect(result[0].attachment?.audio?.src).toBe('https://example.com/audio1.wav')
      expect(result[0].attachment?.subtitle?.text).toBe('这是一个测试字幕')
    })

    it('should filter out voice lines without audio', () => {
      const voiceLinesWithoutAudio = [
        { ...mockVoiceLines[0], audioUrl: null },
        mockVoiceLines[1],
      ]

      const result = buildAudiobookTimeline(voiceLinesWithoutAudio, mockPanels, 12)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('clip_vl-2')
    })

    it('should filter out voice lines without matched panel', () => {
      const voiceLinesWithoutPanel = [
        { ...mockVoiceLines[0], matchedPanelId: null },
        mockVoiceLines[1],
      ]

      const result = buildAudiobookTimeline(voiceLinesWithoutPanel, mockPanels, 12)

      expect(result).toHaveLength(1)
    })

    it('should filter out voice lines without duration', () => {
      const voiceLinesWithoutDuration = [
        { ...mockVoiceLines[0], audioDuration: null },
        mockVoiceLines[1],
      ]

      const result = buildAudiobookTimeline(voiceLinesWithoutDuration, mockPanels, 12)

      expect(result).toHaveLength(1)
    })

    it('should handle missing panel gracefully', () => {
      const voiceLinesWithMissingPanel = [
        { ...mockVoiceLines[0], matchedPanelId: 'non-existent-panel' },
      ]

      const result = buildAudiobookTimeline(voiceLinesWithMissingPanel, mockPanels, 12)

      // 应该仍然创建 clip，但使用空图片
      expect(result).toHaveLength(1)
      expect(result[0].src).toBe('')
    })
  })
})
