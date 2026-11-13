// =============================================================================
//  O JOGADOR (o caçador)
//  Movimento em terceira pessoa + vida, estamina e as regras do combate.
//  A câmera gira em volta do caçador (yaw/pitch); o corpo tem o próprio rumo.
//  O desenho do boneco fica em Boneco.js; aqui ficam só as REGRAS.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const C = CONFIG.jogador;
const CB = CONFIG.combate;
const CAM = CONFIG.camera;
const M = CONFIG.mira;

/** Menor diferença entre dois ângulos (a - b), entre -PI e PI. */
const difAngulo = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** Ângulo (na convenção do yaw) que aponta de um ponto para outro. */
const anguloPara = (de, para) => Math.atan2(de.x - para.x, de.z - para.z);

export class Jogador {
  constructor(jogo) {
    this.jogo = jogo;
    this.pos = new THREE.Vector3();   // posição dos PÉS
    this.vel = new THREE.Vector3();
    this.yaw = 0;                     // para onde a CÂMERA olha (esquerda/direita)
    this.pitch = 0;                   // para onde a CÂMERA olha (cima/baixo)
    this.rumo = 0;                    // para onde o CORPO está virado
    this.alvo = null;                 // inimigo com a mira travada
    this.raio = C.raio;
    this.reiniciar(0, 0, 0);
  }

  /** Coloca o jogador num ponto, com vida e estamina cheias. */
  reiniciar(x, z, yaw) {
    this.pos.set(x, 0, z); this.vel.set(0, 0, 0);
    this.yaw = yaw; this.pitch = CAM.inclinacaoInicial; this.rumo = yaw;
    this.soltarMira();
    this.tSemVisao = 0; this.acumuloTroca = 0; this.tTroca = 0; this.recentrar = 0;
    this.entradaDir = null;
    this.vida = C.vidaMax; this.estamina = C.estaminaMax;
    this.morto = false;
    this.noChao = true;
    this.exausto = false;
    this.esperaEstamina = 0;
    // combate
    this.acao = 'livre';        // livre | preparo | ativo | recuperacao | aparar | atordoado
    this.tAcao = 0;             // tempo dentro da ação atual
    this.ataque = null;         // 'leve' ou 'forte'
    this.golpeAlternado = false;
    this.carregando = false; this.tCarga = 0; this.avisouCarga = false;
    this.bloqueando = false;
    this.tEsquiva = 0; this.esperaEsquiva = 0; this.invencivel = 0;
    this.dirEsquiva = new THREE.Vector2();
    this.rolando = false;       // esquiva com direção (rola) ou parado (salta para trás)
    this.apararNaFila = 0;
    this.ataqueNaFila = 0;
    this.tipoNaFila = null;
    this.esquivaNaFila = 0;
    this.alvosDoGolpe = new Set();
    // câmera
    this.fasePasso = 0; this.tremor = 0; this.afundar = 0; this.alturaOlhos = C.alturaOlhos;
    this.alturaPivo = CAM.alturaPivo; this.distCamera = CAM.distancia;
  }

  /** Direção para onde o corpo está virado, no plano do chão. */
  frente(alvo = new THREE.Vector3()) { return alvo.set(-Math.sin(this.rumo), 0, -Math.cos(this.rumo)); }

  gastar(q) {
    this.estamina = Math.max(0, this.estamina - q);
    this.esperaEstamina = C.estaminaEspera;
    if (this.estamina <= 0) this.exausto = true;
  }

