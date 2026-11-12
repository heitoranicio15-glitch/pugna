import { defineConfig } from 'vite';

// Configuração do Vite (o programa que serve o jogo durante o desenvolvimento).
export default defineConfig({
  // './' faz o jogo funcionar em qualquer endereço, inclusive no GitHub Pages
  // (que publica em https://usuario.github.io/nome-do-repositorio/).
  base: './',
  server: { port: 5173, open: false },
  build: { target: 'es2020' },
});
