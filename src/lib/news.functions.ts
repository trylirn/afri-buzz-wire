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
};

export type CategorySlug =
  | "politics-business"
  | "sports"
  | "entertainment"
  | "tech"
  | "top";

type Feed = { url: string; source: string };

const FEEDS: Record<CategorySlug, Feed[]> = {
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

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

function toId(link: string): string {
  return btoa(link).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
  const match = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

async function fetchFeed(feed: Feed, category: string): Promise<Article[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (AfricaPulse RSS)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parser.parse(xml);

    // RSS 2.0: rss.channel.item; RDF: rdf:RDF.item
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
        const description = stripHtml(descriptionHtml).slice(0, 320);

        const pubDate = (item.pubDate ?? item["dc:date"] ?? item.published ?? "") as string;

        if (!title || !link) return null;
        return {
          id: toId(link),
          title: stripHtml(title),
          description,
          link,
          source: feed.source,
          publishedAt: pubDate,
          image: extractImage(item, descriptionHtml),
          category,
        };
      })
      .filter((a): a is Article => a !== null);
  } catch (err) {
    console.error(`Feed fetch failed: ${feed.url}`, err);
    return [];
  }
}

async function fetchCategory(slug: CategorySlug): Promise<Article[]> {
  const feeds = FEEDS[slug];
  const results = await Promise.all(feeds.map((f) => fetchFeed(f, slug)));
  const merged = results.flat();
  // sort newest first
  merged.sort((a, b) => {
    const ta = Date.parse(a.publishedAt) || 0;
    const tb = Date.parse(b.publishedAt) || 0;
    return tb - ta;
  });
  // dedupe by title
  const seen = new Set<string>();
  return merged.filter((a) => {
    const key = a.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const getCategoryNews = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: CategorySlug }) => data)
  .handler(async ({ data }) => {
    const articles = await fetchCategory(data.slug);
    return { articles: articles.slice(0, 30) };
  });

export const getHomeNews = createServerFn({ method: "GET" }).handler(async () => {
  const [top, politics, sports, entertainment, tech] = await Promise.all([
    fetchCategory("top"),
    fetchCategory("politics-business"),
    fetchCategory("sports"),
    fetchCategory("entertainment"),
    fetchCategory("tech"),
  ]);
  return {
    top: top.slice(0, 12),
    politicsBusiness: politics.slice(0, 6),
    sports: sports.slice(0, 6),
    entertainment: entertainment.slice(0, 6),
    tech: tech.slice(0, 6),
  };
});

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const all = await Promise.all(
      (Object.keys(FEEDS) as CategorySlug[]).map((s) => fetchCategory(s)),
    );
    const found = all.flat().find((a) => a.id === data.id);
    return { article: found ?? null };
  });
