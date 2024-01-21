import { Hono } from "hono";

import { Bindings } from "./bindings";
import auth from "./routes/auth";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text("This is backend for いなにわうどん.みんな");
});

app.route("/auth", auth);

export default app;
