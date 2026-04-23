## ADDED Requirements

### Requirement: Markdown 编辑器显示行号

编辑器 SHALL 在左侧显示行号，行号与文本行一一对应。

#### Scenario: 初始加载显示行号
- **WHEN** 用户打开故事编辑器
- **THEN** 系统显示行号列，从 1 开始编号

#### Scenario: 滚动同步
- **WHEN** 用户滚动编辑器内容
- **THEN** 行号列同步滚动，保持对应关系

### Requirement: Markdown 格式工具栏

编辑器 SHALL 提供工具栏，包含常用 Markdown 格式化按钮。

#### Scenario: 加粗文本
- **WHEN** 用户选中文本并点击"加粗"按钮
- **THEN** 选中文本被 `**` 包裹

#### Scenario: 斜体文本
- **WHEN** 用户选中文本并点击"斜体"按钮
- **THEN** 选中文本被 `*` 包裹

#### Scenario: 插入标题
- **WHEN** 用户点击"标题"按钮
- **THEN** 在当前行开头插入 `# `

#### Scenario: 插入列表
- **WHEN** 用户点击"列表"按钮
- **THEN** 在当前行开头插入 `- `

### Requirement: 扩宽编辑区域

编辑器容器 SHALL 使用 `max-w-7xl` 替代 `max-w-5xl`，提供更宽敞的编辑空间。

#### Scenario: 桌面端宽屏显示
- **WHEN** 用户在宽屏设备上查看编辑器
- **THEN** 编辑器宽度最大为 1280px (max-w-7xl)

### Requirement: 移除剧集编辑提示

编辑器 SHALL 不显示剧集名称和编辑提示文本。

#### Scenario: 无剧集提示
- **WHEN** 用户在故事 tab 编辑内容
- **THEN** 界面不显示"当前正在编辑：xxx"和"以下制作流程仅针对本集..."提示

### Requirement: IME 组合输入支持

编辑器 SHALL 正确处理中文输入法的组合输入，避免拼音跳动问题。

#### Scenario: 中文输入法组合中
- **WHEN** 用户使用中文输入法输入拼音
- **THEN** 输入框显示拼音候选拼音，不触发内容同步

#### Scenario: 中文输入法组合完成
- **WHEN** 用户确认中文输入
- **THEN** 最终文本同步到父组件
