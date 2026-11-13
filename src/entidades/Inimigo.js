// =============================================================================
//  INIMIGOS
//  Os tipos compartilham os estados de combate; o que muda são os números em
//  CONFIG.inimigos e a aparência (função montarCorpo).
//
//  "Cérebro" (IA) em estados:
//    patrulha → perseguir → preparo → ativo → recuperacao → (recuar) → perseguir
//    a qualquer momento: atordoado (levou golpe forte) ou morto
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';

const v2 = new THREE.Vector3();

/** Monta o boneco com caixas. Devolve o grupo e as partes que se mexem. */
function montarCorpo(tipo) {
  const t = texturas();
  const guardiao = tipo === 'guardiao';
  const penitente = tipo === 'penitente';
  const cavaleiro = tipo === 'cavaleiro' || guardiao;
  const armadura = retro(new THREE.MeshLambertMaterial({ map: t.metal, color: guardiao ? 0xb19565 : cavaleiro ? 0x8088c8 : 0x6a6aa0 }));
  const corPano = { guardiao: 0xa34262, penitente: 0x795270, cavaleiro: 0x7a3a8a, cacador: 0x9090d0 };
  const pano = retro(new THREE.MeshLambertMaterial({ map: t.tecido, color: corPano[tipo], side: THREE.DoubleSide }));
  const aco = retro(new THREE.MeshLambertMaterial({ map: t.metal, color: 0xd8dcff }));
  const olho = retro(new THREE.MeshBasicMaterial({ color: guardiao ? 0xffad67 : CONFIG.paleta.magia }));
  const cx = (l, a, p, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), m); o.position.set(x, y, z); return o; };
  const facetado = (geometria, material, x, y, z) => {
    const malha = new THREE.Mesh(geometria, material);
    malha.position.set(x, y, z);
    return malha;
  };

  const g = new THREE.Group();
  const corpo = new THREE.Group(); g.add(corpo);                 // tudo menos as pernas (inclina ao atacar)
  const larg = cavaleiro ? 0.72 : 0.5;
  corpo.add(cx(larg, 0.72, 0.36, armadura, 0, 1.22, 0));         // tronco
  corpo.add(cx(larg * 0.8, 0.2, 0.3, pano, 0, 0.82, 0));         // cintura
  if (guardiao) {
    const elmo = facetado(new THREE.CylinderGeometry(0.24, 0.175, 0.42, 6), armadura, 0, 1.78, 0);
    elmo.rotation.y = Math.PI / 6;
    corpo.add(elmo);
    corpo.add(cx(0.26, 0.04, 0.06, olho, 0, 1.8, 0.176));
  } else {
    corpo.add(cx(0.34, 0.36, 0.36, armadura, 0, 1.78, 0));
    corpo.add(cx(0.24, 0.045, 0.02, olho, 0, 1.8, 0.185));
  }
  if (cavaleiro) {
    if (guardiao) {
      for (const lado of [-1, 1]) {
        const ombreira = facetado(new THREE.IcosahedronGeometry(0.31), armadura, lado * 0.49, 1.53, 0);
        ombreira.scale.set(1.3, 0.75, 1.1);
        corpo.add(ombreira);
        const ponta = facetado(new THREE.ConeGeometry(0.08, 0.36, 4), aco, lado * 0.15, 2.03, -0.035);
        ponta.rotation.z = -lado * 0.58;
        corpo.add(ponta);
      }
      corpo.add(facetado(new THREE.ConeGeometry(0.09, 0.33, 4), armadura, 0, 2.08, -0.05));
    } else {
      corpo.add(cx(0.3, 0.2, 0.42, armadura, -0.5, 1.56, 0), cx(0.3, 0.2, 0.42, armadura, 0.5, 1.56, 0));
      corpo.add(cx(0.06, 0.3, 0.4, pano, 0, 2.05, -0.02));
    }
    corpo.add(cx(0.5, 0.75, 0.04, pano, 0, 0.55, 0.19));         // tabardo
  } else if (penitente) {
    const capuz = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.46, 4), pano);
    capuz.position.set(0, 1.99, -0.06);
    capuz.rotation.y = Math.PI / 4;
    corpo.add(capuz, cx(0.55, 1.02, 0.27, pano, 0, 0.66, -0.02));
  } else {
    const aba = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 6), pano); aba.position.y = 1.97; corpo.add(aba); // chapéu
    const copa = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 5), pano); copa.position.y = 2.14; corpo.add(copa);
    const capa = cx(0.62, 1.15, 0.04, pano, 0, 1.0, -0.22); capa.rotation.x = 0.12; corpo.add(capa);
    corpo.add(cx(0.36, 0.14, 0.38, pano, 0, 1.66, 0));           // gola/lenço cobrindo o rosto
  }
  const perna = (x) => { const p = new THREE.Group(); p.position.set(x, 0.86, 0); p.add(cx(0.2, 0.86, 0.22, armadura, 0, -0.43, 0)); g.add(p); return p; };
  const braco = (x) => { const b = new THREE.Group(); b.position.set(x, 1.5, 0); b.add(cx(0.17, 0.7, 0.18, armadura, 0, -0.33, 0)); corpo.add(b); return b; };
  const pernaE = perna(-0.16), pernaD = perna(0.16);
  const bracoE = braco(-(larg / 2 + 0.1)), bracoD = braco(larg / 2 + 0.1);

  // Arma na mão direita. A lâmina aponta para a frente (+Z) quando o braço está abaixado.
  const comp = cavaleiro ? 1.55 : 0.9;
  const arma = new THREE.Group(); arma.position.set(0, -0.66, 0.05);
  if (guardiao) {
    const cabo = facetado(new THREE.CylinderGeometry(0.05, 0.065, 1.43, 6), armadura, 0, 0, 0.65);
    cabo.rotation.x = Math.PI / 2;
    arma.add(cabo, facetado(new THREE.IcosahedronGeometry(0.23), aco, 0, 0, 1.38));
    for (let i = 0; i < 5; i++) {
      const angulo = i * Math.PI * 2 / 5;
      const ponta = facetado(new THREE.ConeGeometry(0.085, 0.22, 4), armadura, -Math.sin(angulo) * 0.22, Math.cos(angulo) * 0.22, 1.38);
      ponta.rotation.z = angulo;
      arma.add(ponta);
    }
  } else {
    arma.add(cx(cavaleiro ? 0.1 : 0.06, 0.03, comp, aco, 0, 0, comp / 2 + 0.1));
    arma.add(cx(0.3, 0.05, 0.05, armadura, 0, 0, 0.1));
  }
  bracoD.add(arma);
  if (cavaleiro) { const escudo = cx(0.06, 0.62, 0.46, armadura, -0.1, -0.5, 0.05); bracoE.add(escudo); }

  return { grupo: g, corpo, pernaE, pernaD, bracoE, bracoD, olho, materiais: [armadura, pano, aco] };
}

