// =============================================================================
//  A ESPADA NA TELA (o que o jogador vê da própria arma)
//  É desenhada numa cena separada, por cima do mundo, para nunca atravessar
//  paredes. Este arquivo só ANIMA: quem decide o que acontece é o Jogador.js.
// =============================================================================
import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';
import { CONFIG } from '../config.js';

// Poses: posição [x, y, z] e rotação [x, y, z] da espada em relação à câmera.
const POSES = {
  repouso:      { p: [0.34, -0.36, -0.6], r: [-0.8, -0.1, 0.16] },
  leveErguer:   { p: [0.52, -0.08, -0.5],  r: [0.35, 0.2, -0.75] },
  leveFim:      { p: [-0.26, -0.42, -0.66], r: [-1.35, 0.2, 1.25] },
  leveErguer2:  { p: [-0.1, -0.05, -0.5],  r: [0.3, -0.2, 0.9] },
  leveFim2:     { p: [0.5, -0.46, -0.66],  r: [-1.35, -0.2, -0.9] },
  carregar:     { p: [0.42, 0.08, -0.58],  r: [0.9, 0.0, -0.3] },
  forteFim:     { p: [0.0, -0.62, -0.72],  r: [-1.75, 0.0, 0.2] },
  bloqueio:     { p: [0.02, -0.2, -0.5],   r: [-0.25, 0.0, 1.32] },
  atordoado:    { p: [0.42, -0.6, -0.55],  r: [-0.9, -0.4, -0.5] },
  esquiva:      { p: [0.42, -0.5, -0.55],  r: [-0.9, -0.3, 0.1] },
};

const CORTE = {
  leve: { p: [0.13, -0.2, -0.79], r: [-0.75, 0.07, 0.76] },
  forte: { p: [0.06, -0.1, -0.78], r: [-0.64, 0, 0.12] },
};

export class Arma {
  constructor() {
    this.cena = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.01, 10);
    this.cena.add(new THREE.AmbientLight(0x6a6ae8, 2.2));
    const luz = new THREE.DirectionalLight(0xa9b8ff, 2.0); luz.position.set(-0.5, 1, 0.6); this.cena.add(luz);
    // Luz quente que acende perto de tochas (controlada pelo Jogo).
    this.luzFogo = new THREE.PointLight(CONFIG.paleta.fogo, 0, 4); this.luzFogo.position.set(0.3, 0.3, 0.2); this.cena.add(this.luzFogo);

    const t = texturas();
    const aco = retro(new THREE.MeshLambertMaterial({ map: t.metal, color: 0xdfe4ff }));
    const escuro = retro(new THREE.MeshLambertMaterial({ map: t.metal, color: 0x5a5a8a }));
    const couro = retro(new THREE.MeshLambertMaterial({ map: t.madeira }));

