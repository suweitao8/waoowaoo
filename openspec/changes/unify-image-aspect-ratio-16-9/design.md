## Context

项目中图片生成的比例分散在多个常量中：

```typescript
// src/lib/constants.ts
export const CHARACTER_ASSET_IMAGE_RATIO = '3:2'
export const CHARACTER_IMAGE_RATIO = CHARACTER_ASSET_IMAGE_RATIO
export const CHARACTER_IMAGE_SIZE = '3840x2160'  // 注意：这个是 16:9
export const CHARACTER_IMAGE_BANANA_RATIO = CHARACTER_ASSET_IMAGE_RATIO
export const PROP_IMAGE_RATIO = CHARACTER_ASSET_IMAGE_RATIO
export const LOCATION_IMAGE_RATIO = '1:1'
export const LOCATION_IMAGE_SIZE = '1024x1024'  // 1:1
```

存在不一致：`CHARACTER_IMAGE_SIZE` 声称是 16:9，但 `CHARACTER_ASSET_IMAGE_RATIO` 是 3:2。

## Goals / Non-Goals

**Goals:**
- 统一所有图片生成比例为 16:9
- 保持代码一致性，避免 SIZE 和 RATIO 不匹配

**Non-Goals:**
- 不修改用户已生成的历史图片
- 不影响视频生成的比例设置

## Decisions

### Decision 1: 常量统一策略

**选择**: 创建一个统一的 `IMAGE_ASPECT_RATIO_16_9 = '16:9'` 常量，所有资产图比例都引用它

**理由**:
- 单一真实来源，便于维护
- 如果将来需要改回，只需修改一处

### Decision 2: SIZE 参数调整

**选择**: 
- 角色/道具图片尺寸: 改为 `'1920x1080'` (16:9, 2K)
- 场景图片尺寸: 改为 `'1920x1080'` (16:9, 2K)

**理由**:
- 保持与比例的一致性
- 2K 分辨率在质量和性能之间取得平衡

## Risks / Trade-offs

**风险 1: 现有资产展示布局**
→ 可能需要调整资产卡片的布局以适应新的比例

**风险 2: API 兼容性**
→ 某些 API 可能对特定比例有优化，需要测试验证
