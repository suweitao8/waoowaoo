## Why

当前项目中图片生成的比例不统一：
- **角色资产图**: 3:2（`CHARACTER_ASSET_IMAGE_RATIO = '3:2'`）
- **道具图片**: 3:2（`PROP_IMAGE_RATIO = CHARACTER_ASSET_IMAGE_RATIO`）
- **场景图片**: 1:1（`LOCATION_IMAGE_RATIO = '1:1'`）

用户希望所有生成的图片统一使用 16:9 横版比例，以便于统一展示和使用。

## What Changes

- **统一图片比例**: 将所有图片生成的默认比例改为 16:9
  - 角色资产图: 3:2 → 16:9
  - 道具图片: 3:2 → 16:9
  - 场景图片: 1:1 → 16:9
- **更新相关常量**: 修改 `src/lib/constants.ts` 中的比例常量
- **更新 API 尺寸参数**: 调整 Seedream API 等的尺寸参数以匹配新比例

## Capabilities

### New Capabilities
- `unified-image-aspect-ratio`: 统一所有图片生成为 16:9 横版比例

### Modified Capabilities
- 无现有 specs 需要修改

## Impact

- **常量文件**: `src/lib/constants.ts` - 比例常量定义
- **Worker 处理器**: 
  - `character-image-task-handler.ts`
  - `location-image-task-handler.ts`
  - `asset-hub-image-task-handler.ts`
  - `reference-to-character.ts`
- **测试文件**: 相关单元测试中的比例断言
- **提示词后缀**: 已包含 16:9 要求，无需修改
