// =============================================================================
//  LANTERNA (ponto de descanso)
//  Chegar perto e apertar E: recupera a vida, traz os inimigos de volta e passa
//  a ser o lugar onde o jogador renasce ao morrer. (Como as fogueiras de Dark Souls.)
// =============================================================================
import * as THREE from 'three';
import { caixa, materiais } from '../mundo/pecas.js';
import { texturas } from '../render/texturas.js';
import { retro } from '../render/retro.js';

export class Lanterna {
  constructor(jogo, { id, x, z, olhar = 0 }) {
    this.id = id; this.x = x; this.z = z; this.olhar = olhar;
    const m = materiais();
    const g = new THREE.Group();
    const poste = caixa(0.12, 1.5, 0.12, m.metal, 1); poste.position.y = 0.75;
    const braco = caixa(0.5, 0.08, 0.08, m.metal, 1); braco.position.set(0.2, 1.5, 0);
    this.vidro = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), retro(new THREE.MeshBasicMaterial({ color: 0xbfe6ff })));
    this.vidro.position.set(0.4, 1.25, 0);
    const tampa = caixa(0.34, 0.07, 0.34, m.metal, 1); tampa.position.set(0.4, 1.45, 0);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texturas().brilho, color: 0x8fd0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8,
    }));
    this.halo.position.copy(this.vidro.position); this.halo.scale.setScalar(2.2);
    this.luz = new THREE.PointLight(0x9fd4ff, 8, 13, 1.7); this.luz.position.set(0.4, 1.4, 0);
    g.add(poste, braco, this.vidro, tampa, this.halo, this.luz);
    g.position.set(x, 0, z);
    jogo.cena.add(g);
    jogo.mundo.colisores.adicionar(x, z, 0.3, 0.3);
  }

  distancia(pos) { return Math.hypot(pos.x - this.x, pos.z - this.z); }

  atualizar(tempo) {
    const f = 0.9 + 0.1 * Math.sin(tempo * 2.1 + this.x);
    this.luz.intensity = 8 * f; this.halo.scale.setScalar(2 + f * 0.4);
  }
}
