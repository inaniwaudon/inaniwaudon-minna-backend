# inaniwaudon-minna-backend

[inaniwaudon-minna](https://github.com/inaniwaudon/inaniwaudon-minna) のバックエンドです。以下の機能を提供します。

- 短歌の投稿
- 移動記の記録

## 開発

```bash
yarn
yarn run dev
yarn run test
npm run deploy

# 短歌用データベースを構築
yarn add -g wrangler
npx wrangler d1 create inaniwaudon-minna
npx wrangler d1 execute inaniwaudon-minna --file=./create.sql
```

以下のトークンを取得し、環境変数（`.dev.vars` またはダッシュボード）に設定します。

- [GitHub OAuth App](https://docs.github.com/ja/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [GitHub Fine-grained personal access tokens](https://docs.github.com/ja/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [microCMS API](https://microcms.io/)
- [Foursquare API](https://location.foursquare.com/developer/)

```
GITHUB_CLIENT_SECRET=<GITHUB_CLIENT_SECRET>
GITHUB_ISSUES_PAT=<GITHUB_ISSUES_PAT>
MICROCMS_LOCATION_API_KEY=<MICROCMS_LOCATION_API_KEY>
FOURSQUARE_API_KEY=<FOURSQUARE_API_KEY>
```

`wrangler.toml.example` に従って、 `wrangler.toml` を記述します。

## 短歌の削除

不適切な短歌は、deleted_at カラムに任意の日付を追加してソフトデリートします。

```sql
UPDATE tanka SET deleted_at = "yyyy-MM-dd HH:mm:ss" WHERE ...
```
