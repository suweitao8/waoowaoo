## Why

项目资产页面中的"从资产中心导入"功能暂时用不到，需要隐藏以简化界面。该功能允许用户从资产中心复制资产到项目，但目前工作流中不需要此入口。

## What Changes

- **隐藏**：项目资产页面中角色卡片上的"从资产中心导入"按钮
- **隐藏**：项目资产页面中场景卡片上的"从资产中心导入"按钮
- **保留**：相关 API 和 hooks 不删除，仅隐藏 UI 入口，便于将来恢复

## Capabilities

### New Capabilities

无新增能力。

### Modified Capabilities

- `project-assets-ui`: 项目资产页面 UI 变更，隐藏从资产中心导入的入口

## Impact

**受影响文件：**
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/CharacterSection.tsx` - 隐藏角色卡片的导入按钮
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/LocationCard.tsx` - 隐藏场景卡片的导入按钮
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/LocationSection.tsx` - 可能需要调整

**不受影响：**
- `src/app/api/novel-promotion/[projectId]/copy-from-global/route.ts` - API 保留
- `src/lib/query/hooks/useAssets.ts` - copyFromGlobal 方法保留
- `src/components/shared/assets/GlobalAssetPicker.tsx` - 资产选择器组件保留
