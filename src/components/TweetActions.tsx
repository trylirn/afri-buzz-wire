import { useState } from "react";
import { Copy, Check, Link2, ListOrdered, Download } from "lucide-react";
import type { Article } from "@/lib/news.functions";
import { buildTweetText, buildSourceTweet, buildThread, TWEET_MAX } from "@/lib/tweet";

type Variant = "compact" | "full";

function proxiedImage(url: string): string {
  return `/api/img?u=${encodeURIComponent(url)}`;
}

async function copyTextAndImage(text: string): Promise<"text"> {
  // Text-only: copying an image alongside the text made paste targets (X's
  // composer included) grab the image and drop the tweet text, so we only
  // ever copy the text now.
  await navigator.clipboard.writeText(text);
  return "text";
}

export function TweetActions({ article, variant = "compact" }: { article: Article; variant?: Variant }) {
  const tweet = buildTweetText(article);
  const source = buildSourceTweet(article);
  const hasImage = !!article.image;

  if (variant === "full") {
    return (
      <div className="rounded-sm border border-border bg-card p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-accent">Post to X</h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            2-tweet thread {hasImage && "· image included"}
          </span>
        </div>

        <TweetPreview label="Tweet 1 — Text" text={tweet} showCount image={article.image} />
        <div className="mt-3">
          <TweetPreview label="Tweet 2 — Source (reply)" text={source} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <CopyTweetButton
            text={tweet}
            label="Copy tweet"
            primary
          />
          <CopyButton text={source} label="Copy source" icon={<Link2 className="h-3.5 w-3.5" />} />
          <CopyButton text={buildThread(article)} label="Copy full thread" icon={<ListOrdered className="h-3.5 w-3.5" />} />
          {hasImage && (
            
              href={proxiedImage(article.image!)}
              download
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Save image</span>
            </a>
          )}
        </div>
        {hasImage && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Tip: "Copy tweet" copies text only. Use "Save image" to download the photo and attach it yourself when posting.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.preventDefault()}>
      <CopyTweetButton
        text={tweet}
        label="Tweet"
        size="sm"
      />
      <CopyButton text={source} label="Source" icon={<Link2 className="h-3 w-3" />} size="sm" />
    </div>
  );
}

function TweetPreview({
  label,
  text,
  showCount,
  image,
}: {
  label: string;
  text: string;
  showCount?: boolean;
  image?: string | null;
}) {
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
      <div className="rounded-sm border border-border bg-background p-3">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
          {text}
        </pre>
        {image && (
          <div className="mt-3 overflow-hidden rounded-sm border border-border">
            <img src={image} alt="" className="max-h-48 w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

function CopyTweetButton({
  text,
  label,
  primary,
  size = "md",
}: {
  text: string;
  label: string;
  primary?: boolean;
  size?: "sm" | "md";
}) {
  const [state, setState] = useState<"idle" | "text">("idle");

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await copyTextAndImage(text);
      setState(result);
      setTimeout(() => setState("idle"), 1500);
    } catch {
      // ignore
    }
  };

  const base = size === "sm" ? "px-2 py-1 text-[11px] gap-1" : "px-3 py-1.5 text-xs gap-1.5";
  const style = primary
    ? "bg-accent text-accent-foreground hover:opacity-90"
    : "border border-border bg-background text-foreground hover:border-accent hover:text-accent";

  const icon = state === "idle" ? <Copy className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />;
  const displayLabel = state === "text" ? "Copied" : label;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-sm font-semibold uppercase tracking-wide transition-colors ${base} ${style}`}
      aria-label={label}
    >
      {icon}
      <span>{displayLabel}</span>
    </button>
  );
}

function CopyButton({
  text,
  label,
  icon,
  size = "md",
}: {
  text: string;
  label: string;
  icon: React.ReactNode;
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

  const base = size === "sm" ? "px-2 py-1 text-[11px] gap-1" : "px-3 py-1.5 text-xs gap-1.5";
  const style =
    "border border-border bg-background text-foreground hover:border-accent hover:text-accent";

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
