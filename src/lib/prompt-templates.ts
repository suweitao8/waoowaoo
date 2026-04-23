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
  'realistic': `{description}

真实电影级画面质感角色设定图，真实电影质感，色彩饱满通透，画面干净精致。

画面横向排列三个视图：正面全身、侧面全身、背面全身，三视图高度一致、比例相同。中间灰背景（RGB 128,128,128），无其他元素。`,

  'xianxia-3d': `{description}

凡人修仙传动画风格角色设定图，UE5引擎渲染，写实3D人物建模，真人级别面部细节，精致皮肤质感，真实毛发渲染。仙侠服饰质感细腻，布料物理模拟自然。整体画面沉稳大气，东方仙侠美学氛围。

画面横向排列三个视图：正面全身、侧面全身、背面全身，三视图高度一致、比例相同。全局光照，体积光，环境光遮蔽，锐利对焦，8K画质。中间灰背景（RGB 128,128,128），无其他元素。`,
}

export const STYLE_LOCATION_TEMPLATES: Record<ArtStyleValue, string> = {
  'realistic': `{description}

{availableSlots}

真实电影级场景，真实电影质感，色彩饱满通透，画面干净精致。

全景构图，360度环绕视角，沉浸式体验。宽广完整的场景构图，清楚展示主要结构、前景/中景/背景和空间边界。`,

  'xianxia-3d': `{description}

{availableSlots}

凡人修仙传动画风格场景，UE5引擎渲染，写实3D场景建模。仙侠世界氛围，山川云海，亭台楼阁。光影层次丰富，大气透视效果自然。整体画面沉稳厚重，东方仙侠美学意境。

全景构图，360度环绕视角，沉浸式体验。全局光照，体积光，环境光遮蔽，锐利对焦，8K画质。宽广完整的场景构图，清楚展示主要结构、前景/中景/背景和空间边界。`,
}

export const STYLE_PROP_TEMPLATES: Record<ArtStyleValue, string> = {
  'realistic': `{description}

真实电影级道具设定图，真实电影质感，色彩饱满通透，画面干净精致。

画面横向排列两个视图：前视图、后视图，双视图高度一致、比例相同。中间灰背景（RGB 128,128,128），主体居中完整展示。图片比例16:9横版。`,

  'xianxia-3d': `{description}

凡人修仙传动画风格道具设定图，UE5引擎渲染，写实3D道具建模。材质纹理精致，金属光泽、布料质感、玉石温润皆真实呈现。仙侠法宝韵味，东方器物美学。

画面横向排列两个视图：前视图、后视图，双视图高度一致、比例相同。全局光照，体积光，环境光遮蔽，锐利对焦，8K画质。中间灰背景（RGB 128,128,128），主体居中完整展示。图片比例16:9横版。`,
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
