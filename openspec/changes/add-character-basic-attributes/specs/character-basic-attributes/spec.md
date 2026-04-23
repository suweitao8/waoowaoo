## ADDED Requirements

### Requirement: User can edit character basic attributes
The system SHALL allow users to edit character basic attributes including gender, age, occupation, height, body type, and personality in the character edit modal.

#### Scenario: Edit character basic attributes
- **WHEN** user opens character edit modal
- **THEN** system displays basic attributes section below character introduction
- **AND** section contains editable fields for gender, age, occupation, height, body type, and personality

#### Scenario: Save character basic attributes
- **WHEN** user modifies basic attributes and clicks save
- **THEN** system persists the changes to profileData
- **AND** changes are reflected in subsequent edits

### Requirement: Character profile data includes height and body type
The system SHALL support height and body_type fields in CharacterProfileData type.

#### Scenario: New character with height and body type
- **WHEN** character profile data is created or updated
- **THEN** system accepts optional height and body_type fields
- **AND** preserves existing fields when height or body_type are not provided
