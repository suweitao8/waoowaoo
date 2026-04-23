## MODIFIED Requirements

### Requirement: 分镜表单字段展示
系统 SHALL 在分镜表单中展示用户可编辑的字段，包括景别、原文、场景描述、场景和角色。

系统 SHALL NOT 展示视频提示词（videoPrompt）和镜头运动（cameraMove）字段。

#### Scenario: 表单隐藏技术字段
- **WHEN** 用户查看分镜表单
- **THEN** 系统不显示视频提示词字段
- **AND** 系统不显示镜头运动字段

#### Scenario: 表单显示用户编辑字段
- **WHEN** 用户查看分镜表单
- **THEN** 系统显示景别字段
- **AND** 系统显示原文字段（如果有内容）
- **AND** 系统显示场景描述字段
- **AND** 系统显示场景选择区域
- **AND** 系统显示角色选择区域
