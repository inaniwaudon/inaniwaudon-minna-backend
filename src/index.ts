import { Hono } from "hono";
import { cors } from "hono/cors";

import { Bindings } from "./bindings";
import auth from "./routes/auth";
import locations from "./routes/locations";
import tanka from "./routes/tanka";

const app = new Hono<{ Bindings: Bindings }>();

app.use("/*", async (c, next) =>
  cors({
    allowMethods: ["POST", "GET", "PUT", "OPTIONS", "PATCH", "DELETE"],
    maxAge: 86400,
    origin: [c.env.FRONTEND_URL, c.env.FRONTEND_DEV_URL],
    credentials: true,
  })(c, next),
);

app.get("/", (c) => {
  return c.text("This is backend for いなにわうどん.みんな");
});

app.route("/auth", auth);
app.route("/locations", locations);
app.route("/tanka", tanka);

export default app;
