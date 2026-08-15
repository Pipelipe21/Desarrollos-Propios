import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.png', 'apple-touch-icon.png'],
          manifest: {
            lang: 'es',
            name: 'D&D Industries',
            short_name: 'D&D',
            description: 'Sistema de gestión D&D Industries: bazar, taller, RRHH y finanzas.',
            theme_color: '#0f172a',
            background_color: '#0f172a',
            display: 'standalone',
            start_url: '/',
            icons: [
              { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
              { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            // pdf.worker is large and rarely needed on first paint; cache on demand instead of precaching.
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            globIgnores: ['**/pdf.worker.min-*.mjs'],
            runtimeCaching: [
              {
                urlPattern: /pdf\.worker.*\.mjs$/,
                handler: 'CacheFirst',
                options: { cacheName: 'pdf-worker-cache' },
              },
            ],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
