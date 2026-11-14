// =============================================================================
//  PEÇAS DE CONSTRUÇÃO
//  Funções que montam casas, torres, igreja, tochas e árvores a partir de formas
//  simples (caixas, pirâmides, cilindros). O Vilarejo.js decide ONDE colocar.
// =============================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';
import { registrarMaterialHd } from '../render/materiaisHd.js';
import { modeloPronto } from '../render/modelos.js';

let M = null;
// Família de textura de cada material compartilhado (CONFIG.arte.ladrilho). Com ela,
// caixa(), planoDeChao() e telhado() usam o mesmo tamanho de tijolo em qualquer peça.
const FAMILIA = new WeakMap();
const familia = (material, nome) => { FAMILIA.set(material, nome); return material; };
/** Metros por repetição de textura do material (ou `reserva` se ele não tem família). */
export function ladrilhoDe(material, reserva) {
  const nome = FAMILIA.get(material);
  return nome ? CONFIG.arte.ladrilho[nome] : reserva;
}

/** Materiais compartilhados (criados uma vez). */
export function materiais() {
  if (M) return M;
  const t = texturas();
  const lambert = (map, extra = {}) => retro(new THREE.MeshLambertMaterial({ map, ...extra }));
  const basico = (map, extra = {}) => retro(new THREE.MeshBasicMaterial({ map, ...extra }));
  const pedra = (extra) => registrarMaterialHd(lambert(t.pedra, extra), 'castle_wall_slates', 0.8);
  const calcamento = (map, extra) => registrarMaterialHd(lambert(map, extra), 'cobblestone_floor_001', 0.62);
  const terra = (extra) => registrarMaterialHd(lambert(t.terra, extra), 'stony_dirt_path', 0.6);
  const madeira = (extra) => registrarMaterialHd(lambert(t.madeira, extra), 'old_planks_02', 0.7);
  M = {
    pedra: familia(pedra(), 'pedra'),
    pedraEscura: familia(pedra({ color: 0x9a94c8 }), 'pedra'),
    calcamento: familia(calcamento(t.calcamento), 'calcamento'),
    // Chão e ruas não gravam profundidade: são desenhados primeiro e tudo o mais fica por
    // cima. Isso evita o "pisca-pisca" entre a grama e o calçamento (veja Vilarejo.js).
    calcamentoChao: familia(calcamento(t.calcamento, { depthWrite: false }), 'calcamento'),
    terraChao: terra({ depthWrite: false }),
    caminhoChao: terra({ color: 0xcdb89a, depthWrite: false }),
    madeiraChao: familia(registrarMaterialHd(lambert(t.assoalho, { color: 0xb59a86, depthWrite: false }), 'old_planks_02', 0.7), 'assoalho'),
    lajesChao: familia(registrarMaterialHd(lambert(t.lajes, { depthWrite: false }), 'patterned_slate_tiles', 0.55), 'lajes'),
    mosaicoChao: lambert(t.mosaico, { depthWrite: false }),
    telhado: familia(registrarMaterialHd(lambert(t.telhado, { side: THREE.DoubleSide }), 'roof_slates_02', 0.8), 'telhado'),
    madeira: familia(madeira(), 'madeira'),
    madeiraEscura: familia(madeira({ color: 0x9a7e6c }), 'madeira'),
    morro: terra({ color: 0x8890c0, flatShading: true }),
    metal: lambert(t.metal),
    tronco: lambert(t.madeira, { color: 0x6a6090, flatShading: true }),
    janelaAcesa: basico(t.janelaAcesa),
    janelaApagada: lambert(t.janelaApagada),
    vitral: basico(t.vitral, { color: 0xb0b0b0 }),
    chama: retro(new THREE.MeshBasicMaterial({ color: 0xffc46a })),
    silhueta: new THREE.MeshBasicMaterial({ color: 0x10245a, fog: false }),
  };
  return M;
}

/** Caixa cuja textura se repete conforme o tamanho real (1 ladrilho = `ladrilho` metros). */
export function caixa(l, a, p, material, ladrilho = 2) {
  ladrilho = ladrilhoDe(material, ladrilho);
  const geo = new THREE.BoxGeometry(l, a, p);
  const uv = geo.attributes.uv;
  // Ordem das faces da caixa no Three.js: +x, -x, +y, -y, +z, -z (4 cantos cada).
  const escalas = [[p, a], [p, a], [l, p], [l, p], [l, a], [l, a]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * escalas[f][0] / ladrilho, uv.getY(k) * escalas[f][1] / ladrilho);
    }
  }
  return new THREE.Mesh(geo, material);
}

/**
 * Plano horizontal cuja textura se repete a cada `ladrilho` metros. Para chãos e ruas:
 * use um material com depthWrite: false e uma `ordem` fixa (veja Vilarejo.js).
 * Use `ladrilho: null` para aplicar uma imagem inteira, como no tapete.
 */
