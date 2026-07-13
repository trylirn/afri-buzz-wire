import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { Article, Region } from "./news-types";

type CurationResult = {
  id: string;
  keep: boolean;
  region_relevant: boolean;
  virality: number;
  tweet: string;
};

const CurationSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      keep: z.boolean(),
      region_relevant: z.boolean(),
      virality: z.number().min(0).max(10),
      tweet: z.string(),
    }),
  ),
});

// Permanent, per-article cache: once an article has been curated by the AI,
// its result is stored under its own id forever (until server restart).
const ARTICLE_CACHE = new Map<string, Article & { virality: number }>();

// Simple concurrency limiter to avoid slamming the AI gateway (429s).
const MAX_CONCURRENT = 3;
let inflight = 0;
const queue: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (inflight >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  inflight++;
  try {
    return await fn();
  } finally {
    inflight--;
    const next = queue.shift();
    if (next) next();
  }
}

function sortEnriched(list: (Article & { virality: number })[]): Article[] {
  const now = Date.now();
  return [...list].sort((a, b) => {
    const ta = Date.parse(a.publishedAt) || 0;
    const tb = Date.parse(b.publishedAt) || 0;
    const freshA = now - ta < 6 * 3600 * 1000 ? 1 : 0;
    const freshB = now - tb < 6 * 3600 * 1000 ? 1 : 0;
    if (freshA !== freshB) return freshB - freshA;
    if (a.virality !== b.virality) return b.virality - a.virality;
    return tb - ta;
  });
}

function sortByDate(list: Article[]): Article[] {
  return [...list].sort((a, b) => {
    const ta = Date.parse(a.publishedAt) || 0;
    const tb = Date.parse(b.publishedAt) || 0;
    return tb - ta;
  });
}

function regionRule(region: Region): string {
  if (region === "africa")
    return "Africa: story MUST be primarily about an African country, African person, African diaspora, or Africa-wide topic. Drop stories about non-African subjects even if published on an African site (e.g. Mbappé in Ligue 1 = drop; a Moroccan star at AFCON = keep).";
  if (region === "nigeria")
    return "Nigeria: story MUST directly involve Nigeria, Nigerians (including diaspora), Naira/FX, or clearly affect Nigerians. A generic global story = drop.";
  return "USA: story MUST directly involve the United States, Americans, US markets, US politics, or clearly affect a US audience. A generic global story with no US angle = drop.";
}

function viralityPrompt(topic: string): string {
  const topicHint =
    topic === "top"
      ? "Weight breaking news, security incidents, corruption, disasters, big-money government projects, celebrity scandals, sports wins, and human-interest viral clips highest."
      : `Prioritise stories that clearly match the '${topic}' beat.`;
  return `Score virality 0–10 based on: BREAKING/JUST-IN energy, scandal, corruption, disaster, celebrity drama, security/crime, big money numbers, viral human-interest, sports wins, FX/currency moves, emotional threads. Boring press releases, opinion columns without a hook, and repeats = low. ${topicHint}`;
}

function tweetPrompt(): string {
  return `Rewrite each kept story into ONE punchy human tweet (max 260 chars). Rules:
- No hashtags spam (max 1 topical hashtag, usually none).
- No URLs.
- No "click to read" language.
- Sound like a real informed human on X, not a headline scraper.
- Lead with "BREAKING:" or "JUST IN:" ONLY when the story genuinely is breaking security/politics/disaster news.
- Concrete numbers, names, places — keep the juicy detail.
- Plain sentences, no emoji unless it truly adds meaning.`;
}

export async function curateArticlesImpl(input: {
  region: Region;
  topic: string;
  articles: Article[];
}): Promise<{ articles: Article[] }> {
  const { region, topic, articles } = input;
  if (!articles.length) return { articles: [] };

  const cachedResults: (Article & { virality: number })[] = [];
  const uncached: Article[] = [];
  for (const a of articles) {
    const hit = ARTICLE_CACHE.get(a.id);
    if (hit) cachedResults.push(hit);
    else uncached.push(a);
  }

  if (!uncached.length) return { articles: sortEnriched(cachedResults) };

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return {
      articles: sortByDate([
        ...cachedResults,
        ...uncached,
      ]),
    };
  }

  const slim = uncached.slice(0, 25).map((a) => ({
    id: a.id,
    title: a.title.slice(0, 180),
    description: (a.description || "").slice(0, 240),
    source: a.source,
  }));

  const system = `You are a news curator for a viral X (Twitter) account focused on ${region.toUpperCase()}.
${regionRule(region)}
${viralityPrompt(topic)}
${tweetPrompt()}
Return one result object per input article, in the same order, keyed by the input id.`;

  const userPrompt = `Curate these ${slim.length} articles and return JSON:\n${JSON.stringify(slim)}`;

  try {
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

    const { object } = await withSlot(() =>
      generateObject({
        model,
        schema: CurationSchema,
        system,
        prompt: userPrompt,
        abortSignal: AbortSignal.timeout(15000),
      }),
    );

    const results = object.results as CurationResult[];
    const byId = new Map(results.map((r) => [r.id, r]));
    const sameLength = results.length === slim.length;

    const freshlyEnriched: (Article & { virality: number })[] = uncached
      .slice(0, 25)
      .map((a, i) => {
        const r = sameLength ? results[i] : byId.get(a.id);
        if (!r) return null;
        if (!r.keep || !r.region_relevant) return null;
        if (r.virality < 6) return null;
        return {
          ...a,
          tweet: r.tweet?.slice(0, 275) || undefined,
          virality: r.virality,
        } as Article & { virality: number };
      })
      .filter((x): x is Article & { virality: number } => x !== null);

    if (!freshlyEnriched.length && uncached.length) {
      console.warn(
        `AI curator kept 0 of ${uncached.length} for ${region}/${topic} — showing raw`,
      );
      return { articles: sortByDate([...cachedResults, ...uncached]) };
    }

    for (const a of freshlyEnriched) ARTICLE_CACHE.set(a.id, a);

    // Include uncached-but-past-batch articles as raw fallbacks so the page
    // never looks emptier than it should.
    const overflow = uncached.slice(25);
    return {
      articles: [
        ...sortEnriched([...cachedResults, ...freshlyEnriched]),
        ...sortByDate(overflow),
      ],
    };
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      console.warn("AI curator: no object", (err as Error).message);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (
        lower.includes("429") ||
        lower.includes("rate") ||
        lower.includes("too many")
      ) {
        console.warn("AI curator rate limited, falling back to raw feed");
      } else {
        console.error("AI curator failed", err);
      }
    }
    return { articles: sortByDate([...cachedResults, ...uncached]) };
  }
}
