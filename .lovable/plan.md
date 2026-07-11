## Goals

1. Split header into three destination pages: **Africa Pulse**, **Latest in Nigeria**, **America Stories** (home becomes a landing hub, not a stacked feed).
2. Expand category coverage per region.
3. Guarantee newest-first ordering everywhere.
4. Use AI (Lovable AI Gateway) to (a) filter out items irrelevant to the region and (b) score/keep only likely-viral stories, then (c) rewrite each kept story into a punchy, human tweet.
5. Every article carries its source image; the "Copy tweet" action copies text **and** image together so pasting into X attaches the picture.
6. Add America Stories with the same feature set.

## Pages & navigation

Header nav becomes: `Africa Pulse` · `Latest in Nigeria` · `America Stories` · (`Home` logo).

Routes:
- `/` — hub: hero + 3 region cards + top 3 viral picks from each region.
- `/africa` and `/africa/$category`
- `/nigeria` and `/nigeria/$category`
- `/america` and `/america/$category` (new)
- `/article/$id` (unchanged, works for all regions)

Old `/category/$slug` keeps redirecting to `/africa/$slug`.

## Categories (per region)

Shared base + region-specific extras:

- **Africa Pulse**: Top Stories, Breaking, Politics & Government, Business & Economy, Security & Conflict, Sports (AFCON focus), Entertainment & Culture, Tech & Science, Health, Xenophobia & Migration.
- **Latest in Nigeria**: Top Stories, Breaking, Politics & Government, Business & Naira/FX, Security (banditry, kidnapping), State Developments, Sports, Entertainment (Naija), Tech, Education/Facts, Viral & Human Interest.
- **America Stories**: Top Stories, Breaking, Politics (White House, Congress), Business & Markets, Crime & Justice, Sports (NFL/NBA/MLB), Entertainment (Hollywood), Tech, Health, Viral & Human Interest.

Feeds added: for Nigeria — CBN FX page + Sahara Reporters + Legit.ng RSS; for America — AP Top, Reuters US, NYT Home, CBS News, ESPN, Variety, TechCrunch, CNN US.

## Ordering

`fetchCategory` already sorts by `Date.parse(publishedAt)` desc. Confirming and adding a fallback: items missing dates get pushed to the bottom (not the top, as `|| 0` currently does). Also drop items older than 7 days for "Top" and "Breaking" tabs.

## AI filtering & tweet rewriting

New server function `curateArticles(region, articles)` in `src/lib/ai-curator.functions.ts`:

- Sends a compact JSON list `[{id, title, description, source}]` (max 40 items per call) to Lovable AI Gateway.
- Model: `google/gemini-2.5-flash` (fast, cheap, good at classification).
- Prompt asks the model to, per article, return:
  ```
  { id, keep: boolean, region_relevant: boolean, virality: 1–10,
    tweet: "<=270 char punchy human tweet, no hashtags spam, optional
             leading BREAKING:/JUST IN: when appropriate, no URL" }
  ```
- Keep only `keep && region_relevant && virality >= 6`, sort by virality desc within recency buckets (newest 6h first, then older).
- Cache curation output for 15 min keyed by `region+category+ids-hash` in an in-memory Map so we don't re-hit the model on every request.
- Graceful fallback: if AI call fails or key missing, we return the raw feed with the current heuristic-generated tweet, so the site never breaks.

Region-relevance rule embedded in prompt:
- Africa: story must be about an African country, African person, or Africa-wide topic. A Frenchman scoring in Ligue 1 = drop. A Moroccan winning at AFCON = keep.
- Nigeria: must involve Nigeria, Nigerians abroad, Naira/FX, or directly affect Nigerians.
- America: must involve the US, Americans, US markets, or directly affect US audiences.

Virality signals we tell the model to weight: corruption, disaster, scandal, breaking security incidents, big-money government projects, celebrity drama, sports wins, human-interest video moments, viral clips, FX rate moves, "facts" thread material.

## Tweet copy with image

`TweetActions` upgrade:
- **Copy tweet + image** (primary): fetches `article.image` server-side through a small proxy route `api/img?u=<url>` (avoids CORS), then uses `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob, 'text/plain': text })])`. On paste into X's web composer this attaches the image and fills the text.
- **Copy text only** (fallback for browsers without ClipboardItem image support — Safari/Firefox).
- **Copy source reply** (unchanged).
- **Download image** button (belt-and-braces so users can drag it into X mobile).

If no image on the article, the button gracefully degrades to text-only and hides the image affordance.

## AI-key handling

Requires `LOVABLE_API_KEY`. If not present in the sandbox, we call `ai_gateway--create` during build to provision it. Read only inside `.handler()`.

## Files touched / created

Created:
- `src/lib/ai-curator.functions.ts` — `curateArticles` server fn + in-memory cache.
- `src/lib/ai-gateway.server.ts` — provider helper (per knowledge card).
- `src/routes/api/img.ts` — image proxy for clipboard write.
- `src/routes/index.tsx` rewritten as hub landing.
- (New region tree stays on existing `$region.*` files — America added via `VALID` list update.)

Edited:
- `src/lib/news.functions.ts` — add America feeds, add new categories, tighten sort, integrate `curateArticles` in `fetchCategory` result path.
- `src/components/SiteHeader.tsx` — new 3-item top nav; category dropdown per region page (not stacked on every screen).
- `src/components/TweetActions.tsx` — clipboard image support + download button.
- `src/components/ArticleCard.tsx` — use AI-written `tweet` when present.
- `src/routes/$region.tsx` — add `america` to VALID.
- `src/routes/$region.index.tsx` / `$region.$category.tsx` — render curated list, use `article.tweet` for previews.
- `src/routes/__root.tsx` — site title/description update to reflect 3 regions.

## Out of scope

- No user accounts, no scheduled posting to X (copy-paste only, as before).
- No paid news APIs; RSS + AI curation only.

## Technical notes

- AI curator batch size 40, one call per category fetch. Home hub triggers 3 calls total (top per region) — cheap on Gemini Flash.
- `ClipboardItem` with image blobs works on Chromium and modern Safari; Firefox falls back to text-only automatically.
- Image proxy route must set `cache-control: public, max-age=3600` and cap response size at ~5 MB to protect the worker.
- All AI calls use `generateText` with `Output.object` (zod schema) so parsing is strict; failures fall back to heuristic path.
