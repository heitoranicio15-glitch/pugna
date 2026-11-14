import { bloco, placa } from './Aderecos.js';
import { arcoOgival, materiais, planoDeChao, tocha } from './pecas.js';
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
      const parede = bloco(grupo, m.pedra, px, 2.62, z, l, 5.24, p);
      colisores.adicionar(px, z, l, p);
      const lateral = p > l;
      const comprimento = lateral ? p : l;
      const paineis = [];
      for (let i = 0; i < 3; i++) {
        const desvio = (i - 1) * comprimento / 3;
        paineis.push(modeloPronto(grupo, 'rgs-muro', { pos: [px + (lateral ? 0 : desvio), 0, z + (lateral ? desvio : 0)],
          tamanho: [comprimento / 3, 5.24, lateral ? l : p], rotacao: lateral ? Math.PI / 2 : 0 }));
      }
      Promise.all(paineis.map(o => o.userData.pronto)).then(prontos => {
        if (prontos.every(Boolean)) parede.visible = false;
      });
    }
    for (const z of [-9.05, -0.95]) {
      const arco = arcoOgival(2.55, 1.15, 0.22, 0.65, m.pedra);
      arco.position.set(lado * 22, 2.25, z);
      arco.rotation.y = Math.PI / 2;
      grupo.add(arco);
      modeloPronto(grupo, 'rgs-arcada', { pos: [lado * 22, 0, z], tamanho: [2.97, 3.86, 0.65],
        rotacao: Math.PI / 2, reserva: [arco] });
    }
    const centro = x + lado * 1.5;
    const altar = bloco(grupo, m.pedraEscura, centro, 0.57, -5, 2.2, 1.14, 3.45);
    colisores.adicionar(centro, -5, 2.2, 3.45, 1.14);
    modeloPronto(grupo, oeste ? 'table_long_tablecloth' : 'table_medium',
      { pos: [centro, 0, -5], tamanho: [3.45, 1.14, 2.2], rotacao: Math.PI / 2, reserva: [altar] });
    for (const z of [-7.8, -2.2]) {
      const pilar = bloco(grupo, m.pedra, lado * 32.2, 2.4, z, 1.12, 4.8, 1.12);
      colisores.adicionar(lado * 32.2, z, 1.12, 1.12);
      modeloPronto(grupo, 'rgs-pilar', { pos: [lado * 32.2, 0, z], tamanho: [1.12, 4.8, 1.12], reserva: [pilar] });
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
