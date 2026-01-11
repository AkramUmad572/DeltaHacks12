import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Silently handle proxy errors when backend is not running
            // The application-level error handling will catch these
            if (err.code !== 'ECONNREFUSED') {
              console.error('Proxy error:', err);
            }
          });
        },
      },
    },
  },
});
