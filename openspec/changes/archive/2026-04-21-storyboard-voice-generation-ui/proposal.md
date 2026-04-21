## Why

当前剧本生成（ScriptViewScriptPanel）展示的内容包含场景描述、动作(action)、对话(dialogue)和旁白(voiceover)，但缺少语音生成功能入口。用户需要能够在剧本阶段直接生成和预览语音，以便：

1. **简化工作流**：无需等到分镜阶段才能生成语音
2. **统一旁白模式**：将之前的分镜设计改为旁白描述，减少冗余概念
3. **快速验证**：在剧本阶段就能听到角色音色效果

## What Changes

### 剧本内容简化
- 移除 `action` 类型的分镜设计内容
- 统一改为 `voiceover`（旁白）形式
- 剧本只保留：**场景描述**、**旁白**、**角色对话** 三种内容类型

### 新增语音生成 UI
- 在剧本内容右侧增加"语音生成"和"语音预览"按钮
- 根据当前行类型（旁白/对话）智能识别：
  - **旁白**：使用默认旁白音色
  - **对话**：使用对应角色的绑定音色
- 语音生成和预览功能的后端逻辑由用户后续调试

## Capabilities

### New Capabilities
- `script-voice-generation`: 剧本阶段语音生成功能，支持在剧本编辑界面直接生成和预览旁白/对话语音

### Modified Capabilities
- `script-generation`: 移除 action 类型内容，统一改为旁白形式

## Impact

### 前端组件
- `ScriptViewScriptPanel.tsx` - 添加语音生成/预览按钮，移除 action 类型渲染
- `ScriptViewRuntime.tsx` - 可能需要传递角色音色绑定数据

### 数据结构
- `ScreenplayContentItem` 类型保持不变，但 `action` 类型将不再使用

### API 端点
- 可能需要新增或复用语音生成 API（用户后续调试）

### 国际化
- 需要添加新的翻译键：语音生成、语音预览相关文案
