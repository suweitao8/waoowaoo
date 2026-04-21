import {
  assertOfficialModelRegistered,
  type OfficialModelModality,
} from '@/lib/providers/official/model-registry'
import type { GenerateResult } from '@/lib/generators/base'
import { synthesizeWithVoxCPM } from './tts'
import type { VoxCPMGenerateRequestOptions } from './types'
import { ensureVoxCPMCatalogRegistered } from './catalog'

export interface VoxCPMAudioGenerateParams {
  userId: string
  text: string
  voice?: string
  referenceAudioPath?: string
  promptAudioPath?: string
  promptText?: string
  controlInstruction?: string
  cfgValue?: number
  inferenceTimesteps?: number
  normalize?: boolean
  options: VoxCPMGenerateRequestOptions
}

function assertRegistered(modelId: string): void {
  ensureVoxCPMCatalogRegistered()
  assertOfficialModelRegistered({
    provider: 'voxcpm',
    modality: 'audio' satisfies OfficialModelModality,
    modelId,
  })
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function generateVoxCPMAudio(params: VoxCPMAudioGenerateParams): Promise<GenerateResult> {
  assertRegistered(params.options.modelId)

  const text = readTrimmedString(params.text)
  if (!text) {
    throw new Error('VOXCPM_TEXT_REQUIRED')
  }

  const result = await synthesizeWithVoxCPM({
    text,
    voiceId: readTrimmedString(params.voice) || 'default',
    referenceAudioPath: params.referenceAudioPath,
    promptAudioPath: params.promptAudioPath,
    promptText: params.promptText,
    controlInstruction: params.controlInstruction,
    cfgValue: params.cfgValue,
    inferenceTimesteps: params.inferenceTimesteps,
    normalize: params.normalize,
  })

  if (!result.success || !result.audioData) {
    throw new Error(result.error || 'VOXCPM_AUDIO_SYNTHESIZE_FAILED')
  }

  // 生成 data URL
  const dataUrl = `data:audio/wav;base64,${result.audioData.toString('base64')}`

  return {
    success: true,
    audioUrl: dataUrl,
  }
}
