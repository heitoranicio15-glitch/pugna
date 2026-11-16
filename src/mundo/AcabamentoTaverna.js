import * as THREE from 'three';
import { juntarPorMaterial, materiais, caixa } from './pecas.js';
import { texturas, criarSorteio } from '../render/texturas.js';
import { retro } from '../render/retro.js';
import { CONFIG } from '../config.js';
import { manchaDeLuz } from './AcabamentoPortao.js';

// Acabamento da fachada da Taverna, da porta e do trecho de estrada até ela, e da
// porta vista de dentro. A luz sai de fontes que já existem no cenário: as duas
// lanternas do alpendre, as janelas acesas e as frestas da porta (a lareira lá dentro).
// Só visual: nenhum colisor novo. Tudo em coordenadas locais da fachada
// (local +z = rumo à estrada, local x = -z do mundo).

let matFresta = null;   // luz que vaza entre as tábuas da porta
let matHalo = null;     // brilho das lanternas (um material para as duas)

/** Caixa inclinada no plano x-y da fachada, indo de (x1, y1) a (x2, y2). */
function diagonal(kit, x1, y1, x2, y2, larg, prof, z, material) {
  const dx = x2 - x1, dy = y2 - y1;
  const { geometry } = caixa(larg, Math.hypot(dx, dy), prof, material);
  geometry.rotateZ(Math.atan2(-dx, dy));
  geometry.translate((x1 + x2) / 2, (y1 + y2) / 2, z);
  kit.geometria(geometry, material);
}

/** Diagonal no plano y-z (o braço do letreiro e as mãos-francesas do alpendre). */
function escora(kit, y1, z1, y2, z2, x, larg, esp, material) {
  const dy = y2 - y1, dz = z2 - z1;
  const { geometry } = caixa(esp, Math.hypot(dy, dz), larg, material, material === materiais().metal ? 1 : undefined);
  geometry.rotateX(Math.atan2(dz, dy));
  geometry.translate(x, (y1 + y2) / 2, (z1 + z2) / 2);
  kit.geometria(geometry, material);
}

