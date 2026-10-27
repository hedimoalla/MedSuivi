import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le serveur Express sert le build (web/dist) sur le même domaine : pas de proxy à configurer.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
