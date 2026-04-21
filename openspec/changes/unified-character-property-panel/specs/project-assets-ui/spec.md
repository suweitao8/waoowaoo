## MODIFIED Requirements

### Requirement: User can import assets from Asset Hub to project
**Status**: REMOVED (temporarily hidden)

**Reason**: Feature temporarily not needed, hiding UI entry point while preserving backend functionality for future restoration.

**Migration**: Feature can be restored by uncommenting the hidden button components in CharacterSection.tsx and LocationCard.tsx.

### Requirement: Video generation UI visibility based on project type setting
The system SHALL conditionally display video generation UI elements based on the project type setting.

#### Scenario: Video controls visible for animation projects
- **WHEN** project type is `animation`
- **THEN** video generation buttons and controls SHALL be displayed in the storyboard and video stages

#### Scenario: Video controls hidden for audiobook projects
- **WHEN** project type is `audiobook`
- **THEN** video generation buttons and controls SHALL NOT be displayed anywhere in the UI

### Requirement: Project type indicator in workspace
The system SHALL display the current project type in the workspace header for user awareness.

#### Scenario: Project type displayed in header
- **WHEN** user is in workspace view
- **THEN** current project type (动画/有声小说) SHALL be visible in the project info area

## ADDED Requirements

### Requirement: Character editing uses unified property panel
The system SHALL use the unified character property panel for all character editing operations in project assets.

#### Scenario: Edit character opens unified panel
- **WHEN** user clicks edit on a character card in project assets
- **THEN** system SHALL open the unified character property panel instead of the old CharacterEditModal

#### Scenario: Confirm pending profile opens unified panel
- **WHEN** user clicks "Confirm and Generate" on a pending character profile
- **THEN** system SHALL open the unified character property panel for confirmation and generation
