import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['@x/shared'],
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          changeOrigin: true,
          target: environment.SERVER_PROXY_TARGET ?? 'http://127.0.0.1:3001',
        },
        '/socket.io': {
          changeOrigin: true,
          target: environment.SERVER_PROXY_TARGET ?? 'http://127.0.0.1:3001',
          ws: true,
        },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          changeOrigin: true,
          target: environment.SERVER_PROXY_TARGET ?? 'http://127.0.0.1:3001',
        },
        '/socket.io': {
          changeOrigin: true,
          target: environment.SERVER_PROXY_TARGET ?? 'http://127.0.0.1:3001',
          ws: true,
        },
      },
      strictPort: true,
    },
  };
});
