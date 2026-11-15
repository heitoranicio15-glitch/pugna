import * as THREE from 'three';
import { uniformesRetro } from '../render/retro.js';

/** Monta a iluminação de base e os valores visuais de uma área. */
export function montarAtmosfera(area, config, direcaoLua) {
  const { nevoa, fundo, luzAmbiente, luar, paletaDoCeu } = config;
  area.nevoa = new THREE.FogExp2(nevoa.cor, nevoa.densidade);
  area.nevoaEmDegraus = config.nevoaEmDegraus === true;
  area.fundo = new THREE.Color(fundo);
  area.paletaDoCeu = paletaDoCeu;
  area.luzJogador = config.luzJogador;
  area.corLuzJogador = config.corLuzJogador;
  area.som = config.som;        // ambiente sintetizado (src/audio/Ambiente.js)
  area.trilha = config.trilha;  // faixa da trilha (src/audio/regras.js: FAIXAS)
  // Névoa baixa (src/render/retro.js); sem ela, a área não tem véu rente ao chão.
  area.nevoaBaixa = config.nevoaBaixa
    ? { cor: new THREE.Color(config.nevoaBaixa.cor), forca: config.nevoaBaixa.forca, altura: config.nevoaBaixa.altura }
    : { cor: new THREE.Color(config.nevoa?.cor ?? 0), forca: 0, altura: 1 };
  area.grupo.add(new THREE.HemisphereLight(luzAmbiente.ceu, luzAmbiente.chao, luzAmbiente.intensidade));
  if (luar) {
    const luz = new THREE.DirectionalLight(luar.cor, luar.intensidade);
    luz.position.copy(direcaoLua).multiplyScalar(100);
    area.grupo.add(luz);
  }
}

/** Faz o céu e a névoa seguirem o destino, sem alterar os dados de cada área. */
export class Atmosfera {
  constructor(cena, ceu, luzJogador) {
    this.cena = cena;
    this.ceu = ceu;
    this.luzJogador = luzJogador;
    this.nevoa = new THREE.FogExp2();
    this.fundo = new THREE.Color();
    this.inicioNevoa = new THREE.Color();
    this.inicioFundo = new THREE.Color();
    this.inicioBruma = new THREE.Color();
    this.tempo = 0;
  }

  /** Névoa baixa e tom das sombras da área (uniformes compartilhados por todos os materiais). */
  aplicarNevoaBaixa(area, t = 1) {
    const u = uniformesRetro, b = area.nevoaBaixa;
    if (!b) return;
    u.uBrumaCor.value.lerpColors(this.inicioBruma, b.cor, t);
    u.uBrumaForca.value = THREE.MathUtils.lerp(this.inicioForca ?? b.forca, b.forca, t);
    u.uBrumaAltura.value = THREE.MathUtils.lerp(this.inicioAltura ?? b.altura, b.altura, t);
  }

  mudarArea(area, transicao = false) {
    const anterior = this.area;
    const animar = transicao && anterior !== area && this.cena.fog && area.nevoa;
    this.area = area;
    this.ceu.malha.visible = area.usaCeu;
    this.ceu.definirPaleta(area.paletaDoCeu, animar && anterior.usaCeu && area.usaCeu);
    this.luzJogador.intensity = area.luzJogador;
    this.luzJogador.color.set(area.corLuzJogador ?? 0x7a86ff);
    this.tempo = animar ? 0.6 : 0;
    const u = uniformesRetro;
    u.uNevoaEmDegraus.value = area.nevoaEmDegraus ? 1 : 0;
    this.inicioBruma.copy(u.uBrumaCor.value);
    this.inicioForca = animar ? u.uBrumaForca.value : null;
    this.inicioAltura = animar ? u.uBrumaAltura.value : null;
    if (!animar) { this.inicioBruma.copy(area.nevoaBaixa?.cor ?? u.uBrumaCor.value); this.aplicarNevoaBaixa(area); }
    if (animar) {
      this.inicioNevoa.copy(this.nevoa.color);
      this.inicioDensidade = this.nevoa.density;
      this.inicioFundo.copy(this.fundo);
    } else {
      if (area.nevoa) {
        this.nevoa.color.copy(area.nevoa.color);
        this.nevoa.density = area.nevoa.density;
      }
      this.fundo.set(area.fundo ?? area.nevoa?.color ?? 0);
    }
    this.cena.fog = area.nevoa ? this.nevoa : null;
    this.cena.background = this.fundo;
  }

  atualizar(dt) {
    uniformesRetro.uTempo.value += dt;   // a névoa baixa ondula com o tempo
    if (this.tempo <= 0) return;
    this.tempo = Math.max(0, this.tempo - dt);
    const t = THREE.MathUtils.smoothstep(1 - this.tempo / 0.6, 0, 1);
    const { nevoa, fundo } = this.area;
    this.nevoa.color.lerpColors(this.inicioNevoa, nevoa.color, t);
    this.nevoa.density = THREE.MathUtils.lerp(this.inicioDensidade, nevoa.density, t);
    this.fundo.lerpColors(this.inicioFundo, fundo ?? nevoa.color, t);
    this.ceu.atualizarPaleta(t);
    this.aplicarNevoaBaixa(this.area, t);
  }
}
