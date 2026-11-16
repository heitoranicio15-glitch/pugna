import * as THREE from 'three';
import { juntarPorMaterial, materiais } from './pecas.js';
import { criarSorteio } from '../render/texturas.js';
import { manchaDeLuz } from './AcabamentoPortao.js';

// Acabamento da praça do poço, no mesmo padrão do Portão Sul: lajes com junta e
// desgaste, o poço com forma própria (bordas de pedra, sarilho, balde e ferragens),
// luz que sai das tochas que já existem e quatro rotas ligadas ao cruzamento.
// Só visual: nenhum colisor novo. O poço fica em (0, 0); a rua do sul leva ao portão.

/** Faixa de lajes de (ax,az) a (bx,bz), com a largura indo de w0 a w1. Mesma altura da rota do portão. */
function faixa(p, m, rnd, [ax, az], [bx, bz], w0, w1) {
  const comp = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / comp, dz = (bz - az) / comp;
  const horizontal = Math.abs(dx) > Math.abs(dz);
  for (let s = 0; s < comp - 0.3; s += 0.95) {
    const meia = (w0 + (w1 - w0) * (s / comp)) / 2;
    const fundo = Math.min(0.75 + rnd() * 0.2, comp - s);
    let u = -meia;
    while (u < meia - 0.05) {
      let l = 0.7 + rnd() * 0.6;
      if (meia - u - l < 0.5) l = meia - u; // fecha a fileira dos dois lados por igual
      const c = u + l / 2, a = s + fundo / 2 + (rnd() - 0.5) * 0.02;
      const x = ax + dx * a - dz * c, z = az + dz * a + dx * c;
      const material = rnd() < 0.3 ? m.pedraMusgo : m.lajes;
      if (horizontal) p.caixa(x, 0.025, z, fundo - 0.07, 0.05, l - 0.07, material, (rnd() - 0.5) * 0.01);
      else p.caixa(x, 0.025, z, l - 0.07, 0.05, fundo - 0.07, material, (rnd() - 0.5) * 0.01);
      u += l;
    }
  }
}

