export type Bindings = {
  KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_ADMIN_ID: string;
};

declare global {
  function getMiniflareBindings(): Bindings;
}
