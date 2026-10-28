import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'pages' ? './' : '/',
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:8000' } },
  build: {
    outDir: mode === 'pages' ? 'dist-pages' : 'dist',
    rollupOptions: { output: { manualChunks: { charts: ['recharts'] } } },
  },
}));
