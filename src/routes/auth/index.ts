import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { v4 as uuidV4 } from "uuid";

import { Bindings } from "@/bindings";
import callback from "./callback";

const app = new Hono<{ Bindings: Bindings }>();

// c.f. https://github.com/inaniwaudon/oauth-test
app.get("/signin", async (c) => {
  const state = uuidV4();
  setCookie(c, "state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
  });
  return c.redirect(
    `https://github.com/login/oauth/authorize?client_id=${c.env.GITHUB_CLIENT_ID}&state=${state}`,
    302,
  );
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
