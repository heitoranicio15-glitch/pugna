import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';
import { juntarPorMaterial } from './pecas.js';

const Z_MESA = -26.8;
const ALTURA_MESA = 0.86;
const LARGURA_MESA = 3.2;
const PROFUNDIDADE_MESA = 1.25;

export function montarRefeitorioECabido(mundo, m, bronze, luzes) {
  for (const [sala, x, compor] of [['refeitorio', -26, ceia], ['cabido', 26, reuniao]]) {
    const grupo = mundo.setores.get(sala);
    const kit = juntarPorMaterial();
    kit.caixa(x, ALTURA_MESA - 0.06, Z_MESA, LARGURA_MESA, 0.12, PROFUNDIDADE_MESA, m.madeira);
    for (const dx of [-1.06, 1.06]) {
      kit.caixa(x + dx, 0.08, Z_MESA, 0.28, 0.16, 0.94, m.madeiraEscura);
      kit.caixa(x + dx, 0.43, Z_MESA, 0.19, 0.68, 0.77, m.madeiraEscura);
    }
    kit.caixa(x, 0.38, Z_MESA, 2.15, 0.15, 0.16, m.madeiraEscura);
    compor(kit, x, m, bronze);
    kit.montar(grupo, 'Mobiliário do ' + sala);
    mundo.colisores.adicionar(x, Z_MESA, LARGURA_MESA, PROFUNDIDADE_MESA, ALTURA_MESA);

    const { cor, intensidade, alcance, pos } = luzes[sala];
    const luz = new THREE.PointLight(cor, intensidade, alcance);
    luz.position.set(...pos);
    grupo.add(luz);
  }
}

function ceia(kit, x, m, bronze) {
  const barro = retro(new THREE.MeshLambertMaterial({ color: 0xb58161 }));
  const prato = new THREE.LatheGeometry([
    [0, 0], [0.075, 0], [0.14, 0.024], [0.148, 0.043],
    [0.129, 0.037], [0.074, 0.015], [0, 0.015],
  ].map(([r, y]) => new THREE.Vector2(r, y)), 14);

  // A Conta da mesa menciona que o sexto prato foi retirado.
  for (const [dx, dz] of [[-0.98, -0.34], [0, -0.34], [0.98, -0.34], [-0.98, 0.34], [0, 0.34]]) {
    kit.geometria(prato.clone().translate(x + dx, ALTURA_MESA, Z_MESA + dz), barro);
    const copo = new THREE.CylinderGeometry(0.047, 0.031, 0.089, 7);
    kit.geometria(copo.translate(x + dx + 0.24, ALTURA_MESA + 0.0445, Z_MESA + dz), barro);
  }
  prato.dispose();
  const jarra = new THREE.LatheGeometry([
    [0, 0], [0.076, 0], [0.11, 0.09], [0.101, 0.17],
    [0.049, 0.229], [0.054, 0.255], [0.043, 0.255], [0.037, 0.18],
  ].map(([r, y]) => new THREE.Vector2(r, y)), 10);
  kit.geometria(jarra.translate(x - 0.43, ALTURA_MESA, Z_MESA - 0.033), barro);

  kit.caixa(x, 1.55, -28.61, 4.46, 0.11, 0.31, m.madeira);
  for (const dx of [-1.92, 1.92]) kit.caixa(x + dx, 1.40, -28.59, 0.18, 0.25, 0.26, m.madeiraEscura);
  for (const dx of [-1.63, -1.27, -0.92, 0.88, 1.22]) {
    const tigela = new THREE.LatheGeometry([
      [0,0], [0.045,0], [0.108,0.095], [0.098,0.095], [0.038,0.018], [0,0.018],
    ].map(([r, y]) => new THREE.Vector2(r, y)), 9);
    kit.geometria(tigela.translate(x + dx, 1.605, -28.59), barro);
  }

  const y = 2.77;
  const aro = new THREE.TorusGeometry(0.41, 0.028, 5, 14).rotateX(Math.PI / 2);
  kit.geometria(aro.translate(x, y, Z_MESA), bronze);
  kit.caixa(x, 3.885, Z_MESA, 0.038, 2.23, 0.038, m.metal);
  kit.caixa(x, y, Z_MESA, 0.78, 0.045, 0.048, bronze);
  kit.caixa(x, y, Z_MESA, 0.046, 0.045, 0.78, bronze);
  for (const dx of [-0.34, 0, 0.34]) castical(kit, x + dx, y + 0.023, Z_MESA, 0.13, m, bronze);
}

function reuniao(kit, x, m, bronze) {
  const z = Z_MESA;
  kit.caixa(x, 0.55, z + 0.48, 2.76, 0.36, 0.18, m.madeiraEscura);
  for (const dx of [-0.88, 0, 0.88]) {
    kit.caixa(x + dx, 0.55, z + 0.577, 0.72, 0.27, 0.04, m.madeira);
    kit.caixa(x + dx, 0.55, z + 0.602, 0.18, 0.034, 0.026, bronze);
  }
  const papel = retro(new THREE.MeshLambertMaterial({ color: 0xc0aa85, emissive: 0x17120c }));
  kit.caixa(x, 0.884, z - 0.09, 0.65, 0.048, 0.39, m.madeiraEscura, 0.05);
  for (const lado of [-1, 1]) {
    const pagina = new THREE.BoxGeometry(0.305, 0.036, 0.362).rotateZ(-lado * 0.09);
    kit.geometria(pagina.translate(x + lado * 0.153, 0.924, z - 0.09), papel);
  }
  for (const [dx, dz, giro] of [[0.73,-0.26,0.10], [0.81,-0.01,-0.35]]) {
    kit.caixa(x + dx, 0.878, z + dz, 0.38, 0.036, 0.24, papel, giro);
  }
  castical(kit, x - 1.10, ALTURA_MESA, z - 0.24, 0.29, m, bronze);
  castical(kit, x + 1.17, ALTURA_MESA, z - 0.21, 0.20, m, bronze);

  const pano = retro(new THREE.MeshLambertMaterial({
    map: texturas().estandarteVeu, color: 0x8fa8d0, emissive: 0x181c28,
  }));
  for (const dx of [-1.3, 1.3]) {
    kit.caixa(x + dx, 2.78, -28.66, 0.96, 0.062, 0.12, bronze);
    kit.geometria(new THREE.PlaneGeometry(0.82, 1.60).translate(x + dx, 1.99, -28.60), pano);
  }
}

function castical(kit, x, y, z, altura, m, bronze) {
  kit.geometria(new THREE.CylinderGeometry(0.051, 0.079, 0.05, 7)
    .translate(x, y + 0.025, z), bronze);
  kit.caixa(x, y + 0.05 + altura / 2, z, 0.059, altura, 0.059, m.quinaGaleria);
  kit.geometria(new THREE.OctahedronGeometry(0.043).scale(0.66, 1.4, 0.66)
    .translate(x, y + 0.096 + altura, z), m.chama);
}
