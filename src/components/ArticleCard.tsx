import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Article } from "@/lib/news.functions";
import { TweetActions } from "@/components/TweetActions";

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!t) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function TimeAgo({ iso }: { iso: string }) {
  // Render nothing on server to avoid hydration mismatch, then compute on client.
  const [label, setLabel] = useState<string>("");
  useEffect(() => {
    setLabel(timeAgo(iso));
    const id = setInterval(() => setLabel(timeAgo(iso)), 60000);
    return () => clearInterval(id);
  }, [iso]);
  if (!label) return null;
  return <span className="text-muted-foreground">{label}</span>;
}

export function ArticleCard({ article, size = "md" }: { article: Article; size?: "sm" | "md" | "lg" }) {
  const isLarge = size === "lg";
  const isSmall = size === "sm";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-sm border border-border bg-card transition-shadow hover:shadow-lg">
      <Link to="/article/$id" params={{ id: article.id }} className="block">
        {article.image ? (
          <div className={`overflow-hidden bg-muted ${isLarge ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
            <img
              src={article.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.display = "none";
              }}
            />
          </div>
        ) : null}
        <div className={`flex flex-1 flex-col ${isLarge ? "p-6" : "p-4"}`}>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
            <span>{article.source}</span>
            {article.publishedAt && (
              <>
                <span className="text-border">•</span>
                <TimeAgo iso={article.publishedAt} />
              </>
            )}
          </div>
          <h3
            className={`mt-2 font-serif font-bold leading-tight text-foreground group-hover:text-accent ${
              isLarge ? "text-2xl md:text-3xl" : isSmall ? "text-base" : "text-lg"
            }`}
          >
            {article.title}
          </h3>
          {!isSmall && article.description && (
            <p className={`mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground ${isLarge ? "md:text-base" : ""}`}>
              {article.description}
            </p>
          )}
        </div>
      </Link>
      <div className="border-t border-border bg-background/60 px-3 py-2">
        <TweetActions article={article} variant="compact" />
      </div>
    </article>
  );
}
