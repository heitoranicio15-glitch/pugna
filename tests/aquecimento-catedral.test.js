import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { criarAreas } from '../src/mundo/areas.js';
import { Lanterna } from '../src/entidades/Lanterna.js';
import { texturas } from '../src/render/texturas.js';
import { CONFIG } from '../src/config.js';
import { PASSO_DE_LUZES, aquecerArea, luzAtiva } from '../src/render/aquecimento.js';

// Pausa >1 s na primeira subida da torre: o Three.js recompila os materiais a cada número
// novo de luzes de ponto visíveis. Sem WebGL, medimos os programas (material + contagem de
// luzes) que o render pediria pela primeira vez no caminho da nave até a torre.
const ctx = new Proxy(function () {}, {
  get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : ctx),
  apply: () => ctx,
  set: () => true,
});
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };

const USAM_LUZ = new Set(['MeshLambertMaterial', 'MeshPhongMaterial', 'MeshStandardMaterial']);
const materiaisDe = (o) => (o.material ? [].concat(o.material) : []);

// Aproxima a chave de programa do Three (r170): tipo, recursos do material, tipo de névoa, espaço de
// cor de saída (alvo de render = linear; tela = o do renderer) e, se usa luz, o número de luzes de ponto.
function chaveDePrograma(material, objeto, cena, luzes, render) {
  const saida = render.getRenderTarget() ? THREE.LinearSRGBColorSpace : render.outputColorSpace;
  return [
    material.type, material.customProgramCacheKey?.() ?? '', !!material.map, !!material.emissiveMap,
    material.vertexColors, objeto.isInstancedMesh, !!objeto.instanceColor, material.alphaTest > 0,
    material.fog !== false && cena.fog?.constructor.name, saida, USAM_LUZ.has(material.type) ? luzes : '-',
  ].join('|');
}

function luzesDeCena(cena) {
  let n = 0;
  cena.traverse((o) => { if (o.isPointLight && luzAtiva(o)) n++; });
  return n;
}

// Alvo do RenderizadorRetro (HalfFloat): o jogo desenha nele, não na tela.
const alvoDoJogo = () => new THREE.WebGLRenderTarget(480, 270, { type: THREE.HalfFloatType, depthBuffer: true });

function montar() {
  const cena = new THREE.Scene();
  cena.fog = new THREE.FogExp2(0x101020, 0.02);
  const { areas, porId } = criarAreas(cena, { direcaoLua: new THREE.Vector3(0.3, 0.5, -0.8).normalize() });
  const catedral = porId.get('catedral');
  cena.add(new THREE.PointLight(0x7a86ff, 5, 11, 1.6));   // luz que segue o jogador
  catedral.lanternas = catedral.pontosDeDescanso.map((p) => new Lanterna(catedral, p));
  for (const area of areas) area.grupo.visible = area === catedral;
  return { cena, areas, catedral };
}

// Imita o compile(objeto, camera, cenaAlvo) do r170: luzes visíveis da cena alvo e do objeto,
// materiais só do objeto, névoa da cena alvo, espaço de cor do alvo de render ativo.
function rendererDeMentira() {
  const programas = new Set(), enviadas = new Set();
  let alvo = null;
  return {
    programas, enviadas, compilacoes: 0, outputColorSpace: THREE.SRGBColorSpace,
    getRenderTarget: () => alvo,
    setRenderTarget(a) { alvo = a; },
    initTexture(t) { enviadas.add(t); },
    compile(objeto, camera, cena = objeto) {
      this.compilacoes++;
      const luzes = luzesDeCena(cena) + (objeto === cena || objeto.parent === cena ? 0 : luzesDeCena(objeto));
      objeto.traverse((o) => { for (const m of materiaisDe(o)) programas.add(chaveDePrograma(m, o, cena, luzes, this)); });
    },
  };
}

// Caminho do jogador: nave -> escada da galeria -> patamar -> escada da torre -> sala do Bronze.
function caminho() {
  const p = [];
  const trechos = [[[0, 0, 6], [12, 0, 15]], [[12, 0, 15], [12, 4, 23]], [[12, 4, 23], [16, 4, 25]],
    [[16, 4, 23], [16, 8, 15]], [[16, 8, 15], [20, 8, 13.9]]];   // inclui subida-galeria e subida-torre
  for (const [a, b] of trechos) {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.25));
    for (let i = 0; i <= n; i++) p.push(a.map((v, k) => v + (b[k] - v) * i / n));
  }
  return p;
}

