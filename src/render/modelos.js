import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../config.js';
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
// Metros por repetição de cada acabamento HD: o mesmo das peças do jogo (CONFIG.arte.ladrilho).
const FAMILIA_DA_SUPERFICIE = { castle_wall_slates: 'pedra', old_planks_02: 'madeira', roof_slates_02: 'telhado' };

/**
 * Refaz o UV de uma malha importada projetando cada triângulo no plano da sua face,
 * em METROS já com a escala do encaixe. Assim a textura fica do mesmo tamanho numa
 * caixa de 1 m e num muro de 10 m, e não estica quando o modelo é encaixado com escala
 * diferente em cada eixo. `matriz` leva os vértices da malha ao espaço do encaixe.
 */
function projetarUv(geometria, matriz, superficie) {
  if (!projecoes.has(geometria)) projecoes.set(geometria, new Map());
  const porEscala = projecoes.get(geometria);
  const chave = `${superficie}:${matriz.elements.map(v => v.toFixed(4)).join(',')}`;
  if (!porEscala.has(chave)) {
    const geo = geometria.index ? geometria.toNonIndexed() : geometria.clone();
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    const ladrilho = CONFIG.arte.ladrilho[FAMILIA_DA_SUPERFICIE[superficie]] ?? 2;
    const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const ab = new THREE.Vector3(), ac = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, i + k).applyMatrix4(matriz);
      const n = ab.subVectors(v[1], v[0]).cross(ac.subVectors(v[2], v[0]));
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      for (let k = 0; k < 3; k++) {
        const p = v[k];
        // Parede virada para X usa (z, y); para Z usa (x, y); chão e teto usam (x, z).
        const [u, w] = ax >= ay && ax >= az ? [p.z, p.y] : az >= ay ? [p.x, p.y] : [p.x, p.z];
        uv[(i + k) * 2] = u / ladrilho;
        uv[(i + k) * 2 + 1] = w / ladrilho;
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    porEscala.set(chave, geo);
  }
  return porEscala.get(chave);
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
  // Medidas do encaixe, para os testes conferirem onde cada adereço ficou (tests/aderecos.test.js).
  encaixe.userData.modelo = { id, tamanho };
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
    suporte.updateMatrixWorld(true);   // ainda sem pai: matrixWorld = escala do encaixe × nós do modelo
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
        if (superficie) malha.geometry = projetarUv(malha.geometry, malha.matrixWorld, superficie);
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
