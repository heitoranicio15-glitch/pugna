// =============================================================================
//  O JOGO
//  Junta todas as partes e roda o "laço" (o que acontece ~60 vezes por segundo).
//
//  Estados: 'titulo' → 'jogando' ⇄ 'pausado', e 'morto' → volta a 'jogando'.
//
//  Onde encaixar coisas novas no futuro:
//   - multiplayer: escute this.eventos e use jogador.exportarEstado() para enviar;
//     os outros jogadores seriam mais uma lista, como this.inimigos.
//   - salvar no Supabase: troque SalvamentoLocal por outra classe (veja Salvamento.js).
//   - novas áreas: outra classe como Vilarejo (veja mundo/Vilarejo.js).
//   - inventário/chefes: novas entidades em src/entidades, criadas aqui.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Eventos } from './Eventos.js';
import { Entrada } from './Entrada.js';
import { SalvamentoLocal } from './Salvamento.js';
import { RenderizadorRetro } from '../render/RenderizadorRetro.js';
import { Ceu } from '../mundo/Ceu.js';
import { Vilarejo } from '../mundo/Vilarejo.js';
import { Jogador } from '../entidades/Jogador.js';
import { Arma } from '../entidades/Arma.js';
import { Inimigo } from '../entidades/Inimigo.js';
import { Lanterna } from '../entidades/Lanterna.js';
import { Som } from '../audio/Som.js';
import { Hud } from '../interface/Hud.js';

export class Jogo {
  constructor(container) {
    this.eventos = new Eventos();
    this.render = new RenderizadorRetro(container);
    this.entrada = new Entrada(this.render.canvas);
    this.salvamento = new SalvamentoLocal();
    this.hud = new Hud();

    // ---------- mundo ----------
    this.cena = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.render.campoDeVisao, 16 / 9, 0.08, 3000);
    this.ceu = new Ceu(this.cena);
    this.mundo = new Vilarejo(this.cena, this.ceu.direcaoLua);

    // Uma luz fraca que acompanha o jogador, para enxergar o que está bem perto
    // (truque comum nos jogos antigos de masmorra).
    this.luzJogador = new THREE.PointLight(0x7a86ff, 5, 11, 1.6);
    this.cena.add(this.luzJogador);

    // ---------- entidades ----------
    this.jogador = new Jogador(this);
    this.arma = new Arma();
    this.inimigos = this.mundo.inimigos.map((i) => new Inimigo(this, i.tipo, i.rota));
    this.lanternas = this.mundo.pontosDeDescanso.map((p) => new Lanterna(this, p));
    this.descanso = this.lanternas[0];       // onde o jogador renasce

    this.som = new Som(this.eventos, this);
    this.estado = 'titulo';
    this.tempo = 0;
    this.congelado = 0;                      // pausa de impacto ("hit stop")
    this.tMorte = 0;
    this.teste = new URLSearchParams(location.search).has('teste'); // usado nos testes automáticos

