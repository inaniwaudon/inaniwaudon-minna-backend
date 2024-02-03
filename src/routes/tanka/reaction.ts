import { Bindings } from "@/bindings";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

export const maxReactionCount = 10;

const app = new Hono<{ Bindings: Bindings }>();

// リアクションの投稿
const postJsonSchema = z.object({
  tanka_id: z.number(),
  reaction: z.literal("plusone"),
});

export interface ReactionResult {
  executed: boolean;
}

app.post("/", zValidator("json", postJsonSchema), async (c) => {
  try {
    const { tanka_id, reaction } = c.req.valid("json");

    // 同一短歌に対するリアクション数を取得
    const ip = c.req.header("CF-Connecting-IP") ?? "undefined";
    const result = (await c.env.DB.prepare(
      "SELECT count(*) FROM tanka_reaction WHERE tanka_id = ? AND ip = ?",
    )
      .bind(tanka_id, ip)
      .first()) as { "count(*)": number };

    // 指定回数以上のリアクション
    if (result["count(*)"] + 1 > maxReactionCount) {
      const response: ReactionResult = { executed: false };
      return c.json(response, { status: 201 });
    }

    // リアクションの追加
    await c.env.DB.prepare(
      "INSERT INTO tanka_reaction (tanka_id, ip, reaction) VALUES (?, ?, ?)",
    )
      .bind(tanka_id, ip, reaction)
      .run();

    const response: ReactionResult = { executed: true };
    return c.json(response);
  } catch (e: any) {
    return c.text(e, 500);
  }
});

export default app;
