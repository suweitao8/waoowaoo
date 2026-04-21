## Context

项目资产页面（`workspace/[projectId]/modes/novel-promotion/components/assets/`）中有"从资产中心导入"按钮，出现在：
1. **CharacterSection.tsx** - 角色卡片头部，每个角色显示一个导入按钮
2. **LocationCard.tsx** - 场景卡片操作栏，作为图标按钮

该功能调用 `onCopyFromGlobal` 回调，打开 `GlobalAssetPicker` 选择器，让用户从资产中心复制资产到项目。

## Goals / Non-Goals

**Goals:**
- 隐藏角色卡片的"从资产中心导入"按钮
- 隐藏场景卡片的"从资产中心导入"按钮
- 保持代码可维护，便于将来恢复功能

**Non-Goals:**
- 不删除 API 路由和相关 hooks
- 不删除 GlobalAssetPicker 组件
- 不修改资产中心页面

## Decisions

### 1. 注释而非删除代码

**决定**：通过注释或条件渲染隐藏按钮，而非删除代码。

**理由**：
- 功能将来可能恢复
- 便于追溯变更原因
- 减少代码 diff，便于 code review

**替代方案**：
- 完全删除代码 → 恢复时需要重新编写
- 添加 feature flag → 过度工程化，简单注释即可

### 2. 统一隐藏方式

**决定**：在两个位置统一使用 JSX 注释方式隐藏按钮。

**理由**：
- 保持一致的代码风格
- 清晰标记隐藏原因

## Risks / Trade-offs

**风险 1：将来恢复时可能遗漏**
→ 缓解：在注释中添加 TODO 标记，便于搜索

**风险 2：相关状态和回调变为未使用**
→ 接受：onCopyFromGlobal 等回调暂时保留，不影响功能
