import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { REGISTRO } from '../src/mundo/areas.js';
import {
  FAIXAS, FAIXAS_DE_AREA, TAXAS, TIPOS_DE_SOM, criarPlanejador, ganhosCrossfade, nivelDoFade,
  rampaCrossfade, taxasDoSom, validarSom,
} from '../src/audio/regras.js';
import { Ambiente } from '../src/audio/Ambiente.js';
import { Trilha } from '../src/audio/Trilha.js';

// Sorteio repetível (LCG), para os testes não dependerem da sorte.
function sorteio(semente = 12345) {
  let s = semente;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

// ---------------------------------------------------------------------------
test('toda área do registro tem som.tipo conhecido e trilha conhecida', () => {
  assert.ok(REGISTRO.length >= 4);
  for (const { id } of REGISTRO) {
    const c = CONFIG.areas[id];
    assert.ok(c, `${id}: falta bloco em CONFIG.areas`);
    assert.ok(TIPOS_DE_SOM[c.som?.tipo], `${id}: som.tipo desconhecido (${c.som?.tipo})`);
    assert.deepEqual(validarSom(c.som), [], `${id}: som inválido`);
    assert.ok(FAIXAS_DE_AREA.includes(c.trilha), `${id}: trilha desconhecida (${c.trilha})`);
    assert.ok(FAIXAS[c.trilha]);
  }
});

test('cada tipo de som é usado por alguma área e cada área soa diferente', () => {
  const tipos = REGISTRO.map(({ id }) => CONFIG.areas[id].som.tipo);
  assert.equal(new Set(tipos).size, tipos.length, 'duas áreas com o mesmo tipo de som');
  assert.deepEqual([...tipos].sort(), Object.keys(TIPOS_DE_SOM).sort());
});

test('validarSom recusa tipo desconhecido, chave de outro tipo e número fora de 0..1', () => {
  assert.ok(validarSom(null).length);
  assert.ok(validarSom({ tipo: 'deserto' })[0].includes('desconhecido'));
  assert.deepEqual(validarSom({ tipo: 'floresta', vento: 0.5, coruja: 0.3, galhos: 1, base: 1 }), []);
  assert.ok(validarSom({ tipo: 'floresta', agua: 0.5 }).length, 'agua é da estrada');
  assert.ok(validarSom({ tipo: 'vila', gotas: 0.5 }).length);
  assert.ok(validarSom({ tipo: 'vila', vento: 1.5 }).length);
  assert.deepEqual(validarSom({ tipo: 'vila', vento: 0.5, grilo: 1, base: 0.3 }), []);
});

test('os arquivos das faixas existem na pasta da trilha', async () => {
  const { existsSync } = await import('node:fs');
  for (const arquivo of Object.values(FAIXAS)) assert.ok(existsSync(new URL(`../public/assets/trilha/${arquivo}`, import.meta.url)), arquivo);
});

// ---------------------------------------------------------------------------
test('taxasDoSom: intensidade 0 não gera evento; 1 dá a taxa máxima', () => {
  assert.deepEqual(taxasDoSom({ tipo: 'vila', vento: 1, grilo: 0, sino: 0 }), {});
  const t = taxasDoSom({ tipo: 'taverna', fogo: 0.5, murmurio: 1 });
  assert.equal(t.estalo.porMinuto, TAXAS.estalo.porMinuto * 0.5);
  assert.equal(taxasDoSom({ tipo: 'pedra', gotas: 1 }).gotas.porMinuto, TAXAS.gotas.porMinuto);
  assert.deepEqual(taxasDoSom({ tipo: 'nenhum' }), {});
});

test('o planejador respeita a taxa média de cada evento', () => {
  const taxas = { grilo: { porMinuto: 6, minimo: 3 }, sino: { porMinuto: 1, minimo: 20 } };
  const p = criarPlanejador(taxas, sorteio(), 0);
  const minutos = 600;
  const eventos = p.ate(minutos * 60);
  for (const nome of Object.keys(taxas)) {
    const n = eventos.filter((e) => e.nome === nome).length;
    const esperado = taxas[nome].porMinuto * minutos;
    assert.ok(Math.abs(n - esperado) / esperado < 0.08, `${nome}: ${n} eventos, esperado ~${esperado}`);
  }
});

test('o planejador respeita o intervalo mínimo e a ordem no tempo', () => {
  const taxas = { gotas: { porMinuto: 18, minimo: 0.8 }, estalo: { porMinuto: 100, minimo: 0.05 } };
  const eventos = criarPlanejador(taxas, sorteio(7), 0).ate(3600);
  for (let i = 1; i < eventos.length; i++) assert.ok(eventos[i].t >= eventos[i - 1].t);
  for (const nome of Object.keys(taxas)) {
    const ts = eventos.filter((e) => e.nome === nome).map((e) => e.t);
    for (let i = 1; i < ts.length; i++) assert.ok(ts[i] - ts[i - 1] >= taxas[nome].minimo - 1e-9, `${nome} abaixo do mínimo`);
  }
});

test('pedir os eventos aos pedaços mantém a taxa e nunca repete nem volta no tempo', () => {
  const taxas = { gotas: { porMinuto: 18, minimo: 0.8 }, grilo: { porMinuto: 8, minimo: 3 } };
  const p = criarPlanejador(taxas, sorteio(3), 0);
  const aos = [];
  let anterior = 0;
  for (let limite = 1.2; limite <= 1800; limite += 0.5) {
    const lote = p.ate(limite);
    for (const e of lote) assert.ok(e.t >= anterior && e.t < limite, 'evento fora da janela pedida');
    aos.push(...lote);
    anterior = limite;
  }
  const esperado = (18 + 8) * 30;
  assert.ok(Math.abs(aos.length - esperado) / esperado < 0.08, `${aos.length} eventos, esperado ~${esperado}`);
  assert.equal(new Set(aos.map((e) => `${e.nome}@${e.t}`)).size, aos.length);
});

test('sem taxa não há evento, e saltarPara descarta o atraso sem despejar tudo de uma vez', () => {
  assert.deepEqual(criarPlanejador({}, sorteio(), 0).ate(1000), []);
  const p = criarPlanejador({ estalo: { porMinuto: 100, minimo: 0.05 } }, sorteio(), 0);
  p.saltarPara(5000);
  const prox = p.ate(5005);
  assert.ok(prox.length < 20, `esperava poucos eventos, vieram ${prox.length}`);
  assert.ok(prox.every((e) => e.t >= 5000));
});

// ---------------------------------------------------------------------------
test('o crossfade vai de 0 a 1 em potência igual, sem salto', () => {
  assert.deepEqual(ganhosCrossfade(0), { saida: 1, entra: 0 });
  const fim = ganhosCrossfade(1);
  assert.ok(Math.abs(fim.saida) < 1e-12 && fim.entra === 1);
  assert.deepEqual(ganhosCrossfade(-3), ganhosCrossfade(0));
  assert.deepEqual(ganhosCrossfade(9), ganhosCrossfade(1));
  let antes = ganhosCrossfade(0);
  for (let p = 0.01; p <= 1.0001; p += 0.01) {
    const g = ganhosCrossfade(p);
    assert.ok(g.entra >= antes.entra && g.saida <= antes.saida, 'ganhos precisam ser monótonos');
    assert.ok(Math.abs(g.entra - antes.entra) < 0.02 && Math.abs(g.saida - antes.saida) < 0.02, 'sem salto entre passos');
    assert.ok(Math.abs(g.entra ** 2 + g.saida ** 2 - 1) < 1e-9, 'potência constante');
    assert.ok(g.entra >= 0 && g.entra <= 1 && g.saida >= 0 && g.saida <= 1);
    antes = g;
  }
});

test('rampaCrossfade: parte do nível dado e termina em 0 (saindo) ou no nível (entrando)', () => {
  const sai = rampaCrossfade(false, 0.8), entra = rampaCrossfade(true, 0.8);
  assert.equal(sai[0], 0.8); assert.ok(Math.abs(sai.at(-1)) < 1e-12);
  assert.equal(entra[0], 0); assert.equal(entra.at(-1), 0.8);
  for (let i = 1; i < sai.length; i++) { assert.ok(sai[i] <= sai[i - 1]); assert.ok(entra[i] >= entra[i - 1]); }
  assert.equal(nivelDoFade(null, 5), 1);
  assert.equal(nivelDoFade({ t0: 1, duracao: 0.6, entrando: true, nivel: 0.8 }, 0), 0);
  assert.equal(nivelDoFade({ t0: 1, duracao: 0.6, entrando: false, nivel: 0.8 }, 9) < 1e-9, true);
});

// ---------------------------------------------------------------------------
// AudioContext de mentira: só guarda o que foi pedido.
function criarCtxFalso() {
  const ctx = { currentTime: 0, sampleRate: 8000, nos: [] };
  const param = () => ({
    value: 0, chamadas: [],
    setValueAtTime(v, t) { this.chamadas.push(['set', v, t]); },
    linearRampToValueAtTime(v, t) { this.chamadas.push(['rampa', v, t]); },
    exponentialRampToValueAtTime(v, t) { this.chamadas.push(['exp', v, t]); },
    cancelScheduledValues() { this.chamadas.length = 0; },
  });
  const no = (tipo) => {
    const n = {
      tipo, desligado: false, iniciado: false, parado: null,
      connect(destino) { return destino; }, disconnect() { n.desligado = true; },
      start() { n.iniciado = true; }, stop(t) { n.parado = t; },
      frequency: param(), gain: param(), Q: param(), delayTime: param(), type: '',
    };
    ctx.nos.push(n);
    return n;
  };
  ctx.createGain = () => no('gain');
  ctx.createBufferSource = () => no('fonte');
  ctx.createBiquadFilter = () => no('filtro');
  ctx.createOscillator = () => no('osc');
  ctx.createDelay = () => no('atraso');
  return ctx;
}
function criarRelogioFalso() {
  const r = { intervalos: new Map(), esperas: [], proximo: 1 };
  r.setInterval = (f) => { const id = r.proximo++; r.intervalos.set(id, f); return id; };
  r.clearInterval = (id) => { r.intervalos.delete(id); };
  r.setTimeout = (f) => { r.esperas.push(f); return r.esperas.length; };
  return r;
}

test('Ambiente: o ambiente antigo some, o novo entra e o antigo é desligado e solto', () => {
  const ctx = criarCtxFalso(), relogio = criarRelogioFalso();
  const destino = { tipo: 'destino' };
  const amb = new Ambiente(ctx, {}, destino, { relogio });
  amb.entrar(CONFIG.areas.vilarejo.som);
  const vila = amb.atual;
  assert.equal(relogio.intervalos.size, 1);
  const subida = vila.bus.gain.chamadas.map((c) => c[1]);
  assert.equal(subida[0], 0);
  assert.ok(subida.every((v, i) => i === 0 || v >= subida[i - 1]), 'a entrada só sobe');
  assert.ok(Math.abs(vila.bus.gain.chamadas.at(-1)[2] - 0.6) < 1e-9, 'entra em 0,6 s');

  amb.entrar(CONFIG.areas.vilarejo.som);          // mesmo ambiente: nada reinicia
  assert.equal(amb.atual, vila);
  assert.equal(relogio.intervalos.size, 1);

  ctx.currentTime = 2;
  amb.entrar(CONFIG.areas.catedral.som, 0.6);
  assert.notEqual(amb.atual, vila);
  assert.equal(relogio.intervalos.size, 1, 'o sorteio do antigo parou; só o novo roda');
  const descida = vila.bus.gain.chamadas.map((c) => c[1]);
  assert.ok(descida.every((v, i) => i === 0 || v <= descida[i - 1]), 'a saída só desce');
  assert.ok(Math.abs(descida.at(-1)) < 1e-12, 'termina em silêncio');
  assert.ok(vila.fontes.length > 0 && vila.fontes.every((f) => f.parado >= 2.6), 'todas as fontes antigas têm parada marcada');
  assert.equal(vila.bus.desligado, false);
  relogio.esperas.forEach((f) => f());
  assert.equal(vila.bus.desligado, true);

  amb.entrar(null);                               // sem som: o último some também
  assert.equal(amb.atual, null);
  assert.equal(relogio.intervalos.size, 0);
});

test('Ambiente: eventos esparsos só criam nós com o som ativo, e o número de nós é limitado', () => {
  const ctx = criarCtxFalso(), relogio = criarRelogioFalso();
  let ativo = false;
  const amb = new Ambiente(ctx, {}, {}, { relogio, ativo: () => ativo });
  amb.entrar({ tipo: 'taverna', fogo: 1, murmurio: 0.5 });
  const [agendar] = relogio.intervalos.values();
  const fixos = ctx.nos.length;
  for (let t = 0; t < 30; t += 0.5) { ctx.currentTime = t; agendar(); }
  assert.equal(ctx.nos.length, fixos, 'mudo (pausa): nenhum nó novo');
  ativo = true;
  for (let t = 30; t < 60; t += 0.5) { ctx.currentTime = t; agendar(); }
  const novos = ctx.nos.length - fixos;
  assert.ok(novos > 0, 'com som ativo, aparecem estalos');
  assert.ok(novos < 30 * 3 * 4, `nós demais para 30 s: ${novos}`);   // 100/min x 30 s, uns 3 nós por estalo
});

test('Ambiente: um tipo sem eventos esparsos e um aviso do relógio atrasado não despejam eventos', () => {
  const ctx = criarCtxFalso(), relogio = criarRelogioFalso();
  const amb = new Ambiente(ctx, {}, {}, { relogio });
  amb.entrar({ tipo: 'estrada', vento: 0.7, madeira: 1, agua: 0.5 });
  const [agendar] = relogio.intervalos.values();
  const antes = ctx.nos.length;
  ctx.currentTime = 3600; agendar();   // aba parada por uma hora
  assert.ok(ctx.nos.length - antes < 40);
});

// ---------------------------------------------------------------------------
function criarTrilhaFalsa() {
  const audios = [];
  const relogio = criarRelogioFalso();
  let agora = 0;
  const trilha = new Trilha({
    base: '/pugna/', duracao: 1.5, relogio, agora: () => agora,
    criarAudio: () => {
      const a = { src: '', volume: 0, paused: true, plays: 0, pauses: 0,
        play() { a.paused = false; a.plays++; return Promise.resolve(); },
        pause() { a.paused = true; a.pauses++; } };
      audios.push(a);
      return a;
    },
  });
  return { trilha, audios, relogio, passar: (ms) => { agora += ms; trilha.avancar(agora); } };
}

test('Trilha: a mesma faixa continua sem reiniciar', () => {
  const { trilha, audios } = criarTrilhaFalsa();
  trilha.atualizar('vilarejo', true, 55);
  trilha.atualizar('vilarejo', true, 80);   // só o volume mudou
  assert.equal(audios.length, 1);
  assert.equal(audios[0].plays, 2);
  assert.equal(audios[0].src, '/pugna/assets/trilha/vilarejo.mp3');
  assert.ok(Math.abs(audios[0].volume - 0.8 * 0.7) < 1e-9);
});

test('Trilha: troca de faixa faz crossfade de 1,5 s em potência igual e solta a antiga', () => {
  const { trilha, audios, passar, relogio } = criarTrilhaFalsa();
  trilha.atualizar('vilarejo', true, 100);
  trilha.atualizar('catedral', true, 100);
  assert.equal(audios.length, 2);
  const [velha, nova] = audios;
  assert.equal(nova.src, '/pugna/assets/trilha/catedral.mp3');
  assert.equal(relogio.intervalos.size, 1);
  let antes = { v: 0.7, n: 0 };
  assert.ok(Math.abs(velha.volume - 0.7) < 1e-9 && nova.volume === 0, 'começa sem salto');
  for (let i = 0; i < 37; i++) {
    passar(40);
    assert.ok(velha.volume <= antes.v + 1e-9 && nova.volume >= antes.n - 1e-9, 'sai e entra sem voltar');
    assert.ok(Math.abs((velha.volume / 0.7) ** 2 + (nova.volume / 0.7) ** 2 - 1) < 1e-6 || i >= 36, 'potência igual');
    assert.ok(Math.abs(velha.volume - antes.v) < 0.7 * 0.1 && Math.abs(nova.volume - antes.n) < 0.7 * 0.1, 'sem estalo');
    antes = { v: velha.volume, n: nova.volume };
  }
  passar(100);
  assert.equal(velha.paused, true);
  assert.ok(Math.abs(nova.volume - 0.7) < 1e-9);
  assert.equal(relogio.intervalos.size, 0, 'o temporizador do fade para no fim');
});

test('Trilha: pausar durante o fade encerra a faixa antiga; trocar sem tocar é direto', () => {
  const { trilha, audios, relogio } = criarTrilhaFalsa();
  trilha.atualizar('vilarejo', true, 100);
  trilha.atualizar('catedral', true, 100);
  trilha.atualizar('catedral', false, 100);   // Esc no meio do fade
  assert.equal(audios[0].paused, true);
  assert.equal(audios[1].paused, true);
  assert.equal(relogio.intervalos.size, 0);
  trilha.atualizar('vilarejo', false, 100);   // troca com o jogo pausado: sem fade
  assert.equal(relogio.intervalos.size, 0);
  assert.equal(audios.length, 3);
  trilha.atualizar('vilarejo', true, 100);
  assert.equal(audios[2].paused, false);
  assert.ok(Math.abs(audios[2].volume - 0.7) < 1e-9);
});

test('Trilha: uma segunda troca no meio do fade parte do volume em que estava', () => {
  const { trilha, audios, passar } = criarTrilhaFalsa();
  trilha.atualizar('vilarejo', true, 100);
  trilha.atualizar('catedral', true, 100);
  passar(600);
  const meio = audios[1].volume;
  trilha.atualizar('guardiao', true, 100);
  assert.equal(audios[0].paused, true, 'a primeira, já quase muda, é solta');
  assert.ok(Math.abs(audios[1].volume - meio) < 1e-9, 'sem salto no volume da que passa a sair');
  assert.equal(audios[2].volume, 0);
  passar(2000);
  assert.equal(audios[1].paused, true);
  assert.ok(Math.abs(audios[2].volume - 0.7) < 1e-9);
});