  atualizar(dt) {
    const e = this.jogo.entrada;
    if (this.morto) { this.soltarMira(); this.atualizarCamera(dt, 0); return; }

    // ---------- câmera ----------
    this.atualizarMira(dt, e);
    if (this.alvo) {
      // Mira travada: a câmera fica atrás do caçador, apontada para o alvo.
      this.yaw += difAngulo(anguloPara(this.pos, this.alvo.pos), this.yaw) * (1 - Math.exp(-dt * M.giroCamera));
      this.pitch += (M.inclinacao - this.pitch) * (1 - Math.exp(-dt * 4));
    } else {
      const sensibilidade = C.sensibilidadeMouse * this.jogo.preferencias.sensibilidade / 100;
      this.yaw -= e.mouseDX * sensibilidade;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.mouseDY * sensibilidade, CAM.inclinacaoMin, CAM.inclinacaoMax);
      if (this.recentrar > 0) {   // pediu a mira sem inimigo por perto: a câmera volta para trás do corpo
        this.recentrar -= dt;
        this.yaw += difAngulo(this.rumo, this.yaw) * (1 - Math.exp(-dt * 12));
      }
    }

    // ---------- direção desejada ----------
    const lado = (e.segurando('KeyD') ? 1 : 0) - (e.segurando('KeyA') ? 1 : 0) + (e.ladoToque || 0);
    const adiante = (e.segurando('KeyW') ? 1 : 0) - (e.segurando('KeyS') ? 1 : 0) + (e.frenteToque || 0);
    const sen = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let dx = -sen * adiante + cos * lado, dz = -cos * adiante - sen * lado;
    const comp = Math.hypot(dx, dz);
    if (comp > 1) { dx /= comp; dz /= comp; }
    this.entradaDir = comp > 0.15 ? Math.atan2(-dx, -dz) : null;

    // ---------- esquiva ----------
    const querEsquivar = e.apertou('ControlLeft') || e.apertou('ControlRight') || e.apertou('AltLeft') || e.apertou('AltRight') || e.apertou('KeyQ');
    this.esperaEsquiva -= dt; this.invencivel -= dt;
    this.esquivaNaFila -= dt;
    if (querEsquivar) this.esquivaNaFila = CB.filaEsquiva;
    const podeCancelar = this.acao === 'recuperacao' && this.tAcao + dt >= CB[this.ataque].liberarEsquiva;
    if (this.esquivaNaFila > 0 && this.tEsquiva <= 0 && this.esperaEsquiva <= 0 && this.noChao &&
        !this.exausto && this.estamina >= CB.esquiva.custo && (this.acao === 'livre' || podeCancelar)) {
      this.gastar(CB.esquiva.custo);
      this.tEsquiva = CB.esquiva.duracao; this.invencivel = CB.esquiva.invencivel;
      this.esperaEsquiva = CB.esquiva.duracao + CB.esquiva.espera;
      this.rolando = comp > 0;
      if (this.rolando) {         // rola na direção do movimento
        this.dirEsquiva.set(dx, dz).normalize();
        this.rumo = Math.atan2(-dx, -dz);
      } else this.dirEsquiva.set(Math.sin(this.rumo), Math.cos(this.rumo));   // parado: salta para trás
      this.acao = 'livre'; this.ataque = null; this.carregando = false; this.bloqueando = false;
      this.ataqueNaFila = 0;
      this.esquivaNaFila = 0;
      this.jogo.eventos.emitir('jogador:esquiva');
    }
    this.atualizarCombate(dt, e);

    // ---------- velocidade ----------
    const correndo = (e.segurando('ShiftLeft') || e.corridaToque) && comp > 0.3 &&
      !this.exausto && !this.bloqueando && !this.carregando && this.acao === 'livre';

    // ---------- para onde o corpo vira ----------
    // Com a mira travada ele encara o alvo (menos correndo ou rolando);
    // sem trava, vira para onde anda.
    if (this.tEsquiva <= 0 && (this.acao === 'livre' || this.acao === 'aparar')) {
      const desejado = this.alvo && !correndo ? anguloPara(this.pos, this.alvo.pos) : this.entradaDir;
      if (desejado !== null) this.rumo += THREE.MathUtils.clamp(difAngulo(desejado, this.rumo), -C.giro * dt, C.giro * dt);
    }
    let alvo = correndo ? C.velCorrer : C.velAndar;
    if (this.bloqueando) alvo *= CB.bloqueio.velocidade;
    if (this.carregando || this.acao === 'preparo' || this.acao === 'ativo') alvo *= 0.45;
    if (this.acao === 'recuperacao') alvo *= 0.65;
    if (this.acao === 'aparar') alvo *= 0.4;
    if (this.acao === 'atordoado') alvo = 0;
    if (correndo && comp > 0 && this.noChao) this.gastar(C.custoCorrer * dt);

