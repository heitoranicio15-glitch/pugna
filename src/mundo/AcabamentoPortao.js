import * as THREE from 'three';
import { juntarPorMaterial, materiais } from './pecas.js';
import { texturas, criarSorteio } from '../render/texturas.js';
import { CONFIG } from '../config.js';

// Acabamento do Portão Sul e da rota até ele, no padrão da nave da Catedral:
// materiais com junta e desgaste próprios, luz que sai de fontes do cenário
// (a tocha da rua e o braseiro do vigia) e um ponto de interesse legível (o selo).

// Mancha de luz no chão, aditiva e sem gravar profundidade (parece a luz da chama).
let matLuz = null;
function manchaDeLuz(raio) {
  matLuz ??= new THREE.MeshBasicMaterial({
    map: texturas().brilho, color: CONFIG.paleta.fogo, blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.38,
  });
  const mat = matLuz;
  const malha = new THREE.Mesh(new THREE.PlaneGeometry(raio * 2, raio * 2), mat);
  malha.rotation.x = -Math.PI / 2;
  malha.renderOrder = -3;
  return malha;
}

/** Detalha as folhas, o selo, o braseiro e a faixa de lajes da rota. Só visual: sem colisores novos. */
export function acabarPortaoSul(vila, z, { folhas, selo, vigilia, bronze }) {
  const m = materiais(), g = vila.grupo;

  // Folhas: tábuas verticais com frestas, rebites nas cintas e dobradiças pesadas.
  // Tudo preso à face norte (a que o jogador vê) das folhas existentes.
  for (const [folha, lado] of folhas) {
    const p = juntarPorMaterial();
    const cx = -lado * 2;
    for (const dx of [-1.5, -0.5, 0.5, 1.5]) p.caixa(cx + dx, 2.42, -0.128, 0.05, 4.7, 0.03, m.madeira);
    for (const y of [0.9, 2.35, 3.82]) {
      for (const dx of [-1.7, -0.9, -0.1, 0.7, 1.5]) p.caixa(cx + dx, y, -0.222, 0.1, 0.1, 0.05, bronze);
    }
    // Dobradiça junto ao pilar: tira de ferro mais larga, com o olhal no eixo.
    for (const y of [0.9, 3.82]) {
      p.caixa(-lado * 0.25, y, -0.2, 0.5, 0.2, 0.06, m.metal);
      p.caixa(-lado * 0.04, y, -0.2, 0.11, 0.27, 0.11, m.metal);
    }
    p.montar(folha, 'Detalhe da folha');
  }

  // Ao redor do selo: aro de bronze e um brilho frio, o único ponto de cor da porta.
  const aro = new THREE.Mesh(new THREE.RingGeometry(0.23, 0.31, 8), bronze);
  aro.position.z = 0.002;
  selo.add(aro);
  const brilho = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texturas().brilho, color: 0x9fe3b0, blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.45, fog: false,
  }));
  brilho.position.z = 0.06; brilho.scale.setScalar(1.25);
  selo.add(brilho); // some junto com o selo quando o portão abre

  // Braseiro do vigia: a chama agora repousa numa bacia de ferro sobre o pilar de pedra.
  const px = vigilia.position.x, pz = vigilia.position.z;
  const b = juntarPorMaterial();
  b.caixa(px, 1.72, pz, 0.46, 0.09, 0.46, m.metal);
  b.caixa(px, 2.0, pz, 0.5, 0.18, 0.5, m.metal);
  b.caixa(px, 2.1, pz, 0.38, 0.04, 0.38, m.pedraEscura);
  b.montar(g, 'Braseiro do portão');
  vigilia.position.y = 2.24;
  const luzDoBraseiro = manchaDeLuz(1.2);
  luzDoBraseiro.position.set(0, -2.24 + 0.13, 0);
  vigilia.add(luzDoBraseiro); // acende e apaga com a vigília
  const luzDaTocha = manchaDeLuz(4.2);
  luzDaTocha.position.set(3.7, 0.13, 48);
  g.add(luzDaTocha);

  // Rota: lajes irregulares com juntas, do fim da triagem até a soleira do portão.
  const rnd = criarSorteio(5521);
  const lajes = juntarPorMaterial();
  for (let zz = 41; zz < z - 2.1; zz += 0.95) {
    const afastamento = 1 - Math.min(1, (z - zz) / 14) * 0.45; // fecha à medida que se afasta do portão
    const fim = 1.9 * afastamento;
    let x = -fim;
    while (x < fim - 0.05) {
      let l = 0.7 + rnd() * 0.6;
      if (fim - x - l < 0.5) l = fim - x; // fecha a fileira no lado +x, como no -x
      const p = 0.7 + rnd() * 0.2;
      const gasta = rnd() < 0.3;
      lajes.caixa(x + l / 2, 0.035, zz + p / 2 + (rnd() - 0.5) * 0.08, l - 0.07, 0.03, p - 0.07,
        gasta ? m.pedraMusgo : m.lajes, (rnd() - 0.5) * 0.05);
      x += l;
    }
  }
  // Soleira: laje larga com friso de bronze e dois degraus baixos de borda gasta.
  lajes.caixa(0, 0.045, z - 1.5, 7.4, 0.09, 1.3, m.cantariaVeu);
  lajes.caixa(0, 0.095, z - 0.95, 7.8, 0.05, 0.15, m.pedraEscura);
  lajes.caixa(0, 0.1, z - 1.9, 5.6, 0.02, 0.09, bronze);
  for (const lado of [-1, 1]) lajes.caixa(lado * 3.6, 0.04, z - 2.45, 0.8, 0.08, 0.8, m.pedraMusgo, lado * 0.3);
  lajes.montar(g, 'Rota do portão');
}
