import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/chat/',
  server: {
    proxy: {
      '/admin': 'http://localhost:8080',
      '/session': 'http://localhost:8080',
      '/chat': {
        target: 'http://localhost:8080',
        bypass: (req) => {
          // Don't proxy requests for static assets
          if (req.url?.includes('.')) return req.url
          return null
        }
      },
      '/webhook': 'http://localhost:8080',
      '/user': 'http://localhost:8080',
      '/group': 'http://localhost:8080',
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
