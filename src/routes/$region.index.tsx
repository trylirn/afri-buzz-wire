import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getRegionHome, type Article, type Region } from "@/lib/news.functions";
import { ArticleCard } from "@/components/ArticleCard";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

const REGION_META: Record<Region, { title: string; blurb: string }> = {
  africa: {
    title: "Africa Pulse",
    blurb: "The biggest stories from across the African continent, updated every 15 minutes.",
  },
  nigeria: {
    title: "Latest in Nigeria",
    blurb: "Breaking Nigerian news, politics, business, sport and culture, updated every 15 minutes.",
  },
};

const regionQuery = (region: Region) =>
  queryOptions({
    queryKey: ["region-home", region],
    queryFn: () => getRegionHome({ data: { region } }),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

export const Route = createFileRoute("/$region/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(regionQuery(params.region as Region)),
  head: ({ params }) => {
    const meta = REGION_META[params.region as Region] ?? REGION_META.africa;
    return {
      meta: [
        { title: `${meta.title} — Africa Pulse` },
        { name: "description", content: meta.blurb },
        { property: "og:title", content: meta.title },
        { property: "og:description", content: meta.blurb },
      ],
    };
  },
  component: RegionHome,
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-serif text-3xl font-bold">Feeds unavailable</h1>
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="mt-6 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    );
  },
});

function RegionHome() {
  const { region } = Route.useParams();
  const { data } = useSuspenseQuery(regionQuery(region as Region));
  const meta = REGION_META[region as Region];
  const [hero, ...rest] = data.top;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Region</p>
          <h1 className="mt-1 font-serif text-4xl font-bold md:text-5xl">{meta.title}</h1>
          <p className="mt-2 text-muted-foreground">{meta.blurb}</p>
        </header>

        {hero && (
          <section className="mb-12">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent">Top Story</h2>
            <ArticleCard article={hero} size="lg" />
          </section>
        )}

        {rest.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 border-b border-border pb-2 font-serif text-2xl font-bold">Latest</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>
        )}

        <CatBlock title="Politics & Business" region={region as Region} slug="politics-business" articles={data.politicsBusiness} />
        <CatBlock title="Sports" region={region as Region} slug="sports" articles={data.sports} />
        <CatBlock title="Entertainment & Culture" region={region as Region} slug="entertainment" articles={data.entertainment} />
        <CatBlock title="Tech & Science" region={region as Region} slug="tech" articles={data.tech} />
      </main>
      <SiteFooter />
    </div>
  );
}

function CatBlock({ title, region, slug, articles }: { title: string; region: Region; slug: string; articles: Article[] }) {
  if (!articles.length) return null;
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
        <h2 className="font-serif text-2xl font-bold">{title}</h2>
        <Link
          to="/$region/$category"
          params={{ region, category: slug }}
          className="text-xs font-semibold uppercase tracking-widest text-accent hover:underline"
        >
          More →
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.slice(0, 3).map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
    </section>
  );
}
