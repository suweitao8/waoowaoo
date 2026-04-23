/**
 * 用户自定义提示词模板
 * 用户可以覆盖默认的风格模板
 */

import { prisma } from '@/lib/prisma'
import type { ArtStyleValue } from './constants'
import {
  getCharacterTemplate,
  getLocationTemplate,
  getPropTemplate,
  DEFAULT_CHARACTER_TEMPLATE,
  DEFAULT_LOCATION_TEMPLATE,
  DEFAULT_PROP_TEMPLATE,
} from './prompt-templates'

// 用户自定义模板结构
export interface UserPromptTemplates {
  // 按风格存储的自定义模板
  [style: string]: {
    characterTemplate?: string
    locationTemplate?: string
    propTemplate?: string
  }
}

/**
 * 从数据库获取用户的自定义模板配置
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

// 缓存
const templateCache = new Map<string, { templates: UserPromptTemplates; expireAt: number }>()
const CACHE_TTL = 60000 // 1 分钟

export async function getUserPromptTemplatesCached(userId: string): Promise<UserPromptTemplates> {
  const cached = templateCache.get(userId)
  if (cached && cached.expireAt > Date.now()) {
    return cached.templates
  }

  const templates = await getUserPromptTemplates(userId)
  templateCache.set(userId, {
    templates,
    expireAt: Date.now() + CACHE_TTL,
  })

  return templates
}

/**
 * 获取用户实际使用的模板（用户自定义优先，否则用默认）
 */
export function resolveCharacterTemplate(
  userTemplates: UserPromptTemplates,
  style: ArtStyleValue | null | undefined,
): string {
  // 1. 检查用户是否有该风格的自定义模板
  if (style && userTemplates[style]?.characterTemplate) {
    return userTemplates[style].characterTemplate!
  }
  // 2. 检查用户是否有默认模板
  if (userTemplates['default']?.characterTemplate) {
    return userTemplates['default'].characterTemplate!
  }
  // 3. 使用系统默认
  return getCharacterTemplate(style)
}

export function resolveLocationTemplate(
  userTemplates: UserPromptTemplates,
  style: ArtStyleValue | null | undefined,
): string {
  if (style && userTemplates[style]?.locationTemplate) {
    return userTemplates[style].locationTemplate!
  }
  if (userTemplates['default']?.locationTemplate) {
    return userTemplates['default'].locationTemplate!
  }
  return getLocationTemplate(style)
}

export function resolvePropTemplate(
  userTemplates: UserPromptTemplates,
  style: ArtStyleValue | null | undefined,
): string {
  if (style && userTemplates[style]?.propTemplate) {
    return userTemplates[style].propTemplate!
  }
  if (userTemplates['default']?.propTemplate) {
    return userTemplates['default'].propTemplate!
  }
  return getPropTemplate(style)
}

/**
 * 获取默认模板（用于编辑器初始值）
 */
export function getDefaultTemplates(style: ArtStyleValue | null | undefined) {
  return {
    characterTemplate: getCharacterTemplate(style),
    locationTemplate: getLocationTemplate(style),
    propTemplate: getPropTemplate(style),
  }
}
