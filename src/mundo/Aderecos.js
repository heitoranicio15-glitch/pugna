import * as THREE from 'three';
import { caixa, materiais } from './pecas.js';
import { retro } from '../render/retro.js';

export function bloco(grupo, mat, x, y, z, l, a, p) {
  const malha = caixa(l, a, p, mat, 1.25);
  malha.position.set(x, y, z);
  grupo.add(malha);
  return malha;
}

export function placa(grupo, texto, x, y, z, largura, rotacao = 0) {
  const tela = document.createElement('canvas');
  tela.width = 256;
  tela.height = 64;
  const ctx = tela.getContext('2d');
  ctx.fillStyle = '#27202d';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#957457';
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, 246, 54);
  ctx.fillStyle = '#f3d4a4';
  ctx.font = 'bold 30px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 128, 34, 226);
  const textura = new THREE.CanvasTexture(tela);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = THREE.NearestFilter;
  const material = retro(new THREE.MeshBasicMaterial({ map: textura }));
  const malha = new THREE.Mesh(new THREE.PlaneGeometry(largura, largura / 4), material);
  malha.position.set(x, y, z);
  malha.rotation.y = rotacao;
  grupo.add(malha);
}

export function frasco(grupo, x, y, z) {
  const g = new THREE.Group();
  const vidro = retro(new THREE.MeshLambertMaterial({ color: 0xbd5066, emissive: 0x421324 }));
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.073, 0.13, 0.21, 7), vidro);
  corpo.position.y = 0.105;
  g.add(corpo);
  bloco(g, materiais().madeira, 0, 0.23, 0, 0.1, 0.065, 0.1);
  g.position.set(x, y, z);
  grupo.add(g);
  return g;
}

export function chave(grupo, x, y, z) {
  const g = new THREE.Group();
  const ouro = retro(new THREE.MeshLambertMaterial({ color: 0xd5a35c, emissive: 0x50301a }));
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.019, 5, 8), ouro);
  aro.position.x = -0.09;
  g.add(aro);
  bloco(g, ouro, 0.056, 0, 0, 0.16, 0.036, 0.035);
  bloco(g, ouro, 0.12, -0.045, 0, 0.04, 0.075, 0.035);
  g.position.set(x, y, z);
  g.rotation.z = 0.33;
  grupo.add(g);
  return g;
}

/** Montinho de ossos claros (o Osso de Retorno, antes de ser recolhido). */
export function ossos(grupo, x, y, z) {
  const g = new THREE.Group();
  const marfim = retro(new THREE.MeshLambertMaterial({ color: 0xd9d2bd, emissive: 0x3a3a52 }));
  for (const [dx, dz, giro, comprimento] of [[0, 0, 0.4, 0.5], [0.05, 0.04, -0.9, 0.42], [-0.04, -0.03, 1.9, 0.36]]) {
    const osso = bloco(g, marfim, dx, 0.04, dz, comprimento, 0.07, 0.07);
    osso.rotation.y = giro;
    for (const ponta of [-1, 1]) {
      const no = bloco(g, marfim, dx + Math.cos(giro) * ponta * comprimento / 2, 0.045, dz - Math.sin(giro) * ponta * comprimento / 2, 0.12, 0.1, 0.12);
      no.rotation.y = giro;
    }
  }
  g.position.set(x, y, z);
  grupo.add(g);
  return g;
}
