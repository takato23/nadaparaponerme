/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_ENABLE_ANALYTICS_DEV?: string;
  readonly VITE_ENABLE_POSTHOG_DEV?: string;
  readonly VITE_POSTHOG_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
