import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';
import { juntarPorMaterial } from './pecas.js';

const perfil = pontos => pontos.map(([r, y]) => new THREE.Vector2(r, y));

export function montarBronzeECripta(mundo, m, bronze, luzes) {
  const torre = mundo.setores.get('torre');
  montarSino(torre, m, bronze);
  velasDaParede(torre, m, bronze, luzes.torre, 1);
  const cripta = mundo.setores.get('cripta');
  montarUrnas(mundo, cripta, m);
  velasDaParede(cripta, m, bronze, luzes.cripta, -1);
}

function montarSino(grupo, m, ferragens) {
  const bronze = retro(new THREE.MeshPhongMaterial({
    map: texturas().bronzeSino, color: 0xe3c9a8, specular: 0x796046,
    shininess: 23, emissive: 0x1b120b,
  }));
  const sino = new THREE.Group();
  sino.position.set(18.8, 10.28, 13.1);
  const metal = juntarPorMaterial();
  // O perfil volta por dentro da boca para dar espessura real à fundição.
  const corpo = new THREE.LatheGeometry(perfil([
    [0.82, 0], [0.92, -0.017], [0.95, 0.025], [0.924, 0.092],
    [0.872, 0.148], [0.72, 0.28], [0.58, 0.5], [0.465, 0.88],
    [0.397, 1.056], [0.284, 1.174], [0.154, 1.243], [0, 1.243],
    [0, 1.136], [0.31, 1.06], [0.44, 0.86], [0.51, 0.49],
    [0.64, 0.25], [0.786, 0.108], [0.82, 0],
  ]), 24);
  metal.geometria(corpo, bronze);
  for (const [raio, y, secao] of [[0.932, 0.039, 0.021], [0.86, 0.159, 0.017], [0.477, 0.844, 0.017]]) {
    const aro = new THREE.TorusGeometry(raio, secao, 5, 24).rotateX(Math.PI / 2);
    metal.geometria(aro.translate(0, y, 0), bronze);
  }
  metal.geometria(new THREE.CylinderGeometry(0.049, 0.06, 0.58, 8).translate(0, 0.164, 0), ferragens);
  metal.geometria(new THREE.SphereGeometry(0.122, 10, 6).scale(0.83, 1.1, 0.83).translate(0, -0.136, 0), ferragens);
  metal.montar(sino, 'Sino e badalo');
  grupo.add(sino);

  const madeira = juntarPorMaterial();
  madeira.caixa(18, 12.7, 13.1, 7.63, 0.34, 0.36, m.madeiraEscura);
  madeira.caixa(18.8, 11.92, 13.1, 1.18, 0.31, 0.42, m.madeira);
  madeira.caixa(18.8, 12.24, 13.1, 0.27, 0.77, 0.28, m.madeiraEscura);
  for (const x of [18.45, 19.15]) {
    madeira.caixa(x, 11.519, 13.1, 0.086, 0.66, 0.065, ferragens);
    madeira.caixa(x, 11.93, 13.1, 0.10, 0.33, 0.45, ferragens);
  }
  for (const lado of [-1, 1]) {
    const xParede = 18 + lado * 3.69;
    madeira.caixa(xParede, 12.05, 13.1, 0.24, 1.41, 0.49, m.cantariaVeu);
    const escora = new THREE.BoxGeometry(1.55, 0.20, 0.25).rotateZ(-lado * 0.58);
    madeira.geometria(escora.translate(xParede - lado * 0.64, 12.21, 13.1), m.madeiraEscura);
    madeira.caixa(xParede - lado * 0.63, 12.7, 13.1, 0.10, 0.358, 0.384, ferragens);
  }
  const fibra = retro(new THREE.MeshLambertMaterial({ color: 0xb18f63 }));
  for (const deslocamento of [-0.018, 0.017]) {
    const corda = new THREE.CatmullRomCurve3([
      new THREE.Vector3(18.8 + deslocamento, 10.05, 13.1),
      new THREE.Vector3(18.78 + deslocamento, 9.92, 13.13),
      new THREE.Vector3(18.81 + deslocamento * 2, 9.76, 13.16),
    ]);
    madeira.geometria(new THREE.TubeGeometry(corda, 7, 0.018, 5), fibra);
  }
  madeira.montar(grupo, 'Estrutura e cordas do sino');
}

