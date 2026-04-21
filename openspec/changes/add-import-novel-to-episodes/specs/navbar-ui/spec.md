## ADDED Requirements

### Requirement: Import novel button in EpisodeSelector
The system SHALL display an "Import Novel" button in the EpisodeSelector dropdown menu, positioned next to the "New Episode" button.

#### Scenario: Import button placement
- **WHEN** user opens the EpisodeSelector dropdown menu
- **THEN** system displays "Import Novel" button below the episode list, next to "New Episode" button

#### Scenario: Import button triggers wizard
- **WHEN** user clicks the "Import Novel" button
- **THEN** system invokes the onImportNovel callback to open the import wizard

#### Scenario: Callback prop
- **WHEN** EpisodeSelector receives onImportNovel prop
- **THEN** the Import Novel button is rendered and functional

#### Scenario: No callback prop
- **WHEN** EpisodeSelector does not receive onImportNovel prop
- **THEN** the Import Novel button is hidden, showing only the New Episode button
