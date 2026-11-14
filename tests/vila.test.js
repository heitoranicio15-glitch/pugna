import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { criarAreas } from '../src/mundo/areas.js';
import { CONFIG } from '../src/config.js';
import { Navegacao } from '../src/mundo/Navegacao.js';
import { cruzam, distanciaRet } from '../src/mundo/QuadrasVilarejo.js';

// ---------------------------------------------------------------------------
//  O plano do vilarejo (docs/mapa.md) em regras que o computador confere:
//  casas só dos três tipos, ruas só das três larguras, nada de fresta entre
//  paredes e tudo o que importa alcançável a pé desde o Portão Sul.
// ---------------------------------------------------------------------------
function ligarDocumentoDeMentira() {
  const ctx = new Proxy(function () {}, {
    get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : ctx),
    apply: () => ctx,
    set: () => true,
  });
  globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
}

let vila;
function aVila() {
  if (!vila) {
    ligarDocumentoDeMentira();
    const { porId } = criarAreas(new THREE.Scene(), { direcaoLua: new THREE.Vector3(0.3, 0.5, -0.8).normalize() });
    vila = porId.get('vilarejo');
  }
  return vila;
}
const V = CONFIG.vila;

/**
 * Todos os pontos da grade (0,75 m) onde o caçador cabe e aos quais chega a pé desde o
 * Portão Sul. Busca completa, sem o limite de passos da Navegacao dos inimigos.
 */
let mapaAlcance;
function alcance(v) {
  if (mapaAlcance) return mapaAlcance;
  const nav = new Navegacao(v.colisores, v.limites);
  const PASSO = 0.75, raio = CONFIG.jogador.raio;
  const { minX, minZ, maxX, maxZ } = v.limites;
  const L = Math.floor((maxX - minX) / PASSO) + 1, P = Math.floor((maxZ - minZ) / PASSO) + 1;
  const livre = new Uint8Array(L * P);   // 0 = não visto, 1 = livre, 2 = ocupado
  const chegou = new Uint8Array(L * P);
  const ehLivre = (i, k) => {
    const id = k * L + i;
    if (!livre[id]) { const p = { x: minX + i * PASSO, z: minZ + k * PASSO }; livre[id] = nav.livre(p, p, raio) ? 1 : 2; }
    return livre[id] === 1;
  };
  const i0 = Math.round((v.nascimento.x - minX) / PASSO), k0 = Math.round((v.nascimento.z - minZ) / PASSO);
  const fila = [[i0, k0]];
  chegou[k0 * L + i0] = 1;
  while (fila.length) {
    const [i, k] = fila.pop();
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nk = k + dk;
      if (ni < 0 || nk < 0 || ni >= L || nk >= P || chegou[nk * L + ni] || !ehLivre(ni, nk)) continue;
      chegou[nk * L + ni] = 1;
      fila.push([ni, nk]);
    }
  }
  // Um ponto conta como alcançado se alguma célula a até `tolerancia` metros dele foi alcançada.
  mapaAlcance = (x, z, tolerancia = 0.75) => {
    const ci = Math.round((x - minX) / PASSO), ck = Math.round((z - minZ) / PASSO), n = Math.ceil(tolerancia / PASSO);
    for (let k = ck - n; k <= ck + n; k++) for (let i = ci - n; i <= ci + n; i++) {
      if (i >= 0 && k >= 0 && i < L && k < P && chegou[k * L + i]) return true;
    }
    return false;
  };
  return mapaAlcance;
}
const larguraFachada = ({ ret, frente }) => (frente === 'L' || frente === 'O' ? ret.maxZ - ret.minZ : ret.maxX - ret.minX);
const fundoDaCasa = ({ ret, frente }) => (frente === 'L' || frente === 'O' ? ret.maxX - ret.minX : ret.maxZ - ret.minZ);

test('a vila tem casas em fileira, todas de um dos três tipos e com a porta para a rua', () => {
  const { casas } = aVila();
  assert.ok(casas.length >= 50, `só ${casas.length} casas`);
  for (const c of casas) {
    const tipo = V.tipos[c.tipo];
    assert.ok(tipo, c.tipo);
    assert.ok(Math.abs(larguraFachada(c) - tipo.l) < 0.01, `fachada de ${c.tipo} em (${c.x}; ${c.z})`);
    // A profundidade só cresce para a casa encostar num muro atrás (nunca passa de um beco a mais).
    assert.ok(fundoDaCasa(c) >= tipo.p - 0.01 && fundoDaCasa(c) <= tipo.p + V.ruas.beco, `fundo de ${c.tipo} em (${c.x}; ${c.z})`);
  }
  const tipos = new Set(casas.map((c) => c.tipo));
  assert.deepEqual([...tipos].sort(), Object.keys(V.tipos).sort());
});

