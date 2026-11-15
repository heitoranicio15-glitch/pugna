import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { juntarPorMaterial } from './pecas.js';

export function gradeDeAtalho(grupo, { x, y, z, giro = 0, largura, altura }, m, bronze) {
  const grade = new THREE.Group();
  grade.position.set(x, y, z);
  grade.rotation.y = giro;
  const kit = juntarPorMaterial();
  for (const lado of [-1, 1]) {
    kit.caixa(lado * (largura / 2 - 0.052), altura / 2, 0, 0.104, altura, 0.15, m.metal);
  }
  for (const faixa of [0.12, 0.72, 0.96]) {
    kit.caixa(0, altura * faixa, 0.077, largura, 0.095, 0.11, m.metal);
  }
  for (let i = -3; i <= 3; i++) {
    const bx = i * largura / 8;
    kit.caixa(bx, altura * 0.51, 0, 0.074, altura * 0.94, 0.09, m.metal);
    for (const by of [altura * 0.12, altura * 0.72]) {
      kit.geometria(new THREE.OctahedronGeometry(0.039).scale(1, 1, 0.48).translate(bx, by, 0.138), bronze);
    }
  }
  kit.geometria(new THREE.TorusGeometry(0.31, 0.029, 5, 4)
    .rotateZ(0.04).translate(0, altura * 0.48, 0.10), bronze);
  kit.montar(grade, 'Grade do atalho');
  grupo.add(grade);
  return grade;
}

export function alavancaDeAtalho(grupo, x, y, z, m, bronze) {
  const base = juntarPorMaterial();
  base.caixa(x - 0.18, y, z, 0.20, 0.53, 0.34, m.metal);
  base.caixa(x - 0.086, y, z, 0.09, 0.42, 0.28, bronze);
  for (const dz of [-0.111, 0.111]) for (const dy of [-0.164, 0.164]) {
    base.geometria(new THREE.OctahedronGeometry(0.036).translate(x - 0.031, y + dy, z + dz), m.metal);
  }
  base.geometria(new THREE.TorusGeometry(0.074, 0.018, 5, 10)
    .rotateY(Math.PI / 2).translate(x - 0.056, y + 0.31, z), bronze);
  base.montar(grupo, 'Caixa da alavanca');

  const haste = new THREE.Group();
  haste.position.set(x, y, z);
  const ferro = juntarPorMaterial();
  ferro.caixa(0.15, 0, 0, 0.32, 0.075, 0.085, m.metal);
  ferro.caixa(0.34, 0, 0, 0.13, 0.12, 0.16, m.madeiraEscura);
  ferro.caixa(0.405, 0, 0, 0.032, 0.123, 0.16, bronze);
  ferro.montar(haste, 'Haste e punho');
  const lente = new THREE.Mesh(new THREE.OctahedronGeometry(0.057), retro(m.chama.clone()));
  lente.position.set(x - 0.035, y + 0.31, z);
  grupo.add(haste, lente);
  return aberta => {
    haste.rotation.z = aberta ? -0.48 : 0.05;
    lente.material.color.setHex(aberta ? 0xa4dc8c : 0xffad65);
  };
}
