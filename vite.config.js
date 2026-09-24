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
          // React e React-DOM em chunk separado.
          // prop-types e hoist-non-react-statics também entram aqui: são
          // dependências de tempo de inicialização de libs React (ex:
          // react-google-recaptcha -> react-async-script -> prop-types),
          // e deixá-las no chunk genérico "vendor-other" cria uma dependência
          // circular entre vendor-react e vendor-other que quebra a ordem de
          // carregamento em produção ("Cannot set properties of undefined").
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/prop-types') ||
            id.includes('node_modules/hoist-non-react-statics')
          ) {
            return 'vendor-react';
          }
          // Firebase em chunk separado
          if (id.includes('firebase')) {
            return 'vendor-firebase';
          }
          // Lucide icons em chunk separado
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // XLSX em chunk separado (é grande ~400KB)
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
          // jsPDF em chunk separado (usado só na geração de recibos).
          // canvg/dompurify/html2canvas (+ transitivas) são dependências do
          // plugin doc.html() do jsPDF, que este app nunca chama — mas se
          // caírem no catch-all "vendor-other" elas grudam nele (mesmo bug
          // do chart.js, ver comentário abaixo) e viram ~130KB de carga
          // inicial morta. Juntando no chunk do jsPDF, ficam presas ali:
          // carregadas só sob demanda ao gerar PDF (e nem isso, na prática,
          // já que .html() não é usado).
          if (
            id.includes('node_modules/jspdf') ||
            id.includes('node_modules/canvg') ||
            id.includes('node_modules/dompurify') ||
            id.includes('node_modules/html2canvas') ||
            id.includes('node_modules/raf') ||
            id.includes('node_modules/rgbcolor') ||
            id.includes('node_modules/stackblur-canvas') ||
            id.includes('node_modules/svg-pathdata') ||
            id.includes('node_modules/css-line-break') ||
            id.includes('node_modules/text-segmentation')
          ) {
            return 'vendor-pdf';
          }
          // Chart.js em chunk separado — senão cai no "vendor-other" e vira
          // carga inicial de toda página (~200KB) mesmo só sendo usado ao
          // gerar o relatório em PDF (import dinâmico em graficosCanvas.js).
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/@kurkle')) {
            return 'vendor-chartjs';
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
