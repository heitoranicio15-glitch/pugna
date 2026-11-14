// =============================================================================
//  INIMIGOS
//  Os tipos compartilham os estados de combate; o que muda são os números em
//  CONFIG.inimigos e a aparência (função montarCorpo).
//
//  "Cérebro" (IA) em estados:
//    patrulha → perseguir → (procurar) → preparo → ativo → recuperacao
//    a qualquer momento: atordoado (levou golpe forte), desequilibrado
//    (teve o golpe aparado: fica aberto a um golpe crítico ou ao visceral) ou morto
//
//  Firmeza (contra o spam): depois de cambalear, o inimigo ganha um "fôlego" em
//  que aguenta os golpes sem cambalear de novo e quase sem sair do lugar. Os
//  números ficam em CONFIG.combate.atordoamentoInimigo.
//
//  As três fases do golpe (preparo, ativo, recuperacao) e os tipos de ataque
//  (alto, pesado, rasteira) vêm da máquina única em Ataques.js. Aqui ficam a
//  escolha do ataque, as poses e os avisos de cada tipo.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';
import { MaquinaDeAtaque, ehFaseDeAtaque, golpeAlcanca, sortearSequencia } from './Ataques.js';

const v2 = new THREE.Vector3();

/** Monta o corpo facetado e devolve o grupo e as partes animadas. */
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
    const elmo = facetado(new THREE.CylinderGeometry(0.205, 0.164, 0.39, 6), armadura, 0, 1.78, 0);
    elmo.rotation.y = Math.PI / 6;
    corpo.add(elmo);
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
      for (const lado of [-1, 1]) {
        const ombreira = facetado(new THREE.IcosahedronGeometry(0.25), armadura, lado * 0.47, 1.54, 0);
        ombreira.scale.set(1.1, 0.66, 1.14);
        corpo.add(ombreira);
      }
      corpo.add(cx(0.06, 0.3, 0.4, pano, 0, 2.05, -0.02));
    }
    corpo.add(cx(0.5, 0.75, 0.04, pano, 0, 0.55, 0.19));         // tabardo
  } else if (penitente) {
    const capuz = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.46, 4), pano);
    capuz.position.set(0, 1.99, -0.06);
    capuz.rotation.y = Math.PI / 4;
    const habito = facetado(new THREE.CylinderGeometry(0.19, 0.36, 1.22, 5, 1, true), pano, 0, 0.77, -0.04);
    habito.scale.z = 0.76;
    corpo.add(capuz, habito);
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
  if (cavaleiro) {
    const escudo = facetado(new THREE.CylinderGeometry(0.25, 0.25, 0.065, 6), armadura, -0.12, -0.47, 0.06);
    escudo.rotation.z = Math.PI / 2;
    escudo.scale.x = 1.32;
    bracoE.add(escudo);
  }

  return { grupo: g, corpo, pernaE, pernaD, bracoE, bracoD, olho, aco, materiais: [armadura, pano, aco] };
}

