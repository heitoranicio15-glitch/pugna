import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { retro } from './retro.js';
import { registrarTextura } from './texturas.js';
import { registrarMaterialHd } from './materiaisHd.js';

const modelos = new Map();
const tintas = new WeakMap();

export function carregarModelo(id) {
  if (!modelos.has(id)) {
    const loader = new GLTFLoader();
    modelos.set(id, loader.loadAsync(`${import.meta.env.BASE_URL}assets/modelos/${id}.glb`).then(gltf => {
      const texturas = new Set();
      gltf.scene.traverse(malha => {
        if (!malha.isMesh) return;
        for (const mat of [malha.material].flat()) {
          retro(mat);
          if (mat.map) texturas.add(mat.map);
        }
      });
      for (const mapa of texturas) {
        mapa.magFilter = THREE.NearestFilter;
        mapa.minFilter = mapa.generateMipmaps ? THREE.NearestMipmapLinearFilter : THREE.NearestFilter;
        registrarTextura(mapa);
      }
      return gltf;
    }).catch(erro => {
      console.warn(`PUGNA: modelo ${id} indisponível.`, erro);
      return null;
    }));
  }
  return modelos.get(id);
}

const projecoes = new WeakMap();

function projetarUv(geometria) {
  if (!projecoes.has(geometria)) {
    const geo = geometria.index ? geometria.toNonIndexed() : geometria.clone();
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1).sub(a);
      c.fromBufferAttribute(pos, i + 2).sub(a);
      const n = b.cross(c);
      // Os módulos FBX convertidos têm o eixo local Z apontando para cima.
      const eixo = Math.abs(n.z) > Math.max(Math.abs(n.x), Math.abs(n.y)) ? 2 : Math.abs(n.x) > Math.abs(n.y) ? 0 : 1;
      for (let j = i; j < i + 3; j++) {
        uv[j * 2] = (eixo === 0 ? pos.getY(j) : pos.getX(j)) * 95;
        uv[j * 2 + 1] = (eixo === 2 ? pos.getY(j) : pos.getZ(j)) * 95;
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    projecoes.set(geometria, geo);
  }
  return projecoes.get(geometria);
}

function acabamento(material, tinta, aceso, superficie) {
  const chave = `${tinta}:${aceso}:${superficie}`;
  if (!tintas.has(material)) tintas.set(material, new Map());
  const variantes = tintas.get(material);
  if (!variantes.has(chave)) {
    const mat = retro(material.clone());
    mat.color.multiply(new THREE.Color(tinta));
    if (aceso && /^Windows$/i.test(mat.name)) {
      mat.emissive.setHex(0xe3a25e);
      mat.emissiveIntensity = 0.52;
    }
    if (superficie) {
      const cor = new THREE.Color();
      mat.color.lerp(cor.setHex(superficie.startsWith('castle') ? 0xb0a8b2 : 0xb0a39d), 0.42);
      registrarMaterialHd(mat, superficie, 0.52);
    }
    variantes.set(chave, mat);
  }
  return variantes.get(chave);
}

/** Encaixa a malha pronta no volume local, a partir do centro da base.
 * A geometria de reserva permanece disponível se o arquivo não carregar.
 */
export function modeloPronto(grupo, id, {
  pos = [0, 0, 0], tamanho, rotacao = 0, orientacao = [0, 0, 0],
  tinta = 0xc2b7c0, aceso = false, material, reserva = [],
} = {}) {
  const encaixe = new THREE.Group();
  encaixe.name = `Modelo: ${id}`;
  encaixe.position.set(...pos);
  encaixe.rotation.y = rotacao;
  grupo.add(encaixe);
  // A montagem de mapas em Node também serve aos testes de navegação.
  if (!import.meta.env || typeof window === 'undefined') return encaixe;
  encaixe.userData.pronto = carregarModelo(id).then(gltf => {
    if (!gltf) return false;
    const o = gltf.scene.clone();
    o.rotation.set(...orientacao);
    const caixa = new THREE.Box3().setFromObject(o);
    const centro = caixa.getCenter(new THREE.Vector3());
    const dimensao = caixa.getSize(new THREE.Vector3());
    const escala = tamanho.map((valor, i) => valor / Math.max(1e-6, dimensao.getComponent(i)));
    o.position.set(-centro.x, -caixa.min.y, -centro.z);
    const suporte = new THREE.Group();
    suporte.scale.set(...escala);
    suporte.add(o);
    o.traverse(malha => {
      if (!malha.isMesh) return;
      const trocar = m => {
        const definido = material?.(m);
        if (definido) return definido;
        const n = m.name;
        let superficie;
        if (!m.map && /^RoofTiles/i.test(n)) superficie = 'roof_slates_02';
        if (!m.map && /Wood/i.test(n)) superficie = 'old_planks_02';
        if (!m.map && (/Stone|Rock|Plaster/i.test(n) || /^rgs-(?:muro|arcada|pilar|entulho)$/.test(id))) {
          if (!/black|yellow/i.test(n)) superficie = 'castle_wall_slates';
        }
        if (superficie) malha.geometry = projetarUv(malha.geometry);
        return acabamento(m, tinta, aceso, superficie);
      };
      malha.material = Array.isArray(malha.material) ? malha.material.map(trocar) : trocar(malha.material);
    });
    encaixe.add(suporte);
    for (const o of reserva) o.visible = false;
    return true;
  }).catch(erro => {
    console.warn(`PUGNA: falha no encaixe de ${id}.`, erro);
    return false;
  });
  return encaixe;
}
