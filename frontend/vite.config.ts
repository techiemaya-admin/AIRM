import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@sdk': path.resolve(__dirname, './SDK'),
        '@': path.resolve(__dirname, './src'),
        '@features': path.resolve(__dirname, './features'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': [
              'react',
              'react-dom',
              'react-router-dom',
              '@tanstack/react-query'
            ],
            'ui-libs': [
              'lucide-react',
              'date-fns',
              'clsx',
              'tailwind-merge'
            ],
            'document-libs': [
              'jspdf',
              'docx-preview',
              'docxtemplater',
              'pizzip'
            ]
          }
        }
      },
      chunkSizeWarningLimit: 1000,
    },
    esbuild: {
      // Only drop console/debugger in production to keep dev logs visible
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    }
  }
})
