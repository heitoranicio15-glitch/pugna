// =============================================================================
//  O JOGADOR (o caçador)
//  Movimento em terceira pessoa + vida, estamina e as regras do combate.
//  A câmera gira em volta do caçador (yaw/pitch); o corpo tem o próprio rumo.
//  O desenho do boneco fica em Boneco.js; aqui ficam só as REGRAS.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { alcancaPisada, pelasCostas } from './Furtividade.js';

const C = CONFIG.jogador;
const CB = CONFIG.combate;
const CAM = CONFIG.camera;
const M = CONFIG.mira;
const F = CONFIG.combate.furtividade;

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
    this.acao = 'livre';        // livre | preparo | ativo | recuperacao | tiro | curando | atordoado | visceral
    this.tAcao = 0;             // tempo dentro da ação atual
    this.tAtordoado = CB.interrupcao.cambaleio;   // quanto dura o atordoamento atual
    // Rally: vida que ainda dá para recuperar batendo, e o tempo que resta para isso.
    this.recuperavel = 0; this.tRally = 0;
    this.ataque = null;         // 'leve' ou 'forte'
    this.golpeAlternado = false;
    this.carregando = false; this.tCarga = 0; this.avisouCarga = false;
    this.cargaGolpe = 0;        // carga do forte em andamento (0 a 1)
    this.alvoVisceral = null; this.execucao = false; this.visceralEntrou = false;
    this.costas = false;        // o visceral atual é o golpe pelas costas (silencioso)
    this.agachado = false;      // Z alterna (CONFIG.combate.furtividade)
    this.correndo = false;
    this.pisadaDe = null; this.tPisada = 0;   // quem teve a rasteira pulada, e há quanto tempo
    this.bloqueando = false;    // sempre false: o bloqueio saiu com o broquel (fica para quem lê o campo)
    this.balas = CB.pistola.balasMax;   // munição da pistola (não vai para o save)
    this.tEsquiva = 0; this.esperaEsquiva = 0; this.invencivel = 0;
    this.dirEsquiva = new THREE.Vector2();
    this.rolando = false;       // esquiva com direção (rola) ou parado (salta para trás)
    this.quickstep = false;     // com a mira travada a esquiva é um passo curto, sem rolar
    this.tiroNaFila = 0;
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

  get primeiraPessoa() {
    return this.jogo.preferencias.perspectiva === 'primeira' && !this.jogo.entrada.toque;
  }

  gastar(q) {
    this.estamina = Math.max(0, this.estamina - q);
    this.esperaEstamina = C.estaminaEspera;
    if (this.estamina <= 0) this.exausto = true;
  }

  atualizar(dt) {
    const e = this.jogo.entrada;
    if (this.morto) { this.soltarMira(); this.agachado = false; this.atualizarCamera(dt, 0); return; }

    // ---------- câmera ----------
    this.atualizarMira(dt, e);
    if (this.alvo) {
      // A mira em primeira pessoa acompanha a altura do ponto marcado no alvo.
      this.yaw += difAngulo(anguloPara(this.pos, this.alvo.pos), this.yaw) * (1 - Math.exp(-dt * M.giroCamera));
      let inclinacao = M.inclinacao;
      if (this.primeiraPessoa) {
        const alvo = this.alvo;
        const alturaAlvo = alvo.pos.y + 1.25 * alvo.cfg.escala;
        const distancia = Math.hypot(alvo.pos.x - this.pos.x, alvo.pos.z - this.pos.z);
        inclinacao = THREE.MathUtils.clamp(Math.atan2(alturaAlvo - this.pos.y - this.alturaOlhos, distancia),
          CAM.inclinacaoMin, CAM.inclinacaoMax);
      }
      this.pitch += (inclinacao - this.pitch) * (1 - Math.exp(-dt * 4));
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
    // A esquiva corta o fim de um golpe ou do tiro, depois de "liberarEsquiva".
    const podeCancelar = (this.acao === 'recuperacao' && this.tAcao + dt >= CB[this.ataque].liberarEsquiva) ||
      (this.acao === 'tiro' && this.tAcao + dt >= CB.pistola.liberarEsquiva);
    // Com a mira travada a esquiva vira quickstep: passo curto, mais barato, com
    // menos invencibilidade e recuperação curta. Sem mira, é o rolamento.
    const E = this.alvo ? CB.quickstep : CB.esquiva;
    if (this.esquivaNaFila > 0 && this.tEsquiva <= 0 && this.esperaEsquiva <= 0 && this.noChao &&
        !this.exausto && this.estamina >= E.custo && (this.acao === 'livre' || podeCancelar)) {
      this.gastar(E.custo);
      this.tEsquiva = E.duracao; this.invencivel = E.invencivel;
      this.esperaEsquiva = E.duracao + E.espera;
      this.quickstep = !!this.alvo;
      this.rolando = !this.quickstep && comp > 0;
      if (this.quickstep) {       // passo na direção apertada, sem virar o corpo (parado: para trás)
        if (comp > 0) this.dirEsquiva.set(dx, dz).normalize();
        else this.dirEsquiva.set(Math.sin(this.rumo), Math.cos(this.rumo));
      } else if (this.rolando) {  // rola na direção do movimento
        this.dirEsquiva.set(dx, dz).normalize();
        this.rumo = Math.atan2(-dx, -dz);
      } else this.dirEsquiva.set(Math.sin(this.rumo), Math.cos(this.rumo));   // parado: salta para trás
      this.acao = 'livre'; this.ataque = null; this.carregando = false;
      this.ataqueNaFila = 0;
      this.esquivaNaFila = 0;
      this.agachado = false;
      this.jogo.eventos.emitir('jogador:esquiva', { quickstep: this.quickstep });
    }
    this.atualizarCombate(dt, e);

    // ---------- agachar (Z alterna; não corre nem pula agachado) ----------
    if (e.apertou('KeyZ')) {
      this.agachado = !this.agachado && this.noChao && this.tEsquiva <= 0 &&
        (this.acao === 'livre' || this.acao === 'curando');
    }
    const olhos = C.alturaOlhos * (this.agachado ? F.alturaOlhos : 1);
    this.alturaOlhos += (olhos - this.alturaOlhos) * (dt > 0 ? 1 - Math.exp(-dt * 12) : 1);

    // ---------- velocidade ----------
    const correndo = (e.segurando('ShiftLeft') || e.corridaToque) && comp > 0.3 &&
      !this.exausto && !this.carregando && this.acao === 'livre' && !this.agachado;
    this.correndo = correndo;   // o barulho que os inimigos ouvem

    // ---------- para onde o corpo vira ----------
    // Com a mira travada ele encara o alvo (menos correndo ou rolando);
    // sem trava, vira para onde anda.
    if (this.tEsquiva <= 0 && (this.acao === 'livre' || this.acao === 'curando')) {
      const desejado = this.alvo && !correndo ? anguloPara(this.pos, this.alvo.pos)
        : this.primeiraPessoa ? this.yaw : this.entradaDir;
      if (desejado !== null) this.rumo += THREE.MathUtils.clamp(difAngulo(desejado, this.rumo), -C.giro * dt, C.giro * dt);
    }
    let alvo = correndo ? C.velCorrer : C.velAndar;
    if (this.carregando || this.acao === 'preparo' || this.acao === 'ativo') alvo *= 0.45;
    if (this.acao === 'recuperacao') alvo *= 0.65;
    if (this.acao === 'curando') alvo *= CB.frasco.velocidade;   // bebendo o frasco: anda devagar
    if (this.acao === 'atordoado') alvo = 0;
    if (this.agachado) alvo *= F.velocidade;
    if (correndo && comp > 0 && this.noChao) this.gastar(C.custoCorrer * dt);

    if (this.acao === 'visceral') {
      // Visceral: o caçador cola no inimigo e não anda por conta própria.
      const i = this.alvoVisceral, V = CB.visceral;
      this.vel.x = 0; this.vel.z = 0;
      if (i && !i.morto) {
        const ix = i.pos.x - this.pos.x, iz = i.pos.z - this.pos.z, d = Math.hypot(ix, iz);
        if (d > V.encosta) { this.vel.x = ix / d * (d - V.encosta) / V.momento; this.vel.z = iz / d * (d - V.encosta) / V.momento; }
      }
    } else if (this.tEsquiva > 0) {
      this.tEsquiva -= dt;
      const E = this.quickstep ? CB.quickstep : CB.esquiva;
      const f = E.velocidade * (0.45 + 0.55 * this.tEsquiva / E.duracao);
      this.vel.x = this.dirEsquiva.x * f; this.vel.z = this.dirEsquiva.y * f;
    } else {
      // Aceleração suave: o corpo tem peso, não muda de direção na hora.
      const k = 1 - Math.exp(-(this.noChao ? C.aceleracao : C.aceleracao * 0.25) * dt);
      this.vel.x += (dx * alvo - this.vel.x) * k;
      this.vel.z += (dz * alvo - this.vel.z) * k;
    }

    // ---------- pulo e gravidade ----------
    if (e.apertou('Space') && this.noChao && !this.agachado && this.estamina >= C.custoPulo && this.acao !== 'atordoado' && this.acao !== 'curando' && this.acao !== 'visceral' && this.tEsquiva <= 0) {
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
    this.tPisada += dt;
    if (this.pos.y <= chao || (this.noChao && this.pos.y - chao < 0.45 && this.vel.y <= 0)) {
      if (!this.noChao && this.vel.y < -5) { this.afundar = Math.min(0.25, -this.vel.y * 0.022); this.jogo.eventos.emitir('jogador:pouso'); }
      const pousou = !this.noChao;
      this.pos.y = chao; this.vel.y = 0; this.noChao = true;
      if (pousou) this.pousar();
    } else {
      this.noChao = false;
    }

    // ---------- estamina volta com o tempo ----------
    this.esperaEstamina -= dt;
    if (this.esperaEstamina <= 0 && !this.carregando) {
      this.estamina = Math.min(C.estaminaMax, this.estamina + C.estaminaRegen * dt);
    }
    if (this.exausto && this.estamina > 25) this.exausto = false;

    // ---------- passos ----------
    const rapidez = Math.hypot(this.vel.x, this.vel.z);
    if (this.noChao && rapidez > 0.6 && this.tEsquiva <= 0) {
      const antes = Math.floor(this.fasePasso / Math.PI);
      this.fasePasso += rapidez * dt * 1.85;
      if (Math.floor(this.fasePasso / Math.PI) !== antes) this.jogo.eventos.emitir('jogador:passo', { correndo, agachado: this.agachado });
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
    if (this.primeiraPessoa) { this.rumo = this.yaw; return; }
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
    if (this.acao === 'atordoado' && this.tAcao >= this.tAtordoado) this.acao = 'livre';
    if (this.acao === 'visceral') {
      const i = this.alvoVisceral;
      if (i && !i.morto) this.rumo = anguloPara(this.pos, i.pos);
      if (!this.visceralEntrou && this.tAcao >= CB.visceral.momento) { this.visceralEntrou = true; this.golpeVisceral(); }
      if (this.tAcao >= CB.visceral.duracao) { this.acao = 'livre'; this.alvoVisceral = null; }
    }
    // Frasco: a cura só acontece no fim do gole (quem aplica é o Jogo, que cuida da bolsa).
    if (this.acao === 'curando' && this.tAcao >= CB.frasco.tempo) {
      this.acao = 'livre';
      this.jogo.eventos.emitir('jogador:curou');
    }
    // Rally: acabou o tempo de revidar, a parte recuperável da vida escoa.
    if (this.recuperavel > 0) {
      this.tRally -= dt;
      if (this.tRally <= 0) this.recuperavel = Math.max(0, this.recuperavel - CB.rally.escoa * dt);
    }
    if (this.acao === 'tiro' && this.tAcao >= CB.pistola.recuperacao) this.acao = 'livre';

    // ---------- pistola (o parry) ----------
    // Clique direito ou C. Se o caçador estiver ocupado, o aperto espera um pouco.
    this.tiroNaFila -= dt;
    if (e.botoesApertados[2] || e.apertou('KeyC')) this.tiroNaFila = CB.pistola.fila;
    if (this.tiroNaFila > 0 && this.acao === 'livre' && this.tEsquiva <= 0) {
      this.tiroNaFila = 0;
      this.atirar();
    }

    const livre = this.acao === 'livre' && this.tEsquiva <= 0;
    if (e.botoesApertados[0] && this.tEsquiva <= 0 && this.acao !== 'atordoado' && this.acao !== 'curando') {
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
  }

  /**
   * Tiro de pistola: instantâneo, de curto alcance, sem bala voando. Toda bala
   * é gasta, acertando ou não (é o anti-spam). Se o inimigo estiver na janela
   * do golpe dele (veja MaquinaDeAtaque.naJanelaDeAparo), é um parry: ele fica
   * desequilibrado e o golpe não entra. Fora da janela, o tiro só arranha.
   * Devolve { acertou, aparou }, ou null se não deu para atirar.
   */
  atirar() {
    const P = CB.pistola;
    if (this.morto || this.acao !== 'livre' || this.tEsquiva > 0) return null;
    if (this.balas <= 0) { this.jogo.eventos.emitir('jogador:sem-bala'); return null; }
    this.balas--;
    this.agachado = false;
    this.carregando = false; this.avisouCarga = false; this.ataqueNaFila = 0;
    this.orientarParaGolpe();
    this.acao = 'tiro'; this.tAcao = 0;
    const alvo = this.alvoDoTiro();
    let aparou = false;
    if (alvo) {
      const golpe = alvo.ataque?.golpe;
      if (alvo.ataque?.naJanelaDeAparo(P)) {
        alvo.ataque.resolvido = true;   // o golpe aparado não entra mais
        alvo.serAparado(golpe);
        this.jogo.pausaDeImpacto(P.pausa);
        this.tremor = Math.max(this.tremor, P.tremor);
        this.invencivel = Math.max(this.invencivel, P.invencivel);
        this.jogo.eventos.emitir('jogador:aparou', alvo);
        aparou = true;
      } else {
        alvo.levarTiro(P.dano);
        // rasteira (a resposta é pular) ou golpe inaparável (a resposta é esquivar)
        if (golpe?.aparavel === false && alvo.ataque.fase !== 'recuperacao') {
          this.jogo.eventos.emitir('jogador:resposta-errada', { resposta: 'aparar', tipo: golpe.tipo, aviso: golpe.nomeAviso });
        }
      }
    }
    const resultado = { acertou: !!alvo, aparou };
    this.jogo.eventos.emitir('jogador:tiro', resultado);
    return resultado;
  }

  /**
   * Quem o tiro acerta: o alvo da mira travada, se estiver no alcance; senão o
   * inimigo vivo mais próximo no cone à frente. Parede no meio bloqueia.
   */
  alvoDoTiro() {
    const P = CB.pistola;
    const col = this.jogo.mundo.colisores;
    const altura = this.pos.y + 1.22;
    const f = this.frente();
    const alcanca = (i) => !i.morto && i.grupo?.visible !== false && Math.abs(i.pos.y - this.pos.y) <= 1.6 &&
      Math.hypot(i.pos.x - this.pos.x, i.pos.z - this.pos.z) <= P.alcance;
    if (this.alvo && alcanca(this.alvo)) {
      return col.bloqueiaTrecho(this.pos, this.alvo.pos, altura) ? null : this.alvo;
    }
    let melhor = null, menor = Infinity;
    for (const i of this.jogo.inimigos) {
      if (!alcanca(i)) continue;
      const dx = i.pos.x - this.pos.x, dz = i.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1e-4;
      if ((dx * f.x + dz * f.z) / d < P.abertura || d >= menor) continue;
      if (col.bloqueiaTrecho(this.pos, i.pos, altura)) continue;
      menor = d; melhor = i;
    }
    return melhor;
  }

  iniciarAtaque(tipo) {
    // Inimigo desequilibrado à frente: o ataque vira visceral (não gasta estamina).
    const aberto = this.alvoDoVisceral();
    if (aberto) { this.agachado = false; this.iniciarVisceral(aberto); return; }
    // Inimigo desatento de costas, bem perto: golpe pelas costas (silencioso).
    const desatento = this.alvoDasCostas();
    if (desatento) { this.iniciarVisceral(desatento, true); return; }
    this.agachado = false;
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
    // Carga do forte: 0 ao soltar logo depois de virar forte, 1 na carga máxima.
    this.cargaGolpe = tipo === 'forte'
      ? THREE.MathUtils.clamp((this.tCarga - CB.tempoSegurarForte) / (CB.tempoMaximoCarga - CB.tempoSegurarForte), 0, 1)
      : 0;
    this.jogo.eventos.emitir('jogador:golpe', { forte: tipo === 'forte', carga: this.cargaGolpe });
  }

  /**
   * O inimigo que um ataque agora transformaria em visceral: desequilibrado, a
   * até CONFIG.combate.visceral.alcance, à frente do caçador, sem parede no meio,
   * e com o caçador à frente dele (ou atrás, se ele foi aberto pelas costas).
   * De lado ou de longe, o golpe continua sendo o crítico comum.
   */
  alvoDoVisceral() {
    const V = CB.visceral, col = this.jogo.mundo.colisores;
    this.orientarParaGolpe();
    let melhor = null, menor = Infinity;
    for (const i of this.jogo.inimigos) {
      if (i.morto || i.estado !== 'desequilibrado' || Math.abs(i.pos.y - this.pos.y) > 1.6) continue;
      const dx = this.pos.x - i.pos.x, dz = this.pos.z - i.pos.z, d = Math.hypot(dx, dz) || 1e-4;
      if (d > V.alcance || d >= menor) continue;
      if (Math.cos(anguloPara(this.pos, i.pos) - this.rumo) < V.abertura) continue;   // não está à frente do caçador
      const lado = (Math.sin(i.angulo) * dx + Math.cos(i.angulo) * dz) / d;           // 1 = caçador bem na frente dele
      if (!(lado >= V.abertura || (i.visceralPelasCostas && lado <= -V.abertura))) continue;
      if (col.bloqueiaTrecho(this.pos, i.pos, this.pos.y + 1.22)) continue;
      menor = d; melhor = i;
    }
    return melhor;
  }

  /**
   * O inimigo que um ataque agora mataria pelas costas: comum, ainda patrulhando
   * (não percebeu o caçador), à frente do caçador, com o caçador no cone de
   * costas dele (CONFIG.combate.costas) e sem parede no meio.
   */
  alvoDasCostas() {
    const col = this.jogo.mundo.colisores;
    let melhor = null, menor = Infinity;
    for (const i of this.jogo.inimigos) {
      if (i.morto || i.estado !== 'patrulha' || i.cfg?.chefe || typeof i.receberCostas !== 'function' ||
        Math.abs(i.pos.y - this.pos.y) > 1.6) continue;
      const dx = this.pos.x - i.pos.x, dz = this.pos.z - i.pos.z, d = Math.hypot(dx, dz);
      if (d >= menor || !pelasCostas(i.angulo, dx, dz)) continue;
      if (Math.cos(anguloPara(this.pos, i.pos) - this.rumo) < CB.visceral.abertura) continue;
      if (col.bloqueiaTrecho(this.pos, i.pos, this.pos.y + 1.22)) continue;
      menor = d; melhor = i;
    }
    return melhor;
  }

  /**
   * Começa o visceral (ou a execução, se o golpe pesado do inimigo foi aparado).
   * costas = golpe pelas costas: mesma estocada, mas silenciosa e letal.
   */
  iniciarVisceral(inimigo, costas = false) {
    this.ataque = null; this.acao = 'visceral'; this.tAcao = 0;
    this.alvoVisceral = inimigo;
    this.costas = costas;
    this.execucao = !costas && !!inimigo.abertoParaExecucao;
    this.visceralEntrou = false;
    this.carregando = false; this.avisouCarga = false; this.ataqueNaFila = 0; this.tiroNaFila = 0;
    this.invencivel = Math.max(this.invencivel, CB.visceral.duracao);
    this.rumo = anguloPara(this.pos, inimigo.pos);
    this.jogo.eventos.emitir('jogador:visceral', { execucao: this.execucao, inimigo, costas });
  }

  /** O instante em que a lâmina entra: dano do tipo, pausa, tremor e rally cheio. */
  golpeVisceral() {
    const i = this.alvoVisceral;
    if (!i || i.morto) return;
    const T = this.execucao ? CB.execucao : CB.visceral;
    const f = this.frente();
    if (this.costas) {   // pelas costas: sem pausa de cinema e sem tremor
      i.receberCostas({ x: f.x, z: f.z });
      this.recuperarComGolpe(Infinity);
      return;
    }
    i.receberVisceral(CB.leve.dano * T.multiplicador, { x: f.x, z: f.z }, this.execucao);
    this.jogo.pausaDeImpacto(T.pausa);
    this.tremor = Math.max(this.tremor, T.tremor);
    this.recuperarComGolpe(Infinity);   // rally cheio
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
        // O forte cresce com a carga. Inimigo desequilibrado leva um golpe crítico.
        const K = CB.carga;
        const dano = forte ? a.dano * (1 + (K.multiplicadorMax - 1) * this.cargaGolpe) : a.dano;
        const critico = i.receberDano(dano, { x, z }, a.empurrao, forte) === 'critico';
        // Carga completa pelas costas: o inimigo fica desequilibrado e abre o visceral.
        if (forte && K.abrePelasCostas && !critico && this.cargaGolpe >= K.completa && !i.morto &&
            typeof i.desequilibrar === 'function' &&
            (Math.sin(i.angulo) * dx + Math.cos(i.angulo) * dz) / (Math.hypot(dx, dz) || 1e-4) > -K.costas) {
          i.desequilibrar({ pelasCostas: true });
        }
        this.recuperarComGolpe(dano);
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

  /** Começa a beber um frasco. A cura vem no fim (CONFIG.combate.frasco.tempo), se ele não apanhar antes. */
  comecarCura() {
    this.acao = 'curando'; this.tAcao = 0;
    this.carregando = false; this.avisouCarga = false;
    this.ataqueNaFila = 0; this.tiroNaFila = 0;
    this.jogo.eventos.emitir('jogador:bebendo');
  }

  /**
   * Rally: um golpe acertado devolve parte da vida perdida há pouco.
   * Devolve quanta vida voltou.
   */
  recuperarComGolpe(dano) {
    if (this.recuperavel <= 0 || this.morto) return 0;
    // dano = Infinity é o "rally cheio" do visceral: devolve todo o recuperável.
    const devolve = dano === Infinity ? this.recuperavel : dano * CB.rally.porDano;
    const cura = Math.max(0, Math.min(this.recuperavel, devolve, C.vidaMax - this.vida));
    this.vida += cura;
    this.recuperavel -= cura;
    if (this.recuperavel < 0.01) this.recuperavel = 0;
    if (cura > 0) this.jogo.eventos.emitir('jogador:rally', { cura });
    return cura;
  }

  /**
   * Apanhar interrompe o que o caçador estava fazendo: o golpe leve inteiro, o
   * gole do frasco e o golpe forte fora da parte "firme" (a metade final do
   * preparo e a passagem da lâmina aguentam um golpe fraco).
   * Devolve true se interrompeu.
   */
  interromper(dano) {
    const I = CB.interrupcao;
    const curando = this.acao === 'curando';
    const atacando = !!this.ataque && (this.acao === 'preparo' || this.acao === 'ativo' || this.acao === 'recuperacao');
    if (!curando && !atacando) return false;
    if (atacando && this.ataque === 'forte' && dano <= I.armaduraForte.danoMax) {
      const firme = this.acao === 'ativo' ||
        (this.acao === 'preparo' && this.tAcao >= CB.forte.preparo * I.armaduraForte.aPartirDe);
      if (firme) { this.jogo.eventos.emitir('jogador:aguentou'); return false; }
    }
    this.acao = 'atordoado'; this.tAcao = 0; this.tAtordoado = I.cambaleio;
    this.ataque = null; this.ataqueNaFila = 0; this.tiroNaFila = 0;
    this.jogo.eventos.emitir('jogador:interrompido', { cura: curando });
    return true;
  }

  /**
   * Chamado pelos inimigos. origem = posição de quem bateu. golpe = dados do
   * ataque (veja Ataques.js); sem ele, vale como um golpe alto comum.
   * Devolve o que aconteceu: 'ignorado', 'esquivou', 'pulou' ou 'ferido'.
   * (O parry acontece antes, no tiro: o golpe aparado já chega resolvido.)
   */
  receberDano(dano, origem, atacante = null, golpe = null) {
    if (this.morto) return 'ignorado';
    if (this.invencivel > 0) return 'esquivou';
    // Gancho do pulo: golpes rasteiros passam por baixo de quem está no ar.
    // (O contra-ataque pisando, item 5 do plano, parte do aviso 'jogador:pulou-golpe'.)
    if (golpe?.evitaPulando && !this.noChao && this.pos.y - (origem.y ?? 0) >= golpe.alturaPulo) {
      this.pisadaDe = atacante; this.tPisada = 0;   // caindo perto dele, pisa (veja pousar)
      this.jogo.eventos.emitir('jogador:pulou-golpe', atacante);
      return 'pulou';
    }
    // Pular contra golpe alto custa caro: no ar, o dano é maior.
    const X = CB.danoExtraNoAr;
    if (golpe?.tipo === 'alto' && !golpe.evitaPulando && !this.noChao && this.pos.y - (origem.y ?? 0) >= X.alturaMin) {
      dano *= X.multiplicador;
    }
    this.agachado = false;
    const dx = origem.x - this.pos.x, dz = origem.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    this.vida -= dano;
    this.tremor = Math.max(this.tremor, 0.07);
    this.vel.x -= dx / d * 5; this.vel.z -= dz / d * 5;
    this.carregando = false;
    this.avisouCarga = false;
    this.jogo.eventos.emitir('jogador:ferido', { dano });
    // Rally: parte do dano fica recuperável por alguns segundos (nunca mais do que falta de vida).
    this.recuperavel = Math.min(this.recuperavel + dano * CB.rally.parte, C.vidaMax - Math.max(0, this.vida));
    this.tRally = CB.rally.duracao;
    this.interromper(dano);
    if (this.vida <= 0) { this.recuperavel = 0; this.vida = 0; this.morto = true; this.carregando = false; this.jogo.eventos.emitir('jogador:morreu'); }
    return 'ferido';
  }

  /**
   * Chamado ao tocar o chão. Se o caçador acabou de pular a rasteira e caiu
   * perto do atacante, pisa nele (CONFIG.combate.pisada).
   */
  pousar() {
    const i = this.pisadaDe, P = CB.pisada;
    this.pisadaDe = null;
    if (!i || i.morto || typeof i.receberPisada !== 'function') return;
    const dx = i.pos.x - this.pos.x, dz = i.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1e-4;
    if (!alcancaPisada(this.tPisada, d)) return;
    const dano = CB.leve.dano * P.multiplicador;
    i.receberPisada(dano, { x: dx / d, z: dz / d });
    this.recuperarComGolpe(dano);
    this.vel.y = P.quique; this.noChao = false;   // quica um pouco
    this.jogo.pausaDeImpacto(CB.pausaImpacto);
    this.tremor = Math.max(this.tremor, 0.05);
    this.jogo.eventos.emitir('jogador:pisou', { inimigo: i });
  }

  // ---------------------------------------------------------------------------
  //  A câmera fica nos olhos em primeira pessoa, ou orbita com colisão em terceira.
  // ---------------------------------------------------------------------------
  atualizarCamera(dt, rapidez = 0) {
    const cam = this.jogo.camera, col = this.jogo.mundo.colisores;
    this.tremor *= Math.exp(-dt * 9);
    this.afundar *= Math.exp(-dt * 8);
    const suave = (k) => (dt > 0 ? 1 - Math.exp(-dt * k) : 1);
    cam.rotation.order = 'YXZ';
    const t = this.tremor;
    if (this.primeiraPessoa) {
      const altura = this.morto ? 0.55 : this.alturaOlhos;
      this.alturaPivo += (altura - this.alturaPivo) * suave(this.morto ? 2.5 : 12);
      const tremor = (Math.random() - 0.5) * t * 0.22;
      cam.position.set(this.pos.x, this.pos.y + Math.max(0.35, this.alturaPivo - this.afundar), this.pos.z);
      cam.rotation.set(this.pitch + tremor, this.yaw, 0);
      this.distCamera = 0;
      return;
    }
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

    const D = this.distCamera;
    cam.position.set(
      this.pos.x - fx * D + (Math.random() - 0.5) * t,
      py - fy * D + (Math.random() - 0.5) * t,
      this.pos.z - fz * D + (Math.random() - 0.5) * t,
    );
    cam.rotation.set(this.pitch + (Math.random() - 0.5) * t * 0.6, this.yaw, 0);
  }

  /** Dados que precisariam ir para um servidor/salvamento no futuro. */
  exportarEstado() {
    return { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw, rumo: this.rumo, vida: this.vida, recuperavel: this.recuperavel, acao: this.acao, bloqueando: false };
  }
}
