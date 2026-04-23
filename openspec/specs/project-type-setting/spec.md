## Requirements

### Requirement: Project type configuration field
The system SHALL support a project type field with values `animation` or `audiobook`, defaulting to `animation`.

#### Scenario: New project creation with default type
- **WHEN** a new project is created without specifying type
- **THEN** the project type SHALL be set to `animation`

#### Scenario: Project type selection during creation
- **WHEN** user creates a new project and selects a type
- **THEN** the project type SHALL be saved with the selected value

#### Scenario: Project type modification
- **WHEN** user changes project type in settings
- **THEN** the new type SHALL be persisted and UI SHALL update accordingly

### Requirement: Project type selector in settings
The system SHALL provide a project type selector in the project settings modal.

#### Scenario: Settings modal displays type selector
- **WHEN** user opens project settings modal
- **THEN** a project type dropdown SHALL be visible with options "动画" (Animation) and "有声小说" (Audiobook)

#### Scenario: Type selector shows current value
- **WHEN** settings modal is opened for an existing project
- **THEN** the type selector SHALL display the current project type

### Requirement: Stage navigation based on project type
The system SHALL dynamically show/hide stages based on project type.

#### Scenario: Animation project shows all stages
- **WHEN** project type is `animation`
- **THEN** all stages including "成片" (videos) SHALL be visible

#### Scenario: Audiobook project hides video stage
- **WHEN** project type is `audiobook`
- **THEN** the "成片" (videos) stage SHALL be hidden

#### Scenario: AI Editor stage is visible for all projects
- **WHEN** project is loaded
- **THEN** the "AI剪辑" (editor) stage SHALL be visible (marked as "开发中" for now)

### Requirement: Video generation UI hidden for audiobook
The system SHALL hide video generation controls for audiobook projects.

#### Scenario: Video generation button hidden in storyboard
- **WHEN** project type is `audiobook` and user views storyboard panel
- **THEN** video generation buttons SHALL be hidden

#### Scenario: Video generation button visible for animation
- **WHEN** project type is `animation` and user views storyboard panel
- **THEN** video generation buttons SHALL be visible
