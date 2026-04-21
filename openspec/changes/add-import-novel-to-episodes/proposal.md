## Why

用户需要在现有项目中追加导入小说内容，将其作为后续剧集添加到项目末尾。目前用户只能在创建项目时导入小说，无法在项目运行期间导入新的小说内容，限制了用户扩展项目内容的灵活性。

## What Changes

- 在剧集选择器（EpisodeSelector）的"新建剧集"按钮旁边新增"导入小说"按钮
- 点击按钮后打开小说导入流程，复用 SmartImportWizard 组件的逻辑
- 导入的小说内容将作为新剧集追加到现有剧集列表末尾，而非替换现有剧集
- 导入完成后自动刷新剧集列表，并可选择跳转到第一个新导入的剧集

## Capabilities

### New Capabilities

- `episode-novel-import`: 在现有项目中导入小说并追加为新剧集的能力，包括：
  - 小说文件上传和解析
  - 章节智能拆分（复用现有逻辑）
  - 追加剧集到现有列表末尾
  - 导入进度显示和结果反馈

### Modified Capabilities

- `navbar-ui`: 扩展 EpisodeSelector 组件，在"新建剧集"按钮旁边添加"导入小说"按钮

## Impact

- **前端组件**:
  - `src/components/ui/CapsuleNav.tsx` - EpisodeSelector 组件添加导入按钮
  - `src/app/[locale]/workspace/[projectId]/page.tsx` - 添加导入处理逻辑
  - `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/WorkspaceHeaderShell.tsx` - 传递导入回调

- **API 端点**: 复用现有的剧集批量创建 API，无需新增

- **用户体验**: 用户可以在项目任何阶段追加新的小说内容，无需重新创建项目
