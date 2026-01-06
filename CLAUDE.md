# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"No Tengo Nada Para Ponerme" (I Have Nothing to Wear) is a React + TypeScript fashion assistant app powered by Google's Gemini AI. The app helps users manage their clothing closet, generate outfit combinations, plan packing lists, and share fashion items with friends.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run all unit tests (Vitest + jsdom)
npm run test

# Run single test file
npx vitest run tests/usageTrackingService.test.ts

# Run E2E tests (Playwright, requires dev server on localhost:5173)
npx playwright test

# Lint
npx eslint .

# Type check (noEmit mode)
npx tsc --noEmit

# Verify setup
npm run verify-setup
```

### Backend Setup (Supabase)
```bash
# Link to remote project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Deploy ALL Edge Functions
supabase functions deploy analyze-clothing
supabase functions deploy generate-outfit
supabase functions deploy generate-packing-list
supabase functions deploy generate-image
supabase functions deploy generate-fashion-image
supabase functions deploy virtual-try-on
supabase functions deploy shopping-assistant
supabase functions deploy process-payment
supabase functions deploy create-payment-preference
supabase functions deploy mercadopago-webhook

# Set secrets for Edge Functions
supabase secrets set GEMINI_API_KEY=your_api_key
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=your_token
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key

# Or use the helper script
./scripts/fix-backend-secrets.sh
```

See `docs/setup/SETUP.md` for complete backend configuration guide.

### Environment Setup
Copy `.env.example` to `.env.local` and configure:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
- `VITE_MERCADOPAGO_PUBLIC_KEY`: MercadoPago public key (for payments)
- `VITE_V1_SAFE_MODE`: Set to `true` for conservative first launch
- `VITE_PAYMENTS_ENABLED`: Set to `false` to disable payments

Edge Function secrets (set via `supabase secrets set`):
- `GEMINI_API_KEY`: Your Gemini AI API key
- `MERCADOPAGO_ACCESS_TOKEN`: MercadoPago access token
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `APP_URL`: Production URL for payment callbacks (e.g., `https://tudominio.com`)

## Architecture

### Core State Management Pattern
The app uses a **centralized state management** pattern in `App.tsx` with:
- `useLocalStorage` hook for persistent state (closet items, saved outfits, user preferences)
- State is stored with prefixed keys: `ojodeloca-*` (e.g., `ojodeloca-closet`, `ojodeloca-saved-outfits`)
- View navigation system with 5 main views: `home | closet | community | saved | profile`
- Modal/overlay pattern for detail views and forms (all managed via boolean flags in App.tsx)

### AI Service Layer (`services/geminiService.ts`)
All Gemini AI interactions are centralized in a single service file with distinct functions:
- **`analyzeClothingItem`**: Uses `gemini-2.5-flash` with structured JSON schema to extract metadata from clothing images
- **`generateClothingImage`**: Uses `imagen-4.0-generate-001` to create product images from text descriptions
- **`generateOutfit`**: Uses `gemini-2.5-pro` with structured output to select matching top/bottom/shoes combinations from inventory
- **`generatePackingList`**: Uses `gemini-2.5-pro` to suggest travel clothing selections with outfit combinations
- **`findSimilarItems`**: Uses `gemini-2.5-flash` for visual similarity search across closet items
- **`searchShoppingSuggestions`**: Uses `gemini-2.5-flash` with Google Search grounding for shopping links
- **`generateVirtualTryOn`**: Uses `gemini-2.5-flash-image` with multi-image input for virtual outfit visualization

**Key Pattern**: All services use structured JSON output schemas (`Type.OBJECT`) to ensure type-safe responses. Images are passed as base64-encoded data URLs.

### Data Model Hierarchy
```
ClothingItem (stored in closet array)
  ├─ id: string (timestamp-based)
  ├─ imageDataUrl: string (base64 data URL)
  └─ metadata: ClothingItemMetadata
      ├─ category: 'top' | 'bottom' | 'shoes' | etc.
      ├─ subcategory: specific item type
      ├─ color_primary: dominant color
      ├─ neckline?: optional detail
      ├─ sleeve_type?: optional detail
      ├─ vibe_tags: string[] (style descriptors)
      └─ seasons: string[] (seasonal appropriateness)

FitResult (generated outfit)
  ├─ top_id, bottom_id, shoes_id (references to ClothingItem.id)
  ├─ explanation: string (AI-generated reasoning)
  └─ missing_piece_suggestion?: optional purchase suggestion

SavedOutfit (persisted outfit)
  ├─ id: string
  └─ FitResult fields (without missing_piece_suggestion)
```

