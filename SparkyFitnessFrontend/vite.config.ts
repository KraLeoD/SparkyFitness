import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
// Removed VitePWA import - we handle Service Worker registration manually

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const backendHost = process.env.VITE_BACKEND_HOST || 'localhost';
  const target = `http://${backendHost}:3010`;
  return {
    server: {
      host: '::',
      port: 8080,
      allowedHosts: true, // Allow all hosts in development to prevent HMR connection failures
      proxy: {
        '/health-data': {
          target: target,
          changeOrigin: true,
          rewrite: (path) => `/api${path}`, // Add /api/ prefix
        },
        '/api': {
          target: target,
          changeOrigin: true,
        },
        '/uploads': {
          target: target,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      tailwindcss(),
      react(),
      // Removed VitePWA plugin - we handle Service Worker and manifest manually
      // This prevents VitePWA from injecting registerSW.js script tags
    ].filter(Boolean),
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Large independent packages in their own chunks
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('@radix-ui')) return 'vendor-radix';
              if (
                id.includes('@ericblade/quagga2') ||
                id.includes('html5-qrcode') ||
                id.includes('@zxing/library')
              )
                return 'vendor-scanners';
              if (id.includes('@dnd-kit')) return 'vendor-dnd';
              // Everything else (React, utilities, auth ) together to avoid dependency issues
              // This ensures React loads before anything that depends on it
              return 'vendor-others';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@workspace/shared': path.resolve(__dirname, '../shared'),
      },
      dedupe: ['react', 'react-dom'],
    },
  };
});