function montarUrnas(mundo, grupo, m) {
  const t = texturas();
  const ceramica = retro(new THREE.MeshLambertMaterial({
    map: t.ceramicaCripta, emissiveMap: t.ceramicaCripta, emissive: 0xa88062, emissiveIntensity: 0.28,
  }));
  const alta = perfil([
    [0, 0], [0.24, 0], [0.26, 0.065], [0.37, 0.18], [0.42, 0.32],
    [0.395, 0.44], [0.30, 0.53], [0.26, 0.57], [0.305, 0.585], [0.31, 0.625],
    [0.28, 0.649], [0.27, 0.67], [0.225, 0.708], [0.13, 0.734], [0.067, 0.736], [0.062, 0.775], [0, 0.775],
  ]);
  const baixa = alta.map(({ x, y }) => new THREE.Vector2(x * (1 + 0.05 * Math.sin(y * 4)), y * 0.79));
  const altas = new THREE.InstancedMesh(new THREE.LatheGeometry(alta, 14), ceramica, 3);
  const baixas = new THREE.InstancedMesh(new THREE.LatheGeometry(baixa, 14), ceramica, 2);
  const matriz = new THREE.Matrix4();
  const corDoVaso = new THREE.Color();
  const kit = juntarPorMaterial();
  for (const [i, cor] of [0xc8ab9c, 0xd29270, 0xd6c7a9, 0x9eab9c, 0xbf9475].entries()) {
    const x = -23 + i * 2, z = 33.5 + (i % 2) * 0.25;
    const urnas = i % 2 === 0 ? altas : baixas;
    const indice = Math.floor(i / 2);
    matriz.makeRotationY(i * 1.2).setPosition(x, -3.965, z);
    urnas.setMatrixAt(indice, matriz);
    urnas.setColorAt(indice, corDoVaso.setHex(cor));
    mundo.colisores.adicionar(x, z, 0.9, 0.9, -3.2, -4);
    kit.caixa(x, -3.9825, z, 0.86, 0.035, 0.86, m.espelhoGaleria);
  }
  grupo.add(altas, baixas);

  // Friso baixo atrás da fileira. Os pilares curtos ficam entre as urnas,
  // e a parede acima do friso deixa livre a placa da contagem.
  kit.caixa(-19, -3.965, 34.68, 10.75, 0.07, 0.15, m.cantariaUmidaVeu);
  kit.caixa(-19, -2.84, 34.67, 10.75, 0.14, 0.19, m.quinaGaleria);
  for (const x of [-24, -22, -20, -18, -16, -14]) {
    kit.caixa(x, -3.4, 34.67, 0.19, 1.06, 0.18, m.cantariaVeu);
    kit.caixa(x, -3.889, 34.65, 0.30, 0.14, 0.22, m.cantariaUmidaVeu);
    kit.caixa(x, -2.975, 34.65, 0.28, 0.13, 0.22, m.cantariaVeu);
  }
  kit.montar(grupo, 'Cantaria da fileira de urnas');
}

function velasDaParede(grupo, m, bronze, { x, y, z, cor, intensidade, alcance }, rumo) {
  const kit = juntarPorMaterial();
  kit.caixa(x, y - 0.067, z + rumo * 0.13, 0.61, 0.135, 0.35, bronze);
  kit.caixa(x, y - 0.225, z + rumo * 0.05, 0.21, 0.22, 0.13, m.cantariaVeu);
  for (const [dx, altura] of [[-0.15, 0.19], [0.08, 0.26], [0.22, 0.135]]) {
    const cz = z + rumo * 0.21;
    const vela = new THREE.CylinderGeometry(0.037, 0.048, altura, 6);
    kit.geometria(vela.translate(x + dx, y + altura / 2, cz), m.cantariaVeu);
    const chama = new THREE.OctahedronGeometry(0.047).scale(0.62, 1.2, 0.62);
    kit.geometria(chama.translate(x + dx, y + altura + 0.054, cz), m.chama);
  }
  kit.montar(grupo, 'Velas de parede');
  const luz = new THREE.PointLight(cor, intensidade, alcance);
  luz.position.set(x, y + 0.62, z + rumo * 0.81);
  grupo.add(luz);
}
