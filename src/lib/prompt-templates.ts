/**
 * 提示词模板系统
 * 风格提示词与模板类型提示词分离架构
 */

import type { ArtStyleValue } from './constants'

// ========== 模板类型 ==========

export type TemplateType = 'character' | 'location' | 'prop'

// ========== 风格提示词（描述视觉风格，所有模板类型共用） ==========

/**
 * 默认风格提示词
 * 每个风格只有一条提示词，描述该风格的视觉效果
 */
export const DEFAULT_STYLE_PROMPTS: Record<ArtStyleValue, string> = {
  'realistic': '真实电影级画面质感，色彩饱满通透，画面干净精致。',
  'xianxia-3d': 'UE5引擎渲染，写实3D建模，真人级别面部细节，精致皮肤质感，真实毛发渲染。仙侠风格质感细腻，布料物理模拟自然。整体画面沉稳大气，东方仙侠美学氛围。全局光照，体积光，环境光遮蔽，锐利对焦，8K画质。',
}

// ========== 模板类型提示词（描述构图格式，所有风格共用） ==========

/**
 * 默认模板类型提示词
 * 每种模板类型只有一条提示词，描述构图格式和变量占位
 */
export const DEFAULT_TEMPLATE_TYPE_PROMPTS: Record<TemplateType, string> = {
  character: `{description}

中国风格角色设定图，具有中国面部特征和气质，服饰符合中国传统文化或现代中国风格。

画面横向排列三个视图：正面全身、侧面全身、背面全身，三视图高度一致、比例相同。中间灰背景（RGB 128,128,128），无其他元素。`,

  location: `{description}

{availableSlots}

全景构图，360度环绕视角，沉浸式体验。宽广完整的场景构图，清楚展示主要结构、前景/中景/背景和空间边界。`,

  prop: `{description}

中国风格道具设定图，具有中国传统文化特色或符合中国小说场景。

画面横向排列两个视图：前视图、后视图，双视图高度一致、比例相同。中间灰背景（RGB 128,128,128），主体居中完整展示。`,
}

// ========== 变量说明 ==========

export const TEMPLATE_TYPE_VARIABLES: Record<TemplateType, Array<{ name: string; description: string }>> = {
  character: [
    { name: '{description}', description: '角色描述，用户输入的角色外观、服饰等信息' },
  ],
  location: [
    { name: '{description}', description: '场景描述，用户输入的场景环境信息' },
    { name: '{availableSlots}', description: '可站位置，系统自动生成的角色站位信息' },
  ],
  prop: [
    { name: '{description}', description: '道具描述，用户输入的道具外观、材质等信息' },
  ],
}

// 风格提示词无变量
export const STYLE_PROMPT_VARIABLES: Array<{ name: string; description: string }> = []

// ========== 获取函数 ==========

/**
 * 获取风格提示词
 */
export function getStylePrompt(style: ArtStyleValue | null | undefined): string {
  if (!style || !DEFAULT_STYLE_PROMPTS[style]) {
    // 返回第一个风格的提示词作为默认
    return DEFAULT_STYLE_PROMPTS['xianxia-3d']
  }
  return DEFAULT_STYLE_PROMPTS[style]
}

/**
 * 获取模板类型提示词
 */
export function getTemplateTypePrompt(type: TemplateType): string {
  return DEFAULT_TEMPLATE_TYPE_PROMPTS[type]
}

// ========== 构建函数 ==========

interface BuildPromptParams {
  description: string
  availableSlots?: string
}

/**
 * 构建最终提示词
 * 最终提示词 = 模板类型提示词 + 风格提示词
 */
