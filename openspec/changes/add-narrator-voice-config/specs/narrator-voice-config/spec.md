## ADDED Requirements

### Requirement: 项目级旁白音色配置展示

系统 SHALL 在项目设置模态框中展示旁白音色配置区块，显示当前配置状态。

#### Scenario: 未配置旁白音色时显示占位状态

- **WHEN** 项目未配置旁白音色
- **THEN** 显示"未配置旁白音色"提示和"AI 设计音色"按钮

#### Scenario: 已配置旁白音色时显示音色信息

- **WHEN** 项目已配置旁白音色
- **THEN** 显示音色试听按钮和"重新设计"按钮

### Requirement: AI 设计旁白音色

系统 SHALL 允许用户通过输入提示词来生成项目专属的旁白音色。

#### Scenario: 使用预设提示词生成音色

- **WHEN** 用户选择预设提示词（如"旁白"、"播音"等）
- **THEN** 系统使用预设提示词调用 AI 音色设计接口生成音色

#### Scenario: 使用自定义提示词生成音色

- **WHEN** 用户输入自定义的音色描述提示词
- **THEN** 系统使用用户输入的提示词调用 AI 音色设计接口生成音色

#### Scenario: 音色生成成功

- **WHEN** AI 音色设计成功
- **THEN** 系统保存音色 ID、类型和提示词到项目配置，并播放预览音频

#### Scenario: 音色生成失败

- **WHEN** AI 音色设计失败
- **THEN** 系统显示错误提示，保留用户输入的提示词，允许重试

### Requirement: 旁白音色试听

系统 SHALL 允许用户试听已配置的旁白音色。

#### Scenario: 播放旁白音色预览

- **WHEN** 用户点击"试听"按钮
- **THEN** 系统播放已配置旁白音色的预览音频

#### Scenario: 试听未配置音色

- **WHEN** 项目未配置旁白音色且用户点击试听
- **THEN** 系统显示"请先配置旁白音色"提示

### Requirement: 重新生成旁白音色

系统 SHALL 允许用户重新生成旁白音色。

#### Scenario: 使用原提示词重新生成

- **WHEN** 用户点击"重新设计"按钮
- **THEN** 系统预填充原有的提示词，用户可修改后重新生成

#### Scenario: 确认替换音色

- **WHEN** 音色生成成功且用户确认使用新音色
- **THEN** 系统更新项目配置中的音色信息

### Requirement: 旁白音色数据持久化

系统 SHALL 将旁白音色配置持久化存储到数据库。

#### Scenario: 保存旁白音色配置

- **WHEN** 用户配置旁白音色成功
- **THEN** 系统将 narratorVoiceId、narratorVoiceType、narratorVoicePrompt 保存到 NovelPromotionProject 表

#### Scenario: 读取旁白音色配置

- **WHEN** 加载项目配置
- **THEN** 系统从数据库读取旁白音色配置并在 UI 中展示