    if (this.tEsquiva > 0) {
      this.tEsquiva -= dt;
      const f = CB.esquiva.velocidade * (0.45 + 0.55 * this.tEsquiva / CB.esquiva.duracao);
      this.vel.x = this.dirEsquiva.x * f; this.vel.z = this.dirEsquiva.y * f;
    } else {
      // Aceleração suave: o corpo tem peso, não muda de direção na hora.
      const k = 1 - Math.exp(-(this.noChao ? C.aceleracao : C.aceleracao * 0.25) * dt);
      this.vel.x += (dx * alvo - this.vel.x) * k;
      this.vel.z += (dz * alvo - this.vel.z) * k;
    }

    // ---------- pulo e gravidade ----------
    if (e.apertou('Space') && this.noChao && this.estamina >= C.custoPulo && this.acao !== 'atordoado' && this.tEsquiva <= 0) {
      this.vel.y = C.forcaPulo; this.noChao = false; this.gastar(C.custoPulo);
      this.jogo.eventos.emitir('jogador:pulo');
    }
    this.vel.y -= C.gravidade * dt;

    // ---------- mover e colidir ----------
    const col = this.jogo.mundo.colisores;
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    col.resolver(this.pos, this.raio, this.pos.y, this.noChao ? 0.4 : 0.05);
    for (const i of this.jogo.inimigos) {   // não atravessa inimigos vivos
      if (i.morto) continue;
      const ix = this.pos.x - i.pos.x, iz = this.pos.z - i.pos.z, d = Math.hypot(ix, iz), min = this.raio + i.raio;
      if (d < min && d > 1e-4) { this.pos.x = i.pos.x + ix / d * min; this.pos.z = i.pos.z + iz / d * min; }
    }
    col.resolver(this.pos, this.raio, this.pos.y, this.noChao ? 0.4 : 0.05);
    this.pos.y += this.vel.y * dt;
    const chao = col.alturaDoChao(this.pos.x, this.pos.z, this.pos.y, this.noChao ? 0.4 : 0.05);
    if (this.pos.y <= chao || (this.noChao && this.pos.y - chao < 0.45 && this.vel.y <= 0)) {
      if (!this.noChao && this.vel.y < -5) { this.afundar = Math.min(0.25, -this.vel.y * 0.022); this.jogo.eventos.emitir('jogador:pouso'); }
      this.pos.y = chao; this.vel.y = 0; this.noChao = true;
    } else {
      this.noChao = false;
    }

    // ---------- estamina volta com o tempo ----------
    this.esperaEstamina -= dt;
    if (this.esperaEstamina <= 0 && !this.carregando) {
      this.estamina = Math.min(C.estaminaMax, this.estamina + C.estaminaRegen * (this.bloqueando ? 0.35 : 1) * dt);
    }
    if (this.exausto && this.estamina > 25) this.exausto = false;

