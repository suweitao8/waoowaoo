## Context

当前项目配置系统（`ConfigEditModal.tsx`）已支持多种模型选择：分析模型、角色模型、场景模型、分镜模型、修图模型、视频模型。语音合成模型（audioModel）已在数据库中存在，但未在 UI 中暴露给用户选择。

音色设计功能已存在于 `src/lib/providers/bailian/voice-design.ts`，支持通过阿里百炼 API 生成自定义音色。角色级别的音色配置 UI 已实现于 `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/VoiceSettings.tsx`。

### 现有架构约束

- 项目配置使用 `useUpdateProjectConfig` mutation 进行更新
- 模型选择使用 `ModelCapabilityDropdown` 组件
- 音色设计使用 `VoiceDesignDialog` 组件模式
- 数据库字段通过 Prisma schema 定义

## Goals / Non-Goals

**Goals:**
- 在项目设置模态框中添加语音合成模型选择器
- 在项目设置模态框中添加旁白音色配置区块
- 支持通过 AI 设计生成项目专属旁白音色
- 支持试听和重新生成旁白音色
- 数据持久化存储

**Non-Goals:**
- 不修改角色级别的音色配置功能
- 不添加旁白音色的批量应用到角色功能
- 不支持上传音频文件作为旁白音色（仅支持 AI 设计）

## Decisions

### D1: 数据库字段设计

**决定**: 在 `NovelPromotionProject` 表中新增三个字段：
- `narratorVoiceId: String?` - 音色 ID（由 AI 设计生成）
- `narratorVoiceType: String?` - 音色类型（`qwen-designed`）
- `narratorVoicePrompt: String?` - 音色提示词（用于重新生成）

**理由**:
- 与现有 `Character` 表的音色字段设计保持一致
- 存储提示词便于用户重新生成相同风格的音色
- 可空字段保持向后兼容

**替代方案**:
- 使用 JSON 字段存储：不利于查询和类型安全
- 引用独立的 Voice 表：过度设计，旁白音色是项目级配置

### D2: UI 组件复用

**决定**: 复用现有的 `VoiceDesignDialog` 组件，适配为项目级别配置

**理由**:
- 已有成熟的音色设计 UI 和逻辑
- 减少代码重复，保持 UI 一致性
- 仅需传递不同的上下文参数

**实现方式**:
- 从 `VoiceDesignDialog` 提取通用逻辑到 hook
- 在 `ConfigEditModal` 中内嵌音色配置区块（非弹窗形式）

### D3: API 设计

**决定**: 复用现有的 `/api/novel-promotion/[projectId]` PATCH 端点

**理由**:
- 与其他项目配置字段使用同一 API
- 保持 API 设计一致性
- 无需新增端点

## Risks / Trade-offs

### 风险：音色生成失败

- **风险**: AI 设计音色可能失败（API 限流、余额不足）
- **缓解**: 显示错误提示，保留用户输入的提示词，允许重试

### 风险：音频文件存储

- **风险**: 生成的音色预览音频需要存储
- **缓解**: 复用现有的 MediaObject 存储，音频保存为临时文件

### 权衡：配置复杂度

- **权衡**: 在设置模态框中添加音色配置会增加模态框高度
- **决定**: 将旁白音色配置放在独立的折叠区块中，默认展开

## Migration Plan

### 数据库迁移

```sql
-- 添加旁白音色字段到 NovelPromotionProject 表
ALTER TABLE "novel_promotion_projects"
ADD COLUMN "narratorVoiceId" TEXT,
ADD COLUMN "narratorVoiceType" TEXT,
ADD COLUMN "narratorVoicePrompt" TEXT;
```

### 部署步骤

1. 部署数据库迁移
2. 更新 Prisma schema
3. 更新类型定义
4. 更新前端组件
5. 更新国际化文案

### 回滚策略

1. 移除前端新功能代码
2. 数据库字段为可空，无需数据迁移
3. 可选：删除新增字段

## Open Questions

- [ ] 旁白音色是否需要支持多语言？（当前设计中提示词语言由用户输入决定）
- [ ] 是否需要在角色音色配置中显示"使用项目旁白音色"选项？
