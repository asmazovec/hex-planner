/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative paths: GitHub Pages serves the app from /<repository>/, not from the site root.
  base: './',
  plugins: [
    react(),
    VitePWA({
      // A new version waits until the app is opened again, so a game in progress is never reloaded under the player.
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'TI4 Planner',
        short_name: 'TI4 Planner',
        start_url: '.',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#0d1016',
        theme_color: '#0d1016',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['**/node_modules/**', 'dist', 'tests/e2e/**', 'tests/scenarios/**','.claude/**'],
  },
});