export function buildPrompt(
  type: TemplateType,
  style: ArtStyleValue | null | undefined,
  params: BuildPromptParams,
): string {
  // 1. 获取模板类型提示词
  const templatePrompt = getTemplateTypePrompt(type)

  // 2. 获取风格提示词
  const stylePrompt = getStylePrompt(style)

  // 3. 替换变量
  let result = templatePrompt
  result = result.replace(/{description}/g, params.description.trim())
  result = result.replace(/{availableSlots}/g, params.availableSlots?.trim() || '')

  // 4. 拼接风格提示词
  result = result + '\n\n' + stylePrompt

  // 5. 清理多余空行
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * 构建角色提示词
 */
export function buildCharacterPromptFromParts(
  style: ArtStyleValue | null | undefined,
  params: BuildPromptParams,
): string {
  return buildPrompt('character', style, params)
}

/**
 * 构建场景提示词
 */
export function buildLocationPromptFromParts(
  style: ArtStyleValue | null | undefined,
  params: BuildPromptParams,
): string {
  return buildPrompt('location', style, params)
}

/**
 * 构建道具提示词
 */
export function buildPropPromptFromParts(
  style: ArtStyleValue | null | undefined,
  params: BuildPromptParams,
): string {
  return buildPrompt('prop', style, params)
}

// ========== 兼容层（废弃，保持向后兼容） ==========

/** @deprecated 使用 buildCharacterPromptFromParts(style, params) 替代 */
export const DEFAULT_CHARACTER_TEMPLATE = DEFAULT_TEMPLATE_TYPE_PROMPTS.character
/** @deprecated 使用 buildLocationPromptFromParts(style, params) 替代 */
export const DEFAULT_LOCATION_TEMPLATE = DEFAULT_TEMPLATE_TYPE_PROMPTS.location
/** @deprecated 使用 buildPropPromptFromParts(style, params) 替代 */
export const DEFAULT_PROP_TEMPLATE = DEFAULT_TEMPLATE_TYPE_PROMPTS.prop

/** @deprecated 使用 getStylePrompt 和 getTemplateTypePrompt 替代 */
export const STYLE_CHARACTER_TEMPLATES: Record<ArtStyleValue, string> = {
  'realistic': DEFAULT_TEMPLATE_TYPE_PROMPTS.character,
  'xianxia-3d': DEFAULT_TEMPLATE_TYPE_PROMPTS.character,
}

/** @deprecated 使用 getStylePrompt 和 getTemplateTypePrompt 替代 */
export const STYLE_LOCATION_TEMPLATES: Record<ArtStyleValue, string> = {
  'realistic': DEFAULT_TEMPLATE_TYPE_PROMPTS.location,
  'xianxia-3d': DEFAULT_TEMPLATE_TYPE_PROMPTS.location,
}

/** @deprecated 使用 getStylePrompt 和 getTemplateTypePrompt 替代 */
export const STYLE_PROP_TEMPLATES: Record<ArtStyleValue, string> = {
  'realistic': DEFAULT_TEMPLATE_TYPE_PROMPTS.prop,
  'xianxia-3d': DEFAULT_TEMPLATE_TYPE_PROMPTS.prop,
}

/** @deprecated 使用 TEMPLATE_TYPE_VARIABLES 替代 */
export const PROMPT_TEMPLATE_VARIABLES = TEMPLATE_TYPE_VARIABLES

/** @deprecated 使用 TemplateType 替代 */
export type PromptTemplateType = TemplateType

/** @deprecated 使用 buildCharacterPromptFromParts 替代 */
export function getCharacterTemplate(style: ArtStyleValue | null | undefined): string {
  return getTemplateTypePrompt('character')
}

/** @deprecated 使用 buildLocationPromptFromParts 替代 */
export function getLocationTemplate(style: ArtStyleValue | null | undefined): string {
  return getTemplateTypePrompt('location')
}

/** @deprecated 使用 buildPropPromptFromParts 替代 */
export function getPropTemplate(style: ArtStyleValue | null | undefined): string {
  return getTemplateTypePrompt('prop')
}

/** @deprecated 使用新的 buildCharacterPromptFromParts 替代 */
export function buildCharacterPrompt(
  template: string,
  params: BuildPromptParams,
): string {
  return template.replace(/{description}/g, params.description.trim())
}

/** @deprecated 使用新的 buildLocationPromptFromParts 替代 */
export function buildLocationPrompt(
  template: string,
  params: BuildPromptParams,
): string {
  let result = template.replace(/{description}/g, params.description.trim())
  result = result.replace(/{availableSlots}/g, params.availableSlots?.trim() || '')
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

/** @deprecated 使用新的 buildPropPromptFromParts 替代 */
export function buildPropPrompt(
  template: string,
  params: BuildPromptParams,
): string {
  return template.replace(/{description}/g, params.description.trim())
}
