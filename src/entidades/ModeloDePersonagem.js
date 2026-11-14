import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { carregarModelo } from '../render/modelos.js';
import { retro } from '../render/retro.js';

const HUMANOIDE = {
  tronco: 'Spine2', cabeca: 'Head', bracoD: 'RightArm', bracoE: 'LeftArm',
  pernaD: 'RightUpLeg', pernaE: 'LeftUpLeg', maoD: 'RightHand', maoE: 'LeftHand',
};
const PERFIS = {
  'scary-doctor': { altura: 2.05, cor: 0xfff2e9, rig: HUMANOIDE, brilho: 0.32 },
  'mulher-encapuzada': { altura: 1.96, cor: 0xe1e3ec, rig: { ...HUMANOIDE, tronco: 'Spine01' }, brilho: 0.19, corrida: true },
  'bruxo-cacador': { altura: 2.13, cor: 0xf4eaf0, rig: HUMANOIDE, brilho: 0.24 },
  'cavaleiro-negro': { altura: 2.16, cor: 0xf7f0e7, rig: HUMANOIDE, brilho: 0.21 },
  'alma-das-cinzas': {
    altura: 2.04, cor: 0xfff4e5, brilho: 0.24,
    rig: {
      tronco: 'spine_upper', cabeca: 'head_neck_upper',
      bracoD: 'arm_right_shoulder_2', bracoE: 'arm_left_shoulder_2',
      pernaD: 'leg_right_thigh', pernaE: 'leg_left_thigh',
      maoD: 'arm_right_wrist', maoE: 'arm_left_wrist',
    },
  },
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

export function modeloDePersonagem(grupo, id, { reserva = [], armas = [], emissao, tinta } = {}) {
  const suporte = new THREE.Group();
  suporte.name = `Personagem: ${id}`;
  grupo.add(suporte);
  if (!import.meta.env || typeof window === 'undefined') return suporte;
  suporte.userData.pronto = carregarModelo(id).then(gltf => {
    if (!gltf) return false;
    const perfil = PERFIS[id];
    const cena = clone(gltf.scene);
    const ossos = Object.fromEntries(Object.entries(perfil.rig).map(([chave, nome]) => [chave, cena.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(nome))]));
    if (Object.values(ossos).some(osso => !osso?.isBone)) return false;
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
          if (tinta !== undefined) mat.color.multiply(new THREE.Color(tinta));
          if (!mat.roughnessMap) mat.roughness = 0.88;
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
    if (perfil.corrida && gltf.animations[0]) {
      // A posição continua nas mãos da IA e dos colisores. Só o esqueleto corre.
      const original = gltf.animations[0];
      const clip = new THREE.AnimationClip(original.name, original.duration,
        original.tracks.filter(track => track.name.endsWith('.quaternion')));
      const mixer = new THREE.AnimationMixer(cena);
      const acao = mixer.clipAction(clip);
      suporte.userData.correr = (dt, velocidade) => {
        if (velocidade <= 0) { if (acao.isScheduled()) acao.stop(); return false; }
        acao.play().setEffectiveTimeScale(velocidade);
        mixer.update(dt);
        return true;
      };
    }
    if (emissao) suporte.userData.clarao = () => {
      for (const { mat, repouso } of materiais.values()) mat.emissive.copy(repouso).add(emissao);
    };
    armas.forEach(([mao, arma, rotacao, deslocamento = [0, 0, 0]]) => {
      equipar(ossos[mao], cena, arma, rotacao, deslocamento);
    });
    suporte.add(cena);
    for (const o of reserva) o.visible = false;
    return true;
  }).catch(erro => {
    console.warn(`PUGNA: falha ao montar personagem ${id}.`, erro);
    return false;
  });
  return suporte;
}
