import { z } from "zod";

export const foursquarePlaceSchema = z.object({
  fsqId: z.string().min(1),
  name: z.string().min(1),
  formattedAddress: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const checkinSchema = z.object({
  location: z.string().min(1),
  id: z.string().uuid(),
  datetime: z.string().datetime({ offset: true }),
  fsqPlace: foursquarePlaceSchema.optional(),
  description: z.string(),
  photos: z.array(
    z.object({
      src: z.string().min(1),
      alt: z.string(),
      caption: z.optional(z.string()),
    }),
  ),
});

export const transportationSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
  checkins: z.array(checkinSchema),
});

export type FoursquarePlace = z.infer<typeof foursquarePlaceSchema>;
export type Checkin = z.infer<typeof checkinSchema>;
export type Transportation = z.infer<typeof transportationSchema>;

export interface FoursquareOriginalPlace {
  fsq_id: string;
  geocodes?: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  location: {
    address?: string;
    address_extended?: string;
    country: string;
    cross_street?: string;
    formatted_address: string;
    locality?: string;
    postcode?: string;
    region: string;
  };
  name: string;
}

export const parseTransportation = (text: string) => {
  const lines = text.split("\n");
  const checkins: Checkin[] = [];
  let title = "";
  let date = "";

  // 全体情報
  let headerI = 0;
  for (headerI = 0; headerI < lines.length; headerI++) {
    const line = lines[headerI];
    // タイトル
    const titleResult = line.match(/^#([^#]+)/);
    if (titleResult) {
      title = titleResult[1].trim();
    }
    // 日時
    const dateResult = line.match(/^- date:(.*)/);
    if (dateResult) {
      date = dateResult[1].trim();
      break;
    }
  }

  for (let i = headerI + 1; i < lines.length; i++) {
    const line = lines[i];

    // 場所を新たに追加
    const locationResult = line.match(/^##([^#]+)/);
    if (locationResult) {
      const location = locationResult[1].trim();
      checkins.push({
        id: "",
        datetime: "",
        location,
        photos: [],
        description: "",
      });
      continue;
    }

    if (checkins.length === 0) {
      continue;
    }
    const checkin = checkins.at(-1)!;

    // ID
    const idResult = line.match(/^- id: (.+)/);
    if (idResult) {
      checkin.id = idResult[1].trim();
      continue;
    }

    // 日時
    const dateResult = line.match(/^- date:(.*)/);
    if (dateResult) {
      checkin.datetime = dateToISOStringWithTimezone(
        new Date(dateResult[1].trim()),
      );
      continue;
    }

    // Foursquare の位置情報
    const addFsqPlace = () => {
      if (checkin.fsqPlace) {
        return;
      }
      checkin.fsqPlace = {
        fsqId: "",
        name: "",
        formattedAddress: "",
      };
    };

    const fsqIdResult = line.match(/^-\s*fsq_id:(.+)/);
    const fsqNameResult = line.match(/^-\s*fsq_name:(.+)/);
    const fsqLatitudeResult = line.match(/^-\s*fsq_latitude:(.+)/);
    const fsqLongitudeResult = line.match(/^-\s*fsq_longitude:(.+)/);
    const fsqAddressResult = line.match(/^-\s*fsq_address:(.+)/);

    const isFsq =
      fsqIdResult ||
      fsqNameResult ||
      fsqLatitudeResult ||
      fsqLongitudeResult ||
      fsqAddressResult;

    if (isFsq) {
      addFsqPlace();
    }
    if (fsqIdResult) {
      checkin.fsqPlace!.fsqId = fsqIdResult[1].trim();
    }
    if (fsqNameResult) {
      checkin.fsqPlace!.name = fsqNameResult[1].trim();
    }
    if (fsqLatitudeResult) {
      checkin.fsqPlace!.latitude = parseFloat(fsqLatitudeResult[1].trim());
    }
    if (fsqLongitudeResult) {
      checkin.fsqPlace!.longitude = parseFloat(fsqLongitudeResult[1].trim());
    }
    if (fsqAddressResult) {
      checkin.fsqPlace!.formattedAddress = fsqAddressResult[1].trim();
    }
    if (isFsq) {
      continue;
    }

    // 写真
    const photoResult = line.match(/^!\[(.*)\]\((.*)\)/);
    if (photoResult) {
      checkin.photos.push({ src: photoResult[2], alt: photoResult[1] });
      continue;
    }
    // 写真のキャプション
    const captionResult = line.match(/^\*(.+)\*/);
    if (captionResult && checkin.photos.length > 0) {
      checkin.photos.at(-1)!.caption = captionResult[1];
      continue;
    }

    // 説明文
    const trimedLine = line.trim();
    if (trimedLine.length > 0) {
      checkin.description += `${trimedLine}\n`;
    }
  }

  for (const checkin of checkins) {
    checkin.description = checkin.description.trim();
  }

  return { title, date, checkins };
};

const dateToISOStringWithTimezone = (date: Date) => {
  const pad = (str: string) => `0${str}`.slice(-2);

  const year = date.getFullYear().toString();
  const month = pad((date.getMonth() + 1).toString());
  const day = pad(date.getDate().toString());
  const hour = pad(date.getHours().toString());
  const min = pad(date.getMinutes().toString());
  const sec = pad(date.getSeconds().toString());
  const tz = -date.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const tzHour = pad((tz / 60).toString());
  const tzMin = pad((tz % 60).toString());

  return `${year}-${month}-${day}T${hour}:${min}:${sec}${sign}${tzHour}:${tzMin}`;
};

export const stringifyTransportation = (transportation: Transportation) => {
  const { title, date, checkins } = transportation;

  // チェックイン
  const allParts: string[][][] = [];
  allParts.push([[`# ${title}`]]);
  allParts.push([[`- date: ${date}`]]);

  for (const checkin of checkins) {
    const parts: string[][] = [
      [`## ${checkin.location}`],
      [
        `- id: ${checkin.id}`,
        `- date: ${dateToISOStringWithTimezone(new Date(checkin.datetime))}`,
      ],
    ];

    // Foursquare の位置情報
    if (checkin.fsqPlace) {
      const part = [
        `- fsq_id: ${checkin.fsqPlace.fsqId}`,
        `- fsq_name: ${checkin.fsqPlace.name}`,
        `- fsq_address: ${checkin.fsqPlace.formattedAddress}`,
      ];
      if (checkin.fsqPlace.latitude && checkin.fsqPlace.longitude) {
        part.push(
          `- fsq_latitude: ${checkin.fsqPlace.latitude}`,
          `- fsq_longitude: ${checkin.fsqPlace.longitude}`,
        );
      }
      parts.push(part);
    }

    // 説明文
    if (checkin.description.length > 0) {
      parts.push([checkin.description]);
    }

    // 写真
    checkin.photos.map((photo) => {
      const photoPart: string[] = [];
      photoPart.push(`![${photo.alt}](${photo.src})`);
      if (photo.caption) {
        photoPart.push(`*${photo.caption}*`);
      }
      parts.push(photoPart);
    });

    allParts.push(parts);
  }

  const text = allParts
    .map((parts) => parts.map((part) => part.join("\n")).join("\n\n"))
    .join("\n\n");
  return `${text}\n`;
};

export const sortCheckins = (checkins: Checkin[]) => {
  return checkins.sort((a, b) => {
    return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
  });
};
