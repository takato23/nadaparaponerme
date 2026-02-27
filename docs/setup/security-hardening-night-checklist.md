# Security Hardening Night Checklist

## 1) Rotate secrets before public beta
1. Rotate `SUPABASE_SERVICE_ROLE_KEY` in Supabase dashboard.
2. Rotate `GEMINI_API_KEY` in Google AI Studio.
3. Update Supabase Edge secrets:
   - `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`
   - `supabase secrets set GEMINI_API_KEY=...`
4. Redeploy Edge Functions after rotation.

## 2) Required env vars for hardened behavior
1. `SECURITY_FAIL_CLOSED_HIGH_COST=true`
2. `ALLOWED_WEB_ORIGINS` with production domains (+ localhost for dev).
3. `PROXY_IMAGE_ALLOWED_HOSTS` allowlist for remote image proxy.
4. `PROXY_IMAGE_MAX_BYTES` and `PROXY_IMAGE_TIMEOUT_MS`.
5. Invite/proxy rate limits:
   - `RATE_LIMIT_CREATE_BETA_PER_MIN`
   - `RATE_LIMIT_CLAIM_BETA_PER_MIN`
   - `RATE_LIMIT_LIST_BETA_PER_MIN`
   - `RATE_LIMIT_PROXY_IMAGE_PER_MIN`
6. `BETA_INVITE_ADMIN_EMAILS` for explicit admin allowlist.

## 3) Deploy order
1. Deploy shared helpers + invite/proxy functions:
   - `create-beta-invite`
   - `claim-beta-invite`
   - `list-beta-invite-claims`
   - `proxy-image`
2. Deploy guarded IA endpoints:
   - `chat-stylist`
   - `generate-outfit`
   - `generate-image`
   - `generate-fashion-image`
   - `virtual-try-on`

## 4) Smoke tests
1. Admin can create beta invite link.
2. Non-admin cannot create invite (403).
3. Claim invite works once and trace list shows claimant.
4. Invite flood returns `429` with `Retry-After`.
5. `proxy-image`:
   - allows configured host image URL.
   - blocks non-allowlisted/invalid/private URLs.
6. `chat-stylist`:
   - returns `content`.
   - returns valid `outfitSuggestion` or `null` + `validation_warnings`.
7. `virtual-try-on` / image generation still work for valid user.
