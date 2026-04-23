## ADDED Requirements

### Requirement: User can edit character properties in a unified panel
The system SHALL provide a unified character property editing panel that allows users to edit all character attributes in both pre-generation and post-generation states.

#### Scenario: Edit properties before character generation
- **WHEN** user views a character profile before image generation
- **THEN** system SHALL display all editable properties including gender, age, era, social class, identity, height, body type, role level, archetype, personality tags, costume tier, suggested colors, primary identifier, and visual keywords

#### Scenario: Edit properties after character generation
- **WHEN** user views a character with generated images
- **THEN** system SHALL display the same unified editing panel with all properties still editable

#### Scenario: Properties persist across generation state
- **WHEN** user edits properties and generates character image
- **THEN** system SHALL preserve all property values and allow further editing after generation

### Requirement: System displays AI image generation prompt
The system SHALL automatically generate and display the AI image generation prompt based on current character properties.

#### Scenario: Auto-generate image prompt
- **WHEN** user views the unified character editor
- **THEN** system SHALL display a text-to-image AI prompt generated from current character properties

#### Scenario: Update prompt on property change
- **WHEN** user modifies any character property
- **THEN** system SHALL update the displayed image prompt to reflect the changes

#### Scenario: Manual prompt editing
- **WHEN** user wants to customize the image prompt
- **THEN** system SHALL allow manual editing of the generated prompt text

### Requirement: System displays AI voice prompt
The system SHALL automatically generate and display the AI voice design prompt based on current character properties.

#### Scenario: Auto-generate voice prompt
- **WHEN** user views the unified character editor
- **THEN** system SHALL display a voice AI prompt generated from current character properties (gender, age, personality, etc.)

#### Scenario: Update voice prompt on property change
- **WHEN** user modifies character properties that affect voice
- **THEN** system SHALL update the displayed voice prompt to reflect the changes

### Requirement: One-click generation of image and voice
The system SHALL provide a single action to generate both character image and voice simultaneously.

#### Scenario: Generate from pre-generation state
- **WHEN** user clicks "Confirm and Generate" button before any images exist
- **THEN** system SHALL save all properties, generate character image, and generate voice file

#### Scenario: Regenerate after property changes
- **WHEN** user modifies properties and clicks "Confirm and Generate" after images exist
- **THEN** system SHALL save all properties and regenerate character image and voice based on new properties

#### Scenario: Generation progress feedback
- **WHEN** generation is in progress
- **THEN** system SHALL display loading status for both image and voice generation

### Requirement: Unified panel works in both asset-hub and project modes
The system SHALL support the unified character editor in both asset-hub and project contexts.

#### Scenario: Asset hub mode editing
- **WHEN** user edits a character in asset-hub mode
- **THEN** system SHALL display the unified editor with asset-hub specific behaviors (no introduction field)

#### Scenario: Project mode editing
- **WHEN** user edits a character in project mode
- **THEN** system SHALL display the unified editor with project-specific features (includes introduction field)

### Requirement: Property change triggers regeneration warning
The system SHALL warn users when property changes may require regenerating existing assets.

#### Scenario: Warning on critical property change
- **WHEN** user modifies properties like era, social class, or costume tier after images exist
- **THEN** system SHALL warn that regeneration is recommended

#### Scenario: No warning on minor property change
- **WHEN** user modifies only introduction or personality tags after images exist
- **THEN** system SHALL NOT show regeneration warning
