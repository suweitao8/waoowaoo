## Why

角色生成后，用户需要在角色编辑弹窗中继续编辑角色的基本属性（性别、年龄、职业、身高、外貌体型特征、性格），这些信息对角色形象生成很重要。当前角色编辑弹窗只有角色介绍字段，缺少这些基本属性的独立编辑入口。

## What Changes

- **新增字段**：在 `CharacterProfileData` 中添加 `height`（身高）和 `body_type`（外貌体型特征）字段
- **UI 改造**：在角色编辑弹窗中，将性别、年龄、职业、身高、外貌体型特征、性格这些基本属性放到角色介绍下方，作为独立可编辑字段
- **数据存储**：这些属性保存在 `profileData` JSON 字段中，与现有档案数据结构保持一致

## Capabilities

### New Capabilities

- `character-basic-attributes`: 角色基本属性编辑功能，包含性别、年龄、职业、身高、外貌体型特征、性格

### Modified Capabilities

无。

## Impact

**受影响文件：**
- `src/types/character-profile.ts` - 添加 height 和 body_type 字段
- `src/components/shared/assets/CharacterEditModal.tsx` - 添加基本属性编辑 UI
- `messages/zh/assets.json` - 添加翻译 key
- `messages/en/assets.json` - 添加翻译 key

**不受影响：**
- 数据库结构（profileData 是 JSON 字段，无需迁移）
- 现有角色数据（新字段为可选）
