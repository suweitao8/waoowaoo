## ADDED Requirements

### Requirement: 分镜对话/旁白必显示
系统 SHALL 在每个分镜表单中展示对话或旁白内容。

#### Scenario: 每个分镜显示对话或旁白
- **WHEN** 用户查看任意分镜表单
- **THEN** 系统显示该分镜的对话或旁白内容

#### Scenario: 有旁白时显示旁白内容
- **WHEN** 分镜的 sourceText 包含旁白内容
- **THEN** 系统显示旁白内容

#### Scenario: 有角色对话时显示对话内容
- **WHEN** 分镜的 sourceText 包含角色对话
- **THEN** 系统显示角色名和对话内容
