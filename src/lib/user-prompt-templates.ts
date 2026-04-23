/**
 * 获取用户提示词模板配置
 *
 * 注意：此 hook 应在服务端使用，或通过 API 获取
 * 在 Worker 中直接查询数据库获取用户配置
 */

import { prisma } from '@/lib/prisma'

export interface UserPromptTemplates {
  characterPromptTemplate: string | null
  locationPromptTemplate: string | null
  propPromptTemplate: string | null
}

/**
 * 从数据库获取用户的提示词模板配置
 */
export async function getUserPromptTemplates(userId: string): Promise<UserPromptTemplates> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: {
      characterPromptTemplate: true,
      locationPromptTemplate: true,
      propPromptTemplate: true,
    },
  })

  return {
    characterPromptTemplate: pref?.characterPromptTemplate || null,
    locationPromptTemplate: pref?.locationPromptTemplate || null,
    propPromptTemplate: pref?.propPromptTemplate || null,
  }
}

/**
 * 缓存用户模板配置，避免重复查询
 */
const templateCache = new Map<string, { templates: UserPromptTemplates; expireAt: number }>()
const CACHE_TTL = 60000 // 1 分钟缓存

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