### Component Organization
- **Root level**: `App.tsx` (main entry), `types.ts` (frontend types)
- **`components/`**: All view and utility components
  - View components: `*View.tsx` (full-screen modal/page components)
  - **`components/closet/`**: Closet-specific components (grid, sidebar, modals)
  - **`components/home/`**: Home view feature cards and widgets
  - **`components/ui/`**: Shared UI primitives (FloatingDock, modals, tooltips)
  - **`components/3d/`**: Three.js/React Three Fiber components
- **`hooks/`**: Custom React hooks (`useLocalStorage`, `useTheme`, `useUserCredits`)
- **`services/`** (root): AI services, Gemini integration, community features
- **`src/services/`**: Supabase CRUD services, payment/subscription services
- **`src/lib/supabase.ts`**: Supabase client singleton with auth, storage helpers
- **`src/types/api.ts`**: Database TypeScript types (auto-generated from Supabase)
- **`src/routes.tsx`**: Route path constants (Spanish URLs like `/armario`, `/perfil`)
- **`data/`**: Static data files (`sampleData.ts`, `communityData.ts`)
- **`contexts/`**: React context providers (`ThemeContext.tsx`)

### Path Alias
The project uses `@/` as an alias to the project root (configured in `vite.config.ts`):
```typescript
import { SomeComponent } from '@/components/SomeComponent';
```

### Navigation & View System
The app uses a **single-page application** pattern with:
1. Bottom/side navigation bar (`Navigation` component in App.tsx)
2. Main content area that renders based on `currentView` state
3. Modal overlays for detail views (controlled by boolean state flags)
4. Two-step wizard patterns for AI generation (e.g., `generate` → `result` views)

### Borrowed Items Feature
The app has a **friend closet integration** where users can:
1. View friends' closets (`FriendClosetView`)
2. Select items to "borrow" temporarily (`borrowedItems` state)
3. Generate outfits combining personal + borrowed items
4. Track which items are borrowed via `borrowedItemIds` Set

When generating outfits with borrowed items, the inventory is merged: `[...closet, ...borrowedItems]` and duplicates are removed before passing to AI.

### Filtering & Sorting System
Closet view implements:
- Text search across subcategory and color fields
- Category filtering: `top | bottom | shoes` (toggle on/off)
- Multi-property sorting with direction control stored in localStorage
- Sort options: date (newest/oldest), name (A-Z/Z-A), color (A-Z/Z-A)

All filtering/sorting is computed in `filteredCloset` memoized value.

### AI Generation Pattern
All AI generation features follow this pattern:
1. User enters prompt in `*View` component
2. Component calls handler in App.tsx (e.g., `handleGenerateFit`)
3. Handler sets loading state, calls service function, handles errors
4. On success, stores result and transitions to result view
5. Result view offers save/share/virtual-try-on actions

Error handling is user-facing with Spanish error messages.

## Styling & UI

- **Tailwind CSS** with custom configuration for glassmorphism effects
- Custom utility classes: `liquid-glass`, `animate-fade-in`, `shadow-soft`
- Dark mode support via theme context
- Material Symbols icons (loaded via Google Fonts)
- Mobile-first responsive design with `md:` breakpoints

## Key Concepts

### Virtual Try-On Flow
1. User generates or selects an outfit
2. Clicks "Virtual Try-On" button
3. Uploads a photo of themselves
4. AI composites outfit items onto user's photo
5. Result displayed in `VirtualTryOnView`

### Smart Packer Flow
1. User describes trip details (destination, duration, activities)
2. AI analyzes closet and selects versatile items
3. Returns packing list (item IDs) + markdown outfit suggestions
4. User sees selected items in grid + outfit combinations

### Onboarding System
- First-time users see `OnboardingView` modal
- Controlled by `hasOnboarded` localStorage flag
- Pre-populates closet with sample data after authentication
- Authentication is stored as `ojodeloca-is-authenticated` flag

## Backend Architecture (Supabase)

### Database Schema
- **PostgreSQL** with Row Level Security (RLS) enabled
- **10 core tables**: profiles, clothing_items, outfits, friendships, outfit_likes, outfit_comments, borrowed_items, packing_lists, activity_feed
- **Soft deletes**: Items marked with `deleted_at` timestamp
- **Denormalized counters**: likes_count, comments_count on outfits (updated via triggers)
- **JSONB fields**: ai_metadata for flexible AI-generated data

### Storage Buckets
- **clothing-images** (private): User clothing photos with RLS policies
- **avatars** (public): User profile pictures
- **outfit-shares** (public): Generated shareable outfit images

### Edge Functions (Serverless)
All AI operations proxied through Supabase Edge Functions for security:
- **analyze-clothing**: Gemini AI vision analysis of clothing images
- **generate-outfit**: AI outfit generation from user's closet
- **generate-packing-list**: Smart travel packing suggestions
- **generate-image** / **generate-fashion-image**: AI image generation (Imagen)
- **virtual-try-on**: Virtual outfit visualization on user photos
- **shopping-assistant**: Conversational shopping recommendations
- **process-payment** / **create-payment-preference** / **mercadopago-webhook**: Payment processing (MercadoPago)

