## Africa News Site — Plan

A clean, modern news website surfacing real, up-to-date Africa news from the GNews API, organized into four categories so stories are easy to share on social media.

### Pages / Routes
- `/` — Homepage. Hero (top Africa story with image), grid of latest headlines across categories, trending strip.
- `/category/politics-business` — Politics & Business
- `/category/sports` — Sports (AFCON, football, athletics)
- `/category/entertainment` — Entertainment & Culture (music, Nollywood)
- `/category/tech` — Tech & Science
- `/article/$id` — Article detail (headline, image, description, source, published date, "Read full story" link, social share buttons for X, WhatsApp, Facebook, LinkedIn).

### Data source
- **GNews API** (`https://gnews.io/api/v4/search`), server-side only.
- Filters: `q=africa` + category keywords, `lang=en`, `max=10`, `sortby=publishedAt`.
  - Politics/Business: `africa AND (politics OR economy OR business OR government)`
  - Sports: `africa AND (football OR AFCON OR athletics OR sports)`
  - Entertainment: `africa AND (music OR Nollywood OR Afrobeats OR entertainment)`
  - Tech: `africa AND (technology OR startup OR science OR innovation)`
- API key never reaches the browser.
- Cached in TanStack Query for 5 minutes to stay fresh without burning the free-tier quota (100 req/day).

### Design
Editorial newspaper feel — bold serif headlines (Playfair Display), clean sans body (Inter), warm off-white background, deep charcoal text, single Africa-inspired terracotta accent (`#C1440E`). Card grid with large cover images, source + timestamp, category chip.

Header: "Africa Pulse" wordmark + category nav. Footer: attribution to GNews.

### Technical
- `GNEWS_API_KEY` stored as a secret (you'll provide it — free at gnews.io/register).
- `src/lib/news.functions.ts` — `createServerFn` calls: `getTopStories()`, `getCategoryNews(slug)`, `getArticle(id)`.
- Articles identified by URL-safe hash of source URL; detail page reads from the same cached list.
- Routes use `context.queryClient.ensureQueryData(...)` + `useSuspenseQuery`.
- Error/notFound components on every route. Graceful "no news available" fallback if the API fails.
- Per-route head() metadata for SEO and social share previews.

### After plan approval
I'll request the `GNEWS_API_KEY` before wiring up the fetch layer.
