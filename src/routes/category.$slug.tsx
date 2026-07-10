import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/category/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$region/$category",
      params: { region: "africa", category: params.slug },
    });
  },
  component: () => null,
});
