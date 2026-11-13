// =============================================================================
//  CONFIGURAÇÃO DO JOGO
//  Quase todos os "números mágicos" ficam aqui. Para ajustar o jogo (velocidade,
//  dano, cores, névoa...) mexa neste arquivo: não precisa procurar no resto.
// =============================================================================

export const CONFIG = {
  titulo: 'PUGNA',

  // ---- Filtro retrô (estilo PS1) ----
  render: {
    alturaInterna: 270,   // linhas de pixels da imagem interna (menor = mais pixelado)
    niveisDeCor: 32,      // tons por canal de cor (PS1 usava 32). Menor = mais "faixas"
    forcaDither: 1.0,     // intensidade do pontilhado (0 desliga)
    tremor: 1.0,          // tremida dos vértices (0 desliga, 2 = bem forte)
    campoDeVisao: 72,     // abertura da câmera, em graus
  },

  // ---- Cores do mundo (em hexadecimal) ----
  // A lua é o ser cósmico desta área. Outros seres podem mudar o céu no futuro:
  // basta trocar esta paleta em tempo real
  // (veja Ceu.definirPaleta).
  paleta: {
    ceuZenite: 0x14063f,     // topo do céu: violeta profundo
    ceuMeio: 0x2412a0,       // meio do céu: azul-violeta
    ceuHorizonte: 0x1c5a9a,  // horizonte: azul esverdeado, igual à névoa
    nuvem: 0x6a3cff,         // nuvens: violeta claro
    lua: 0x4a3fd8,           // corpo da lua: anil
    luaBorda: 0x2f58ff,      // aro e halo azul em volta dela
    luaOlho: 0xff4a1a,       // olhos da lua: brasa (como na ref04)
    nevoa: 0x143f78,
    luzAmbiente: 0x3a3ad0,
    luzLua: 0x7f9cff,
    fogo: 0xff8a2a,
    magia: 0x7dff2e,         // verde-ácido: olhos e magia
  },
  nevoa: { densidade: 0.0145 },

  // ---- Jogador ----
  jogador: {
    alturaOlhos: 1.7,
    raio: 0.4,
    velAndar: 3.3,
    velCorrer: 6.2,
    aceleracao: 11,        // quanto maior, mais "seco" o movimento
    forcaPulo: 5.6,
    gravidade: 17,
    sensibilidadeMouse: 0.0022,
    vidaMax: 100,
    estaminaMax: 100,
    estaminaRegen: 34,       // por segundo
    estaminaEspera: 0.7,     // segundos sem gastar antes de voltar a encher
    custoCorrer: 11,         // por segundo
    custoPulo: 8,
    giro: 13,                // rapidez com que o corpo vira para onde anda (rad/s)
  },

  // ---- Câmera em terceira pessoa ----
  camera: {
    distancia: 4.4,          // afastamento atrás do caçador
    alturaPivo: 2.3,         // ponto em volta do qual a câmera gira (acima da cabeça)
    inclinacaoInicial: -0.2, // olhar levemente de cima
    inclinacaoMin: -1.2, inclinacaoMax: 0.85,
    folga: 0.3,              // distância mínima das paredes
  },

  // ---- Travar a mira ----
  mira: {
    alcance: 17,             // distância máxima para travar
    soltar: 22,              // distância em que a trava se desfaz
    semVisao: 1.6,           // segundos sem ver o alvo até soltar
    cone: 0.2,               // cosseno mínimo entre a câmera e o alvo ao travar
    trocaMouse: 240,         // deslocamento rápido do mouse/dedo que troca de alvo
    giroCamera: 7,           // rapidez com que a câmera acompanha o alvo
    inclinacao: -0.27,
    ajudaSemTrava: 3.2,      // sem trava e parado, o golpe se volta ao inimigo até esta distância
  },

  // ---- Combate do jogador ----
  combate: {
    leve: { dano: 22, custo: 14, preparo: 0.055, ativo: 0.15, recuperacao: 0.27, empurrao: 2.5, alcance: 2.45, arco: 0.94, liberarEsquiva: 0.07 },
    forte: { dano: 58, custo: 32, preparo: 0.11, ativo: 0.19, recuperacao: 0.52, empurrao: 6.5, alcance: 2.65, arco: 0.36, liberarEsquiva: 0.23 },
    tempoSegurarForte: 0.32, // segurar o clique por mais que isso vira ataque forte
    tempoMaximoCarga: 1.4,
    filaAtaque: 0.22,
    filaEsquiva: 0.17,
    bloqueio: { reducao: 0.85, custoPorDano: 0.9, velocidade: 0.5 },
    esquiva: { custo: 22, duracao: 0.36, invencivel: 0.26, velocidade: 9.5, espera: 0.25 },
    // Aparar (parry): um gesto curto e arriscado. Se o golpe inimigo chegar dentro
    // da janela, o inimigo fica desequilibrado e o próximo golpe é crítico.
    aparar: { custo: 12, preparo: 0.05, janela: 0.2, recuperacao: 0.4, desequilibrio: 1.9 },
    critico: { multiplicador: 2.6, pausa: 0.14 },
    pausaImpacto: 0.07,      // "hit stop": o jogo congela um instante ao acertar (dá peso)
  },

  // ---- Inimigos ----
  // Para criar um inimigo novo, copie um bloco e mude os números.
  inimigos: {
    cavaleiro: {
      nome: 'Cavaleiro corrompido',
      vida: 130, velPatrulha: 1.0, velPerseguir: 2.1,
      dano: 34, alcance: 2.7, preparo: 0.95, ativo: 0.18, recuperacao: 1.2,
      visao: 15, firmeza: 40,  // dano mínimo de um golpe para ele cambalear
      escala: 1.22, raio: 0.6, golpes: 1, recua: false,
    },
    cacador: {
      nome: 'Caçador corrompido',
      vida: 62, velPatrulha: 1.5, velPerseguir: 4.6,
      dano: 13, alcance: 2.1, preparo: 0.34, ativo: 0.12, recuperacao: 0.55,
      visao: 19, firmeza: 0,
      escala: 1.0, raio: 0.45, golpes: 2, recua: true,
    },
    penitente: {
      nome: 'Penitente do Véu',
      vida: 84, velPatrulha: 1.2, velPerseguir: 2.8,
      dano: 19, alcance: 2.2, preparo: 0.53, ativo: 0.14, recuperacao: 0.8,
      visao: 12, firmeza: 26,
      escala: 1.05, raio: 0.44, golpes: 2, recua: false,
    },
    guardiao: {
      nome: 'Guardião do Véu',
      vida: 330, velPatrulha: 0.8, velPerseguir: 2.2,
      dano: 32, alcance: 2.9, preparo: 1.05, ativo: 0.2, recuperacao: 1.35,
      visao: 20, firmeza: 60,
      escala: 1.65, raio: 0.78, golpes: 1, recua: false,
      desequilibrio: 1.15,   // chefes se recompõem mais rápido de um aparo
      faseFinal: { velPerseguir: 2.9, dano: 25, preparo: 0.73, recuperacao: 1.1, golpes: 2 },
    },
  },
};
