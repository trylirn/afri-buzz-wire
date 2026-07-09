import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getHomeNews } from "@/lib/news.functions";
import { ArticleCard } from "@/components/ArticleCard";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Link } from "@tanstack/react-router";

const homeQuery = queryOptions({
  queryKey: ["home-news"],
  queryFn: () => getHomeNews(),
  staleTime: 5 * 60 * 1000,
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
  const [hero, ...rest] = data.top;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {hero && (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-accent">Top Story</h2>
            </div>
            <ArticleCard article={hero} size="lg" />
          </section>
        )}

        {rest.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 border-b border-border pb-2 font-serif text-2xl font-bold">Latest Across Africa</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.slice(0, 9).map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}

        <CategorySection title="Politics & Business" slug="politics-business" articles={data.politicsBusiness} />
        <CategorySection title="Sports" slug="sports" articles={data.sports} />
        <CategorySection title="Entertainment & Culture" slug="entertainment" articles={data.entertainment} />
        <CategorySection title="Tech & Science" slug="tech" articles={data.tech} />
      </main>
      <SiteFooter />
    </div>
  );
}

function CategorySection({
  title,
  slug,
  articles,
}: {
  title: string;
  slug: string;
  articles: ReturnType<typeof useSuspenseQuery<typeof homeQuery>>["data"]["top"];
}) {
  if (articles.length === 0) return null;
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
        <h2 className="font-serif text-2xl font-bold">{title}</h2>
        <Link
          to="/category/$slug"
          params={{ slug }}
          className="text-xs font-semibold uppercase tracking-widest text-accent hover:underline"
        >
          More →
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.slice(0, 3).map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </section>
  );
}
