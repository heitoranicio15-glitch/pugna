import { CONFIG } from '../config.js';

const CHAVE = 'pugna-preferencias-v1';
const PADRAO = {
  musica: 55, efeitos: 80, sensibilidade: 100, brilho: 100,
  resolucao: CONFIG.render.alturaInterna, tremor: true,
};

function faixa(valor, minimo, maximo, padrao) {
  return Number.isFinite(valor) ? Math.max(minimo, Math.min(maximo, Math.round(valor))) : padrao;
}

export function carregarPreferencias() {
  let salvo;
  try { salvo = JSON.parse(localStorage.getItem(CHAVE)); } catch { /* armazenamento indisponível */ }
  return {
    musica: faixa(salvo?.musica, 0, 100, PADRAO.musica),
    efeitos: faixa(salvo?.efeitos, 0, 100, PADRAO.efeitos),
    sensibilidade: faixa(salvo?.sensibilidade, 40, 200, PADRAO.sensibilidade),
    brilho: faixa(salvo?.brilho, 70, 160, PADRAO.brilho),
    resolucao: [180, 270, 360].includes(salvo?.resolucao) ? salvo.resolucao : PADRAO.resolucao,
    tremor: typeof salvo?.tremor === 'boolean' ? salvo.tremor : PADRAO.tremor,
  };
}

export function salvarPreferencias(preferencias) {
  try { localStorage.setItem(CHAVE, JSON.stringify(preferencias)); } catch { /* usa a preferência nesta sessão */ }
}
