import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      }
    },
    // This ensures that all routes (e.g. /results, /history) are served by index.html
    // so React Router can handle them on the client side after a page refresh.
    historyApiFallback: true,
  }
});
