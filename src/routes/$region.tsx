import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import type { Region } from "@/lib/news.functions";

const VALID: Region[] = ["africa", "nigeria"];

export const Route = createFileRoute("/$region")({
  beforeLoad: ({ params }) => {
    if (!VALID.includes(params.region as Region)) throw notFound();
  },
  component: () => <Outlet />,
});
