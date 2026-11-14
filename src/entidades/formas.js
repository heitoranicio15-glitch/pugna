import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { registrarMaterialHd } from '../render/materiaisHd.js';

export function materialDePersonagem(map, color, {
  asset, normal = 0.5, metalness = 0, brilho = 0, side = THREE.FrontSide,
} = {}) {
  const material = retro(new THREE.MeshLambertMaterial({
    map, color, side,
    emissive: new THREE.Color(color).multiplyScalar(brilho),
    emissiveMap: brilho ? map : null,
  }));
  return asset ? registrarMaterialHd(material, asset, normal, { metalness, preservarEmissao: true }) : material;
}

export function parte(geometria, material, x = 0, y = 0, z = 0) {
  const malha = new THREE.Mesh(geometria, material);
  malha.position.set(x, y, z);
  return malha;
}

export function caixa(l, a, p, material, x, y, z) {
  return parte(new THREE.BoxGeometry(l, a, p), material, x, y, z);
}

/** A seção de cada anel é [altura, largura, profundidade, deslocamento em Z]. */
export function corpoFacetado(aneis, lados = 8, deslocamento = 0.5) {
  const pos = [], uv = [], indices = [];
  for (const [linha, [y, l, p, z = 0]] of aneis.entries()) {
    for (let i = 0; i <= lados; i++) {
      const angulo = (i % lados + deslocamento) * Math.PI * 2 / lados;
      pos.push(Math.sin(angulo) * l / 2, y, Math.cos(angulo) * p / 2 + z);
      uv.push(i / lados, linha / (aneis.length - 1));
      if (linha === 0 || i === lados) continue;
      const superior = linha * (lados + 1) + i;
      const inferior = superior - lados - 1;
      indices.push(inferior, inferior + 1, superior, inferior + 1, superior + 1, superior);
    }
  }
  for (const linha of [0, aneis.length - 1]) {
    const [y, l, p, z = 0] = aneis[linha];
    const centro = pos.length / 3;
    pos.push(0, y, z);
    uv.push(0.5, 0.5);
    for (let i = 0; i < lados; i++) {
      const canto = linha * (lados + 1) + i;
      const borda = pos.length / 3;
      for (const k of [canto, canto + 1]) {
        const [x, py, pz] = pos.slice(k * 3, k * 3 + 3);
        pos.push(x, py, pz);
        uv.push(0.5 + x / l, 0.5 + (pz - z) / p);
      }
      if (linha === 0) indices.push(centro, borda + 1, borda);
      else indices.push(centro, borda, borda + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  const faces = geo.toNonIndexed();
  geo.dispose();
  faces.computeVertexNormals();
  return faces;
}

/** Manto geométrico com pregas em Z e bainha irregular. A origem fica nos ombros. */
export function manto(material, largura, altura) {
  const pos = [], uv = [], indices = [];
  const colunas = 8;
  const barra = [0.89, 1, 0.96, 0.99, 0.87, 0.995, 0.93, 0.98, 0.86];
  for (let linha = 0; linha < 3; linha++) {
    const queda = linha / 2;
    for (let i = 0; i <= colunas; i++) {
      const u = i / colunas;
      const x = u * 2 - 1;
      const prega = Math.cos(i * Math.PI) * (0.012 + 0.022 * queda);
      pos.push(x * largura * (0.38 + 0.17 * queda), -altura * queda * barra[i],
        0.09 * x * x - 0.18 * queda + prega);
      uv.push(u, 1 - queda);
      if (linha === 0 || i === colunas) continue;
      const base = linha * (colunas + 1) + i, topo = base - colunas - 1;
      indices.push(topo, topo + 1, base, topo + 1, base + 1, base);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  const faces = geo.toNonIndexed();
  geo.dispose();
  faces.computeVertexNormals();
  return parte(faces, material);
}

/** Lâmina de seção losangular, com espinha e ponta no eixo +Z. */
export function lamina(material, largura, comprimento, espessura = 0.032) {
  const geo = corpoFacetado([
    [0.11, largura * 0.7, espessura], [0.18, largura, espessura],
    [0.11 + comprimento * 0.8, largura * 0.8, espessura * 0.85],
    [0.11 + comprimento, 0.002, 0.002],
  ], 4, 0);
  geo.rotateX(Math.PI / 2);
  return parte(geo, material);
}
