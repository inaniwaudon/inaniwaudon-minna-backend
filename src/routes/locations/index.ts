import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { Bindings } from "@/bindings";
import { Transportation, checkinSchema } from "@/libs/locations/parser";
import {
  getTransportation,
  updateTransportation,
} from "@/libs/locations/request";
// import { authorize } from "@/middlewares/auth";

const app = new Hono<{ Bindings: Bindings }>();

// 移動の取得
const getQuerySchema = z.object({
  id: z.string(),
});

app.get("/:id", zValidator("param", getQuerySchema), async (c) => {
  const { id } = c.req.valid("param");

  const readResult = await getTransportation(
    id,
    c.env.MICROCMS_LOCATION_API_KEY,
  );
  if (!readResult.success) {
    return readResult.value;
  }
  return c.json(readResult.value);
});

const postJsonSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
});

// 移動の新規作成
app.post(zValidator("json", postJsonSchema), async (c) => {
  const { id, title, date } = c.req.valid("json");

  const transportation: Transportation = {
    title,
    date,
    checkins: [],
  };
  const result = await updateTransportation(
    id,
    transportation,
    "PUT",
    c.env.MICROCMS_LOCATION_API_KEY,
  );
  if (!result.success) {
    return result.value;
  }
  return c.text("Created", 201);
});

// チェックインの追加・更新
const checkinParamSchema = z.object({
  id: z.string(),
  checkinId: z.string().uuid(),
});

const putCheckinJsonSchema = z.object({
  checkin: checkinSchema,
});

app.put(
  zValidator("param", checkinParamSchema),
  zValidator("json", putCheckinJsonSchema),
  async (c) => {
    const { id, checkinId } = c.req.valid("param");
    const { checkin } = c.req.valid("json");

    // 既存の情報を読み込んで修正
    const readResult = await getTransportation(
      id,
      c.env.MICROCMS_LOCATION_API_KEY,
    );
    if (!readResult.success) {
      return readResult.value;
    }
    const transportation = readResult.value;
    if (checkinId !== checkin.id) {
      return c.text("Invalid checkinId", 400);
    }
    transportation.checkins.push(checkin);

    // 更新
    const updateResult = await updateTransportation(
      id,
      transportation,
      "PATCH",
      c.env.MICROCMS_LOCATION_API_KEY,
    );
    if (!updateResult.success) {
      return updateResult.value;
    }
    return c.text("Updated", 204);
  },
);

// チェックインの削除
app.delete(
  "/:id/:checkinId",
  zValidator("param", checkinParamSchema),
  async (c) => {
    const { id, checkinId } = c.req.valid("param");

    // 既存の情報を読み込んで修正
    const readResult = await getTransportation(
      id,
      c.env.MICROCMS_LOCATION_API_KEY,
    );
    if (!readResult.success) {
      return readResult.value;
    }
    const transportation = readResult.value;
    transportation.checkins = transportation.checkins.filter(
      (checkin) => checkin.id !== checkinId,
    );

    // 更新
    const updateResult = await updateTransportation(
      id,
      transportation,
      "PATCH",
      c.env.MICROCMS_LOCATION_API_KEY,
    );
    if (!updateResult.success) {
      return updateResult.value;
    }
    return c.text("Updated", 204);
  },
);

export default app;
