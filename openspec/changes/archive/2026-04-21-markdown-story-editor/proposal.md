## Why

当前故事编辑器仅支持纯文本输入，缺乏专业写作功能。编辑区域狭窄，无行号显示，无法满足剧本创作的专业需求。用户需要更完善的 Markdown 编辑体验来高效撰写剧集故事。

## What Changes

- **新功能**: 将故事编辑器升级为 Markdown 编辑器，支持语法高亮和格式化
- **新功能**: 添加行号显示，方便定位和协作讨论
- **修改**: 扩宽编辑区域，提供更宽敞的创作空间
- **移除**: 删除剧集编辑提示文本（"当前正在编辑：xxx" 和 "以下制作流程仅针对本集..."）
- **改进**: 完善编辑功能（快捷键、工具栏等）

## Capabilities

### New Capabilities

- `markdown-story-editor`: 剧集故事的 Markdown 编辑器，支持语法高亮、行号显示、工具栏和快捷键

### Modified Capabilities

无现有 capability 需要修改规格。

## Impact

- **代码影响**:
  - `src/components/story-input/StoryInputComposer.tsx` - 需要重构为 Markdown 编辑器
  - `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/NovelInputStage.tsx` - 移除剧集提示文本，调整布局宽度
- **依赖**: 可能需要引入 Markdown 编辑器库（如 @uiw/react-md-editor 或类似）
- **UI 影响**: 编辑器外观和交互体验将显著改变
