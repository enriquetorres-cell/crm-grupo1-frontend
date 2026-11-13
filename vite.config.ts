import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Swagger UI (~1,5 MB) va en su propio chunk y solo se descarga al abrir /docs.
  build: { chunkSizeWarningLimit: 1600 },
})
