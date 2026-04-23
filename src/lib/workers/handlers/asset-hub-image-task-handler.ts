import { type Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { CHARACTER_ASSET_IMAGE_RATIO, LOCATION_IMAGE_RATIO, PROP_IMAGE_RATIO, getArtStylePrompt } from '@/lib/constants'
import { type TaskJobData } from '@/lib/task/types'
import { encodeImageUrls } from '@/lib/contracts/image-urls-contract'
import { normalizeImageGenerationCount } from '@/lib/image-generation/count'
import { PRIMARY_APPEARANCE_INDEX } from '@/lib/constants'
import {
  assertTaskActive,
  getUserModels,
} from '../utils'
import {
  AnyObj,
  generateCleanImageToStorage,
  parseJsonStringArray,
} from './image-task-handler-shared'
import { getUserPromptTemplatesCached } from '@/lib/user-prompt-templates'
import { buildCharacterPrompt, buildLocationPrompt, buildPropPrompt } from '@/lib/prompt-templates'
import { formatLocationAvailableSlotsText, parseLocationAvailableSlots } from '@/lib/location-available-slots'

interface GlobalCharacterAppearanceRecord {
  id: string
  appearanceIndex: number
  changeReason: string | null
  description: string | null
  descriptions: string | null
}

interface GlobalCharacterRecord {
  id: string
  name: string
  appearances: GlobalCharacterAppearanceRecord[]
}

interface GlobalLocationImageRecord {
  id: string
  description: string | null
  availableSlots?: string | null
}

interface GlobalLocationRecord {
  id: string
  name: string
  images: GlobalLocationImageRecord[]
}

interface AssetHubImageDb {
  globalCharacter: {
    findFirst(args: Record<string, unknown>): Promise<GlobalCharacterRecord | null>
  }
  globalCharacterAppearance: {
    update(args: Record<string, unknown>): Promise<unknown>
  }
  globalLocation: {
    findFirst(args: Record<string, unknown>): Promise<GlobalLocationRecord | null>
  }
  globalLocationImage: {
    update(args: Record<string, unknown>): Promise<unknown>
  }
}

export async function handleAssetHubImageTask(job: Job<TaskJobData>) {
  const db = prisma as unknown as AssetHubImageDb
  const payload = (job.data.payload || {}) as AnyObj
  const userId = job.data.userId
  const userModels = await getUserModels(userId)

  // 获取用户提示词模板配置
  const userTemplates = await getUserPromptTemplatesCached(userId)
  const locale = job.data.locale === 'en' ? 'en' : 'zh'

  // 调试日志
  console.log('[asset-hub-image] userModels:', JSON.stringify({
    characterModel: userModels.characterModel,
    locationModel: userModels.locationModel,
    storyboardModel: userModels.storyboardModel,
    editModel: userModels.editModel,
  }))

  const artStyle = getArtStylePrompt(
    typeof payload.artStyle === 'string' ? payload.artStyle : undefined,
    job.data.locale,
  )

  if (payload.type === 'character') {
    const characterId = typeof payload.id === 'string' ? payload.id : null
    if (!characterId) throw new Error('Global character id missing')

    const character = await db.globalCharacter.findFirst({
      where: { id: characterId, userId },
      include: { appearances: { orderBy: { appearanceIndex: 'asc' } } },
    })

    if (!character) throw new Error('Global character not found')

    const appearanceIndex = Number(payload.appearanceIndex ?? PRIMARY_APPEARANCE_INDEX)
    const appearance = character.appearances.find((appearanceItem) => appearanceItem.appearanceIndex === appearanceIndex)
    if (!appearance) throw new Error('Global character appearance not found')

    const modelId = userModels.characterModel
    if (!modelId) throw new Error('User character model not configured')

    const descriptions = parseJsonStringArray(appearance.descriptions)
    const base = descriptions.length ? descriptions : [appearance.description || '']
    const count = normalizeImageGenerationCount('character', payload.count)
    const imageUrls: string[] = []

    for (let i = 0; i < count; i++) {
      const raw = base[i] || base[0]
      // 使用用户配置的模板生成提示词
      const promptCore = buildCharacterPrompt(userTemplates.characterPromptTemplate, {
        description: raw,
      })
      const prompt = artStyle ? `${promptCore}，${artStyle}` : promptCore
      const imageKey = await generateCleanImageToStorage({
        job,
        userId,
        modelId,
        prompt,
        targetId: `${appearance.id}-${i}`,
        keyPrefix: 'global-character',
        options: {
          aspectRatio: CHARACTER_ASSET_IMAGE_RATIO,
        },
      })
      imageUrls.push(imageKey)
    }

    await assertTaskActive(job, 'persist_global_character_image')
    await db.globalCharacterAppearance.update({
      where: { id: appearance.id },
      data: {
        imageUrls: encodeImageUrls(imageUrls),
        imageUrl: imageUrls[0] || null,
        selectedIndex: null,
      },
    })

    return { type: payload.type, appearanceId: appearance.id, imageCount: imageUrls.length }
  }

  if (payload.type === 'location' || payload.type === 'prop') {
    const locationId = typeof payload.id === 'string' ? payload.id : null
    if (!locationId) throw new Error('Global location id missing')

    const location = await db.globalLocation.findFirst({
      where: { id: locationId, userId },
      include: { images: { orderBy: { imageIndex: 'asc' } } },
    })

    if (!location || !location.images?.length) throw new Error('Global location not found')

    const modelId = userModels.locationModel
    if (!modelId) throw new Error('User location model not configured')

    const count = normalizeImageGenerationCount('location', payload.count)
    const targetImages = Object.prototype.hasOwnProperty.call(payload, 'count')
      ? location.images.slice(0, count)
      : location.images

    for (const image of targetImages) {
      if (!image.description) continue

      // 使用用户配置的模板生成提示词
      let promptCore: string
      if (payload.type === 'prop') {
        promptCore = buildPropPrompt(userTemplates.propPromptTemplate, {
          description: image.description,
        })
      } else {
        const availableSlotsText = formatLocationAvailableSlotsText(
          parseLocationAvailableSlots(image.availableSlots),
          locale,
        )
        promptCore = buildLocationPrompt(userTemplates.locationPromptTemplate, {
          description: image.description,
          availableSlots: availableSlotsText,
        })
      }

      const prompt = artStyle ? `${promptCore}，${artStyle}` : promptCore
      const aspectRatio = payload.type === 'prop' ? PROP_IMAGE_RATIO : LOCATION_IMAGE_RATIO

      // 调试日志：查看实际传递的提示词
      console.log(`[asset-hub-image] type: ${payload.type}, promptCore: ${promptCore.substring(0, 100)}...`)
      console.log(`[asset-hub-image] final prompt: ${prompt.substring(0, 200)}...`)
      console.log(`[asset-hub-image] aspectRatio: ${aspectRatio}`)

      const imageKey = await generateCleanImageToStorage({
        job,
        userId,
        modelId,
        prompt,
        targetId: image.id,
        keyPrefix: 'global-location',
        options: {
          aspectRatio,
        },
      })

      await assertTaskActive(job, 'persist_global_location_image')
      await db.globalLocationImage.update({
        where: { id: image.id },
        data: { imageUrl: imageKey },
      })
    }

    return { type: payload.type, locationId: location.id, imageCount: targetImages.length }
  }

  throw new Error(`Unsupported asset-hub image type: ${String(payload.type)}`)
}
