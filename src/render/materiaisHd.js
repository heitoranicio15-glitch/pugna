import * as THREE from 'three';

const porMaterial = new WeakMap();
const mapasPorAsset = new Map();

/** Associa um acabamento HD a um material usado no PS1. */
export function registrarMaterialHd(material, asset, intensidade, { metalness = 0, preservarEmissao = false } = {}) {
  porMaterial.set(material, { asset, intensidade, metalness, preservarEmissao });
  return material;
}

function carregarMapas(asset) {
  if (!mapasPorAsset.has(asset)) {
    const loader = new THREE.TextureLoader();
    const carregar = async (nome, colorSpace) => {
      const textura = await loader.loadAsync(`${import.meta.env.BASE_URL}assets/materiais/${asset}/${nome}.webp`);
      textura.colorSpace = colorSpace;
      textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
      textura.anisotropy = 4;
      return textura;
    };
    mapasPorAsset.set(asset, Promise.all([
      carregar('diffuse', THREE.SRGBColorSpace),
      carregar('nor_gl', THREE.NoColorSpace),
      carregar('rough', THREE.NoColorSpace),
    ]).catch(() => {
      console.warn(`PUGNA: material HD indisponível (${asset}).`);
      return null;
    }));
  }
  return mapasPorAsset.get(asset);
}

async function criarVariante(material, { asset, intensidade, metalness, preservarEmissao }) {
  const mapas = await carregarMapas(asset);
  if (!mapas) return material;
  const [map, normalMap, roughnessMap] = mapas;
  const variante = new THREE.MeshStandardMaterial({
    map, normalMap, roughnessMap,
    normalScale: new THREE.Vector2(intensidade, intensidade),
    color: material.color, side: material.side, depthWrite: material.depthWrite,
    flatShading: material.flatShading ?? false,
    emissiveMap: material.emissiveMap ? map : null,
    roughness: 1, metalness,
  });
  // Avisos e clarões dos personagens animam o mesmo objeto Color nos dois modos.
  if (preservarEmissao) variante.emissive = material.emissive;
  return variante;
}

export class MateriaisHd {
  constructor(areas) {
    this.malhas = [];
    this.variantes = new Map();
    this.hd = false;
    for (const { grupo } of areas) {
      this.registrar(grupo);
      grupo.traverse(objeto => {
        const pronto = objeto.userData.pronto;
        if (pronto) pronto.then(carregado => { if (carregado) this.registrar(objeto); });
      });
    }
  }

  registrar(grupo) {
    grupo.traverse(malha => {
      if (!malha.isMesh) return;
      const original = malha.material;
      if (![original].flat().some(material => porMaterial.has(material))) return;
      const entrada = { malha, original };
      this.malhas.push(entrada);
      this.aplicar(entrada);
    });
  }

  definirEstilo(estilo) {
    const hd = estilo === 'hd';
    if (this.hd === hd) return;
    this.hd = hd;
    for (const entrada of this.malhas) this.aplicar(entrada);
  }

  aplicar(entrada) {
    if (!this.hd) entrada.malha.material = entrada.original;
    else if (entrada.variante) entrada.malha.material = entrada.variante;
    else {
      entrada.carregamento ??= this.carregar(entrada.original).then(material => {
        entrada.variante = material;
        if (this.hd) entrada.malha.material = material;
      });
    }
  }

  carregar(original) {
    const variante = (material) => {
      const descriptor = porMaterial.get(material);
      if (!descriptor) return material;
      if (!this.variantes.has(material)) {
        this.variantes.set(material, criarVariante(material, descriptor));
      }
      return this.variantes.get(material);
    };
    return Array.isArray(original) ? Promise.all(original.map(variante)) : Promise.resolve(variante(original));
  }
}
