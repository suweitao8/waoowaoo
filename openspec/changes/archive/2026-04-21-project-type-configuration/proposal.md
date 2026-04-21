## Why

当前项目不支持区分"动画项目"和"有声小说"两种类型，导致有声小说项目（仅需声音+分镜画面拼合）仍然显示视频生成选项，增加了用户困惑和误操作风险。需要根据项目类型动态显示/隐藏相关功能，优化用户体验。

## What Changes

- 新增项目类型配置字段 `projectType`，支持 `animation`（动画）和 `audiobook`（有声小说）两种类型
- 有声小说项目隐藏所有视频生成相关选项（视频生成按钮、视频阶段等）
- 有声小说项目隐藏"成片"（video）阶段 Tab
- 启用"AI剪辑"阶段，为后续 AI 剪辑功能开发做准备
- 项目设置界面添加项目类型选择器

## Capabilities

### New Capabilities

- `project-type-setting`: 项目类型配置功能，支持动画/有声小说两种类型的切换和持久化

### Modified Capabilities

- `project-assets-ui`: 根据项目类型动态显示/隐藏视频生成相关 UI 元素

## Impact

- 数据库：`novel_promotion_projects` 表新增 `projectType` 字段
- API：项目配置更新接口支持 `projectType` 参数
- UI：
  - 项目设置 Modal 新增项目类型选择
  - 阶段导航根据项目类型动态渲染
  - 分镜面板隐藏视频生成按钮（有声小说项目）
  - 成片阶段完全隐藏（有声小说项目）
- 国际化：新增项目类型相关翻译键
