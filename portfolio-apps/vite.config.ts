import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Every icon in the app is drawn from the Untitled UI set; the shim keeps the
      // Octicon names the content modules were written with. See scripts/build-icon-shim.mjs.
      '@primer/octicons-react': fileURLToPath(new URL('./src/ui/icons.tsx', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          primer: ['@primer/react', '@primer/octicons-react'],
          charts: ['recharts'],
        },
      },
    },
  },
})
