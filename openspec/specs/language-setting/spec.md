## Requirements

### Requirement: User can change language in settings center
The system SHALL provide a language setting option in the settings center (Profile page) where users can switch between Chinese (zh) and English (en).

#### Scenario: User views language setting in settings
- **WHEN** user navigates to Profile page and selects "通用设置" (General Settings)
- **THEN** system displays the current language and available language options

#### Scenario: User switches language from settings
- **WHEN** user selects a different language from the dropdown
- **THEN** system shows confirmation dialog explaining that language change affects prompt templates and output language
- **AND** upon confirmation, system navigates to the current page with the new locale

### Requirement: Language defaults to Chinese
The system SHALL default to Chinese (zh) as the interface language.

#### Scenario: New user default language
- **WHEN** a new user accesses the application
- **THEN** system displays the interface in Chinese (zh)
