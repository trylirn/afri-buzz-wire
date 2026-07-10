import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Region } from "@/lib/news.functions";

const CATS: { slug: string; label: string }[] = [
  { slug: "politics-business", label: "Politics & Business" },
  { slug: "sports", label: "Sports" },
  { slug: "entertainment", label: "Entertainment" },
  { slug: "tech", label: "Tech & Science" },
];

const REGIONS: { region: Region; label: string }[] = [
  { region: "africa", label: "Africa Pulse" },
  { region: "nigeria", label: "Latest in Nigeria" },
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
              Africa Pulse
            </span>
            <span className="hidden text-xs uppercase tracking-widest text-accent sm:inline">
              Africa & Nigeria news wire
            </span>
          </Link>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            <DateLabel />
          </div>
        </div>

        <nav className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
          {REGIONS.map(({ region, label }) => (
            <div key={region} className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <Link
                to="/$region"
                params={{ region }}
                className="font-serif text-base font-bold text-foreground hover:text-accent"
                activeProps={{ className: "text-accent" }}
              >
                {label}
              </Link>
              <span className="text-border">|</span>
              {CATS.map((c) => (
                <Link
                  key={c.slug}
                  to="/$region/$category"
                  params={{ region, category: c.slug }}
                  className="text-muted-foreground transition-colors hover:text-accent"
                  activeProps={{ className: "text-accent" }}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);
  return (
    <footer className="mt-16 border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <p className="font-serif text-lg text-foreground">Africa Pulse</p>
        <p className="mt-1">
          Africa & Nigeria news wire — headlines aggregated from public RSS feeds (BBC Africa,
          AllAfrica, Premium Times, Punch, Channels TV, Vanguard, The Guardian NG). Every story
          links back to its original source.
        </p>
        <p className="mt-4 text-xs">© {year ?? ""} Africa Pulse.</p>
      </div>
    </footer>
  );
}
