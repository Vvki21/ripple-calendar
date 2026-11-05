import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production builds are served from GitHub Pages at /ripple-calendar/; dev stays at /.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/ripple-calendar/' : '/',
  plugins: [react()],
  server: { port: 5173 },
}));
