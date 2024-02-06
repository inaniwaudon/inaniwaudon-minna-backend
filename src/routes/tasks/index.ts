import { Hono } from "hono";
import { cache } from "hono/cache";

import { Bindings } from "@/bindings";

interface Issue {
  title: string;
  number: number;
  state: "open" | "closed";
  body: string | null;
  created_at: string;
  closed_at: string | null;
}

const isPublicIssue = (body: string | null) => {
  if (!body) {
    return false;
  }
  return body
    .split("\n")
    .map((line) => line.trim())
    .some((line) => line === "public");
};

const app = new Hono<{ Bindings: Bindings }>();

app.get(
  "/",
  cache({
    cacheName: "inaniwaudon-minna-backend",
    cacheControl: "max-age=3600",
  }),
  async (c) => {
    const url = new URL(
      "https://api.github.com/repos/inaniwaudon/tasks/issues",
    );
    url.searchParams.append("state", "all");
    url.searchParams.append("per_page", String(100));
    url.searchParams.append("X-GitHub-Api-Version", "2022-11-28");

    try {
      const response = await fetch(url.href, {
        headers: {
          Authorization: `token ${c.env.GITHUB_ISSUES_PAT}`,
          "User-Agent": "inaniwaudon-minna",
        },
      });
      if (!response.ok) {
        return c.text("Failed to fetch issues", 500);
      }
      const json = (await response.json()) as Issue[];
      const data = json.map(
        ({ title, number, state, body, created_at, closed_at }) => {
          const isPublic = isPublicIssue(body);
          return {
            title: isPublic ? title : "private task",
            number,
            state,
            created_at,
            closed_at,
            public: isPublic,
          };
        },
      );

      // cache
      return c.json({
        tasks: data,
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      return c.text(e, 500);
    }
  },
);

export default app;
