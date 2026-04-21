## ADDED Requirements

### Requirement: Chapter Jump Input Box
The system SHALL provide an input box in the script panel header that allows users to enter a chapter number for quick navigation.

#### Scenario: Input box is visible in header
- **WHEN** user views the script panel
- **THEN** a text input box is displayed in the header area next to the chapter count

### Requirement: Jump to Chapter by Number
The system SHALL allow users to jump to a specific chapter by entering its number and pressing Enter.

#### Scenario: Jump to valid chapter
- **WHEN** user enters "5" and presses Enter
- **AND** there are at least 5 chapters
- **THEN** the view scrolls to chapter 5
- **AND** chapter 5 becomes selected

#### Scenario: Jump to first chapter
- **WHEN** user enters "1" and presses Enter
- **THEN** the view scrolls to chapter 1
- **AND** chapter 1 becomes selected

#### Scenario: Jump to last chapter
- **WHEN** user enters the total chapter count and presses Enter
- **THEN** the view scrolls to the last chapter
- **AND** the last chapter becomes selected

### Requirement: Search Chapter by Text
The system SHALL allow users to search and jump to a chapter by entering text that matches the chapter summary or content.

#### Scenario: Search by summary match
- **WHEN** user enters "战斗" and presses Enter
- **AND** a chapter summary contains "战斗"
- **THEN** the view scrolls to the first matching chapter
- **AND** that chapter becomes selected

#### Scenario: Search by content match
- **WHEN** user enters text that matches chapter content
- **THEN** the view scrolls to the first matching chapter
- **AND** that chapter becomes selected

#### Scenario: No matching chapter found
- **WHEN** user enters text that doesn't match any chapter
- **THEN** an error message "未找到匹配的章节" is displayed
- **AND** the error message disappears after 2 seconds

### Requirement: Invalid Input Handling
The system SHALL display an error message when user enters a chapter number outside the valid range.

#### Scenario: Input exceeds maximum
- **WHEN** user enters "100" and presses Enter
- **AND** there are only 10 chapters
- **THEN** an error message is displayed indicating the valid range (1-10)
- **AND** the error message disappears after 2 seconds

#### Scenario: Input is zero or negative
- **WHEN** user enters "0" or "-1" and presses Enter
- **THEN** an error message is displayed indicating the valid range
- **AND** the error message disappears after 2 seconds

#### Scenario: Input is empty
- **WHEN** user presses Enter without entering any text
- **THEN** no action is taken
- **AND** no error message is displayed
