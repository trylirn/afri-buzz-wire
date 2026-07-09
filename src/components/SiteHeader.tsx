import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/category/$slug", params: { slug: "politics-business" }, label: "Politics & Business" },
  { to: "/category/$slug", params: { slug: "sports" }, label: "Sports" },
  { to: "/category/$slug", params: { slug: "entertainment" }, label: "Entertainment" },
  { to: "/category/$slug", params: { slug: "tech" }, label: "Tech & Science" },
] as const;

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
              Real news, real Africa
            </span>
          </Link>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3 text-sm font-medium">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              // @ts-expect-error - params only on some links
              params={item.params}
              className="text-muted-foreground transition-colors hover:text-accent"
              activeProps={{ className: "text-accent" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <p className="font-serif text-lg text-foreground">Africa Pulse</p>
        <p className="mt-1">
          News aggregated from public RSS feeds: BBC Africa, AllAfrica. All articles link to their
          original sources.
        </p>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} Africa Pulse.</p>
      </div>
    </footer>
  );
}
