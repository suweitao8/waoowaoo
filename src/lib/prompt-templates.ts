/**
 * 提示词模板系统
 * 每个画面风格对应一套提示词模板（角色、场景、道具）
 */

import type { ArtStyleValue } from './constants'

// ========== 默认模板（通用） ==========

export const DEFAULT_CHARACTER_TEMPLATE = `{description}

中国风格角色设定图，具有中国面部特征和气质，服饰符合中国传统文化或现代中国风格。

画面横向排列三个视图：正面全身、侧面全身、背面全身，三视图高度一致、比例相同。中间灰背景（RGB 128,128,128），无其他元素。`

export const DEFAULT_LOCATION_TEMPLATE = `{description}

{availableSlots}

全景构图，360度环绕视角，沉浸式体验。宽广完整的场景构图，清楚展示主要结构、前景/中景/背景和空间边界。`

export const DEFAULT_PROP_TEMPLATE = `{description}

中国风格道具设定图，具有中国传统文化特色或符合中国小说场景。

画面横向排列两个视图：前视图、后视图，双视图高度一致、比例相同。中间灰背景（RGB 128,128,128），主体居中完整展示。图片比例16:9横版。`

// ========== 风格特定模板 ==========

export const STYLE_CHARACTER_TEMPLATES: Record<ArtStyleValue, string> = {
  'american-comic': `{description}

日式动漫风格角色设定图，动漫风格人物设计，清晰的线条，鲜艳的色彩。

画面横向排列三个视图：正面全身、侧面全身、背面全身，三视图高度一致、比例相同。中间灰背景（RGB 128,128,128），无其他元素。`,

  'chinese-comic': `{description}

现代高质量漫画风格角色设定图，细节丰富精致，线条锐利干净，质感饱满，超清2D风格。

画面横向排列三个视图：正面全身、侧面全身、背面全身，三视图高度一致、比例相同。中间灰背景（RGB 128,128,128），无其他元素。`,

  'japanese-anime': `{description}

现代日系动漫风格角色设定图，赛璐璐上色，清晰干净的线条，视觉小说CG感。

画面横向排列三个视图：正面全身、侧面全身、背面全身，三视图高度一致、比例相同。中间灰背景（RGB 128,128,128），无其他元素。`,

  'realistic': `{description}

真实电影级画面质感角色设定图，真实电影质感，色彩饱满通透，画面干净精致。

画面横向排列三个视图：正面全身、侧面全身、背面全身，三视图高度一致、比例相同。中间灰背景（RGB 128,128,128），无其他元素。`,

  'xianxia-3d': `{description}

UE5超写实3D仙侠风格角色设定图，电影级仙侠动画质感，真人动捕级别细节，东方水墨写意美学，全局光照，体积雾，锐利对焦，8K画质。

画面横向排列三个视图：正面全身、侧面全身、背面全身，三视图高度一致、比例相同。中间灰背景（RGB 128,128,128），无其他元素。`,
}

export const STYLE_LOCATION_TEMPLATES: Record<ArtStyleValue, string> = {
  'american-comic': `{description}

{availableSlots}

日式动漫风格场景，全景构图，360度环绕视角，沉浸式体验。

宽广完整的场景构图，清楚展示主要结构、前景/中景/背景和空间边界。`,

  'chinese-comic': `{description}

{availableSlots}

现代高质量漫画风格场景，全景构图，360度环绕视角，沉浸式体验。

细节丰富精致，线条锐利干净，质感饱满，超清2D风格。`,

  'japanese-anime': `{description}

{availableSlots}

现代日系动漫风格场景，全景构图，360度环绕视角，沉浸式体验。

赛璐璐上色，视觉小说CG感。`,

  'realistic': `{description}

{availableSlots}

真实电影级场景，全景构图，360度环绕视角，沉浸式体验。

真实电影质感，色彩饱满通透，画面干净精致，真实感。`,

  'xianxia-3d': `{description}

{availableSlots}

UE5超写实3D仙侠场景，全景构图，360度环绕视角，沉浸式体验。

电影级仙侠动画质感，东方水墨写意美学，全局光照，体积雾，锐利对焦，8K画质。`,
}

