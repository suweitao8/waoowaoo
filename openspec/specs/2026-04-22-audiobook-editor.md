# 有声书剪辑功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现有声书剪辑功能，将配音与分镜画面组合成视频

**Architecture:** 复用现有 Remotion 视频编辑器基础设施，新增时间轴构建逻辑和 API 端点，调整 Remotion 组件支持静态图片渲染

**Tech Stack:** Next.js, Remotion, Prisma, TypeScript

---

## 文件结构

```
新增文件:
├── src/features/video-editor/utils/audiobook-builder.ts     # 时间轴构建核心逻辑
├── src/app/api/novel-promotion/[projectId]/episodes/[episodeId]/build-audiobook/route.ts  # API 端点

修改文件:
├── src/features/video-editor/remotion/VideoComposition.tsx  # 支持静态图片渲染
```

---

### Task 1: 时间轴构建工具函数

**Files:**
- Create: `src/features/video-editor/utils/audiobook-builder.ts`
- Test: `tests/unit/features/audiobook-builder.test.ts`

- [ ] **Step 1: 创建测试文件并编写失败测试**

```typescript
// tests/unit/features/audiobook-builder.test.ts
import { describe, it, expect } from 'vitest'
import { buildAudiobookTimeline, msToFrames } from '@/features/video-editor/utils/audiobook-builder'
import type { VideoClip } from '@/features/video-editor/types/editor.types'

describe('audiobook-builder', () => {
  describe('msToFrames', () => {
    it('should convert milliseconds to frames correctly', () => {
      // 1000ms at 12fps = 12 frames
      expect(msToFrames(1000, 12)).toBe(12)
      // 500ms at 12fps = 6 frames
      expect(msToFrames(500, 12)).toBe(6)
      // 2500ms at 12fps = 30 frames
      expect(msToFrames(2500, 12)).toBe(30)
    })

    it('should round up partial frames', () => {
      // 100ms at 12fps = 1.2 frames, should round up to 2
      expect(msToFrames(100, 12)).toBe(2)
    })
  })

  describe('buildAudiobookTimeline', () => {
    const mockVoiceLines = [
      {
        id: 'vl-1',
        speaker: '旁白',
        content: '这是一个测试字幕',
        audioUrl: 'https://example.com/audio1.wav',
        audioDuration: 3000, // 3秒 = 36帧
        matchedPanelId: 'panel-1',
      },
      {
        id: 'vl-2',
        speaker: '角色A',
        content: '角色说的台词',
        audioUrl: 'https://example.com/audio2.wav',
        audioDuration: 2000, // 2秒 = 24帧
        matchedPanelId: 'panel-2',
      },
    ]

    const mockPanels = new Map([
      ['panel-1', { id: 'panel-1', imageUrl: 'https://example.com/image1.png' }],
      ['panel-2', { id: 'panel-2', imageUrl: 'https://example.com/image2.png' }],
    ])

    it('should build timeline from voice lines and panels', () => {
      const result = buildAudiobookTimeline(mockVoiceLines, mockPanels, 12)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('clip_vl-1')
      expect(result[0].src).toBe('https://example.com/image1.png')
      expect(result[0].durationInFrames).toBe(36)
      expect(result[0].attachment?.audio?.src).toBe('https://example.com/audio1.wav')
      expect(result[0].attachment?.subtitle?.text).toBe('这是一个测试字幕')
    })

    it('should filter out voice lines without audio', () => {
      const voiceLinesWithoutAudio = [
        { ...mockVoiceLines[0], audioUrl: null },
        mockVoiceLines[1],
      ]

      const result = buildAudiobookTimeline(voiceLinesWithoutAudio, mockPanels, 12)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('clip_vl-2')
    })

    it('should filter out voice lines without matched panel', () => {
      const voiceLinesWithoutPanel = [
        { ...mockVoiceLines[0], matchedPanelId: null },
        mockVoiceLines[1],
      ]

      const result = buildAudiobookTimeline(voiceLinesWithoutPanel, mockPanels, 12)

      expect(result).toHaveLength(1)
    })

    it('should filter out voice lines without duration', () => {
      const voiceLinesWithoutDuration = [
        { ...mockVoiceLines[0], audioDuration: null },
        mockVoiceLines[1],
      ]

      const result = buildAudiobookTimeline(voiceLinesWithoutDuration, mockPanels, 12)

      expect(result).toHaveLength(1)
    })

    it('should handle missing panel gracefully', () => {
      const voiceLinesWithMissingPanel = [
        { ...mockVoiceLines[0], matchedPanelId: 'non-existent-panel' },
      ]

      const result = buildAudiobookTimeline(voiceLinesWithMissingPanel, mockPanels, 12)

      // 应该仍然创建 clip，但使用空图片
      expect(result).toHaveLength(1)
      expect(result[0].src).toBe('')
    })
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/unit/features/audiobook-builder.test.ts`
Expected: FAIL - 模块不存在

