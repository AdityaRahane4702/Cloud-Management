import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Local dev: proxy to local backend
        // Production: set VITE_API_URL env var to your deployed backend URL
        target: process.env.VITE_API_URL || 'http://localhost:5005',
        changeOrigin: true
      }
    }
  }
}));
