import { Buffer } from "buffer";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v4 as uuidV4 } from "uuid";
import { z } from "zod";

import { Bindings } from "@/bindings";
import {
  Transportation,
  checkinSchema,
  sortCheckins,
} from "@/libs/locations/parser";
import {
  fetchNearbyPlaces,
  getLocationImageKey,
  getTransportation,
  updateTransportation,
} from "@/libs/locations/request";
// import { authorize } from "@/middlewares/auth";

const app = new Hono<{ Bindings: Bindings }>();

// 位置情報の取得
const getPlacesQuerySchema = z.object({
  latitude: z.string(),
  longitude: z.string(),
  query: z.string().optional(),
});

app.get("/places", zValidator("query", getPlacesQuerySchema), async (c) => {
  const { latitude, longitude, query } = c.req.valid("query");

  const result = await fetchNearbyPlaces(
    latitude,
    longitude,
    query ?? null,
    50,
    c.env.FOURSQUARE_API_KEY,
  );
  if (!result.success) {
    return c.text(result.value, 500);
  }
  return c.json(result);
});

// 移動の取得
const getParamSchema = z.object({
  id: z.string(),
});

app.get("/:id", zValidator("param", getParamSchema), async (c) => {
  const { id } = c.req.valid("param");

  const readResult = await getTransportation(
    id,
    c.env.MICROCMS_LOCATION_API_KEY,
  );
  if (!readResult.success) {
    return readResult.value;
  }
  sortCheckins(readResult.value.checkins);
  return c.json(readResult.value);
});

const postJsonSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
});

// 移動の新規作成
app.post("/", zValidator("json", postJsonSchema), async (c) => {
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
  return c.json(transportation, 201);
});

// チェックインの追加・更新
const checkinParamSchema = z.object({
  id: z.string(),
  checkinId: z.string().uuid(),
});

app.put(
  "/:id/checkins/:checkinId",
  zValidator("param", checkinParamSchema),
  zValidator("json", checkinSchema),
  async (c) => {
    const { id, checkinId } = c.req.valid("param");
    const checkin = c.req.valid("json");

    // 既存の情報を読み込む
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

    // 既に存在する場合は上書き
    const existingCheckinIndex = transportation.checkins.findIndex(
      (c) => c.id === checkinId,
    );
    if (existingCheckinIndex > -1) {
      transportation.checkins[existingCheckinIndex] = checkin;
    } else {
      transportation.checkins.push(checkin);
    }
    sortCheckins(readResult.value.checkins);

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
    return c.body(null, 204);
  },
);

// チェックインの削除
app.delete(
  "/:id/checkins/:checkinId",
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
    return c.body(null, 204);
  },
);

// 画像のアップロード
const postImageParamSchema = z.object({
  id: z.string(),
});

const postImageJsonSchema = z.object({
  images: z.array(z.string()),
});

app.post(
  "/:id/images",
  zValidator("param", postImageParamSchema),
  zValidator("json", postImageJsonSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { images } = c.req.valid("json");

    const imageIds: string[] = images.map(() => uuidV4());

    for (let i = 0; i < images.length; i++) {
      const key = getLocationImageKey(id, imageIds[i]);

      try {
        const buffer = Buffer.from(
          images[i].replace("data:image/webp;base64,", ""),
          "base64",
        );
        // 3 MB を越えるファイルのアップロードを制限
        if (buffer.byteLength > 1024 * 1024 * 3) {
          return c.text("The file size is required to less than 3 MB", 413);
        }
        await c.env.R2.put(key, buffer);
      } catch (e) {
        console.log(e);
        return c.text(`Failed to upload an image: ${e}`, 500);
      }
    }
    return c.json(imageIds, 201);
  },
);

const deleteImageParamSchema = z.object({
  id: z.string(),
  imageId: z.string().uuid(),
});

// 画像の削除
app.delete(
  "/:id/images/:imageId",
  zValidator("param", deleteImageParamSchema),
  async (c) => {
    const { id, imageId } = c.req.valid("param");

    try {
      await c.env.R2.delete(getLocationImageKey(id, imageId));
    } catch (e) {
      console.log(e);
      return c.text(`Failed to delete the image: ${e}`, 500);
    }
    return c.body(null, 204);
  },
);

// TODO: swarm へのクロスポスト

export default app;
