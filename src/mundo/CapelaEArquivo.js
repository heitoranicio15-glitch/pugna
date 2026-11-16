import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { arcoOgival, juntarPorMaterial } from './pecas.js';

export function montarCapelaEArquivo(mundo, m, bronze, luzes) {
  for (const [sala, x, montar] of [['capela', -34, memorial], ['arquivo', 34, estantes]]) {
    const grupo = mundo.setores.get(sala);
    const kit = juntarPorMaterial();
    montar(kit, x, m, bronze);
    mesa(kit, x, -13, m, bronze, sala === 'arquivo');
    for (const [dx, altura] of [[-1.02, 0.22], [-0.81, 0.37], [1.02, 0.27]]) {
      vela(kit, x + dx, -13.19, altura, m, bronze);
    }
    kit.montar(grupo, 'Mobiliário e registro do ' + sala);
    mundo.colisores.adicionar(x, -13, 3, 1.25, 1);

    const { cor, intensidade, alcance } = luzes[sala];
    const luz = new THREE.PointLight(cor, intensidade, alcance);
    luz.position.set(x - 0.62, 2.02, -12.65);
    grupo.add(luz);
  }
}

function memorial(kit, x, m, bronze) {
  const z = -16.65;
  kit.caixa(x, 1.98, z, 2.02, 2.72, 0.16, m.cantariaUmidaVeu);
  kit.caixa(x, 0.66, z + 0.048, 2.35, 0.18, 0.20, m.quinaGaleria);
  kit.caixa(x, 3.36, z + 0.048, 2.34, 0.16, 0.21, m.cantariaVeu);
  for (const lado of [-1, 1]) {
    kit.caixa(x + lado * 1.07, 2.02, z + 0.02, 0.20, 2.60, 0.23, m.cantariaVeu);
    kit.caixa(x + lado * 1.07, 3.22, z + 0.038, 0.28, 0.13, 0.24, m.quinaGaleria);
  }
  const arco = arcoOgival(2.1, 0.76, 0.16, 0.24, m.cantariaVeu);
  kit.geometria(arco.geometry.translate(x, 3.40, z + 0.01), m.cantariaVeu);
  for (const [raio, espessura] of [[0.36, 0.021], [0.23, 0.012]]) {
    kit.geometria(new THREE.TorusGeometry(raio, espessura, 5, 16).translate(x, 2.80, z + 0.12), bronze);
  }
  kit.geometria(new THREE.OctahedronGeometry(0.13).scale(0.83, 1.3, 0.30)
    .translate(x, 2.8, z + 0.115), bronze);
  // Fileiras incisas sugerem os nomes já mencionados no registro.
  for (const [i, largura] of [1.21, 1.06, 1.36, 0.99, 1.24, 0.82].entries()) {
    kit.caixa(x, 2.18 - i * 0.177, z + 0.082, largura, 0.023, 0.012, m.pedraEscura);
  }
}

function estantes(kit, x, m, bronze) {
  const z = -16.58;
  const lombadas = [0x784c40, 0x635b7d, 0x48605a, 0x986937].map(color =>
    retro(new THREE.MeshLambertMaterial({ map: m.madeira.map, color, emissive: 0x14100d })));
  kit.caixa(x, 1.94, z - 0.13, 5.06, 3, 0.08, m.madeiraEscura);
  for (const dx of [-2.47, -0.82, 0.82, 2.47]) {
    kit.caixa(x + dx, 1.94, z + 0.01, 0.115, 3.04, 0.34, m.madeira);
  }
  for (const [andar, y] of [0.61, 1.31, 2.05, 2.78, 3.46].entries()) {
    kit.caixa(x, y, z, 5.04, 0.089, 0.36, m.madeiraEscura);
    if (andar === 4) break;
    for (let vao = 0; vao < 3; vao++) {
      const inicio = x + (vao - 1) * 1.645 - 0.58;
      for (let livro = 0; livro < 6; livro++) {
        const indice = andar * 11 + vao * 7 + livro;
        if (indice % 7 === 0) continue;
        const altura = 0.25 + (indice % 5) * 0.071;
        const largura = 0.105 + (indice % 4) * 0.027;
        const bx = inicio + livro * 0.216;
        const base = y + 0.0445;
        kit.caixa(bx, base + altura / 2, z + 0.025, largura, altura, 0.216, lombadas[indice % 4]);
        kit.caixa(bx, base + altura * 0.22, z + 0.137, largura * 0.86, 0.025, 0.014, bronze);
      }
    }
  }
}

function mesa(kit, x, z, m, bronze, arquivo) {
  const corpo = arquivo ? m.madeiraEscura : m.cantariaUmidaVeu;
  const tampo = arquivo ? m.madeira : m.quinaGaleria;
  kit.caixa(x, 0.93, z, 3, 0.14, 1.25, tampo);
  kit.caixa(x, 0.826, z, 2.76, 0.095, 1.10, corpo);
  for (const dx of [-1.05, 1.05]) {
    kit.caixa(x + dx, 0.10, z, 0.58, 0.20, 0.99, corpo);
    kit.caixa(x + dx, 0.48, z, 0.38, 0.71, 0.74, corpo);
  }
  kit.caixa(x, 0.53, z - 0.29, 2.42, 0.32, 0.12, corpo);
  kit.caixa(x, 1.023, z - 0.12, 0.65, 0.046, 0.43, bronze, 0.16);
  kit.caixa(x, 1.065, z - 0.12, 0.59, 0.062, 0.37, m.quinaGaleria, 0.16);
  kit.caixa(x, 1.104, z - 0.12, 0.65, 0.023, 0.43, m.madeiraEscura, 0.16);
}

function vela(kit, x, z, altura, m, bronze) {
  kit.geometria(new THREE.CylinderGeometry(0.074, 0.114, 0.062, 7)
    .translate(x, 1.031, z), bronze);
  kit.geometria(new THREE.CylinderGeometry(0.034, 0.043, altura, 7)
    .translate(x, 1.062 + altura / 2, z), m.quinaGaleria);
  kit.geometria(new THREE.OctahedronGeometry(0.045).scale(0.65, 1.45, 0.65)
    .translate(x, 1.096 + altura, z), m.chama);
}
