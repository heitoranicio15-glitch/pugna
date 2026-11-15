export const CHAVE_PORTAO = 'catedral:chave-do-portao';
export const PORTAO_SUL_ABERTO = 'vilarejo:portao-sul-aberto';
export const GUARDIAO_DERROTADO = 'catedral:guardiao-derrotado';
export const CHAVE_MATEIRO = 'floresta:chave-do-mateiro';
export const RELIQUIA = 'catedral:reliquia-do-veu';
export const VERSAO_PROGRESSAO = 2;
export const ID_EVENTO = /^[a-z0-9-]+:[a-z0-9-]+$/;

const EXTERIORES = new Set(['estrada','taverna','floresta']);
export function eraExterior(dados,descanso) {
  return EXTERIORES.has(dados?.area) || EXTERIORES.has(dados?.areaId) ||
    descanso === 'taverna-da-estrada' || /^floresta-/.test(descanso ?? '');
}

export function avisoPortal(portal,eventos,x=portal.x) {
  if (!portal.requer || eventos.includes(portal.requer)) return null;
  return x > portal.x ? portal.textoTrancadoAlternativo ?? portal.textoTrancado : portal.textoTrancado;
}

/** Explora o grafo incluindo eventos que podem ser obtidos dentro das áreas
 * descobertas (e deixa de fora objetos que só estão lá como aviso). */
export function areasAlcancaveis(porId,inicial) {
  const areas=new Set([inicial]), eventos=new Set();
  let mudou;
  do {
    mudou=false;
    const obter=id => { if(id && !eventos.has(id)) { eventos.add(id); mudou=true; } };
    for (const id of areas) {
      const a=porId.get(id);
      for (const i of a.inimigos) obter(i.eventoDeDerrota);
      for (const o of a.objetos) {
        if (o.acao==='informar' || (o.depois && !eventos.has(o.depois)) || (o.chave && !eventos.has(o.chave))) continue;
        obter(o.evento);
      }
      for (const p of a.portais) {
        if (p.requer && !eventos.has(p.requer)) continue;
        obter(p.eventoAoAbrir);
        if (!areas.has(p.destino)) { areas.add(p.destino); mudou=true; }
      }
    }
  } while(mudou);
  return {areas,eventos};
}
