// Script para checklist de deploy automatizado
/* eslint-env node */
const fs = require('fs');
const path = require('path');

const checklist = [
  {
    label: 'Build sem warnings',
    check: () => true // Adapte para checar logs do build
  },
  {
    label: 'Chunks < 500KB cada',
    check: () => {
      const distPath = path.join(__dirname, '../dist/assets/js');
      if (!fs.existsSync(distPath)) return false;
      const files = fs.readdirSync(distPath);
      return files.every(f => fs.statSync(path.join(distPath, f)).size < 500 * 1024);
    }
  },
  {
    label: 'Console.logs removidos',
    check: () => {
      const srcPath = path.join(__dirname, '../src');
      let found = false;
      function scan(dir) {
        fs.readdirSync(dir).forEach(file => {
          const full = path.join(dir, file);
          if (fs.statSync(full).isDirectory()) scan(full);
          else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(full, 'utf8');
            if (/console\.log/.test(content)) found = true;
          }
        });
      }
      scan(srcPath);
      return !found;
    }
  },
  {
    label: 'Source maps desabilitados',
    check: () => {
      const viteConfig = fs.readFileSync(path.join(__dirname, '../vite.config.js'), 'utf8');
      return !/sourcemap:\s*true/.test(viteConfig);
    }
  }
];

console.log('Checklist de Deploy:');
checklist.forEach(item => {
  const ok = item.check();
  console.log(`${ok ? '✅' : '❌'} ${item.label}`);
});
