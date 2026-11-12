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
    const lamina = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.95, 0.014), aco); lamina.position.y = 0.6;
    const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.039, 0.12, 4), aco); ponta.position.y = 1.135; ponta.scale.z = 0.3; ponta.rotation.y = Math.PI / 4;
    const guarda = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.045), escuro); guarda.position.y = 0.115;
    const cabo = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.035), couro);
    const pomo = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.06), escuro); pomo.position.y = -0.12;
    const mao = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.12, 0.1), escuro); mao.position.set(0, 0.0, 0.01);
    const braco = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.42), escuro); braco.position.set(0.0, -0.06, 0.26);
    this.espada.add(lamina, ponta, guarda, cabo, pomo, mao, braco);
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
    if (jogador.morto || jogador.acao === 'atordoado') { pose = POSES.atordoado; rapidez = 10; }
    else if (jogador.tEsquiva > 0) { pose = POSES.esquiva; rapidez = 14; }
    else if (jogador.carregando) { pose = jogador.tCarga > 0.12 ? POSES.carregar : (alt ? POSES.leveErguer : POSES.leveErguer2); rapidez = 9; }
    else if (jogador.acao === 'preparo') { pose = jogador.ataque === 'forte' ? POSES.carregar : (alt ? POSES.leveErguer : POSES.leveErguer2); rapidez = 24; }
    else if (jogador.acao === 'ativo' || (jogador.acao === 'recuperacao' && jogador.tAcao < 0.12)) {
      pose = jogador.ataque === 'forte' ? POSES.forteFim : (alt ? POSES.leveFim : POSES.leveFim2); rapidez = 34;
    }
    else if (jogador.acao === 'recuperacao') { rapidez = jogador.ataque === 'forte' ? 4.5 : 7; }
    else if (jogador.bloqueando) { pose = POSES.bloqueio; rapidez = 20; }

    const k = 1 - Math.exp(-dt * rapidez);
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
