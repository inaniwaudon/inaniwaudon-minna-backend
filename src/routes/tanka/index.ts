import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
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

app.get("/", async (c) => {
  try {
    const executed = await c.env.DB.prepare(
      `SELECT t.id, t.tanka, t.name, t.ip, t.comment, t.supplement, COUNT(tr.id) AS plusone_count
        FROM tanka AS t
        LEFT OUTER JOIN tanka_reaction tr ON t.id = tr.tanka_id AND tr.reaction = 'plusone'
        WHERE deleted_at IS NULL
        GROUP BY t.id
        ORDER BY t.id DESC;`,
    ).all();
    const results = executed.results as any as TankaGETResult;
    return c.json(results);
  } catch (e: any) {
    return c.text(e, 500);
  }
});

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
