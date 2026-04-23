/**
 * 提示词模板工具函数
 * 支持用户自定义角色、场景、道具的图片生成提示词模板
 */

// 默认角色提示词模板
export const DEFAULT_CHARACTER_PROMPT_TEMPLATE = `{description}

中国风格角色设定图，画面横向排列三个视图：正面全身、侧面全身、背面全身，三视图高度一致、比例相同。人物具有中国面部特征和气质，服饰符合中国传统文化或现代中国风格。中间灰背景（RGB 128,128,128），无其他元素。`

// 默认场景提示词模板
export const DEFAULT_LOCATION_PROMPT_TEMPLATE = `{description}

{availableSlots}

全景构图，360度环绕视角，沉浸式体验。宽广完整的场景构图，清楚展示主要结构、前景/中景/背景和空间边界。`

// 默认道具提示词模板
export const DEFAULT_PROP_PROMPT_TEMPLATE = `{description}

中国风格道具设定图，画面横向排列两个视图：前视图、后视图，双视图高度一致、比例相同。道具具有中国传统文化特色或符合中国小说场景，中间灰背景（RGB 128,128,128），主体居中完整展示。图片比例16:9横版。`

/**
 * 变量说明
 */
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

interface BuildPromptParams {
  description: string
  availableSlots?: string
}

/**
 * 构建角色提示词
 */
export function buildCharacterPrompt(
  template: string | null | undefined,
  params: BuildPromptParams,
): string {
  const tpl = template?.trim() || DEFAULT_CHARACTER_PROMPT_TEMPLATE
  return tpl.replace(/{description}/g, params.description.trim())
}

/**
 * 构建场景提示词
 */
export function buildLocationPrompt(
  template: string | null | undefined,
  params: BuildPromptParams,
): string {
  const tpl = template?.trim() || DEFAULT_LOCATION_PROMPT_TEMPLATE
  let result = tpl.replace(/{description}/g, params.description.trim())
  result = result.replace(/{availableSlots}/g, params.availableSlots?.trim() || '')
  // 清理多余的空行
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * 构建道具提示词
 */
export function buildPropPrompt(
  template: string | null | undefined,
  params: BuildPromptParams,
): string {
  const tpl = template?.trim() || DEFAULT_PROP_PROMPT_TEMPLATE
  return tpl.replace(/{description}/g, params.description.trim())
}

/**
 * 获取默认模板
 */
export function getDefaultTemplate(type: PromptTemplateType): string {
  switch (type) {
    case 'character':
      return DEFAULT_CHARACTER_PROMPT_TEMPLATE
    case 'location':
      return DEFAULT_LOCATION_PROMPT_TEMPLATE
    case 'prop':
      return DEFAULT_PROP_PROMPT_TEMPLATE
    default:
      return ''
  }
}
