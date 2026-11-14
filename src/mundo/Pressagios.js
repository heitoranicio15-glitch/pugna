// =============================================================================
//  PRESSÁGIOS
//  Sustos pequenos e baratos para dar medo sem ser injusto: um bando de corvos
//  cruzando o céu, uma tocha que quase apaga, uma rajada que sussurra. Nada aqui
//  muda dano, inimigos ou colisões. Os intervalos ficam em CONFIG.medo.
//  O silêncio antes do inimigo fica no som (src/audio/Som.js, 'inimigo:alerta').
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const entre = ([a, b]) => a + Math.random() * (b - a);

let texturaCorvo = null;
/** Silhueta de pássaro de asas abertas (desenhada uma vez, 32 × 16). */
function corvo() {
  if (texturaCorvo) return texturaCorvo;
  const tela = document.createElement('canvas');
  tela.width = 32; tela.height = 16;
  const ctx = tela.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(1, 5); ctx.quadraticCurveTo(9, 1, 16, 9); ctx.quadraticCurveTo(23, 1, 31, 5);
  ctx.quadraticCurveTo(23, 5, 16, 13); ctx.quadraticCurveTo(9, 5, 1, 5);
  ctx.fill();
  texturaCorvo = new THREE.CanvasTexture(tela);
  texturaCorvo.magFilter = THREE.NearestFilter;
  texturaCorvo.colorSpace = THREE.SRGBColorSpace;
  return texturaCorvo;
}

export class Pressagios {
  constructor(jogo) {
    this.jogo = jogo;
    const M = CONFIG.medo;
    this.proximo = { corvos: entre(M.corvos.intervalo), tocha: entre(M.tochaFalha.intervalo), rajada: entre(M.rajada.intervalo) };
    this.bandos = [];
    this.falhas = [];
  }

  atualizar(dt) {
    const jogo = this.jogo, M = CONFIG.medo;
    if (jogo.estado !== 'jogando') return;
    for (const chave of Object.keys(this.proximo)) this.proximo[chave] -= dt;
    if (this.proximo.corvos <= 0) {
      this.proximo.corvos = entre(M.corvos.intervalo);
      if (jogo.mundo.usaCeu) this.soltarCorvos();
    }
    if (this.proximo.tocha <= 0) {
      this.proximo.tocha = entre(M.tochaFalha.intervalo);
      this.falharTocha();
    }
    if (this.proximo.rajada <= 0) {
      this.proximo.rajada = entre(M.rajada.intervalo);
      if (jogo.mundo.usaCeu) jogo.eventos.emitir('medo:rajada');
    }
    this.animarCorvos(dt);
    this.animarFalhas(dt);
  }

  /** Um bando atravessa o céu por cima do caçador, de um lado ao outro. */
  soltarCorvos() {
    const C = CONFIG.medo.corvos, p = this.jogo.jogador.pos;
    const ang = Math.random() * Math.PI * 2, lado = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
    const material = new THREE.SpriteMaterial({ map: corvo(), color: 0x05060c, transparent: true, depthWrite: false, fog: false });
    const n = Math.round(entre(C.quantidade)), altura = entre(C.altura);
    const sprites = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(material);
      s.userData.desvio = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 4, (Math.random() - 0.5) * 8);
      s.userData.fase = Math.random() * 6;
      this.jogo.cena.add(s);
      sprites.push(s);
    }
    this.bandos.push({
      sprites, material, t: 0, duracao: C.duracao,
      de: new THREE.Vector3(p.x, altura, p.z).addScaledVector(lado, -70),
      ate: new THREE.Vector3(p.x, altura + 6, p.z).addScaledVector(lado, 70),
    });
  }

  animarCorvos(dt) {
    for (const b of this.bandos) {
      b.t += dt;
      const k = b.t / b.duracao;
      for (const s of b.sprites) {
        s.position.lerpVectors(b.de, b.ate, k).add(s.userData.desvio);
        const asa = 0.45 + 0.55 * Math.abs(Math.sin(b.t * 13 + s.userData.fase));
        s.scale.set(1.4, 0.7 * asa, 1);
      }
    }
    for (const b of this.bandos.filter((b) => b.t >= b.duracao)) {
      for (const s of b.sprites) s.removeFromParent();
      b.material.dispose();
    }
    this.bandos = this.bandos.filter((b) => b.t < b.duracao);
  }

  /** Uma tocha perto do caçador quase apaga por um instante e volta tremendo. */
  falharTocha() {
    const C = CONFIG.medo.tochaFalha, p = this.jogo.jogador.pos;
    const perto = (this.jogo.mundo.tochas ?? []).filter((t) => t.luz && t.luz.getWorldPosition(new THREE.Vector3()).distanceTo(p) < C.alcance);
    if (!perto.length) return;
    const tocha = perto[Math.floor(Math.random() * perto.length)];
    this.falhas.push({ tocha, t: 0, duracao: C.duracao });
  }

  animarFalhas(dt) {
    for (const f of this.falhas) {
      f.t += dt;
      const k = f.t / f.duracao;
      f.tocha.falha = k >= 1 ? 0 : 0.85 * (1 - k * k) * (0.7 + 0.3 * Math.sin(f.t * 60));
    }
    this.falhas = this.falhas.filter((f) => f.t < f.duracao);
  }
}
