// =============================================================================
//  REGRAS DO ÁUDIO (puras, sem WebAudio nem navegador: dá para testar no Node)
//  Aqui ficam os nomes conhecidos, os eventos esparsos e a curva do crossfade.
// =============================================================================

/** Faixas da trilha: nome usado no jogo -> arquivo em public/assets/trilha/. */
export const FAIXAS = {
  vilarejo: 'vilarejo.mp3',
  catedral: 'catedral.mp3',
  guardiao: 'guardiao.mp3',
  'guardiao-final': 'guardiao-fase-final.mp3',
};

/** Faixas que uma área pode escolher em `CONFIG.areas.<area>.trilha` (as do chefe são da luta). */
export const FAIXAS_DE_AREA = ['vilarejo', 'catedral'];

/**
 * Tipos de som ambiente e as chaves de `CONFIG.areas.<area>.som` que cada um lê.
 * Todo número vai de 0 (some) a 1 (máximo). Chave com `evento` sorteia ocorrências
 * no tempo: a taxa é `intensidade * TAXAS[evento].porMinuto`.
 */
export const TIPOS_DE_SOM = {
  vila: { vento: {}, grilo: { evento: 'grilo' }, sino: { evento: 'sino' } },
  pedra: { vento: {}, gotas: { evento: 'gotas' }, eco: {} },
  taverna: { fogo: { evento: 'estalo' }, murmurio: {} },
  estrada: { vento: {}, madeira: { evento: 'madeira' }, agua: {} },
  floresta: { vento: {}, coruja: { evento: 'coruja' }, galhos: { evento: 'galho' } },
};

/** Taxa máxima (eventos por minuto) e intervalo mínimo (s) entre dois eventos do mesmo tipo. */
export const TAXAS = {
  grilo: { porMinuto: 14, minimo: 3 },
  sino: { porMinuto: 2.5, minimo: 20 },
  gotas: { porMinuto: 18, minimo: 0.8 },
  estalo: { porMinuto: 100, minimo: 0.05 },
  madeira: { porMinuto: 5, minimo: 4 },
  coruja: { porMinuto: 3, minimo: 12 },
  galho: { porMinuto: 6, minimo: 4 },
};

const entre01 = (v) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

/** Confere um bloco `som` e devolve a lista de problemas (vazia = ok). */
export function validarSom(som) {
  if (!som || typeof som !== 'object') return ['falta o bloco `som`'];
  const tipo = TIPOS_DE_SOM[som.tipo];
  if (!tipo) return [`som.tipo desconhecido: ${som.tipo}`];
  const problemas = [];
  for (const [chave, valor] of Object.entries(som)) {
    if (chave === 'tipo') continue;
    if (chave !== 'base' && !(chave in tipo)) problemas.push(`som.${chave} não existe no tipo ${som.tipo}`);
    else if (typeof valor !== 'number' || valor < 0 || valor > 1) problemas.push(`som.${chave} precisa ficar entre 0 e 1`);
  }
  return problemas;
}

/** Taxas dos eventos esparsos de um bloco `som`: { nomeDoEvento: { porMinuto, minimo } }. */
export function taxasDoSom(som) {
  const tipo = TIPOS_DE_SOM[som?.tipo];
  const taxas = {};
  if (!tipo) return taxas;
  for (const [chave, { evento }] of Object.entries(tipo)) {
    if (!evento) continue;
    const porMinuto = TAXAS[evento].porMinuto * entre01(som[chave]);
    if (porMinuto > 0) taxas[evento] = { porMinuto, minimo: TAXAS[evento].minimo };
  }
  return taxas;
}

/**
 * Sorteia eventos esparsos no tempo. O intervalo é `minimo` mais uma espera
 * exponencial, de modo que a média continua sendo 60 / porMinuto.
 * `ate(limite)` devolve, em ordem, os eventos que caem antes do limite (em segundos);
 * pode ser chamado aos pedaços. `saltarPara(t)` descarta o que ficou para trás
 * (aba em segundo plano), sem recuperar o atraso de uma vez.
 */
export function criarPlanejador(taxas, sorteio = Math.random, inicio = 0) {
  const proximo = {};
  const intervalo = (nome) => {
    const media = 60 / taxas[nome].porMinuto;
    const minimo = Math.min(taxas[nome].minimo ?? 0, media * 0.8);
    return minimo + -Math.log(1 - sorteio()) * (media - minimo);
  };
  for (const nome of Object.keys(taxas)) proximo[nome] = inicio + intervalo(nome);
  return {
    ate(limite) {
      const saida = [];
      for (const nome of Object.keys(proximo)) {
        while (proximo[nome] < limite) {
          saida.push({ nome, t: proximo[nome] });
          proximo[nome] += intervalo(nome);
        }
      }
      return saida.sort((a, b) => a.t - b.t);
    },
    saltarPara(t) {
      for (const nome of Object.keys(proximo)) if (proximo[nome] < t) proximo[nome] = t + intervalo(nome);
    },
  };
}

/** Ganhos do crossfade em potência igual: p de 0 a 1 (fora disso, é cortado). */
export function ganhosCrossfade(p) {
  const x = Math.min(1, Math.max(0, p));
  return { saida: Math.cos(x * Math.PI / 2), entra: Math.sin(x * Math.PI / 2) };
}

/**
 * Valores para uma rampa em `passos` partes: de `de` até 0 (saindo) ou de 0 até `para` (entrando).
 * A primeira é o valor de partida e a última, o de chegada, sem salto no meio.
 */
export function rampaCrossfade(entrando, nivel, passos = 12) {
  return Array.from({ length: passos + 1 }, (_, k) => {
    const g = ganhosCrossfade(k / passos);
    return nivel * (entrando ? g.entra : g.saida);
  });
}

/** Nível de uma camada no instante `t`, dado o fade em andamento (ou nenhum). */
export function nivelDoFade(fade, t) {
  if (!fade) return 1;
  const g = ganhosCrossfade((t - fade.t0) / fade.duracao);
  return fade.nivel * (fade.entrando ? g.entra : g.saida);
}
