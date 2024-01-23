import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { v4 as uuidV4 } from "uuid";
import z from "zod";

import { Bindings } from "@/bindings";

const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

interface GitHubAccessTokenRequest {
  access_token?: string;
  scope?: string;
  token_type?: string;
}

const auth = new Hono<{ Bindings: Bindings }>();

const paramSchema = z.object({
  code: z.string(),
  state: z.string(),
  callback: z.string().optional(),
});

auth.get(
  "/",
  zValidator("query", paramSchema, (result, c) => {
    if (!result.success) {
      return c.text("Bad Request", 400);
    }
  }),
  async (c) => {
    const { code, state, callback } = c.req.valid("query");

    // CSRF 対策
    const cookieState = getCookie(c, "state")!;
    if (cookieState === undefined || cookieState !== state) {
      return c.text("Invalid state.", 400);
    }

    try {
      // アクセストークンを取得
      const accessTokenResponse = await fetch(GITHUB_ACCESS_TOKEN_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: c.env.GITHUB_CLIENT_ID,
          client_secret: c.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      if (!accessTokenResponse.ok) {
        return c.text("Failed to get an access token", 500);
      }
      const accessTokenJson: GitHubAccessTokenRequest =
        await accessTokenResponse.json();
      if (!accessTokenJson.access_token) {
        return c.text("Failed to get an access token", 500);
      }

      // ユーザ名を検証
      const userResponse = await fetch(GITHUB_USER_URL, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessTokenJson.access_token}`,
          "User-Agent": "photon",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (!userResponse.ok) {
        return c.text("Failed to get the user info", 500);
      }
      const userJson: { id: number } = await userResponse.json();
      const userId = userJson.id.toString();
      if (userId !== c.env.GITHUB_ADMIN_ID) {
        return c.text("Forbidden: Your account is not admin", 403);
      }

      // セッションを開始
      const ttl = 60 * 60 * 24;
      const sessionId = uuidV4();
      setCookie(c, "session_id", sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: ttl,
        path: "/",
      });
      await c.env.KV.put(sessionId, userId, {
        expirationTtl: ttl,
      });

      if (callback) {
        return c.redirect(callback, 302);
      }
      return c.text(`Sign in as admin (${c.env.GITHUB_ADMIN_ID})`, 200);
    } catch (e) {
      console.log(e);
      return c.text(`Internal Server Error: ${e}`, 500);
    }
  },
);

export default auth;
