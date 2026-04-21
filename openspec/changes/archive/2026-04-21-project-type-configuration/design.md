## Context

当前项目（waoowaoo）是一个 AI 辅助的小说推文/动画制作平台，支持从故事到成片的完整工作流。现有架构假设所有项目都需要视频生成，但实际上有两种不同的创作模式：

1. **动画项目**：需要完整的视频生成流程（分镜 → 视频 → 成片）
2. **有声小说**：仅需要音频 + 分镜画面拼合，不需要视频生成

项目采用 Next.js App Router + Prisma + PostgreSQL 技术栈，阶段导航通过 `capsuleNavItems` 配置，阶段内容由 `WorkspaceStageContent` 组件根据 `currentStage` 动态渲染。

## Goals / Non-Goals

**Goals:**
- 支持项目类型配置，区分动画/有声小说
- 有声小说项目隐藏视频生成相关 UI
- 有声小说项目隐藏"成片"阶段
- 启用"AI剪辑"阶段入口

**Non-Goals:**
- AI 剪辑功能的具体实现（仅启用入口）
- 已有项目的类型迁移策略（后续处理）
- 其他项目类型的扩展（如真人视频等）

## Decisions

### 1. 项目类型存储位置

**决策**: 在 `NovelPromotionProject` 数据模型中新增 `projectType` 字段

**理由**:
- 项目类型是项目级别的配置，应存储在项目数据中
- 复用现有的 `novel_promotion_projects` 表，无需新建表
- 与现有的 `artStyle`、`videoModel` 等配置字段保持一致

**备选方案**:
- ❌ 存储在 `projects` 基表：需要修改通用项目表，影响范围大
- ❌ 用户级别设置：不同项目可能需要不同类型，需要项目级别配置

### 2. 项目类型枚举值

**决策**: 使用 `'animation' | 'audiobook'` 两种类型，默认值为 `'animation'`

**理由**:
- 语义清晰，`animation` 表示需要视频生成的动画项目
- `audiobook` 准确描述有声小说的创作模式
- 默认 `animation` 保持向后兼容

### 3. 阶段显示逻辑

**决策**: 在 `useNovelPromotionWorkspaceController` hook 中根据项目类型动态生成 `capsuleNavItems`

**理由**:
- 阶段导航逻辑集中在 controller 中，便于维护
- 通过条件过滤实现隐藏，而非条件渲染
- 与现有的阶段启用/禁用逻辑一致

**阶段配置**:
```typescript
// 有声小说项目隐藏的阶段
const hiddenStagesForAudiobook = ['videos']

// AI剪辑阶段（后续开发）
const editorStage = { id: 'editor', label: t('editor') }
```

### 4. 分镜面板视频按钮隐藏

**决策**: 在分镜面板组件中通过 props 接收 `projectType`，条件渲染视频生成按钮

**理由**:
- 组件级别的条件渲染，粒度精确
- 避免在全局状态中处理 UI 细节
- 便于后续其他 UI 元素的差异化

## Risks / Trade-offs

**风险**: 现有项目默认为动画类型，不会受影响
→ 缓解：项目创建时显式选择类型，不依赖默认值

**风险**: 项目类型切换可能导致 UI 状态不一致
→ 缓解：切换类型时刷新相关数据，清除无效状态

**权衡**: AI 剪辑阶段仅显示入口，功能待开发
→ 接受：明确标注"开发中"，避免用户困惑
