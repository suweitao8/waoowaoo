## Why

项目配置中缺少音色模型选择功能，用户无法为项目指定默认的语音合成模型（TTS Provider）。此外，用户需要为项目配置专属的旁白音色，但目前只能在角色级别配置音色，缺乏项目级别的旁白音色统一配置能力。这导致：

1. 用户无法统一管理项目的语音合成模型
2. 旁白音色需要每次单独配置，缺乏项目级别的统一管理
3. 用户无法通过提示词快速生成项目专属的旁白音色

## What Changes

- **新增**：项目配置中添加「语音合成模型」选择器（audioModel），与现有的视频模型、图像模型选择器保持一致的 UI 风格
- **新增**：项目配置中添加「旁白音色」配置区块，包含：
  - 当前旁白音色状态展示（已配置/未配置）
  - 音色试听功能
  - AI 设计音色功能（基于提示词生成专属旁白音色）
  - 重新生成旁白音色功能
- **新增**：数据库字段 `narratorVoiceId`、`narratorVoiceType`、`narratorVoicePrompt` 用于存储项目级旁白音色配置
- **新增**：国际化文案支持（中文/英文）

## Capabilities

### New Capabilities

- `narrator-voice-config`: 项目级别旁白音色配置能力，包括：
  - 在项目设置模态框中展示和配置旁白音色
  - AI 设计音色功能（基于提示词生成）
  - 音色试听和重新生成功能
  - 数据持久化存储

### Modified Capabilities

- `project-config-modal`: 扩展项目配置模态框，添加语音合成模型选择器和旁白音色配置区块

## Impact

- **数据库**: `NovelPromotionProject` 表新增 `narratorVoiceId`、`narratorVoiceType`、`narratorVoicePrompt` 字段
- **前端组件**: `ConfigEditModal.tsx` 需要扩展 UI
- **API**: `/api/novel-promotion/[projectId]` 需要支持新字段的读写
- **国际化**: `messages/zh/configModal.json` 和 `messages/en/configModal.json` 需要新增文案
- **类型定义**: `src/types/project.ts` 中的 `NovelPromotionProject` 接口需要更新