export function planoDeChao(mundo, { x, z, l, p, ladrilho = 5, material, ordem = -6, y = 0 }) {
  const geo = new THREE.PlaneGeometry(l, p);
  if (ladrilho !== null) {
    ladrilho = ladrilhoDe(material, ladrilho);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (x + (uv.getX(i) - 0.5) * l) / ladrilho, (-z + (uv.getY(i) - 0.5) * p) / ladrilho);
    }
  }
  const malha = new THREE.Mesh(geo, material);
  malha.rotation.x = -Math.PI / 2;
  malha.position.set(x, y, z);
  malha.renderOrder = ordem;
  mundo.grupo.add(malha);
  return malha;
}

const aduelas = new THREE.LatheGeometry([
  [0, -0.5], [0.76, -0.5], [0.83, -0.48], [0.86, -0.38],
  [0.96, -0.2], [1, 0], [0.96, 0.2], [0.86, 0.38], [0.83, 0.48],
  [0.76, 0.5], [0.76, 0.455], [0, 0.455],
].map(([r, y]) => new THREE.Vector2(r, y)), 8);
const cinta = new THREE.CylinderGeometry(0.94, 0.97, 0.055, 8, 1, true);

/** Barril facetado com tampa rebaixada e aros. Raio e altura são o envelope visual. */
export function barril(raio, altura) {
  const m = materiais();
  const grupo = new THREE.Group();
  const original = new THREE.Group();
  original.scale.set(raio, altura, raio);
  original.add(new THREE.Mesh(aduelas, m.madeira));
  for (const lado of [-1, 1]) {
    const aro = new THREE.Mesh(cinta, m.metal);
    aro.position.y = lado * 0.255;
    aro.rotation.z = lado === -1 ? Math.PI : 0;
    original.add(aro);
  }
  grupo.add(original);
  modeloPronto(grupo, 'Barrel', { pos: [0, -altura / 2, 0], tamanho: [raio * 2, altura, raio * 2], reserva: [original] });
  return grupo;
}

function perfilOgival(meia, altura) {
  const centro = meia * 0.5;
  const raio = meia + centro;
  const escala = altura / Math.sqrt(raio * raio - centro * centro);
  return Array.from({ length: 13 }, (_, i) => {
    const x = meia * (i / 6 - 1);
    const y = Math.sqrt(Math.max(0, raio * raio - (Math.abs(x) + centro) ** 2));
    return [x, y * escala];
  });
}

/** Moldura ogival construída em pedra contínua, com a abertura livre. */
export function arcoOgival(largura, flecha, espessura, profundidade, material) {
  const meia = largura / 2;
  const interior = perfilOgival(meia, flecha);
  const exterior = perfilOgival(meia + espessura, flecha + espessura);
  const forma = new THREE.Shape();
  const contorno = [...exterior, ...interior.reverse()];
  forma.moveTo(...contorno[0]);
  for (const ponto of contorno.slice(1)) forma.lineTo(...ponto);
  forma.closePath();
  const geo = new THREE.ExtrudeGeometry(forma, { depth: profundidade, bevelEnabled: false });
  geo.translate(0, 0, -profundidade / 2);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.7, uv.getY(i) / 1.7);
  return new THREE.Mesh(geo, material);
}

/** Forro facetado por cima das nervuras, com as faces voltadas para a nave. */
export function abobadaOgival(largura, flecha, profundidade, material) {
  const perfil = perfilOgival(largura / 2, flecha);
  const pos = [], uv = [];
  const z = profundidade / 2;
  for (let i = 1; i < perfil.length; i++) {
    const [ax, ay] = perfil[i - 1], [bx, by] = perfil[i];
    pos.push(ax, ay, -z, bx, by, -z, bx, by, z, ax, ay, -z, bx, by, z, ax, ay, z);
    uv.push(ax / 2, 0, bx / 2, 0, bx / 2, z, ax / 2, 0, bx / 2, z, ax / 2, z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

export function colunaFacetada(altura, raio, pedra, base) {
  const grupo = new THREE.Group();
  const segmento = (topo, pe, a, y, mat) => {
    const geo = new THREE.CylinderGeometry(topo, pe, a, 8);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * a / 1.3);
    const malha = new THREE.Mesh(geo, mat);
    malha.position.y = y;
    grupo.add(malha);
  };
  segmento(raio * 0.83, raio, altura, altura / 2, pedra);
  segmento(raio, raio * 1.32, 0.33, 0.165, base);
  segmento(raio * 1.24, raio * 0.83, 0.34, altura - 0.17, base);
  return grupo;
}

/** Telhado de duas águas (prisma triangular). A cumeeira corre no eixo Z. */
export function telhado(l, a, p, matTelha, matEmpena, ladrilho = 2) {
  ladrilho = ladrilhoDe(matTelha, ladrilho);
  const x = l / 2, z = p / 2, s = Math.hypot(x, a);
  const pos = [], uv = [];
  const quad = (A, B, C, D, u, v) => {
    pos.push(...A, ...B, ...C, ...A, ...C, ...D);
    uv.push(0, 0, u, 0, u, v, 0, 0, u, v, 0, v);
  };
  quad([-x, 0, -z], [-x, 0, z], [0, a, z], [0, a, -z], p / ladrilho, s / ladrilho);
  quad([x, 0, z], [x, 0, -z], [0, a, -z], [0, a, z], p / ladrilho, s / ladrilho);
  pos.push(-x, 0, z, x, 0, z, 0, a, z, x, 0, -z, -x, 0, -z, 0, a, -z);
  const ul = l / ladrilho, ua = a / ladrilho;
  uv.push(0, 0, ul, 0, ul / 2, ua, 0, 0, ul, 0, ul / 2, ua);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  geo.addGroup(0, 12, 0); geo.addGroup(12, 6, 1);
  return new THREE.Mesh(geo, [matTelha, matEmpena]);
}

/** Pirâmide de 4 lados (pontas de torre). */
export function piramide(lado, altura, material) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(lado * 0.7071, altura, 4, 1), material);
  m.rotation.y = Math.PI / 4;
  return m;
}

