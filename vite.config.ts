import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      target: 'es2015',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
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
              if (id.includes('three') || id.includes('@react-three') || id.includes('drei') || id.includes('fiber')) {
                return 'vendor-three';
              }
              // Charts - let Vite handle recharts naturally to avoid initialization issues
              // Recharts has complex internal dependencies that break with manual chunking
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
              if (id.includes('browser-image-compression') || id.includes('canvas') || id.includes('jimp')) {
                return 'vendor-image';
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
