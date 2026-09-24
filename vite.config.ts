import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@shared': path.resolve(__dirname, 'shared') } },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/xlsx/')) return 'xlsx';
          if (id.includes('/qrcode/')) return 'qrcode';
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/') || id.includes('/react-router')) return 'react';
          if (id.includes('/zod/')) return 'zod';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Keep the browser's Host header so the API's same-origin (CSRF) check matches the page origin.
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: false },
      '/media': { target: 'http://localhost:8080', changeOrigin: false },
    },
  },
});
