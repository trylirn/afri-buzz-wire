import { createServerFn } from "@tanstack/react-start";
import { XMLParser } from "fast-xml-parser";
import { curateArticlesImpl } from "./ai-curator.server";
import type { Article, Region, CategorySlug } from "./news-types";
export type { Article, Region, CategorySlug } from "./news-types";


type Feed = { url: string; source: string };

const AFRICA_FEEDS: Partial<Record<CategorySlug, Feed[]>> = {
  top: [
    { url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml", source: "BBC Africa" },
    { url: "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", source: "AllAfrica" },
  ],
  "politics-business": [
    { url: "https://allafrica.com/tools/headlines/rdf/business/headlines.rdf", source: "AllAfrica Business" },
    { url: "https://allafrica.com/tools/headlines/rdf/governance/headlines.rdf", source: "AllAfrica Governance" },
  ],
  security: [
    { url: "https://allafrica.com/tools/headlines/rdf/conflict/headlines.rdf", source: "AllAfrica Conflict" },
  ],
  sports: [
    { url: "https://allafrica.com/tools/headlines/rdf/sport/headlines.rdf", source: "AllAfrica Sport" },
    { url: "https://feeds.bbci.co.uk/sport/football/africa/rss.xml", source: "BBC Sport Africa" },
  ],
  entertainment: [
    { url: "https://allafrica.com/tools/headlines/rdf/entertainment/headlines.rdf", source: "AllAfrica Entertainment" },
    { url: "https://allafrica.com/tools/headlines/rdf/music/headlines.rdf", source: "AllAfrica Music" },
  ],
  tech: [
    { url: "https://allafrica.com/tools/headlines/rdf/ict/headlines.rdf", source: "AllAfrica Tech" },
    { url: "https://allafrica.com/tools/headlines/rdf/science/headlines.rdf", source: "AllAfrica Science" },
  ],
  health: [
    { url: "https://allafrica.com/tools/headlines/rdf/health/headlines.rdf", source: "AllAfrica Health" },
  ],
};

const NIGERIA_FEEDS: Partial<Record<CategorySlug, Feed[]>> = {
  top: [
    { url: "https://www.premiumtimesng.com/feed", source: "Premium Times" },
    { url: "https://punchng.com/feed/", source: "Punch" },
    { url: "https://www.channelstv.com/feed/", source: "Channels TV" },
    { url: "https://www.vanguardngr.com/feed/", source: "Vanguard" },
    { url: "https://guardian.ng/feed/", source: "The Guardian NG" },
    { url: "https://allafrica.com/tools/headlines/rdf/nigeria/headlines.rdf", source: "AllAfrica Nigeria" },
    { url: "https://saharareporters.com/feeds/latest/feed", source: "Sahara Reporters" },
  ],
  "politics-business": [
    { url: "https://punchng.com/topics/politics/feed/", source: "Punch Politics" },
    { url: "https://www.vanguardngr.com/category/business/feed/", source: "Vanguard Business" },
    { url: "https://guardian.ng/category/business-services/feed/", source: "Guardian NG Business" },
  ],
  security: [
    { url: "https://www.premiumtimesng.com/feed", source: "Premium Times" },
    { url: "https://saharareporters.com/feeds/latest/feed", source: "Sahara Reporters" },
  ],
  sports: [
    { url: "https://www.premiumtimesng.com/category/sports/feed", source: "Premium Times Sports" },
    { url: "https://punchng.com/sports/feed/", source: "Punch Sports" },
    { url: "https://guardian.ng/category/sport/feed/", source: "Guardian NG Sport" },
  ],
  entertainment: [
    { url: "https://www.premiumtimesng.com/category/entertainment/feed", source: "Premium Times Entertainment" },
    { url: "https://punchng.com/topics/entertainment/feed/", source: "Punch Entertainment" },
    { url: "https://guardian.ng/category/life/feed/", source: "Guardian NG Life" },
  ],
  tech: [
    { url: "https://guardian.ng/category/technology/feed/", source: "Guardian NG Tech" },
    { url: "https://punchng.com/topics/technology/feed/", source: "Punch Tech" },
  ],
  health: [
    { url: "https://www.premiumtimesng.com/category/health/feed", source: "Premium Times Health" },
    { url: "https://guardian.ng/category/features/health/feed/", source: "Guardian NG Health" },
  ],
  fx: [
    { url: "https://www.vanguardngr.com/category/business/feed/", source: "Vanguard Business" },
    { url: "https://guardian.ng/category/business-services/feed/", source: "Guardian NG Business" },
  ],
};

const AMERICA_FEEDS: Partial<Record<CategorySlug, Feed[]>> = {
  top: [
    { url: "https://feeds.apnews.com/rss/apf-topnews", source: "AP News" },
    { url: "https://feeds.nbcnews.com/nbcnews/public/news", source: "NBC News" },
    { url: "https://www.cbsnews.com/latest/rss/main", source: "CBS News" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", source: "NYT" },
  ],
  "politics-business": [
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", source: "NYT Politics" },
    { url: "https://feeds.nbcnews.com/nbcnews/public/politics", source: "NBC Politics" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", source: "NYT Business" },
  ],
  security: [
    { url: "https://feeds.nbcnews.com/nbcnews/public/us-news", source: "NBC US" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/US.xml", source: "NYT US" },
  ],
  sports: [
    { url: "https://www.espn.com/espn/rss/news", source: "ESPN" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml", source: "NYT Sports" },
  ],
  entertainment: [
    { url: "https://variety.com/feed/", source: "Variety" },
    { url: "https://www.hollywoodreporter.com/feed/", source: "Hollywood Reporter" },
  ],
  tech: [
    { url: "https://techcrunch.com/feed/", source: "TechCrunch" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", source: "NYT Tech" },
  ],
  health: [
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml", source: "NYT Health" },
  ],
};

const FEEDS: Record<Region, Partial<Record<CategorySlug, Feed[]>>> = {
  africa: AFRICA_FEEDS,
  nigeria: NIGERIA_FEEDS,
  america: AMERICA_FEEDS,
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

function toId(region: Region, link: string): string {
  const b = btoa(unescape(encodeURIComponent(link)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${region}_${b}`;
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item: Record<string, unknown>, description: string): string | null {
  const media = item["media:content"] || item["media:thumbnail"];
  if (media) {
    const arr = Array.isArray(media) ? media : [media];
    for (const m of arr) {
      const url = (m as { "@_url"?: string })?.["@_url"];
      if (url) return url;
    }
  }
  const enclosure = item.enclosure as { "@_url"?: string; "@_type"?: string } | undefined;
  if (enclosure?.["@_url"] && (enclosure["@_type"] ?? "").startsWith("image")) {
    return enclosure["@_url"];
  }
  const content = (item["content:encoded"] ?? "") as string;
  const match = (description + " " + content).match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

async function fetchFeed(feed: Feed, category: string, region: Region): Promise<Article[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (AfricaPulse RSS)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parser.parse(xml);

    let items: Record<string, unknown>[] = [];
    if (parsed?.rss?.channel?.item) {
      items = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];
    } else if (parsed?.["rdf:RDF"]?.item) {
      items = Array.isArray(parsed["rdf:RDF"].item)
        ? parsed["rdf:RDF"].item
        : [parsed["rdf:RDF"].item];
    } else if (parsed?.feed?.entry) {
      items = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
    }

    return items
      .map((item): Article | null => {
        const titleRaw = item.title;
        const title = typeof titleRaw === "string" ? titleRaw : (titleRaw as { "#text"?: string })?.["#text"] ?? "";
        const linkRaw = item.link;
        let link = "";
        if (typeof linkRaw === "string") link = linkRaw;
        else if (Array.isArray(linkRaw)) link = (linkRaw[0] as { "@_href"?: string })?.["@_href"] ?? String(linkRaw[0]);
        else if (linkRaw && typeof linkRaw === "object") link = (linkRaw as { "@_href"?: string; "#text"?: string })["@_href"] ?? (linkRaw as { "#text"?: string })["#text"] ?? "";

        const descRaw = (item.description ?? item.summary ?? "") as string | { "#text"?: string };
        const descriptionHtml = typeof descRaw === "string" ? descRaw : descRaw?.["#text"] ?? "";
        const description = stripHtml(descriptionHtml).slice(0, 400);

        const pubDate = (item.pubDate ?? item["dc:date"] ?? item.published ?? "") as string;

        if (!title || !link) return null;
        return {
          id: toId(region, link),
          title: stripHtml(title),
          description,
          link,
          source: feed.source,
          publishedAt: pubDate,
          image: extractImage(item, descriptionHtml),
          category,
          region,
        };
      })
      .filter((a): a is Article => a !== null);
  } catch (err) {
    console.error(`Feed fetch failed: ${feed.url}`, err);
    return [];
  }
}

async function fetchRawCategory(region: Region, slug: CategorySlug): Promise<Article[]> {
  // Fall back to region top feeds for slugs without dedicated feeds
  const feeds = FEEDS[region][slug] ?? FEEDS[region].top ?? [];
  const results = await Promise.all(feeds.map((f) => fetchFeed(f, slug, region)));
  const merged = results.flat();

  // Deduplicate by title
  const seen = new Set<string>();
  const deduped = merged.filter((a) => {
    const key = a.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort descending by publish date, undated items to the bottom
  deduped.sort((a, b) => {
    const ta = Date.parse(a.publishedAt);
    const tb = Date.parse(b.publishedAt);
    const va = isNaN(ta) ? -Infinity : ta;
    const vb = isNaN(tb) ? -Infinity : tb;
    return vb - va;
  });

  return deduped;
}

async function curatedCategory(region: Region, slug: CategorySlug, limit = 30): Promise<Article[]> {
  const raw = await fetchRawCategory(region, slug);
  if (!raw.length) {
    console.error(`No raw RSS articles fetched at all for ${region}/${slug}`);
    return [];
  }
  const { articles } = await curateArticlesImpl({
    region,
    topic: slug,
    articles: raw.slice(0, 40),
  });
  return articles.slice(0, limit);
}

export const getCategoryNews = createServerFn({ method: "GET" })
  .inputValidator((data: { region: Region; slug: CategorySlug }) => data)
  .handler(async ({ data }) => {
    const articles = await curatedCategory(data.region, data.slug, 30);
    return { articles };
  });

// Runs a settled promise and returns [] instead of throwing, so one slow or
// failed region/category can never take the whole page down with it.
async function safe(p: Promise<Article[]>): Promise<Article[]> {
  const r = await Promise.allSettled([p]);
  const [result] = r;
  if (result.status === "fulfilled") return result.value;
  console.error("category pipeline failed", result.reason);
  return [];
}

export const getRegionHome = createServerFn({ method: "GET" })
  .inputValidator((data: { region: Region }) => data)
  .handler(async ({ data }) => {
    const [top, politics, sports, entertainment, tech] = await Promise.all([
      safe(curatedCategory(data.region, "top", 15)),
      safe(curatedCategory(data.region, "politics-business", 6)),
      safe(curatedCategory(data.region, "sports", 6)),
      safe(curatedCategory(data.region, "entertainment", 6)),
      safe(curatedCategory(data.region, "tech", 6)),
    ]);
    return {
      top,
      politicsBusiness: politics,
      sports,
      entertainment,
      tech,
    };
  });

export const getHomeNews = createServerFn({ method: "GET" }).handler(async () => {
  const regions: Region[] = ["africa", "nigeria", "america"];
  const [africa, nigeria, america] = await Promise.all(
    regions.map((r) => safe(curatedCategory(r, "top", 6))),
  );
  return {
    africa: { top: africa },
    nigeria: { top: nigeria },
    america: { top: america },
  };
});

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const region: Region = data.id.startsWith("nigeria_")
      ? "nigeria"
      : data.id.startsWith("america_")
        ? "america"
        : "africa";
    // Look in raw category feeds (curation drops it if virality low, but detail should still resolve)
    const slugs: CategorySlug[] = ["top", "politics-business", "sports", "entertainment", "tech"];
    const all = await Promise.all(slugs.map((s) => fetchRawCategory(region, s)));
    const found = all.flat().find((a) => a.id === data.id);
    if (!found) return { article: null };
    // Curate this single one to attach a tweet
    const { articles } = await curateArticlesImpl({
      region,
      topic: "top",
      articles: [found],
    });
    return { article: articles[0] ?? found };
  });
