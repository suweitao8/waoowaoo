## ADDED Requirements

### Requirement: Voice generation button for dialogue content
The system SHALL display a voice generation button next to each dialogue content item in the script panel.

#### Scenario: User generates voice for dialogue
- **WHEN** user clicks the voice generation button on a dialogue line
- **THEN** system retrieves the voice binding for the associated character
- **AND** system initiates voice generation using the character's bound voice

#### Scenario: Character not bound to voice
- **WHEN** user clicks voice generation for a dialogue line whose character has no voice binding
- **THEN** system displays a prompt to guide user to bind voice first
- **AND** system does not initiate voice generation

### Requirement: Voice generation button for voiceover content
The system SHALL display a voice generation button next to each voiceover (旁白) content item in the script panel.

#### Scenario: User generates voice for voiceover
- **WHEN** user clicks the voice generation button on a voiceover line
- **THEN** system uses the default narrator voice
- **AND** system initiates voice generation

#### Scenario: Default narrator voice not configured
- **WHEN** user clicks voice generation for voiceover but no default voice is set
- **THEN** system uses a placeholder voice or prompts user to configure

### Requirement: Voice preview button
The system SHALL display a voice preview button next to each dialogue and voiceover content item after voice has been generated.

#### Scenario: User previews generated voice
- **WHEN** user clicks the preview button on a content line with generated voice
- **THEN** system plays the generated audio file

#### Scenario: No voice generated yet
- **WHEN** user clicks preview button but no voice has been generated
- **THEN** system displays a message indicating no voice available

### Requirement: Inline button placement
The system SHALL place voice generation and preview buttons inline, aligned to the right of each dialogue and voiceover content line.

#### Scenario: Buttons appear on hover or always visible
- **WHEN** user views a script with dialogue or voiceover content
- **THEN** voice generation and preview buttons are visible on the right side of each line
- **AND** buttons use compact icon design to minimize visual impact
