import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase-vendor';
          if (id.includes('/xlsx/')) return 'spreadsheet-vendor';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
