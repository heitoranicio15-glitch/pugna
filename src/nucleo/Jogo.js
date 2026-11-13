// =============================================================================
//  O JOGO
//  Junta todas as partes e roda o "laço" (o que acontece ~60 vezes por segundo).
//
//  Estados: 'titulo' → 'jogando' ⇄ 'pausado', e 'morto' → volta a 'jogando'.
//  Só o Esc pausa. A bolsa e as anotações abertas durante a partida NÃO pausam:
//  o mundo continua correndo e o caçador fica parado (this.painelAoVivo).
//
//  Onde encaixar coisas novas no futuro:
//   - multiplayer: escute this.eventos e use jogador.exportarEstado() para enviar;
//     os outros jogadores seriam mais uma lista, como this.inimigos.
//   - salvar no Supabase: troque SalvamentoLocal por outra classe (veja Salvamento.js).
//   - novas áreas: outra classe como Vilarejo (veja mundo/Vilarejo.js).
//   - inventário/chefes: novas entidades em src/entidades, criadas aqui.
//   - modelo do caçador: troque Boneco.js mantendo o método atualizar(dt, jogador).
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Eventos } from './Eventos.js';
import { Entrada } from './Entrada.js';
import { SalvamentoLocal, normalizarProgresso, SELOS_DO_VEU } from './Salvamento.js';
import { carregarPreferencias, salvarPreferencias } from './Preferencias.js';
import { RenderizadorRetro } from '../render/RenderizadorRetro.js';
import { Ceu } from '../mundo/Ceu.js';
import { Vilarejo } from '../mundo/Vilarejo.js';
import { Catedral } from '../mundo/Catedral.js';
import { Navegacao } from '../mundo/Navegacao.js';
import { Jogador } from '../entidades/Jogador.js';
import { Boneco } from '../entidades/Boneco.js';
import { Inimigo } from '../entidades/Inimigo.js';
import { Lanterna } from '../entidades/Lanterna.js';
import { Som } from '../audio/Som.js';
import { Trilha } from '../audio/Trilha.js';
import { Hud } from '../interface/Hud.js';
import { Menu } from '../interface/Menu.js';
import { Bolsa } from '../interface/Bolsa.js';
import { Toque } from '../interface/Toque.js';
import { ANOTACOES, CURA_FRASCO, FRASCOS, contarFrascos } from './Inventario.js';
import { alvoProximo, atualizarObjetos } from '../mundo/Interacoes.js';

export class Jogo {
  constructor(container) {
    this.eventos = new Eventos();
    this.render = new RenderizadorRetro(container);
    this.entrada = new Entrada(this.render.canvas);
    this.salvamento = new SalvamentoLocal();
    this.preferencias = carregarPreferencias();
    this.render.aplicarPreferencias(this.preferencias);
    this.hud = new Hud();

    // ---------- mundo ----------
    this.cena = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.render.campoDeVisao, 16 / 9, 0.08, 3000);
    this.ceu = new Ceu(this.cena);
    this.vilarejo = new Vilarejo(this.cena, this.ceu.direcaoLua);
    this.catedral = new Catedral(this.cena);
    this.areas = [this.vilarejo, this.catedral];
    this.areasPorId = new Map(this.areas.map((area) => [area.id, area]));

    // Uma luz fraca que acompanha o jogador, para enxergar o que está bem perto
    // (truque comum nos jogos antigos de masmorra).
    this.luzJogador = new THREE.PointLight(0x7a86ff, 5, 11, 1.6);
    this.cena.add(this.luzJogador);

    // ---------- entidades ----------
    this.jogador = new Jogador(this);
    this.boneco = new Boneco(this.cena);
    this.boneco.grupo.visible = false;
    for (const area of this.areas) {
      area.entidades = area.inimigos.map((i) => new Inimigo(this, area, i));
      area.lanternas = area.pontosDeDescanso.map((p) => new Lanterna(area, p));
      area.navegacao = new Navegacao(area.colisores, area.limites);
    }
    this.checkpoints = new Map(this.areas.flatMap((area) => area.lanternas.map((lanterna) => [lanterna.id, { area, lanterna }])));
    this.guardiao = this.catedral.entidades.find((i) => i.tipo === 'guardiao');
    this.progresso = normalizarProgresso();
    this.descanso = this.vilarejo.lanternas[0];
    this.ativarArea(this.vilarejo);

