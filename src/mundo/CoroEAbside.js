import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';
import { juntarPorMaterial } from './pecas.js';

export function montarCoroEAbside(mundo, m, bronze, luzes) {
  const coro = mundo.setores.get('coro');
  const abside = mundo.setores.get('abside');
  montarCoro(coro, m, bronze);
  montarAltar(mundo, abside, m, bronze);
  for (const [grupo, { x, y, z, cor, intensidade, alcance }] of [[coro, luzes.coro], [abside, luzes.abside]]) {
    const luz = new THREE.PointLight(cor, intensidade, alcance);
    luz.position.set(x, y, z);
    grupo.add(luz);
  }
}

function montarCoro(grupo, m, bronze) {
  const kit = juntarPorMaterial();
  // Painéis baixos encostados às paredes laterais, entre as entradas do Coro.
  for (const lado of [-1, 1]) {
    for (const z of [-35, -33, -31]) {
      const x = lado * 9.66;
      kit.caixa(x, 0.99, z, 0.16, 1.68, 1.7, m.madeiraEscura);
      kit.caixa(x - lado * 0.092, 0.99, z, 0.045, 1.39, 1.43, m.madeira);
      for (const y of [0.28, 1.78]) {
        kit.caixa(x - lado * 0.113, y, z, 0.065, 0.095, 1.73, m.madeiraEscura);
      }
      kit.caixa(x - lado * 0.12, 1.22, z, 0.045, 0.32, 0.32, bronze);
    }
  }
  for (const x of [-2, 2]) {
    kit.caixa(x, 2.42, -36.72, 0.31, 0.46, 0.08, m.cantariaUmidaVeu);
    kit.caixa(x, 2.35, -36.51, 0.11, 0.08, 0.37, bronze);
    castical(kit, x, 2.31, -36.32, 0.88, m, bronze);
  }
  kit.montar(grupo, 'Painéis e arandelas do Coro');
}

function montarAltar(mundo, grupo, m, bronze) {
  const kit = juntarPorMaterial();
  // O friso ocupa a quina dos próprios degraus, com as alturas e projeções originais.
  for (const [z, profundidade, altura] of [[-60.5, 1, 0.18], [-61.5, 1, 0.36], [-63.3, 2.6, 0.54]]) {
    const faixa = 0.12, espessura = 0.048;
    kit.caixa(0, (altura - espessura) / 2, z, 11.5, altura - espessura, profundidade, m.espelhoGaleria);
    kit.caixa(0, altura - espessura / 2, z - faixa / 2, 11.5, espessura, profundidade - faixa, m.lajesNave);
    kit.caixa(0, altura - espessura / 2, z + (profundidade - faixa) / 2, 11.5, espessura, faixa, m.quinaGaleria);
    mundo.colisores.adicionar(0, z, 11.5, profundidade, altura);
  }

  const z = -63.75;
  kit.caixa(0, 0.617, z, 4.74, 0.154, 1.31, m.cantariaUmidaVeu);
  kit.caixa(0, 0.732, z, 4.50, 0.076, 1.24, m.quinaGaleria);
  kit.caixa(0, 1.038, z, 4.31, 0.536, 1.19, m.cantariaUmidaVeu);
  kit.caixa(0, 1.35, z, 4.67, 0.088, 1.30, m.quinaGaleria);
  kit.caixa(0, 1.447, z, 4.9, 0.106, 1.4, m.lajesNave);
  for (const x of [-1.82, -1.31, 1.31, 1.82]) {
    kit.caixa(x, 1.04, z + 0.58, 0.18, 0.54, 0.15, m.cantariaVeu);
    for (const y of [0.803, 1.273]) kit.caixa(x, y, z + 0.58, 0.226, 0.062, 0.20, m.quinaGaleria);
  }
  const textura = texturas().tecidoAltar;
  const tecido = retro(new THREE.MeshLambertMaterial({
    map: textura, emissiveMap: textura, emissive: 0xba8492, emissiveIntensity: 0.14,
  }));
  const pano = new THREE.PlaneGeometry(2.20, 0.542, 12, 4);
  const vertices = pano.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const u = vertices.getX(i);
    const queda = (0.271 - vertices.getY(i)) / 0.542;
    vertices.setZ(i, Math.cos(u * 17) * (0.004 + queda * 0.009));
  }
  pano.computeVertexNormals();
  kit.geometria(pano.translate(0, 1.048, z + 0.623), tecido);

  for (const lado of [-1, 1]) {
    const x = lado * 1.5;
    castical(kit, x, 1.5, z + 0.10, 1.16, m, bronze);
    castical(kit, x + lado * 0.45, 1.5, z - 0.16, 0.76, m, bronze);
    // Pilastras do fundo ressaltam a altura do vitral, com os pés no estrado.
    const eixo = lado * 2.88;
    kit.caixa(eixo, 2.51, -64.68, 0.30, 3.94, 0.17, m.cantariaVeu);
    kit.caixa(eixo, 0.73, -64.63, 0.46, 0.38, 0.25, m.cantariaUmidaVeu);
    kit.caixa(eixo, 4.42, -64.64, 0.48, 0.16, 0.24, m.quinaGaleria);
  }
  kit.montar(grupo, 'Estrado e altar do Véu');
  mundo.colisores.adicionar(0, z, 4.9, 1.4, 1.5);
}

function castical(kit, x, y, z, escala, m, bronze) {
  const base = new THREE.CylinderGeometry(0.074, 0.137, 0.07, 7);
  kit.geometria(base.translate(x, y + 0.035, z), bronze);
  kit.caixa(x, y + 0.138, z, 0.055, 0.145, 0.055, bronze);
  const prato = new THREE.CylinderGeometry(0.087, 0.061, 0.027, 7);
  kit.geometria(prato.translate(x, y + 0.223, z), bronze);
  const cera = 0.15 * escala;
  const vela = new THREE.CylinderGeometry(0.035, 0.042, cera, 7);
  kit.geometria(vela.translate(x, y + 0.236 + cera / 2, z), m.quinaGaleria);
  const chama = new THREE.OctahedronGeometry(0.043).scale(0.67, 1.29, 0.67);
  kit.geometria(chama.translate(x, y + 0.278 + cera, z), m.chama);
}
