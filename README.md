# inaniwaudon-minna-backend

[inaniwaudon-minna](https://github.com/inaniwaudon/inaniwaudon-minna) のバックエンドです。以下の機能を提供します。

- 短歌の投稿
- 移動記の記録

## 開発

[GitHub OAuth App](https://docs.github.com/ja/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)、[microCMS](https://microcms.io/)、[Foursquare API](https://location.foursquare.com/developer/) の API キーを取得し、環境変数に以下の値を設定します。

```
GITHUB_CLIENT_SECRET=<GITHUB_CLIENT_SECRET>
MICROCMS_LOCATION_API_KEY=<MICROCMS_LOCATION_API_KEY>
FOURSQUARE_API_KEY=<FOURSQUARE_API_KEY>
```

`wrangler.toml.example` に従って、 `wrangler.toml` を記述します。

```bash
yarn
yarn run dev
npm run deploy
```