const ROTACAO = { S: 0, L: Math.PI / 2, N: Math.PI, O: -Math.PI / 2 };

/**
 * Junta caixas por material e devolve uma malha por material.
 * Assim uma casa inteira custa poucas chamadas de desenho, e o UV de cada caixa
 * continua em metros (mesma densidade de textura de qualquer outra peça).
 */
export function juntarPorMaterial() {
  const porMaterial = new Map();
  const guardar = (material, geometry) => {
    if (!porMaterial.has(material)) porMaterial.set(material, []);
    porMaterial.get(material).push(geometry.index ? geometry.toNonIndexed() : geometry);
  };
  return {
    /** Caixa de l × a × p com o centro em (x, y, z) e giro `ry` no eixo vertical. */
    caixa(x, y, z, l, a, p, material, ry = 0) {
      const { geometry } = caixa(l, a, p, material);
      if (ry) geometry.rotateY(ry);
      geometry.translate(x, y, z);
      guardar(material, geometry);
    },
    /** Geometria pronta (já posicionada) com o material dado. */
    geometria(geometry, material) { guardar(material, geometry); },
    /** Passa tudo para outro kit, aplicando a matriz (posição e giro da peça). */
    transferir(destino, matriz) {
      for (const [material, geometrias] of porMaterial) {
        for (const geo of geometrias) destino.geometria(geo.applyMatrix4(matriz), material);
      }
      porMaterial.clear();
    },
    montar(grupo, nome) {
      for (const [material, geometrias] of porMaterial) {
        const malha = new THREE.Mesh(mergeGeometries(geometrias), material);
        malha.name = nome;
        grupo.add(malha);
        for (const geo of geometrias) geo.dispose();
      }
      porMaterial.clear();
    },
  };
}

/**
 * Junta muitas peças (casas, ruínas) em poucas malhas, separadas por setor do mapa.
 * Cada setor de `tamanho` metros vira uma malha por material: poucas chamadas de
 * desenho, e o setor que está fora da tela continua sendo descartado.
 */
export class LoteDeCenario {
  constructor(grupo, nome, tamanho = 40) {
    this.grupo = grupo; this.nome = nome; this.tamanho = tamanho;
    this.setores = new Map();
  }
  kit(x, z) {
    const chave = `${Math.floor(x / this.tamanho)}:${Math.floor(z / this.tamanho)}`;
    if (!this.setores.has(chave)) this.setores.set(chave, juntarPorMaterial());
    return this.setores.get(chave);
  }
  /** Coloca o conteúdo de `origem` (coordenadas da peça) em (x, z) com giro `ry`. */
  adicionar(origem, x, z, ry = 0) {
    const matriz = new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z);
    origem.transferir(this.kit(x, z), matriz);
  }
  montar() {
    for (const kit of this.setores.values()) kit.montar(this.grupo, this.nome);
    this.setores.clear();
  }
}

/** Telhado de duas águas com cumeeira no eixo X, beiral nos quatro lados e empenas
 *  de pedra rentes às paredes (não sobra fresta entre a parede e o telhado). */
function geometriaTelhado(l, p, h, beiral) {
  const meia = p / 2, queda = beiral * h / meia;          // o beiral continua o caimento
  const x0 = -l / 2 - beiral, x1 = l / 2 + beiral, zb = meia + beiral;
  const lad = ladrilhoDe(materiais().telhado, 2), s = Math.hypot(zb, h + queda);
  const aguas = [], uvAguas = [];
  const quad = (A, B, C, D) => {
    aguas.push(...A, ...B, ...C, ...A, ...C, ...D);
    const u = (x1 - x0) / lad, v = s / lad;
    uvAguas.push(0, 0, u, 0, u, v, 0, 0, u, v, 0, v);
  };
  quad([x0, -queda, zb], [x1, -queda, zb], [x1, h, 0], [x0, h, 0]);     // água da frente (+z)
  quad([x1, -queda, -zb], [x0, -queda, -zb], [x0, h, 0], [x1, h, 0]);   // água de trás (−z)
  const telha = new THREE.BufferGeometry();
  telha.setAttribute('position', new THREE.Float32BufferAttribute(aguas, 3));
  telha.setAttribute('uv', new THREE.Float32BufferAttribute(uvAguas, 2));
  telha.computeVertexNormals();
  // Empenas: triângulos de pedra fechando os dois lados, na mesma face das paredes.
  const lp = ladrilhoDe(materiais().pedra, 2);
  const emp = [], uvEmp = [];
  for (const lado of [-1, 1]) {
    const x = lado * l / 2;
    const tri = lado > 0 ? [[x, 0, meia], [x, 0, -meia], [x, h, 0]] : [[x, 0, -meia], [x, 0, meia], [x, h, 0]];
    for (const [vx, vy, vz] of tri) { emp.push(vx, vy, vz); uvEmp.push(vz / lp, vy / lp); }
  }
  const empena = new THREE.BufferGeometry();
  empena.setAttribute('position', new THREE.Float32BufferAttribute(emp, 3));
  empena.setAttribute('uv', new THREE.Float32BufferAttribute(uvEmp, 2));
  empena.computeVertexNormals();
  return { telha, empena };
}

