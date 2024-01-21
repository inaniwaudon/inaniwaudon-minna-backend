import { Hono } from "hono";
import { cors } from "hono/cors";

import { Bindings } from "./bindings";
import auth from "./routes/auth";
import locations from "./routes/locations";

const app = new Hono<{ Bindings: Bindings }>();
app.use(
  "/*",
  cors({
    origin: ["http://localhost:3000", "https://xn--n8je9hcf0t4a.xn--q9jyb4c"],
  }),
);

app.get("/", (c) => {
  return c.text("This is backend for いなにわうどん.みんな");
});

app.route("/auth", auth);
app.route("/locations", locations);

export default app;
