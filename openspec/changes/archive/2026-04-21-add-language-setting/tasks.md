## 1. Profile Page - Add General Settings Section

- [x] 1.1 Add "通用设置" (General Settings) navigation item to Profile page sidebar
- [x] 1.2 Create GeneralSettingsTab component with language setting UI
- [x] 1.3 Add translation keys for "通用设置" in messages files (zh.json, en.json)
- [x] 1.4 Update ProfilePage to support new activeSection: 'generalSettings'

## 2. Migrate Language Switcher Component

- [x] 2.1 Import and use LanguageSwitcher component in GeneralSettingsTab
- [x] 2.2 Add descriptive text explaining language switching behavior
- [x] 2.3 Ensure language switch confirmation dialog works correctly in settings context

## 3. Remove Language Switcher from Navbar

- [x] 3.1 Remove LanguageSwitcher import and usage from Navbar.tsx (authenticated view)
- [x] 3.2 Remove LanguageSwitcher import and usage from Navbar.tsx (unauthenticated view)
- [x] 3.3 Clean up any unused imports

## 4. Testing & Verification

- [x] 4.1 Verify language can be switched from settings center
- [x] 4.2 Verify confirmation dialog appears when switching language
- [x] 4.3 Verify language change persists across page navigation
- [x] 4.4 Verify navbar no longer shows language switcher
- [x] 4.5 Verify default language is Chinese (zh)
