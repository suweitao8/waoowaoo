/**
 * 用户自定义提示词模板
 * 分离架构：风格提示词 + 模板类型提示词
 */

import { prisma } from '@/lib/prisma'
import type { ArtStyleValue } from './constants'
import type { TemplateType } from './prompt-templates'
import {
  getStylePrompt,
  getTemplateTypePrompt,
} from './prompt-templates'

// ========== 新架构接口 ==========

// 用户自定义模板结构（新架构）
export interface UserPromptConfig {
  // 用户自定义的风格提示词
  stylePrompts?: Partial<Record<ArtStyleValue, string>>
  // 用户自定义的模板类型提示词
  templateTypePrompts?: Partial<Record<TemplateType, string>>
}

// ========== 兼容旧数据结构 ==========

export interface UserPromptTemplates {
  [style: string]: {
    characterTemplate?: string
    locationTemplate?: string
    propTemplate?: string
  }
}

// ========== 获取函数 ==========

/**
 * 从数据库获取用户的自定义模板配置（新架构）
 */
export async function getUserPromptConfig(userId: string): Promise<UserPromptConfig> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: {
      promptStylePresets: true,
    },
  })

  if (!pref?.promptStylePresets) {
    return {}
  }

  try {
    const parsed = JSON.parse(pref.promptStylePresets)

    // 检查是否是新结构
    if (parsed.stylePrompts || parsed.templateTypePrompts) {
      return parsed as UserPromptConfig
    }

    // 旧结构，返回空（后续迁移时处理）
    return {}
  } catch {
    return {}
  }
}

/**
 * 获取用户自定义模板（兼容旧 API）
 * @deprecated 使用 getUserPromptConfig 替代
 */
export async function getUserPromptTemplates(userId: string): Promise<UserPromptTemplates> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: {
      promptStylePresets: true,
    },
  })

  if (!pref?.promptStylePresets) {
    return {}
  }

  try {
    return JSON.parse(pref.promptStylePresets) as UserPromptTemplates
  } catch {
    return {}
  }
}

// ========== 解析函数 ==========

/**
 * 解析用户风格提示词（用户自定义优先，否则用默认）
 */
export function resolveStylePrompt(
  userConfig: UserPromptConfig,
  style: ArtStyleValue | null | undefined,
): string {
  if (!style) {
    return getStylePrompt('xianxia-3d')
  }

  // 用户自定义优先
  if (userConfig.stylePrompts?.[style]) {
    return userConfig.stylePrompts[style]
  }

  // 使用系统默认
  return getStylePrompt(style)
}

/**
 * 解析用户模板类型提示词（用户自定义优先，否则用默认）
 */
export function resolveTemplateTypePrompt(
  userConfig: UserPromptConfig,
  type: TemplateType,
): string {
  // 用户自定义优先
  if (userConfig.templateTypePrompts?.[type]) {
    return userConfig.templateTypePrompts[type]
  }

  // 使用系统默认
  return getTemplateTypePrompt(type)
}

/**
 * 构建最终提示词（使用用户自定义配置）
 */
export function buildUserPrompt(
  userConfig: UserPromptConfig,
  type: TemplateType,
  style: ArtStyleValue | null | undefined,
  params: { description: string; availableSlots?: string },
): string {
  // 1. 获取模板类型提示词
  const templatePrompt = resolveTemplateTypePrompt(userConfig, type)

  // 2. 获取风格提示词
  const stylePrompt = resolveStylePrompt(userConfig, style)

  // 3. 替换变量
  let result = templatePrompt
  result = result.replace(/{description}/g, params.description.trim())
  result = result.replace(/{availableSlots}/g, params.availableSlots?.trim() || '')

  // 4. 拼接风格提示词
  result = result + '\n\n' + stylePrompt

  // 5. 清理多余空行
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

// ========== 缓存 ==========

const templateCache = new Map<string, { config: UserPromptConfig; expireAt: number }>()
const CACHE_TTL = 60000 // 1 分钟

export async function getUserPromptConfigCached(userId: string): Promise<UserPromptConfig> {
  const cached = templateCache.get(userId)
  if (cached && cached.expireAt > Date.now()) {
    return cached.config
  }

  const config = await getUserPromptConfig(userId)
  templateCache.set(userId, {
    config,
    expireAt: Date.now() + CACHE_TTL,
  })

  return config
}

// ========== 兼容层（废弃） ==========

/**
 * @deprecated 使用 getUserPromptConfigCached 替代
 */
export async function getUserPromptTemplatesCached(userId: string): Promise<UserPromptTemplates> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: {
      promptStylePresets: true,
    },
  })

  if (!pref?.promptStylePresets) {
    return {}
  }

  try {
    return JSON.parse(pref.promptStylePresets) as UserPromptTemplates
  } catch {
    return {}
  }
}

/** @deprecated 使用 resolveStylePrompt 和 resolveTemplateTypePrompt 替代 */
export function resolveCharacterTemplate(
  userTemplates: UserPromptTemplates,
  style: ArtStyleValue | null | undefined,
): string {
  if (style && userTemplates[style]?.characterTemplate) {
    return userTemplates[style].characterTemplate!
  }
  return getTemplateTypePrompt('character')
}

/** @deprecated 使用 resolveStylePrompt 和 resolveTemplateTypePrompt 替代 */
export function resolveLocationTemplate(
  userTemplates: UserPromptTemplates,
  style: ArtStyleValue | null | undefined,
): string {
  if (style && userTemplates[style]?.locationTemplate) {
    return userTemplates[style].locationTemplate!
  }
  return getTemplateTypePrompt('location')
}

/** @deprecated 使用 resolveStylePrompt 和 resolveTemplateTypePrompt 替代 */
export function resolvePropTemplate(
  userTemplates: UserPromptTemplates,
  style: ArtStyleValue | null | undefined,
): string {
  if (style && userTemplates[style]?.propTemplate) {
    return userTemplates[style].propTemplate!
  }
  return getTemplateTypePrompt('prop')
}

/** @deprecated 使用 buildUserPrompt 替代 */
export function getDefaultTemplates(style: ArtStyleValue | null | undefined) {
  return {
    characterTemplate: getTemplateTypePrompt('character'),
    locationTemplate: getTemplateTypePrompt('location'),
    propTemplate: getTemplateTypePrompt('prop'),
  }
}
