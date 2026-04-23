# 有声书剪辑功能设计文档

## 概述

为 waoowaoo 项目实现一个简化的有声书剪辑功能，将旁白/配音与分镜画面组合成视频。

## 需求总结

### 数据来源
- **配音数据**: `VoiceLine` (旁白 + 角色对话)，包含 `speaker`、`content`、`audioUrl`、`audioDuration`
- **画面数据**: `Panel` (分镜)，包含 `imageUrl`

### 核心规则
- **对应关系**: 一对一，每条配音对应一个分镜画面
- **时长驱动**: 画面显示时长由配音的 `audioDuration` 决定
- **分辨率**: 横屏 16:9 (1920×1080)
- **帧率**: 12 fps

### 输出结构
```
视频 = 画面序列 + 音频轨道 + 字幕叠加
```

---

## 技术设计

### 1. 数据模型

复用现有 `VideoEditorProject` 类型，新增构建函数：

```typescript
// src/features/video-editor/utils/audiobook-builder.ts

interface AudiobookBuildInput {
  voiceLines: VoiceLine[]  // 按顺序排列的配音
  fps: number              // 默认 12
}

interface VoiceLine {
  id: string
  speaker: string
  content: string
  audioUrl: string | null
  audioDuration: number | null  // 毫秒
  matchedPanelId: string | null
}

interface Panel {
  id: string
  imageUrl: string | null
}
```

### 2. 时间轴构建逻辑

```typescript
function buildAudiobookTimeline(
  voiceLines: VoiceLine[],
  panels: Map<string, Panel>,
  fps: number = 12
): VideoClip[] {
  return voiceLines
    .filter(vl => vl.audioUrl && vl.matchedPanelId && vl.audioDuration)
    .map((vl, index) => {
      const panel = panels.get(vl.matchedPanelId!)

      return {
        id: `clip_${vl.id}`,
        src: panel?.imageUrl || '',  // 分镜图片
        durationInFrames: msToFrames(vl.audioDuration!, fps),
        attachment: {
          audio: {
            src: vl.audioUrl!,
            volume: 1.0,
            voiceLineId: vl.id
          },
          subtitle: {
            text: vl.content,
            style: 'default' as const
          }
        },
        metadata: {
          panelId: vl.matchedPanelId!,
          storyboardId: '',
          description: `${vl.speaker}: ${vl.content.slice(0, 30)}...`
        }
      }
    })
}

// 毫秒转帧数
function msToFrames(ms: number, fps: number): number {
  return Math.ceil(ms / 1000 * fps)
}
```

### 3. Remotion 组件调整

现有 `VideoComposition` 组件需要调整以支持静态图片：

```typescript
// src/features/video-editor/remotion/VideoComposition.tsx

// 在 ClipRenderer 中添加图片渲染支持
{clip.src.match(/\.(jpg|jpeg|png|webp)$/i) ? (
  <Img src={clip.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
) : (
  <Video src={clip.src} ... />
)}
```

### 4. API 端点

新增或复用现有 API：

```
POST /api/novel-promotion/:projectId/episodes/:episodeId/build-audiobook
```

请求体：
```json
{
  "fps": 12,
  "width": 1920,
  "height": 1080
}
```

响应：
```json
{
  "success": true,
  "editorProject": {
    "id": "editor_xxx",
    "episodeId": "episode_xxx",
    "timeline": [...]
  }
}
```

### 5. 前端入口

在工作流中添加「生成有声书」按钮，触发：
1. 获取所有 VoiceLine + matchedPanel 数据
2. 调用构建 API
3. 跳转到预览页面或直接渲染

---

## 文件变更清单

### 新增文件
```
src/features/video-editor/utils/audiobook-builder.ts  # 时间轴构建逻辑
src/app/api/novel-promotion/[projectId]/episodes/[episodeId]/build-audiobook/route.ts  # API 端点
```

### 修改文件
```
src/features/video-editor/remotion/VideoComposition.tsx  # 支持静态图片渲染
src/features/video-editor/types/editor.types.ts         # (可选) 添加有声书相关类型
```

### 删除文件
```
(无删除，保留现有功能)
```

---

## 渲染流程

```
1. 用户点击「生成有声书」
2. 前端调用 /build-audiobook API
3. 后端查询 VoiceLine + Panel 数据
4. 后端调用 buildAudiobookTimeline() 生成时间轴
5. 保存到 VideoEditorProject 表
6. 返回项目数据给前端
7. 前端使用 RemotionPreview 预览
8. 用户确认后调用渲染 API
```

---

## 字幕样式

默认样式：
- 位置：底部居中，距离底部 60px
- 背景：半透明黑色 (rgba(0,0,0,0.7))
- 字体：24px 白色
- 圆角：4px

---

## 错误处理

- 配音无音频：跳过该条目
- 配音无匹配分镜：跳过该条目
- 分镜无图片：使用占位图或跳过
- 音频时长为空：使用默认时长（按文本长度估算）

---

## 后续扩展

暂不实现，但预留接口：
- 转场效果
- 背景音乐 (BGM)
- 字幕样式自定义
- 画面缩放/平移效果

---

## 验收标准

1. 能够从 VoiceLine + Panel 数据生成有效的时间轴
2. 预览中能正确显示画面序列、播放音频、显示字幕
3. 能成功渲染输出 MP4 视频
4. 视频时长与配音总时长一致
