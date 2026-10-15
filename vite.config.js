import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        login: resolve(import.meta.dirname || '.', 'login.html'),
        main: resolve(import.meta.dirname || '.', 'index.html')
      }
    }
  }
});
