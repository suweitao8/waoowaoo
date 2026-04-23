## 1. Type Definition Updates

- [x] 1.1 Add `height` and `body_type` fields to CharacterProfileData type in `src/types/character-profile.ts`

## 2. UI Implementation

- [x] 2.1 Add basic attributes section to CharacterEditModal with collapsible header
- [x] 2.2 Add input fields for gender, age, occupation, height, body_type
- [x] 2.3 Add personality tags editor (similar to CharacterProfileDialog)

## 3. Data Persistence

- [x] 3.1 Update handleSaveOnly to persist profileData changes
- [x] 3.2 Update handleSaveAndGenerate to persist profileData changes

## 4. Localization

- [x] 4.1 Add translation keys for new fields in `messages/zh/assets.json`
- [x] 4.2 Add translation keys for new fields in `messages/en/assets.json`

## 5. Verification

- [x] 5.1 Verify TypeScript check passes
- [ ] 5.2 Verify basic attributes are saved and loaded correctly
