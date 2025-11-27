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
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
          passes: 2
        },
        mangle: {
          safari10: true
        },
        format: {
          comments: false
        }
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks optimization
            if (id.includes('node_modules')) {
              // React core + React UI libraries that depend on React context
              if (id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('scheduler') ||
                id.includes('framer-motion') ||
                id.includes('lucide-react') ||
                id.includes('@use-gesture/react')) {
                return 'vendor-react';
              }
              // Supabase + PostgREST
              if (id.includes('@supabase') || id.includes('postgrest')) {
                return 'vendor-supabase';
              }
              // Charts and heavy libs (includes Redux as transitive dependency)
              if (id.includes('recharts') || id.includes('d3') || id.includes('redux') || id.includes('@reduxjs')) {
                return 'vendor-charts';
              }
              // DnD library (also uses Redux internally)
              if (id.includes('@hello-pangea/dnd')) {
                return 'vendor-charts';
              }
              // Calendar libs
              if (id.includes('fullcalendar')) {
                return 'vendor-calendar';
              }
              // Other vendor code
              return 'vendor-misc';
            }

            // Heavy feature components (lazy loaded separately)
            if (id.includes('/components/ClosetAnalyticsView')) {
              return 'feature-analytics';
            }
            if (id.includes('/components/WeeklyPlannerView')) {
              return 'feature-planner';
            }
            if (id.includes('/components/LookbookCreatorView')) {
              return 'feature-lookbook';
            }
            if (id.includes('/components/ActivityFeedView')) {
              return 'feature-activity';
            }
            if (id.includes('/components/CalendarSyncView')) {
              return 'feature-calendar';
            }
          },
          // Optimize chunk naming
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@supabase/supabase-js'],
      exclude: []
    }
  };
});
