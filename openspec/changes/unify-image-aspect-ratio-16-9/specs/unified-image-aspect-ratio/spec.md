## ADDED Requirements

### Requirement: Unified 16:9 Image Aspect Ratio
The system SHALL generate all images with a 16:9 aspect ratio by default.

#### Scenario: Character asset image generation
- **WHEN** a character asset image is generated
- **THEN** the image SHALL have a 16:9 aspect ratio
- **AND** the image dimensions SHALL be 1920x1080 or equivalent 16:9 resolution

#### Scenario: Location/scene image generation
- **WHEN** a location or scene image is generated
- **THEN** the image SHALL have a 16:9 aspect ratio
- **AND** the image dimensions SHALL be 1920x1080 or equivalent 16:9 resolution

#### Scenario: Prop image generation
- **WHEN** a prop image is generated
- **THEN** the image SHALL have a 16:9 aspect ratio
- **AND** the image dimensions SHALL be 1920x1080 or equivalent 16:9 resolution

### Requirement: Consistent Constants
All image aspect ratio constants SHALL reference a single source of truth.

#### Scenario: Constants reference unified value
- **WHEN** code references `CHARACTER_ASSET_IMAGE_RATIO`, `PROP_IMAGE_RATIO`, or `LOCATION_IMAGE_RATIO`
- **THEN** all SHALL return the value '16:9'
- **AND** they SHALL reference a single `IMAGE_ASPECT_RATIO_16_9` constant
