import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.js', 'tests/**/*.test.jsx'],
    setupFiles: ['./tests/setup.js'],
    // Os testes de integração compartilham um único banco PostgreSQL e
    // limpam as tabelas entre casos: rodar arquivos em paralelo faria um
    // arquivo apagar as linhas de outro.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