/** Detalha o chão, as rotas e o poço. Devolve as peças do poço (reserva do modelo Well). */
export function acabarPracaDoPoco(vila) {
  const m = materiais(), g = vila.grupo;
  const rnd = criarSorteio(7340);
  const p = juntarPorMaterial();

  // Pavimento em anéis em volta do poço: lajes de pedra gasta, mais musgo junto à base
  // (onde a água pinga) e mais falhas na borda, que se desfaz na terra.
  for (const [raio, fundo, falha, musgo] of [[1.85, 0.85, 0, 0.45], [2.7, 0.85, 0.05, 0.25], [3.55, 0.8, 0.3, 0.1]]) {
    const n = Math.round((2 * Math.PI * raio) / 0.95);
    for (let i = 0; i < n; i++) {
      if (rnd() < falha) continue;
      const fi = ((i + (raio > 3 ? 0.5 : 0)) / n) * Math.PI * 2;
      const sorte = rnd();
      // Cada laje larga o bastante para fechar o anel, com 7 cm de junta.
      const larg = 2 * (raio - fundo / 2) * Math.sin(Math.PI / n) - 0.07;
      const material = sorte < musgo ? m.pedraMusgo : sorte > 0.85 ? m.pedraEscura : m.lajes;
      p.caixa(Math.cos(fi) * raio, 0.035, Math.sin(fi) * raio, larg, 0.07, fundo - 0.07, material, -fi - Math.PI / 2);
    }
  }

  // Rotas: sul (até o arco da triagem e a faixa do portão), norte (adro), oeste e leste (mercado).
  // A do sul contorna o muro da triagem pelo arco, como a rua do bairro, e fecha em 2,1 m na faixa do portão.
  faixa(p, m, rnd, [0, 4.7], [0, 31.85], 3.6, 2.4);
  faixa(p, m, rnd, [-1.2, 32.5], [6.64, 32.5], 1.1, 1.1);   // vira para o arco, depois dos caixotes
  faixa(p, m, rnd, [5.54, 33.2], [5.54, 41.2], 2.2, 2.2);     // passa pelo arco (vão de 4,15 a 6,92)
  faixa(p, m, rnd, [6.64, 42.3], [1.2, 42.3], 1.6, 1.6);    // volta ao eixo e encontra a faixa do portão
  faixa(p, m, rnd, [0, -4.7], [0, -14], 3, 2.4);
  faixa(p, m, rnd, [-4.7, 1.2], [-14, 1.2], 2.6, 2.2);
  faixa(p, m, rnd, [4.7, 3], [14, 3], 2.6, 2.2);
  // Pedras-guia escuras onde cada rota entra no anel externo: marcam o cruzamento.
  for (const [x, z, ry] of [[0, 4.35, 0], [0, -4.35, 0], [-4.35, 1.2, Math.PI / 2], [4.35, 3, Math.PI / 2]]) {
    p.caixa(x, 0.04, z, 1.5, 0.08, 0.5, m.pedraEscura, ry);
  }

  // As peças do poço ficam num grupo à parte: são a reserva do modelo Well.
  const poco = new THREE.Group();
  const q = juntarPorMaterial();
  // Borda do poço: oito blocos de pedra sobre o tampo (a base é um octógono de 1,3 m),
  // com junta entre eles, e o vão escuro da água dentro, 3 cm acima do tampo.
  for (let i = 0; i < 8; i++) {
    const fi = (22.5 + i * 45) * Math.PI / 180;
    q.caixa(Math.sin(fi) * 1.05, 0.94, Math.cos(fi) * 1.05, 0.76, 0.08, 0.24, i % 3 === 0 ? m.pedraMusgo : m.pedra, fi);
  }
  const agua = new THREE.Mesh(new THREE.CircleGeometry(0.95, 8), aguaEscura());
  agua.rotation.x = -Math.PI / 2; agua.position.y = 0.93;
  poco.add(agua);

  // Sarilho de madeira entre os dois postes, com tambor, corda e o balde pendurado sobre o poço.
  const viga = new THREE.CylinderGeometry(0.1, 0.1, 2.9, 8); viga.rotateZ(Math.PI / 2); viga.translate(0, 2.3, 0);
  q.geometria(viga, m.madeiraEscura);
  const tambor = new THREE.CylinderGeometry(0.17, 0.17, 0.55, 8); tambor.rotateZ(Math.PI / 2); tambor.translate(0, 2.3, 0);
  q.geometria(tambor, m.madeira);
  q.caixa(0, 1.8, 0, 0.04, 0.68, 0.04, m.madeiraEscura);  // corda
  const balde = new THREE.CylinderGeometry(0.2, 0.16, 0.3, 8); balde.translate(0, 1.28, 0);
  q.geometria(balde, m.madeira);
  for (const [y, r] of [[1.2, 0.19], [1.37, 0.21]]) {
    const aro = new THREE.CylinderGeometry(r, r - 0.012, 0.04, 8, 1, true); aro.translate(0, y, 0);
    q.geometria(aro, m.metal);
  }
  q.caixa(0, 1.46, 0, 0.42, 0.03, 0.03, m.metal);          // alça do balde
  // Ferro: cintas onde a viga atravessa os postes e a manivela no lado leste.
  for (const lado of [-1, 1]) q.caixa(lado * 1.3, 2.3, 0, 0.04, 0.24, 0.24, m.metal);
  q.caixa(1.48, 2.1, 0, 0.06, 0.46, 0.06, m.metal);
  q.caixa(1.68, 1.9, 0, 0.36, 0.06, 0.06, m.metal);
  q.montar(poco, 'Poço detalhado');
  g.add(poco);

  p.montar(g, 'Acabamento da praça do poço');

  // Luz: manchas de chama no chão, junto das quatro tochas da praça (luzes que já existem).
  for (const [x, z] of [[10.5, 10.5], [10.5, -10.5], [-10.5, 10.5], [-10.5, -10.5]]) {
    const mancha = manchaDeLuz(3.6);
    mancha.position.set(x - Math.sign(x) * 1.1, 0.1, z - Math.sign(z) * 1.1);
    g.add(mancha);
  }
  return poco;
}

// Água do poço: um único material para todos os poços.
let matAgua = null;
function aguaEscura() {
  matAgua ??= new THREE.MeshBasicMaterial({ color: 0x06142e });
  return matAgua;
}
