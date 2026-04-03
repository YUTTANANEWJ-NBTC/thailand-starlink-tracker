import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    react(),
  ],
  base: command === 'build' ? '/thailand-starlink-tracker/' : '/',
  worker: {
    format: 'es',
  },
}))
