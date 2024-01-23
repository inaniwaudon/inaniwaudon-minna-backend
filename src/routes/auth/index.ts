import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { v4 as uuidV4 } from "uuid";

import { Bindings } from "@/bindings";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import callback from "./callback";

const app = new Hono<{ Bindings: Bindings }>();

const getSigninQuerySchema = z.object({
  callback: z.string().optional(),
});

// c.f. https://github.com/inaniwaudon/oauth-test
app.get("/signin", zValidator("query", getSigninQuerySchema), async (c) => {
  const { callback } = c.req.valid("query");

  // コールバック先 URL が不正でないかを検証
  if (callback) {
    if (
      !callback.startsWith(c.env.FRONTEND_URL) &&
      !callback.startsWith(c.env.FRONTEND_DEV_URL)
    ) {
      return c.text("Invalid callback URL.", 400);
    }
  }

  const state = uuidV4();
  setCookie(c, "state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
  });
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", c.env.GITHUB_CLIENT_ID);
  url.searchParams.set("state", state);
  if (callback) {
    url.searchParams.set(
      "redirect_uri",
      `http://localhost:8787/auth/callback?callback=${encodeURIComponent(
        callback,
      )}`,
    );
  }

  return c.redirect(url.href, 302);
});

app.get("/signout", (c) => {
  const sessionId = getCookie(c, "session_id")!;
  setCookie(c, "session_id", "", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: -60,
    path: "/",
  });
  c.env.KV.delete(sessionId);
  return c.text("Sign out", 200);
});

app.route("/callback", callback);

export default app;
