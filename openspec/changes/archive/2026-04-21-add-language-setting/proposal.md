## Why

目前语言切换功能位于顶部导航栏（Navbar），对于大多数中文用户来说，语言设置很少需要更改。将语言切换移至设置中心可以：
1. 简化导航栏界面，减少视觉干扰
2. 遵循常见应用的设计模式（语言设置通常位于设置页面）
3. 为未来可能的"通用设置"扩展预留空间

## What Changes

- **新增**：在设置中心（Profile 页面）添加"通用设置"分区，包含语言切换功能
- **移除**：导航栏中的 LanguageSwitcher 组件
- **默认值**：语言默认保持为中文（zh），与现有配置一致
- **保留**：语言切换确认弹窗逻辑（切换语言会影响提示词模板和输出语言）

## Capabilities

### New Capabilities

- `language-setting`: 在设置中心提供语言切换功能，用户可选择中文或英文界面

### Modified Capabilities

- `navbar-ui`: 从导航栏移除语言切换组件，简化界面

## Impact

**受影响文件：**
- `src/components/Navbar.tsx` - 移除 LanguageSwitcher 引用
- `src/app/[locale]/profile/page.tsx` - 添加"通用设置"分区
- `src/app/[locale]/profile/components/ApiConfigTab.tsx` - 可能需要调整布局

**不受影响：**
- 语言切换核心逻辑（LanguageSwitcher 组件可复用）
- i18n 路由配置
- 现有的语言切换确认弹窗
