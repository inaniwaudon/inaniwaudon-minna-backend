import { v4 as uuidV4 } from "uuid";
import {
  Transportation,
  parseTransportation,
  stringifyTransportation,
} from "./parser";

const uuids = [uuidV4(), uuidV4(), uuidV4(), uuidV4()];

const newText = `# 名古屋旅行

- date: 2024-01-27–30
`;

const allText = `# 鶴見散歩

- date: 2024-01-01

## 鶴見

- id: ${uuids[0]}
- date: 2024-01-01T06:22:00+09:00

## 鶴見小野

- id: ${uuids[1]}
- date: 2024-01-01T08:03:00+09:00

鶴見線はいいですね〜〜
ローカル路線

## ふれ〜ゆ

- id: ${uuids[2]}
- date: 2024-01-01T09:16:00+09:00

- fsq_id: 4caeeb861463a143f92490a9
- fsq_name: 横浜市高齢者保養研修施設 ふれーゆ
- fsq_latitude: 35.479997
- fsq_longitude: 139.688232
- fsq_address: 鶴見区末広町1-15-2, 横浜市, 神奈川県, 230-0045

プール

## 海芝浦

- id: ${uuids[3]}
- date: 2024-01-01T10:33:00+09:00

![海芝浦駅](https://example.com/image0.webp)

![京浜工業地帯](https://example.com/image1.webp)
*ホームからは京浜工業地帯が一望できる*
`;

const newTransportation: Transportation = {
  title: "名古屋旅行",
  date: "2024-01-27–30",
  checkins: [],
};

const allTransportation: Transportation = {
  title: "鶴見散歩",
  date: "2024-01-01",
  checkins: [
    {
      location: "鶴見",
      id: uuids[0],
      datetime: "2024-01-01T06:22:00+09:00",
      photos: [],
      description: "",
    },
    {
      location: "鶴見小野",
      id: uuids[1],
      datetime: "2024-01-01T08:03:00+09:00",
      photos: [],
      description: "鶴見線はいいですね〜〜\nローカル路線",
    },
    {
      location: "ふれ〜ゆ",
      id: uuids[2],
      datetime: "2024-01-01T09:16:00+09:00",
      fsqPlace: {
        fsqId: "4caeeb861463a143f92490a9",
        name: "横浜市高齢者保養研修施設 ふれーゆ",
        latitude: 35.479997,
        longitude: 139.688232,
        formattedAddress: "鶴見区末広町1-15-2, 横浜市, 神奈川県, 230-0045",
      },
      photos: [],
      description: "プール",
    },
    {
      location: "海芝浦",
      id: uuids[3],
      datetime: "2024-01-01T10:33:00+09:00",
      photos: [
        {
          src: "https://example.com/image0.webp",
          alt: "海芝浦駅",
        },
        {
          src: "https://example.com/image1.webp",
          alt: "京浜工業地帯",
          caption: "ホームからは京浜工業地帯が一望できる",
        },
      ],
      description: "",
    },
  ],
};

describe.each`
  data       | expected
  ${newText} | ${newTransportation}
  ${allText} | ${allTransportation}
`("移動データの変換ができるか", ({ data, expected }) => {
  it("移動データをパースできるか", () => {
    const result = parseTransportation(data);
    expect(result).toEqual(expected);
  });

  it("移動データを作成できるか", () => {
    const result = stringifyTransportation(expected);
    expect(result).toEqual(data);
  });
});
