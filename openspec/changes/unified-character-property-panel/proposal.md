## Why

当前系统存在角色属性编辑界面不统一的问题：AI 选角完成后用户在 `CharacterProfileCard` 和 `CharacterProfileDialog` 中编辑档案信息（性别、年龄、时代、阶层等），但在角色形象生成后，这些属性变得不可编辑，用户只能在 `CharacterEditModal` 的"基本属性"区域编辑部分属性（性别、年龄、身份、身高、体型、性格）。这种分裂的用户体验导致：
1. 生成前后使用不同的界面，用户认知负担高
2. 生成后无法编辑 AI 选角时的关键属性（时代、阶层、服装华丽度等）
3. 用户无法查看完整的 AI 文生图提示词和音色提示词

## What Changes

- **统一界面**: 合并 `CharacterProfileDialog` 和 `CharacterEditModal` 的属性编辑功能，创建一个统一的角色属性编辑面板
- **全周期编辑**: 支持生成前和生成后都能编辑所有属性（性别、年龄、时代、阶层、身份、身高、体型、性格、服装华丽度、建议色彩、视觉关键词等）
- **提示词展示**: 根据当前属性信息自动生成并展示文生图 AI 提示词和音色 AI 提示词
- **一键生成**: 用户确认属性后可直接点击生成，同时生成角色形象和音色文件

## Capabilities

### New Capabilities
- `unified-character-editor`: 统一角色属性编辑面板，支持生成前后全属性编辑、AI 提示词展示、一键生成形象和音色

### Modified Capabilities
- `project-assets-ui`: 扩展资产编辑界面，整合新的统一编辑组件