/** Escolha estável (sem sorteio): a mesma casa no mesmo lugar acende as mesmas janelas. */
const estavel = (x, z, i) => {
  const s = Math.sin(x * 12.9898 + z * 78.233 + i * 37.719) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Casa modular de pedra (paredes + cantos + telhado que sempre fecham).
 * frente = para onde a porta aponta ('N','S','L','O').
 * Use `tipo` ('pequena', 'media', 'grande' em CONFIG.vila.tipos, quando existir) ou
 * l = largura da fachada, p = profundidade, a = altura das paredes.
 * As medidas de porta, janela, pé-direito e beiral vêm de CONFIG.arte.casa.
 */
export function casa(mundo, {
  x, z, l = 7, p = 8, a = 5, frente = 'S', acesa = false,
  tipo = null,              // 'pequena' | 'media' | 'grande' (CONFIG.vila.tipos): manda em l, p e a
  fundo = null,             // profundidade maior que a do tipo, para a casa encostar num muro atrás
  lote = null,              // LoteDeCenario: junta a casa às vizinhas em poucas malhas
  todasAcesas = false,      // todas as janelas acesas (a taverna)
  xPorta: xPortaFixo = null, // posição da porta na fachada (padrão: centro)
  chamine: posChamine = null, // { x, z } da chaminé (padrão: perto da empena direita)
}) {
  const m = materiais();
  const K = CONFIG.arte.casa;
  if (tipo) ({ l, p, a } = CONFIG.vila.tipos[tipo]);
  if (fundo) p = fundo;
  const g = new THREE.Group();
  g.name = 'Casa';
  const kit = juntarPorMaterial();
  const frenteZ = p / 2;
  const sobrado = a >= K.peDireito + 2;

  // Corpo de pedra (caixa fechada), rodapé escuro e cantos de madeira queimada.
  kit.caixa(0, a / 2, 0, l, a, p, m.pedra);
  kit.caixa(0, K.rodape / 2, 0, l + 0.16, K.rodape, p + 0.16, m.pedraEscura);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    kit.caixa(sx * (l / 2 - 0.08), a / 2, sz * (p / 2 - 0.08), 0.28, a, 0.28, m.madeiraEscura);
  }
  // Viga do sobrado e frechal (no topo das paredes), nos quatro lados.
  for (const y of sobrado ? [K.peDireito, a - 0.1] : [a - 0.1]) {
    for (const sz of [-1, 1]) kit.caixa(0, y, sz * (p / 2 + 0.04), l + 0.1, 0.2, 0.16, m.madeiraEscura);
    for (const sx of [-1, 1]) kit.caixa(sx * (l / 2 + 0.04), y, 0, 0.16, 0.2, p + 0.1, m.madeiraEscura);
  }

  // Telhado: altura fixa pelo caimento (sem sorteio), empenas de pedra.
  const altTelhado = K.caimento * p / 2;
  const { telha, empena } = geometriaTelhado(l, p, altTelhado, K.beiral);
  telha.translate(0, a, 0); empena.translate(0, a, 0);
  kit.geometria(telha, m.telhado);
  kit.geometria(empena, m.pedra);
  kit.caixa(0, a + altTelhado + 0.06, 0, l + 2 * K.beiral + 0.1, 0.14, 0.3, m.madeiraEscura);   // cumeeira

  // Chaminé atravessando o telhado, sempre acima da cumeeira.
  const cx = posChamine?.x ?? l / 2 - 1.1, cz = posChamine?.z ?? -p / 4;
  const baseChamine = a + altTelhado * (1 - Math.abs(cz) / (p / 2)) - 0.4;
  const topoChamine = a + altTelhado + 0.9;
  kit.caixa(cx, (baseChamine + topoChamine) / 2, cz, 0.8, topoChamine - baseChamine, 0.8, m.pedraEscura);
  kit.caixa(cx, topoChamine + 0.08, cz, 0.95, 0.16, 0.95, m.pedra);
  g.userData.topoChamine = new THREE.Vector3(cx, topoChamine + 0.2, cz);

  // Porta (medida única) com batentes e ferragens.
  const P = K.porta;
  const xPorta = xPortaFixo ?? 0;
  kit.caixa(xPorta, P.altura / 2, frenteZ + 0.07, P.largura, P.altura, 0.12, m.madeira);   // à frente do rodapé
  if (!todasAcesas) {
    for (const lado of [-1, 1]) kit.caixa(xPorta + lado * (P.largura / 2 + 0.08), P.altura / 2, frenteZ + 0.1, 0.16, P.altura, 0.2, m.pedraEscura);
    kit.caixa(xPorta, P.altura + 0.1, frenteZ + 0.1, P.largura + 0.32, 0.2, 0.2, m.pedraEscura);
  }
  for (const y of [0.6, 1.6]) kit.caixa(xPorta, y, frenteZ + 0.145, P.largura - 0.16, 0.08, 0.03, m.metal);

  // Janelas (medida única): moldura, peitoril e vidro aceso ou apagado.
  const J = K.janela;
  let n = 0;
  const janela = (jx, jy, face) => {
    const luz = todasAcesas || (acesa && estavel(x, z, n++) < 0.55);
    const vidro = caixa(J.largura, J.altura, 0.06, luz ? m.janelaAcesa : m.janelaApagada, 1);
    const uv = vidro.geometry.attributes.uv;   // a imagem da janela inteira em cada face
    for (let f = 0; f < 6; f++) { uv.setXY(f * 4, 0, 1); uv.setXY(f * 4 + 1, 1, 1); uv.setXY(f * 4 + 2, 0, 0); uv.setXY(f * 4 + 3, 1, 0); }
    // face: 0 = frente (+z), 1 = trás (−z), 2 = direita (+x), 3 = esquerda (−x)
    const ry = [0, Math.PI, Math.PI / 2, -Math.PI / 2][face];
    const [px, pz] = [[jx, frenteZ], [-jx, -frenteZ], [l / 2, -jx], [-l / 2, jx]][face];
    const dentro = (d) => [px + Math.sin(ry) * d, pz + Math.cos(ry) * d];
    const geo = vidro.geometry; geo.rotateY(ry);
    const [vx, vz] = dentro(0.02); geo.translate(vx, jy, vz);
    kit.geometria(geo, vidro.material);
    const [mx, mz] = dentro(0.07);
    const larg = J.largura + 0.3;
    const lx = Math.cos(ry), lz = -Math.sin(ry);
    kit.caixa(mx, jy + J.altura / 2 + 0.06, mz, larg, 0.14, 0.14, m.madeiraEscura, ry);
    kit.caixa(mx, jy - J.altura / 2 - 0.07, mz, larg + 0.1, 0.12, 0.22, m.pedraEscura, ry);
    for (const lado of [-1, 1]) {
      kit.caixa(mx + lx * lado * (J.largura / 2 + 0.07), jy, mz + lz * lado * (J.largura / 2 + 0.07), 0.14, J.altura, 0.14, m.madeiraEscura, ry);
    }
  };
  const yTerreo = 1.65, ySobrado = K.peDireito + 1.25;
  const colunas = [-l / 2 + 1.5, l / 2 - 1.5];
  for (const jx of colunas) {
    if (Math.abs(jx - xPorta) > P.largura / 2 + J.largura / 2 + 0.4) janela(jx, yTerreo, 0);
    if (sobrado) janela(jx, ySobrado, 0);
  }
  if (sobrado && l >= 8) janela(xPorta, ySobrado, 0);
  janela(0, sobrado ? ySobrado : yTerreo, 2);
  janela(0, sobrado ? ySobrado : yTerreo, 3);
  janela(colunas[0], yTerreo, 1);
  const deLado = frente === 'L' || frente === 'O';
  mundo.colisores.adicionar(x, z, deLado ? p : l, deLado ? l : p);
  if (lote) { lote.adicionar(kit, x, z, ROTACAO[frente]); return null; }
  kit.montar(g, 'Casa');
  g.position.set(x, 0, z);
  g.rotation.y = ROTACAO[frente];
  mundo.grupo.add(g);
  return g;
}
/** Torre quadrada. tipo: 'ameias' (topo de castelo) ou 'ponta' (telhado pontudo). */
export function torre(mundo, { x, z, lado = 5, a = 16, tipo = 'ameias', colide = true }) {
  const m = materiais();
  const g = new THREE.Group();
  g.name = 'Torre';
  const kit = juntarPorMaterial();
  kit.caixa(0, a / 2, 0, lado, a, lado, m.pedra);
  kit.caixa(0, CONFIG.arte.casa.rodape / 2, 0, lado + 0.2, CONFIG.arte.casa.rodape, lado + 0.2, m.pedraEscura);
  kit.caixa(0, a, 0, lado + 0.8, 0.6, lado + 0.8, m.pedraEscura);
  if (tipo === 'ameias') {
    const n = Math.max(2, Math.round(lado / 1.6));
    for (let i = 0; i < n; i++) {
      const d = -lado / 2 + (i + 0.5) * (lado / n);
      for (const [ax, az] of [[d, lado / 2 + 0.1], [d, -lado / 2 - 0.1], [lado / 2 + 0.1, d], [-lado / 2 - 0.1, d]]) {
        kit.caixa(ax, a + 0.75, az, 0.7, 0.9, 0.7, m.pedraEscura);
      }
    }
  } else {
    const ponta = piramide(lado + 1, lado * 1.9, m.telhado);
    ponta.updateMatrix();
    const geo = ponta.geometry.toNonIndexed().applyMatrix4(ponta.matrix).translate(0, a + 0.3 + lado * 0.95, 0);
    kit.geometria(geo, m.telhado);
  }
  // Seteiras escuras nas quatro faces.
  for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const j = caixa(0.5, 1.4, 0.1, m.janelaApagada, 1.5).geometry.rotateY(r);
    j.translate(Math.sin(r) * (lado / 2 + 0.02), a * 0.7, Math.cos(r) * (lado / 2 + 0.02));
    kit.geometria(j, m.janelaApagada);
  }
  kit.montar(g, 'Torre');
  g.position.set(x, 0, z);
  mundo.grupo.add(g);
  if (colide) mundo.colisores.adicionar(x, z, lado, lado);
  return g;
}

