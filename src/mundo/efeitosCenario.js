import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';

let material;
const plano = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

/** Duas faixas translúcidas cruzadas dão volume ao feixe sem calcular sombras. */
export function feixeDeLuz(grupo, { origem, destino, largura, cor, opacidade }) {
  const centro = new THREE.Vector3(...origem);
  const eixo = new THREE.Vector3(...destino).sub(centro);
  const comprimento = eixo.length();
  const feixe = new THREE.Group();
  feixe.name = 'Luz do vitral';
  feixe.position.copy(centro).addScaledVector(eixo, 0.5);
  feixe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), eixo.normalize());
  const material = retro(new THREE.MeshBasicMaterial({
    color: cor, alphaMap: texturas().feixe, opacity: opacidade,
    side: THREE.DoubleSide, forceSinglePass: true,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const geo = new THREE.PlaneGeometry(largura, comprimento);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0) pos.setX(i, pos.getX(i) * 0.47);
  }
  const diagonal = new THREE.Mesh(geo, material);
  diagonal.rotation.y = Math.PI / 2;
  feixe.add(new THREE.Mesh(geo, material), diagonal);
  grupo.add(feixe);
}

/** Fagulhas decorativas da lareira, em uma única malha de pontos. */
export function fagulhasDaLareira(grupo, x, z) {
  const quantidade = 18;
  const posicao = new THREE.Float32BufferAttribute(new Float32Array(quantidade * 3), 3);
  const cores = new THREE.Float32BufferAttribute(new Float32Array(quantidade * 3), 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posicao);
  geo.setAttribute('color', cores);
  const material = new THREE.PointsMaterial({
    map: texturas().brilho, size: 0.082, vertexColors: true,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
  const fagulhas = new THREE.Points(geo, material);
  fagulhas.name = 'Fagulhas da lareira';
  fagulhas.frustumCulled = false;
  grupo.add(fagulhas);
  return (tempo) => {
    for (let i = 0; i < quantidade; i++) {
      const fase = (tempo * (0.52 + i % 4 * 0.075) + i * 0.618) % 1;
      const brilho = Math.sin(Math.PI * fase) ** 2;
      posicao.setXYZ(i, x - fase * 0.8 + Math.sin(i * 3.7 + tempo * 2.1) * 0.13,
        0.3 + fase * (0.81 + i % 3 * 0.11), z + Math.cos(i * 5.4 + fase * 3) * (0.24 + fase * 0.18));
      cores.setXYZ(i, brilho, brilho * 0.27, brilho * 0.035);
    }
    posicao.needsUpdate = true;
    cores.needsUpdate = true;
  };
}

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
