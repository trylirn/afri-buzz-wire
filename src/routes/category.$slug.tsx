import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCategoryNews, type CategorySlug } from "@/lib/news.functions";
import { ArticleCard } from "@/components/ArticleCard";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

const CATEGORY_META: Record<CategorySlug, { title: string; blurb: string }> = {
  top: { title: "Top Stories", blurb: "The biggest stories across Africa right now." },
  "politics-business": {
    title: "Politics & Business",
    blurb: "Governance, economy, and markets across the continent.",
  },
  sports: { title: "Sports", blurb: "Football, AFCON, athletics and more." },
  entertainment: {
    title: "Entertainment & Culture",
    blurb: "Music, Nollywood, Afrobeats and African culture.",
  },
  tech: {
    title: "Tech & Science",
    blurb: "African startups, innovation and scientific breakthroughs.",
  },
};

const VALID: CategorySlug[] = ["politics-business", "sports", "entertainment", "tech"];

const categoryQuery = (slug: CategorySlug) =>
  queryOptions({
    queryKey: ["category", slug],
    queryFn: () => getCategoryNews({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/category/$slug")({
  beforeLoad: ({ params }) => {
    if (!VALID.includes(params.slug as CategorySlug)) throw notFound();
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(categoryQuery(params.slug as CategorySlug)),
  head: ({ params }) => {
    const meta = CATEGORY_META[params.slug as CategorySlug] ?? CATEGORY_META.top;
    return {
      meta: [
        { title: `${meta.title} — Africa Pulse` },
        { name: "description", content: meta.blurb },
        { property: "og:title", content: `${meta.title} — Africa Pulse` },
        { property: "og:description", content: meta.blurb },
      ],
      links: [{ rel: "canonical", href: `/category/${params.slug}` }],
    };
  },
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-bold">Category not found</h1>
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
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(categoryQuery(slug as CategorySlug));
  const meta = CATEGORY_META[slug as CategorySlug];
  const [hero, ...rest] = data.articles;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Section</p>
          <h1 className="mt-1 font-serif text-4xl font-bold md:text-5xl">{meta.title}</h1>
          <p className="mt-2 text-muted-foreground">{meta.blurb}</p>
        </header>

        {data.articles.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No stories available right now.</p>
        ) : (
          <>
            {hero && (
              <div className="mb-10">
                <ArticleCard article={hero} size="lg" />
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