/** Fachada: porta, entramado de madeira, venezianas, lanternas, soleira e calçada até a pista. */
export function acabarFachadaTaverna(estrada, fachada, T) {
  const m = materiais(), K = CONFIG.arte.casa, J = K.janela;
  const f = T.profundidade / 2;   // z local do plano da fachada
  const k = juntarPorMaterial();

  // --- Porta: frestas acesas entre as tábuas, rebites nas cintas, dobradiças e puxador.
  matFresta ??= retro(new THREE.MeshBasicMaterial({ color: 0xb8742e }));
  for (const x of [-0.2, 0.2]) k.caixa(x, 1.2, f + 0.125, 0.03, 1.9, 0.04, matFresta);
  for (const y of [0.6, 1.6]) {
    for (const x of [-0.42, -0.21, 0, 0.21, 0.42]) k.caixa(x, y, f + 0.17, 0.05, 0.05, 0.03, m.metal, 0, 1);
  }
  for (const y of [0.6, 1.6]) k.caixa(-0.5, y, f + 0.16, 0.1, 0.16, 0.06, m.metal, 0, 1);   // olhais das dobradiças
  k.caixa(0.4, 1.1, f + 0.16, 0.07, 0.24, 0.06, m.metal, 0, 1);                              // placa do puxador
  k.caixa(0.4, 1.1, f + 0.205, 0.04, 0.16, 0.03, m.metal, 0, 1);

  // --- Soleira: segundo degrau baixo e gasto, que passa por baixo do degrau existente.
  k.caixa(0, 0.02, f + 1.1, 2.8, 0.04, 0.6, m.pedraEscura);

  // --- Mísulas sob o alpendre e braços de ferro para as lanternas.
  for (const lado of [-1, 1]) {
    k.caixa(lado * 1.25, 2.82, f + 0.6, 0.12, 0.14, 1.1, m.madeiraEscura);               // viga sob o alpendre
    escora(k, 2.1, f + 0.02, 2.78, f + 0.8, lado * 1.25, 0.1, 0.12, m.madeiraEscura);   // mísula
    k.caixa(lado * 0.95, 2.6, f + 0.4, 0.05, 0.05, 0.7, m.metal, 0, 1);   // braço
    k.caixa(lado * 0.95, 2.47, f + 0.68, 0.02, 0.25, 0.02, m.metal, 0, 1);  // corrente
    // Gaiola da lanterna: base, quatro montantes e capa. O miolo aceso é a chama (malha à parte).
    const lz = f + 0.68;
    k.caixa(lado * 0.95, 2.0, lz, 0.2, 0.04, 0.2, m.metal, 0, 1);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.caixa(lado * 0.95 + dx * 0.09, 2.17, lz + dz * 0.09, 0.025, 0.3, 0.025, m.metal, 0, 1);
    k.caixa(lado * 0.95, 2.35, lz, 0.26, 0.05, 0.26, m.metal, 0, 1);
  }

  // --- Entramado de madeira no sobrado (entre a viga e o frechal), simétrico em torno da porta.
  for (const lado of [-1, 1]) {
    for (const x of [1.5, 3.0]) k.caixa(lado * x, 4.45, f + 0.05, 0.14, 2.7, 0.1, m.madeiraEscura);
    diagonal(k, lado * 1.5, 3.1, lado * 3.0, 5.8, 0.1, 0.08, f + 0.04, m.madeiraEscura);
    // Venezianas ao lado de cada janela da frente, térreo e sobrado, com dobradiças de ferro.
    const jx = lado * (T.largura / 2 - 1.5);
    for (const y of [1.65, K.peDireito + 1.25]) {
      for (const s of [-1, 1]) {
        const cx = jx + s * (J.largura / 2 + 0.43);
        k.caixa(cx, y, f + 0.03, 0.45, J.altura, 0.06, m.madeira);
        k.caixa(cx, y, f + 0.075, 0.04, J.altura - 0.1, 0.03, m.madeiraEscura);   // fresta central
        for (const dy of [-0.38, 0.38]) k.caixa(cx - s * 0.02, y + dy, f + 0.085, 0.4, 0.06, 0.03, m.metal, 0, 1);
      }
    }
  }

  // --- Letreiro: braço de ferro que sustenta a viga de madeira.
  escora(k, 3.3, f, 3.9, f + 0.6, 3.4, 0.08, 0.1, m.metal);

  // --- Calçada de lajes irregulares da soleira até a pista, abrindo como um leque.
  const rnd = criarSorteio(7733);
  for (let zz = f + 1.4; zz < f + 3.2; zz += 0.8) {
    const meia = 1.15 + 0.45 * (zz - f - 1.4) / 1.8;
    let x = -meia;
    while (x < meia - 0.05) {
      let l = 0.6 + rnd() * 0.5;
      if (meia - x - l < 0.45) l = meia - x;
      const p = 0.65 + rnd() * 0.15;
      k.caixa(x + l / 2, 0.035, zz + p / 2 + (rnd() - 0.5) * 0.06, l - 0.07, 0.03, p - 0.07,
        rnd() < 0.3 ? m.pedraMusgo : m.lajes, (rnd() - 0.5) * 0.05);
      x += l;
    }
  }
  k.montar(fachada, 'Acabamento da fachada');

  // --- Fogo das lanternas (tremula com as outras tochas) e brilho visível de longe.
  matHalo ??= new THREE.SpriteMaterial({
    map: texturas().brilho, color: CONFIG.paleta.fogo, blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.6, fog: false,
  });
  for (const [i, lado] of [-1, 1].entries()) {
    const chama = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), m.chama);
    chama.position.set(lado * 0.95, 2.15, f + 0.68);
    fachada.add(chama);
    const halo = new THREE.Sprite(matHalo);
    halo.position.copy(chama.position);
    halo.scale.setScalar(1.8);
    fachada.add(halo);
    estrada.tochas.push({ chama, halo, luz: null, fase: 2.1 + i * 1.9, base: 0 });
    // Mancha de luz no chão, sob cada lanterna.
    const mancha = manchaDeLuz(1.9);
    mancha.position.set(lado * 0.95, 0.225, f + 1.5);
    fachada.add(mancha);
  }
  // Calor das janelas do térreo sobre a calçada e a terra.
  for (const lado of [-1, 1]) {
    const mancha = manchaDeLuz(1.8);
    mancha.position.set(lado * (T.largura / 2 - 1.5), 0.225, f + 1.5);
    fachada.add(mancha);
  }
}

/** Porta da taverna vista de dentro: cintas e rebites de ferro e soleira de pedra. Só visual. */
export function acabarPortaInterna(taverna, maxZ) {
  const m = materiais();
  const k = juntarPorMaterial();
  const zi = maxZ - 0.085;   // por dentro, a porta (maxZ + 0.02, 0.18) termina em maxZ - 0.07
  for (const y of [0.6, 1.6]) {
    k.caixa(0, y, zi, 1.64, 0.1, 0.03, m.metal, 0, 1);
    for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) k.caixa(x, y, zi - 0.025, 0.06, 0.06, 0.03, m.metal, 0, 1);
  }
  k.caixa(-0.8, 1.1, zi - 0.015, 0.18, 0.3, 0.06, m.metal, 0, 1);   // olhais das dobradiças
  k.caixa(0.62, 1.1, zi - 0.005, 0.12, 0.3, 0.04, m.metal, 0, 1);   // ferrolho
  k.caixa(0, 0.03, maxZ - 0.3, 2.0, 0.06, 0.5, m.pedraEscura);   // soleira gasta
  k.montar(taverna.grupo, 'Acabamento da porta');
}
