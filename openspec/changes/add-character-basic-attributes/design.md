## Context

当前角色档案数据结构 (`CharacterProfileData`) 已包含：
- `gender`（性别）
- `age_range`（年龄段描述）
- `occupation`（职业）
- `personality_tags`（性格标签）

但缺少：
- `height`（身高）
- `body_type`（外貌体型特征）

这些数据存储在数据库的 `profileData` JSON 字段中，无需数据库迁移。

角色编辑弹窗 (`CharacterEditModal`) 目前只显示角色名、角色介绍和外貌描述，没有独立的基本属性编辑区域。

## Goals / Non-Goals

**Goals:**
- 在 `CharacterProfileData` 类型中添加 `height` 和 `body_type` 字段
- 在角色编辑弹窗中添加基本属性编辑区域，位于角色介绍下方
- 支持编辑：性别、年龄、职业、身高、外貌体型特征、性格
- 数据保存在 `profileData` 中

**Non-Goals:**
- 不修改数据库 schema（使用现有 JSON 字段）
- 不修改角色档案确认流程（CharacterProfileCard/Dialog）
- 不修改 AI 生成逻辑

## Decisions

### 1. 字段命名

**决定**：使用 `height` 和 `body_type` 作为字段名。

**理由**：
- `height` - 简洁明了
- `body_type` - 描述外貌体型特征，如"身材高挑"、"体格健壮"等

### 2. UI 布局

**决定**：在角色编辑弹窗的"角色介绍"字段下方添加"基本属性"区域，使用网格布局。

**布局顺序**：
```
角色名
角色介绍
---
基本属性（可折叠）
├── 性别 (gender)
├── 年龄 (age_range)
├── 职业 (occupation)
├── 身高 (height) [新增]
├── 外貌体型 (body_type) [新增]
└── 性格 (personality_tags)
---
外貌描述
AI 提示词
```

**理由**：
- 基本属性与角色介绍相关，放在一起便于用户理解角色全貌
- 网格布局节省空间
- 可折叠设计避免弹窗过长

### 3. 数据持久化

**决定**：通过现有的 `profileData` 字段保存，在保存角色时一起提交。

**理由**：
- 无需新增 API
- 与现有档案数据结构保持一致
- 便于后续 AI 生成时使用

## Risks / Trade-offs

**风险 1：旧数据缺少新字段**
→ 缓解：新字段设为可选，编辑时如果不存在则显示空值

**风险 2：弹窗内容增多可能影响用户体验**
→ 缓解：使用可折叠区域，默认展开，用户可选择折叠
