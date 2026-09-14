import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022', sourcemap: true },
  server: { host: '127.0.0.1', port: 4190, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:4191', changeOrigin: false } } },
  preview: { host: '127.0.0.1', port: 4190, strictPort: true },
});

