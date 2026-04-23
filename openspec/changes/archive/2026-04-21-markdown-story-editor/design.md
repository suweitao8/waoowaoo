## Context

当前故事编辑器 (`StoryInputComposer.tsx`) 是一个简单的 textarea 组件，仅支持纯文本输入。用户需要一个更专业的 Markdown 编辑器来编写剧集故事。

**当前状态**:
- 组件: `StoryInputComposer.tsx` - 使用原生 `<textarea>`
- 父组件: `NovelInputStage.tsx` - 包含剧集提示文本
- 布局: `max-w-5xl` (约 1024px)

**约束**:
- 必须兼容 React 19 和 Next.js 15
- 必须支持 IME 组合输入（中文输入法）
- 必须保持现有 API 兼容性

## Goals / Non-Goals

**Goals:**
- 实现 Markdown 编辑器，支持语法高亮
- 显示行号，方便定位
- 扩宽编辑区域至 `max-w-7xl` (约 1280px)
- 提供基础工具栏（加粗、斜体、标题等）
- 移除剧集编辑提示文本

**Non-Goals:**
- 不实现实时预览（保持简洁）
- 不实现协作编辑功能
- 不实现 Markdown 扩展语法（仅支持标准 Markdown）

## Decisions

### 1. 编辑器方案选择

**决定**: 使用轻量级自定义实现，基于 textarea + 行号覆盖层

**理由**:
- 无需引入新依赖，减少包体积
- 保持对 IME 组合输入的完全控制
- 已有 textarea 自动调整高度逻辑可复用
- 语法高亮可在后续迭代中添加

**备选方案**:
- `@uiw/react-md-editor`: 功能完整但较重，且对 IME 支持需要额外处理
- `@codemirror/lang-markdown`: 功能强大但集成复杂度高
- `react-simplemde-editor`: 基于 CodeMirror 6，同样较重

### 2. 行号实现

**决定**: 使用独立 div 覆盖层显示行号

**理由**:
- 与 textarea 解耦，不影响文本内容
- 可独立样式化
- 滚动同步简单实现

### 3. 工具栏实现

**决定**: 在编辑器底部添加 Markdown 格式工具栏

**理由**:
- 不干扰编辑区域
- 与现有 UI 风格一致（glass design）
- 提供常用格式化按钮：**加粗**、*斜体*、~~删除线~~、`# 标题`、`- 列表`

### 4. 布局调整

**决定**: 将 `max-w-5xl` 改为 `max-w-7xl`

**理由**:
- 提供更宽敞的编辑空间
- 保持页面整体平衡
- 行号区域占用约 50px，需相应扩宽

## Risks / Trade-offs

**风险**: 不使用专业 Markdown 编辑器库可能缺少高级功能
→ **缓解**: 先实现基础功能，后续可根据用户反馈迭代增强

**风险**: 自定义行号滚动同步可能有性能问题
→ **缓解**: 使用 `requestAnimationFrame` 节流，仅在滚动时更新

**权衡**: 不实现语法高亮，编辑体验不如专业编辑器
→ **缓解**: 工具栏提供视觉引导，降低语法记忆负担
