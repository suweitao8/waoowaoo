import type { VoxCPMVoiceDesignInput, VoxCPMVoiceDesignResult } from './types'
import { synthesizeWithVoxCPM } from './tts'

/**
 * 创建声音设计
 * VoxCPM 通过在文本前添加控制指令来实现声音设计
 */
export async function createVoxCPMVoiceDesign(
  input: VoxCPMVoiceDesignInput,
): Promise<VoxCPMVoiceDesignResult> {
  // 验证输入
  const validation = validateVoiceDesignInput(input)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    }
  }

  // 使用控制指令生成预览音频
  const result = await synthesizeWithVoxCPM({
    text: input.previewText,
    controlInstruction: input.voicePrompt,
    cfgValue: 2.0,
    inferenceTimesteps: 10,
  })

  if (!result.success || !result.audioData) {
    return {
      success: false,
      error: result.error || '声音设计生成失败',
    }
  }

  return {
    success: true,
    voiceId: `voxcpm-design-${Date.now()}`, // 生成的声音ID
    audioBase64: result.audioData.toString('base64'),
    sampleRate: 48000, // VoxCPM 输出 48kHz
  }
}

function validateVoiceDesignInput(input: VoxCPMVoiceDesignInput): { valid: boolean; error?: string } {
  if (!input.voicePrompt || input.voicePrompt.trim().length === 0) {
    return { valid: false, error: '声音提示词不能为空' }
  }
  if (input.voicePrompt.length > 500) {
    return { valid: false, error: '声音提示词不能超过500个字符' }
  }
  if (!input.previewText || input.previewText.trim().length === 0) {
    return { valid: false, error: '预览文本不能为空' }
  }
  if (input.previewText.length < 5) {
    return { valid: false, error: '预览文本至少需要5个字符' }
  }
  if (input.previewText.length > 200) {
    return { valid: false, error: '预览文本不能超过200个字符' }
  }
  return { valid: true }
}

export function validateVoicePrompt(voicePrompt: string): { valid: boolean; error?: string } {
  if (!voicePrompt || voicePrompt.trim().length === 0) {
    return { valid: false, error: '声音提示词不能为空' }
  }
  if (voicePrompt.length > 500) {
    return { valid: false, error: '声音提示词不能超过500个字符' }
  }
  return { valid: true }
}

export function validatePreviewText(previewText: string): { valid: boolean; error?: string } {
  if (!previewText || previewText.trim().length === 0) {
    return { valid: false, error: '预览文本不能为空' }
  }
  if (previewText.length < 5) {
    return { valid: false, error: '预览文本至少需要5个字符' }
  }
  if (previewText.length > 200) {
    return { valid: false, error: '预览文本不能超过200个字符' }
  }
  return { valid: true }
}
