// =============================================================================
//  RENDERIZADOR RETRÔ
//  1) Desenha o jogo numa imagem pequena (ex.: 480x270).
//  2) Amplia essa imagem para a tela inteira SEM suavizar (pixels grandes).
//  3) No caminho, reduz a quantidade de cores com pontilhado (dithering),
//     como nos consoles dos anos 90.
//  O estilo HD desenha a cena sem pontilhado na resolução selecionada,
//  limitada à área visível e à capacidade do navegador.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { uniformesRetro } from './retro.js';
import { definirFiltroTexturas } from './texturas.js';

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tCena;
  uniform vec2 uRes;       // resolução interna
  uniform float uNiveis;   // tons por canal (0 = sem redução)
  uniform float uDither;
  uniform float uSaturacao; // 1 = cores como estão
  uniform float uContraste; // 1 = contraste como está
  uniform float uEscurecer; // 0 = normal, 1 = preto (usado em transições)
  uniform float uBrilho;
  varying vec2 vUv;

  // Matriz de Bayer 4x4: o padrão clássico de pontilhado.
  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    float m[16];
    m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
    m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
    m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
    m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
    float v = 0.0;
    for (int k = 0; k < 16; k++) if (k == i) v = m[k];
    return v / 16.0 - 0.5;
  }

  void main() {
    vec2 px = floor(vUv * uRes);
    vec3 cor = texture2D(tCena, (px + 0.5) / uRes).rgb;

    // Vinheta suave: escurece os cantos e puxa o olhar para o centro.
    vec2 c = vUv - 0.5;
    cor *= 1.0 - dot(c, c) * 0.85;

    // A curva cúbica só cresce de 0 a 1. Acima de 1, os canais podem
    // escurecer e trocar a cor dos reflexos perto do fogo.
    cor = max(cor * uBrilho, 0.0);
    if (uNiveis > 0.0) {
      cor = min(cor, 1.0);
    } else {
      // Comprime os realces em HD sem alterar a proporção entre canais.
      float pico = max(cor.r, max(cor.g, cor.b));
      float excesso = max(pico - 0.65, 0.0);
      float suavizado = 0.65 + excesso / (1.0 + excesso / 0.35);
      cor *= min(1.0, suavizado / max(pico, 0.0001));
    }
    cor = pow(cor, vec3(1.0 / 2.2));
    cor = mix(cor, cor * cor * (3.0 - 2.0 * cor), 0.35);

    // Estilo HD: mais cor e contraste (no PS1 os dois valem 1 e nada muda).
    if (uSaturacao != 1.0 || uContraste != 1.0) {
      float luz = dot(cor, vec3(0.299, 0.587, 0.114));
      cor = mix(vec3(luz), cor, uSaturacao);
      cor = clamp((cor - 0.5) * uContraste + 0.5, 0.0, 1.0);
    }

    // Reduz as cores com pontilhado (só quando há redução de cores).
    if (uNiveis > 0.0) {
      cor += bayer(px) * uDither / uNiveis;
      cor = floor(cor * uNiveis + 0.5) / uNiveis;
    }

    gl_FragColor = vec4(cor * (1.0 - uEscurecer), 1.0);
  }
