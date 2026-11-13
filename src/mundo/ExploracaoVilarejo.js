import * as THREE from 'three';
import { bloco, chave, frasco, placa } from './Aderecos.js';
import { materiais, telhado, tocha } from './pecas.js';
import { CHAVE_SACRISTIA } from '../nucleo/Inventario.js';

export function montarExploracaoVilarejo(mundo) {
  const m = materiais(), grupo = mundo.grupo, col = mundo.colisores;
  const parede = (x, z, l, p) => {
    bloco(grupo, m.pedra, x, 1.85, z, l, 3.7, p);
    col.adicionar(x, z, l, p);
  };
  const abrigo = (x, z, nome, porta) => {
    parede(x - 3.5, z, 0.45, 5.6);
    parede(x + 3.5, z, 0.45, 5.6);
    parede(x, z - 2.8, 7, 0.45);
    for (const lado of [-1, 1]) parede(x + lado * 2.35, z + 2.8, 2.3, 0.45);
    bloco(grupo, m.pedraEscura, x, 3.19, z + 2.8, 2.4, 1.02, 0.45);
    const teto = telhado(7.7, 2.35, 6.25, m.telhado, m.pedraEscura);
    teto.position.set(x, 3.7, z);
    grupo.add(teto);
    const piso = bloco(grupo, m.lajesChao, x, -0.085, z, 7, 0.2, 5.6);
    piso.renderOrder = -2;
    placa(grupo, nome, x, 3.07, z + 3.045, 2.06);
    tocha(mundo, { x: x - 2.55, z: z + 3.5, altura: 1.8 });
    if (!porta) return;
    const folha = bloco(grupo, m.madeira, x, 1.37, z + 2.8, 2.38, 2.74, 0.18);
    const bloqueio = col.adicionar(x, z + 2.8, 2.4, 0.21);
    mundo.objetos.push({
      x, y: 1.4, z: z + 2.94, tolerancia: 0.8, acao: 'abrir', evento: 'vilarejo:porta-casa',
      nome: 'casa da sineira',
      atualizar(aberta) {
        folha.visible = !aberta;
        bloqueio.ativa = !aberta;
      },
    });
  };

  // Casa acessível a oeste da praça.
  abrigo(-15.9, 7.45, 'Casa da sineira', true);
  bloco(grupo, m.madeira, -17.7, 0.36, 5.55, 1.5, 0.72, 1.08);
  col.adicionar(-17.7, 5.55, 1.5, 1.08, 0.72);
  const tampa = bloco(grupo, m.metal, -17.7, 0.75, 5.55, 1.55, 0.12, 1.11);
  const premio = frasco(grupo, -17.7, 0.73, 5.7);
  mundo.objetos.push({
    x: -17.7, y: 0.82, z: 5.97, nome: 'baú da sineira', acao: 'bau',
    evento: 'vilarejo:bau-casa',
    atualizar(aberto) {
      tampa.rotation.x = aberto ? -1.1 : 0;
      tampa.position.y = aberto ? 1.03 : 0.75;
      tampa.position.z = aberto ? 5.11 : 5.55;
      premio.visible = !aberto;
    },
  });
  bloco(grupo, m.madeira, -13.45, 0.38, 6.5, 1.45, 0.76, 1.85);
  bloco(grupo, m.pedraEscura, -13.45, 0.8, 6.5, 1.28, 0.11, 1.69);
  col.adicionar(-13.45, 6.5, 1.45, 1.85, 0.87);

  // Oficina perto do poço, com bancada, ferramentas e uma chave visível.
  abrigo(-9.25, -9.65, 'Oficina do poço', false);
  bloco(grupo, m.madeira, -9.3, 0.91, -11.52, 4.65, 0.18, 0.89);
  for (const x of [-11.38, -7.22]) bloco(grupo, m.madeira, x, 0.46, -11.52, 0.22, 0.92, 0.7);
  col.adicionar(-9.3, -11.52, 4.65, 0.89, 1);
  bloco(grupo, m.metal, -10.6, 1.17, -11.58, 0.46, 0.32, 0.48);
  const bigorna = bloco(grupo, m.metal, -10.6, 1.35, -11.58, 0.62, 0.11, 0.28);
  bigorna.rotation.y = -0.15;
  for (const x of [-12.24, -11.82]) {
    const barril = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.56, 7), m.madeira);
    barril.position.set(x, 0.28, -10.55);
    grupo.add(barril);
    col.adicionar(x, -10.55, 0.42, 0.42, 0.56);
  }
  for (let i = 0; i < 3; i++) {
    const lima = bloco(grupo, m.metal, -8.5 + i * 0.18, 1.035, -11.37, 0.055, 0.05, 0.34);
    lima.rotation.y = 0.2;
  }
  const malhaChave = chave(grupo, -9.5, 1.12, -11.23);
  mundo.objetos.push({
    x: -9.5, y: 1.13, z: -11.19, nome: 'chave da sacristia', acao: 'recolher',
    evento: CHAVE_SACRISTIA, atualizar: (recolhida) => { malhaChave.visible = !recolhida; },
  });
  placa(grupo, 'Ordens', -10.99, 1.56, -11.84, 0.9);
  mundo.objetos.push({ x: -10.99, y: 1.56, z: -11.79, acao: 'ler', evento: 'vilarejo:registro-da-oficina' });

  const carroca = new THREE.Group();
  carroca.position.set(12.6, 0, 9);
  grupo.add(carroca);
  bloco(carroca, m.madeira, 0, 0.68, 0, 1.7, 0.19, 2.48);
  for (const lado of [-1, 1]) {
    bloco(carroca, m.madeira, lado * 0.78, 0.94, 0, 0.15, 0.49, 2.48);
    bloco(carroca, m.madeira, lado * 0.63, 0.52, 1.56, 0.12, 0.13, 1.1);
    const roda = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.075, 5, 10), m.metal);
    roda.rotation.y = Math.PI / 2;
    roda.position.set(lado * 0.94, 0.57, 0.2);
    carroca.add(roda);
  }
  col.adicionar(12.6, 9, 2.06, 2.5, 1.2);

  for (const [x, z, texto] of [[-5.55, 5.1, '← Casa da sineira'], [-5.6, -5.55, '← Oficina do poço'], [10.3, -43.65, 'Cemitério →']]) {
    bloco(grupo, m.madeira, x, 0.82, z, 0.16, 1.64, 0.16);
    placa(grupo, texto, x, 1.52, z + 0.095, 1.72);
    col.adicionar(x, z, 0.2, 0.2, 1.65);
  }

  for (const [x, z, nome, evento] of [
    [11.2, -47.8, 'A sineira', 'vilarejo:lapide-sineira'],
    [11.2, -52.5, 'O aprendiz', 'vilarejo:lapide-aprendiz'],
  ]) {
    bloco(grupo, m.pedraEscura, x, 0.62, z, 0.86, 1.24, 0.32);
    col.adicionar(x, z, 0.86, 0.32, 1.24);
    placa(grupo, nome, x, 0.91, z + 0.18, 0.71);
    mundo.objetos.push({ x, y: 0.91, z: z + 0.2, acao: 'ler', evento });
  }
}