    this.espada = new THREE.Group();
    const laminaGeo = new THREE.CylinderGeometry(0.021, 0.051, 0.94, 4);
    const lamina = new THREE.Mesh(laminaGeo, aco); lamina.position.y = 0.6; lamina.scale.z = 0.3;
    const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.021, 0.15, 4), aco); ponta.position.y = 1.145; ponta.scale.z = 0.3;
    const guarda = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.046), escuro); guarda.position.y = 0.115;
    const cabo = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.035), couro);
    const pomo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.037), escuro); pomo.position.y = -0.12;
    const mao = new THREE.Mesh(new THREE.IcosahedronGeometry(0.083, 1), couro);
    mao.scale.set(0.69, 0.92, 0.8);
    mao.position.set(0, 0, 0.028);
    const braco = new THREE.Mesh(new THREE.CylinderGeometry(0.061, 0.085, 0.43, 6), escuro);
    braco.rotation.x = Math.PI / 2;
    braco.position.set(0, -0.038, 0.265);
    this.espada.add(lamina, ponta, guarda, cabo, pomo, mao, braco);
    for (const lado of [-1, 1]) {
      const quilon = new THREE.Mesh(new THREE.ConeGeometry(0.029, 0.11, 4), escuro);
      quilon.position.set(lado * 0.132, 0.13, 0);
      quilon.rotation.z = -lado * 1.18;
      this.espada.add(quilon);
    }
    for (let i = 0; i < 4; i++) {
      const dedo = new THREE.Mesh(new THREE.BoxGeometry(0.049, 0.023, 0.046), couro);
      dedo.position.set(0.024, i * 0.024 - 0.034, -0.025);
      dedo.rotation.z = -0.25;
      this.espada.add(dedo);
    }
    this.espada.scale.setScalar(0.66);
    this.cena.add(this.espada);

    this.pos = new THREE.Vector3(...POSES.repouso.p);
    this.rot = new THREE.Vector3(...POSES.repouso.r);
  }

  atualizar(dt, jogador, proporcao) {
    this.camera.aspect = proporcao; this.camera.updateProjectionMatrix();

    // Escolhe a pose-alvo e a velocidade conforme o que o jogador está fazendo.
    let pose = POSES.repouso, rapidez = 9;
    const alt = jogador.golpeAlternado;
    const forte = jogador.ataque === 'forte';
    const inicio = forte ? POSES.carregar : (alt ? POSES.leveErguer : POSES.leveErguer2);
    const fim = forte ? POSES.forteFim : (alt ? POSES.leveFim : POSES.leveFim2);
    const golpe = CONFIG.combate[jogador.ataque];
    const emCorte = !jogador.morto && (jogador.acao === 'ativo' ||
      (jogador.acao === 'recuperacao' && jogador.tAcao < 0.075));
    if (jogador.morto || jogador.acao === 'atordoado') { pose = POSES.atordoado; rapidez = 10; }
    else if (jogador.tEsquiva > 0) { pose = POSES.esquiva; rapidez = 14; }
    else if (jogador.acao === 'preparo') { pose = inicio; rapidez = 42; }
    else if (emCorte) {
      const progresso = jogador.contatoParede ?? (jogador.acao === 'ativo' ? jogador.tAcao / golpe.ativo : 1);
      const meio = forte ? CORTE.forte : CORTE.leve;
      const pMeio = !forte && !alt ? [-meio.p[0], meio.p[1], meio.p[2]] : meio.p;
      const rMeio = !forte && !alt ? [meio.r[0], -meio.r[1], -meio.r[2]] : meio.r;
      const t = progresso <= 0.5 ? progresso * 2 : (progresso - 0.5) * 2;
      const interp = (a, b, c) => (progresso <= 0.5 ? a + (b - a) * t : b + (c - b) * t);
      pose = {
        p: inicio.p.map((v, i) => interp(v, pMeio[i], fim.p[i])),
        r: inicio.r.map((v, i) => interp(v, rMeio[i], fim.r[i])),
      };
    }
    else if (jogador.acao === 'recuperacao') { rapidez = jogador.ataque === 'forte' ? 4.5 : 7; }
    else if (jogador.carregando) { pose = jogador.tCarga > 0.12 ? POSES.carregar : (alt ? POSES.leveErguer2 : POSES.leveErguer); rapidez = 14; }
    else if (jogador.bloqueando) { pose = POSES.bloqueio; rapidez = 20; }

    const k = emCorte ? 1 : 1 - Math.exp(-dt * rapidez);
    this.pos.x += (pose.p[0] - this.pos.x) * k; this.pos.y += (pose.p[1] - this.pos.y) * k; this.pos.z += (pose.p[2] - this.pos.z) * k;
    this.rot.x += (pose.r[0] - this.rot.x) * k; this.rot.y += (pose.r[1] - this.rot.y) * k; this.rot.z += (pose.r[2] - this.rot.z) * k;

    // Balanço com os passos + tremedeira ao carregar o golpe forte.
    const v = Math.min(1, Math.hypot(jogador.vel.x, jogador.vel.z) / CONFIG.jogador.velCorrer);
    const bx = Math.cos(jogador.fasePasso) * 0.018 * v, by = -Math.abs(Math.sin(jogador.fasePasso)) * 0.022 * v;
    const tremer = jogador.carregando && jogador.tCarga > CONFIG.combate.tempoSegurarForte ? 0.006 : 0;
    this.espada.position.set(
      this.pos.x + bx + (Math.random() - 0.5) * tremer,
      this.pos.y + by + (Math.random() - 0.5) * tremer - (jogador.vel.y || 0) * 0.008,
      this.pos.z,
    );
    this.espada.rotation.set(this.rot.x, this.rot.y, this.rot.z);
  }
}
