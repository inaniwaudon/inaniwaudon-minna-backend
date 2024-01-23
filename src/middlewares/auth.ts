import { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";

import { Bindings } from "@/bindings";

export const authorize: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: { userId: string };
}> = async (c, next) => {
  const sessionId = getCookie(c, "session_id");
  if (!sessionId) {
    return c.text("Unauthorized", 401);
  }
  const userId = await c.env.KV.get(sessionId);
  if (!userId) {
    return c.text("Unauthorized", 401);
  }
  c.set("userId", userId);
  await next();
};