- [ ] **Step 3: 实现时间轴构建函数**

```typescript
// src/features/video-editor/utils/audiobook-builder.ts
import type { VideoClip } from '../types/editor.types'

/**
 * 配音数据接口
 */
export interface VoiceLineForBuild {
  id: string
  speaker: string
  content: string
  audioUrl: string | null
  audioDuration: number | null  // 毫秒
  matchedPanelId: string | null
}

/**
 * 分镜数据接口
 */
export interface PanelForBuild {
  id: string
  imageUrl: string | null
}

/**
 * 毫秒转帧数
 */
export function msToFrames(ms: number, fps: number): number {
  return Math.ceil(ms / 1000 * fps)
}

/**
 * 构建有声书时间轴
 *
 * @param voiceLines 配音数据数组（按顺序）
 * @param panels 分镜数据 Map（key: panelId）
 * @param fps 帧率，默认 12
 * @returns VideoClip 数组
 */
export function buildAudiobookTimeline(
  voiceLines: VoiceLineForBuild[],
  panels: Map<string, PanelForBuild>,
  fps: number = 12
): VideoClip[] {
  return voiceLines
    .filter(vl => vl.audioUrl && vl.matchedPanelId && vl.audioDuration)
    .map((vl) => {
      const panel = panels.get(vl.matchedPanelId!)

      return {
        id: `clip_${vl.id}`,
        src: panel?.imageUrl || '',
        durationInFrames: msToFrames(vl.audioDuration!, fps),
        attachment: {
          audio: {
            src: vl.audioUrl!,
            volume: 1.0,
            voiceLineId: vl.id,
          },
          subtitle: {
            text: vl.content,
            style: 'default' as const,
          },
        },
        metadata: {
          panelId: vl.matchedPanelId!,
          storyboardId: '',
          description: `${vl.speaker}: ${vl.content.slice(0, 30)}...`,
        },
      }
    })
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/unit/features/audiobook-builder.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/features/video-editor/utils/audiobook-builder.ts tests/unit/features/audiobook-builder.test.ts
git commit -m "feat(video-editor): add audiobook timeline builder utility

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Remotion 组件支持静态图片

**Files:**
- Modify: `src/features/video-editor/remotion/VideoComposition.tsx`

- [ ] **Step 1: 查看现有 VideoComposition 组件**

Read: `src/features/video-editor/remotion/VideoComposition.tsx`

- [ ] **Step 2: 修改 ClipRenderer 组件支持静态图片**

在 `ClipRenderer` 组件中，将原来的 `Video` 组件替换为条件渲染：

```typescript
// src/features/video-editor/remotion/VideoComposition.tsx
// 在文件顶部添加 Img 导入
import { AbsoluteFill, Sequence, Video, Audio, useCurrentFrame, interpolate, Img } from 'remotion'