### Authentication
- Supabase Auth with email/password
- JWT tokens for API authorization
- Auto-profile creation trigger on signup
- RLS policies enforce data privacy per user

### API Integration
- Client: `@supabase/supabase-js` in `src/lib/supabase.ts`
- Types: Full TypeScript definitions in `src/types/api.ts`
- Helper functions: getCurrentUser, uploadImage, compressImage, etc.

### Migration from localStorage
- Legacy code still uses localStorage (for backward compatibility)
- New implementations should use Supabase client
- Gradual migration strategy to avoid breaking changes

## Feature Implementation Pattern

All features in this project follow a consistent 7-step implementation pattern:

### Standard Feature Implementation Steps

1. **Types**: Define interfaces in `types.ts` (frontend) and `src/types/api.ts` (database)
2. **Database Migration**: Create migration in `supabase/migrations/` if persistence needed
   - Format: `YYYYMMDDHHMMSS_feature_name.sql`
   - Include: Table creation, RLS policies, indexes, triggers
3. **Service Layer**:
   - AI generation: Add function to `services/geminiService.ts` using Gemini 2.5 Pro with structured JSON
   - CRUD operations: Create service file in `src/services/` if using Supabase
4. **Component**: Create view component in `components/` following modal pattern
   - Use `liquid-glass` styling, dark mode support
   - Full-screen modal with header, content area, actions
   - Loading states with `Loader` component
5. **Integration**:
   - Add state management to `App.tsx` (boolean show flag)
   - Add feature card to `HomeView.tsx`
   - Render modal conditionally in App.tsx
6. **Build & Test**: Run `npm run build` to verify no errors
7. **Documentation**: Update `CHANGELOG.md` with complete feature documentation

### Feature Documentation Template (CHANGELOG.md)

Each completed feature should include:
- Description (1-2 sentences)
- Functionalities (bullet list)
- Components (files created/modified with line counts)
- Technologies (libraries, AI models, APIs used)
- Prompt Engineering (system instructions for AI features)
- Testing Manual (checklist with [x] marks)
- Métricas de Éxito (success metrics with ✅)

## Project Status & Roadmap

**Current Progress**: 20/20 features completed (100% of roadmap v2.0) ✅

### All Features Completed ✅
- **FASE 1** (100%): Analytics Dashboard, Color Palette Analyzer, Versatility Score
- **FASE 2** (100%): Fashion Chat Assistant, Weather-Aware Outfits
- **FASE 3** (100%): Weekly Outfit Planner, Google Calendar Sync
- **FASE 4** (100%): Lookbook Creator, Style Challenge Generator, Outfit Rating System, AI Feedback Analyzer
- **FASE 5** (100%): Closet Gap Analysis, Brand & Price Recognition, Dupe Finder
- **FASE 6** (100%): Capsule Wardrobe Builder, Style DNA Profile, AI Fashion Designer, Style Evolution Timeline

### Virtual Shopping Assistant (Bonus) ✅
**Feature 23**: Conversational shopping assistant with gap analysis, brand recognition, and smart recommendations

**Status**: Production ready with 26 AI-powered features

See `CHANGELOG.md` for complete feature documentation and implementation details.

## Important Implementation Notes

- **State persistence**: Transitioning from localStorage to Supabase backend
- **Image handling**: Images stored in Supabase Storage, referenced by URL in database
- **ID generation**: Database uses UUID v4 (auto-generated), legacy uses timestamp-based IDs
- **AI token optimization**: Only metadata sent to AI for outfit generation via Edge Functions
- **Spanish language**: UI and AI prompts are in Spanish
- **No TypeScript strict mode**: `noEmit: true` and loose type checking enabled
- **Free tier optimization**: Designed to work within Supabase free tier limits (500MB DB, 1GB storage, 2GB bandwidth/month)
- **Error handling**: Supabase service layers include fallback for missing tables (returns empty arrays instead of throwing)
- **Migration execution**: All database migrations must be applied via `supabase db push` before features work

## Service Layer Split

The codebase has two service directories:

| Directory | Purpose | Examples |
|-----------|---------|----------|
| `services/` (root) | AI/Gemini services, social features | `geminiService.ts`, `communityService.ts`, `weatherService.ts` |
| `src/services/` | Supabase CRUD, payments, subscriptions | `closetService.ts`, `paymentService.ts`, `authService.ts` |

When adding new features:
- AI generation logic → `services/geminiService.ts` or new file in `services/`
- Database CRUD → new file in `src/services/`
- Edge Function calls → `src/services/edgeFunctionClient.ts`
