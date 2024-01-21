import { Result, fail, succeed } from "../utils";
import {
  Transportation,
  parseTransportation,
  stringifyTransportation,
  transportationSchema,
} from "./parser";

const microCmsUrl = "https://inaniwaudon-minna.microcms.io/api/v1/locations";

const returnMicroCMSError = async (response: Response) => {
  const result: { message: string } = await response.json();
  return new Response(`Failed to call API of microCMS: ${result.message}`, {
    status: 500,
  });
};

export const getTransportation = async (
  id: string,
  apiKey: string,
): Promise<Result<Transportation, Response>> => {
  let text: string;
  try {
    const response = await fetch(`${microCmsUrl}/${id}`, {
      headers: {
        "X-MICROCMS-API-KEY": apiKey,
      },
    });
    if (!response.ok) {
      if (response.status === 404) {
        return fail(new Response("Not found", { status: 404 }));
      }
      return fail(await returnMicroCMSError(response));
    }
    const result: { body: string } = await response.json();
    text = result.body;
  } catch (e) {
    return fail(
      new Response(`Failed to connection to microCMS: ${e}`, { status: 500 }),
    );
  }

  // パース
  const transportation = parseTransportation(text);
  const parsed = transportationSchema.safeParse(transportation);
  if (!parsed.success) {
    return fail(
      new Response(`Failed to validate: ${parsed.error.message}`, {
        status: 500,
      }),
    );
  }
  return succeed(parsed.data);
};

export const updateTransportation = async (
  id: string,
  transportation: Transportation,
  method: "PUT" | "PATCH",
  apiKey: string,
): Promise<Result<null, Response>> => {
  const body = stringifyTransportation(transportation);

  try {
    const response = await fetch(`${microCmsUrl}/${id}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-MICROCMS-API-KEY": apiKey,
      },
      body: JSON.stringify({ body }),
    });
    if (!response.ok) {
      return fail(await returnMicroCMSError(response));
    }
    return succeed(null);
  } catch (e) {
    return fail(
      new Response(`Failed to connection to microCMS: ${e}`, {
        status: 500,
      }),
    );
  }
};

export const getLocationImageKey = (id: string, imageId: string) => {
  return `locations/${id}/${imageId}.webp`;
};

export const fetchNearbyPlaces = async (
  latitude: string,
  longitude: string,
  query: string | null,
  limit: number,
  apiKey: string,
) => {
  const endpoint = "https://api.foursquare.com/v3/places/nearby";
  const params = new URLSearchParams({
    ll: `${latitude},${longitude}`,
    limit: limit.toString(),
  });
  if (query) {
    params.append("query", query);
  }

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      headers: {
        Authorization: apiKey,
      },
    });
    const json = (await response.json()) as any;
    if (!response.ok) {
      return fail(json.message);
    }
    return succeed(json);
  } catch (e) {
    return fail(e);
  }
};
