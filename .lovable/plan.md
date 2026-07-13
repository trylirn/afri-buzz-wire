# Fix: News feed showing empty

## What's actually broken

Server logs show two failures on every request:

1. **`Error: Server function info not found for 29c25...`** — `getRegionHome` / `getCategoryNews` (server fns) call `curateArticles` (also a server fn) directly. TanStack's server-fn runtime can't resolve the inner fn's ID in that path, so every category pipeline throws and `safe()` returns `[]`. That is why the homepage payload is all empty arrays.
2. **`AI_APICallError: Too Many Requests` (429) from the Lovable AI Gateway** — free-tier rate limit. Even once #1 is fixed, curation will intermittently fail, and right now that path also returns `[]` in some branches.

## Fix

### 1. Stop calling a server fn from inside a server fn

Refactor `src/lib/ai-curator.functions.ts`:
- Extract the curation logic into a plain exported `async function curateArticlesImpl({ region, topic, articles })`.
- Keep `curateArticles` as a thin `createServerFn` wrapper that just calls `curateArticlesImpl` (in case anything client-side still uses it).
- In `src/lib/news.functions.ts`, import and call `curateArticlesImpl` directly instead of `curateArticles({ data: ... })`. This is an in-process function call — no HTTP hop, no server-fn ID lookup.

### 2. Never return empty when the AI fails

In `curateArticlesImpl`:
- On any thrown error (including 429), on `NoObjectGeneratedError`, and on the existing "kept 0 of N" safety net → return the raw uncached articles merged with cached ones, sorted by date. User always sees news.
- Log the 429 as a warning, not an error spam loop.

### 3. Light rate-limit protection

- Cap AI batches: send at most 25 articles per call (was 40).
- On the region home, curation runs for 5 categories × 3 regions in parallel = 15 concurrent AI calls on a cold cache — that's what's triggering 429. Add a tiny in-process concurrency limiter (max 3 concurrent `generateObject` calls) inside `ai-curator.functions.ts`. No new deps; a small promise-queue helper.

## Files touched

- `src/lib/ai-curator.functions.ts` — extract `curateArticlesImpl`, add concurrency limiter, always-fallback-to-raw on error.
- `src/lib/news.functions.ts` — call `curateArticlesImpl` instead of the server-fn wrapper.

## Out of scope

- No UI changes.
- No new feeds / categories / AI prompt changes.
- No paid AI plan required — falls back gracefully when rate-limited.

## Verification

After the edit: reload `/`, confirm all three region blocks render articles, and check server logs no longer show `Server function info not found`. Remaining 429s (if any) will log as warnings and the raw feed shows instead.
