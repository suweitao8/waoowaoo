## 1. Update Constants

- [x] 1.1 Add unified `IMAGE_ASPECT_RATIO_16_9 = '16:9'` constant in `src/lib/constants.ts`
- [x] 1.2 Update `CHARACTER_ASSET_IMAGE_RATIO` to reference the unified constant
- [x] 1.3 Update `PROP_IMAGE_RATIO` to reference the unified constant
- [x] 1.4 Update `LOCATION_IMAGE_RATIO` to reference the unified constant
- [x] 1.5 Update `CHARACTER_IMAGE_SIZE` to `'1920x1080'` (16:9, 2K)
- [x] 1.6 Update `LOCATION_IMAGE_SIZE` to `'1920x1080'` (16:9, 2K)

## 2. Update Tests

- [x] 2.1 Update test expectations in `tests/unit/worker/reference-to-character.test.ts`
- [x] 2.2 Update test expectations in `tests/unit/worker/asset-hub-image-suffix.test.ts`
- [x] 2.3 Verify all image-related tests pass with new ratio

## 3. Verification

- [x] 3.1 Test character image generation produces 16:9 images
- [x] 3.2 Test location image generation produces 16:9 images
- [x] 3.3 Test prop image generation produces 16:9 images
