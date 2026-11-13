// =============================================================================
//  SALVAMENTO
//  Por enquanto guarda o progresso no próprio navegador (localStorage).
//  NO FUTURO (Supabase): crie outra classe com os mesmos dois métodos
//  (carregar e salvar) que fale com o Supabase, e troque em Jogo.js. O resto
//  do jogo não precisa mudar.
// =============================================================================
const CHAVE = 'pugna-progresso-v1';

export const SELOS_DO_VEU = Object.freeze(['ossario', 'relicario']);

function normalizar(dados) {
  const descanso = typeof dados?.descanso === 'string' ? dados.descanso : null;
  const obtidos = Array.isArray(dados?.selos) ? dados.selos : [];
  const selos = SELOS_DO_VEU.filter((id) => obtidos.includes(id));
  return {
    descanso,
    selos,
    guardiaoDerrotado: selos.length === SELOS_DO_VEU.length && dados?.guardiaoDerrotado === true,
  };
}

export class SalvamentoLocal {
  /** Devolve o progresso salvo, ou um progresso novo. */
  async carregar() {
    try { return normalizar(JSON.parse(localStorage.getItem(CHAVE))); }
    catch { return normalizar(null); }
  }

  async salvar(dados) {
    try { localStorage.setItem(CHAVE, JSON.stringify(normalizar(dados))); }
    catch { /* navegador sem armazenamento: segue sem salvar */ }
  }
}
