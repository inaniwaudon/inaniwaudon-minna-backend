import { Hono } from "hono";

import { Bindings } from "@/bindings";
import { authorize } from "@/middlewares/auth";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", authorize, async (c) => {
  return c.text(`Welcome, ${c.var.userId}`);
});

export default app;
