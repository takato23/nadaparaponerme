# Quick Reference: geminiService.ts Refactoring

**TL;DR**: Split 3,587-line monolith into 7 focused modules + shared config. Backward compatible. 2-3 workdays.

---

## Function Location Map

### Where to find each function after refactoring:

| Current Location | New Location | Function Name |
|-----------------|--------------|---------------|
| geminiService.ts | **config.ts** | `configureGeminiAPI` |
| geminiService.ts | **config.ts** | `getAIClient` (promoted from internal) |
| geminiService.ts | **config.ts** | `enrichError` (promoted from internal) |
| geminiService.ts | **config.ts** | `base64ToGenerativePart` (promoted) |
| geminiService.ts | **clothingAnalysis.ts** | `analyzeClothingItem` |
| geminiService.ts | **clothingAnalysis.ts** | `recognizeBrandAndPrice` |
| geminiService.ts | **clothingAnalysis.ts** | `findSimilarItems` |
| geminiService.ts | **outfitGeneration.ts** | `generateOutfit` |
| geminiService.ts | **outfitGeneration.ts** | `generateOutfitWithCustomPrompt` |
| geminiService.ts | **outfitGeneration.ts** | `generateWeatherOutfit` |
| geminiService.ts | **outfitGeneration.ts** | `generatePackingList` |
| geminiService.ts | **outfitGeneration.ts** | `searchShoppingSuggestions` |
| geminiService.ts | **chatAssistant.ts** | `chatWithFashionAssistant` |
| geminiService.ts | **chatAssistant.ts** | `generateMissingItem` |
| geminiService.ts | **chatAssistant.ts** | `parseOutfitFromChat` |
| geminiService.ts | **styleAnalysis.ts** | `analyzeColorPalette` |
| geminiService.ts | **styleAnalysis.ts** | `analyzeFeedbackPatterns` |
| geminiService.ts | **styleAnalysis.ts** | `analyzeClosetGaps` |
| geminiService.ts | **styleAnalysis.ts** | `analyzeStyleDNA` |
| geminiService.ts | **styleAnalysis.ts** | `analyzeStyleEvolution` |
| geminiService.ts | **styleAnalysis.ts** | `generateContent` |
| geminiService.ts | **styleAnalysis.ts** | `analyzeShoppingGaps` |
| geminiService.ts | **shoppingAssistant.ts** | `generateShoppingRecommendations` |
| geminiService.ts | **shoppingAssistant.ts** | `findDupeAlternatives` |
| geminiService.ts | **shoppingAssistant.ts** | `conversationalShoppingAssistant` |
| geminiService.ts | **creativeTools.ts** | `generateLookbook` |
| geminiService.ts | **creativeTools.ts** | `generateStyleChallenge` |
| geminiService.ts | **creativeTools.ts** | `generateCapsuleWardrobe` |
| geminiService.ts | **creativeTools.ts** | `generateFashionDesign` |
| geminiService.ts | **imageGeneration.ts** | `generateClothingImage` |
| geminiService.ts | **imageGeneration.ts** | `generateVirtualTryOn` |

**Total**: 30 exports (27 functions + 3 utilities)

---

## Schema Location Map

| Current Location | New Location | Schema Name |
|-----------------|--------------|-------------|
| geminiService.ts | **schemas/clothingSchemas.ts** | `clothingItemSchema` |
| geminiService.ts | **schemas/clothingSchemas.ts** | `brandRecognitionSchema` |
| geminiService.ts | **schemas/outfitSchemas.ts** | `fitResultSchema` |
| geminiService.ts | **schemas/outfitSchemas.ts** | `weatherOutfitSchema` |
| geminiService.ts | **schemas/outfitSchemas.ts** | `lookbookSchema` |
| geminiService.ts | **schemas/analysisSchemas.ts** | `colorPaletteSchema` |
| geminiService.ts | **schemas/analysisSchemas.ts** | `feedbackInsightsSchema` |
| geminiService.ts | **schemas/analysisSchemas.ts** | `closetGapAnalysisSchema` |
| geminiService.ts | **schemas/analysisSchemas.ts** | `styleDNASchema` |
| geminiService.ts | **schemas/shoppingSchemas.ts** | `dupeFinderSchema` |
| geminiService.ts | **schemas/shoppingSchemas.ts** | `shoppingGapSchema` (extract from inline) |
| geminiService.ts | **schemas/shoppingSchemas.ts** | `shoppingRecommendationSchema` (extract) |
| geminiService.ts | **schemas/miscSchemas.ts** | `packingListSchema` |
| geminiService.ts | **schemas/miscSchemas.ts** | `similarItemsSchema` |
| geminiService.ts | **schemas/miscSchemas.ts** | `styleChallengeSchema` |
| geminiService.ts | **schemas/miscSchemas.ts** | `capsuleWardrobeSchema` |

