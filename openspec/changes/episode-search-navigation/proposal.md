## Why

用户在处理多章节（分段）剧本时，需要快速定位到特定章节。当前只能通过滚动浏览找到目标章节，当章节数量较多时效率较低。添加搜索框支持输入数字直接跳转，可显著提升用户操作效率。

## What Changes

- 在剧本分段面板（ScriptViewScriptPanel）顶部添加章节跳转搜索框
- 支持输入数字直接定位到对应章节（如输入 "5" 跳转到第 5 章）
- 支持回车键确认跳转
- 超出范围时给出友好提示

## Capabilities

### New Capabilities

- `episode-navigation`: 章节快速导航功能，支持通过数字输入定位到指定章节

### Modified Capabilities

- 无（新增功能，不修改现有需求）

## Impact

- **受影响文件**:
  - `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/script-view/ScriptViewScriptPanel.tsx` - 添加搜索框组件
- **UI 变更**: 在分段标题栏旁边添加输入框
- **依赖**: 无新增外部依赖，使用现有 UI 组件样式
