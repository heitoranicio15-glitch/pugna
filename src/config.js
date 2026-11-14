// =============================================================================
//  CONFIGURAÇÃO DO JOGO
//  Quase todos os "números mágicos" ficam aqui. Para ajustar o jogo (velocidade,
//  dano, cores, névoa...) mexa neste arquivo: não precisa procurar no resto.
// =============================================================================

export const CONFIG = {
  titulo: 'PUGNA',

  // ---- Filtro retrô (estilo PS1) ----
  render: {
    alturaInterna: 270,   // linhas de pixels da imagem interna no PS1 (menor = mais pixelado)
    campoDeVisao: 72,     // abertura da câmera, em graus
    // Estilos de imagem escolhidos em Configurações (preferência estiloGrafico).
    estiloPadrao: 'ps1',
    estilos: {
      // PS1 (padrão): as linhas vêm da opção "Pixelização".
      ps1: {
        niveisDeCor: 32,      // tons por canal de cor (PS1 usava 32). Menor = mais "faixas"
        dithering: 1.0,       // intensidade do pontilhado (0 desliga)
        tremor: 1.0,          // tremida dos vértices (0 desliga, 2 = bem forte)
        saturacao: 1,         // 1 = cores como estão
        contraste: 1,         // 1 = contraste como está
        filtroTextura: 'nearest', // texturas pixeladas
      },
      // HD "fantasia sombria": acabamento PBR, sem pontilhado.
      hd: {
        resolucoes: [720, 1080, 1440, 2160],
        niveisDeCor: 0,       // 0 = sem redução de cores
        dithering: 0,
        tremor: 0,            // sem tremida (ignora "Tremor dos vértices")
        saturacao: 1.15,
        contraste: 1.08,
        filtroTextura: 'linear', // texturas suavizadas
      },
    },
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
    fogo: 0xff8a2a,
    magia: 0x7dff2e,         // verde-ácido: olhos e magia
  },
  // ---- Áreas ----
  // luzJogador: força da luz fraca que acompanha o caçador em cada área.
  areas: {
    vilarejo: {
      luzJogador: 5, corLuzJogador: 0x8a8eff,
      nevoa: { cor: 0x242346, densidade: 0.0155 },
      fundo: 0x16162b,
      luzAmbiente: { ceu: 0x777bc7, chao: 0x2b1d39, intensidade: 1.15 },
      luar: { cor: 0xa1adf7, intensidade: 0.8 },
      paletaDoCeu: { zenite: 0x0c0921, meio: 0x232047, horizonte: 0x242346, nuvem: 0x665587 },
      bruma: { cor: 0x706893, opacidade: 0.16, altura: 0.4, variacao: 1.2, velocidade: 1 },
    },
    catedral: {
      luzJogador: 8, corLuzJogador: 0xa39dff,
      nevoa: { cor: 0x211d36, densidade: 0.032 },
      fundo: 0x0d0b19,
      luzAmbiente: { ceu: 0xb8a7d6, chao: 0x3d294a, intensidade: 1.06 },
      feixes: [
        { origem: [21.37, 4.85, -5], destino: [12.4, 0.08, -3.1], largura: 1.25, cor: 0xa2bfff, opacidade: 0.125 },
        { origem: [0, 4.55, -32.29], destino: [0, 0.08, -24.7], largura: 2.5, cor: 0xb391ee, opacidade: 0.08 },
      ],
    },
    // Estrada ao sul do vilarejo (120 x 30 m, corre de norte a sul; o vilarejo fica no norte).
    estrada: {
      luzJogador: 5, corLuzJogador: 0x9dadff,
      nevoa: { cor: 0x253a47, densidade: 0.019 },
      fundo: 0x122027,
      luzAmbiente: { ceu: 0x607d9c, chao: 0x1a2a29, intensidade: 1.3 },
      luar: { cor: 0x9cbdd8, intensidade: 0.79 },
      paletaDoCeu: { zenite: 0x0b172b, meio: 0x21384d, horizonte: 0x253a47, nuvem: 0x547085 },
      bruma: { cor: 0x6d9da4, opacidade: 0.24, altura: 0.28, variacao: 0.9, velocidade: 1.5 },
      limites: { minX: -18, maxX: 12, minZ: -60, maxZ: 60 },
      larguraDaPista: 8,       // terra batida, centrada em x = 0
      portaoNorte: { z: -60 }, // o Portão Sul do vilarejo visto de fora (portal para o vilarejo)
      ponte: { z: 22, comprimento: 8, riacho: 6 },
      carroca: { z: 57 },      // carroça tombada: fecha a ponta sul (áreas novas virão depois)
      taverna: { x: -12.5, z: -15, largura: 14, profundidade: 10, altura: 6 },   // fachada voltada para a pista
      fumaca: { particulas: 5, subida: 3.2, tempo: 4.5 },
      lanterna: { x: -5.4, z: -10.6 },  // 'taverna-da-estrada', perto da porta
    },
    // Interior da taverna (12 x 9 m). Sem inimigos.
    taverna: {
      luzJogador: 3, corLuzJogador: 0xc49f8a,
      limites: { minX: -6, maxX: 6, minZ: -4.5, maxZ: 4.5 },
      nevoa: { cor: 0x412819, densidade: 0.032 },
      fundo: 0x1a100c,
      luzAmbiente: { ceu: 0xf2bc9a, chao: 0x533428, intensidade: 0.93 },
      altura: 3.5,
      lareira: { intensidade: 38, alcance: 14 },    // luz laranja que tremula
      lampiao: { intensidade: 12, alcance: 12 },    // vela no teto, bem fraca
      // O taverneiro (decidido pela IA): fala em rodízio, tom seco, sem explicar mecânica.
      taverneiro: {
        alcance: 3.2,
        falas: [
          '— Senta. Ou não. A lareira não pergunta.',
          '— A carroça lá no sul tombou faz tempo. Ninguém foi ver.',
          '— Alguém deixou um bilhete na mesa. Não é meu.',
          '— Não pergunto de onde vem o sangue. Só onde pinga.',
        ],
        segundosDaFala: 4,
      },
    },
  },

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
    esquiva: { custo: 22, duracao: 0.36, invencivel: 0.22, velocidade: 9.5, espera: 0.25 },
    // Quickstep: com a mira travada a esquiva vira um passo curto na direção
    // apertada (parado: para trás), sem rolar. Mais barato e com recuperação
    // curta, mas com menos invencibilidade que o rolamento.
    quickstep: { custo: 14, duracao: 0.2, invencivel: 0.13, velocidade: 11, espera: 0.12 },
    // Pistola (mão secundária): o único parry do jogo. Um tiro no fim do aviso do
    // inimigo ou no comecinho do golpe dele o desequilibra (o próximo golpe é
    // crítico). Fora dessa janela o tiro só arranha. Toda bala gasta conta,
    // acertando ou errando: é isso que impede o spam.
    // A janela total de cada golpe é (janelaNoAviso + janelaNoGolpe) × janelaAparar
    // do tipo: alto 0,13 s, pesado 0,08 s. A rasteira não pode ser aparada.
    pistola: {
      balasMax: 8,            // recarrega ao descansar na lanterna, renascer ou usar o Osso
      dano: 6,                // tiro fora da janela: arranhão, não faz cambalear
      alcance: 9,             // metros; "curto alcance", sem bala voando
      abertura: 0.8,          // cosseno do cone à frente (sem mira travada)
      recuperacao: 0.3,       // tempo sem poder atacar depois do tiro
      liberarEsquiva: 0.1,    // a esquiva pode cortar a recuperação a partir daqui
      fila: 0.15,             // aperto guardado se o caçador estiver ocupado
      janelaNoAviso: 0.09,    // últimos segundos do preparo do inimigo
      janelaNoGolpe: 0.04,    // primeiros segundos do golpe ativo (se ainda não resolveu)
      desequilibrio: 1.9,     // segundos que o inimigo fica aberto (cada inimigo pode ter o seu)
      invencivel: 0.25,       // proteção depois do parry: o golpe aparado não entra
      pausa: 0.12, tremor: 0.045,
    },
    critico: { multiplicador: 2.6, pausa: 0.14 },
    // Visceral: atacar (leve ou forte) um inimigo desequilibrado de frente vira
    // um golpe especial. Não gasta estamina, o caçador fica invencível durante a
    // animação e o acerto devolve todo o rally (a parte laranja da vida).
    // Golpe comum de lado ou de longe continua sendo o crítico acima.
    //   multiplicador  vezes o dano do ataque leve
    //   alcance        metros até o inimigo para o ataque virar visceral
    //   duracao        segundos da animação inteira (e da invencibilidade)
    //   momento        segundos até a lâmina entrar
    //   pausa / tremor congelamento e tremida de tela no acerto
    //   abertura       cosseno do cone: o inimigo tem de estar à frente do caçador
    //                  e o caçador à frente do inimigo (0.5 = até 60° de lado)
    //   encosta        distância (metros) em que o caçador cola no inimigo
    //   empurrao       força com que o inimigo é jogado para trás
    visceral: { multiplicador: 3.5, alcance: 2.3, duracao: 0.7, momento: 0.25, pausa: 0.18, tremor: 0.12, abertura: 0.5, encosta: 1.15, empurrao: 7 },
    // Execução: o visceral num inimigo que teve o golpe PESADO aparado.
    execucao: { multiplicador: 5, pausa: 0.28, tremor: 0.18 },
    // Ataque forte carregado: o dano cresce com a carga (0 ao soltar em
    // tempoSegurarForte, 1 em tempoMaximoCarga) até multiplicadorMax.
    // Carga completa (a partir de "completa") acertando pelas costas desequilibra
    // o inimigo e abre o visceral (sem execução). "costas" é o cosseno entre a
    // frente do inimigo e a direção dele até o caçador (menor = mais atrás).
    carga: { multiplicadorMax: 1.6, abrePelasCostas: true, completa: 0.95, costas: -0.3 },

    // ---- Contra o spam (Etapa A do plano) ----
    // Apanhar interrompe o caçador: ele perde o golpe e cambaleia um instante.
    //   cambaleio     segundos sem agir depois de ser interrompido
    //   armaduraForte a parte final do ataque forte aguenta um golpe fraco:
    //                 "aPartirDe" é a fração do preparo já cumprida (0.5 = da
    //                 metade em diante, até o fim da passagem da lâmina) e
    //                 "danoMax" é o maior dano que ele aguenta sem perder o golpe
    interrupcao: { cambaleio: 0.4, armaduraForte: { aPartirDe: 0.5, danoMax: 20 } },
    // Firmeza dos inimigos: depois de cambalear, o inimigo ganha um "fôlego" em
    // que não cambaleia de novo (só um golpe crítico passa por cima). É isso que
    // impede travar um inimigo até a morte só apertando o ataque.
    //   duracao   segundos que o inimigo fica cambaleando
    //   folego    segundos, depois de cambalear, em que ele aguenta os golpes
    //   (cada inimigo pode ter os seus "atordoamento" e "folego" em CONFIG.inimigos)
    //   empurraoFirme  fração do empurrão quando o golpe NÃO faz cambalear
    //                  (0 = não sai do lugar; 1 = recua como antes)
    atordoamentoInimigo: { duracao: 0.6, folego: 1.6, empurraoFirme: 0.12 },
    // Rally: parte do dano que o caçador leva fica "recuperável" por alguns
    // segundos (aparece em laranja na barra de vida). Cada golpe acertado
    // devolve vida dessa parte. Apanhou? Revide logo.
    //   parte     fração do dano que fica recuperável
    //   duracao   segundos para revidar; apanhar de novo reinicia a contagem
    //   porDano   vida devolvida por ponto de dano causado (0.35: o leve devolve quase 8 e o forte, 20)
    //   escoa     pontos por segundo que somem quando o tempo acaba
    rally: { parte: 0.7, duracao: 4, porDano: 0.35, escoa: 70 },
    // Frasco de cura: beber leva tempo, o caçador anda devagar e, se apanhar
    // antes do fim, a cura é interrompida.
    //   tempo                 segundos bebendo até a cura acontecer
    //   velocidade            fração da velocidade de andar enquanto bebe
    //   perdeAoSerInterrompido  true = o frasco é gasto mesmo sem curar
    frasco: { tempo: 0.6, velocidade: 0.35, perdeAoSerInterrompido: false },

    // ---- Tipos de ataque dos inimigos (a "regra de ouro" do combate) ----
    // Cada tipo pede uma resposta diferente do jogador. Os números abaixo
    // MULTIPLICAM os do inimigo (dano, preparo, ativo, recuperacao, alcance).
    //   abertura      quão de lado o golpe ainda pega (1 = só bem na frente,
    //                 0 = até os lados, negativo = pega um pouco atrás)
    //   preparoMin    tempo mínimo de aviso, em segundos
    //   janelaAparar  multiplica a janela do parry com a pistola (menor = mais difícil)
    //   bloqueavel / custoBloqueio  sem uso hoje: guardados para o broquel voltar
    //   evitaPulando  estar no ar (acima de alturaPulo) evita o golpe
    //   abreExecucao  aparar este golpe abre a execução (PR B2)
    //   aguentaLeve   durante o aviso e o golpe, o ataque leve do caçador não
    //                 interrompe: o inimigo aguenta e revida
    //   aviso         cor que acende na arma e nos olhos durante o preparo
    ataquesInimigos: {
      alto: {
        dano: 1, preparo: 1, preparoMin: 0, ativo: 1, recuperacao: 1, alcance: 1, abertura: 0.35,
        aparavel: true, janelaAparar: 1, bloqueavel: true, custoBloqueio: 1,
        evitaPulando: false, alturaPulo: 0, abreExecucao: false, aguentaLeve: false, aviso: null,
      },
      pesado: {
        dano: 1.5, preparo: 1.45, preparoMin: 0.7, ativo: 1.1, recuperacao: 1.3, alcance: 1.05, abertura: 0.45,
        aparavel: true, janelaAparar: 0.6, bloqueavel: true, custoBloqueio: 1.8,
        evitaPulando: false, alturaPulo: 0, abreExecucao: true, aguentaLeve: true, aviso: 0xff2a1e,
      },
      rasteira: {
        dano: 0.75, preparo: 1.25, preparoMin: 0.55, ativo: 1.2, recuperacao: 1.15, alcance: 1.2, abertura: -0.3,
        aparavel: false, janelaAparar: 0, bloqueavel: false, custoBloqueio: 1,
        evitaPulando: true, alturaPulo: 0.25, abreExecucao: false, aguentaLeve: false, aviso: 0xffb21e,
      },
    },
    // Avisos com nome: uma sequência pode trocar a cor de um golpe escrevendo
    // aviso: 'nome' (veja a fase final do Guardião). O inaparável é
    // branco-violeta (o vermelho é do pesado e o amarelo, da rasteira) e tem
    // som próprio, um sino grave duplo.
    avisosInimigos: { inaparavel: 0xd9c8ff },
    // Como um golpe se liga ao seguinte numa sequência: quanto espera na
    // recuperação e que fração do preparo do próximo golpe já começa cumprida.
    emendaInimigos: { espera: 0.16, adiantar: 0.35 },
    // ---- Imprevisibilidade (Etapa C, PR C1): ninguém bate como um metrônomo ----
    //   variacaoPreparo  o aviso de cada golpe dura de -12% a +12% do normal,
    //                    sorteado a cada golpe (nunca abaixo do preparoMin)
    // Golpe atrasado: numa sequência de CONFIG.inimigos, um golpe escrito como
    // { tipo: 'pesado', atraso: 0.35 } segura a pose final do aviso por 0,35 s
    // antes de bater. A janela do parry acompanha (fica no fim do aviso).
    imprevisibilidade: {
      variacaoPreparo: 0.12,
    },
    // ---- Pressão em grupo (Etapa C, PR C3) ----
    // Fichas de ataque: só "atacantesSimultaneos" inimigos comuns podem partir
    // para cima do caçador ao mesmo tempo. Quem chega a "distanciaDeEspera"
    // pede uma ficha; sem ficha, fica rondando nessa distância (anda de lado,
    // encarando) e espera a vez. A ficha volta quando a sequência termina, ou
    // quando ele cambaleia, é aparado ou morre. Chefes (chefe: true) não usam ficha.
    //   folga  quem ronda só volta a correr atrás do caçador quando ele se
    //          afasta mais que distanciaDeEspera + folga (metros)
    grupo: { atacantesSimultaneos: 2, distanciaDeEspera: 4.5, folga: 1 },
    // Punir o frasco: quando o caçador começa a beber, cada inimigo em combate,
    // livre e a até "distancia" metros, com chance "chance", espera "reacao"
    // segundos, avança e começa a sequência mais rápida que tem (respeitando
    // as fichas). Um inimigo pode trocar a chance com punirFrasco: { chance }.
    punirFrasco: { distancia: 7, chance: 0.8, reacao: 0.15 },
    // ---- Etapa D: furtividade, golpe pelas costas e pulo contra a rasteira ----
    // Furtividade: Z alterna agachado. O inimigo que patrulha percebe o caçador
    // se ele estiver no cone de visão e no alcance, ou perto demais (barulho).
    // Em pé vale a regra de antes: cone largo (coneEmPe) e a visao inteira.
    //   velocidade     fração da velocidade de andar, agachado
    //   alturaOlhos    fração da altura dos olhos, agachado (primeira pessoa)
    //   raioAgachado / raioAndando / raioCorrendo  metros em que ele "ouve"
    //                  (raioAndando vale também parado em pé: os 5 m de antes)
    //   anguloVisao    graus do cone de visão de quem vê o caçador agachado
    //   visaoNoEscuro  fração da visao do inimigo para ver o caçador agachado
    //   coneEmPe       cosseno do cone para quem está em pé (-0.15, o de antes)
    //   raioAlerta / atrasoAlerta  quem passa a perseguir chama os vizinhos
    //                  da área até este raio, depois deste atraso (segundos)
    furtividade: {
      velocidade: 0.45, alturaOlhos: 0.62,
      raioAgachado: 1, raioAndando: 5, raioCorrendo: 7,
      anguloVisao: 100, visaoNoEscuro: 0.5, coneEmPe: -0.15,
      raioAlerta: 10, atrasoAlerta: 0.4,
    },
    // Golpe pelas costas: atacar um inimigo comum que ainda não percebeu o
    // caçador, por trás dele (cone de "cone" graus) e a até "alcance" metros,
    // mata em silêncio (sem pausa, sem tremor, sem alertar ninguém).
    costas: { alcance: 1.6, cone: 60 },
    // Pisada: quem pulou a rasteira e cai a até "alcance" metros do atacante
    // em até "janela" segundos pisa nele. Dano = multiplicador × o leve, o
    // inimigo fica desequilibrado "desequilibrio" segundos (abre o visceral) e
    // o caçador quica para cima com velocidade "quique".
    pisada: { alcance: 1.8, janela: 0.8, multiplicador: 1.5, desequilibrio: 1.2, quique: 3.5 },
    // Pular contra golpe alto: no ar acima de alturaMin durante o golpe ativo
    // de um golpe do tipo alto, o dano é multiplicado (é só um custo).
    danoExtraNoAr: { multiplicador: 1.5, alturaMin: 0.25 },
    pausaImpacto: 0.07,      // "hit stop": o jogo congela um instante ao acertar (dá peso)
  },

  // ---- Inimigos ----
  // Para criar um inimigo novo, copie um bloco e mude os números.
  // "ataques" lista as sequências de golpes que ele sabe fazer. Cada golpe é um
  // tipo de CONFIG.combate.ataquesInimigos; "peso" é a chance de a sequência sair.
  inimigos: {
    cavaleiro: {
      nome: 'Cavaleiro corrompido',
      vida: 130, velPatrulha: 1.0, velPerseguir: 2.1,
      dano: 34, alcance: 2.7, preparo: 0.95, ativo: 0.18, recuperacao: 1.2,
      visao: 15, firmeza: 40,  // dano mínimo de um golpe LEVE para ele cambalear (o forte sempre faz cambalear os inimigos comuns)
      escala: 1.22, raio: 0.6, recua: false,
      ataques: [
        { golpes: ['alto'], peso: 3 },
        { golpes: ['pesado'], peso: 2 },
        { golpes: ['rasteira'], peso: 3 },
        // alto e, em seguida, um pesado que segura a pose antes de bater
        { golpes: ['alto', { tipo: 'pesado', atraso: 0.35 }], peso: 2 },
      ],
    },
    cacador: {
      nome: 'Caçador corrompido',
      vida: 62, velPatrulha: 1.5, velPerseguir: 4.6,
      dano: 13, alcance: 2.1, preparo: 0.34, ativo: 0.12, recuperacao: 0.55,
      visao: 19, firmeza: 0,
      // Ágil: cambaleia por pouco tempo e depois aguenta os golpes por 1,8 s
      // (veja combate.atordoamentoInimigo). É o que impede travá-lo até a morte.
      atordoamento: 0.4, folego: 1.8,
      escala: 1.0, raio: 0.45, recua: true,
      ataques: [
        { golpes: ['alto', 'alto'], peso: 3 },
        { golpes: ['rasteira'], peso: 1.5 },
        { golpes: ['alto', 'alto', 'rasteira'], peso: 2 },
      ],
    },
    penitente: {
      nome: 'Penitente do Véu',
      vida: 84, velPatrulha: 1.2, velPerseguir: 2.8,
      dano: 19, alcance: 2.2, preparo: 0.53, ativo: 0.14, recuperacao: 0.8,
      visao: 12, firmeza: 26,
      escala: 1.05, raio: 0.44, recua: false,
      ataques: [
        { golpes: ['alto', 'alto'], peso: 3 },
        { golpes: ['rasteira'], peso: 1.5 },
        { golpes: ['pesado'], peso: 1 },
        // o segundo alto segura a pose antes de bater
        { golpes: ['alto', { tipo: 'alto', atraso: 0.35 }, 'pesado'], peso: 2 },
      ],
    },
    guardiao: {
      nome: 'Guardião do Véu',
      vida: 330, velPatrulha: 0.8, velPerseguir: 2.2,
      dano: 32, alcance: 2.9, preparo: 1.05, ativo: 0.2, recuperacao: 1.35,
      visao: 20, firmeza: 60,
      escala: 1.65, raio: 0.78, recua: false,
      chefe: true,                     // não usa ficha de ataque (combate.grupo)
      punirFrasco: { chance: 1 },      // sempre pune quem bebe o frasco perto dele
      desequilibrio: 1.15,   // chefes se recompõem mais rápido de um aparo
      ataques: [
        { golpes: ['alto'], peso: 3 },
        { golpes: ['pesado'], peso: 2 },
        { golpes: ['rasteira'], peso: 1.5 },
      ],
      // Fase final (abaixo de metade da vida, Etapa C, PR C2): não dá para vencer
      // só com parry. Pelo menos metade do peso é de golpes que o tiro NÃO apara
      // (aparavel: false, aviso branco-violeta 'inaparavel'): a resposta é a
      // esquiva ou o quickstep. Sequências de até 3 golpes.
      //   desequilibrio  segundos aberto depois de um aparo (o visceral só
      //                  sai para quem emenda na hora)
      //   virada         na troca de fase ele ruge, fica invencível por
      //                  "invencivel" segundos e se afasta "passo" metros
      faseFinal: {
        velPerseguir: 2.9, dano: 25, preparo: 0.73, recuperacao: 1.1,
        emenda: { espera: 0.25, adiantar: 0 },
        desequilibrio: 0.9,
        virada: { invencivel: 1, passo: 1.2 },
        ataques: [
          // varrida dupla inaparável: "lado" diz de que lado a lâmina vem
          { golpes: [
            { tipo: 'alto', lado: 1, aparavel: false, aviso: 'inaparavel' },
            { tipo: 'alto', lado: -1, aparavel: false, aviso: 'inaparavel' },
          ], peso: 3 },
          // pesado inaparável que segura a pose antes de bater
          { golpes: [{ tipo: 'pesado', atraso: 0.35, aparavel: false, aviso: 'inaparavel' }], peso: 2 },
          { golpes: ['rasteira', 'alto'], peso: 2 },
          { golpes: ['alto', 'alto'], peso: 2 },
        ],
      },
    },
  },
};
