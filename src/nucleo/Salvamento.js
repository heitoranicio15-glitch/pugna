// =============================================================================
//  SALVAMENTO
//  Estilo Souls: não existe salvar manualmente. O jogo grava sozinho a cada
//  coisa que acontece (descansar, recolher, abrir, usar um item, derrotar).
//  Por enquanto guarda o progresso no próprio navegador (localStorage).
//  NO FUTURO (Supabase): crie outra classe com os mesmos dois métodos
//  (carregar e salvar) que fale com o Supabase, e troque em Jogo.js. O resto
//  do jogo não precisa mudar.
// =============================================================================
import { totalFrascos, totalOssos } from './Inventario.js';

const CHAVE = 'pugna-progresso-v1';

export const SELOS_DO_VEU = Object.freeze(['ossario', 'relicario']);

export function normalizarProgresso(dados) {
  const descanso = typeof dados?.descanso === 'string' ? dados.descanso : null;
  const eventos = Array.isArray(dados?.eventos)
    ? [...new Set(dados.eventos.filter((id) => typeof id === 'string' && /^[a-z0-9-]+:[a-z0-9-]+$/.test(id)))]
    : [];
  const obtidos = Array.isArray(dados?.selos) ? dados.selos : [];
  const selos = SELOS_DO_VEU.filter((id) => obtidos.includes(id) || eventos.includes(`catedral:selo-${id}`));
  const guardiaoDerrotado = selos.length === SELOS_DO_VEU.length &&
    (dados?.guardiaoDerrotado === true || eventos.includes('catedral:guardiao-derrotado'));
  // Mantém o formato do Véu legível também pela versão publicada anteriormente.
  const eventosDaCatedral = selos.map((id) => `catedral:selo-${id}`);
  if (guardiaoDerrotado) eventosDaCatedral.push('catedral:guardiao-derrotado');
  return {
    descanso,
    selos,
    guardiaoDerrotado,
    frascosUsados: Number.isInteger(dados?.frascosUsados)
      ? Math.max(0, Math.min(totalFrascos(eventos), dados.frascosUsados))
      : 0,
    // Saves anteriores ao Osso de Retorno não têm este campo: começam do zero.
    ossosUsados: Number.isInteger(dados?.ossosUsados)
      ? Math.max(0, Math.min(totalOssos(eventos), dados.ossosUsados))
      : 0,
    eventos: [...eventos.filter((id) => !id.startsWith('catedral:selo-') && id !== 'catedral:guardiao-derrotado'), ...eventosDaCatedral],
  };
}

export class SalvamentoLocal {
  /** Devolve o progresso salvo, ou um progresso novo. */
  async carregar() {
    try { return normalizarProgresso(JSON.parse(localStorage.getItem(CHAVE))); }
    catch { return normalizarProgresso(null); }
  }

  async salvar(dados) {
    try { localStorage.setItem(CHAVE, JSON.stringify(normalizarProgresso(dados))); }
    catch { /* navegador sem armazenamento: segue sem salvar */ }
  }

  apagar() {
    try { localStorage.removeItem(CHAVE); return true; }
    catch { return false; }
  }
}
