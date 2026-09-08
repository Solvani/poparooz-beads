/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOP_URL?: string;
  readonly VITE_BEADS_COLLECTION_URL?: string;
  readonly VITE_GENERATOR_PUBLIC_URL?: string;
  readonly VITE_ALLOWED_PARENT_ORIGINS?: string;
  readonly VITE_MARKETING_CONSENT_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
