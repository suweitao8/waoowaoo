## 1. Add Import Button to EpisodeSelector

- [x] 1.1 Add `onImportNovel` optional prop to EpisodeSelector component interface in `src/components/ui/CapsuleNav.tsx`
- [x] 1.2 Add "Import Novel" button next to "New Episode" button in EpisodeSelector dropdown menu
- [x] 1.3 Add i18n translation key for "Import Novel" button text

## 2. Create AppendNovelWizard Component

- [x] 2.1 Create `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/AppendNovelWizard.tsx` component
- [x] 2.2 Implement file upload UI with drag-and-drop support (reused from SmartImportWizard patterns)
- [x] 2.3 Add file validation (supported formats: .txt, .md, .text, max 5MB)
- [x] 2.4 Implement encoding detection and decoding logic (reuse from workspace/page.tsx)
- [x] 2.5 Implement chapter splitting logic (reuse `splitNovelByChapters` function)

## 3. Add Import Logic to Project Page

- [x] 3.1 Add state management for AppendNovelWizard in `src/app/[locale]/workspace/[projectId]/page.tsx`
- [x] 3.2 Implement `handleAppendNovel` callback to open the wizard
- [x] 3.3 Implement `handleAppendNovelComplete` callback to process imported chapters
- [x] 3.4 Calculate starting episode number based on existing episode count
- [x] 3.5 Add progress indication during import (progress bar with current chapter)
- [x] 3.6 Refresh episode list after import using `queryClient.invalidateQueries`
- [x] 3.7 Add option to navigate to first newly imported episode

## 4. Connect Components

- [x] 4.1 Pass `onImportNovel` callback from page.tsx to WorkspaceHeaderShell
- [x] 4.2 Pass `onImportNovel` callback from WorkspaceHeaderShell to EpisodeSelector
- [x] 4.3 Add state for wizard visibility in WorkspaceHeaderShell or page.tsx

## 5. Testing and Polish

- [x] 5.1 Test file upload with various encodings (UTF-8, GBK, GB18030, Big5)
- [x] 5.2 Test chapter splitting with different novel formats
- [x] 5.3 Test import cancellation preserves already imported episodes
- [x] 5.4 Test episode numbering starts correctly after existing episodes
- [x] 5.5 Verify i18n translations work correctly
