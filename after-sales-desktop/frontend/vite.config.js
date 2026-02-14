import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Important for Electron relation paths
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'build', // Maintain CRA output directory for scripts relying on it
  },
});
