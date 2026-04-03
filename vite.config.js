import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  base: '/thailand-starlink-tracker/',
  build: {
    rollupOptions: {
      external: [],
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['react-globe.gl'],
  },
})
