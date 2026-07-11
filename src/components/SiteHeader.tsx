import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Region } from "@/lib/news.functions";

const REGIONS: { region: Region; label: string }[] = [
  { region: "africa", label: "Africa Pulse" },
  { region: "nigeria", label: "Latest in Nigeria" },
  { region: "america", label: "America Stories" },
];

function DateLabel() {
  const [d, setD] = useState<string>("");
  useEffect(() => {
    setD(
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
  }, []);
  return <span>{d}</span>;
}

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold tracking-tight text-foreground">
              Pulse Wire
            </span>
            <span className="hidden text-xs uppercase tracking-widest text-accent sm:inline">
              AI-curated viral news
            </span>
          </Link>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            <DateLabel />
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
          <Link
            to="/"
            className="font-serif text-base font-bold text-foreground hover:text-accent"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-accent" }}
          >
            Home
          </Link>
          <span className="text-border">|</span>
          {REGIONS.map(({ region, label }) => (
            <Link
              key={region}
              to="/$region"
              params={{ region }}
              className="font-serif text-base font-bold text-muted-foreground hover:text-accent"
              activeProps={{ className: "text-accent" }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

const REGION_CATS: Record<Region, { slug: string; label: string }[]> = {
  africa: [
    { slug: "top", label: "Top" },
    { slug: "breaking", label: "Breaking" },
    { slug: "politics-business", label: "Politics & Business" },
    { slug: "security", label: "Security & Conflict" },
    { slug: "sports", label: "Sports" },
    { slug: "entertainment", label: "Entertainment" },
    { slug: "tech", label: "Tech & Science" },
    { slug: "health", label: "Health" },
    { slug: "viral", label: "Viral & Human Interest" },
  ],
  nigeria: [
    { slug: "top", label: "Top" },
    { slug: "breaking", label: "Breaking" },
    { slug: "politics-business", label: "Politics & Government" },
    { slug: "fx", label: "Business & Naira/FX" },
    { slug: "security", label: "Security" },
    { slug: "sports", label: "Sports" },
    { slug: "entertainment", label: "Entertainment" },
    { slug: "tech", label: "Tech" },
    { slug: "health", label: "Health" },
    { slug: "viral", label: "Viral & Human Interest" },
  ],
  america: [
    { slug: "top", label: "Top" },
    { slug: "breaking", label: "Breaking" },
    { slug: "politics-business", label: "Politics & Business" },
    { slug: "security", label: "Crime & Justice" },
    { slug: "sports", label: "Sports" },
    { slug: "entertainment", label: "Entertainment" },
    { slug: "tech", label: "Tech" },
    { slug: "health", label: "Health" },
    { slug: "viral", label: "Viral & Human Interest" },
  ],
};

export function RegionCategoryNav({ region }: { region: Region }) {
  const cats = REGION_CATS[region];
  return (
    <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-3 text-sm">
      {cats.map((c) => (
        <Link
          key={c.slug}
          to="/$region/$category"
          params={{ region, category: c.slug }}
          className="text-muted-foreground transition-colors hover:text-accent"
          activeProps={{ className: "text-accent font-semibold" }}
        >
          {c.label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteFooter() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);
  return (
    <footer className="mt-16 border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <p className="font-serif text-lg text-foreground">Pulse Wire</p>
        <p className="mt-1">
          AI-curated viral news across Africa, Nigeria and America — headlines aggregated from
          public RSS feeds and filtered for regional relevance and virality. Every story links back
          to its original source.
        </p>
        <p className="mt-4 text-xs">© {year ?? ""} Pulse Wire.</p>
      </div>
    </footer>
  );
}