test('ruas, travessas e becos usam só as três larguras do plano', () => {
  const { ruas } = aVila();
  for (const r of ruas.filter((r) => r.classe in V.ruas)) {
    assert.ok(Math.abs(Math.min(r.l, r.p) - V.ruas[r.classe]) < 0.01, `${r.classe} em (${r.x}; ${r.z}) tem ${Math.min(r.l, r.p)} m`);
  }
  assert.ok(V.ruas.beco >= V.corredorMinimo);
  // O mínimo cabe o quickstep para o lado e o corpo do caçador.
  const q = CONFIG.combate.quickstep;
  assert.ok(V.corredorMinimo >= q.velocidade * q.duracao + 2 * CONFIG.jogador.raio - 0.01);
});

test('nenhuma casa invade rua nem encosta em outra deixando fresta', () => {
  const { casas, ruas } = aVila();
  for (const c of casas) {
    for (const r of ruas) {
      const ret = { minX: r.x - r.l / 2, maxX: r.x + r.l / 2, minZ: r.z - r.p / 2, maxZ: r.z + r.p / 2 };
      assert.ok(!cruzam(c.ret, ret, -0.01), `casa em (${c.x}; ${c.z}) invade a rua em (${r.x}; ${r.z})`);
    }
  }
  for (let i = 0; i < casas.length; i++) {
    for (let j = i + 1; j < casas.length; j++) {
      const d = distanciaRet(casas[i].ret, casas[j].ret);
      assert.ok(!cruzam(casas[i].ret, casas[j].ret, -0.01), `casas sobrepostas em (${casas[i].x}; ${casas[i].z})`);
      assert.ok(d <= 0.05 || d >= V.ruas.beco - 0.01, `fresta de ${d.toFixed(2)} m entre (${casas[i].x}; ${casas[i].z}) e (${casas[j].x}; ${casas[j].z})`);
    }
  }
});

test('entre duas paredes, todo vão por onde se anda tem pelo menos o corredor mínimo', () => {
  const v = aVila();
  const chega = alcance(v);
  const altos = v.colisores.caixas.filter((c) => c.topo > 2 && !c.arco && (c.maxX - c.minX) * (c.maxZ - c.minZ) > 1.5);
  const frestas = [];
  for (let i = 0; i < altos.length; i++) {
    for (let j = i + 1; j < altos.length; j++) {
      const [a, b] = [altos[i], altos[j]];
      const d = distanciaRet(a, b);
      if (d <= 0.05 || d >= V.corredorMinimo) continue;
      // Um vão estreito só é aceito se ninguém chega nele (atrás da igreja, dentro da muralha).
      const meio = {
        x: (Math.max(a.minX, b.minX) + Math.min(a.maxX, b.maxX)) / 2,
        z: (Math.max(a.minZ, b.minZ) + Math.min(a.maxZ, b.maxZ)) / 2,
      };
      if (chega(meio.x, meio.z)) frestas.push(`${d.toFixed(2)} m em (${meio.x.toFixed(1)}; ${meio.z.toFixed(1)})`);
    }
  }
  assert.deepEqual(frestas, []);
});

test('do Portão Sul se chega a pé às lanternas, aos portais e a cada ponto das patrulhas', () => {
  const v = aVila();
  const chega = alcance(v);
  const destinos = [
    ...v.pontosDeDescanso.map((p) => [p.id, p]),
    // O portal da catedral fica no alto da escadaria; a busca não sobe degraus, então
    // basta chegar ao pé da escada (até 4,5 m além do raio do portal).
    ...v.portais.map((p) => [`portal ${p.destino}`, { ...p, tolerancia: p.raio + 4.5 }]),
    ...v.inimigos.flatMap((i, k) => i.rota.map(([x, z], n) => [`patrulha ${k}.${n}`, { x, z }])),
  ];
  for (const [nome, { x, z, tolerancia }] of destinos) {
    assert.ok(chega(x, z, tolerancia), nome);
  }
});

test('as ruas compridas têm arcos que cortam a vista de ponta a ponta', () => {
  const { arcos, ruas } = aVila();
  assert.ok(arcos.length >= 4, `só ${arcos.length} arcos`);
  for (const r of ruas.filter((r) => r.arcos)) {
    const comp = Math.max(r.l, r.p);
    const nela = arcos.filter(([x, z]) => Math.abs(x - r.x) <= r.l / 2 && Math.abs(z - r.z) <= r.p / 2);
    assert.ok(nela.length >= 1 || comp < 34, `rua em (${r.x}; ${r.z}) sem arco`);
  }
});
