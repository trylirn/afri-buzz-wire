import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/img")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("u");
        if (!target) return new Response("missing u", { status: 400 });
        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("bad url", { status: 400 });
        }
        if (!/^https?:$/.test(parsed.protocol)) {
          return new Response("bad proto", { status: 400 });
        }
        try {
          const res = await fetch(parsed.toString(), {
            headers: { "User-Agent": "Mozilla/5.0 (AfricaPulse ImgProxy)" },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return new Response("fetch failed", { status: 502 });
          const contentType = res.headers.get("content-type") || "image/jpeg";
          if (!contentType.startsWith("image/")) {
            return new Response("not image", { status: 415 });
          }
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 8 * 1024 * 1024) {
            return new Response("too large", { status: 413 });
          }
          return new Response(buf, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (err) {
          console.error("img proxy error", err);
          return new Response("error", { status: 502 });
        }
      },
    },
  },
});
