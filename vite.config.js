import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          console.error('CIRCULAR:', warning.ids?.join(' -> ') || warning.message);
        }
        warn(warning);
      },
      output: {
        manualChunks(id) {
          // React e React-DOM em chunk separado
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Firebase em chunk separado
          if (id.includes('firebase')) {
            return 'vendor-firebase';
          }
          // Recharts (gráficos) em chunk separado
          if (id.includes('recharts')) {
            return 'vendor-charts';
          }
          // Lucide icons em chunk separado
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // XLSX em chunk separado (é grande ~400KB)
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
          // Outros node_modules
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
          // Context e hooks em chunk separado (evita conflito de nome "index")
          if (id.includes('/src/context/') || id.includes('/src/hooks/')) {
            return 'app-context';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // força regeneração de hashes em cada build
        hashCharacters: 'base36',
      },
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    cssCodeSplit: true,
  },
  
  server: { port: 5173 },
  preview: { port: 4173 },
})
