export type VoxCPMProviderKey = 'voxcpm'

export interface VoxCPMGenerateRequestOptions {
  provider: string
  modelId: string
  modelKey: string
  [key: string]: unknown
}

export interface VoxCPMProbeStep {
  name: 'health' | 'models'
  status: 'pass' | 'fail' | 'skip'
  message: string
  detail?: string
}

export interface VoxCPMProbeResult {
  success: boolean
  steps: VoxCPMProbeStep[]
}

export interface VoxCPMTTSInput {
  text: string
  voiceId?: string
  referenceAudioPath?: string
  promptAudioPath?: string
  promptText?: string
  controlInstruction?: string
  cfgValue?: number
  inferenceTimesteps?: number
  normalize?: boolean
}

export interface VoxCPMTTSResult {
  success: boolean
  audioData?: Buffer
  audioDuration?: number
  audioUrl?: string
  requestId?: string
  error?: string
  characters?: number
}

export interface VoxCPMVoiceDesignInput {
  voicePrompt: string
  previewText: string
  preferredName?: string
  language?: 'zh' | 'en'
}

export interface VoxCPMVoiceDesignResult {
  success: boolean
  voiceId?: string
  audioBase64?: string
  sampleRate?: number
  error?: string
  errorCode?: string
}