/**
 * CATEDRAL GÓTICA. Frente = sul (+Z). (x, z) = centro da nave.
 * Partes: nave comprida, transepto (o "braço" da cruz), abside (fundo arredondado),
 * duas torres com agulhas na fachada, portal com rosácea, contrafortes com pináculos,
 * vitrais e uma agulha central. O portal dá acesso ao mapa interno da catedral.
 */
export function igreja(mundo, { x, z }) {
  const m = materiais();
  const g = new THREE.Group();
  const add = (o, px, py, pz) => { o.position.set(px, py, pz); g.add(o); return o; };
  const colide = (cx, cz, l, p, topo) => mundo.colisores.adicionar(x + cx, z + cz, l, p, topo);
  const cruz = (px, py, pz) => {
    add(caixa(0.16, 2.4, 0.16, m.metal, 1), px, py + 1.2, pz);
    add(caixa(1.1, 0.16, 0.16, m.metal, 1), px, py + 1.6, pz);
  };
  // Janela em ponta (ogiva): um retângulo de vitral + um losango em cima.
  const ogiva = (px, py, pz, larg, alt, lateral, mat = m.vitral) => {
    const corpo = caixa(lateral ? 0.14 : larg, alt, lateral ? larg : 0.14, mat, larg);
    add(corpo, px, py, pz);
    const ponta = caixa(lateral ? 0.14 : larg * 0.7071, larg * 0.7071, lateral ? larg * 0.7071 : 0.14, mat, larg);
    ponta.rotation[lateral ? 'x' : 'z'] = Math.PI / 4;
    add(ponta, px, py + alt / 2, pz);
  };

  // ---------- nave ----------
  const L = 16, A = 14, P = 34;
  add(caixa(L, A, P, m.pedra), 0, A / 2, 0);
  add(telhado(L + 1, 8, P + 0.6, m.telhado, m.pedraEscura), 0, A, 0);
  add(caixa(L + 0.5, 0.5, P + 0.3, m.pedraEscura), 0, A - 0.1, 0);           // cornija
  add(caixa(L + 0.4, 1.0, P + 0.2, m.pedraEscura), 0, 0.5, 0);               // rodapé
  colide(0, 0, L, P);

  // ---------- transepto (braço da cruz) ----------
  const TZ = -5, TL = 30, TP = 9;
  add(caixa(TL, A, TP, m.pedra), 0, A / 2, TZ);
  const tetoT = telhado(TP + 1, 7, TL + 0.6, m.telhado, m.pedraEscura); tetoT.rotation.y = Math.PI / 2; add(tetoT, 0, A, TZ);
  colide(0, TZ, TL, TP);
  for (const lado of [-1, 1]) {
    ogiva(lado * (TL / 2 + 0.04), 7, TZ, 2.4, 6, true);                      // vitral grande na ponta do braço
    const rosa = new THREE.Mesh(new THREE.CircleGeometry(1.5, 8), m.vitral);
    rosa.rotation.y = lado * Math.PI / 2; add(rosa, lado * (TL / 2 + 0.06), 16.2, TZ);
    for (const cz of [-1, 1]) {                                              // torrinhas nos cantos
      add(caixa(1.8, A + 3, 1.8, m.pedraEscura), lado * (TL / 2 - 0.3), (A + 3) / 2, TZ + cz * (TP / 2 - 0.2));
      add(piramide(2.2, 6, m.telhado), lado * (TL / 2 - 0.3), A + 6, TZ + cz * (TP / 2 - 0.2));
    }
  }
  // agulha central, sobre o cruzamento
  add(caixa(2.6, 4, 2.6, m.pedraEscura), 0, A + 8, TZ);
  add(piramide(3.2, 22, m.telhado), 0, A + 21, TZ);
  cruz(0, A + 31.5, TZ);

  // ---------- abside (fundo arredondado) ----------
  const abside = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 12, 8), m.pedra);
  add(abside, 0, 6, -P / 2);
  add(new THREE.Mesh(new THREE.ConeGeometry(7, 7, 8), m.telhado), 0, 15.5, -P / 2);
  colide(0, -P / 2 - 3, 13, 7);
  abside.rotation.y = Math.PI / 8;                                          // deixa uma face virada para o norte
  ogiva(0, 6, -P / 2 - 6.05, 1.3, 4.5, false);

  // ---------- contrafortes e vitrais das laterais ----------
  const zsContraforte = [15.5, 10.5, 5.5, 1, -11, -15.5];
  const zsVitral = [13, 8, 3.2, -13.2];
  for (const lado of [-1, 1]) {
    for (const cz of zsContraforte) {
      const cx = lado * (L / 2 + 1.1);
      add(caixa(2.2, 10.5, 1.3, m.pedraEscura), cx, 5.25, cz);
      add(caixa(1.4, 3, 1.1, m.pedraEscura), lado * (L / 2 + 0.7), 12, cz);
      add(piramide(1.5, 3.2, m.telhado), cx + lado * 0.2, 12.1, cz);
      colide(cx, cz, 2.2, 1.3);
    }
    for (const cz of zsVitral) ogiva(lado * (L / 2 + 0.05), 7.2, cz, 1.7, 6.5, true);
  }

  // ---------- fachada: duas torres + corpo central ----------
  const FL = 7.5, FA = 31, fz = P / 2 + 3.5, frente = fz + FL / 2;          // frente = z da face da fachada
  for (const lado of [-1, 1]) {
    const tx = lado * 6.4;
    add(caixa(FL, FA, FL, m.pedra), tx, FA / 2, fz);
    for (const fy of [10.5, 20.5]) add(caixa(FL + 0.5, 0.5, FL + 0.5, m.pedraEscura), tx, fy, fz);   // faixas
    add(caixa(FL + 0.9, 0.9, FL + 0.9, m.pedraEscura), tx, FA, fz);
    add(piramide(FL + 0.4, 23, m.telhado), tx, FA + 0.4 + 11.5, fz);          // agulha
    cruz(tx, FA + 23, fz);
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {            // pináculos
      add(caixa(0.9, 2.2, 0.9, m.pedraEscura), tx + px * (FL / 2 - 0.2), FA + 1.5, fz + pz * (FL / 2 - 0.2));
      add(piramide(1.3, 4.5, m.telhado), tx + px * (FL / 2 - 0.2), FA + 4.8, fz + pz * (FL / 2 - 0.2));
    }
    // sineiras (aberturas escuras no alto) e janelas estreitas
    ogiva(tx, 25.5, frente + 0.03, 1.5, 5, false, m.janelaApagada);
    ogiva(tx + lado * (FL / 2 + 0.03), 25.5, fz, 1.5, 5, true, m.janelaApagada);
    ogiva(tx, 15.2, frente + 0.03, 1.0, 4, false);
    ogiva(tx, 5.5, frente + 0.03, 1.0, 3.6, false, m.janelaApagada);
    colide(tx, fz, FL, FL);
  }
  // corpo central entre as torres, com empena
  add(caixa(5.4, 19, 6, m.pedra), 0, 9.5, fz - 0.5);
  add(telhado(5.6, 5, 6.2, m.telhado, m.pedra), 0, 19, fz - 0.5);
  cruz(0, 24, fz + 2.4);
  colide(0, fz - 0.5, 5.4, 6);
  const fc = fz + 2.5;                                                       // face do corpo central
  const rosacea = new THREE.Mesh(new THREE.CircleGeometry(2.1, 10), m.vitral); add(rosacea, 0, 13.6, fc + 0.06);
  const aro = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.5, 10), m.pedraEscura); add(aro, 0, 13.6, fc + 0.07);
  // Nervuras à frente do vidro, fundidas numa única peça.
  const anel = new THREE.RingGeometry(0.36, 0.46, 10);
  const nervuras = [anel.toNonIndexed()];
  anel.dispose();
  for (let i = 0; i < 10; i++) {
    const { geometry } = caixa(0.11, 1.68, 0.09, m.pedraEscura, 1);
    const raio = geometry.toNonIndexed();
    geometry.dispose();
    raio.translate(0, 1.23, 0).rotateZ(i * Math.PI / 5);
    nervuras.push(raio);
  }
  add(new THREE.Mesh(mergeGeometries(nervuras), m.pedraEscura), 0, 13.6, fc + 0.15);
  for (const geo of nervuras) geo.dispose();

  // ---------- portal ----------
  const base = 0.75;                                                         // altura do patamar da escada
  for (const lado of [-1, 1]) {
    add(colunaFacetada(4.6, 0.36, m.pedra, m.pedraEscura), lado * 2.06, base, fc + 0.39);
    add(caixa(1.7, 4.3, 0.2, m.madeira, 1.4), lado * 0.87, base + 2.15, fc + 0.12);
  }
  add(arcoOgival(3.8, 2.7, 0.46, 0.63, m.pedraEscura), 0, base + 4.6, fc + 0.42);
  add(arcoOgival(4.7, 3.2, 0.22, 0.55, m.pedra), 0, base + 4.6, fc + 0.33);
  add(caixa(0.12, 4.3, 0.24, m.metal, 1), 0, base + 2.15, fc + 0.13);
  // Uma luz verde marca a entrada da catedral.
  const fresta = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.1, 0.06), retro(new THREE.MeshBasicMaterial({ color: CONFIG.paleta.magia })));
  add(fresta, 0, base + 0.06, fc + 0.24);
  const luzPorta = new THREE.PointLight(CONFIG.paleta.magia, 5, 9, 1.8); add(luzPorta, 0, base + 0.5, fc + 1.3);

  // ---------- patamar e escadaria ----------
  add(caixa(5.3, base, 1.6, m.calcamento, 1.6), 0, base / 2, fc + 0.7);
  colide(0, fc + 0.7, 5.3, 1.6, base);
  for (let i = 0; i < 3; i++) {
    const larg = 15 - i * 1.6, prof = 4.4 - i * 1.1, alt = 0.25 * (i + 1);
    add(caixa(larg, alt, prof, m.calcamento, 1.6), 0, alt / 2, frente + prof / 2 - 0.2);
    colide(0, frente + prof / 2 - 0.2, larg, prof, alt);
  }

  g.position.set(x, 0, z);
  mundo.grupo.add(g);
  return { grupo: g, porta: { x, z: z + frente + 0.6 }, luzPorta };
}