export class Inimigo {
  /** tipo: nome em CONFIG.inimigos. rota: pontos [x, z] da patrulha. */
  constructor(jogo, mundo, { tipo, rota, limiteZ = Infinity, eventoDeDerrota = null }) {
    this.jogo = jogo;
    this.mundo = mundo;
    this.tipo = tipo;
    this.eventoDeDerrota = eventoDeDerrota;
    this.base = CONFIG.inimigos[tipo];
    this.cfg = this.base;
    this.limiteZ = limiteZ;
    this.rota = rota;
    this.raio = this.cfg.raio;
    this.pos = new THREE.Vector3();
    this.empurrao = new THREE.Vector3();
    this.ataque = new MaquinaDeAtaque();
    this.sorteio = Math.random;   // os testes trocam por um sorteio previsível
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
    this.corOlho = this.tipo === 'guardiao' ? 0xffad67 : CONFIG.paleta.magia;
    this.olho.color.setHex(this.corOlho);
    this.ataque.encerrar();
    this.ultimaSequencia = null;
    this.penultimaSequencia = null;
    this.abertoParaExecucao = false;
    this.visceralPelasCostas = false;   // desequilibrado por um forte carregado pelas costas
    this.folego = 0;            // segundos em que ele não cambaleia de novo
    this.invencivel = 0;        // segundos sem levar dano (virada de fase do chefe)
    this.vida = this.cfg.vida;
    this.morto = false;
    this.estado = 'patrulha'; this.tEstado = 0;
    this.pontoAtual = 0; this.espera = 0;
    this.pos.set(this.rota[0][0], 0, this.rota[0][1]);
    this.angulo = 0; this.fase = Math.random() * 6; this.piscar = 0;
    this.caminho = [];
    this.alvoDaRota = null;
    this.recalcularRota = 0;
    this.ultimaVista = null;
    this.bracoD.rotation.set(0, 0, 0);
    this.corpo.rotation.set(0, 0, 0);
    this.corpo.position.y = 0;
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

  /** Troca o estado do cérebro. Sair de uma fase de ataque encerra a sequência. */
  mudar(estado) {
    this.estado = estado; this.tEstado = 0;
    if (!ehFaseDeAtaque(estado)) this.ataque.encerrar();
    else {
      if (!this.ataque.ativa) this.ataque.iniciar(this.cfg, ['alto'], this.sorteio);
      this.ataque.irPara(estado);
    }
    if (estado !== 'desequilibrado') { this.abertoParaExecucao = false; this.visceralPelasCostas = false; }
  }

  get emFaseFinal() { return !!this.base.faseFinal && this.cfg !== this.base; }

  /** O golpe em andamento (tipo, dano, tempos...) ou null fora de um ataque. */
  get golpe() { return this.ataque.golpe; }

  /**
   * Começa um ataque. Sem argumento, sorteia uma das sequências do inimigo.
   * golpes: lista de tipos, por exemplo ['alto', 'rasteira'].
   */
  atacar(golpes = null) {
    if (!golpes) {
      const anterior = this.ultimaSequencia;
      this.ultimaSequencia = sortearSequencia(this.cfg.ataques, anterior, this.sorteio, this.penultimaSequencia);
      this.penultimaSequencia = anterior;
      golpes = this.ultimaSequencia.golpes;
    }
    this.ataque.iniciar(this.cfg, golpes, this.sorteio);
    this.estado = 'preparo'; this.tEstado = 0;
    this.jogo.eventos.emitir('inimigo:preparo', this);
  }

  proximoPasso(alvo, dt) {
    const nav = this.mundo.navegacao;
    if (nav.livre(this.pos, alvo, Math.max(0, this.raio - 0.06)) && alvo.z <= this.limiteZ) {
      this.caminho = [];
      this.alvoDaRota = null;
      return alvo;
    }
    this.recalcularRota -= dt;
    if (!this.alvoDaRota || (this.recalcularRota <= 0 &&
        (!this.caminho.length || Math.hypot(alvo.x - this.alvoDaRota.x, alvo.z - this.alvoDaRota.z) > 0.9))) {
      this.alvoDaRota = { x: alvo.x, z: alvo.z };
      this.caminho = nav.encontrar(this.pos, alvo, this.raio, this.limiteZ);
      this.recalcularRota = 0.45 + this.raio * 0.3;
    }
    while (this.caminho.length && Math.hypot(this.pos.x - this.caminho[0].x, this.pos.z - this.caminho[0].z) < 0.25) {
      this.caminho.shift();
    }
    for (let i = this.caminho.length - 1; i > 0; i--) {
      if (nav.livre(this.pos, this.caminho[i], this.raio)) {
        this.caminho.splice(0, i);
        break;
      }
    }
    return this.caminho[0];
  }

  atualizar(dt) {
    const c = this.cfg, jog = this.jogo.jogador;
    const col = this.mundo.colisores;
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

    this.folego -= dt;
    this.invencivel -= dt;
    const dx = jog.pos.x - this.pos.x, dz = jog.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const anguloJogador = Math.atan2(dx, dz);
    const visivel = !jog.morto && jog.pos.z <= this.limiteZ && Math.abs(jog.pos.y - this.pos.y) < 3 &&
      dist < c.visao * 1.9 && !col.bloqueiaTrecho(this.pos, jog.pos, 1.45);
    let andar = 0, alvoAngulo = this.angulo, giro = 6;   // giro = quão rápido vira (rad/s)
    let destino = null;
    let bracoAlvo = -0.25, bracoLateral = 0, torcer = 0, inclinar = 0, rapidezBraco = 8;
    let agachar = 0, aviso = null, forcaAviso = 0;
    const golpe = this.ataque.golpe;

    switch (this.estado) {
      case 'patrulha': {
        const p = this.rota[this.pontoAtual];
        const px = p[0] - this.pos.x, pz = p[1] - this.pos.z, pd = Math.hypot(px, pz);
        if (pd < 0.7) {
          this.espera += dt;
          if (this.espera > 2.2) { this.espera = 0; this.pontoAtual = (this.pontoAtual + 1) % this.rota.length; }
        } else { destino = { x: p[0], z: p[1] }; andar = c.velPatrulha; giro = 3; }
        // Viu o jogador? (de frente enxerga longe; de costas só bem de perto)
        const deFrente = Math.cos(anguloJogador - this.angulo) > -0.15;
        if (visivel && dist < (deFrente ? c.visao : 5)) {
          this.ultimaVista = { x: jog.pos.x, z: jog.pos.z };
          this.mudar('perseguir'); this.jogo.eventos.emitir('inimigo:alerta', this);
        }
        break;
      }
      case 'perseguir': {
        const casa = this.rota[0];
        const longeDeCasa = Math.hypot(this.pos.x - casa[0], this.pos.z - casa[1]) > 48;
        if (jog.morto || longeDeCasa) { this.mudar('patrulha'); break; }
        if (!visivel) { this.mudar(this.ultimaVista ? 'procurar' : 'patrulha'); break; }
        this.ultimaVista = { x: jog.pos.x, z: jog.pos.z };
        alvoAngulo = anguloJogador;
        if (dist > c.alcance * 0.82) { destino = this.ultimaVista; andar = c.velPerseguir; }
        else if (Math.cos(anguloJogador - this.angulo) > 0.8) {
          this.atacar();
        }
        break;
      }
      case 'procurar': {
        if (jog.morto || this.tEstado >= 6) { this.mudar('patrulha'); break; }
        if (visivel) { this.mudar('perseguir'); break; }
        if (Math.hypot(this.pos.x - this.ultimaVista.x, this.pos.z - this.ultimaVista.z) > 0.65) {
          destino = this.ultimaVista;
          andar = c.velPerseguir * 0.8;
        } else alvoAngulo += dt * 1.7;
        break;
      }
      // ---- As três fases do golpe (iguais para todos; a pose muda com o tipo) ----
      case 'preparo': {      // o AVISO: a pose, a cor e o som dizem que tipo de golpe vem
        alvoAngulo = visivel ? anguloJogador : this.angulo; giro = c.recua ? 5 : 1.6;
        // a pose sobe no tempo da subida e TRAVA no fim dela durante o atraso
        rapidezBraco = 3.2 / golpe.subida;
        aviso = golpe.aviso;
        // a cor pulsa cada vez mais rápido até a pose chegar ao fim
        const avanco = Math.min(1, this.ataque.t / golpe.subida);
        forcaAviso = 0.45 + 0.55 * Math.abs(Math.sin(avanco * avanco * 14));
        if (golpe.tipo === 'rasteira') {        // agacha e leva a arma para o lado, rente ao chão
          agachar = 0.3; inclinar = 0.34;
          bracoAlvo = -0.55; bracoLateral = 1.3; torcer = -0.7;
        } else if (golpe.tipo === 'pesado') {   // arma bem atrás da cabeça, corpo arqueado
          bracoAlvo = -3.6; inclinar = -0.4; torcer = -0.22;
        } else if (golpe.lado) {                // golpe lateral
          bracoAlvo = -1.62; bracoLateral = golpe.lado * 1.05; torcer = golpe.lado * 0.47; inclinar = -0.24;
        } else {                                // alto: ergue a arma
          bracoAlvo = -2.95; inclinar = -0.12;
        }
        if (c.recua && visivel && dist > c.alcance * 0.7) andar = c.velPerseguir * 0.6;
        break;
      }
      case 'ativo': {        // a arma passa: é aqui que o golpe pode acertar
        rapidezBraco = 30;
        if (golpe.tipo === 'rasteira') {
          agachar = 0.3; inclinar = 0.3;
          bracoAlvo = -0.35; bracoLateral = -0.95; torcer = 0.75;
        } else if (golpe.tipo === 'pesado') {
          bracoAlvo = -0.2; inclinar = 0.55;
        } else if (golpe.lado) {
          bracoAlvo = -1.05; bracoLateral = -golpe.lado * 0.7; torcer = -golpe.lado * 0.38; inclinar = 0.3;
        } else {
          bracoAlvo = -0.45; inclinar = 0.3;
        }
        break;
      }
      case 'recuperacao': {  // depois do golpe ele fica aberto: é a hora de punir
        bracoAlvo = -0.45; rapidezBraco = 4; inclinar = 0.15;
        if (golpe.tipo === 'rasteira') { agachar = 0.14; bracoLateral = -0.5; torcer = 0.35; }
        else if (golpe.tipo === 'pesado') { inclinar = 0.4; bracoAlvo = -0.25; }
        break;
      }
      case 'recuar': {       // o caçador bate e pula para trás
        alvoAngulo = visivel ? anguloJogador : this.angulo; andar = -c.velPerseguir * 0.75;
        if (this.tEstado >= 0.55) this.mudar('perseguir');
        break;
      }
      case 'atordoado': {
        inclinar = -0.35; bracoAlvo = 0.4;
        if (this.tEstado >= (c.atordoamento ?? CONFIG.combate.atordoamentoInimigo.duracao)) this.mudar('perseguir');
        break;
      }
      case 'virada': {   // troca de fase do chefe: ruge de braços abertos, encarando o jogador
        alvoAngulo = anguloJogador; giro = 3;
        inclinar = -0.45; bracoAlvo = -2.4; bracoLateral = 0.6; rapidezBraco = 10;
        if (this.tEstado >= (c.virada?.invencivel ?? 0)) this.mudar('perseguir');
        break;
      }
      case 'desequilibrado': {   // golpe aparado: braço jogado para trás, guarda aberta
        inclinar = -0.5; bracoAlvo = -3.5; bracoLateral = -0.5; rapidezBraco = 16;
        // Durante o visceral ele fica preso no desequilíbrio até a lâmina entrar.
        const preso = jog.acao === 'visceral' && jog.alvoVisceral === this;
        if (!preso && this.tEstado >= (c.desequilibrio ?? CONFIG.combate.pistola.desequilibrio)) this.mudar('perseguir');
        break;
      }
    }

    // ---------- avança o golpe (a máquina única de Ataques.js) ----------
    if (this.ataque.ativa) {
      const mudou = this.ataque.atualizar(dt);
      if (mudou === 'fim') this.mudar(c.recua ? 'recuar' : 'perseguir');
      else {
        this.estado = this.ataque.fase; this.tEstado = this.ataque.t;
        if (mudou === 'preparo') this.jogo.eventos.emitir('inimigo:preparo', this);
        if (mudou === 'ativo') this.jogo.eventos.emitir('inimigo:golpe', this);
        if (this.estado === 'ativo') this.golpear(dist, anguloJogador);
      }
    }

    // ---------- virar e andar ----------
    if (destino) {
      const passo = this.proximoPasso(destino, dt);
      if (passo) alvoAngulo = Math.atan2(passo.x - this.pos.x, passo.z - this.pos.z);
      else andar = 0;
    }
    let dif = alvoAngulo - this.angulo;
    dif = Math.atan2(Math.sin(dif), Math.cos(dif));
    this.angulo += THREE.MathUtils.clamp(dif, -giro * dt, giro * dt);

    const antesX = this.pos.x, antesZ = this.pos.z;
    if (andar !== 0) {
      if (destino) andar *= Math.max(0, Math.cos(alvoAngulo - this.angulo));
      this.pos.x += Math.sin(this.angulo) * andar * dt;
      this.pos.z += Math.cos(this.angulo) * andar * dt;
    }
    this.pos.x += this.empurrao.x * dt; this.pos.z += this.empurrao.z * dt;
    this.empurrao.multiplyScalar(Math.exp(-dt * 7));
    col.resolver(this.pos, this.raio, 0, 0);
    for (const o of this.mundo.entidades) {   // não se amontoam
      if (o === this || o.morto) continue;
      const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, od = Math.hypot(ox, oz), min = this.raio + o.raio;
      if (od < min && od > 1e-4) { this.pos.x += ox / od * (min - od) * 0.5; this.pos.z += oz / od * (min - od) * 0.5; }
    }
    const minJ = this.raio + jog.raio;
    if (dist < minJ && dist > 1e-4 && !jog.morto) { this.pos.x = jog.pos.x - dx / dist * minJ; this.pos.z = jog.pos.z - dz / dist * minJ; }
    this.pos.z = Math.min(this.pos.z, this.limiteZ);
    col.resolver(this.pos, this.raio, 0, 0);

    const andou = Math.hypot(this.pos.x - antesX, this.pos.z - antesZ);
    if (destino && andar > 0 && andou < andar * dt * 0.25 && this.recalcularRota <= 0) this.alvoDaRota = null;

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
    this.corpo.position.y += (-agachar - this.corpo.position.y) * (1 - Math.exp(-dt * 10));
    // Aviso do tipo de golpe: a arma e os olhos acendem na cor do tipo.
    if (aviso !== null) {
      this.olho.color.setHex(aviso);
      this.aco.emissive.setHex(aviso).multiplyScalar(forcaAviso);
    } else this.olho.color.setHex(this.corOlho);
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

  /**
   * Durante a fase ativa, confere se a arma alcança o jogador. Cada golpe só
   * é resolvido uma vez: acertou, foi esquivado ou pulado. (O golpe aparado
   * pelo tiro já chega resolvido e nem passa por aqui.)
   */
  golpear(dist, anguloJogador) {
    const g = this.ataque.golpe, jog = this.jogo.jogador;
    if (!g || this.ataque.resolvido || jog.morto) return;
    if (!golpeAlcanca(g, dist, Math.cos(anguloJogador - this.angulo), jog.pos.y - this.pos.y)) return;
    if (this.mundo.colisores.bloqueiaTrecho(this.pos, jog.pos, 1.35)) return;
    this.ataque.resolvido = true;
    jog.receberDano(g.dano, this.pos, this, g);
  }

  /**
   * O jogador aparou o golpe com um tiro: perde a sequência e fica aberto a um
   * crítico por CONFIG.combate.pistola.desequilibrio (ou o "desequilibrio" do inimigo).
   * Gancho da execução: se o golpe aparado era pesado, abertoParaExecucao fica
   * ligado enquanto durar o desequilíbrio (o PR B2 usa essa marca).
   */
  serAparado(golpe = this.ataque.golpe) {
    if (this.morto) return;
    this.desequilibrar();
    this.abertoParaExecucao = !!golpe?.abreExecucao;
    this.jogo.eventos.emitir('inimigo:aparado', this);
  }

  /**
   * Deixa o inimigo aberto (desequilibrado) ao crítico e ao visceral, sem
   * execução. Usado pelo aparo e pelo ataque forte carregado pelas costas
   * (pelasCostas = true: o visceral vale por trás, e o empurrão do golpe fica).
   */
  desequilibrar({ pelasCostas = false } = {}) {
    if (this.morto) return;
    if (!pelasCostas) this.empurrao.set(-Math.sin(this.angulo) * 2.2, 0, -Math.cos(this.angulo) * 2.2);
    this.mudar('desequilibrado');
    this.abertoParaExecucao = false;
    this.visceralPelasCostas = pelasCostas;
  }

  /**
   * Visceral (ou execução, se o golpe pesado tinha sido aparado): o dano já vem
   * multiplicado pelo jogador, então não passa pelo crítico de novo. Empurra
   * forte e o inimigo sai do desequilíbrio para o atordoamento.
   */
  receberVisceral(dano, direcao, execucao = false) {
    if (this.morto || this.invencivel > 0) return;
    const AT = CONFIG.combate.atordoamentoInimigo, forca = CONFIG.combate.visceral.empurrao;
    this.jogo.eventos.emitir('golpe:visceral', { execucao, inimigo: this });
    this.empurrao.set(direcao.x * forca, 0, direcao.z * forca);
    if (this.tirarVida(dano, 0.25) || this.invencivel > 0) return;   // morreu ou virou de fase
    this.mudar('atordoado');
    this.folego = (this.cfg.atordoamento ?? AT.duracao) + (this.cfg.folego ?? AT.folego);
  }

  /**
   * Chamado pelo jogador. direcao = para onde empurrar. Devolve 'critico' se
   * pegou o inimigo aberto.
   *
   * Firmeza: um golpe só faz o inimigo cambalear se for forte o bastante E se
   * ele não estiver no "fôlego" depois de um cambaleio anterior. Sem cambalear,
   * ele quase não sai do lugar: aguenta o golpe e revida.
   */
  receberDano(dano, direcao, forca, forte) {
    if (this.morto || this.invencivel > 0) return;
    const AT = CONFIG.combate.atordoamentoInimigo;
    const critico = this.estado === 'desequilibrado';
    if (critico) dano *= CONFIG.combate.critico.multiplicador;
    if (this.tirarVida(dano, critico ? 0.16 : 0.09)) {
      this.empurrao.set(direcao.x * forca, 0, direcao.z * forca);
      return critico ? 'critico' : undefined;
    }
    if (this.invencivel > 0) return critico ? 'critico' : undefined;   // acabou de virar de fase
    // O golpe tem força para abalar? E o inimigo está em condição de ser abalado?
    const abala = dano >= this.cfg.firmeza || (forte && !this.base.faseFinal);
    const emGolpeFirme = !forte && !!this.ataque.golpe?.aguentaLeve && (this.estado === 'preparo' || this.estado === 'ativo');
    const cambaleia = critico || (abala && !emGolpeFirme && this.folego <= 0);
    const empurrar = forca * (cambaleia ? 1 : AT.empurraoFirme);
    this.empurrao.set(direcao.x * empurrar, 0, direcao.z * empurrar);
    if (cambaleia) {
      this.mudar('atordoado');
      this.folego = (this.cfg.atordoamento ?? AT.duracao) + (this.cfg.folego ?? AT.folego);
    } else {
      if (abala) this.jogo.eventos.emitir('inimigo:aguentou', this);
      if (this.estado === 'patrulha') this.mudar('perseguir');
    }
    return critico ? 'critico' : undefined;
  }

  /**
   * Tiro de pistola fora da janela do parry: só um arranhão. Não faz cambalear
   * e não gasta o desequilíbrio (não é crítico), mas acorda quem patrulhava.
   */
  levarTiro(dano) {
    if (this.morto || this.invencivel > 0) return;
    if (this.tirarVida(dano, 0.09) || this.invencivel > 0) return;
    if (this.estado === 'patrulha') this.mudar('perseguir');
  }

  /** Tira vida, pisca e cuida da morte e da fase final. Devolve true se morreu. */
  tirarVida(dano, piscar) {
    this.vida -= dano;
    this.piscar = piscar;
    this.barra.visible = this.tipo !== 'guardiao';
    this.jogo.eventos.emitir('inimigo:ferido', this);
    if (this.vida <= 0) {
      this.vida = 0; this.morto = true; this.mudar('morto'); this.barra.visible = false;
      this.jogo.eventos.emitir('inimigo:morreu', this);
      return true;
    }
    if (this.base.faseFinal && this.cfg === this.base && this.vida <= this.base.vida / 2) this.virarFase();
    return false;
  }

  /**
   * Virada para a fase final (chefe): troca os números, ruge, fica invencível
   * por um instante e se afasta um passo do jogador antes de voltar à luta.
   */
  virarFase() {
    this.cfg = { ...this.base, ...this.base.faseFinal };
    this.corOlho = 0xff416c;
    const V = this.cfg.virada ?? { invencivel: 0, passo: 0 };
    this.invencivel = V.invencivel;
    this.mudar('virada');
    // o empurrão some com exp(-7t) (veja atualizar): andar "passo" metros pede 7 × passo
    const jog = this.jogo.jogador;
    const dx = this.pos.x - jog.pos.x, dz = this.pos.z - jog.pos.z, d = Math.hypot(dx, dz) || 1;
    this.empurrao.set(dx / d * V.passo * 7, 0, dz / d * V.passo * 7);
    this.jogo.eventos.emitir('guardiao:fase-final', this);
  }
}
