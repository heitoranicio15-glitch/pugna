import { defineConfig } from 'vite';

// Configuração do Vite (o programa que serve o jogo durante o desenvolvimento).
export default defineConfig({
  server: { port: 5173, open: false },
  build: { target: 'es2020' },
});
