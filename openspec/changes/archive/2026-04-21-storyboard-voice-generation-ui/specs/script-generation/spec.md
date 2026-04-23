## REMOVED Requirements

### Requirement: Action type content rendering
**Reason**: Action (分镜设计) content type is being unified into voiceover (旁白) for simplified script presentation. The concept of "分镜设计" as a separate content type creates redundancy.

**Migration**: Existing action content in screenplay data should be:
1. Preserved in the data structure for backward compatibility
2. Not rendered in the UI
3. Optionally converted to voiceover format if needed

## ADDED Requirements

### Requirement: Script content types limited to dialogue and voiceover
The system SHALL only render dialogue and voiceover content types in the script panel.

#### Scenario: Script displays only dialogue and voiceover
- **WHEN** a screenplay contains action, dialogue, and voiceover content
- **THEN** system SHALL render only dialogue and voiceover types
- **AND** system SHALL NOT render action type content

#### Scenario: Action data preserved in structure
- **WHEN** screenplay data contains action type items
- **THEN** system SHALL preserve the action data in the data structure
- **AND** system SHALL NOT throw errors for action type items
