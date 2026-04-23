## 1. Database Schema

- [x] 1.1 Add `projectType` field to `NovelPromotionProject` type in `src/types/project.ts`
- [x] 1.2 Update Prisma schema with `projectType` field (default: 'animation')
- [x] 1.3 Generate and apply Prisma migration

## 2. API Layer

- [x] 2.1 Update project config update API to accept `projectType` parameter
- [x] 2.2 Update project query API to return `projectType` field

## 3. Project Settings UI

- [x] 3.1 Add project type selector to project settings modal
- [x] 3.2 Add translation keys for project types (zh/en)
- [x] 3.3 Wire up project type selector to save changes

## 4. Stage Navigation

- [x] 4.1 Update `useNovelPromotionWorkspaceController` to filter stages based on `projectType`
- [x] 4.2 Add `editor` stage to navigation (marked as "开发中")
- [x] 4.3 Hide `videos` stage for audiobook projects

## 5. Storyboard Panel UI

- [x] 5.1 Pass `projectType` prop to storyboard panel components
- [x] 5.2 Conditionally hide video generation buttons for audiobook projects

## 6. Verification

- [ ] 6.1 Test project type selection in settings
- [ ] 6.2 Verify video stage hidden for audiobook
- [ ] 6.3 Verify video buttons hidden in storyboard for audiobook
- [ ] 6.4 Verify all features visible for animation projects
