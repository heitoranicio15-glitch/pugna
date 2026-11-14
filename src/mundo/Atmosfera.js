import * as THREE from 'three';

/** Monta a iluminação de base e os valores visuais de uma área. */
export function montarAtmosfera(area, config, direcaoLua) {
  const { nevoa, fundo, luzAmbiente, luar, paletaDoCeu } = config;
  area.nevoa = new THREE.FogExp2(nevoa.cor, nevoa.densidade);
  area.fundo = new THREE.Color(fundo);
  area.paletaDoCeu = paletaDoCeu;
  area.luzJogador = config.luzJogador;
  area.corLuzJogador = config.corLuzJogador;
  area.som = config.som;        // ambiente sintetizado (src/audio/Ambiente.js)
  area.trilha = config.trilha;  // faixa da trilha (src/audio/regras.js: FAIXAS)
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
    this.tempo = 0;
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
    if (this.tempo <= 0) return;
    this.tempo = Math.max(0, this.tempo - dt);
    const t = THREE.MathUtils.smoothstep(1 - this.tempo / 0.6, 0, 1);
    const { nevoa, fundo } = this.area;
    this.nevoa.color.lerpColors(this.inicioNevoa, nevoa.color, t);
    this.nevoa.density = THREE.MathUtils.lerp(this.inicioDensidade, nevoa.density, t);
    this.fundo.lerpColors(this.inicioFundo, fundo ?? nevoa.color, t);
    this.ceu.atualizarPaleta(t);
  }
}
