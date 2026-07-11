import type { Article } from "./news.functions";

export const TWEET_MAX = 280;

function cleanTitle(title: string): string {
  return title
    .replace(
      /\s*[-|—–]\s*(Premium Times|Punch|Channels(?: TV)?|Vanguard|The Guardian(?: Nigeria)?|Guardian(?: NG)?|BBC(?: News)?(?: Africa)?|AllAfrica[^-|—–]*|NYT|NBC News|CBS News|AP News|TechCrunch|Variety|Hollywood Reporter|ESPN|Sahara Reporters)\s*$/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/\s+/g, " ")
    .replace(/\[…\]|\[\.\.\.\]|…$|\.\.\.$/g, "")
    .replace(/Read more.*$/i, "")
    .replace(/The post .* appeared first on .*$/i, "")
    .trim();
}

function pickPrefix(article: Article): string {
  const t = article.title.toUpperCase();
  if (/^(BREAKING|JUST IN|UPDATE|EXCLUSIVE)[:\s-]/.test(t)) return "";
  const published = Date.parse(article.publishedAt);
  if (!published) return "";
  const ageHrs = (Date.now() - published) / 3600000;
  if (ageHrs < 3) return "JUST IN: ";
  if (ageHrs < 12) return "UPDATE: ";
  return "";
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export function buildTweetText(article: Article): string {
  // Prefer AI-written tweet when present
  if (article.tweet && article.tweet.trim()) {
    return truncateAtWord(article.tweet.trim(), TWEET_MAX);
  }

  const prefix = pickPrefix(article);
  const title = cleanTitle(article.title);
  const desc = cleanDescription(article.description);

  const headline = prefix + title;
  if (!desc) return truncateAtWord(headline, TWEET_MAX);

  const withBody = `${headline}\n\n${desc}`;
  if (withBody.length <= TWEET_MAX) return withBody;

  const remaining = TWEET_MAX - headline.length - 2;
  if (remaining < 40) return truncateAtWord(headline, TWEET_MAX);
  return `${headline}\n\n${truncateAtWord(desc, remaining)}`;
}

export function buildSourceTweet(article: Article): string {
  return `Source: ${article.source} — ${article.link}`;
}

export function buildThread(article: Article): string {
  return `${buildTweetText(article)}\n---\n${buildSourceTweet(article)}`;
}
