import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cache } from "hono/cache";
import { z } from "zod";

import { Bindings } from "@/bindings";
import reaction from "./reaction";

interface Tanka {
  id: number;
  tanka: string;
  name: string;
  ip: string;
  comment: string | null;
  supplement: string | null;
  plusone_count: number;
}

const tankaMaxLength = 40;

const app = new Hono<{ Bindings: Bindings }>();
app.route("/reaction", reaction);

// 短歌一覧の取得
export type TankaGETResult = Tanka[];

app.get(
  "/",
  cache({
    cacheName: "inaniwaudon-minna-backend",
    cacheControl: "max-age=60",
  }),
  async (c) => {
    try {
      const executed = await c.env.DB.prepare(
        `SELECT t.id, t.tanka, t.name, t.ip, t.comment, t.supplement,
          COALESCE(r.plusone_count, 0) AS plusone_count
        FROM tanka AS t
        LEFT JOIN (
          SELECT CAST(tanka_id AS INTEGER) AS tanka_id_int, COUNT(*) AS plusone_count
          FROM tanka_reaction
          WHERE reaction = 'plusone'
          GROUP BY tanka_id
        ) AS r ON t.id = r.tanka_id_int
        WHERE t.deleted_at IS NULL
        ORDER BY t.id DESC;`,
      ).all();
      const results = executed.results as any as TankaGETResult;
      return c.json(results);
    } catch (e: any) {
      return c.text(e, 500);
    }
  },
);

// 短歌の追加
const postJsonSchema = z.object({
  tanka: z.string().min(1).max(tankaMaxLength),
  name: z.string().min(1),
  comment: z.string().optional(),
  color1680: z.boolean(),
});

app.post("/", zValidator("json", postJsonSchema), async (c) => {
  const { tanka, name, comment, color1680 } = c.req.valid("json");
  try {
    const ip = c.req.header("CF-Connecting-IP") ?? "undefined";
    const supplement = color1680 ? "1680" : "";
    await c.env.DB.prepare(
      "INSERT INTO tanka (tanka, name, ip, comment, supplement) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(tanka, name, ip, comment, supplement)
      .run();

    return c.text("Created", 201);
  } catch (e: any) {
    return c.text(e, 500);
  }
});

export default app;
