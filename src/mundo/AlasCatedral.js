import { bloco, placa } from './Aderecos.js';
import { arcoOgival, colunaFacetada, materiais, planoDeChao, tocha } from './pecas.js';
import { modeloPronto } from '../render/modelos.js';

/** Capelas anexas, acessíveis pelas duas extremidades de cada ala. */
export function montarAlasCatedral(mundo) {
  const { grupo, colisores } = mundo;
  const m = materiais();
  for (const lado of [-1, 1]) {
    const x = lado * 28.5;
    const oeste = lado < 0;
    planoDeChao(mundo, { x, z: -5, l: 13, p: 14, ladrilho: 4, material: m.lajesChao });
    bloco(grupo, m.pedraEscura, x, 5.4, -5, 13.55, 0.48, 14.55);
    for (const [px, z, l, p] of [[lado * 35, -5, 0.65, 14], [x,-12,13,0.65], [x,2,13,0.65]]) {
      bloco(grupo, m.pedra, px, 2.62, z, l, 5.24, p);
      bloco(grupo, m.pedraEscura, px, 0.3, z, l + 0.12, 0.6, p + 0.12);   // rodapé, como na nave
      colisores.adicionar(px, z, l, p);
    }
    for (const z of [-9.05, -0.95]) {
      const arco = arcoOgival(2.55, 1.15, 0.22, 0.65, m.pedra);
      arco.position.set(lado * 22, 2.25, z);
      arco.rotation.y = Math.PI / 2;
      grupo.add(arco);
    }
    const centro = x + lado * 1.5;
    // Altar de pedra (o mesmo desenho do altar da nave: base escura e tampo claro).
    bloco(grupo, m.pedraEscura, centro, 0.53, -5, 2.0, 1.06, 3.25);
    bloco(grupo, m.pedra, centro, 1.1, -5, 2.2, 0.08, 3.45);
    colisores.adicionar(centro, -5, 2.2, 3.45, 1.14);
    for (const z of [-7.8, -2.2]) {
      const coluna = colunaFacetada(4.8, 0.48, m.pedra, m.pedraEscura);
      coluna.position.set(lado * 32.2, 0, z);
      grupo.add(coluna);
      colisores.adicionar(lado * 32.2, z, 1.12, 1.12);
    }
    for (const z of [-9.7, -0.65]) {
      modeloPronto(grupo, 'torch_mounted', {
        pos: [lado * 34.55, 2.05, z], tamanho: [0.42,0.79,0.45], rotacao: lado * -Math.PI / 2,
      });
    }
    modeloPronto(grupo, 'rubble_half', { pos: [lado * 33.7, 0.02, 0.9], tamanho: [1.58,0.38,0.91] });
    if (oeste) modeloPronto(grupo, 'rgs-ossos', { pos: [centro,1.145,-5], tamanho: [0.46,0.09,0.12] });
    else for (const z of [-8.4,-4.6,-1.2]) {
      modeloPronto(grupo, 'shelf_large', { pos: [34.52,0,z], tamanho: [2.42,2.75,0.68], rotacao: Math.PI / 2 });
      colisores.adicionar(34.52, z, 0.68, 2.42, 2.75);
    }
    tocha(mundo, { x: x - lado * 2.55, z: -5.8, altura: 2.2 });
    const nome = oeste ? 'Capela do Último Nome' : 'Arquivo das Vigílias';
    const evento = oeste ? 'catedral:capela-ultimo-nome' : 'catedral:arquivo-das-vigilias';
    placa(grupo, nome, centro, 1.37, -3.24, 1.74);
    mundo.objetos.push({ x: centro, y: 1.37, z: -3.21, acao: 'ler', evento });
  }
}
