import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getHomeNews, type Article, type Region } from "@/lib/news.functions";
import { ArticleCard } from "@/components/ArticleCard";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

const homeQuery = queryOptions({
  queryKey: ["home-news"],
  queryFn: () => getHomeNews(),
  staleTime: 15 * 60 * 1000,
  refetchInterval: 15 * 60 * 1000,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Home,
  errorComponent: HomeError,
});

function HomeError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-bold">News feeds unavailable</h1>
        <p className="mt-2 text-muted-foreground">We couldn't reach the news sources right now.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function Home() {
  const { data } = useSuspenseQuery(homeQuery);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-10 rounded-sm border border-border bg-card p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            AI-curated viral news wire
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold leading-tight md:text-4xl">
            Real news, hand-picked by AI for what will pop on X.
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Three desks — Africa Pulse, Latest in Nigeria, America Stories — each filtered for
            regional relevance and virality. Every story comes with a ready-to-post tweet and its
            source image. Copy, paste, and publish.
          </p>
        </section>

        <RegionBlock region="africa" title="Africa Pulse" articles={data.africa.top} />
        <RegionBlock region="nigeria" title="Latest in Nigeria" articles={data.nigeria.top} />
        <RegionBlock region="america" title="America Stories" articles={data.america.top} />
      </main>
      <SiteFooter />
    </div>
  );
}

function RegionBlock({ region, title, articles }: { region: Region; title: string; articles: Article[] }) {
  if (!articles.length) return null;
  const [hero, ...rest] = articles;
  return (
    <section className="mb-14">
      <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
        <h2 className="font-serif text-3xl font-bold">{title}</h2>
        <Link
          to="/$region"
          params={{ region }}
          className="text-xs font-semibold uppercase tracking-widest text-accent hover:underline"
        >
          See all →
        </Link>
      </div>
      {hero && <div className="mb-6"><ArticleCard article={hero} size="lg" /></div>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.slice(0, 5).map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
    </section>
  );
}