export class Inimigo {
  /** tipo: nome em CONFIG.inimigos. rota: pontos [x, z] da patrulha. */
  constructor(jogo, mundo, { tipo, rota, limiteZ = Infinity }) {
    this.jogo = jogo;
    this.tipo = tipo;
    this.base = CONFIG.inimigos[tipo];
    this.cfg = this.base;
    this.limiteZ = limiteZ;
    this.rota = rota;
    this.raio = this.cfg.raio;
    this.pos = new THREE.Vector3();
    this.empurrao = new THREE.Vector3();
    Object.assign(this, montarCorpo(tipo));
    this.grupo.scale.setScalar(this.cfg.escala);
    this.grupo.rotation.order = 'YXZ'; // assim ele cai "para trás" seja qual for o lado em que olha
    mundo.grupo.add(this.grupo);

    // Barrinha de vida (só aparece depois de apanhar).
    this.barra = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xd2343f, fog: false }));
    this.barra.center.set(0, 0.5);
    this.barra.visible = false;
    mundo.grupo.add(this.barra);

    this.reiniciar();
  }

  /** Volta ao começo da patrulha, vivo e com a vida cheia. */
  reiniciar() {
    this.cfg = this.base;
    if (this.tipo === 'guardiao') this.olho.color.setHex(0xffad67);
    this.vida = this.cfg.vida;
    this.morto = false;
    this.estado = 'patrulha'; this.tEstado = 0;
    this.pontoAtual = 0; this.espera = 0;
    this.pos.set(this.rota[0][0], 0, this.rota[0][1]);
    this.angulo = 0; this.fase = Math.random() * 6; this.piscar = 0;
    this.golpesRestantes = 0; this.desvio = 0; this.tPreso = 0;
    this.perfilAtaque = null;
    this.bracoD.rotation.set(0, 0, 0);
    this.corpo.rotation.set(0, 0, 0);
    this.empurrao.set(0, 0, 0);
    this.grupo.visible = true; this.grupo.scale.setScalar(this.cfg.escala); this.grupo.rotation.set(0, 0, 0); this.grupo.position.copy(this.pos);
    this.barra.visible = false;
    for (const m of this.materiais) m.emissive.setRGB(0, 0, 0);
  }

  ocultarDerrotado() {
    this.morto = true;
    this.grupo.visible = false;
    this.barra.visible = false;
  }

  mudar(estado) { this.estado = estado; this.tEstado = 0; }

  get emFaseFinal() { return !!this.base.faseFinal && this.cfg !== this.base; }

  prepararGolpe(tempo = 0) {
    this.mudar('preparo');
    this.tEstado = tempo;
    this.jogo.eventos.emitir('inimigo:preparo', this);
  }

  atualizar(dt) {
    const c = this.cfg, jog = this.jogo.jogador;
    const ataque = this.perfilAtaque || c;
    const combo = this.tipo === 'guardiao' && ataque === this.cfg && this.emFaseFinal;
    const col = this.jogo.mundo.colisores;
    this.tEstado += dt;
    this.piscar -= dt;
    const claro = this.piscar > 0 ? 0.7 : 0;
    for (const m of this.materiais) m.emissive.setRGB(claro, claro, claro * 1.1);

    if (this.morto) {
      // Cai para trás e, depois de um tempo, se desfaz.
      this.grupo.rotation.x = Math.max(-Math.PI / 2, this.grupo.rotation.x - dt * 3.5);
      if (this.tEstado > 6) this.grupo.scale.multiplyScalar(Math.exp(-dt * 2.5));
      if (this.tEstado > 8.5) this.grupo.visible = false;
      return;
    }

    const dx = jog.pos.x - this.pos.x, dz = jog.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const anguloJogador = Math.atan2(dx, dz);
    let andar = 0, alvoAngulo = this.angulo, giro = 6;   // giro = quão rápido vira (rad/s)
    let bracoAlvo = -0.25, bracoLateral = 0, torcer = 0, inclinar = 0, rapidezBraco = 8;

    switch (this.estado) {
      case 'patrulha': {
        const p = this.rota[this.pontoAtual];
        const px = p[0] - this.pos.x, pz = p[1] - this.pos.z, pd = Math.hypot(px, pz);
        if (pd < 0.7) {
          this.espera += dt;
          if (this.espera > 2.2) { this.espera = 0; this.pontoAtual = (this.pontoAtual + 1) % this.rota.length; }
        } else { alvoAngulo = Math.atan2(px, pz); andar = c.velPatrulha; giro = 3; }
        // Viu o jogador? (de frente enxerga longe; de costas só bem de perto)
        const deFrente = Math.cos(anguloJogador - this.angulo) > -0.15;
        if (!jog.morto && jog.pos.z <= this.limiteZ && Math.abs(jog.pos.y - this.pos.y) < 3 &&
            dist < (deFrente ? c.visao : 5) && !col.bloqueiaTrecho(this.pos, jog.pos, 1.45)) {
          this.mudar('perseguir'); this.jogo.eventos.emitir('inimigo:alerta', this);
        }
        break;
      }
      case 'perseguir': {
        const casa = this.rota[0];
        const longeDeCasa = Math.hypot(this.pos.x - casa[0], this.pos.z - casa[1]) > 48;
        if (jog.morto || jog.pos.z > this.limiteZ || dist > c.visao * 1.9 || longeDeCasa) { this.mudar('patrulha'); break; }
        alvoAngulo = anguloJogador;
        if (dist > c.alcance * 0.82) andar = c.velPerseguir;
        else if (Math.cos(anguloJogador - this.angulo) > 0.8) {
          this.perfilAtaque = c;
          this.golpesRestantes = c.golpes;
          this.prepararGolpe();
        }
        break;
      }
      case 'preparo': {      // ergue a arma: é o aviso para o jogador bloquear ou esquivar
        alvoAngulo = anguloJogador; giro = c.recua ? 5 : 1.6;
        bracoAlvo = -2.95; rapidezBraco = 3.2 / ataque.preparo; inclinar = -0.12;
        if (combo) {
          const lado = this.golpesRestantes > 1 ? 1 : -1;
          bracoAlvo = -1.62;
          bracoLateral = lado * 1.05;
          torcer = lado * 0.47;
          inclinar = -0.24;
        }
        if (c.recua && dist > c.alcance * 0.7) andar = c.velPerseguir * 0.6; // o caçador avança enquanto prepara
        if (this.tEstado >= ataque.preparo) { this.mudar('ativo'); this.golpear(dist, anguloJogador, ataque); }
        break;
      }
      case 'ativo': {
        bracoAlvo = -0.45; rapidezBraco = 30; inclinar = 0.3;
        if (combo) {
          const lado = this.golpesRestantes > 1 ? -1 : 1;
          bracoAlvo = -1.05;
          bracoLateral = lado * 0.7;
          torcer = lado * 0.38;
        }
        if (this.tEstado >= ataque.ativo) { this.golpesRestantes--; this.mudar('recuperacao'); }
        break;
      }
      case 'recuperacao': {
        bracoAlvo = -0.45; rapidezBraco = 4; inclinar = 0.15;
        if (this.golpesRestantes > 0 && this.tEstado >= (combo ? 0.25 : 0.16)) {
          this.prepararGolpe(combo ? 0 : ataque.preparo * 0.35);
          break;
        }
        if (this.tEstado >= ataque.recuperacao) {
          this.perfilAtaque = null;
          this.mudar(c.recua ? 'recuar' : 'perseguir');
        }
        break;
      }
      case 'recuar': {       // o caçador bate e pula para trás
        alvoAngulo = anguloJogador; andar = -c.velPerseguir * 0.75;
        if (this.tEstado >= 0.55) this.mudar('perseguir');
        break;
      }
      case 'atordoado': {
        inclinar = -0.35; bracoAlvo = 0.4;
        if (this.tEstado >= 0.75) this.mudar('perseguir');
        break;
      }
    }

    // ---------- virar e andar ----------
    let dif = alvoAngulo - this.angulo;
    dif = Math.atan2(Math.sin(dif), Math.cos(dif));
    this.angulo += THREE.MathUtils.clamp(dif, -giro * dt, giro * dt);

    const antesX = this.pos.x, antesZ = this.pos.z;
    if (andar !== 0) {
      // "desvio": se ficar preso numa parede, tenta contornar pelo lado.
      const a = this.angulo + this.desvio;
      this.pos.x += Math.sin(a) * andar * dt; this.pos.z += Math.cos(a) * andar * dt;
    }
    this.pos.x += this.empurrao.x * dt; this.pos.z += this.empurrao.z * dt;
    this.empurrao.multiplyScalar(Math.exp(-dt * 7));
    col.resolver(this.pos, this.raio, 0, 0);
    for (const o of this.jogo.inimigos) {   // não se amontoam
      if (o === this || o.morto) continue;
      const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, od = Math.hypot(ox, oz), min = this.raio + o.raio;
      if (od < min && od > 1e-4) { this.pos.x += ox / od * (min - od) * 0.5; this.pos.z += oz / od * (min - od) * 0.5; }
    }
    const minJ = this.raio + jog.raio;
    if (dist < minJ && dist > 1e-4 && !jog.morto) { this.pos.x = jog.pos.x - dx / dist * minJ; this.pos.z = jog.pos.z - dz / dist * minJ; }
    this.pos.z = Math.min(this.pos.z, this.limiteZ);
    col.resolver(this.pos, this.raio, 0, 0);

    const andou = Math.hypot(this.pos.x - antesX, this.pos.z - antesZ);
    if (andar > 0 && andou < andar * dt * 0.35) {
      this.tPreso += dt;
      if (this.tPreso > 0.35) { this.desvio = (this.desvio >= 0 ? 1 : -1) * 1.2; this.tPreso = -1.2; }
    } else if (this.tPreso < 0) { this.tPreso += dt; if (this.tPreso >= 0) this.desvio = -this.desvio * 0.0001; }
    else this.tPreso = 0;

    // ---------- animação ----------
    this.fase += andou * 3.4 / this.cfg.escala;
    const passo = Math.sin(this.fase) * Math.min(1, andou / dt / 1.2) * 0.65;
    this.pernaE.rotation.x = passo; this.pernaD.rotation.x = -passo;
    this.bracoE.rotation.x = -passo * 0.6;
    const kb = 1 - Math.exp(-dt * rapidezBraco);
    this.bracoD.rotation.x += (bracoAlvo - this.bracoD.rotation.x) * kb;
    this.bracoD.rotation.z += (bracoLateral - this.bracoD.rotation.z) * kb;
    this.corpo.rotation.x += (inclinar - this.corpo.rotation.x) * (1 - Math.exp(-dt * 12));
    this.corpo.rotation.y += (torcer - this.corpo.rotation.y) * kb;
    this.grupo.position.set(this.pos.x, Math.abs(Math.sin(this.fase)) * 0.04, this.pos.z);
    this.grupo.rotation.y = this.angulo;

    // ---------- barrinha de vida ----------
    if (this.barra.visible) {
      const l = 0.9 * (this.vida / c.vida);
      this.barra.scale.set(Math.max(0.001, l), 0.07, 1);
      this.jogo.camera.getWorldDirection(v2); // alinha a barra à esquerda na tela
      this.barra.position.set(this.pos.x + v2.z * 0.45, 2.35 * c.escala, this.pos.z - v2.x * 0.45);
    }
  }

  /** O momento em que o golpe "pega". */
  golpear(dist, anguloJogador, c = this.cfg) {
    this.jogo.eventos.emitir('inimigo:golpe', this);
    if (dist > c.alcance + 0.35) return;
    if (Math.cos(anguloJogador - this.angulo) < 0.35) return;      // jogador saiu da frente
    if (Math.abs(this.jogo.jogador.pos.y - this.pos.y) > 1.6) return;
    if (this.jogo.mundo.colisores.bloqueiaTrecho(this.pos, this.jogo.jogador.pos, 1.35)) return;
    const r = this.jogo.jogador.receberDano(c.dano, this.pos);
    if (r === 'bloqueou') { this.empurrao.set(-Math.sin(this.angulo) * 3, 0, -Math.cos(this.angulo) * 3); }
  }

  /** Chamado pelo jogador. direcao = para onde empurrar. */
  receberDano(dano, direcao, forca, forte) {
    if (this.morto) return;
    this.vida -= dano;
    this.piscar = 0.09;
    this.barra.visible = this.tipo !== 'guardiao';
    this.empurrao.set(direcao.x * forca, 0, direcao.z * forca);
    this.jogo.eventos.emitir('inimigo:ferido', this);
    if (this.vida <= 0) {
      this.vida = 0; this.morto = true; this.mudar('morto'); this.barra.visible = false;
      this.jogo.eventos.emitir('inimigo:morreu', this);
      return;
    }
    if (this.base.faseFinal && this.cfg === this.base && this.vida <= this.base.vida / 2) {
      this.cfg = { ...this.base, ...this.base.faseFinal };
      this.olho.color.setHex(0xff416c);
      this.jogo.eventos.emitir('guardiao:fase-final');
    }
    if (dano >= this.cfg.firmeza || (forte && !this.base.faseFinal)) this.mudar('atordoado');
    else if (this.estado === 'patrulha') this.mudar('perseguir');
  }
}
