import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', '');
  const analyze = process.env.ANALYZE === 'true' || mode === 'analyze';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      ...(analyze
        ? [
          visualizer({
            filename: './dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Only for production builds: force a multi-module entry so Rollup can split Three.js
        // into smaller vendor chunks (improves caching + removes >600k warning).
        ...(command === 'build'
          ? { three: path.resolve(__dirname, 'node_modules/three/src/Three.js') }
          : {}),
      }
    },
    build: {
      target: 'es2015',
      cssCodeSplit: true,
      modulePreload: {
        resolveDependencies: (_filename, deps, context) => {
          // Keep default preload behavior for non-HTML hosts.
          if (context.hostType !== 'html') return deps;

          // Avoid pulling heavyweight optional chunks into first-load preload.
          // They remain lazy-loadable when the corresponding feature is used.
          const deferredChunkHints = [
            'vendor-three-',
            'vendor-r3f-',
            'vendor-drei-',
            'app-3d-',
            'vendor-ai-',
            'vendor-motion-',
            'app-services-',
            'app-landing-',
            'backgroundRemoval-',
            'ort.bundle.min-',
            'ort.webgpu.bundle.min-',
          ];

          return deps.filter((dep) => !deferredChunkHints.some((hint) => dep.includes(hint)));
        },
      },
      chunkSizeWarningLimit: 600,
      // Huge speedup on large bundles. Use `ANALYZE=true npm run build` when you need size breakdowns.
      reportCompressedSize: false,
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks: (id) => {
            // IMPORTANT: keep Rollup/Vite virtual helper modules inside `vendor-react`.
            // Otherwise Rollup may place helpers (ex: commonjs default-export interop)
            // into some other vendor chunk (charts/3d/etc). If `vendor-react` then imports
            // that helper from a chunk that itself imports React from `vendor-react`,
            // you get a circular chunk dependency and runtime TDZ errors like:
            // "Cannot access 'P' before initialization".
            if (id.includes('commonjsHelpers') || id.startsWith('\0commonjsHelpers')) {
              return 'vendor-react';
            }

            // Vendor chunks for heavy dependencies
            if (id.includes('node_modules')) {
              // React core - include react itself to avoid R3F reconciler issues
              if (id.includes('node_modules/react/') || id.includes('react-dom') || id.includes('react-router') || id.includes('scheduler') || id.includes('react-reconciler')) {
                return 'vendor-react';
              }
              // Animation
              if (id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              // Icons
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              // Supabase
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              // Three.js and 3D (heavy)
              if (id.includes('/node_modules/three/')) {
                // Keep all of Three.js in a single chunk. Splitting `three/src/Three.js` (entry)
                // from submodules (geometries/materials/math/...) can create circular chunk
                // dependencies and runtime TDZ errors in production.
                return 'vendor-three';
              }
              if (id.includes('@react-three/fiber')) {
                return 'vendor-r3f';
              }
              if (id.includes('@react-three/drei')) {
                return 'vendor-drei';
              }
              if (id.includes('@react-three')) {
                return 'vendor-r3f';
              }
              // Charts - let Vite handle recharts naturally to avoid initialization issues
              // Recharts has complex internal dependencies that break with manual chunking
              /*
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('victory')) {
                return 'vendor-charts';
              }
              */
              // Date utilities
              if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
                return 'vendor-date';
              }
              // AI/ML related
              if (id.includes('@google') || id.includes('generative-ai')) {
                return 'vendor-ai';
              }
              // Image processing
              if (id.includes('html2canvas') || id.includes('html-to-image') || id.includes('browser-image-compression') || id.includes('canvas') || id.includes('jimp')) {
                return 'vendor-image';
              }
              // PDF generation
              if (id.includes('jspdf')) {
                return 'vendor-pdf';
              }
              // Other large libs
              if (id.includes('dompurify') || id.includes('marked') || id.includes('sanitize')) {
                return 'vendor-sanitize';
              }
            }
          }
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@supabase/supabase-js'],
      exclude: []
    }
  };
});
