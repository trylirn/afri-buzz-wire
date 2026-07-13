export type Region = "africa" | "nigeria" | "america";

export type Article = {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  publishedAt: string;
  image: string | null;
  category: string;
  region: Region;
  tweet?: string;
};

export type CategorySlug =
  | "top"
  | "breaking"
  | "politics-business"
  | "security"
  | "sports"
  | "entertainment"
  | "tech"
  | "health"
  | "viral"
  | "fx";
