import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCategoryNews, type CategorySlug, type Region } from "@/lib/news.functions";
import { ArticleCard } from "@/components/ArticleCard";
import { SiteHeader, SiteFooter, RegionCategoryNav } from "@/components/SiteHeader";

const CATEGORY_META: Record<CategorySlug, { title: string; blurb: string }> = {
  top: { title: "Top Stories", blurb: "The biggest stories right now, AI-picked for virality." },
  breaking: { title: "Breaking News", blurb: "Just-in stories with high urgency." },
  "politics-business": { title: "Politics & Business", blurb: "Governance, economy, and markets." },
  security: { title: "Security & Crime", blurb: "Conflict, banditry, and public safety." },
  sports: { title: "Sports", blurb: "Football, AFCON, athletics and more." },
  entertainment: { title: "Entertainment & Culture", blurb: "Music, film, celebrity and culture." },
  tech: { title: "Tech & Science", blurb: "Startups, innovation and scientific breakthroughs." },
  health: { title: "Health", blurb: "Public health, medicine, wellness." },
  viral: { title: "Viral & Human Interest", blurb: "Emotional clips and stories that travel." },
  fx: { title: "Business & Naira/FX", blurb: "Currency, markets and the economy." },
};

const REGION_LABEL: Record<Region, string> = {
  africa: "Africa Pulse",
  nigeria: "Latest in Nigeria",
  america: "America Stories",
};

const VALID_CATS: CategorySlug[] = [
  "top",
  "breaking",
  "politics-business",
  "security",
  "sports",
  "entertainment",
  "tech",
  "health",
  "viral",
  "fx",
];
const VALID_REGIONS: Region[] = ["africa", "nigeria", "america"];

const categoryQuery = (region: Region, slug: CategorySlug) =>
  queryOptions({
    queryKey: ["category", region, slug],
    queryFn: () => getCategoryNews({ data: { region, slug } }),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

export const Route = createFileRoute("/$region/$category")({
  beforeLoad: ({ params }) => {
    if (!VALID_REGIONS.includes(params.region as Region)) throw notFound();
    if (!VALID_CATS.includes(params.category as CategorySlug)) throw notFound();
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      categoryQuery(params.region as Region, params.category as CategorySlug),
    ),
  head: ({ params }) => {
    const meta = CATEGORY_META[params.category as CategorySlug] ?? CATEGORY_META.top;
    const region = REGION_LABEL[params.region as Region] ?? "";
    return {
      meta: [
        { title: `${meta.title} — ${region}` },
        { name: "description", content: `${meta.blurb} From ${region}.` },
        { property: "og:title", content: `${meta.title} — ${region}` },
        { property: "og:description", content: `${meta.blurb} From ${region}.` },
      ],
    };
  },
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-bold">Section not found</h1>
      </div>
    </div>
  ),
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-serif text-3xl font-bold">Couldn't load this section</h1>
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

function CategoryPage() {
  const { region, category } = Route.useParams();
  const r = region as Region;
  const { data } = useSuspenseQuery(categoryQuery(r, category as CategorySlug));
  const meta = CATEGORY_META[category as CategorySlug];
  const [hero, ...rest] = data.articles;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            {REGION_LABEL[r]} · Section
          </p>
          <h1 className="mt-1 font-serif text-4xl font-bold md:text-5xl">{meta.title}</h1>
          <p className="mt-2 text-muted-foreground">{meta.blurb}</p>
        </header>

        <RegionCategoryNav region={r} />

        {data.articles.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            No stories cleared curation for this section yet.
          </p>
        ) : (
          <>
            {hero && <div className="mb-10"><ArticleCard article={hero} size="lg" /></div>}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => <ArticleCard key={a.id} article={a} />)}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
