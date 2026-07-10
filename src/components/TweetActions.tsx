import { useState } from "react";
import { Copy, Check, Link2, ListOrdered } from "lucide-react";
import type { Article } from "@/lib/news.functions";
import { buildTweetText, buildSourceTweet, buildThread, TWEET_MAX } from "@/lib/tweet";

type Variant = "compact" | "full";

export function TweetActions({ article, variant = "compact" }: { article: Article; variant?: Variant }) {
  const tweet = buildTweetText(article);
  const source = buildSourceTweet(article);

  if (variant === "full") {
    return (
      <div className="rounded-sm border border-border bg-card p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-accent">Post to X</h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            2-tweet thread
          </span>
        </div>

        <TweetPreview label="Tweet 1 — Text" text={tweet} showCount />
        <div className="mt-3">
          <TweetPreview label="Tweet 2 — Source (reply)" text={source} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <CopyButton text={tweet} label="Copy tweet" icon={<Copy className="h-3.5 w-3.5" />} primary />
          <CopyButton text={source} label="Copy source" icon={<Link2 className="h-3.5 w-3.5" />} />
          <CopyButton text={buildThread(article)} label="Copy full thread" icon={<ListOrdered className="h-3.5 w-3.5" />} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.preventDefault()}>
      <CopyButton text={tweet} label="Tweet" icon={<Copy className="h-3 w-3" />} size="sm" />
      <CopyButton text={source} label="Source" icon={<Link2 className="h-3 w-3" />} size="sm" />
    </div>
  );
}

function TweetPreview({ label, text, showCount }: { label: string; text: string; showCount?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        {showCount && (
          <span className={`text-[10px] tabular-nums ${text.length > TWEET_MAX ? "text-destructive" : "text-muted-foreground"}`}>
            {text.length}/{TWEET_MAX}
          </span>
        )}
      </div>
      <pre className="whitespace-pre-wrap rounded-sm border border-border bg-background p-3 font-sans text-sm leading-relaxed text-foreground">
        {text}
      </pre>
    </div>
  );
}

function CopyButton({
  text,
  label,
  icon,
  primary,
  size = "md",
}: {
  text: string;
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const base = size === "sm"
    ? "px-2 py-1 text-[11px] gap-1"
    : "px-3 py-1.5 text-xs gap-1.5";
  const style = primary
    ? "bg-accent text-accent-foreground hover:opacity-90"
    : "border border-border bg-background text-foreground hover:border-accent hover:text-accent";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-sm font-semibold uppercase tracking-wide transition-colors ${base} ${style}`}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : icon}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}
