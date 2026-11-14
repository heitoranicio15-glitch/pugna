import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { carregarModelo } from '../render/modelos.js';
import { retro } from '../render/retro.js';

const KAYKIT = {
  tronco: 'chest', cabeca: 'head', bracoD: 'upperarm.r', bracoE: 'upperarm.l',
  pernaD: 'upperleg.r', pernaE: 'upperleg.l', maoD: 'hand.r', maoE: 'hand.l',
};
const QUATERNIUS = {
  tronco: 'Torso', cabeca: 'Head', bracoD: 'UpperArm.R', bracoE: 'UpperArm.L',
  pernaD: 'UpperLeg.R', pernaE: 'UpperLeg.L', maoD: 'Middle1.R', maoE: 'Middle1.L',
};
const PERFIS = {
  'cacador-pugna': { altura: 2.13, cor: 0xa7a2bd, rig: QUATERNIUS, brilho: 0.24 },
  'taverneiro-pugna': { altura: 2.02, cor: 0xc8b5a3, rig: QUATERNIUS, brilho: 0.15 },
  'penitente-pugna': { altura: 2.05, cor: 0xa380a5, rig: KAYKIT, brilho: 0.11 },
  'vigia-pugna': { altura: 2.13, cor: 0x9395bb, rig: KAYKIT, brilho: 0.11 },
  'cavaleiro-pugna': { altura: 2.04, cor: 0xa7abd0, rig: { ...QUATERNIUS, maoD: 'MiddleHand.R', maoE: 'MiddleHand.L' }, brilho: 0.11 },
  'guardiao-pugna': { altura: 2.19, cor: 0xc8ad76, rig: KAYKIT, brilho: 0.14 },
};

const q = new THREE.Quaternion(), e = new THREE.Euler();

/** Aplica o movimento dos pivôs do jogo nos eixos locais do esqueleto importado. */
function controlarOsso(osso, cena) {
  const repouso = osso.quaternion.clone();
  const eixos = osso.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
    .multiply(cena.getWorldQuaternion(new THREE.Quaternion()));
  const inverso = eixos.clone().invert();
  return (x, y, z) => {
    q.setFromEuler(e.set(x, y, z));
    osso.quaternion.copy(eixos).multiply(q).multiply(inverso).multiply(repouso);
  };
}

/** A mão movimenta o equipamento, mantendo a orientação de repouso definida pelo jogo. */
function equipar(osso, modelo, objeto, rotacao, deslocamento) {
  const encaixe = new THREE.Group();
  encaixe.position.copy(osso.worldToLocal(
    osso.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(...deslocamento)),
  ));
  encaixe.quaternion.copy(osso.getWorldQuaternion(new THREE.Quaternion()).invert())
    .multiply(modelo.getWorldQuaternion(new THREE.Quaternion()))
    .multiply(q.setFromEuler(e.set(...rotacao)));
  // O suporte inteiro já foi redimensionado para a altura do personagem.
  const escala = osso.getWorldScale(new THREE.Vector3());
  encaixe.scale.set(1 / escala.x, 1 / escala.y, 1 / escala.z);
  osso.add(encaixe);
  objeto.position.set(0, 0, 0);
  encaixe.add(objeto);
}

export function modeloDePersonagem(grupo, id, { reserva, armas = [], emissao, aoMontar } = {}) {
  const suporte = new THREE.Group();
  suporte.name = `Personagem: ${id}`;
  grupo.add(suporte);
  if (!import.meta.env || typeof window === 'undefined') return suporte;
  suporte.userData.pronto = carregarModelo(id).then(gltf => {
    if (!gltf) return false;
    const perfil = PERFIS[id];
    const cena = clone(gltf.scene);
    const ossos = Object.fromEntries(Object.entries(perfil.rig).map(([chave, nome]) => [chave, cena.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(nome))]));
    if (Object.values(ossos).some(osso => !osso) || !gltf.animations[0]) return false;
    const poseInicial = new THREE.AnimationMixer(cena);
    poseInicial.clipAction(gltf.animations[0]).play();
    poseInicial.update(0);
    cena.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(cena, true);
    const centro = caixa.getCenter(new THREE.Vector3());
    const escala = perfil.altura / (caixa.max.y - caixa.min.y);
    cena.scale.setScalar(escala);
    cena.position.set(-centro.x * escala, -caixa.min.y * escala, -centro.z * escala);
    cena.updateMatrixWorld(true);

    const materiais = new Map();
    cena.traverse(malha => {
      if (!malha.isMesh) return;
      const adaptar = original => {
        if (!materiais.has(original)) {
          const mat = retro(original.clone());
          mat.color.multiply(new THREE.Color(perfil.cor));
          mat.roughness = id === 'cavaleiro-pugna' ? 0.6 : 0.88;
          mat.emissive.copy(mat.color).multiplyScalar(perfil.brilho);
          mat.emissiveMap = mat.map;
          materiais.set(original, { mat, repouso: mat.emissive.clone() });
        }
        return materiais.get(original).mat;
      };
      malha.material = Array.isArray(malha.material) ? malha.material.map(adaptar) : adaptar(malha.material);
      if (malha.isSkinnedMesh) {
        malha.computeBoundingSphere();
        malha.boundingSphere.radius *= 1.7;
      }
    });
    suporte.userData.pose = Object.fromEntries(Object.entries(ossos).map(([chave, osso]) => [chave, controlarOsso(osso, cena)]));
    if (emissao) suporte.userData.clarao = () => {
      for (const { mat, repouso } of materiais.values()) mat.emissive.copy(repouso).add(emissao);
    };
    armas.forEach(([mao, arma, rotacao, deslocamento = [0, 0, 0]]) => {
      equipar(ossos[mao], cena, arma, rotacao, deslocamento);
    });
    aoMontar?.(ossos.cabeca);
    suporte.add(cena);
    for (const o of reserva) o.visible = false;
    return true;
  }).catch(erro => {
    console.warn(`PUGNA: falha ao montar personagem ${id}.`, erro);
    return false;
  });
  return suporte;
}
