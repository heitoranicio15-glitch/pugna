import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RenderizadorRetro } from '../render/RenderizadorRetro.js';
import { Ceu } from '../mundo/Ceu.js';
import { Gigante } from '../mundo/Gigante.js';
import { Vilarejo } from '../mundo/Vilarejo.js';

export class Jogo {
  constructor(container) {
    this.render = new RenderizadorRetro(container);
    this.cena = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.render.campoDeVisao, 16 / 9, 0.1, 3000);
    this.ceu = new Ceu(this.cena);
    this.gigante = new Gigante(this.cena, this.ceu.direcaoLua);
    this.mundo = new Vilarejo(this.cena, this.ceu.direcaoLua);
    this.tempo = 0;
    this.camera.position.set(0, 1.7, 53);
    this.camera.rotation.set(0.12, 0, 0);
  }
  iniciar() {
    const r = new THREE.Clock();
    const laco = () => {
      const dt = Math.min(r.getDelta(), 0.05);
      this.tempo += dt;
      this.camera.aspect = this.render.proporcao; this.camera.updateProjectionMatrix();
      this.gigante.atualizar(this.tempo);
      this.mundo.atualizar(dt, this.tempo);
      this.ceu.atualizar(this.tempo, this.camera, this.gigante.pulso);
      this.render.desenhar(this.cena, this.camera);
      requestAnimationFrame(laco);
    };
    laco();
  }
}
