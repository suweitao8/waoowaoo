import type { VoxCPMTTSInput, VoxCPMTTSResult } from './types'

// 默认本地服务器地址
const DEFAULT_VOXCPM_ENDPOINT = 'http://localhost:7860'
const VOXCPM_TTS_MAX_CHARS = 1000 // VoxCPM 支持较长文本

function getVoxCPMEndpoint(): string {
  return process.env.VOXCPM_ENDPOINT || DEFAULT_VOXCPM_ENDPOINT
}

interface WavFormat {
  audioFormat: number
  numChannels: number
  sampleRate: number
  byteRate: number
  blockAlign: number
  bitsPerSample: number
}

interface WavDecoded {
  format: WavFormat
  data: Buffer
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getWavDurationFromBuffer(buffer: Buffer): number {
  try {
    const decoded = decodeWavBuffer(buffer)
    if (decoded.format.byteRate <= 0) return 0
    return Math.round((decoded.data.length / decoded.format.byteRate) * 1000)
  } catch {
    return 0
  }
}

function decodeWavBuffer(buffer: Buffer): WavDecoded {
  if (buffer.length < 44) {
    throw new Error('VOXCPM_WAV_TOO_SHORT')
  }
  if (buffer.subarray(0, 4).toString('ascii') !== 'RIFF' || buffer.subarray(8, 12).toString('ascii') !== 'WAVE') {
    throw new Error('VOXCPM_WAV_INVALID_HEADER')
  }

  let fmt: WavFormat | null = null
  let pcmData: Buffer | null = null
  let offset = 12

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.subarray(offset, offset + 4).toString('ascii')
    const chunkSize = buffer.readUInt32LE(offset + 4)
    const chunkStart = offset + 8
    const chunkEnd = chunkStart + chunkSize
    if (chunkEnd > buffer.length) {
      throw new Error('VOXCPM_WAV_CHUNK_OUT_OF_RANGE')
    }

    if (chunkId === 'fmt ') {
      if (chunkSize < 16) {
        throw new Error('VOXCPM_WAV_FMT_INVALID')
      }
      fmt = {
        audioFormat: buffer.readUInt16LE(chunkStart),
        numChannels: buffer.readUInt16LE(chunkStart + 2),
        sampleRate: buffer.readUInt32LE(chunkStart + 4),
        byteRate: buffer.readUInt32LE(chunkStart + 8),
        blockAlign: buffer.readUInt16LE(chunkStart + 12),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14),
      }
    } else if (chunkId === 'data') {
      pcmData = buffer.subarray(chunkStart, chunkEnd)
    }

    offset = chunkEnd + (chunkSize % 2)
  }

  if (!fmt || !pcmData) {
    throw new Error('VOXCPM_WAV_MISSING_CHUNKS')
  }

  return {
    format: fmt,
    data: Buffer.from(pcmData),
  }
}

function buildWavBuffer(format: WavFormat, pcmData: Buffer): Buffer {
  const headerSize = 44
  const output = Buffer.allocUnsafe(headerSize + pcmData.length)
  output.write('RIFF', 0, 'ascii')
  output.writeUInt32LE(36 + pcmData.length, 4)
  output.write('WAVE', 8, 'ascii')
  output.write('fmt ', 12, 'ascii')
  output.writeUInt32LE(16, 16)
  output.writeUInt16LE(format.audioFormat, 20)
  output.writeUInt16LE(format.numChannels, 22)
  output.writeUInt32LE(format.sampleRate, 24)
  output.writeUInt32LE(format.byteRate, 28)
  output.writeUInt16LE(format.blockAlign, 32)
  output.writeUInt16LE(format.bitsPerSample, 34)
  output.write('data', 36, 'ascii')
  output.writeUInt32LE(pcmData.length, 40)
  pcmData.copy(output, 44)
  return output
}

function isWavFormatEqual(left: WavFormat, right: WavFormat): boolean {
  return left.audioFormat === right.audioFormat
    && left.numChannels === right.numChannels
    && left.sampleRate === right.sampleRate
    && left.byteRate === right.byteRate
    && left.blockAlign === right.blockAlign
    && left.bitsPerSample === right.bitsPerSample
}

function mergeWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) {
    throw new Error('VOXCPM_SEGMENTS_EMPTY')
  }
  if (buffers.length === 1) {
    return buffers[0]
  }

  const decoded = buffers.map((buffer) => decodeWavBuffer(buffer))
  const [first, ...rest] = decoded
  for (const item of rest) {
    if (!isWavFormatEqual(first.format, item.format)) {
      throw new Error('VOXCPM_SEGMENT_WAV_FORMAT_MISMATCH')
    }
  }
  const mergedData = Buffer.concat(decoded.map((item) => item.data))
  return buildWavBuffer(first.format, mergedData)
}

const SPLIT_HINT_CHARS = new Set([
  '。', '！', '？', '；', '，', '、',
  '.', '!', '?', ';', ',', ':', '：',
  '\n',
])

