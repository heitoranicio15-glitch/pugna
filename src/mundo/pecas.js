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
    // Chão e ruas não gravam profundidade: são desenhados primeiro e tudo o mais fica por
    // cima. Isso evita o "pisca-pisca" entre a grama e o calçamento (veja Vilarejo.js).
    calcamentoChao: lambert(t.calcamento, { depthWrite: false }),
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

  // ---------- portal ----------
  const base = 0.75;                                                         // altura do patamar da escada
  add(caixa(0.7, 6.4, 0.9, m.pedraEscura), -2.1, base + 3.2, fc + 0.3);      // colunas
  add(caixa(0.7, 6.4, 0.9, m.pedraEscura), 2.1, base + 3.2, fc + 0.3);
  add(telhado(5.4, 3.2, 1.0, m.pedraEscura, m.pedraEscura), 0, base + 6.4, fc + 0.3); // frontão em ponta
  for (const lado of [-1, 1]) add(caixa(1.7, 5.6, 0.2, m.madeira, 1.4), lado * 0.87, base + 2.8, fc + 0.12); // duas folhas
  add(caixa(0.12, 5.6, 0.24, m.metal, 1), 0, base + 2.8, fc + 0.13);         // fresta entre as folhas
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
