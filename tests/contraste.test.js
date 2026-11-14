import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';

// Contraste de luminância (fórmula WCAG): (L1 + 0,05) / (L2 + 0,05), de 1 a 21.
const canal = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export function luminancia(hex) {
  return 0.2126 * canal((hex >> 16) & 255) + 0.7152 * canal((hex >> 8) & 255) + 0.0722 * canal(hex & 255);
}
export function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const MINIMO = 3;
const ataques = CONFIG.combate.ataquesInimigos;
// Cores que acendem na arma e nos olhos durante o aviso. O golpe alto não tem cor de aviso:
// os olhos ficam na cor normal (paleta.magia); entra na tabela para conferir mesmo assim.
const AVISOS = {
  'alto (olho)': CONFIG.paleta.magia,
  pesado: ataques.pesado.aviso,
  rasteira: ataques.rasteira.aviso,
  inaparável: CONFIG.combate.avisosInimigos.inaparavel,
};

// Fundos de cada área: névoa, fundo e as cores do céu (os exteriores têm céu).
function fundos(area) {
  const f = { nevoa: area.nevoa.cor, fundo: area.fundo };
  for (const [nome, cor] of Object.entries(area.paletaDoCeu ?? {})) if (nome !== 'nuvem') f[`céu ${nome}`] = cor;
  return f;
}

test('os 5 cenários existem e os avisos de golpe são cores distintas', () => {
  for (const id of ['vilarejo', 'catedral', 'estrada', 'taverna', 'floresta']) assert.ok(CONFIG.areas[id].nevoa && CONFIG.areas[id].fundo, id);
  assert.equal(new Set([ataques.pesado.aviso, ataques.rasteira.aviso, CONFIG.combate.avisosInimigos.inaparavel]).size, 3);
});

test('todo aviso de golpe tem contraste de pelo menos 3:1 contra névoa, fundo e céu de cada área', () => {
  const linhas = [];
  let menor = { razao: Infinity };
  for (const [id, area] of Object.entries(CONFIG.areas)) {
    for (const [fundo, corFundo] of Object.entries(fundos(area))) {
      for (const [aviso, cor] of Object.entries(AVISOS)) {
        const razao = contraste(cor, corFundo);
        linhas.push(`${id} / ${fundo} / ${aviso}: ${razao.toFixed(1)}:1`);
        if (razao < menor.razao) menor = { razao, id, fundo, aviso };
        assert.ok(razao >= MINIMO, `${id}: aviso ${aviso} contra ${fundo} dá só ${razao.toFixed(2)}:1`);
      }
    }
  }
  assert.ok(linhas.length >= 5 * 2 * 4);
  console.log(`menor contraste: ${menor.razao.toFixed(2)}:1 (${menor.id}, ${menor.aviso} contra ${menor.fundo})`);
});

test('a conferência de contraste acerta em casos conhecidos', () => {
  assert.ok(Math.abs(contraste(0xffffff, 0x000000) - 21) < 1e-9);
  assert.equal(contraste(0x777777, 0x777777), 1);
  assert.ok(contraste(0x000000, 0xffffff) === contraste(0xffffff, 0x000000));
});
