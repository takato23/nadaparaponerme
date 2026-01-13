# Repository Guidelines

## Project Structure & Module Organization
- Application entrypoints live in `index.tsx` and `src/`.
- UI is split between `components/` (legacy/shared) and `src/components/` (newer flows); favor existing patterns in the area you touch.
- Core logic sits in `services/` and `src/services/` (AI, monetization, data access).
- Tests live in `tests/` (unit) and `e2e/` (Playwright). Static assets are in `public/`, docs in `docs/`, and Supabase functions/migrations in `supabase/`.

## Build, Test, and Development Commands
- `npm run dev` — start the Vite dev server.
- `npm run build` — produce a production build with Vite.
- `npm run preview` — serve the production build locally.
- `npm run test` — run the Vitest unit test suite once.
- `npm run verify-setup` — validate local setup (API keys, configuration).

## Coding Style & Naming Conventions
- TypeScript + React (Vite); use `.ts`/`.tsx` and keep types explicit where possible.
- Follow existing formatting in the touched file; there is no Prettier config, and ESLint is the primary style gate (`eslint.config.js`).
- Naming: components in `PascalCase`, hooks `useSomething`, variables/functions `camelCase`, constants `SCREAMING_SNAKE_CASE`.
- Tailwind is used throughout; prefer utility classes over custom CSS unless a component already uses a dedicated style.

## Testing Guidelines
- Unit tests use Vitest; add tests in `tests/` or alongside related modules when appropriate.
- E2E tests use Playwright (`playwright.config.ts`); run with `npx playwright test`.
- Keep tests deterministic and fast; favor small fixtures and explicit assertions.

## Commit & Pull Request Guidelines
- Recent commits commonly use prefixes like `feat:`, `fix:`, and occasional `Refactor:`/`Fix:`; keep messages short, descriptive, and imperative.
- PRs should describe user-facing changes, include test results (commands run), and attach screenshots/GIFs for UI updates.
- Link related issues or docs when the change touches product behavior or data schemas.

## Configuration & Security
- Environment variables live in `.env.local`; use `.env.example` as the reference and never commit secrets.
- Supabase changes should include migrations in `supabase/migrations/` and, if needed, Edge Functions in `supabase/functions/`.