/** Tocha num poste: madeira + chama + luz laranja que tremula. */
export function tocha(mundo, { x, z, altura = 2.3, luz = true }) {
  const m = materiais();
  const g = new THREE.Group();
  const poste = caixa(0.14, altura, 0.14, m.madeira, 1); poste.position.y = altura / 2; g.add(poste);
  const copo = caixa(0.3, 0.2, 0.3, m.metal, 1); copo.position.y = altura; g.add(copo);
  modeloPronto(g, 'torch', { pos: [0, altura * 0.62, 0], tamanho: [0.29, altura * 0.43, 0.29], reserva: [copo] });
  const chama = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 4), m.chama);
  chama.position.y = altura + 0.35; g.add(chama);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texturas().brilho, color: CONFIG.paleta.fogo, blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.7,
  }));
  halo.position.y = altura + 0.35; halo.scale.setScalar(1.8); g.add(halo);
  let ponto = null;
  if (luz) {
    ponto = new THREE.PointLight(CONFIG.paleta.fogo, 22, 17, 1.7);
    ponto.position.y = altura + 0.5; g.add(ponto);
  }
  g.position.set(x, 0, z);
  mundo.grupo.add(g);
  mundo.colisores.adicionar(x, z, 0.3, 0.3);
  mundo.tochas.push({ chama, halo, luz: ponto, fase: Math.random() * 100, base: ponto ? ponto.intensity : 0 });
  return g;
}

