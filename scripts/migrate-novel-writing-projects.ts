import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始迁移 novel-writing 项目...')

  // 1. 查找所有 novel-writing 类型的项目
  const novelWritingProjects = await prisma.novelPromotionProject.findMany({
    where: { projectType: 'novel-writing' },
    include: {
      project: true,
      episodes: true,
      characters: true,
      locations: true,
    }
  })

  console.log(`找到 ${novelWritingProjects.length} 个 novel-writing 项目`)

  if (novelWritingProjects.length === 0) {
    console.log('没有需要迁移的数据')
    return
  }

  for (const np of novelWritingProjects) {
    console.log(`迁移项目: ${np.project.name}`)

    // 检查是否已经存在
    const existing = await prisma.novelWritingProject.findUnique({
      where: { projectId: np.projectId }
    })

    if (existing) {
      console.log(`  项目 ${np.project.name} 已存在，跳过`)
      continue
    }

    // 2. 创建 NovelWritingProject
    const novelWritingProject = await prisma.novelWritingProject.create({
      data: {
        projectId: np.projectId,
        worldContext: np.worldContext,
        writingStyle: np.writingStyle,
        extractedCharacters: np.extractedCharacters,
        analysisModel: np.analysisModel,
        imageModel: np.imageModel,
        audioModel: np.audioModel,
        videoRatio: np.videoRatio,
        artStyle: np.artStyle,
        artStylePrompt: np.artStylePrompt,
        narratorVoiceId: np.narratorVoiceId,
        narratorVoiceType: np.narratorVoiceType,
        narratorVoicePrompt: np.narratorVoicePrompt,
      }
    })

    // 3. 迁移剧集
    for (const episode of np.episodes) {
      await prisma.novelWritingEpisode.create({
        data: {
          novelWritingProjectId: novelWritingProject.id,
          episodeNumber: episode.episodeNumber,
          name: episode.name,
          description: episode.description,
          novelText: episode.novelText,
          rewriteHistory: episode.rewriteHistory,
          originalText: episode.originalText,
        }
      })
    }
    console.log(`  迁移了 ${np.episodes.length} 个剧集`)

    // 4. 更新资产关联
    const charResult = await prisma.novelPromotionCharacter.updateMany({
      where: { novelPromotionProjectId: np.id },
      data: { novelWritingProjectId: novelWritingProject.id }
    })
    console.log(`  更新了 ${charResult.count} 个角色关联`)

    const locResult = await prisma.novelPromotionLocation.updateMany({
      where: { novelPromotionProjectId: np.id },
      data: { novelWritingProjectId: novelWritingProject.id }
    })
    console.log(`  更新了 ${locResult.count} 个场景关联`)

    // 5. 删除旧的 novel-promotion 数据（保留 Project 基础信息）
    await prisma.novelPromotionEpisode.deleteMany({
      where: { novelPromotionProjectId: np.id }
    })

    await prisma.novelPromotionProject.delete({
      where: { id: np.id }
    })

    console.log(`  项目 ${np.project.name} 迁移完成`)
  }

  console.log('迁移完成!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
