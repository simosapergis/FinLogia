import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import type { UserConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'FinLogia Accountant Portal',
        short_name: 'Accountant',
        description: 'View and export client invoices from the FinLogia platform.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-app': ['firebase/app'],
          'firebase-auth': ['firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  } satisfies UserConfig['test'],
});
