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
              if (id.includes('/node_modules/three/examples/')) {
                return 'vendor-three-extras';
              }
              if (id.includes('/node_modules/three/src/renderers/')) {
                return 'vendor-three-renderers';
              }
              if (id.includes('/node_modules/three/src/math/')) {
                return 'vendor-three-math';
              }
              if (id.includes('/node_modules/three/src/geometries/')) {
                return 'vendor-three-geometries';
              }
              if (id.includes('/node_modules/three/src/materials/')) {
                return 'vendor-three-materials';
              }
              if (id.includes('/node_modules/three/src/loaders/')) {
                return 'vendor-three-loaders';
              }
              if (id.includes('/node_modules/three/')) {
                return 'vendor-three-core';
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
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('victory')) {
                return 'vendor-charts';
              }
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

            // Split app services
            if (id.includes('/services/') && !id.includes('node_modules')) {
              if (id.includes('gemini') || id.includes('aiService')) {
                return 'app-ai-services';
              }
              return 'app-services';
            }

            // Split heavy views
            if (id.includes('/components/') && !id.includes('node_modules')) {
              // 3D components
              if (id.includes('/3d/') || id.includes('Eye3D') || id.includes('Canvas')) {
                return 'app-3d';
              }
              // Closet components (heavily used)
              if (id.includes('/closet/')) {
                return 'app-closet';
              }
              // Landing page
              if (id.includes('/landing/') || id.includes('Landing')) {
                return 'app-landing';
              }
              // Studio
              if (id.includes('/studio/') || id.includes('Studio')) {
                return 'app-studio';
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
