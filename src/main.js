// Ponto de entrada: cria o jogo e liga o "relógio".
import { Jogo } from './nucleo/Jogo.js';

const jogo = new Jogo(document.getElementById('jogo'));
jogo.iniciar();

// Facilita depurar pelo console do navegador (F12): digite "jogo".
window.jogo = jogo;