    // ---------- passos ----------
    const rapidez = Math.hypot(this.vel.x, this.vel.z);
    if (this.noChao && rapidez > 0.6 && this.tEsquiva <= 0) {
      const antes = Math.floor(this.fasePasso / Math.PI);
      this.fasePasso += rapidez * dt * 1.85;
      if (Math.floor(this.fasePasso / Math.PI) !== antes) this.jogo.eventos.emitir('jogador:passo', { correndo });
    }
    this.atualizarCamera(dt, rapidez);
  }

  // ---------------------------------------------------------------------------
  //  Travar a mira
  // ---------------------------------------------------------------------------
  travar(inimigo) {
    this.alvo = inimigo;
    this.tSemVisao = 0; this.acumuloTroca = 0;
    if (inimigo.barra && inimigo.tipo !== 'guardiao') inimigo.barra.visible = true;
    this.jogo.eventos.emitir('mira:travou', inimigo);
  }

  soltarMira() {
    if (!this.alvo) return;
    this.alvo = null;
    this.jogo.eventos.emitir('mira:soltou');
  }

  /**
   * Procura o melhor inimigo para travar. lado = -1/+1 troca para o alvo à
   * esquerda/direita do atual; qualquerDirecao aceita alvos fora da tela.
   */
  escolherAlvo(excluir = null, qualquerDirecao = false, lado = 0) {
    const col = this.jogo.mundo.colisores;
    let melhor = null, menor = Infinity;
    for (const i of this.jogo.inimigos) {
      if (i === excluir || i.morto || i.grupo?.visible === false) continue;
      const d = Math.hypot(i.pos.x - this.pos.x, i.pos.z - this.pos.z);
      if (d > M.alcance || Math.abs(i.pos.y - this.pos.y) > 4 || col.bloqueiaTrecho(this.pos, i.pos, 1.45)) continue;
      const angulo = difAngulo(anguloPara(this.pos, i.pos), this.yaw);   // positivo = à esquerda
      let nota;
      if (lado) {
        if (angulo * lado > -0.03) continue;
        nota = Math.abs(angulo) + d * 0.02;
      } else {
        if (!qualquerDirecao && Math.cos(angulo) < M.cone) continue;
        nota = Math.abs(angulo) * 5 + d;
      }
      if (nota < menor) { menor = nota; melhor = i; }
    }
    return melhor;
  }

  atualizarMira(dt, e) {
    this.tTroca -= dt;
    if (e.apertou('Tab') || e.botoesApertados[1]) {
      if (this.alvo) this.soltarMira();
      else {
        const inimigo = this.escolherAlvo();
        if (inimigo) this.travar(inimigo); else this.recentrar = 0.35;
      }
    }
    const a = this.alvo;
    if (!a) return;
    if (a.morto) {   // o alvo caiu: passa para o próximo inimigo por perto
      const proximo = this.escolherAlvo(a, true);
      if (proximo) this.travar(proximo); else this.soltarMira();
      return;
    }
    const visto = !this.jogo.mundo.colisores.bloqueiaTrecho(this.pos, a.pos, 1.45);
    this.tSemVisao = visto ? 0 : this.tSemVisao + dt;
    if (Math.hypot(a.pos.x - this.pos.x, a.pos.z - this.pos.z) > M.soltar ||
        this.tSemVisao > M.semVisao || a.grupo?.visible === false) { this.soltarMira(); return; }
    // Um movimento rápido do mouse (ou do dedo) troca de alvo.
    this.acumuloTroca = this.acumuloTroca * Math.exp(-dt * 5) + e.mouseDX;
    if (Math.abs(this.acumuloTroca) > M.trocaMouse && this.tTroca <= 0) {
      const proximo = this.escolherAlvo(a, false, Math.sign(this.acumuloTroca));
      if (proximo) this.travar(proximo);
      this.acumuloTroca = 0; this.tTroca = 0.4;
    }
  }

  /** Vira o corpo para o golpe: alvo travado, direção do movimento ou inimigo colado. */
  orientarParaGolpe() {
    if (this.alvo) { this.rumo = anguloPara(this.pos, this.alvo.pos); return; }
    if (this.entradaDir !== null) { this.rumo = this.entradaDir; return; }
    const col = this.jogo.mundo.colisores;
    let melhor = null, menor = M.ajudaSemTrava;
    for (const i of this.jogo.inimigos) {
      if (i.morto || Math.abs(i.pos.y - this.pos.y) > 1.6) continue;
      const d = Math.hypot(i.pos.x - this.pos.x, i.pos.z - this.pos.z);
      if (d >= menor) continue;
      const angulo = anguloPara(this.pos, i.pos);
      if (Math.cos(angulo - this.rumo) < 0 && Math.cos(angulo - this.yaw) < 0.3) continue;   // está às costas
      if (col.bloqueiaTrecho(this.pos, i.pos, 1.22)) continue;
      menor = d; melhor = angulo;
    }
    if (melhor !== null) this.rumo = melhor;
  }

  // ---------------------------------------------------------------------------
  //  Regras do combate
  // ---------------------------------------------------------------------------
  atualizarCombate(dt, e) {
    const antes = this.tAcao;
    this.tAcao += dt;
    this.ataqueNaFila -= dt;
    if (this.ataque) {
      const a = CB[this.ataque];
      if (this.acao === 'preparo' && this.tAcao >= a.preparo) {
        this.acao = 'ativo';
        this.tAcao -= a.preparo;
        this.varrerGolpe(a, 0, this.tAcao / a.ativo);
      } else if (this.acao === 'ativo') {
        this.varrerGolpe(a, antes / a.ativo, Math.min(1, this.tAcao / a.ativo));
        if (this.acao === 'ativo' && this.tAcao >= a.ativo) {
          this.acao = 'recuperacao';
          this.tAcao -= a.ativo;
        }
      } else if (this.acao === 'recuperacao' && this.tAcao >= a.recuperacao) {
        this.acao = 'livre'; this.ataque = null;
      }
    }
    if (this.acao === 'atordoado' && this.tAcao >= 0.7) this.acao = 'livre';
    const ap = CB.aparar;
    if (this.acao === 'aparar' && this.tAcao >= ap.preparo + ap.janela + ap.recuperacao) this.acao = 'livre';

    // ---------- aparar (parry) ----------
    this.apararNaFila -= dt;
    if (e.apertou('KeyC')) this.apararNaFila = 0.15;
    if (this.apararNaFila > 0 && this.acao === 'livre' && this.tEsquiva <= 0 && this.noChao) {
      this.apararNaFila = 0;
      if (this.exausto || this.estamina < ap.custo) this.jogo.eventos.emitir('jogador:sem-estamina');
      else {
        this.gastar(ap.custo);
        this.acao = 'aparar'; this.tAcao = 0;
        this.carregando = false; this.ataqueNaFila = 0;
        this.orientarParaGolpe();
        this.jogo.eventos.emitir('jogador:aparar');
      }
    }

    const livre = this.acao === 'livre' && this.tEsquiva <= 0;
    if (e.botoesApertados[0] && this.tEsquiva <= 0 && this.acao !== 'atordoado' && this.acao !== 'aparar') {
      this.carregando = true;
      this.tCarga = 0;
      this.avisouCarga = false;
    }
    if (this.carregando) {
      if (e.botoes[0]) this.tCarga += dt;
      if (livre && this.tCarga >= CB.tempoSegurarForte && !this.avisouCarga) {
        this.avisouCarga = true;
        this.jogo.eventos.emitir('jogador:carregando');
      }
      if (!e.botoes[0] || this.tCarga >= CB.tempoMaximoCarga) {
        this.tipoNaFila = this.tCarga >= CB.tempoSegurarForte ? 'forte' : 'leve';
        this.ataqueNaFila = CB.filaAtaque;
        this.carregando = false;
      }
    }
    if (livre && !this.carregando && this.ataqueNaFila > 0) {
      this.ataqueNaFila = 0;
      this.iniciarAtaque(this.tipoNaFila);
    }
    this.bloqueando = e.botoes[2] && this.acao === 'livre' && !this.carregando && this.tEsquiva <= 0;
  }

  iniciarAtaque(tipo) {
    if (this.exausto || this.estamina < CB[tipo].custo) {
      this.jogo.eventos.emitir('jogador:sem-estamina');
      return;
    }
    this.ataque = tipo; this.acao = 'preparo'; this.tAcao = 0;
    this.golpeAlternado = !this.golpeAlternado;
    this.orientarParaGolpe();
    this.yawGolpe = this.rumo;
    this.contatoParede = null;
    this.alvosDoGolpe.clear();
    this.gastar(CB[tipo].custo);
    this.jogo.eventos.emitir('jogador:golpe', { forte: tipo === 'forte' });
  }

  varrerGolpe(a, de, ate) {
    const col = this.jogo.mundo.colisores;
    const forte = this.ataque === 'forte';
    const lado = forte || this.golpeAlternado ? 1 : -1;
    const passos = Math.max(1, Math.ceil((ate - de) * 18));
    const altura = this.pos.y + 1.22;
    for (let passo = 0; passo <= passos; passo++) {
      const progresso = de + (ate - de) * passo / passos;
      const angulo = this.yawGolpe + lado * a.arco * (2 * progresso - 1);
      const x = -Math.sin(angulo), z = -Math.cos(angulo);
      const ponta = { x: this.pos.x + x * a.alcance, z: this.pos.z + z * a.alcance };
      const parede = col.interceptarTrecho(this.pos, ponta, altura);
      const alcance = (parede ?? 1) * a.alcance;
      for (const i of this.jogo.inimigos) {
        if (i.morto || this.alvosDoGolpe.has(i) || Math.abs(i.pos.y - this.pos.y) > 1.6) continue;
        const dx = i.pos.x - this.pos.x, dz = i.pos.z - this.pos.z;
        const aoLongo = dx * x + dz * z;
        const lateral = dx * z - dz * x;
        const raio = i.raio + 0.08;
        if (Math.abs(lateral) >= raio || aoLongo <= 0 ||
            aoLongo - Math.sqrt(raio * raio - lateral * lateral) > alcance ||
            col.bloqueiaTrecho(this.pos, i.pos, altura)) continue;
        this.alvosDoGolpe.add(i);
        // Inimigo desequilibrado por um aparo leva um golpe crítico.
        const critico = i.receberDano(a.dano, { x, z }, a.empurrao, forte) === 'critico';
        this.tremor = Math.max(this.tremor, critico ? 0.09 : forte ? 0.05 : 0.025);
        this.jogo.pausaDeImpacto(critico ? CB.critico.pausa : forte ? CB.pausaImpacto * 1.4 : CB.pausaImpacto);
        this.jogo.eventos.emitir('golpe:acertou', { forte, critico });
      }
      if (parede !== null) {
        this.contatoParede = progresso;
        this.acao = 'recuperacao';
        this.tAcao = 0;
        this.tremor = Math.max(this.tremor, 0.034);
        this.jogo.pausaDeImpacto(0.035);
        this.jogo.eventos.emitir('golpe:parede', {
          x: this.pos.x + x * alcance, y: altura, z: this.pos.z + z * alcance,
        });
        return;
      }
    }
  }

  /** Chamado pelos inimigos. origem = posição de quem bateu. Devolve o que aconteceu. */
  receberDano(dano, origem, atacante = null) {
    if (this.morto) return 'ignorado';
    if (this.invencivel > 0) return 'esquivou';
    const dx = origem.x - this.pos.x, dz = origem.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    const f = this.frente();
    const deFrente = (dx * f.x + dz * f.z) / d > 0.2;
    // Aparo: o golpe chegou de frente, dentro da janela. Nenhum dano, e o
    // atacante fica desequilibrado e aberto a um golpe crítico.
    const ap = CB.aparar;
    if (this.acao === 'aparar' && deFrente && this.tAcao >= ap.preparo && this.tAcao <= ap.preparo + ap.janela) {
      this.acao = 'livre'; this.tAcao = 0;
      this.invencivel = Math.max(this.invencivel, 0.25);
      this.tremor = Math.max(this.tremor, 0.045);
      this.jogo.pausaDeImpacto(0.12);
      atacante?.serAparado?.();
      this.jogo.eventos.emitir('jogador:aparou', atacante);
      return 'aparou';
    }
    let resultado = 'ferido';
    if (this.bloqueando && deFrente) {
      const custo = dano * CB.bloqueio.custoPorDano;
      const aguentou = this.estamina >= custo * 0.6;
      this.gastar(custo);
      if (aguentou) { dano *= 1 - CB.bloqueio.reducao; resultado = 'bloqueou'; }
      else { dano *= 0.5; resultado = 'guarda-quebrada'; this.acao = 'atordoado'; this.tAcao = 0; this.ataque = null; }
      this.jogo.eventos.emitir('jogador:bloqueou', { quebrou: !aguentou });
    }
    this.vida -= dano;
    this.tremor = Math.max(this.tremor, resultado === 'bloqueou' ? 0.03 : 0.07);
    this.vel.x -= dx / d * (resultado === 'bloqueou' ? 2.5 : 5); this.vel.z -= dz / d * (resultado === 'bloqueou' ? 2.5 : 5);
    if (resultado !== 'bloqueou') {
      this.carregando = false;
      this.avisouCarga = false;
      this.jogo.eventos.emitir('jogador:ferido', { dano });
    }
    if (this.vida <= 0) { this.vida = 0; this.morto = true; this.bloqueando = false; this.carregando = false; this.jogo.eventos.emitir('jogador:morreu'); }
    return resultado;
  }

  // ---------------------------------------------------------------------------
  //  Câmera em terceira pessoa: gira em volta de um ponto acima da cabeça,
  //  encurta ao encostar em paredes e treme nos impactos.
  // ---------------------------------------------------------------------------
  atualizarCamera(dt, rapidez = 0) {
    const cam = this.jogo.camera, col = this.jogo.mundo.colisores;
    this.tremor *= Math.exp(-dt * 9);
    this.afundar *= Math.exp(-dt * 8);
    const suave = (k) => (dt > 0 ? 1 - Math.exp(-dt * k) : 1);
    this.alturaPivo += ((this.morto ? 0.9 : CAM.alturaPivo) - this.alturaPivo) * suave(this.morto ? 2.5 : 12);
    const py = this.pos.y + this.alturaPivo - this.afundar;

    // Direção para onde a câmera olha.
    const cp = Math.cos(this.pitch);
    const fx = -Math.sin(this.yaw) * cp, fy = Math.sin(this.pitch), fz = -Math.cos(this.yaw) * cp;
    let d = CAM.distancia;
    if (fy > 0.01) d = Math.min(d, (this.alturaPivo - 0.25) / fy);   // olhando para cima: não entra no chão
    const parede = col.interceptarTrecho(this.pos, { x: this.pos.x - fx * d, z: this.pos.z - fz * d }, py, CAM.folga, py - fy * d, 0.8);
    if (parede !== null) d *= parede;
    d = Math.max(0.35, d);
    // Encurta na hora (nunca atravessa a parede) e volta devagar.
    this.distCamera = d < this.distCamera ? d : this.distCamera + (d - this.distCamera) * suave(6);

    const t = this.tremor, D = this.distCamera;
    cam.position.set(
      this.pos.x - fx * D + (Math.random() - 0.5) * t,
      py - fy * D + (Math.random() - 0.5) * t,
      this.pos.z - fz * D + (Math.random() - 0.5) * t,
    );
    cam.rotation.order = 'YXZ';
    cam.rotation.set(this.pitch + (Math.random() - 0.5) * t * 0.6, this.yaw, 0);
  }

  /** Dados que precisariam ir para um servidor/salvamento no futuro. */
  exportarEstado() {
    return { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw, rumo: this.rumo, vida: this.vida, acao: this.acao, bloqueando: this.bloqueando };
  }
}
