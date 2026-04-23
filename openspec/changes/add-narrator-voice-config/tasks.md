## 1. 数据库迁移

- [x] 1.1 更新 Prisma schema，在 NovelPromotionProject 模型中添加 narratorVoiceId、narratorVoiceType、narratorVoicePrompt 字段
- [x] 1.2 生成并执行数据库迁移
- [x] 1.3 更新 src/types/project.ts 中的 NovelPromotionProject 接口

## 2. 国际化文案

- [x] 2.1 在 messages/zh/configModal.json 中添加旁白音色相关中文文案
- [x] 2.2 在 messages/en/configModal.json 中添加旁白音色相关英文文案

## 3. API 更新

- [x] 3.1 更新 /api/novel-promotion/[projectId] route 支持 narratorVoiceId、narratorVoiceType、narratorVoicePrompt 字段的读写

## 4. 前端组件开发

- [x] 4.1 在 ConfigEditModal.tsx 中添加语音合成模型选择器（audioModel 已有数据，仅需添加 UI）
- [x] 4.2 创建 NarratorVoiceConfigSection 组件，包含音色状态展示、AI 设计、试听功能
- [x] 4.3 在 ConfigEditModal.tsx 中集成 NarratorVoiceConfigSection 组件
- [x] 4.4 更新 WorkspaceHeaderShell.tsx 传递旁白音色相关 props

## 5. Hook 和状态管理

- [x] 5.1 创建 useNarratorVoiceDesign hook，封装旁白音色 AI 设计逻辑
- [x] 5.2 更新 useWorkspaceConfigActions 支持旁白音色配置更新

## 6. 测试与验证

- [x] 6.1 验证数据库迁移成功
- [x] 6.2 测试语音合成模型选择功能
- [x] 6.3 测试旁白音色 AI 设计功能
- [x] 6.4 测试旁白音色试听和重新生成功能
- [x] 6.5 验证国际化文案正确显示