export const STYLE_PROP_TEMPLATES: Record<ArtStyleValue, string> = {
  'american-comic': `{description}

日式动漫风格道具设定图，动漫风格设计，清晰线条，鲜艳色彩。

画面横向排列两个视图：前视图、后视图，双视图高度一致、比例相同。中间灰背景（RGB 128,128,128），主体居中完整展示。图片比例16:9横版。`,

  'chinese-comic': `{description}

现代高质量漫画风格道具设定图，细节丰富精致，线条锐利干净，质感饱满。

画面横向排列两个视图：前视图、后视图，双视图高度一致、比例相同。中间灰背景（RGB 128,128,128），主体居中完整展示。图片比例16:9横版。`,

  'japanese-anime': `{description}

现代日系动漫风格道具设定图，赛璐璐上色，视觉小说CG感。

画面横向排列两个视图：前视图、后视图，双视图高度一致、比例相同。中间灰背景（RGB 128,128,128），主体居中完整展示。图片比例16:9横版。`,

  'realistic': `{description}

真实电影级道具设定图，真实电影质感，色彩饱满通透，画面干净精致。

画面横向排列两个视图：前视图、后视图，双视图高度一致、比例相同。中间灰背景（RGB 128,128,128），主体居中完整展示。图片比例16:9横版。`,

  'xianxia-3d': `{description}

UE5超写实3D仙侠道具设定图，电影级仙侠质感，东方水墨写意美学，全局光照，体积雾，锐利对焦，8K画质。

画面横向排列两个视图：前视图、后视图，双视图高度一致、比例相同。中间灰背景（RGB 128,128,128），主体居中完整展示。图片比例16:9横版。`,
}

// ========== 变量说明 ==========

export const PROMPT_TEMPLATE_VARIABLES = {
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
} as const

export type PromptTemplateType = keyof typeof PROMPT_TEMPLATE_VARIABLES

// ========== 模板获取函数 ==========

/**
 * 获取角色提示词模板
 */
export function getCharacterTemplate(style: ArtStyleValue | null | undefined): string {
  if (!style || !STYLE_CHARACTER_TEMPLATES[style]) {
    return DEFAULT_CHARACTER_TEMPLATE
  }
  return STYLE_CHARACTER_TEMPLATES[style]
}

/**
 * 获取场景提示词模板
 */
export function getLocationTemplate(style: ArtStyleValue | null | undefined): string {
  if (!style || !STYLE_LOCATION_TEMPLATES[style]) {
    return DEFAULT_LOCATION_TEMPLATE
  }
  return STYLE_LOCATION_TEMPLATES[style]
}

/**
 * 获取道具提示词模板
 */
export function getPropTemplate(style: ArtStyleValue | null | undefined): string {
  if (!style || !STYLE_PROP_TEMPLATES[style]) {
    return DEFAULT_PROP_TEMPLATE
  }
  return STYLE_PROP_TEMPLATES[style]
}

// ========== 提示词构建函数 ==========

interface BuildPromptParams {
  description: string
  availableSlots?: string
}

/**
 * 构建角色提示词
 */
export function buildCharacterPrompt(
  template: string,
  params: BuildPromptParams,
): string {
  return template.replace(/{description}/g, params.description.trim())
}

/**
 * 构建场景提示词
 */
export function buildLocationPrompt(
  template: string,
  params: BuildPromptParams,
): string {
  let result = template.replace(/{description}/g, params.description.trim())
  result = result.replace(/{availableSlots}/g, params.availableSlots?.trim() || '')
  // 清理多余的空行
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * 构建道具提示词
 */
export function buildPropPrompt(
  template: string,
  params: BuildPromptParams,
): string {
  return template.replace(/{description}/g, params.description.trim())
}
