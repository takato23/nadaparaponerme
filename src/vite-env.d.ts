/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      spotLight: any;
      group: any;
      mesh: any;
      sphereGeometry: any;
      meshPhysicalMaterial: any;
      meshStandardMaterial: any;
      cylinderGeometry: any;
      coneGeometry: any;
      primitive: any;
    }
  }
}
