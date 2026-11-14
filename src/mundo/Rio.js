import * as THREE from 'three';
import { criarSorteio, texturas } from '../render/texturas.js';
import { retro } from '../render/retro.js';
import { modeloPronto } from '../render/modelos.js';
import { decorar } from './Decoracao.js';
import { caixa, materiais, planoDeChao } from './pecas.js';

export function montarRio(estrada, { z, riacho }, meioX, larguraDaPonte) {
  const { grupo, colisores } = estrada;
  const m = materiais();
  const agua = texturas().riacho;
  const margem = riacho / 2;
  const suporte = new THREE.Group();
  suporte.name = 'Margens do rio';
  suporte.position.z = z;
  grupo.add(suporte);
  planoDeChao(estrada, {
    x: meioX, z, l: 420, p: riacho, ladrilho: 6, y: 0.024, ordem: -4,
    material: retro(new THREE.MeshBasicMaterial({ map: agua, color: 0xc9d5e0, depthWrite: false })),
  });
  const pedras = [
    [-27, -1], [-19, 1], [-15.4, -1], [-13, 1], [-10.9, -1], [-5.7, 1],
    [5.35, -1], [7.9, 1], [13.1, -1], [15.4, 1], [21, -1], [32, 1],
  ];
  for (const [i, [x, lado]] of pedras.entries()) {
    const dz = lado * (margem + 0.15 + 0.45 * (i % 2));
    decorar(suporte, [
      [i % 2 ? 'Rock_Moss_4' : 'Rock_Moss_2', x, 0, dz, i * 0.83, 1 + i % 3 * 0.2],
      ['Grass_2', x + 0.72, 0, dz + lado * 0.28, i, 0.92],
      ['Grass_2', x - 0.65, 0, dz + lado * 0.38, i + 1.1, 0.65],
      ['Plant_3', x - 0.94, 0, dz + lado * 0.3, i],
    ]);
  }
  decorar(suporte, [
    ['Willow_Dead_3', 11.2, 0, 4.9], ['Willow_Dead_3', -14.5, 0, -5.2, 2.15],
    ['WoodLog_Moss', 9.25, 0.024, 2.63, 0.23, 0.92],
    ['Lilypad', 6.38, 0.032, -2.48, 0.42], ['Lilypad', 7.2, 0.032, -2.27, 1.18, 0.6],
    ['Lilypad', -12.66, 0.032, -2.66], ['Lilypad', -12.28, 0.032, -2.28, -0.37, 0.73],
  ]);
  for (const lado of [-1, 1]) {
    for (const dz of [-2.45, 2.45]) {
      const x = lado * (larguraDaPonte / 2 + 0.09);
      const pilar = caixa(0.66, 1.48, 0.72, m.pedraEscura, 1.1);
      pilar.position.set(x, 0.74, dz);
      suporte.add(pilar);
    }
  }
  const xCais = -8.75;
  modeloPronto(suporte, 'cais-madeira', {
    pos: [xCais, 0, -2.8], tamanho: [2.25, 0.38, 2.2], tinta: 0x8f8276,
  });
  for (const x of [xCais - 1.05, xCais + 1.05]) {
    modeloPronto(suporte, 'estaca-cais', { pos: [x, 0, -1.85], tamanho: [0.22, 1.08, 0.22], tinta: 0x95887f });
  }
  decorar(suporte, [
    ['banco-peixes', xCais + 0.88, 0.38, -3.35, 0.51],
    ['ancora-rio', xCais - 1.15, 0, -4.14, 0.8],
    ['box_stacked', xCais - 1.9, 0, -4.32, -0.13, 0.72],
  ]);
  const barco = modeloPronto(suporte, 'barco-rio', {
    pos: [xCais, 0.015, -0.25], tamanho: [1.8, 0.62, 3.45],
    tinta: 0x847569, rotacao: 1.26,
  });
  // A barreira original do rio preserva a travessia pela ponte.
  colisores.adicionar(xCais, z - 3.75, 2.25, 0.3, 0.38);
  colisores.adicionar(11.2, z + 4.9, 0.65, 0.65);
  colisores.adicionar(-14.5, z - 5.2, 0.65, 0.65);

  const sorteio = criarSorteio(7623);
  const transformacao = new THREE.Object3D();
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const reflexos = new THREE.InstancedMesh(geo, retro(new THREE.MeshBasicMaterial({
    color: 0x8ab6ca, alphaMap: texturas().sombra, opacity: 0.29,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })), 44);
  reflexos.name = 'Reflexos da correnteza';
  reflexos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  reflexos.frustumCulled = false;
  suporte.add(reflexos);
  const ondas = Array.from({ length: reflexos.count }, () => ({
    x: sorteio() * 76, dz: (sorteio() - 0.5) * (riacho - 0.6),
    l: 0.35 + sorteio() * 1.9, velocidade: 0.42 + sorteio() * 0.46,
  }));
  return tempo => {
    agua.offset.set((-tempo * 0.1) % 1, Math.sin(tempo * 0.22) * 0.05);
    barco.position.y = 0.035 + Math.sin(tempo * 1.35) * 0.031;
    barco.rotation.x = Math.sin(tempo * 1.18) * 0.037;
    for (const [i, { x, dz, l, velocidade }] of ondas.entries()) {
      const deriva = (x + tempo * velocidade) % 76 - 38;
      const pulso = 0.48 + Math.sin(tempo * 1.4 + i * 3.1) * 0.33;
      transformacao.position.set(deriva, 0.029, dz + Math.sin(tempo * 0.72 + i) * 0.12);
      transformacao.scale.set(l * pulso, 1, 0.16 + pulso * 0.09);
      transformacao.updateMatrix();
      reflexos.setMatrixAt(i, transformacao.matrix);
    }
    reflexos.instanceMatrix.needsUpdate = true;
  };
}
