import * as THREE from 'three';
import { bloco, frasco, placa } from './Aderecos.js';
import { arcoOgival, materiais, tocha } from './pecas.js';
import { CHAVE_SACRISTIA, PORTA_SACRISTIA, ATALHO_SACRISTIA } from '../nucleo/Inventario.js';

export function montarSacristia(mundo) {
  const g = mundo.grupo, c = mundo.colisores, m = materiais();
  const parede = (x, z, largura, profundidade) => {
    bloco(g, m.pedra, x, 2.4, z, largura, 4.8, profundidade);
    c.adicionar(x, z, largura, profundidade);
  };
  parede(15, 8.55, 14, 0.52);
  parede(22, 5.25, 0.52, 6.6);
  const piso = bloco(g, m.lajesChao, 15, -0.11, 5.25, 14, 0.22, 6.6);
  piso.renderOrder = -5;
  bloco(g, m.pedraEscura, 15, 4.95, 5.25, 14, 0.35, 6.6);

  // Entrada pelo lado sul do Relicário.
  const porta = bloco(g, m.madeira, 15, 1.48, 2, 2.74, 2.96, 0.22);
  const colPorta = c.adicionar(15, 2, 2.8, 0.27);
  const arco = arcoOgival(2.62, 1.12, 0.28, 0.42, m.pedraEscura);
  arco.position.set(15, 2.96, 2);
  g.add(arco);
  bloco(g, m.pedra, 15, 5.35, 2, 2.8, 4.7, 0.65);
  placa(g, 'Sacristia', 15, 2.38, 1.875, 1.44, Math.PI);
  mundo.objetos.push({
    x: 15, y: 1.44, z: 1.84, tolerancia: 0.83, acao: 'abrir',
    nome: 'porta da sacristia', chave: CHAVE_SACRISTIA, evento: PORTA_SACRISTIA,
    atualizar(aberta) {
      porta.visible = !aberta;
      colPorta.ativa = !aberta;
    },
  });

  // Grade de serviço para a nave, acionada por dentro da sacristia.
  const grade = new THREE.Group();
  grade.position.set(8, 0, 5.65);
  g.add(grade);
  for (const z of [-1.32, -0.88, -0.44, 0, 0.44, 0.88, 1.32]) {
    bloco(grade, m.metal, 0, 1.55, z, 0.13, 3.1, 0.1);
  }
  for (const y of [0.52, 2.65]) bloco(grade, m.metal, 0, y, 0, 0.2, 0.13, 2.82);
  const colGrade = c.adicionar(8, 5.65, 0.48, 2.85);
  bloco(g, m.pedra, 8, 6.55, 5.65, 0.65, 6.9, 2.85);
  bloco(g, m.metal, 8.48, 1.45, 7.06, 0.25, 0.59, 0.42);
  const haste = bloco(g, m.metal, 8.79, 1.53, 7.06, 0.63, 0.085, 0.105);
  const punho = bloco(g, m.madeira, 9.06, 1.53, 7.06, 0.17, 0.14, 0.18);
  const indicador = new THREE.PointLight(0xffad65, 6, 3.5, 1.8);
  indicador.position.set(9.25, 1.8, 7.04);
  g.add(indicador);
  mundo.objetos.push({
    x: 9.03, y: 1.53, z: 7.06, acao: 'acionar', nome: 'alavanca da grade',
    evento: ATALHO_SACRISTIA,
    atualizar(aberta) {
      grade.position.y = aberta ? 3.2 : 0;
      colGrade.ativa = !aberta;
      haste.rotation.z = aberta ? -0.55 : 0.24;
      punho.position.y = aberta ? 1.32 : 1.61;
      indicador.color.setHex(aberta ? 0xa4dc8c : 0xffad65);
    },
  });
  mundo.objetos.push({
    x: 7.72, y: 1.48, z: 5.65, acao: 'informar',
    mensagem: 'Grade fechada · alavanca do lado da sacristia',
    evento: ATALHO_SACRISTIA,
  });
  placa(g, 'Grade de serviço', 7.64, 3.54, 5.65, 1.43, -Math.PI / 2);
  bloco(g, m.madeira, 18.65, 0.49, 7.34, 3.45, 0.98, 1.06);
  c.adicionar(18.65, 7.34, 3.45, 1.06, 0.98);
  placa(g, 'Vigília do Guardião', 18.64, 1.67, 8.24, 2.07, Math.PI);
  mundo.objetos.push({ x: 18.64, y: 1.67, z: 8.21, acao: 'ler', evento: 'catedral:registro-guardiao' });
  const malhaFrasco = frasco(g, 20.88, 0.03, 6.77);
  mundo.objetos.push({
    x: 20.88, y: 0.19, z: 6.77, acao: 'recolher', nome: 'frasco de cura',
    evento: 'catedral:frasco-sacristia', atualizar: (recolhido) => { malhaFrasco.visible = !recolhido; },
  });
  for (const [x, z] of [[11.4, 7.8], [20.4, 3.5]]) tocha(mundo, { x, z, altura: 1.8 });
  for (const x of [12.25, 12.85, 13.45]) {
    bloco(g, m.madeira, x, 0.64, 8.02, 0.37, 1.28, 0.72);
    c.adicionar(x, 8.02, 0.37, 0.72, 1.28);
  }
}
