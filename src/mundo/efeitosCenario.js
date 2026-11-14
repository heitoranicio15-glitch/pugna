import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';

let material;
const plano = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

/** Sombras suaves desenhadas no piso em uma chamada por conjunto, sem mapa de sombras. */
export function sombrasDeContato(grupo, pontos) {
  material ??= retro(new THREE.MeshBasicMaterial({
    color: 0x07060c, alphaMap: texturas().sombra, opacity: 0.47,
    transparent: true, depthWrite: false, forceSinglePass: true,
  }));
  const sombras = new THREE.InstancedMesh(plano, material, pontos.length);
  sombras.name = 'Sombras de contato';
  const transformacao = new THREE.Object3D();
  for (const [i, [x, z, largura, profundidade, y = 0.035]] of pontos.entries()) {
    transformacao.position.set(x, y, z);
    transformacao.scale.set(largura, 1, profundidade);
    transformacao.updateMatrix();
    sombras.setMatrixAt(i, transformacao.matrix);
  }
  sombras.instanceMatrix.needsUpdate = true;
  grupo.add(sombras);
}