    this.som = new Som(this.eventos, this);
    this.trilha = new Trilha();
    this.estado = 'titulo';
    this.tempo = 0;
    this.congelado = 0;                      // pausa de impacto ("hit stop")
    this.tMorte = 0;
    this.tDescanso = 0;
    this.teste = new URLSearchParams(location.search).has('teste'); // usado nos testes automáticos
    this.entrada.ignorarTrava = this.teste;

    document.getElementById('titulo-jogo').textContent = CONFIG.titulo;
    document.title = CONFIG.titulo;
    this.menu = new Menu(this);
    this.bolsa = new Bolsa(this);
    this.toque = new Toque(this);
    this.pontoMira = new THREE.Vector3();
    this.salvamento.carregar().then((salvo) => this.menu.atualizarProgresso(salvo, this.localizarCheckpoint(salvo)?.lanterna.nome));
    this.ligarInterface();
    this.ligarEventos();
  }

  // ---------------------------------------------------------------------------
  ligarInterface() {
    document.addEventListener('pointerlockchange', () => {
      if (this.entrada.travado && this.estado === 'pausado' && !this.painel && !this.menu.opcoesAbertas && !this.menu.dialogo.open) {
        this.definirEstado('jogando');
      } else if (!this.entrada.podeJogar() && this.estado === 'jogando' && !this.painel) {
        this.definirEstado('pausado');
      }
    });
    document.addEventListener('pointerlockerror', () => {
      if (this.estado === 'pausado' && !this.entrada.toque && !this.painel && !this.menu.opcoesAbertas) {
        this.menu.avisar('Clique em Continuar para capturar o mouse.', this.estado);
      } else if (this.estado === 'jogando' && !this.painel && !this.entrada.podeJogar()) {
        this.definirEstado('pausado');   // fechou a bolsa e o navegador não devolveu o mouse
      }
    });
    addEventListener('keydown', (e) => {
      if (e.repeat || this.menu.dialogo.open) return;
      if ((e.code === 'Escape' || e.code === 'KeyI') && this.painel) {
        e.preventDefault();
        // Com a bolsa aberta no meio da partida, I volta ao jogo e Esc pausa.
        this.fecharPainel(e.code === 'Escape' && this.painelAoVivo);
      } else if (e.code === 'KeyI' && (this.estado === 'jogando' || this.estado === 'pausado') && !this.menu.opcoesAbertas) {
        this.abrirBolsa();
      } else if (e.code === 'Escape' && this.menu.opcoesAbertas) {
        e.preventDefault();
        this.menu.fecharOpcoes();
      } else if (e.code === 'Escape' && this.estado === 'jogando') {
        this.pausar();
      } else if (e.code === 'KeyF' && this.estado === 'jogando') {
        this.alternarTelaCheia();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.entrada.toque) this.pausar();
    });
    // Ctrl+W fecha a aba no Chrome e o jogo usa Ctrl para esquivar: se a aba for
    // fechar com Ctrl apertado durante o jogo, o navegador pede confirmação.
    addEventListener('beforeunload', (e) => {
      if (this.estado === 'jogando' && (this.entrada.segurando('ControlLeft') || this.entrada.segurando('ControlRight'))) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  ligarEventos() {
    this.eventos.em('jogador:ferido', () => this.hud.piscarDano());
    this.eventos.em('golpe:acertou', () => this.hud.mostrarContato('inimigo'));
    this.eventos.em('golpe:parede', () => this.hud.mostrarContato('parede'));
    this.eventos.em('jogador:bloqueou', ({ quebrou }) => this.hud.mostrarContato(quebrou ? 'inimigo' : 'bloqueio'));
    this.eventos.em('jogador:aparou', () => this.hud.destacar('aparou'));
    this.eventos.em('golpe:acertou', ({ critico }) => { if (critico) this.hud.destacar('critico'); });
    this.eventos.em('jogador:pulou-golpe', () => this.hud.destacar('pulou'));
    // Ensina a regra de ouro: a resposta que não serve para aquele tipo de golpe.
    this.eventos.em('jogador:resposta-errada', ({ resposta }) => this.hud.avisar(
      resposta === 'aparar' ? 'A rasteira não pode ser aparada. Pule.' : 'A rasteira passa por baixo da guarda. Pule.'));
    // Contra o spam: avisa quando a cura é cortada e conclui o gole do frasco.
    this.eventos.em('jogador:curou', () => this.concluirCura());
    this.eventos.em('jogador:interrompido', ({ cura }) => { if (cura) this.interromperCura(); });
    this.eventos.em('jogador:morreu', () => {
      this.painel = null;
      this.tMorte = 0;
      this.hud.limparAviso();
      this.definirEstado('morto');
    });
    this.eventos.em('guardiao:fase-final', () => this.hud.avisar('O Guardião investe com mais fúria.'));
    this.eventos.em('inimigo:morreu', (inimigo) => {
      if (inimigo.eventoDeDerrota) this.registrarEvento(inimigo.eventoDeDerrota);
      if (inimigo !== this.guardiao) return;
      this.atualizarAudio();
      this.hud.avisar('Guardião do Véu derrotado', 4);
    });
  }

  alternarTelaCheia() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    document.documentElement.requestFullscreen?.()?.then(() => {
      // Em tela cheia o Chrome deixa o jogo "segurar" atalhos como Ctrl+W.
      navigator.keyboard?.lock?.().catch(() => {});
      if (!this.entrada.podeJogar() && this.estado === 'jogando') this.entrada.travarMouse();
    }).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  async comecar() {
    if (this.estado !== 'titulo' || this.iniciando) return;
    this.iniciando = true;
    this.som.ligar();
    // Solicita a captura enquanto o clique do usuário ainda está ativo.
    if (!this.entrada.podeJogar()) this.entrada.travarMouse();
    this.progresso = await this.salvamento.carregar();
    const checkpoint = this.localizarCheckpoint(this.progresso);
    this.aplicarProgresso();
    this.descanso = checkpoint?.lanterna || this.vilarejo.lanternas[0];
    if (checkpoint) {
      this.renascer();
    } else {
      this.jogador.reiniciar(this.vilarejo.nascimento.x, this.vilarejo.nascimento.z, 0);
      this.reporInimigos();
    }
    this.definirEstado(this.entrada.podeJogar() ? 'jogando' : 'pausado');
    // Celular congelado: o jogo abre, mas as mecânicas novas não têm botão de toque.
    if (this.entrada.toque) this.hud.avisar('O celular não é suportado por enquanto. Jogue no computador.', 7);
    this.iniciando = false;
  }

  localizarCheckpoint(progresso) {
    return this.checkpoints.get(progresso.descanso);
  }

  definirEstado(estado) {
    this.estado = estado;
    this.painelAoVivo = false;
    this.entrada.habilitada = estado === 'jogando';
    this.toque.limpar();
    this.entrada.soltarTudo();
    this.toque.exibir();
    if (estado === 'pausado') this.soltarComandos();
    this.hud.mostrarTela({ titulo: 'titulo', pausado: 'pausa', morto: 'morte', jogando: null }[estado]);
    if (estado === 'pausado' || estado === 'titulo') {
      this.menu.atualizarProgresso(this.progresso, this.localizarCheckpoint(this.progresso)?.lanterna.nome);
    }
    if (estado === 'pausado') document.getElementById('continuar').focus();
    this.atualizarAudio();
  }

  /** Esquece os comandos que estavam a caminho (carga, filas de ataque e de esquiva). */
  soltarComandos() {
    const j = this.jogador;
    j.carregando = false;
    j.avisouCarga = false;
    j.bloqueando = false;
    j.apararNaFila = 0;
    j.ataqueNaFila = 0;
    j.esquivaNaFila = 0;
  }

  retomar() {
    if (this.estado !== 'pausado') return;
    this.som.ligar();
    if (this.entrada.podeJogar()) this.definirEstado('jogando');
    else this.entrada.travarMouse();
  }

  pausar() {
    if (this.estado !== 'jogando') return;
    this.definirEstado('pausado');
    if (this.entrada.travado) document.exitPointerLock();
  }

  /**
   * Abre a bolsa ou uma anotação. Durante a partida o jogo NÃO pausa: o mouse é
   * solto para clicar nos botões, o caçador para de receber comandos e o mundo
   * continua correndo. A partir do menu de pausa, o jogo continua pausado.
   * (No celular, congelado, vale o comportamento antigo: pausa.)
   */
  mostrarPainel(painel) {
    const jogando = this.estado === 'jogando';
    this.painel = painel;
    if (jogando && !this.entrada.toque) {
      this.painelAoVivo = true;
      this.entrada.habilitada = false;
      this.entrada.soltarTudo();
      this.soltarComandos();
      if (this.entrada.travado) document.exitPointerLock();
    } else if (jogando) {
      this.definirEstado('pausado');
    }
    this.hud.mostrarTela(painel, this.painelAoVivo);
  }

  abrirBolsa() {
    if (!['jogando', 'pausado'].includes(this.estado)) return;
    this.mostrarPainel('bolsa');
    this.bolsa.exibir();
  }

  abrirLeitura(id) {
    this.voltarParaBolsa = this.painel === 'bolsa';
    this.mostrarPainel('leitura');
    this.bolsa.ler(ANOTACOES[id]);
  }

  /** Fecha a bolsa ou a anotação. pausar = true leva ao menu de pausa (tecla Esc). */
  fecharPainel(pausar = false) {
    if (this.painel === 'leitura' && this.voltarParaBolsa && !pausar) {
      this.abrirBolsa();
      return;
    }
    this.painel = null;
    if (this.painelAoVivo && !pausar && this.estado === 'jogando') {
      // Volta direto para a partida, que não parou.
      this.painelAoVivo = false;
      this.hud.mostrarTela(null);
      this.entrada.habilitada = true;
      if (!this.entrada.podeJogar()) this.entrada.travarMouse();
      return;
    }
    this.definirEstado('pausado');
  }

  /**
   * Começa a beber um frasco. A cura não é na hora: leva CONFIG.combate.frasco.tempo,
   * o caçador anda devagar e, se apanhar antes do fim, a cura é interrompida.
   * Devolve o texto a mostrar.
   */
  usarFrasco() {
    if (contarFrascos(this.progresso) === 0) return 'Você não tem frascos de cura.';
    const j = this.jogador;
    if (j.acao === 'curando') return 'O caçador já está bebendo.';
    if (this.tDescanso || !this.podeInteragir()) return 'Espere o fim da ação para usar o frasco.';
    if (j.vida >= CONFIG.jogador.vidaMax) return 'Sua vida já está cheia.';
    j.comecarCura();
    return this.estado === 'pausado' ? 'O caçador bebe o frasco assim que o jogo voltar.' : 'Bebendo o frasco…';
  }

  /** O gole terminou sem o caçador apanhar: gasta o frasco e recupera a vida. */
  concluirCura() {
    const j = this.jogador;
    this.progresso.frascosUsados++;
    j.vida = Math.min(CONFIG.jogador.vidaMax, j.vida + CURA_FRASCO);
    j.recuperavel = Math.min(j.recuperavel, CONFIG.jogador.vidaMax - j.vida);
    this.salvamento.salvar(this.progresso);
    this.hud.mostrarFrascos(contarFrascos(this.progresso));
    this.eventos.emitir('item:cura');
    this.avisarCura('Frasco usado. Vida recuperada.');
  }

  /** O caçador apanhou no meio do gole: não cura (e o frasco só é gasto se o config mandar). */
  interromperCura() {
    if (CONFIG.combate.frasco.perdeAoSerInterrompido) {
      this.progresso.frascosUsados++;
      this.salvamento.salvar(this.progresso);
      this.hud.mostrarFrascos(contarFrascos(this.progresso));
    }
    this.avisarCura('Cura interrompida!');
  }

  avisarCura(texto) {
    if (this.painel === 'bolsa') this.bolsa.informar(texto);
    else this.hud.avisar(texto, 1.8);
  }

  /**
   * Osso de Retorno: item único, de uso ilimitado, que o caçador sempre carrega.
   * Leva à última lanterna, com vida e estamina cheias. Os inimigos comuns
   * reaparecem, como ao morrer. Devolve um texto quando não dá para usar.
   * (Futuro: a penalidade de uso entra aqui, antes do renascer.)
   */
  usarOsso() {
    if (!['jogando', 'pausado'].includes(this.estado)) return '';
    if (this.tDescanso || !this.podeInteragir()) return 'Espere o fim da ação para usar o osso.';
    const aoVivo = this.painelAoVivo;
    this.painel = null;
    this.renascer();
    this.eventos.emitir('item:retorno');
    this.hud.avisar(`Osso de Retorno · ${this.descanso.nome}`, 3);
    if (aoVivo) { this.fecharPainel(); return ''; }
    if (this.estado === 'jogando') return '';
    this.definirEstado('pausado');
    this.retomar();
    return '';
  }

  voltarAoTitulo() {
    this.tDescanso = 0;
    this.hud.fecharVeu(false);
    this.hud.limparAviso();
    this.hud.mostrarGuardiao(null);
    this.hud.mostrarTrava(null);
    this.jogador.soltarMira();
    this.boneco.grupo.visible = false;
    this.ativarArea(this.vilarejo);
    this.definirEstado('titulo');
    if (this.entrada.travado) document.exitPointerLock();
    document.getElementById('botao-comecar').focus();
  }

  apagarProgresso() {
    if (!this.salvamento.apagar()) {
      this.menu.avisar('O navegador não permitiu apagar o progresso.', this.estado);
      return;
    }
    this.progresso = normalizarProgresso();
    this.descanso = this.vilarejo.lanternas[0];
    this.aplicarProgresso();
    this.reporInimigos();
    this.voltarAoTitulo();
    this.menu.avisar('Progresso apagado.', 'titulo');
  }

  aplicarPreferencias() {
    salvarPreferencias(this.preferencias);
    this.render.aplicarPreferencias(this.preferencias);
    this.atualizarAudio();
  }

  aplicarProgresso() {
    for (const area of this.areas) {
      area.aplicarProgresso?.(this.progresso);
      atualizarObjetos(area, this.progresso.eventos);
    }
    this.hud.mostrarFrascos(contarFrascos(this.progresso));
  }

  registrarEvento(id) {
    if (this.progresso.eventos.includes(id)) return;
    this.progresso.eventos.push(id);
    this.progresso = normalizarProgresso(this.progresso);
    this.aplicarProgresso();
    this.salvamento.salvar(this.progresso);
  }

  atualizarAudio() {
    let faixa = this.mundo === this.catedral ? 'catedral' : 'vilarejo';
    if (this.mundo === this.catedral && this.jogador.pos.z <= this.guardiao.limiteZ && !this.guardiao.morto) {
      faixa = this.guardiao.emFaseFinal ? 'guardiao-final' : 'guardiao';
    }
    this.som.definirVolume(this.preferencias.efeitos / 100, this.estado === 'pausado' || this.estado === 'titulo');
    if (this.estado !== 'titulo' || this.trilha.faixa) {
      this.trilha.atualizar(faixa, this.estado === 'jogando', this.preferencias.musica);
    }
  }

  ativarArea(area) {
    this.mundo = area;
    this.inimigos = area.entidades;
    this.lanternas = area.lanternas;
    for (const mundo of this.areas) mundo.grupo.visible = mundo === area;
    this.ceu.malha.visible = area === this.vilarejo;
    this.cena.fog = area.nevoa;
    this.cena.background = area.nevoa.color;
    this.luzJogador.intensity = area === this.catedral ? 8 : 5;
  }

  reporInimigos() {
    for (const area of this.areas) {
      for (const i of area.entidades) {
        if (i.eventoDeDerrota && this.progresso.eventos.includes(i.eventoDeDerrota)) i.ocultarDerrotado();
        else i.reiniciar();
      }
    }
  }

  /** Coloca o jogador na última lanterna e repõe os inimigos comuns. */
  renascer() {
    const l = this.descanso;
    this.ativarArea(this.checkpoints.get(l.id).area);
    this.jogador.reiniciar(l.x - Math.sin(l.olhar) * 1.2, l.z - Math.cos(l.olhar) * 1.2 + 0.001, l.olhar === Math.PI ? 0 : l.olhar);
    this.jogador.atualizarCamera(0, 0);
    this.boneco.atualizar(0, this.jogador);
    this.congelado = 0;
    this.tDescanso = 0;
    this.hud.fecharVeu(false);
    this.hud.limparAviso();
    this.reporInimigos();
  }

  descansar(lanterna) {
    this.descanso = lanterna;
    this.progresso.descanso = lanterna.id;
    this.salvamento.salvar(this.progresso);
    this.tDescanso = 0.9;
    this.hud.fecharVeu(true);
    this.eventos.emitir('descanso', lanterna);
  }

  atravessar(area, { x, z, yaw }, nome) {
    const j = this.jogador;
    this.ativarArea(area);
    j.pos.set(x, 0, z);
    j.vel.set(0, 0, 0);
    j.yaw = yaw;
    j.rumo = yaw;
    j.pitch = CONFIG.camera.inclinacaoInicial;
    j.soltarMira();
    j.noChao = true;
    j.atualizarCamera(0, 0);
    this.hud.fixar('');
    this.hud.avisar(nome, 2);
  }

  interacao() {
    const pos = this.jogador.pos;
    const perto = (p, raio = 2.35) => Math.hypot(p.x - pos.x, p.z - pos.z) < raio;
    // Em terceira pessoa basta chegar perto e estar virado para o objeto
    // (vale a direção do corpo ou a da câmera).
    const objeto = alvoProximo(this.mundo.objetos, this.jogador, this.mundo.colisores);
    this.hud.mostrarAlvo(!!objeto);
    if (objeto) return this.interacaoObjeto(objeto);
    const lanterna = this.lanternas.find((l) => perto(l));
    if (lanterna) return ['E — descansar na lanterna', () => this.descansar(lanterna)];

    const portal = this.mundo.portais.find((p) => perto(p, p.raio));
    if (portal) {
      const destino = this.areasPorId.get(portal.destino);
      const chegada = destino.chegadas[this.mundo.id];
      return [portal.texto, () => this.atravessar(destino, chegada, destino.nome)];
    }

    const c = this.catedral;
    if (this.mundo !== c) return [];
    const selo = c.selos.find((s) => s.malha.visible && perto(s, 1.9) && !c.colisores.bloqueiaTrecho(pos, s, 1.3));
    if (selo) {
      return [`E — recolher ${selo.nome}`, () => {
        this.registrarEvento(`catedral:selo-${selo.id}`);
        const faltam = SELOS_DO_VEU.length - this.progresso.selos.length;
        this.hud.avisar(faltam ? `${selo.nome} recolhido. Falta um selo.` : 'A grade do santuário se abriu.', 3);
      }];
    }
    if (c.bloqueio.ativa && perto(c.portao, 3.5)) {
      return [`Selos da grade ${this.progresso.selos.length}/${SELOS_DO_VEU.length} · Ossário a oeste, Relicário a leste`];
    }
    const passagem = c.passagens.find((p) => perto(p, 2.5));
    if (passagem) return [passagem.nome];
    if (this.progresso.guardiaoDerrotado && perto(c.altar, 3.5)) return ['O santuário está livre do Véu.'];
    return [];
  }

  interacaoObjeto(objeto) {
    const { acao, evento, nome, ativo, chave } = objeto;
    if (acao === 'informar') return [objeto.mensagem];
    if (acao === 'ler') return [`E — ler: ${ANOTACOES[evento].nome}`, () => {
      this.registrarEvento(evento);
      this.abrirLeitura(evento);
    }];
    if (ativo) return [acao === 'bau' ? 'O baú está vazio.' : 'A grade de serviço está aberta.'];
    if (chave && !this.progresso.eventos.includes(chave)) {
      return ['Trancada · chave na oficina perto do poço'];
    }
    const verbo = { abrir: 'abrir', bau: 'abrir', acionar: 'acionar', recolher: 'recolher' }[acao];
    return [`E — ${verbo} ${nome}`, () => {
      this.registrarEvento(evento);
      this.eventos.emitir('objeto:interagiu', acao);
      if (FRASCOS[evento]) this.hud.avisar(`Frascos de cura +${FRASCOS[evento]}${this.entrada.toque ? '' : ' · R para usar'}`);
      else if (acao === 'acionar') this.hud.avisar('Atalho aberto para a nave.');
      else if (acao === 'recolher') this.hud.avisar(this.entrada.toque ? 'Chave da sacristia recolhida' : 'Chave da sacristia recolhida · I para abrir a bolsa');
      else this.hud.avisar('Passagem aberta.');
    }];
  }

  podeInteragir() {
    const j = this.jogador;
    return !j.morto && j.noChao && j.acao === 'livre' && !j.bloqueando && !j.carregando && j.tEsquiva <= 0;
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
    this.camera.aspect = this.render.proporcao;
    this.camera.fov = this.entrada.toque && this.camera.aspect < 1 ? 88 : CONFIG.render.campoDeVisao;
    this.camera.updateProjectionMatrix();

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
    if (this.estado === 'pausado') { this.render.desenhar(this.cena, this.camera); return; }

    if (this.tDescanso > 0) {
      this.tDescanso = Math.max(0, this.tDescanso - dt);
      if (this.tDescanso === 0) {
        this.jogador.vida = CONFIG.jogador.vidaMax;
        this.jogador.estamina = CONFIG.jogador.estaminaMax;
        this.jogador.exausto = false;
        this.reporInimigos();
        this.hud.fecharVeu(false);
        this.hud.avisar('você descansou');
      }
      return;
    }

    // Pausa de impacto: o mundo congela por um instante quando um golpe acerta.
    if (this.congelado > 0) { this.congelado -= dt; dt = 0.0001; }
    this.tempo += dt;

    this.jogador.atualizar(dt);
    for (const i of this.inimigos) i.atualizar(dt);
    if (this.estado === 'jogando' && !this.painel) {
      const [mensagem, acao] = this.interacao();
      this.hud.fixar(this.entrada.toque ? (mensagem || '').replace(/^E — /, '') : mensagem || '');
      if (this.entrada.toque) this.toque.atualizarAcoes(!!acao, contarFrascos(this.progresso) > 0);
      if (acao && this.entrada.apertou('KeyE') && this.podeInteragir()) {
        acao();
        if (this.tDescanso > 0 || this.estado !== 'jogando') return;
      } else if (this.entrada.apertou('KeyR')) {
        this.hud.avisar(this.usarFrasco(), 1.8);
      }
    }
    this.mundo.atualizar(dt, this.tempo);
    if (this.mundo === this.vilarejo) this.ceu.atualizar(dt, this.tempo, this.camera, this.jogador.pos);
    this.boneco.atualizar(dt, this.jogador);
    // A luz fraca acompanha o caçador (não a câmera), para ele nunca sumir no escuro.
    // Fica um pouco atrás dele, do lado da câmera, para clarear as costas do boneco.
    this.luzJogador.position.set(
      this.jogador.pos.x + Math.sin(this.jogador.yaw) * 1.3, this.jogador.pos.y + 2.1, this.jogador.pos.z + Math.cos(this.jogador.yaw) * 1.3,
    );
    this.atualizarTrava();

    for (const l of this.lanternas) l.atualizar(this.tempo);

    // Morte: espera, escurece, renasce na lanterna.
    if (this.estado === 'morto') {
      this.tMorte += dt;
      if (this.tMorte > 3.2 && !this.renascendo) {
        this.renascendo = true;
        this.hud.fecharVeu(true);
        setTimeout(() => {
          this.renascer();
          this.definirEstado(this.entrada.podeJogar() && (!this.entrada.toque || !document.hidden) ? 'jogando' : 'pausado');
          this.renascendo = false;
          this.hud.fecharVeu(false);
        }, 1000);
      }
    }

    const noSantuario = this.mundo === this.catedral && this.jogador.pos.z <= this.guardiao.limiteZ;
    this.atualizarAudio();
    this.hud.mostrarGuardiao(noSantuario && !this.guardiao.morto && this.estado === 'jogando' ? this.guardiao : null);
    this.hud.atualizar(dt, this.jogador, CONFIG.jogador.vidaMax, CONFIG.jogador.estaminaMax);
    this.render.desenhar(this.cena, this.camera);
  }

  /** Posiciona na tela o marcador do inimigo com a mira travada. */
  atualizarTrava() {
    const alvo = this.estado === 'jogando' ? this.jogador.alvo : null;
    if (!alvo) { this.hud.mostrarTrava(null); return; }
    this.camera.updateMatrixWorld();
    const p = this.pontoMira.set(alvo.pos.x, alvo.pos.y + 1.25 * alvo.cfg.escala, alvo.pos.z).project(this.camera);
    this.hud.mostrarTrava(p.z < 1 ? { x: (p.x + 1) * 50, y: (1 - p.y) * 50, aberto: alvo.estado === 'desequilibrado' } : null);
  }
}
