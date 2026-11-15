import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';
import { juntarPorMaterial } from './pecas.js';

export function modeloBancoDaNave(m) {
  const grupo = new THREE.Group();
  const madeira = juntarPorMaterial();
  const escura = m.madeiraEscura;
  const clara = m.madeira;
  // Todo o banco cabe no volume publicado de 2,6 × 0,83 × 0,5 m.
  madeira.caixa(0, 0.408, -0.018, 2.56, 0.088, 0.45, clara);
  madeira.caixa(0, 0.34, -0.21, 2.40, 0.05, 0.045, escura);
  madeira.caixa(0, 0.78, 0.18, 2.55, 0.07, 0.12, clara);
  madeira.caixa(0, 0.523, 0.177, 2.4, 0.085, 0.115, escura);
  madeira.caixa(0, 0.65, 0.19, 2.38, 0.169, 0.072, escura);
  for (const lado of [-1, 1]) {
    const x = lado * 1.245;
    madeira.caixa(x, 0.19, 0, 0.11, 0.38, 0.37, escura);
    madeira.caixa(x, 0.618, 0.15, 0.11, 0.33, 0.19, escura);
    madeira.caixa(x, 0.446, -0.11, 0.11, 0.098, 0.22, clara);
  }
  for (const x of [-0.79, 0, 0.79]) {
    madeira.caixa(x, 0.637, 0.145, 0.048, 0.15, 0.035, clara);
  }
  madeira.montar(grupo, 'Banco da nave');
  return grupo;
}

export function criarVitraisDoVeu() {
  const largura = 2.75;
  const altura = 3.48;
  const w = largura / 2;
  const h = altura / 2;
  const curva = new THREE.Shape();
  curva.moveTo(-w, -h);
  curva.lineTo(w, -h);
  curva.lineTo(w, 0.10);
  curva.quadraticCurveTo(w, 0.97, 0, h);
  curva.quadraticCurveTo(-w, 0.97, -w, 0.10);
  curva.closePath();
  const geometria = new THREE.ShapeGeometry(curva, 12);
  const pos = geometria.attributes.position;
  const uv = geometria.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (pos.getX(i) + w) / largura, (pos.getY(i) + h) / altura);
  }
  const t = texturas();
  const materiais = [t.vitralVeuAzul, t.vitralVeuAmbar]
    .map(map => retro(new THREE.MeshBasicMaterial({ map })));
  return (tipo, x, y, z, giro) => {
    const vitral = new THREE.Mesh(geometria, materiais[tipo]);
    vitral.position.set(x, y, z);
    vitral.rotation.y = giro;
    return vitral;
  };
}
