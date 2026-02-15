import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { componentTagger } from 'lovable-tagger'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  server: {
    host: '::',
    port: 8080,
    proxy: {
      '/trpc': 'http://localhost:3001'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
}))
