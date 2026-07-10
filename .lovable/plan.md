# Add Nigeria section + Twitter thread copy tools

## 1. Two top-level sections

Restructure the site so users clearly see two hubs:

- **Africa Pulse** — existing pan-African feeds (BBC Africa, AllAfrica).
- **Latest in Nigeria** — new region, powered by Nigeria-specific RSS feeds:
  - Premium Times Nigeria (`https://www.premiumtimesng.com/feed`)
  - Punch Nigeria (`https://punchng.com/feed/`)
  - Channels TV (`https://www.channelstv.com/feed/`)
  - Vanguard Nigeria (`https://www.vanguardngr.com/feed/`)
  - The Guardian Nigeria (`https://guardian.ng/feed/`)
  - AllAfrica Nigeria (`https://allafrica.com/tools/headlines/rdf/nigeria/headlines.rdf`)

Each region keeps the same four categories (Politics & Business, Sports, Entertainment, Tech), plus a "Top Stories" tab. The header nav becomes:

`Africa Pulse ▾` (Top / Politics & Business / Sports / Entertainment / Tech)
`Latest in Nigeria ▾` (same four + Top)

Routing (region added as a segment):

- `/` — homepage with both regions stacked (Africa first, Nigeria second, each with hero + 6 cards + "See all")
- `/africa` and `/nigeria` — region landing pages
- `/africa/$category` and `/nigeria/$category` — category pages
- `/article/$id` — unchanged

Old `/category/$slug` routes redirect to `/africa/$slug` so existing links keep working.

## 2. Twitter-thread copy tools on every article

On the article card AND the article detail page, add two dedicated copy buttons that produce paste-ready text for X:

**Copy tweet (text only)** — copies a punchy, journalistic post in the "BREAKING:/JUST IN:" style you described:

```
JUST IN: {Headline}.

{One or two short sentences from the description, trimmed to fit within 275 chars total so the whole tweet stays under 280.}
```

Rules for text generation:

- Prefix logic: if the headline already starts with `BREAKING`, `JUST IN`, `UPDATE`, keep it as-is; otherwise prepend `JUST IN:` for items published within the last 3 hours, `UPDATE:` for 3–12h, and no prefix for older/feature stories.
- Strip site suffixes like " — Premium Times", " | Punch", " - Channels TV".
- Convert straight quotes/entities, collapse whitespace, remove trailing ellipses from RSS teasers.
- Never include the URL in this button (so it can be tweet #1 of a thread).
- Character counter shown next to the button; auto-truncate the description (not the headline) at the last full word before 275 chars and append `…`.

**Copy source (reply tweet)** — copies the second tweet of the thread:

```
Source: {publication name} — {url}
```

The URL is the original article link. This is what the user pastes as a reply to their first tweet.

**Copy full thread** — convenience button that copies both, separated by `\n---\n`, so a power user can grab everything at once.

UI details:

- Small icon buttons (Copy, Link, ListOrdered from lucide-react) with tooltips.
- On click: write to clipboard via `navigator.clipboard.writeText`, then flash a "Copied" state for ~1.2s (checkmark icon).
- On the article detail page these live in a dedicated "Post to X" panel above the "Read full story" button, showing a live preview of tweet #1 and tweet #2 with character counts.
- On article cards a compact `Copy tweet` button appears on hover (always visible on mobile) so you can grab posts straight from the feed without opening each one.

## 3. Small fixes bundled in

- Fix the `timeAgo` hydration mismatch (server renders "44m ago", client re-renders "45m ago") by computing time-ago inside a `useEffect` after mount, rendering a stable ISO date on the server.
- Update `__root.tsx` title/description and the homepage hero copy to reflect the two-region structure.

4. Also add a 15 mins update intervals for all the news. So we get the latest news at 15 mins intervals 

## Technical section

- `src/lib/news.functions.ts`: add a `Region = "africa" | "nigeria"` type. Change `FEEDS` to `FEEDS[region][category]`. Update `getCategoryNews`, `getHomeNews` (returns `{ africa: {...}, nigeria: {...} }`), and `getArticle` to search both regions. Add a `guessBreaking(article)` helper returning the prefix based on publish age.
- New `src/lib/tweet.ts` (pure, client-safe): exports `buildTweetText(article)`, `buildSourceTweet(article)`, `buildThread(article)`, plus `TWEET_MAX = 280` and a `truncateForTweet` util. Unit-testable, no server deps.
- New `src/components/TweetActions.tsx`: renders the three copy buttons + optional preview. Used by `ArticleCard` (compact variant) and the article page (full variant).
- Routes: add `src/routes/africa.tsx` (layout), `src/routes/africa.index.tsx`, `src/routes/africa.$category.tsx`, and the same trio for `nigeria`. Keep `src/routes/category.$slug.tsx` as a thin redirect to `/africa/$slug`.
- `SiteHeader.tsx`: two nav groups with dropdowns (use existing shadcn `NavigationMenu` or a simple hover panel).
- `index.tsx`: fetch `getHomeNews()`, render two stacked region blocks with clear section headings and "See all Africa news" / "See all Nigeria news" links.
- All new copy happens client-side; no new secrets or backend calls.