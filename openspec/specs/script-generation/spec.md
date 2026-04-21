## MODIFIED Requirements

### Requirement: 纯镜头转旁白描述
剧本生成时，系统 SHALL 为没有对话也没有旁白的纯镜头生成旁白描述。

#### Scenario: 纯镜头生成旁白描述
- **WHEN** 生成剧本分镜时遇到没有对话也没有旁白的纯镜头
- **THEN** 系统 SHALL 自动为该镜头生成旁白描述

#### Scenario: 已有对话或旁白的镜头保持不变
- **WHEN** 生成剧本分镜时镜头已有对话或旁白
- **THEN** 系统 SHALL 保留原有内容，不添加额外旁白

### Requirement: 每个分镜必须有 source_text
系统 SHALL 确保每个分镜的 `source_text` 字段都有对话或旁白内容。

#### Scenario: 分镜包含对话或旁白
- **WHEN** 生成任意分镜
- **THEN** 分镜的 `source_text` 字段 SHALL 包含对话或旁白内容
- **AND** `source_text` 字段 SHALL NOT 为空或 null

### Requirement: Script content types limited to dialogue and voiceover
The system SHALL only render dialogue and voiceover content types in the script panel.

#### Scenario: Script displays only dialogue and voiceover
- **WHEN** a screenplay contains action, dialogue, and voiceover content
- **THEN** system SHALL render only dialogue and voiceover types
- **AND** system SHALL NOT render action type content

#### Scenario: Action data preserved in structure
- **WHEN** screenplay data contains action type items
- **THEN** system SHALL preserve the action data in the data structure
- **AND** system SHALL NOT throw errors for action type items
