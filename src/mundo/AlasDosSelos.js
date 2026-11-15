import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';
import { juntarPorMaterial } from './pecas.js';

export function montarAlasDosSelos(mundo, m, bronze, luzes) {
  const estandarte = texturas().estandarteVeu;
  for (const { id: sala, x, z } of mundo.selos) {
    const grupo = mundo.setores.get(sala);
    const kit = juntarPorMaterial();
    const ossario = sala === 'ossario';
    const pedra = ossario ? m.cantariaUmidaVeu : m.cantariaVeu;
    const tecido = retro(new THREE.MeshLambertMaterial({
      map: estandarte, color: ossario ? 0xc27a69 : 0x779dc2,
      emissiveMap: estandarte, emissive: ossario ? 0xcb7f6e : 0x7da1ca, emissiveIntensity: 0.38,
    }));
    pedestal(kit, x, z, m.pedraEscura, pedra, bronze);
    mesa(kit, x, -15, pedra, m.pedraEscura, bronze);
    if (ossario) {
      const ceramica = retro(new THREE.MeshLambertMaterial({
        color: 0x9b6550, emissive: 0x2b170e,
      }));
      urnas(kit, x, -15.22, ceramica, bronze);
      velas(kit, x, z, bronze, m);
    } else {
      cofre(kit, x - 0.76, -15.27, m.madeira, bronze);
    }
    for (const apoio of [15.35, 20.55]) {
      pendurarEstandarte(kit, Math.sign(x) * apoio, tecido, bronze);
    }
    kit.montar(grupo, 'Mobiliário do ' + sala);

    const { cor, intensidade, alcance, y, z: zLuz } = luzes[sala];
    const luz = new THREE.PointLight(cor, intensidade, alcance);
    luz.position.set(x, y, zLuz);
    grupo.add(luz);
  }
}

function pedestal(kit, x, z, base, pedra, bronze) {
  // Degraus e frisos compartilham a projeção do pedestal original de 1,1 m.
  for (const [centro, altura, largura, material] of [
    [0.076, 0.152, 1.1, base],
    [0.197, 0.09, 0.96, pedra],
    [0.571, 0.658, 0.77, pedra],
    [0.924, 0.048, 0.88, bronze],
    [0.999, 0.102, 1.03, pedra],
  ]) {
    kit.caixa(x, centro, z, largura, altura, largura, material);
  }
  const aro = new THREE.TorusGeometry(0.275, 0.024, 5, 16).rotateX(Math.PI / 2);
  kit.geometria(aro.translate(x, 1.061, z), bronze);
}

function mesa(kit, x, z, pedra, base, bronze) {
  kit.caixa(x, 0.066, z, 3.25, 0.132, 1.16, base);
  kit.caixa(x, 0.364, z - 0.19, 2.78, 0.60, 0.78, base);
  kit.caixa(x, 0.697, z, 3.17, 0.066, 1.09, bronze);
  kit.caixa(x, 0.785, z, 3.4, 0.11, 1.25, pedra);
  for (const dx of [-1.17, 0, 1.17]) {
    kit.caixa(x + dx, 0.392, z + 0.14, 0.28, 0.52, 0.81, pedra);
  }
}

function urnas(kit, x, z, pedra, bronze) {
  const perfil = [[0, 0], [0.115, 0], [0.13, 0.065], [0.17, 0.17], [0.148, 0.25],
    [0.095, 0.31], [0.098, 0.345], [0.12, 0.355], [0.09, 0.384], [0, 0.384]]
    .map(([raio, y]) => new THREE.Vector2(raio, y));
  const corpo = new THREE.LatheGeometry(perfil, 10);
  const friso = new THREE.TorusGeometry(0.119, 0.011, 4, 10).rotateX(Math.PI / 2);
  for (const [dx, escala] of [[-0.96, 0.86], [-0.51, 1.2], [0.89, 1.05]]) {
    kit.geometria(corpo.clone().scale(escala, escala, escala).translate(x + dx, 0.84, z), pedra);
    kit.geometria(friso.clone().scale(escala, escala, escala).translate(x + dx, 0.84 + 0.354 * escala, z), bronze);
  }
  corpo.dispose();
  friso.dispose();
}

function velas(kit, x, z, bronze, m) {
  for (const [dx, h] of [[-0.42, 0.21], [0.42, 0.28]]) {
    kit.caixa(x + dx, 1.065, z + 0.37, 0.14, 0.03, 0.14, bronze);
    kit.caixa(x + dx, 1.08 + h / 2, z + 0.37, 0.075, h, 0.075, m.cantariaVeu);
    const chama = new THREE.OctahedronGeometry(0.048).scale(0.6, 1.35, 0.6);
    kit.geometria(chama.translate(x + dx, 1.12 + h, z + 0.37), m.chama);
  }
}

function cofre(kit, x, z, madeira, bronze) {
  kit.caixa(x, 0.958, z, 1.03, 0.236, 0.5, madeira);
  kit.caixa(x, 1.11, z, 1.08, 0.07, 0.545, bronze);
  kit.caixa(x, 1.174, z, 0.91, 0.058, 0.405, madeira);
  kit.caixa(x, 1.054, z + 0.26, 0.12, 0.13, 0.032, bronze);
  for (const dx of [-0.417, 0.417]) {
    kit.caixa(x + dx, 0.966, z + 0.255, 0.049, 0.25, 0.025, bronze);
  }
}

function pendurarEstandarte(kit, x, tecido, bronze) {
  const z = -16.59;
  const y = 3.57;
  const altura = 2.24;
  const pano = new THREE.PlaneGeometry(0.92, altura, 8, 6);
  const vertices = pano.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const u = vertices.getX(i);
    const v = vertices.getY(i);
    const queda = 0.5 - v / altura;
    vertices.setY(i, v + Math.max(0, 0.19 - Math.abs(u) * 0.55) * queda ** 8);
    vertices.setZ(i, Math.cos(u * 15) * (0.015 + 0.03 * queda));
  }
  pano.computeVertexNormals();
  kit.geometria(pano.translate(x, y, z), tecido);
  kit.caixa(x, y + altura / 2, z, 1.12, 0.05, 0.075, bronze);
}