// Percorre o caminho olhando para 8 direções e devolve o que o render pediria a cada quadro.
function percorrer(cena, catedral, aoPedir) {
  const camera = new THREE.PerspectiveCamera(CONFIG.render.campoDeVisao, 16 / 9, 0.08, 3000);
  for (const [x, y, z] of caminho()) for (let k = 0; k < 8; k++) {
    const yaw = k * Math.PI / 4;
    camera.position.set(x + Math.sin(yaw) * 3, y + 2.2, z + Math.cos(yaw) * 3);
    camera.rotation.set(-0.15, yaw, 0, 'YXZ');
    catedral.atualizar(0, 0, new THREE.Vector3(x, y, z));
    catedral.prepararRender(camera);
    const luzes = luzesDeCena(cena);
    catedral.grupo.traverse((o) => {
      if (!luzAtiva(o.parent ?? o) || !o.visible) return;   // só o que o render desenharia (sem recorte de câmera)
      for (const m of materiaisDe(o)) aoPedir(m, o, luzes);
    });
  }
}

const todosOsMateriais = (grupo) => { const s = new Set(); grupo.traverse((o) => materiaisDe(o).forEach((m) => s.add(m))); return [...s]; };

test('revelar a torre não cria materiais nem texturas novos durante o quadro', () => {
  const { cena, catedral } = montar();
  const materiaisAntes = todosOsMateriais(catedral.grupo), texturasAntes = Object.values(texturas());
  percorrer(cena, catedral, () => {});
  assert.deepEqual(todosOsMateriais(catedral.grupo), materiaisAntes, 'a subida criou materiais');
  assert.deepEqual(Object.values(texturas()), texturasAntes, 'a subida criou texturas');
});

test('a contagem de luzes no render só assume degraus pré-compilados', () => {
  const { cena, catedral } = montar();
  const vistas = new Set();
  percorrer(cena, catedral, (m, o, luzes) => vistas.add(luzes));
  // Uma luz do jogador (fixa) + degraus de PASSO_DE_LUZES luzes de ponto da área.
  const degraus = new Set(catedral.degrausDeLuz.map((n) => n + 1));
  for (const n of vistas) assert.ok(degraus.has(n), `contagem ${n} não tem programa pré-compilado (degraus ${[...degraus]})`);
  assert.ok(vistas.size <= catedral.degrausDeLuz.length, `${vistas.size} contagens diferentes no caminho`);
});

async function aquecidoEPercorrido(alvoDoAquecimento) {
  const { cena, catedral } = montar();
  const render = rendererDeMentira();
  const alvo = alvoDoJogo();
  const antes = [];
  catedral.grupo.traverse((o) => antes.push([o, o.visible]));
  const indice = cena.children.indexOf(catedral.grupo);
  const camera = new THREE.PerspectiveCamera(CONFIG.render.campoDeVisao, 16 / 9, 0.08, 3000);
  await aquecerArea(render, cena, camera, catedral, alvoDoAquecimento(alvo));

  assert.equal(render.compilacoes, catedral.degrausDeLuz.length, 'um passe de compilação por contagem de luzes');
  assert.ok(antes.every(([o, v]) => o.visible === v), 'o pré-aquecimento mudou a visibilidade da cena');
  assert.equal(cena.children.indexOf(catedral.grupo), indice, 'a Catedral saiu do lugar na cena');
  assert.equal(render.getRenderTarget(), null, 'o alvo de render não foi restaurado');

  render.setRenderTarget(alvo);   // como RenderizadorRetro.desenhar
  const faltando = new Set(), texturasFaltando = new Set(), pedidos = new Set();
  percorrer(cena, catedral, (m, o, luzes) => {
    const chave = chaveDePrograma(m, o, cena, luzes, render);
    pedidos.add(chave);
    if (!render.programas.has(chave)) faltando.add(chave);
    for (const v of Object.values(m)) if (v?.isTexture && !render.enviadas.has(v)) texturasFaltando.add(v);
  });
  return { faltando, texturasFaltando, pedidos, render };
}

test('o pré-aquecimento cobre todo programa e textura que a subida da torre pede', async () => {
  const { faltando, texturasFaltando, pedidos, render } = await aquecidoEPercorrido((alvo) => alvo);
  assert.ok(pedidos.size >= 10, 'o caminho não exercita a Catedral');
  const emTela = `|${THREE.SRGBColorSpace}|`, emAlvo = `|FogExp2|${THREE.LinearSRGBColorSpace}|`;
  assert.ok([...render.programas].every((k) => !k.includes(emTela)), 'compilou para a tela, não para o alvo do jogo');
  assert.ok([...pedidos].every((k) => k.includes(emAlvo) || !k.includes('|FogExp2|')), 'o render real usa névoa e alvo linear');
  assert.deepEqual([...faltando], [], `${faltando.size} programas seriam compilados durante a subida`);
  assert.equal(texturasFaltando.size, 0, `${texturasFaltando.size} texturas subiriam à GPU durante a subida`);
});

test('compilar sem o alvo de render do jogo deixaria programas para o meio da partida', async () => {
  const { faltando } = await aquecidoEPercorrido(() => null);
  assert.ok(faltando.size > 0, 'o teste não distingue o espaço de cor do alvo');
});
