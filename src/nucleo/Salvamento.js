// =============================================================================
//  SALVAMENTO
//  Por enquanto guarda o progresso no próprio navegador (localStorage).
//  NO FUTURO (Supabase): crie outra classe com os mesmos dois métodos
//  (carregar e salvar) que fale com o Supabase, e troque em Jogo.js. O resto
//  do jogo não precisa mudar.
// =============================================================================
const CHAVE = 'pugna-progresso-v1';

export class SalvamentoLocal {
  /** Devolve o progresso salvo, ou um progresso novo. */
  async carregar() {
    try { return { descanso: null, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; }
    catch { return { descanso: null }; }
  }

  /** dados: objeto simples, ex.: { descanso: 'portao-sul' } */
  async salvar(dados) {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch { /* navegador sem armazenamento: segue sem salvar */ }
  }
}