    document.getElementById('titulo-jogo').textContent = CONFIG.titulo;
    document.title = CONFIG.titulo;
    this.ligarInterface();
    this.ligarEventos();
  }

  // ---------------------------------------------------------------------------
  ligarInterface() {
    document.getElementById('botao-comecar').addEventListener('click', () => this.comecar());
    document.getElementById('tela-pausa').addEventListener('click', () => this.entrada.travarMouse());
    document.addEventListener('pointerlockchange', () => {
      if (this.entrada.travado && this.estado === 'pausado') { this.estado = 'jogando'; this.hud.mostrarTela(null); this.som.silenciar(false); }
      else if (!this.entrada.travado && this.estado === 'jogando' && !this.teste) { this.estado = 'pausado'; this.hud.mostrarTela('pausa'); this.som.silenciar(true); }
    });
    addEventListener('keydown', (e) => {
      if (e.code === 'KeyF' && this.estado !== 'titulo') this.alternarTelaCheia();
    });
    // Ctrl+W fecha a aba no Chrome e o jogo usa Ctrl para esquivar: se a aba for
    // fechar com Ctrl apertado durante o jogo, o navegador pede confirmação.
    addEventListener('beforeunload', (e) => {
      if (this.estado === 'jogando' && (this.entrada.segurando('ControlLeft') || this.entrada.segurando('ControlRight'))) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  ligarEventos() {
    this.eventos.em('jogador:ferido', () => this.hud.piscarDano());
    this.eventos.em('jogador:morreu', () => { this.estado = 'morto'; this.tMorte = 0; this.hud.mostrarTela('morte'); this.hud.fixar(''); });
  }

  alternarTelaCheia() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    document.documentElement.requestFullscreen?.().then(() => {
      // Em tela cheia o Chrome deixa o jogo "segurar" atalhos como Ctrl+W.
      navigator.keyboard?.lock?.().catch(() => {});
      this.entrada.travarMouse();
    }).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  async comecar() {
    this.som.ligar();
    const salvo = await this.salvamento.carregar();
    this.descanso = this.lanternas.find((l) => l.id === salvo.descanso) || this.lanternas[0];
    if (salvo.descanso) this.renascer();
    else this.jogador.reiniciar(this.mundo.nascimento.x, this.mundo.nascimento.z, 0);
    this.estado = 'jogando';
    this.hud.mostrarTela(null);
    this.entrada.ignorarTrava = this.teste;
    this.entrada.travarMouse();
  }

  /** Coloca o jogador na lanterna de descanso e traz todos os inimigos de volta. */
  renascer() {
    const l = this.descanso;
    this.jogador.reiniciar(l.x - Math.sin(l.olhar) * 1.2, l.z - Math.cos(l.olhar) * 1.2 + 0.001, l.olhar === Math.PI ? 0 : l.olhar);
    for (const i of this.inimigos) i.reiniciar();
  }

  descansar(lanterna) {
    this.descanso = lanterna;
    this.salvamento.salvar({ descanso: lanterna.id });
    this.hud.fecharVeu(true);
    this.eventos.emitir('descanso', lanterna);
    setTimeout(() => {
      const j = this.jogador;
      j.vida = CONFIG.jogador.vidaMax; j.estamina = CONFIG.jogador.estaminaMax;
      for (const i of this.inimigos) i.reiniciar();
      this.hud.fecharVeu(false);
      this.hud.avisar('você descansou');
    }, 900);
  }

  pausaDeImpacto(segundos) { this.congelado = Math.max(this.congelado, segundos); }

  // ---------------------------------------------------------------------------
  iniciar() {
    const relogio = new THREE.Clock();
    const laco = () => {
      requestAnimationFrame(laco);
      const dt = Math.min(relogio.getDelta(), 0.05); // nunca "pula" mais que 1/20 s
      this.atualizar(dt);
      this.entrada.limparQuadro();
    };
    laco();
  }

  atualizar(dt) {
    this.camera.aspect = this.render.proporcao; this.camera.updateProjectionMatrix();

    if (this.estado === 'titulo') {
      // Câmera parada na entrada do vilarejo, olhando para a lua.
      this.tempo += dt;
      this.camera.position.set(Math.sin(this.tempo * 0.1) * 0.6, 2.1, 52);
      this.camera.rotation.set(0.33 + Math.sin(this.tempo * 0.17) * 0.015, Math.sin(this.tempo * 0.07) * 0.05, 0);
      this.mundo.atualizar(dt, this.tempo);
      for (const l of this.lanternas) l.atualizar(this.tempo);
      this.ceu.atualizar(dt, this.tempo, this.camera, this.camera.position);
      this.render.desenhar(this.cena, this.camera);
      return;
    }
    if (this.estado === 'pausado') { this.render.desenhar(this.cena, this.camera, this.arma.cena, this.arma.camera); return; }

    // Pausa de impacto: o mundo congela por um instante quando um golpe acerta.
    if (this.congelado > 0) { this.congelado -= dt; dt = 0.0001; }
    this.tempo += dt;

    this.jogador.atualizar(dt);
    for (const i of this.inimigos) i.atualizar(dt);
    this.mundo.atualizar(dt, this.tempo);
    this.ceu.atualizar(dt, this.tempo, this.camera, this.jogador.pos);
    this.arma.atualizar(dt, this.jogador, this.render.proporcao);
    this.luzJogador.position.copy(this.camera.position);

    // Luz de fogo na espada quando há tocha por perto.
    let fogo = 0;
    for (const t of this.mundo.tochas) {
      if (!t.luz) continue;
      t.luz.getWorldPosition(this._v || (this._v = new THREE.Vector3()));
      fogo = Math.max(fogo, 1 - this._v.distanceTo(this.camera.position) / 9);
    }
    this.arma.luzFogo.intensity = fogo * 6;

    // Lanternas: aviso e descanso.
    let perto = null;
    for (const l of this.lanternas) { l.atualizar(this.tempo); if (l.distancia(this.jogador.pos) < 2.4) perto = l; }
    if (this.estado === 'jogando') {
      const porta = this.mundo.igreja?.porta;
      const naPorta = porta && Math.hypot(this.jogador.pos.x - porta.x, this.jogador.pos.z - porta.z) < 2.6;
      this.hud.fixar(perto ? 'E — descansar na lanterna' : naPorta ? 'a porta está selada. algo respira do outro lado.' : '');
      if (perto && this.entrada.apertou('KeyE') && this.jogador.acao === 'livre') this.descansar(perto);
    }

    // Morte: espera, escurece, renasce na lanterna.
    if (this.estado === 'morto') {
      this.tMorte += dt;
      if (this.tMorte > 3.2 && !this.renascendo) {
        this.renascendo = true;
        this.hud.fecharVeu(true);
        setTimeout(() => {
          this.renascer(); this.estado = 'jogando'; this.renascendo = false;
          this.hud.mostrarTela(null); this.hud.fecharVeu(false);
        }, 1000);
      }
    }

    this.hud.atualizar(dt, this.jogador, CONFIG.jogador.vidaMax, CONFIG.jogador.estaminaMax);
    this.render.desenhar(this.cena, this.camera, this.arma.cena, this.arma.camera);
  }
}
