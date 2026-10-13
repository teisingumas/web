import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Vite config — https://vitejs.dev/config/
export default defineConfig({
  // Absolute asset paths: pages live at real paths (/tvarkarastis, /registracija/kainos),
  // so assets must resolve from the site root. The site is served from the domain root.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  // The admin chunk (Clerk + rich-text editor) is large but loads only on /adminas and /apzvalga.
  build: { chunkSizeWarningLimit: 700 },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
    // CMS_API=http://127.0.0.1:8080 npm run dev: send API and image requests to `npm run dev:php`
    proxy: process.env.CMS_API ? { '/api': process.env.CMS_API, '/media': process.env.CMS_API } : undefined,
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '4173'),
  },
})
