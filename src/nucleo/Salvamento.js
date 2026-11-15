// =============================================================================
//  SALVAMENTO
//  Estilo Souls: não existe salvar manualmente. O jogo grava sozinho a cada
//  coisa que acontece (descansar, recolher, abrir, usar um item, derrotar).
//  Por enquanto guarda o progresso no próprio navegador (localStorage).
//  NO FUTURO (Supabase): crie outra classe com os mesmos dois métodos
//  (carregar e salvar) que fale com o Supabase, e troque em Jogo.js. O resto
//  do jogo não precisa mudar.
// =============================================================================
import { armaDisponivel, totalFrascos, totalMunicao } from './Inventario.js';
import { CHAVE_PORTAO, GUARDIAO_DERROTADO, ID_EVENTO, PORTAO_SUL_ABERTO, VERSAO_PROGRESSAO, eraExterior } from './Progressao.js';

const CHAVE = 'pugna-progresso-v1';

export const SELOS_DO_VEU = Object.freeze(['ossario', 'relicario']);

export function normalizarProgresso(dados) {
  const descanso = typeof dados?.descanso === 'string' ? dados.descanso : null;
  const eventos = Array.isArray(dados?.eventos)
    ? [...new Set(dados.eventos.filter((id) => typeof id === 'string' && ID_EVENTO.test(id)))]
    : [];
  const obtidos = Array.isArray(dados?.selos) ? dados.selos : [];
  const selos = SELOS_DO_VEU.filter((id) => obtidos.includes(id) || eventos.includes(`catedral:selo-${id}`));
  const guardiaoDerrotado = selos.length === SELOS_DO_VEU.length &&
    (dados?.guardiaoDerrotado === true || eventos.includes(GUARDIAO_DERROTADO));
  // Mantém o formato do Véu legível também pela versão publicada anteriormente.
  const eventosDaCatedral = selos.map((id) => `catedral:selo-${id}`);
  if (guardiaoDerrotado) eventosDaCatedral.push(GUARDIAO_DERROTADO);
  if (dados?.versaoProgressao !== VERSAO_PROGRESSAO && (guardiaoDerrotado || eraExterior(dados,descanso))) {
    if (!eventos.includes(CHAVE_PORTAO)) eventos.push(CHAVE_PORTAO);
    if (!eventos.includes(PORTAO_SUL_ABERTO)) eventos.push(PORTAO_SUL_ABERTO);
  }
  const limite = (n,a,b) => Math.max(a,Math.min(b,n));
  const queda = dados?.quedaGuardiao;
  const posicaoValida = Number.isFinite(queda?.x) && Number.isFinite(queda?.z);
  return {
    versaoProgressao: VERSAO_PROGRESSAO,
    descanso,
    selos,
    guardiaoDerrotado,
    arma: armaDisponivel(dados?.arma,eventos) ? dados.arma : 'espada',
    municaoUsada: Number.isInteger(dados?.municaoUsada) ? limite(dados.municaoUsada,0,totalMunicao(eventos)) : 0,
    quedaGuardiao: guardiaoDerrotado && posicaoValida ? { x:limite(queda.x,-9.5,9.5), z:limite(queda.z,-55,-39) } : null,
    frascosUsados: Number.isInteger(dados?.frascosUsados)
      ? Math.max(0, Math.min(totalFrascos(eventos), dados.frascosUsados))
      : 0,
    eventos: [...eventos.filter((id) => !id.startsWith('catedral:selo-') && id !== GUARDIAO_DERROTADO), ...eventosDaCatedral],
  };
}

export class SalvamentoLocal {
  /** Devolve o progresso salvo, ou um progresso novo. */
  async carregar() {
    try {
      const dados = JSON.parse(localStorage.getItem(CHAVE));
      const progresso = normalizarProgresso(dados);
      if (dados && dados.versaoProgressao !== VERSAO_PROGRESSAO) await this.salvar(progresso);
      return progresso;
    }
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
