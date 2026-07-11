import { createServerFn } from "@tanstack/react-start";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { Article, Region } from "./news.functions";

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
// its result (kept/dropped + tweet text) is stored under its own id forever
// (until the server restarts), so it never gets silently re-written.
// Only articles we've never seen before get sent to the AI.
const ARTICLE_CACHE = new Map<string, Article & { virality: number }>();

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

export const curateArticles = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { region: Region; topic: string; articles: Article[] }) => data,
  )
  .handler(async ({ data }) => {
    const { region, topic, articles } = data;
    if (!articles.length) return { articles: [] as Article[] };

    // Split into articles we've already curated (permanent hit) vs brand-new ones.
    const cachedResults: (Article & { virality: number })[] = [];
    const uncached: Article[] = [];
    for (const a of articles) {
      const hit = ARTICLE_CACHE.get(a.id);
      if (hit) cachedResults.push(hit);
      else uncached.push(a);
    }

    // Nothing new — serve straight from the permanent cache, no AI call at all.
    if (!uncached.length) {
      return { articles: sortEnriched(cachedResults) };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { articles: [...cachedResults, ...uncached] }; // graceful fallback
    }

    const slim = uncached.slice(0, 40).map((a) => ({
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

      const { object } = await generateObject({
        model,
        schema: CurationSchema,
        system,
        prompt: userPrompt,
        // Hard cap so a slow/stuck AI Gateway call can never hang the whole
        // page load — it fails fast into the catch block below instead.
        abortSignal: AbortSignal.timeout(15000),
      });

      const results = object.results as CurationResult[];
      const byId = new Map(results.map((r) => [r.id, r]));

      const freshlyEnriched: (Article & { virality: number })[] = uncached
        .map((a) => {
          const r = byId.get(a.id);
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

      // Cache every newly curated article permanently, keyed by its own id,
      // so it's never sent back to the AI or rewritten again.
      for (const a of freshlyEnriched) {
        ARTICLE_CACHE.set(a.id, a);
      }

      return { articles: sortEnriched([...cachedResults, ...freshlyEnriched]) };
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        console.error("AI curator: no object", (err as Error).message);
      } else {
        console.error("AI curator failed", err);
      }
      return { articles: [...cachedResults, ...uncached] };
    }
  });
