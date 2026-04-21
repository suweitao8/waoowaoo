## ADDED Requirements

### Requirement: Import novel button in episode selector
The system SHALL display an "Import Novel" button next to the "New Episode" button in the EpisodeSelector dropdown menu.

#### Scenario: Button visible when episodes exist
- **WHEN** user opens the episode selector dropdown
- **THEN** system displays both "New Episode" button and "Import Novel" button at the bottom of the dropdown

#### Scenario: Button triggers import wizard
- **WHEN** user clicks the "Import Novel" button
- **THEN** system opens the novel import wizard modal

### Requirement: Upload and parse novel file
The system SHALL allow users to upload a novel file and parse it into chapters.

#### Scenario: Supported file formats
- **WHEN** user uploads a .txt, .md, or .text file
- **THEN** system accepts the file and begins parsing

#### Scenario: File size validation
- **WHEN** user uploads a file larger than 5MB
- **THEN** system displays an error message "File too large"

#### Scenario: Encoding detection
- **WHEN** user uploads a file with Chinese encoding (GB2312, GBK, GB18030, Big5)
- **THEN** system automatically detects and decodes the file correctly

#### Scenario: Chapter splitting
- **WHEN** novel file is parsed successfully
- **THEN** system splits content into chapters based on chapter title patterns (第X章, 第一章, etc.)

### Requirement: Append episodes to existing list
The system SHALL append imported chapters as new episodes to the end of the existing episode list.

#### Scenario: Episode numbering
- **WHEN** importing novel chapters into a project with N existing episodes
- **THEN** new episodes are numbered starting from N+1

#### Scenario: Episode content
- **WHEN** a chapter is imported
- **THEN** episode name is set to chapter title, and novelText field is set to chapter content

#### Scenario: Progress indication
- **WHEN** import is in progress
- **THEN** system displays progress bar showing current chapter being processed

### Requirement: Import completion feedback
The system SHALL provide feedback after import completion and allow navigation to new episodes.

#### Scenario: Import success
- **WHEN** all chapters are imported successfully
- **THEN** system displays success message with count of imported episodes

#### Scenario: Navigate to first new episode
- **WHEN** import completes
- **THEN** system offers option to navigate to the first newly imported episode

#### Scenario: Import cancellation
- **WHEN** user cancels during import
- **THEN** system preserves already imported episodes and closes the import wizard