**Total**: 16 schemas (14 existing + 2 to extract from inline definitions)

---

## Import Path Cheat Sheet

### Before (Current)
```typescript
import { analyzeClothingItem } from '../services/geminiService';
```

### After - Option 1: Domain Import (Recommended)
```typescript
import { analyzeClothingItem } from '../services/ai/clothingAnalysis';
```

### After - Option 2: Barrel Import (Convenient)
```typescript
import { analyzeClothingItem } from '../services/ai';
```

### After - Option 3: Legacy Import (Deprecated)
```typescript
import { analyzeClothingItem } from '../services/geminiService'; // Still works!
```

---

## Module Responsibilities

### config.ts (120 lines)
**Responsibility**: API client management + shared utilities
**Exports**: `configureGeminiAPI`, `getAIClient`, `enrichError`, `base64ToGenerativePart`, `retryWithBackoff`
**Dependencies**: `@google/genai`, `../utils/retryWithBackoff`

---

### schemas/ (1,600 lines total)
**Responsibility**: Gemini structured output type definitions
**Exports**: 16 JSON schemas using `Type.OBJECT`
**Dependencies**: `@google/genai` (Type)

---

### clothingAnalysis.ts (300 lines)
**Responsibility**: Computer vision analysis of clothing items
**Functions**: `analyzeClothingItem`, `recognizeBrandAndPrice`, `findSimilarItems`
**AI Models**: `gemini-2.5-flash`
**Dependencies**: config, schemas/clothingSchemas, schemas/miscSchemas

---

### outfitGeneration.ts (400 lines)
**Responsibility**: AI outfit combination creation
**Functions**: `generateOutfit`, `generateOutfitWithCustomPrompt`, `generateWeatherOutfit`, `generatePackingList`, `searchShoppingSuggestions`
**AI Models**: `gemini-2.5-pro` (outfits), `gemini-2.5-flash` (search)
**Dependencies**: config, schemas/outfitSchemas, schemas/miscSchemas, weatherService, aiToneHelper

---

### chatAssistant.ts (350 lines)
**Responsibility**: Conversational fashion AI + item generation
**Functions**: `chatWithFashionAssistant`, `generateMissingItem`, `parseOutfitFromChat`
**AI Models**: `gemini-2.5-flash` (chat), `imagen-4.0-generate-001` (item generation)
**Dependencies**: config, imageGeneration, aiToneHelper

---

### styleAnalysis.ts (600 lines)
**Responsibility**: Advanced closet and style analysis
**Functions**: `analyzeColorPalette`, `analyzeFeedbackPatterns`, `analyzeClosetGaps`, `analyzeStyleDNA`, `analyzeStyleEvolution`, `generateContent`, `analyzeShoppingGaps`
**AI Models**: `gemini-2.5-flash`, `gemini-2.5-pro`
**Dependencies**: config, schemas/analysisSchemas, schemas/shoppingSchemas

---

### shoppingAssistant.ts (450 lines)
**Responsibility**: Smart shopping recommendations + dupe finding
**Functions**: `generateShoppingRecommendations`, `findDupeAlternatives`, `conversationalShoppingAssistant`
**AI Models**: `gemini-2.5-flash`
**Dependencies**: config, styleAnalysis (import analyzeShoppingGaps), schemas/shoppingSchemas

---

### creativeTools.ts (500 lines)
**Responsibility**: Lookbooks, challenges, capsule wardrobes, design
**Functions**: `generateLookbook`, `generateStyleChallenge`, `generateCapsuleWardrobe`, `generateFashionDesign`
**AI Models**: `gemini-2.5-pro`, `gemini-2.5-flash`
**Dependencies**: config, schemas/outfitSchemas, schemas/miscSchemas, imageGeneration

---

### imageGeneration.ts (250 lines)
**Responsibility**: AI image synthesis
**Functions**: `generateClothingImage`, `generateVirtualTryOn`
**AI Models**: `imagen-4.0-generate-001`, `gemini-2.5-flash-image`
**Dependencies**: config (only - no other AI modules)

