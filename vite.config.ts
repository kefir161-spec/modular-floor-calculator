import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/calculator/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/tile-image-proxy': {
        target: 'https://plastfactor.com',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/tile-image-proxy/, ''),
      },
      '/pf-site': {
        target: 'https://plastfactor.com',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/pf-site/, ''),
      },
    },
  },
  preview: {
    proxy: {
      '/tile-image-proxy': {
        target: 'https://plastfactor.com',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/tile-image-proxy/, ''),
      },
      '/pf-site': {
        target: 'https://plastfactor.com',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/pf-site/, ''),
      },
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
})
