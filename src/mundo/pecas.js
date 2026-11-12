// =============================================================================
//  PEÇAS DE CONSTRUÇÃO
//  Funções que montam casas, torres, igreja, tochas e árvores a partir de formas
//  simples (caixas, pirâmides, cilindros). O Vilarejo.js decide ONDE colocar.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';

let M = null;
/** Materiais compartilhados (criados uma vez). */
export function materiais() {
  if (M) return M;
  const t = texturas();
  const lambert = (map, extra = {}) => retro(new THREE.MeshLambertMaterial({ map, ...extra }));
  const basico = (map, extra = {}) => retro(new THREE.MeshBasicMaterial({ map, ...extra }));
  M = {
    pedra: lambert(t.pedra),
    pedraEscura: lambert(t.pedra, { color: 0x9a94c8 }),
    calcamento: lambert(t.calcamento),
    telhado: lambert(t.telhado, { side: THREE.DoubleSide }),
    madeira: lambert(t.madeira),
    terra: lambert(t.terra),
    morro: lambert(t.terra, { color: 0x8890c0, flatShading: true }),
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

/** Telhado de duas águas (prisma triangular). A cumeeira corre no eixo Z. */
export function telhado(l, a, p, matTelha, matEmpena, ladrilho = 2) {
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
 * Casa de pedra. frente = para onde a porta aponta ('N','S','L','O').
 * l = largura da fachada, p = profundidade, a = altura das paredes.
 */
export function casa(mundo, { x, z, l = 7, p = 8, a = 5, frente = 'S', acesa = false, sorteio = Math.random }) {
  const m = materiais();
  const g = new THREE.Group();
  const corpo = caixa(l, a, p, m.pedra); corpo.position.y = a / 2; g.add(corpo);

  const altTelhado = 2.2 + sorteio() * 1.6;
  const teto = telhado(p + 0.7, altTelhado, l + 0.7, m.telhado, m.pedraEscura);
  teto.rotation.y = Math.PI / 2; teto.position.y = a; g.add(teto);

  const chamine = caixa(0.8, 1.8, 0.8, m.pedraEscura, 1.5);
  chamine.position.set((sorteio() - 0.5) * (l - 2), a + altTelhado * 0.55, (sorteio() - 0.5) * 2); g.add(chamine);

  const porta = caixa(1.15, 2.1, 0.16, m.madeira, 1.2);
  const xPorta = (sorteio() - 0.5) * (l - 3.2);
  porta.position.set(xPorta, 1.05, p / 2 + 0.03); g.add(porta);

  const janela = (jx, jy, jz, lateral) => {
    const luz = acesa && sorteio() < 0.6;
    const j = caixa(0.95, 1.15, 0.12, luz ? m.janelaAcesa : m.janelaApagada, 1);
    j.geometry.attributes.uv.array.fill(0); // refaz o UV para mostrar a janela inteira
    const uv = j.geometry.attributes.uv;
    for (let f = 0; f < 6; f++) { uv.setXY(f * 4, 0, 1); uv.setXY(f * 4 + 1, 1, 1); uv.setXY(f * 4 + 2, 0, 0); uv.setXY(f * 4 + 3, 1, 0); }
    j.position.set(jx, jy, jz);
    if (lateral) j.rotation.y = Math.PI / 2;
    g.add(j);
  };
  const doisAndares = a >= 5;
  for (const jx of [-l / 2 + 1.3, l / 2 - 1.3]) {
    if (Math.abs(jx - xPorta) > 1.3) janela(jx, 1.75, p / 2 + 0.02);
    if (doisAndares) janela(jx, a - 1.3, p / 2 + 0.02);
  }
  janela(-l / 2 - 0.02, doisAndares ? a - 1.4 : 1.75, 0.6, true);
  janela(l / 2 + 0.02, 1.75, -0.8, true);

  g.position.set(x, 0, z);
  g.rotation.y = ROTACAO[frente];
  mundo.grupo.add(g);
  const deLado = frente === 'L' || frente === 'O';
  mundo.colisores.adicionar(x, z, deLado ? p : l, deLado ? l : p);
  return g;
}

/** Torre quadrada. tipo: 'ameias' (topo de castelo) ou 'ponta' (telhado pontudo). */
export function torre(mundo, { x, z, lado = 5, a = 16, tipo = 'ameias', colide = true }) {
  const m = materiais();
  const g = new THREE.Group();
  const corpo = caixa(lado, a, lado, m.pedra); corpo.position.y = a / 2; g.add(corpo);
  const aba = caixa(lado + 0.8, 0.6, lado + 0.8, m.pedraEscura); aba.position.y = a; g.add(aba);
  if (tipo === 'ameias') {
    const n = Math.max(2, Math.round(lado / 1.6));
    for (let i = 0; i < n; i++) {
      const d = -lado / 2 + (i + 0.5) * (lado / n);
      for (const [ax, az] of [[d, lado / 2 + 0.1], [d, -lado / 2 - 0.1], [lado / 2 + 0.1, d], [-lado / 2 - 0.1, d]]) {
        const am = caixa(0.7, 0.9, 0.7, m.pedraEscura, 1.5); am.position.set(ax, a + 0.75, az); g.add(am);
      }
    }
  } else {
    const ponta = piramide(lado + 1, lado * 1.9, m.telhado); ponta.position.y = a + 0.3 + lado * 0.95; g.add(ponta);
  }
  for (const [jx, jz, r] of [[0, lado / 2 + 0.02, 0], [lado / 2 + 0.02, 0, Math.PI / 2]]) {
    const j = caixa(0.6, 1.5, 0.1, m.janelaApagada, 1.5); j.position.set(jx, a * 0.7, jz); j.rotation.y = r; g.add(j);
  }
  g.position.set(x, 0, z);
  mundo.grupo.add(g);
  if (colide) mundo.colisores.adicionar(x, z, lado, lado);
  return g;
}

/** Igreja gótica: nave, torre frontal com agulha, pináculos, vitrais e escadaria. Frente = sul (+Z). */
export function igreja(mundo, { x, z }) {
  const m = materiais();
  const g = new THREE.Group();
  const L = 11, A = 9, P = 20;           // nave
  const nave = caixa(L, A, P, m.pedra); nave.position.set(0, A / 2, 0); g.add(nave);
  const teto = telhado(L + 0.8, 6, P + 0.6, m.telhado, m.pedraEscura); teto.position.y = A; g.add(teto);

  // Torre da frente + agulha.
  const TL = 6, TA = 21, tz = P / 2 + TL / 2;
  const tor = caixa(TL, TA, TL, m.pedra); tor.position.set(0, TA / 2, tz); g.add(tor);
  const agulha = piramide(TL + 0.6, 17, m.telhado); agulha.position.set(0, TA + 8.5, tz); g.add(agulha);
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const pin = piramide(1.2, 4.5, m.telhado); pin.position.set(px * (TL / 2 - 0.3), TA + 2.2, tz + pz * (TL / 2 - 0.3)); g.add(pin);
  }
  // Torrinhas finas nos cantos da nave.
  for (const [cx, cz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const t = caixa(1.8, 13, 1.8, m.pedraEscura); t.position.set(cx * (L / 2 + 0.3), 6.5, cz * (P / 2 - 0.4)); g.add(t);
    const pt = piramide(2.2, 7, m.telhado); pt.position.set(cx * (L / 2 + 0.3), 16.5, cz * (P / 2 - 0.4)); g.add(pt);
  }
  // Porta, vitral da torre e vitrais laterais.
  const zf = tz + TL / 2;
  const porta = caixa(2.6, 3.8, 0.2, m.madeira, 1.3); porta.position.set(0, 0.75 + 1.9, zf + 0.03); g.add(porta);
  const rosacea = caixa(1.8, 3.4, 0.12, m.vitral, 1.7); rosacea.position.set(0, 9.5, zf + 0.03); g.add(rosacea);
  const sino = caixa(1.4, 2.4, 0.12, m.janelaApagada, 2); sino.position.set(0, 17, zf + 0.03); g.add(sino);
  for (let i = 0; i < 4; i++) {
    for (const lado of [-1, 1]) {
      const v = caixa(0.12, 4, 1.3, m.vitral, 1.3);
      v.position.set(lado * (L / 2 + 0.03), 4.6, -P / 2 + 3 + i * 4.6); g.add(v);
    }
  }
  // Escadaria.
  for (let i = 0; i < 3; i++) {
    const d = caixa(8 - i * 0.8, 0.25, 2.4 - i * 0.8, m.calcamento, 1.5);
    d.position.set(0, 0.125 + i * 0.25, zf + 1.2 - i * 0.4); g.add(d);
    mundo.colisores.adicionar(x, z + zf + 1.2 - i * 0.4, 8 - i * 0.8, 2.4 - i * 0.8, 0.25 * (i + 1));
  }
  g.position.set(x, 0, z);
  mundo.grupo.add(g);
  mundo.colisores.adicionar(x, z, L + 1.2, P);
  mundo.colisores.adicionar(x, z + tz, TL, TL);
  return { grupo: g, portaZ: z + zf };
}

/** Tocha num poste: madeira + chama + luz laranja que tremula. */
export function tocha(mundo, { x, z, altura = 2.3, luz = true }) {
  const m = materiais();
  const g = new THREE.Group();
  const poste = caixa(0.14, altura, 0.14, m.madeira, 1); poste.position.y = altura / 2; g.add(poste);
  const copo = caixa(0.3, 0.2, 0.3, m.metal, 1); copo.position.y = altura; g.add(copo);
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