---

## Critical Issues & Resolutions

### Issue 1: Duplicate Functions
**Problem**: `generateContent` appears in styleAnalysis.ts and creativeTools.ts
**Resolution**: Move to `config.ts` as shared utility

**Problem**: `analyzeShoppingGaps` appears in styleAnalysis.ts and shoppingAssistant.ts
**Resolution**: Keep in styleAnalysis.ts, import in shoppingAssistant.ts

---

### Issue 2: Inline Schemas
**Problem**: Two schemas defined inline in functions (shoppingGapSchema, shoppingRecommendationSchema)
**Resolution**: Extract to `schemas/shoppingSchemas.ts`

---

### Issue 3: Circular Dependency Risk
**Problem**: chatAssistant.ts → imageGeneration.ts, creativeTools.ts → imageGeneration.ts
**Resolution**: Accept unidirectional dependencies (safe - no reverse dependencies)

---

### Issue 4: Custom Retry Logic
**Problem**: `chatWithFashionAssistant` has custom retry logic duplicating `retryWithBackoff`
**Resolution**: Document for future consolidation (not part of refactoring scope)

---

## Files Modified/Created

### New Files (15)
```
services/ai/index.ts
services/ai/config.ts
services/ai/schemas/index.ts
services/ai/schemas/clothingSchemas.ts
services/ai/schemas/outfitSchemas.ts
services/ai/schemas/analysisSchemas.ts
services/ai/schemas/shoppingSchemas.ts
services/ai/schemas/miscSchemas.ts
services/ai/clothingAnalysis.ts
services/ai/outfitGeneration.ts
services/ai/chatAssistant.ts
services/ai/styleAnalysis.ts
services/ai/shoppingAssistant.ts
services/ai/creativeTools.ts
services/ai/imageGeneration.ts
```

### Modified Files (5)
```
services/geminiService.ts (becomes legacy re-export)
src/services/aiService.ts (update imports)
src/lib/gemini-dev-init.ts (update imports)
src/components/OutfitGenerationTestingPlayground.tsx (update imports)
services/professionalStylistService.ts (update imports)
```

---

## Implementation Checklist

### Phase 1: Schema Extraction (2-3 hours)
- [ ] Create `services/ai/schemas/` directory
- [ ] Create `schemas/clothingSchemas.ts` with 2 schemas
- [ ] Create `schemas/outfitSchemas.ts` with 3 schemas
- [ ] Create `schemas/analysisSchemas.ts` with 4 schemas
- [ ] Create `schemas/shoppingSchemas.ts` with 3 schemas (2 to extract)
- [ ] Create `schemas/miscSchemas.ts` with 4 schemas
- [ ] Create `schemas/index.ts` barrel export
- [ ] Update imports in `geminiService.ts`
- [ ] Run `npm run build` to verify
- [ ] Test 1 AI function (e.g., `analyzeClothingItem`)

---

### Phase 2: Config Extraction (2-3 hours)
- [ ] Create `services/ai/config.ts`
- [ ] Move `configureGeminiAPI` function
- [ ] Move `getAIClient` function (promote to export)
- [ ] Move `enrichError` function (promote to export)
- [ ] Move `base64ToGenerativePart` function (promote to export)
- [ ] Add re-export of `retryWithBackoff` from utils
- [ ] Update all schema files to import `Type` from config
- [ ] Update `geminiService.ts` to import from config
- [ ] Run `npm run build` to verify
- [ ] Test API client initialization

---

### Phase 3: Function Extraction (6-8 hours)
- [ ] Create `clothingAnalysis.ts` and move 3 functions
- [ ] Create `outfitGeneration.ts` and move 5 functions
- [ ] Create `chatAssistant.ts` and move 3 functions
- [ ] Create `styleAnalysis.ts` and move 7 functions
- [ ] Create `shoppingAssistant.ts` and move 3 functions (not duplicate)
- [ ] Create `creativeTools.ts` and move 4 functions
- [ ] Create `imageGeneration.ts` and move 2 functions
- [ ] Move `generateContent` to `config.ts`
- [ ] Create `ai/index.ts` barrel export
- [ ] Convert `geminiService.ts` to legacy re-export
- [ ] Run `npm run build` to verify
- [ ] Test all 27 AI functions (spot check 5+ critical ones)

---