// 修改 ClipRenderer 组件的渲染部分（约第 162-173 行）
const ClipRenderer: React.FC<ClipRendererProps> = ({
    clip,
    config,
    transitionType = 'none',
    transitionDuration,
    isLastClip
}) => {
    void config
    const frame = useCurrentFrame()
    const clipDuration = clip.durationInFrames

    // ... 转场效果计算代码保持不变 ...

    // 判断是否为静态图片
    const isImage = clip.src.match(/\.(jpg|jpeg|png|webp|gif)$/i)

    return (
        <AbsoluteFill style={{ opacity, transform }}>
            {/* 视频/图片 */}
            {isImage ? (
                <Img
                    src={clip.src}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
            ) : (
                <Video
                    src={clip.src}
                    startFrom={clip.trim?.from || 0}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
            )}

            {/* 附属配音 */}
            {clip.attachment?.audio && (
                <Audio
                    src={clip.attachment.audio.src}
                    volume={clip.attachment.audio.volume}
                />
            )}

            {/* 附属字幕 */}
            {clip.attachment?.subtitle && (
                <SubtitleOverlay
                    text={clip.attachment.subtitle.text}
                    style={clip.attachment.subtitle.style}
                />
            )}
        </AbsoluteFill>
    )
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/features/video-editor/remotion/VideoComposition.tsx
git commit -m "feat(remotion): support static image rendering in VideoComposition

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: API 端点 - 构建有声书项目

**Files:**
- Create: `src/app/api/novel-promotion/[projectId]/episodes/[episodeId]/build-audiobook/route.ts`
- Test: `tests/unit/api/build-audiobook.test.ts`

- [ ] **Step 1: 查看现有 API 结构参考**

Read: `src/app/api/novel-promotion/[projectId]/route.ts` (前 100 行)

- [ ] **Step 2: 创建 API 路由文件**

```typescript
// src/app/api/novel-promotion/[projectId]/episodes/[episodeId]/build-audiobook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildAudiobookTimeline, type VoiceLineForBuild, type PanelForBuild } from '@/features/video-editor/utils/audiobook-builder'
import { getSignedUrl } from '@/lib/storage'

interface RouteParams {
  params: Promise<{
    projectId: string
    episodeId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, episodeId } = await params

    // 验证项目归属
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 解析请求体
    const body = await request.json().catch(() => ({}))
    const fps = body.fps || 12
    const width = body.width || 1920
    const height = body.height || 1080

    // 查询配音数据
    const voiceLines = await prisma.novelPromotionVoiceLine.findMany({
      where: { episodeId },
      select: {
        id: true,
        speaker: true,
        content: true,
        audioUrl: true,
        audioDuration: true,
        matchedPanelId: true,
      },
      orderBy: { lineIndex: 'asc' },
    })

    if (voiceLines.length === 0) {
      return NextResponse.json({ error: 'No voice lines found' }, { status: 400 })
    }

    // 获取所有关联的 panel ID
    const panelIds = voiceLines
      .map(vl => vl.matchedPanelId)
      .filter((id): id is string => id !== null)

    // 查询分镜数据
    const panels = await prisma.novelPromotionPanel.findMany({
      where: { id: { in: panelIds } },
      select: {
        id: true,
        imageUrl: true,
        imageMediaId: true,
      },
    })

    // 构建 panel Map
    const panelMap = new Map<string, PanelForBuild>()

    for (const panel of panels) {
      let imageUrl = panel.imageUrl

      // 如果有 mediaId，获取签名 URL
      if (panel.imageMediaId && !imageUrl?.startsWith('http')) {
        try {
          imageUrl = await getSignedUrl(panel.imageUrl || '', 3600)
        } catch {
          // 忽略签名失败
        }
      }

      panelMap.set(panel.id, {
        id: panel.id,
        imageUrl,
      })
    }

    // 准备配音数据
    const voiceLinesForBuild: VoiceLineForBuild[] = voiceLines.map(vl => ({
      id: vl.id,
      speaker: vl.speaker,
      content: vl.content,
      audioUrl: vl.audioUrl,
      audioDuration: vl.audioDuration,
      matchedPanelId: vl.matchedPanelId,
    }))

    // 构建时间轴
    const timeline = buildAudiobookTimeline(voiceLinesForBuild, panelMap, fps)

    if (timeline.length === 0) {
      return NextResponse.json({ error: 'No valid clips generated' }, { status: 400 })
    }

    // 构建编辑器项目数据
    const editorProjectData = {
      id: `editor_${Date.now()}`,
      episodeId,
      schemaVersion: '1.0' as const,
      config: { fps, width, height },
      timeline,
      bgmTrack: [],
    }

    // 保存到数据库
    const existingProject = await prisma.videoEditorProject.findUnique({
      where: { episodeId },
    })

    let savedProject
    if (existingProject) {
      savedProject = await prisma.videoEditorProject.update({
        where: { episodeId },
        data: {
          projectData: JSON.stringify(editorProjectData),
          renderStatus: null,
          renderTaskId: null,
          outputUrl: null,
        },
      })
    } else {
      savedProject = await prisma.videoEditorProject.create({
        data: {
          episodeId,
          projectData: JSON.stringify(editorProjectData),
        },
      })
    }

    return NextResponse.json({
      success: true,
      editorProject: {
        ...editorProjectData,
        id: savedProject.id,
      },
    })
  } catch (error) {
    console.error('Build audiobook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/app/api/novel-promotion/[projectId]/episodes/[episodeId]/build-audiobook/route.ts
git commit -m "feat(api): add build-audiobook endpoint for audiobook timeline generation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: 导出 audiobook-builder 模块

**Files:**
- Modify: `src/features/video-editor/index.ts`

- [ ] **Step 1: 查看现有导出**

Read: `src/features/video-editor/index.ts`

- [ ] **Step 2: 添加 audiobook-builder 导出**

```typescript
// src/features/video-editor/index.ts
// 在现有导出后添加
export * from './utils/audiobook-builder'
```

- [ ] **Step 3: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/features/video-editor/index.ts
git commit -m "feat(video-editor): export audiobook-builder utilities

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## 自检清单

- [x] **Spec 覆盖**: 所有设计文档中的功能点都有对应任务
- [x] **无占位符**: 所有代码块都是完整实现
- [x] **类型一致性**: VoiceLineForBuild、PanelForBuild 类型定义一致
