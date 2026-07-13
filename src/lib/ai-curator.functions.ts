import { createServerFn } from "@tanstack/react-start";
import type { Article, Region } from "./news-types";

export const curateArticles = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { region: Region; topic: string; articles: Article[] }) => data,
  )
  .handler(async ({ data }) => {
    const { curateArticlesImpl } = await import("./ai-curator.server");
    return curateArticlesImpl(data);
  });