### Phase 4: External Import Migration (2-3 hours)
- [ ] Update `src/services/aiService.ts` imports
- [ ] Update `src/lib/gemini-dev-init.ts` imports
- [ ] Update `src/components/OutfitGenerationTestingPlayground.tsx` imports
- [ ] Update `services/professionalStylistService.ts` imports
- [ ] Run `npm run build` to verify
- [ ] Full application regression test

---

### Phase 5: Documentation (2-3 hours)
- [ ] Add JSDoc comments to all exported functions
- [ ] Create `services/ai/README.md` with architecture overview
- [ ] Update `CLAUDE.md` with new import paths
- [ ] Add deprecation notice to legacy `geminiService.ts`
- [ ] Update `CHANGELOG.md` with refactoring details
- [ ] Create migration guide for developers

---

## Testing Checklist

### Build Verification
- [ ] `npm run build` succeeds without errors
- [ ] `npx tsc --noEmit` shows no type errors
- [ ] No circular dependency warnings
- [ ] Bundle size unchanged (~2.3MB)

### Function Verification (Spot Check)
- [ ] `analyzeClothingItem` works (upload clothing photo)
- [ ] `generateOutfit` works (generate outfit)
- [ ] `chatWithFashionAssistant` works (send chat message)
- [ ] `analyzeColorPalette` works (analyze closet colors)
- [ ] `findDupeAlternatives` works (find cheaper alternatives)

### Import Verification
- [ ] Legacy import still works: `import { X } from '../services/geminiService'`
- [ ] Barrel import works: `import { X } from '../services/ai'`
- [ ] Domain import works: `import { X } from '../services/ai/clothingAnalysis'`
- [ ] Edge Function imports work (check `src/services/aiService.ts`)

### Regression Testing
- [ ] All 27 AI functions callable
- [ ] No runtime errors in browser console
- [ ] No network errors in Edge Functions
- [ ] No type errors in IDE
- [ ] Performance unchanged (same API calls)

---

## Rollback Commands

### Emergency Rollback (< 5 minutes)
```bash
# Revert to previous commit
git revert HEAD
npm install
npm run build
npm run dev
```

### Partial Rollback (Keep Schemas)
```bash
# Revert only function modules, keep schema extraction
git checkout HEAD~1 -- services/ai/*.ts
git reset -- services/ai/schemas/
npm run build
```

---

## Common Issues & Solutions

### Issue: "Cannot find module 'services/ai/config'"
**Cause**: Import path incorrect
**Solution**: Use `./config` (relative) or `../ai/config` (from parent)

---

### Issue: "Type.OBJECT is not defined"
**Cause**: Missing import of `Type` from config
**Solution**: Add `import { Type } from '../config'` to schema file

---

### Issue: "Circular dependency detected"
**Cause**: Module A imports B, B imports A
**Solution**: Check dependency graph, refactor to unidirectional imports

---

### Issue: "getAIClient is not a function"
**Cause**: Not promoted to export from config.ts
**Solution**: Add `export` keyword to `getAIClient` function

---

### Issue: Edge Function deploy fails
**Cause**: Import path changed, Edge Function can't resolve
**Solution**: Keep legacy `geminiService.ts` re-export, update Edge Function imports gradually

---

## Success Criteria

✅ All 27 AI functions work unchanged
✅ Backward compatibility via legacy import
✅ No circular dependencies
✅ Max file size < 600 lines (83% reduction)
✅ Build succeeds
✅ No type errors
✅ No runtime errors
✅ Edge Functions work
✅ Documentation updated
✅ Tests passing (manual regression)

---

## Next Steps After Refactoring

1. **Add Unit Tests** (10-15 hours)
   - Create `services/ai/__tests__/` directory
   - Add tests for each module
   - Target 80%+ coverage

2. **Enable TypeScript Strict Mode** (6-8 hours)
   - Eliminate `any` types
   - Fix strict null checks
   - Improve type safety

3. **Consolidate Retry Logic** (2-3 hours)
   - Remove custom retry in `chatWithFashionAssistant`
   - Use unified `retryWithBackoff` utility

4. **API Key Server-Only Migration** (4-6 hours)
   - Remove client-side API key configuration
   - Enforce server-side only via Edge Functions

5. **Schema Type Generation** (8-10 hours)
   - Generate TypeScript types from schemas
   - Single source of truth for types

---

**Document Version**: 1.0
**Last Updated**: 2025-01-26
**Status**: ⏸️ READY FOR IMPLEMENTATION (pending approval)
