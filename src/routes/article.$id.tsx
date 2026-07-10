import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getArticle } from "@/lib/news.functions";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TweetActions } from "@/components/TweetActions";

const articleQuery = (id: string) =>
  queryOptions({
    queryKey: ["article", id],
    queryFn: () => getArticle({ data: { id } }),
    staleTime: 15 * 60 * 1000,
  });

export const Route = createFileRoute("/article/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(articleQuery(params.id));
    if (!data.article) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    if (!a) {
      return { meta: [{ title: "Article not found — Africa Pulse" }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: [
        { title: `${a.title} — Africa Pulse` },
        { name: "description", content: a.description || a.title },
        { property: "og:title", content: a.title },
        { property: "og:description", content: a.description || a.title },
        { property: "og:type", content: "article" },
        ...(a.image ? [{ property: "og:image", content: a.image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ArticlePage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-bold">Article not found</h1>
        <Link to="/" className="mt-4 inline-block text-accent hover:underline">← Back to home</Link>
      </div>
    </div>
  ),
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-serif text-3xl font-bold">Couldn't load this article</h1>
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

function ArticlePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(articleQuery(id));
  const a = data.article!;

  const shareUrl = a.link;
  const shareText = encodeURIComponent(a.title);
  const encoded = encodeURIComponent(shareUrl);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/" className="text-xs font-semibold uppercase tracking-widest text-accent hover:underline">
          ← Back
        </Link>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
          <span>{a.source}</span>
          {a.publishedAt && (
            <>
              <span className="text-border">•</span>
              <span className="text-muted-foreground">
                {new Date(a.publishedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </>
          )}
        </div>
        <h1 className="mt-3 font-serif text-4xl font-bold leading-tight md:text-5xl">{a.title}</h1>
        {a.description && (
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{a.description}</p>
        )}
        {a.image && (
          <div className="mt-6 overflow-hidden rounded-sm border border-border bg-muted">
            <img src={a.image} alt="" className="w-full" />
          </div>
        )}

        <div className="mt-8">
          <TweetActions article={a} variant="full" />
        </div>


        <div className="mt-8 rounded-sm border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            This is a preview from <strong className="text-foreground">{a.source}</strong>. Read the full story
            at the original source:
          </p>
          <a
            href={a.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-sm bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Read full story →
          </a>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Share</p>
          <div className="flex flex-wrap gap-2">
            <ShareLink href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encoded}`} label="X / Twitter" />
            <ShareLink href={`https://wa.me/?text=${shareText}%20${encoded}`} label="WhatsApp" />
            <ShareLink href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} label="Facebook" />
            <ShareLink href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`} label="LinkedIn" />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ShareLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-sm border border-border bg-card px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
    >
      {label}
    </a>
  );
}