function splitTextByLimit(text: string, maxChars: number): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const chars = Array.from(trimmed)
  if (chars.length <= maxChars) return [trimmed]

  const segments: string[] = []
  let cursor = 0
  while (cursor < chars.length) {
    const hardEnd = Math.min(cursor + maxChars, chars.length)
    if (hardEnd === chars.length) {
      const segment = chars.slice(cursor, hardEnd).join('').trim()
      if (segment) segments.push(segment)
      break
    }

    let splitPoint = hardEnd
    for (let index = hardEnd - 1; index > cursor; index -= 1) {
      if (SPLIT_HINT_CHARS.has(chars[index])) {
        splitPoint = index + 1
        break
      }
    }

    const segment = chars.slice(cursor, splitPoint).join('').trim()
    if (!segment) {
      throw new Error('VOXCPM_SPLIT_FAILED')
    }
    segments.push(segment)
    cursor = splitPoint
    while (cursor < chars.length && /\s/.test(chars[cursor])) {
      cursor += 1
    }
  }

  return segments
}

interface VoxCPMTTSResponse {
  audio?: string // base64 encoded audio
  error?: string
}

interface VoxCPMAPIErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

async function synthesizeSegment(params: {
  text: string
  voiceId: string
  referenceAudioPath?: string
  promptAudioPath?: string
  promptText?: string
  controlInstruction?: string
  cfgValue: number
  inferenceTimesteps: number
  normalize: boolean
}): Promise<{ audioBuffer: Buffer; characters: number }> {
  const endpoint = getVoxCPMEndpoint()

  // 构建请求体 - OpenAI 兼容格式
  const requestBody: Record<string, unknown> = {
    model: 'voxcpm-2',
    input: params.text,
    voice: params.voiceId,
    response_format: 'wav',
  }

  // 添加控制指令（Voice Design 或风格控制）
  if (params.controlInstruction) {
    // 在文本前添加控制指令
    requestBody.input = `(${params.controlInstruction})${params.text}`
  }

  // 添加参考音频路径（如果服务器支持本地文件路径）
  if (params.referenceAudioPath) {
    requestBody.reference_audio = params.referenceAudioPath
  }

  // Hi-Fi 克隆模式
  if (params.promptAudioPath && params.promptText) {
    requestBody.prompt_audio = params.promptAudioPath
    requestBody.prompt_text = params.promptText
  }

  // 生成参数
  const extraParams: Record<string, unknown> = {
    cfg_value: params.cfgValue,
    inference_timesteps: params.inferenceTimesteps,
  }
  if (params.normalize) {
    extraParams.normalize = true
  }
  requestBody.extra = extraParams

  const response = await fetch(`${endpoint}/v1/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(120_000), // 2分钟超时
  })

  // 检查响应类型
  const contentType = response.headers.get('content-type') || ''

  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const errorData = await response.json() as VoxCPMAPIErrorResponse
      throw new Error(`VOXCPM_TTS_FAILED(${response.status}): ${errorData.error?.message || 'unknown error'}`)
    }
    const errorText = await response.text().catch(() => '')
    throw new Error(`VOXCPM_TTS_FAILED(${response.status}): ${errorText.slice(0, 200)}`)
  }

  // 处理音频响应
  let audioBuffer: Buffer

  if (contentType.includes('application/json')) {
    // JSON 响应（包含 base64 编码的音频）
    const data = await response.json() as VoxCPMTTSResponse
    if (data.error) {
      throw new Error(`VOXCPM_TTS_ERROR: ${data.error}`)
    }
    if (!data.audio) {
      throw new Error('VOXCPM_TTS_AUDIO_MISSING')
    }
    audioBuffer = Buffer.from(data.audio, 'base64')
  } else {
    // 直接返回音频二进制
    const arrayBuffer = await response.arrayBuffer()
    audioBuffer = Buffer.from(arrayBuffer)
  }

  return {
    audioBuffer,
    characters: params.text.length,
  }
}

export async function synthesizeWithVoxCPM(
  input: VoxCPMTTSInput,
): Promise<VoxCPMTTSResult> {
  const text = readTrimmedString(input.text)
  const voiceId = readTrimmedString(input.voiceId) || 'default'
  const cfgValue = typeof input.cfgValue === 'number' ? input.cfgValue : 2.0
  const inferenceTimesteps = typeof input.inferenceTimesteps === 'number' ? input.inferenceTimesteps : 10
  const normalize = input.normalize ?? false

  if (!text) {
    return { success: false, error: 'VOXCPM_TTS_TEXT_REQUIRED' }
  }

  const segments = splitTextByLimit(text, VOXCPM_TTS_MAX_CHARS)
  if (segments.length === 0) {
    return { success: false, error: 'VOXCPM_TTS_TEXT_REQUIRED' }
  }

  try {
    const buffers: Buffer[] = []
    let totalCharacters = 0

    for (const segment of segments) {
      const result = await synthesizeSegment({
        text: segment,
        voiceId,
        referenceAudioPath: input.referenceAudioPath,
        promptAudioPath: input.promptAudioPath,
        promptText: input.promptText,
        controlInstruction: input.controlInstruction,
        cfgValue,
        inferenceTimesteps,
        normalize,
      })
      buffers.push(result.audioBuffer)
      totalCharacters += result.characters
    }

    const mergedAudio = mergeWavBuffers(buffers)
    return {
      success: true,
      audioData: mergedAudio,
      audioDuration: getWavDurationFromBuffer(mergedAudio),
      characters: totalCharacters,
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'VOXCPM_TTS_UNKNOWN_ERROR',
    }
  }
}

export const VOXCPM_TTS_MODEL_ID = 'voxcpm-2'
export const VOXCPM_SAMPLE_RATE = 48000
