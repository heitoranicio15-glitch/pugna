import * as THREE from 'three';
import { bloco, placa } from './Aderecos.js';
import { abobadaOgival, arcoOgival, colunaFacetada, materiais, planoDeChao, tocha } from './pecas.js';

/** Ambulatório dos antigos cortejos, com entrada pela nave e pelo Ossário. */
export function montarClaustro(mundo) {
  const { grupo, colisores } = mundo;
  const m = materiais();
  planoDeChao(mundo, { x: -15, z: 5.4, l: 14, p: 6.8, ladrilho: 3.1, material: m.lajesChao });
  for (const [x, z, l, p] of [[-15, 8.75, 14, 0.55], [-22, 5.35, 0.55, 6.8]]) {
    bloco(grupo, m.pedra, x, 2.5, z, l, 5, p);
    colisores.adicionar(x, z, l, p);
  }

  // Abóbada longitudinal e arcadas, assentadas em pilares no flanco sul.
  const teto = abobadaOgival(7.05, 1.7, 14, m.pedraEscura);
  teto.rotation.y = Math.PI / 2;
  teto.position.set(-15, 3.2, 5.4);
  grupo.add(teto);
  for (const x of [-10.6, -14.9, -19.1]) {
    const arco = arcoOgival(5.9, 1.6, 0.23, 0.34, m.pedra);
    arco.position.set(x, 3.2, 5.4);
    arco.rotation.y = Math.PI / 2;
    grupo.add(arco);
    for (const z of [2.5, 8.25]) {
      if (z === 2.5 && x === -14.9) continue; // passagem do Ossário
      const coluna = colunaFacetada(3.2, 0.25, m.pedra, m.pedraEscura);
      coluna.position.set(x, 0, z);
      grupo.add(coluna);
      colisores.adicionar(x, z, 0.56, 0.56);
    }
  }
  for (const [x, z, rotacao] of [[-8.11, 5.65, Math.PI / 2], [-15, 2.02, 0]]) {
    const arco = arcoOgival(2.72, 0.94, 0.25, 0.64, m.pedraEscura);
    arco.position.set(x, 2.58, z);
    arco.rotation.y = rotacao;
    grupo.add(arco);
  }

  // Caixões aguardavam aqui antes de descer para os nichos.
  for (const x of [-17.15, -19.72]) {
    bloco(grupo, m.pedraEscura, x, 0.46, 7.6, 1.38, 0.92, 0.94);
    bloco(grupo, m.pedra, x, 0.98, 7.6, 1.48, 0.16, 1.01);
    bloco(grupo, m.metal, x, 1.071, 7.6, 0.7, 0.022, 0.045);
    bloco(grupo, m.metal, x + 0.11, 1.071, 7.6, 0.045, 0.022, 0.32);
    colisores.adicionar(x, 7.6, 1.38, 0.94, 1.06);
  }
  tocha(mundo, { x: -20.3, z: 3.7, altura: 1.8 });
  const luz = new THREE.PointLight(0x796ed4, 10, 8, 1.7);
  luz.position.set(-10.3, 2.8, 5.65);
  grupo.add(luz);
  placa(grupo, 'Galeria dos Nomes', -8.4, 3.72, 5.65, 1.75, Math.PI / 2);
  placa(grupo, 'Lista das devoluções', -12.1, 1.63, 8.44, 1.4, Math.PI);
  mundo.objetos.push({ x: -12.1, y: 1.63, z: 8.42, acao: 'ler', evento: 'catedral:lista-das-devolucoes' });
}
