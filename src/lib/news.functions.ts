import { createServerFn } from "@tanstack/react-start";
import { XMLParser } from "fast-xml-parser";

export type Article = {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  publishedAt: string;
  image: string | null;
  category: string;
  region: Region;
};

export type Region = "africa" | "nigeria";

export type CategorySlug =
  | "politics-business"
  | "sports"
  | "entertainment"
  | "tech"
  | "top";

type Feed = { url: string; source: string };

const AFRICA_FEEDS: Record<CategorySlug, Feed[]> = {
  top: [
    { url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml", source: "BBC Africa" },
    { url: "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", source: "AllAfrica" },
  ],
  "politics-business": [
    { url: "https://allafrica.com/tools/headlines/rdf/business/headlines.rdf", source: "AllAfrica Business" },
    { url: "https://allafrica.com/tools/headlines/rdf/governance/headlines.rdf", source: "AllAfrica Governance" },
    { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business" },
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
};

const NIGERIA_FEEDS: Record<CategorySlug, Feed[]> = {
  top: [
    { url: "https://www.premiumtimesng.com/feed", source: "Premium Times" },
    { url: "https://punchng.com/feed/", source: "Punch" },
    { url: "https://www.channelstv.com/feed/", source: "Channels TV" },
    { url: "https://www.vanguardngr.com/feed/", source: "Vanguard" },
    { url: "https://guardian.ng/feed/", source: "The Guardian NG" },
    { url: "https://allafrica.com/tools/headlines/rdf/nigeria/headlines.rdf", source: "AllAfrica Nigeria" },
  ],
  "politics-business": [
    { url: "https://www.premiumtimesng.com/category/news/top-news/feed", source: "Premium Times Politics" },
    { url: "https://punchng.com/topics/politics/feed/", source: "Punch Politics" },
    { url: "https://www.vanguardngr.com/category/business/feed/", source: "Vanguard Business" },
    { url: "https://guardian.ng/category/business-services/feed/", source: "Guardian NG Business" },
  ],
  sports: [
    { url: "https://www.premiumtimesng.com/category/sports/feed", source: "Premium Times Sports" },
    { url: "https://punchng.com/sports/feed/", source: "Punch Sports" },
    { url: "https://www.vanguardngr.com/category/sports/feed/", source: "Vanguard Sports" },
    { url: "https://guardian.ng/category/sport/feed/", source: "Guardian NG Sport" },
  ],
  entertainment: [
    { url: "https://www.premiumtimesng.com/category/entertainment/feed", source: "Premium Times Entertainment" },
    { url: "https://punchng.com/topics/entertainment/feed/", source: "Punch Entertainment" },
    { url: "https://guardian.ng/category/life/feed/", source: "Guardian NG Life" },
  ],
  tech: [
    { url: "https://guardian.ng/category/technology/feed/", source: "Guardian NG Tech" },
    { url: "https://www.premiumtimesng.com/category/news/tech/feed", source: "Premium Times Tech" },
    { url: "https://punchng.com/topics/technology/feed/", source: "Punch Tech" },
  ],
};

const FEEDS: Record<Region, Record<CategorySlug, Feed[]>> = {
  africa: AFRICA_FEEDS,
  nigeria: NIGERIA_FEEDS,
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

async function fetchCategory(region: Region, slug: CategorySlug): Promise<Article[]> {
  const feeds = FEEDS[region][slug];
  const results = await Promise.all(feeds.map((f) => fetchFeed(f, slug, region)));
  const merged = results.flat();
  merged.sort((a, b) => {
    const ta = Date.parse(a.publishedAt) || 0;
    const tb = Date.parse(b.publishedAt) || 0;
    return tb - ta;
  });
  const seen = new Set<string>();
  return merged.filter((a) => {
    const key = a.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const getCategoryNews = createServerFn({ method: "GET" })
  .inputValidator((data: { region: Region; slug: CategorySlug }) => data)
  .handler(async ({ data }) => {
    const articles = await fetchCategory(data.region, data.slug);
    return { articles: articles.slice(0, 30) };
  });

export const getRegionHome = createServerFn({ method: "GET" })
  .inputValidator((data: { region: Region }) => data)
  .handler(async ({ data }) => {
    const [top, politics, sports, entertainment, tech] = await Promise.all([
      fetchCategory(data.region, "top"),
      fetchCategory(data.region, "politics-business"),
      fetchCategory(data.region, "sports"),
      fetchCategory(data.region, "entertainment"),
      fetchCategory(data.region, "tech"),
    ]);
    return {
      top: top.slice(0, 12),
      politicsBusiness: politics.slice(0, 6),
      sports: sports.slice(0, 6),
      entertainment: entertainment.slice(0, 6),
      tech: tech.slice(0, 6),
    };
  });

export const getHomeNews = createServerFn({ method: "GET" }).handler(async () => {
  const regions: Region[] = ["africa", "nigeria"];
  const [africaTop, nigeriaTop] = await Promise.all(
    regions.map((r) => fetchCategory(r, "top")),
  );
  return {
    africa: { top: africaTop.slice(0, 10) },
    nigeria: { top: nigeriaTop.slice(0, 10) },
  };
});

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const region: Region = data.id.startsWith("nigeria_") ? "nigeria" : "africa";
    const slugs: CategorySlug[] = ["top", "politics-business", "sports", "entertainment", "tech"];
    const all = await Promise.all(slugs.map((s) => fetchCategory(region, s)));
    const found = all.flat().find((a) => a.id === data.id);
    return { article: found ?? null };
  });