`;

export class RenderizadorRetro {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = true;
    container.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;
    const gl = this.renderer.getContext();
    const [limiteX, limiteY] = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const limiteAlvo = Math.min(this.renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    this.limiteHd = new THREE.Vector2(Math.min(limiteX, limiteAlvo), Math.min(limiteY, limiteAlvo));

    // Imagem interna pequena, sem suavização.
    this.alvo = new THREE.WebGLRenderTarget(480, 270, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.HalfFloatType,
      depthBuffer: true,
    });

    // Um retângulo que cobre a tela e mostra a imagem interna com o filtro.
    this.uniformes = {
      tCena: { value: this.alvo.texture },
      uRes: { value: new THREE.Vector2(480, 270) },
      uNiveis: { value: CONFIG.render.estilos.ps1.niveisDeCor },
      uDither: { value: CONFIG.render.estilos.ps1.dithering },
      uSaturacao: { value: CONFIG.render.estilos.ps1.saturacao },
      uContraste: { value: CONFIG.render.estilos.ps1.contraste },
      uEscurecer: { value: 0 },
      uBrilho: { value: 1 },
    };
    this.cenaFinal = new THREE.Scene();
    this.cameraFinal = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.cenaFinal.add(new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: this.uniformes,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: FRAG,
        depthTest: false, depthWrite: false,
      }),
    ));

    this.proporcao = 16 / 9;
    this.alturaInterna = CONFIG.render.alturaInterna;
    this.resolucaoPs1 = CONFIG.render.alturaInterna; // escolhida em "Pixelização"
    this.resolucaoHd = CONFIG.render.estilos.hd.resolucoes[0];
    this.tremorPs1 = true;                           // escolhido em "Tremor dos vértices"
    this.estilo = null;
    addEventListener('resize', () => this.ajustarTamanho());
    this.ajustarTamanho();
  }

  ajustarTamanho() {
    const l = Math.max(1, innerWidth), a = Math.max(1, innerHeight);
    this.proporcao = l / a;
    const hd = this.estilo === 'hd';
    const escala = Math.min(
      window.devicePixelRatio || 1,
      this.alturaInterna / a, this.alturaInterna * (16 / 9) / l,
      this.limiteHd.x / l, this.limiteHd.y / a,
    );
    const altura = hd ? Math.max(1, Math.floor(a * escala)) : this.alturaInterna;
    const largura = hd ? Math.max(1, Math.floor(l * escala)) : Math.max(2, Math.round(altura * this.proporcao / 2) * 2);
    this.renderer.setSize(hd ? largura : l, hd ? altura : a, false);
    this.alvo.setSize(largura, altura);
    this.uniformes.uRes.value.set(largura, altura);
    uniformesRetro.uRetroRes.value.set(largura, altura);
  }

  aplicarPreferencias({ resolucao, resolucaoHd, brilho, tremor, estiloGrafico }) {
    this.uniformes.uBrilho.value = brilho / 100;
    this.resolucaoPs1 = resolucao;
    this.resolucaoHd = resolucaoHd;
    this.tremorPs1 = tremor;
    this.definirEstilo(estiloGrafico);
  }

  /** Troca o estilo de imagem na hora: 'ps1' (padrão) ou 'hd'. Não troca de renderizador. */
  definirEstilo(nome) {
    const estilos = CONFIG.render.estilos;
    const anterior = this.estilo;
    this.estilo = Object.hasOwn(estilos, nome ?? '') ? nome : CONFIG.render.estiloPadrao;
    const e = estilos[this.estilo];
    this.uniformes.uNiveis.value = e.niveisDeCor;
    this.uniformes.uDither.value = e.dithering;
    this.uniformes.uSaturacao.value = e.saturacao;
    this.uniformes.uContraste.value = e.contraste;
    // No PS1 valem a pixelização e o tremor escolhidos; no HD eles ficam guardados.
    uniformesRetro.uTremor.value = this.estilo === 'ps1' && !this.tremorPs1 ? 0 : e.tremor;
    definirFiltroTexturas(e.filtroTextura);
    const altura = this.estilo === 'hd' ? this.resolucaoHd : this.resolucaoPs1;
    this.canvas.style.imageRendering = this.estilo === 'hd' ? 'auto' : 'pixelated';
    if (altura === this.alturaInterna && anterior === this.estilo) return;
    this.alturaInterna = altura;
    this.ajustarTamanho();
  }

  /** Desenha a cena do mundo e, se houver, uma segunda cena por cima (sobreposição). */
  desenhar(cena, camera, cenaArma, cameraArma) {
    const r = this.renderer;
    r.setRenderTarget(this.alvo);
    r.autoClear = true;
    r.render(cena, camera);
    if (cenaArma) {
      r.autoClear = false;
      r.clearDepth();           // a arma nunca atravessa paredes
      r.render(cenaArma, cameraArma);
      r.autoClear = true;
    }
    r.setRenderTarget(null);
    r.render(this.cenaFinal, this.cameraFinal);
  }
}