export function animarTochas(tochas, tempo) {
  for (const t of tochas) {
    const f = 0.82 + 0.12 * Math.sin(tempo * 11 + t.fase) + 0.1 * Math.sin(tempo * 23.7 + t.fase * 1.7);
    if (t.luz) t.luz.intensity = t.base * f;
    t.chama.scale.set(1, 0.8 + f * 0.4, 1);
    t.chama.rotation.y = tempo * 6 + t.fase;
    t.halo.scale.setScalar(1.5 + f * 0.5);
  }
}

/** Árvore seca e torta. */
export function arvoreSeca(mundo, { x, z, altura = 6, sorteio = Math.random, colide = true }) {
  const m = materiais();
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.34, altura, 5), m.tronco);
  tronco.position.y = altura / 2; tronco.rotation.z = (sorteio() - 0.5) * 0.25; g.add(tronco);
  const galhos = 4 + Math.floor(sorteio() * 3);
  for (let i = 0; i < galhos; i++) {
    const c = 1.4 + sorteio() * 2.2;
    const galho = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.1, c, 4), m.tronco);
    const ang = sorteio() * Math.PI * 2, incl = 0.6 + sorteio() * 0.7;
    galho.position.set(Math.cos(ang) * c * 0.4 * Math.sin(incl), altura * (0.55 + sorteio() * 0.42), Math.sin(ang) * c * 0.4 * Math.sin(incl));
    galho.rotation.set(Math.sin(ang) * incl, 0, -Math.cos(ang) * incl);
    g.add(galho);
  }
  g.position.set(x, 0, z);
  modeloPronto(g, x < 0 ? 'CommonTree_Dead_1' : 'CommonTree_Dead_3', {
    tamanho: [altura * 0.63, altura, altura * 0.61],
    rotacao: (x + z) * 0.13, reserva: [...g.children],
  });
  mundo.grupo.add(g);
  if (colide) mundo.colisores.adicionar(x, z, 0.6, 0.6);
  return g;
}

/** Trecho reto de muralha entre dois pontos (alinhado aos eixos). */
export function muralha(mundo, x1, z1, x2, z2, altura = 5, espessura = 1.4) {
  const m = materiais();
  const l = Math.abs(x2 - x1) + espessura, p = Math.abs(z2 - z1) + espessura;
  const muro = caixa(l, altura, p, m.pedraEscura); muro.position.set((x1 + x2) / 2, altura / 2, (z1 + z2) / 2);
  const topo = caixa(l + 0.4, 0.4, p + 0.4, m.pedra); topo.position.set((x1 + x2) / 2, altura + 0.2, (z1 + z2) / 2);
  mundo.grupo.add(muro, topo);
  mundo.colisores.adicionar((x1 + x2) / 2, (z1 + z2) / 2, l, p);
}
