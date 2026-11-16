# PASSAGEM — contexto do PUGNA para cada chat novo

> **Para a IA:** leia este arquivo, o `LEIAME.md` e o `AGENTS.md` antes de qualquer tarefa. O LEIAME descreve o código; este arquivo descreve as decisões de design e o plano. Ao terminar cada tarefa, atualize a seção "Estado atual" e marque o item no "Plano". Explique tudo em português simples: o dono do projeto não é programador.

## O projeto

- **Nome:** PUGNA, um jogo 3D de navegador (Three.js + Vite), jogável no PC. O celular está congelado (ver "Decisões").
- **Equipe:** Heitor (dono) e Gabriel Tavares (colaborador). Uns 5 amigos jogam e dão feedback.
- **Repositório:** `heitoranicio15-glitch/pugna`. Ele publica sozinho no GitHub Pages: https://heitoranicio15-glitch.github.io/pugna/
- **Pasta do Heitor:** `C:\Users\Heitor\OneDrive\Documentos\Jogo\pugna`. O `jogar.bat` puxa a `main` antes de abrir o jogo, e o `atualizar.bat` só atualiza.
- **Fluxo:** o `AGENTS.md` manda. Cada mudança vai numa branch nova a partir da `main`, entra por pull request e passa pelos testes (`npm test`, `npm run build` e `npm run test:browser` se mexer na partida). O teste do celular (`npm run test:celular`) é opcional enquanto o celular estiver congelado. A IA pode integrar sozinha se os testes passarem e não houver conflito. Se houver conflito ou teste falhando, ela para e explica.
- **Requisitos:** Node.js 20 ou mais novo. Os valores ajustáveis ficam em `src/config.js`.

## Visão

Ação e exploração num mundo medieval gótico, vazio e triste, à noite, no estilo de Bloodborne, Dark Souls e Berserk. O jogador é um caçador de chapéu, capa, espada e pistola. Seres cósmicos distorcem o mundo, mas nunca lutam. A presença deles aparece numa **lua enorme e medonha, com rosto, sempre olhando para o jogador**, e nas cores estranhas do céu. O clima é contemplativo e sombrio, mas bonito. Explorar é o prazer principal, e o combate tem peso.

**A alma do combate é a do Bloodborne:** agressivo e visceral. Recompensa ler o inimigo e punir. Ficar na defesa ou apertar o ataque sem pensar tem que ser a pior escolha.

**Visual:** 3D low-poly com filtro retrô estilo PS1 (resolução baixa, texturas pixeladas, névoa). A base é azul e violeta profundos, com laranja no fogo e verde-ácido em olhos e magia. É psicodélico sem ser escrachado.

## Decisões já tomadas (não mudar sem o Heitor pedir)

- **Câmera:** terceira pessoa é o padrão. O computador também tem primeira
  pessoa opcional em Configurações. A mira travada usa Tab ou o botão do meio.
  A terceira pessoa tem três opções em Configurações (recentralizar sozinha,
  desviar de paredes e abertura), que são preferências.
- **Sem o gigante encapuzado:** ele foi excluído. A lua é a presença no céu.
- **Salvamento estilo Souls:** o jogo salva sozinho o tempo todo. Ao morrer, o jogador renasce na última lanterna em que descansou, e os inimigos comuns voltam. Não existe salvar manualmente. O "voltar ao checkpoint" vira o Osso de Retorno: item único, de uso ilimitado. A penalidade por usar (como perder as almas nos Souls) será decidida mais para a frente.
- **Escopo:** semi-linear (vilarejo, catedral, depois áreas ligadas por atalhos). Nada de mundo aberto. Os inimigos são humanos de armadura, que reaproveitam o mesmo esqueleto e as mesmas animações.
- **Pistola é a mão secundária padrão** (não é mais "fase 2"). Ela é o parry do jogo, como no Bloodborne: um tiro durante o golpe do inimigo. O parry do broquel saiu (PR B1).
- **Broquel fora do combate por enquanto.** No futuro ele pode voltar como item ou como mão secundária alternativa, para bloquear (está em "Depois" no Plano). As ideias dele ficam guardadas: parry colado no inimigo, bloqueio que gasta estamina, guarda que quebra. O bloqueio e o aparo com **C** já saíram do jogo (PR B1); os campos `bloqueavel`/`custoBloqueio` dos golpes ficaram em `config.js` para quando ele voltar.
- **Celular congelado, não apagado.** Não adicionar botões de toque para mecânicas novas. O teste do celular saiu dos testes obrigatórios (virou `npm run test:celular`, opcional). O jogo mostra um aviso de que o celular não é suportado por enquanto. O código de toque (`src/interface/Toque.js`, o bloco `controles-toque` do `index.html`, `tests/mobile.mjs`) fica onde está, para voltar depois.
- **Só o Esc pausa.** Abrir a bolsa ou ler uma anotação no meio da partida não para o jogo, como nos souls.
- **O que a pesquisa sobre parry mostrou** (guia para a Etapa B): no Bloodborne o parry é um tiro no meio do ataque do inimigo, o ritmo muda por inimigo e a munição limitada impede o spam. No Sekiro a janela é de uns 0,2 s, começa no instante do aperto e errar vira bloqueio; apertar sem parar encolhe a janela. A fluidez não vem do tamanho da janela: vem de o gesto ser instantâneo, de o erro não travar o jogador, de existir uma penalidade para o spam e de a recompensa emendar na hora.

## A regra de ouro do combate

Cada resposta do jogador precisa ser a melhor contra algum tipo de ataque. Se não for assim, a esquiva domina e o resto vira enfeite.

| Ataque inimigo | Melhor resposta | Recompensa |
| --- | --- | --- |
| Alto (normal) | Parry com a pistola (tiro durante o golpe do inimigo) ou esquiva | Parry: inimigo desequilibrado e golpe visceral |
| Pesado | Parry com a pistola, com janela menor | Execução (ainda mais dano, pausa, tremor de tela) |
| Rasteira (larga) | Pulo | Contra-ataque pisando no inimigo; a rasteira não pode ser aparada |
| Qualquer um | Esquiva (rolamento; com a mira travada, quickstep) | Nenhuma: é segura, mas não recompensa |
| Antes da luta | Golpe pelas costas (agachado, sem ser visto) | Execução silenciosa |
| Acabou de apanhar | Revidar logo (rally) | Recupera parte da vida perdida |

O parry com a pistola (PR B1), o visceral e a execução (PR B2) e o quickstep (PR B3) já funcionam.

## Estado atual

- **Polimento da Catedral, nona etapa.** A mesa do Refeitório tem
  cinco pratos e um lugar vazio, conforme a Conta da mesa. Um
  candelabro ilumina a cerâmica e a madeira. No Cabido, a mesa com
  gavetas, o livro aberto e os estandartes recebem luz mais fria.
  Cada sala tem seu mosaico. Os registros ficam nos pontos anteriores.

- **Polimento da Catedral, oitava etapa.** A Capela do Último Nome
  ganhou um memorial ogival de cantaria, mesa de pedra e luz âmbar.
  O Arquivo das Vigílias tem estantes de madeira, livros encadernados
  e luz mais clara. Faixas de mosaico conduzem aos dois registros.

- **Polimento da Catedral, sétima etapa.** O Claustro ganhou uma
  faixa de mosaico rumo à Cripta. A porta da Sacristia tem tábuas,
  travessas, rebites e puxador de ferro. As duas grades de atalho
  têm alavancas articuladas e um indicador que fica verde após a
  abertura. As chaves, os lados de acionamento e os saves usam
  as regras anteriores.

- **Polimento da Catedral, sexta etapa.** A faixa de pedra da nave
  continua pelo Coro. Painéis de madeira e arandelas marcam a passagem
  para o Santuário. Na Abside, um mosaico antecede o estrado, com
  degraus de quinas claras e altar de cantaria, tecido bordado e
  castiçais. O Juramento fica no ponto de leitura original.

- **Polimento da Catedral, quinta etapa.** O sino da Sala do Bronze
  tem boca espessa, frisos, pátina, badalo e duas pontas de corda.
  Vigas, escoras e ferragens mostram como ele se prende à torre. As
  cinco urnas da Cripta variam em altura e cor, com tampas e faixas
  geométricas. Um friso de cantaria e velas de parede destacam a fileira.

- **Polimento da Catedral, quarta etapa.** A galeria ganhou degraus
  com bordas de pedra clara e guarda-corpos com coroamento contínuo.
  Duas lanternas de bronze marcam a subida e a travessia da ponte.
  As escadas da Torre e da Cripta usam o mesmo acabamento e todos
  os patamares mantêm as dimensões e colisões anteriores.

- **Polimento da Catedral, terceira etapa.** No Ossário, um mosaico
  quente leva ao pedestal com velas e à mesa com urnas. No Relicário,
  o piso e a luz azul acompanham o vitral e o cofre de madeira e
  bronze. As duas alas têm mesas esculpidas, cantaria, estandartes e
  uma luz local sem sombras. Os selos e os móveis ocupam os mesmos
  pontos da planta.

- **Polimento da Catedral, segunda etapa.** A nave e o transepto têm
  cantaria mais granulada, rodapé úmido, lajes laterais e uma faixa de
  pedra com filetes de bronze ao longo do caminho até a grade. O
  candelabro e as velas da grade criam dois pontos de luz quente.
  A iluminação revela o bronze e a pedra, mas a madeira dos bancos ainda
  fica escura nas laterais. A contenção do custo usa duas luzes sem sombras.

- **Polimento da Catedral, primeira etapa.** A nave ganhou bancos com pés,
  assento, encosto e encaixes visíveis. Os vitrais existentes ganharam
  silhueta ogival, rosácea e juntas de chumbo. Esta etapa foi escolhida
  como referência visual para os próximos ambientes.

- **Prompt 8 — 4, progressão e arsenal:** Portão Sul selado até recolher a
  chave do Guardião. Quatro pistas (registro, oficina/ferreiro, lápide e
  vigia); chave gira, corda cai, bronze cala e o portão fica aberto.
  Migração para a versão de progressão 2 mantém acesso de quem já tinha
  ido ao exterior ou vencido o Guardião. Bolsa equipa as três armas
  novas, mostra itens e repõe balas de reserva. Local e IDs em `docs/mapa.md`.
  **Decidido pela IA:** abertura em 1,32 s; de 1 para 4 armas primárias,
  com fichas de golpe em CONFIG; relíquia de 0% → 6% de regeneração extra,
  capacidade de cura básica mantida em 42 por dose; dois pacotes de 3 e 2
  cartuchos; um frasco maior de uma dose extra. Vitória e equipamento são
  salvos sem alterar preferências.
  **Validação:** E1 rodada com todas as armas (60 lutas por cenário e
  estratégia); os resultados e limites da simulação estão em `docs/mapa.md`.
  Falta jogar o percurso completo e ajustar ritmo/FPS no PC do Heitor.
  A revisão após a fase 4 corrigiu o encaixe dos braços, botas e avental
  dos dois moradores novos, mantendo as mesmas malhas e posições no mapa.

- **Prompt 8 — 3, Floresta Seca ampliada:** a trilha em S liga clareira de
  descanso, ruína, grota, cabana, ponte de toras, poço e barricada; dois
  desvios retornam ao eixo. Três anotações, cavalo sem cavaleiro e urnas
  vazias estendem a história do toque. O Castelo ainda não é uma área.
  **Decidido pela IA:** 40 × 90 → 80 × 150 m, trilha 4,5 → 5,2 m,
  barricada z 41,8 → 101,4. Cerca de 40 → 316 árvores jogáveis, 8
  monumentais, 5 formas próprias e setores de 24 m recortados a 39 m.
  A chegada e a lanterna antiga conservam posições; 1 → 2 lanternas.
  Três inimigos, tipos e dano mantidos, patrulhas separadas pelo bosque.

- **Prompt 8 — 2, névoa do exterior:** estrada e floresta têm curvas,
  desvios que voltam, xisto e silhuetas em camadas. Limites e portais
  permanecem. O PS1 usa bandas de névoa imóveis e o HD usa névoa contínua
  com bancos móveis. O sino da estrada e a coruja usam estéreo.
  **Decidido pela IA:** densidade 0,028 → 0,036 na estrada e 0,034 → 0,042
  na mata; alturas da névoa baixa 2 → 2,5 m e 2,6 → 3,25 m. Vila em 0,026,
  exploração em 0,88 e combate conservados. Cores anteriores em CONFIG.

- **Prompt 8 — 1C, clima e salas:** seis anotações novas, cela da sineira,
  urnas, sala do bronze, vitrais e poeira em dois feixes. A nave tem eco, a
  torre tem vento e a cripta tem gotas. Os três inimigos comuns mantêm seus
  tipos e ataques, com um Penitente em cada nível baixo (térreo/cripta) e
  o Caçador perto da ponte. A arena e o número de fichas não mudaram.
  **Decidido pela IA:** recorte de setores distantes a 46 m; torre e cripta
  escondem os pisos isolados. Luzes fixas locais na Catedral: 13 → 2 (lanternas
  da nave e do coro); selos, outras lanternas e chamas brilham pelo material.
  Perfis de som antigos e novos em `src/config.js`; contagens PS1/HD em
  `docs/mapa.md`. Falta ouvir e jogar no PC de destino.

- **Prompt 8 — 1B, Catedral vertical:** a nave leste sobe à galeria e à
  Sala do Bronze; o claustro desce à cripta, cujo ferrolho abre por dentro.
  Quatro cotas navegáveis, lanternas no coro e nos pisos novos, câmera e
  navegação com colisão em altura. O chão antigo e o ID da nave continuam no
  mesmo lugar; o save continua apontando à lanterna pelo ID.
  **Decidido pela IA:** de 1 para 4 níveis (−4/0/+4/+8 m) e de 1 para 5
  lanternas na Catedral (teto na spec 05: de 3 para 6, só ali). Quatro lances
  de 16 degraus, espelho de 0,25 m, piso de 0,50 m e largura de 3,50 m,
  com patamares em módulos de 4 m. A torre usa dois lances com mudança de
  direção. Testes em Node percorrem os lances, o ferrolho e a rota do Guardião.

- **Prompt 8 — 1A, catedral modular (pronto no código):** térreo com nave e
  corredores laterais, transepto, coro, arena, abside, claustro, sacristia,
  capela, arquivo, refeitório e cabido. O kit usa a mesma planta para volumes e
  colisões. Permanecem o checkpoint da nave, os dois selos, os eventos da
  sacristia e a derrota do Guardião. A planta por andar e a medição em Node
  estão em `docs/mapa.md`. Testes pesados dispensados no Prompt 8; verificar
  iluminação, câmera e ritmo caminhando no jogo.
  - **Decidido pela IA:** malha nova de 4 m, parede de 0,5 m, vão de 3,5 m,
    pés-direitos de 5 a 12 m, caixa da planta 70 × 42 → 76 × 76 m. Grade dos
    selos z −13 → −29, Guardião z −24 → −47; seguem no eixo norte da nave.
    Refeitório e cabido ganham ligação com o transepto e as capelas. Guardião,
    patrulhas e itens mantêm o mesmo número e as mesmas regras de combate.

- **Câmera estilo Souls, fase CAM4: opções em Configurações (pronto). Com isso a câmera estilo Souls (CAM1 a CAM4) está completa.** Spec 10, seção CAM4. Só na terceira pessoa.
  - **Três opções novas** em Configurações (tela inicial e pausa), logo abaixo de "Câmera". Valem na hora, ficam salvas e ficam cinza na primeira pessoa:
    1. **Recentralizar sozinha** (desligada por padrão): andando ou correndo sem mexer o mouse por 1,5 s, o olhar volta devagar para trás do corpo. Mexer o mouse cancela na hora. Não vale com a mira travada.
    2. **Desviar de paredes** (ligada por padrão): a câmera "tateia" um pouco para cada lado; com parede só de um lado, o olhar gira devagar para o lado livre. Desligada, vale só o encurtar da CAM2.
    3. **Abertura da câmera**: controle de 40° a 60°, padrão 48° (`CONFIG.camera.campoDeVisao`).
  - **São preferências**, na chave `pugna-preferencias-v1` (`cameraRecentrar`, `cameraDesviar`, `cameraAbertura` em `src/nucleo/Preferencias.js`), com padrão para valor ausente ou inválido e faixa para a abertura. O save de progresso não mudou e "Apagar progresso" não as apaga (o teste de navegador confere).
  - **Não mudou:** primeira pessoa, câmera do menu inicial, regras de combate, mira travada, save, IDs e `Toque.js` (nenhum botão de toque novo).
  - **Código:** funções puras `recentralizar` e `desvioDeParede` em `src/nucleo/enquadramento.js`; `campoDeVisao` aceita a `abertura` escolhida; `Jogador.atualizar` (recentralizar) e `Jogador.atualizarCamera` (desvio); `Menu.js` e `index.html` (os três campos).
  - **Decidido pela IA (o Heitor revisa):** todos em `CONFIG.camera`. Recentralizar: `recentrarEspera` **1,5 s** (pedido do Heitor), `recentrarEntrada` **0,5 s** (começa devagar), `recentrarRapidez` **1,2**, `recentrarVelMax` **0,7 rad/s** (uns 40° por segundo), `recentrarSemVolta` **2,6 rad** (uns 150°). Desviar: `desviarAngulo` **0,3 rad** (uns 17° para cada lado), `desviarVel` **0,6 rad/s**, `desviarMargem` **0,08**, `desviarEspera` **0,5 s**, `desviarSuavidade` **4**. Abertura: `aberturaMin` **40** e `aberturaMax` **60** (pedido do Heitor), de 1 em 1 grau. Escolhas minhas: (1) parar de andar zera a espera do recentralizar; (2) andando de frente para a câmera ela não gira (senão daria meia-volta sem parar); (3) o recentralizar só mexe no giro para os lados, não na inclinação; (4) como o caçador anda em relação à câmera, o recentralizar aparece principalmente ao andar de lado: a câmera vai girando e o caçador faz uma curva, como nos Souls; (5) o desvio de parede espera 0,5 s depois do último movimento do mouse e não age com a mira travada; (6) parede bem atrás da câmera (igual dos dois lados) ou beco estreito não gira nada, só encurta; (7) as três opções também valem no celular deitado (congelado), sem nada novo no `Toque.js`.
  - **Ninguém sentiu jogando ainda:** se o desvio de parede incomodar (a vista "foge" sozinha perto de muro), baixar `desviarVel` ou `desviarAngulo`, ou trocar o padrão para desligado; se o recentralizar parecer lento, subir `recentrarVelMax`.
  - `npm test` (150), `npm run build` e `npm run test:browser` passam. 5 testes novos em `tests/jogabilidade.test.js`; o `validarCamera` do teste de navegador confere as três opções.

- **Câmera estilo Souls, CAM3b: alvo colado e caçador transparente (pronto).** Spec 10, seção CAM3b. Só na terceira pessoa.
  - **Alvo colado:** com a mira travada e o alvo a menos de 2,5 m, a câmera inclina um pouco mais para baixo (até −0,1 rad, uns 6°, inteiro a 1,2 m) e com isso sobe uns 0,4 a 0,5 m, para ver o inimigo por cima do ombro. Entra aos poucos (mesma suavidade da inclinação da CAM3). É pouco de propósito: câmera alta demais de perto é a queixa dos Souls.
  - **Caçador transparente em vez de sumir:** o boneco não some mais de uma vez. Ele vai ficando transparente com pontilhado estilo PS1 (deixa de desenhar parte dos pixels num padrão fixo) em dois casos: (1) a câmera chega perto dele por causa de uma parede (inteiro a 2,4 m, invisível a 1,25 m); (2) ele tapa na tela o ponto do marcador do alvo travado (cai para 30%). Funciona no PS1 e no HD (no HD o grão do padrão cresce com a resolução).
  - **Não entrou:** câmera de lado (estilo ombro), a pedido do Heitor.
  - **Não mudou:** regras de combate, escolha de alvo, primeira pessoa, save, IDs e `Toque.js`.
  - **Código:** funções puras `fatorColado`, `coberturaDoAlvo` e `opacidadeDoCacador` em `src/nucleo/enquadramento.js`; `pontilhar` em `src/render/retro.js` (acrescenta o pontilhado a um material sem tirar a tremida, a névoa baixa e o contorno); `Boneco.atualizarTransparencia` faz a conta a cada quadro e prepara os materiais do caçador (inclusive os que chegam depois e os do HD).
  - **Fotos:** `docs/fotos/cam3b/` (antes e depois: inimigo do tamanho do caçador travado a 1,5 m, Guardião de perto, câmera a 1,6 m, 1 m e colada na parede; mais duas de conferência no HD). A ferramenta de fotos ganhou `--so=nomes` e `--hd`.
  - **Decidido pela IA (o Heitor revisa):** em `CONFIG.mira`: `coladoDistancia` **2,5 m** (sugestão do Heitor), `coladoCheio` **1,2 m**, `coladoInclinacao` **−0,1 rad**, `tapaOpacidade` **0,3**, `tapaMargem` **0,05** (fração da altura da tela), `tapaLargura` **0,42 m** e `tapaAltura` **1,95 m** (silhueta do caçador na conta). Em `CONFIG.camera`: `transparenteDe` **2,4 m**, `transparenciaRapidez` **8**; `sumirBoneco` continua **1,25 m** (agora é onde ele termina de sumir). Escolhas minhas: subir a câmera só pela inclinação (sem mexer na altura do ponto de giro); "tapar o alvo" é medido pelo ponto do marcador (o peito do alvo), não pelo corpo inteiro, senão o caçador ficaria transparente em quase toda luta travada; a transparência por distância vale na hora e a da mira entra aos poucos.
  - **Limite conhecido:** inimigo escuro atrás do caçador, na névoa, continua difícil de ler numa foto parada (escuro sobre escuro); o pontilhado mostra a silhueta dele e deve ler melhor em movimento. **Ninguém sentiu jogando ainda:** se o pontilhado incomodar na luta, subir `tapaOpacidade` (0,5) ou pôr 1 para desligar; se a câmera parecer alta de perto, aproximar `coladoInclinacao` de 0.
  - `npm test` (145), `npm run build` e `npm run test:browser` passam. 3 testes novos em `tests/jogabilidade.test.js`.

- **Câmera estilo Souls, fase CAM3: mira travada (pronto).** Spec 10, seção CAM3. Só na terceira pessoa.
  - **O que mudou com a mira travada:** (1) a inclinação deixou de ser fixa: parte da base (−0,27) e soma 60% do ângulo até o peito do alvo, então a câmera levanta o olhar para o Guardião e para inimigo em escada, e abaixa para alvo mais baixo; (2) a câmera continua atrás do caçador, mas olha para um ponto no caminho até o alvo (30% do caminho, no máximo 1,5 m); (3) ela se afasta para alvo grande (+0,5 m por ponto de escala acima de 1: Guardião +0,33 m, cavaleiro +0,11 m) e um pouco para alvo colado (a menos de 2 m); (4) travar, trocar de alvo, destravar e perder o alvo atrás de parede mudam tudo aos poucos. Ao destravar, o olhar fica onde está (não volta para as costas); só o foco e a distância se acomodam em uns 0,8 s.
  - **Não mudou:** as regras de combate (direção dos golpes, quickstep, escolha e troca de alvo, `mira.cone`, `mira.semVisao`), a primeira pessoa, a câmera sem mira (as 4 fotos fixas sem mira saem iguais), a colisão com parede da CAM2 (vale também para o foco), save, IDs e `Toque.js`.
  - **Código:** quatro funções puras em `src/nucleo/enquadramento.js`: `inclinacaoDaMira`, `focoDaMira`, `distanciaDaMira` e `acomodar` (mola sem balanço, igual a 30 e a 144 quadros por segundo). `Jogador.atualizar` (bloco "câmera") e `Jogador.atualizarCamera` as usam; o estado fica em `jogador.focoMira`, `jogador.extraMira` e `jogador.tMira`.
  - **Fotos:** `docs/fotos/cam3/` (antes e depois nos mesmos pontos: os 4 fixos, cavaleiro travado a 4 m e a 1,5 m, Guardião de perto e de longe, troca de alvo em 3 momentos). A ferramenta `tests/fotos-camera.mjs` agora tira as 11.
  - **Decidido pela IA (o Heitor revisa):** em `CONFIG.mira`: `inclinacaoFracao` **0,6**, `focoFracao` **0,3**, `focoMax` **1,5 m**, `distPorEscala` **0,5 m**, `pertoDistancia` **2 m** (as sugestões do Heitor, mantidas); `pertoExtra` **1 m** (o "um pouco": dá +0,25 m com o alvo a 1,5 m e +0,5 m a 1 m); `inclinacaoDistMin` **1 m** (alvo mais colado que isso conta como a 1 m, para a inclinação não disparar); `suavidade` **4** (rapidez da inclinação; era um 4 solto no código, mesmo valor); `acomodar` **6** (rapidez da mola do foco e da distância); `entrada` **0,25 s** (o giro para o alvo começa devagar e chega à velocidade normal em 0,25 s; antes partia na velocidade máxima, que era o tranco ao travar). Escolhas minhas: a distância é contada a partir do foco (soma o desvio), para a câmera nunca chegar mais perto do caçador do que sem a mira; o foco para antes de parede; o `mira.cone` **não** foi mexido (a spec 10 previa rever, mas o pedido da CAM3 foi não mudar a escolha de alvo).
  - **Limite conhecido:** com um inimigo do tamanho do caçador colado (1,5 m), o caçador ainda tapa o corpo dele, porque a câmera fica bem atrás do caçador, na linha do alvo. Melhorou (dá para ver cabeça, ombros e arma por cima do chapéu), mas não resolve. O que resolveria é pôr a câmera um pouco de lado ou mais alta quando o alvo cola: fica como ideia para o Heitor decidir. **Ninguém sentiu jogando ainda:** se a entrada e a saída da mira parecerem lentas, subir `acomodar` (8 a 10) ou baixar `entrada`.
  - `npm test` (142), `npm run build` e `npm run test:browser` passam. 6 testes novos em `tests/jogabilidade.test.js`.

- **Câmera estilo Souls, fase CAM2: câmera com peso (pronto).** Spec 10, seção CAM2.
  - **O que mudou:** a câmera em terceira pessoa não anda mais grudada no caçador. Ela gira em volta de um ponto que persegue o caçador com um pequeno atraso (mais lento na vertical), então rolamento, quickstep, pulo, degrau e pisada não sacodem mais a imagem: o caçador se desloca um pouco no quadro e a câmera o alcança. Depois de encostar numa parede, a câmera se afasta de novo mais devagar (sem zoom brusco).
  - **Não mudou:** girar com o mouse continua imediato; a câmera ainda encurta na hora ao bater em parede; tremor de tela e "afundar"; a primeira pessoa; o enquadramento parado (as 4 fotos fixas saem iguais às da CAM1); save, IDs e `Toque.js`.
  - **Teletransporte encaixa na hora:** começar a partida, renascer na lanterna e Osso de Retorno (`Jogador.reiniciar`) e atravessar portal (`atualizarCamera(0, 0)`).
  - **Código:** função pura `seguirPonto` em `src/nucleo/enquadramento.js` (exata para o alvo em linha reta: mesmo resultado a 30 e a 144 quadros por segundo); `Jogador.atualizarCamera` usa `jogador.pivo`. Parede entre o caçador e o ponto atrasado puxa o ponto para o lado do caçador. O limite do chão usa os pés do caçador. O boneco some pela distância real da câmera ao caçador (`jogador.distBoneco`).
  - **Decidido pela IA (o Heitor revisa):** `camera.seguirPlano` **6** e `camera.seguirVertical` **3** (rapidez do atraso, por segundo; antes não havia atraso); `camera.atrasoMaxPlano` **0,6 m** e `camera.atrasoMaxVertical` **0,4 m**; `camera.voltaDistancia` **3** (antes 6, número solto no código) — todos são as sugestões do Heitor, mantidas. Escolhas minhas: puxar o ponto até antes da parede em vez de pular para o caçador; limite do chão pelos pés do caçador; boneco some pela distância real. **Ninguém sentiu jogando ainda:** se parecer "mole" ou enjoar, subir `seguirPlano` (8 a 10) ou baixar `atrasoMaxPlano`; se parecer duro, baixar `seguirPlano` para perto de 3 (o valor do Dark Souls).
  - **Ficou de fora:** o boneco sumir de uma vez (transparência gradual) e a câmera perto demais ao olhar para o céu.
  - `npm test` (136), `npm run build` e `npm run test:browser` passam. 5 testes novos em `tests/jogabilidade.test.js`.

- **Câmera estilo Souls, fase CAM1: enquadramento (pronto).** Spec 10 (`docs/specs/10-camera-souls.md`), com o plano das 4 fases (CAM1 a CAM4), os números de referência do Elden Ring e os critérios de aceite.
  - **O que mudou:** a terceira pessoa ganhou abertura própria e mais fechada, a câmera gira em volta do peito do caçador (antes girava acima da cabeça) e ficou um pouco mais perto. O caçador ocupa uns 50% da altura da tela (antes uns 28%; no Souls uns 57%). Fotos de antes e depois em `docs/fotos/cam1/`.
  - **Não mudou:** a primeira pessoa (72°), a câmera do menu inicial, o celular em pé (88°), `inclinacaoInicial` (−0,2), `mira.inclinacao` (−0,27), `mira.cone`, save, IDs e `Toque.js`.
  - **Código:** a regra da abertura é a função `campoDeVisao` em `src/nucleo/enquadramento.js`, chamada pelo `Jogo.js` a cada quadro (trocar de perspectiva em Configurações vale na hora, até pausado). Os números soltos `0.25` (câmera rente ao chão) e `0.85` (boneco some) saíram do código e foram para `CONFIG.camera`. Ferramenta nova `tests/fotos-camera.mjs` tira as 4 fotos fixas para as próximas fases.
  - **Conferido:** câmera não entra no chão olhando para cima; boneco some com a câmera colada; marcador da mira em cima do alvo; cone de travar (não depende da abertura); taverna (teto visto de baixo, salão à mostra de cima). Detalhes na spec 10.
  - **Decidido pela IA (o Heitor revisa):** `camera.campoDeVisao` **48°** (antes 72°, o mesmo da primeira pessoa); `camera.alturaPivo` **1,55 m** (antes 2,3); `camera.distancia` **4,2 m** (antes 4,4) — os três são os valores iniciais do Heitor, mantidos depois de olhar as fotos; `camera.sumirBoneco` **1,25 m** (antes 0,85: com o giro no peito, a 1 m as costas do caçador tapavam a tela); `camera.folgaDoChao` 0,25 m (mesmo valor, só ganhou nome); o celular deitado usa a abertura nova. **Pontos para sentir jogando:** olhando bem para o céu a câmera chega a 1,7 m do caçador (antes 2,7) e ele tapa o meio da tela; a lua e o céu parecem maiores; dá para travar a mira num inimigo um pouco fora da tela (a CAM3 revê).
  - **Teste de navegador consertado:** o `npm run test:browser` já falhava na `main` desde a Fase 3 da arte (o caçador anda 12% mais devagar fora de combate e não chegava à grade da catedral com os passos contados antes; não tinha a ver com a câmera). O `andar` do `tests/catedral.mjs` agora dá mais passos quando o caçador está fora de combate.
  - `npm test` (131), `npm run build` e `npm run test:browser` passam. O teste de navegador ganhou `validarCamera` (abertura 48° em terceira pessoa, 72° em primeira pessoa e no menu, trocando pelo menu de Configurações).

- **Direção de arte, Fase 3: atmosfera de medo (pronto).** Detalhes e antes/depois por área em `docs/reconstrucao-grafica.md` (seção "Direção de arte").
  - **Névoa baixa** calculada no pixel de cada material (`src/render/retro.js`), nos dois modos: engole a base das construções e apaga o chão ao longe; degraus no PS1, suave no HD. Valores em `CONFIG.areas.<área>.nevoaBaixa` (vila, estrada, floresta, catedral; a taverna não tem).
  - **Paleta e névoa:** céu quase preto, névoa índigo (vila), azul (estrada), verde-azulada (floresta) e violeta (catedral) bem mais densa; os valores antigos ficaram anotados no `config.js`. Sombras puxam para a cor da área no passe final; HD com grão e halo leve nos emissivos; PS1 com saturação 0,9.
  - **Escala:** lua 21° (antes 18°) e mais baixa, halo azul largo, estrelas densas; agulha colossal e torre partida no horizonte das três áreas abertas; muralha com ameias. Halos de tochas e lanternas furam a névoa. Contorno frio nos personagens.
  - **Texturas:** pedra fria, madeira queimada, ardósia azulada; rodapé com musgo (casas, torres, muralha, catedral).
  - **Medo:** corvos, tocha que quase apaga, rajada sussurrada e o ambiente que se cala quando um inimigo percebe (`src/mundo/Pressagios.js`, `CONFIG.medo`; desligados no modo de teste). Nada muda dano.
  - **Decidido pela IA (o Heitor revisa):** fora de combate (sem mira travada e sem inimigo perseguindo a menos de 18 m) o caçador anda e corre 12% mais devagar: **andar 3,3 → 2,9 m/s, correr 6,2 → 5,46 m/s** (`ritmoExploracao` 0,88; `velAndar`/`velCorrer` e esquivas não mudaram); passos mais graves; HD saturação 1,15 → 1,02; todas as cores e densidades de névoa; a agulha colossal; os presságios e seus intervalos. **Ninguém viu nem ouviu ainda**: o principal risco é ficar escuro demais (o brilho nas Configurações compensa) ou a névoa baixa forte demais (`nevoaBaixa.forca`).
  - `npm test` (129) e `npm run build` passam. Novo `tests/atmosfera.test.js`.

- **Direção de arte, Fase 2: plano da vila (pronto).** Plano em metros em `docs/mapa.md`; regras em `CONFIG.vila` e testadas em `tests/vila.test.js`.
  - **Casas em fileira:** `src/mundo/QuadrasVilarejo.js` põe casas dos dois lados de cada rua principal ou secundária, a 0,6 m da beira, porta para a rua, ritmo fixo de três tipos (pequena 7 × 6,5 m térrea, média 8,5 × 7,5 m sobrado, grande 10,5 × 9 m). Casas da mesma fileira se encostam; quando o lote está ocupado (torre, abrigo, rota, lanterna, placa), abre-se um vão de pelo menos um beco. Muro logo atrás: a casa fica mais funda e encosta. Eram 33 casas soltas; agora são 78.
  - **Ruas:** principal 6,5 m, secundária 5,5 m, beco 3,2 m (o arco da triagem é o gargalo marcado). Corredor mínimo de 3 m (quickstep de 2,2 m + corpo). A rua oeste e a rua do mercado agora vão até os bairros; novo **Bairro do Portão Leste** (z 48,6 e x 50,7) fecha o quadrante sudeste vazio.
  - **Oclusores:** 7 arcos de pedra atravessam as ruas compridas; ruínas de muro e árvores secas enchem os miolos de quarteirão (a cada 7 m, longe de ruas, rotas e pontos). Casas, arcos e ruínas são juntados por setor de 40 m (`LoteDeCenario` em `pecas.js`): o vilarejo ficou com uns 61 mil triângulos, contra uns 230 mil dos modelos importados antes.
  - **Testes novos:** só três tipos e três larguras; nenhuma casa invade rua; nenhuma fresta entre casas; todo vão alcançável entre paredes tem 3 m ou mais; do Portão Sul se chega às lanternas, portais e a cada ponto das patrulhas; cada rua comprida tem arco. O teste dos adereços agora também acusa adereço no meio da rua.
  - **Decidido pela IA (o Heitor revisa):** gerar as casas por regra em vez de posicionar uma a uma; o ritmo de tipos, as medidas dos tipos, o recuo e as larguras; os arcos de bairro; o Bairro do Portão Leste; tirar 2 árvores, 3 entulhos e 6 adereços que as fileiras engoliram ou que ficaram no meio da rua. Lanternas, portais, nascimento, rotas, placas, abrigos e IDs não mudaram de lugar. `npm test` (125) e `npm run build` passam; **ninguém viu ainda**.

- **Direção de arte, Fase 1: limpeza (pronto).** Relatório em `docs/auditoria-visual.md`. As casas importadas tinham buracos de verdade: `House_3` e `House_4` são ruínas sem telhado, e o muro `TallWallBricks` só tem a face da frente (nos lados sul e leste da muralha o verso ficava para dentro da vila). Todas eram esticadas numa proporção diferente.
  - **Kit modular próprio** em `src/mundo/pecas.js`: `casa()` monta paredes de pedra fechadas, rodapé escuro, cantos e vigas de madeira queimada, telhado de ardósia com beiral e empenas de pedra; porta, janela, pé-direito, beiral e caimento iguais para todas (`CONFIG.arte.casa`), sem sorteio. `torre()`, `muralha()`, as paredes da catedral, das alas e dos Bairros também usam só peças do jogo. Cada casa é desenhada com 6 a 8 malhas (uma por material).
  - **Textura do mesmo tamanho em tudo** (`CONFIG.arte.ladrilho`, por família de material): pedra 2 m, madeira 1,4, telhado 2, calçamento 4, lajes 4, assoalho 1,6. Os modelos importados com pedra/madeira/telhado no HD têm UV projetado em metros, já com a escala do encaixe (`src/render/modelos.js`).
  - **Adereços:** teste novo `tests/aderecos.test.js` (falha se um adereço flutuar, entrar em parede ou casa, ficar sem chão ou, se for de parede, ficar solto). Foram movidos ou tirados uns 20 (lista no relatório). O colisor do riacho ganhou `agua: true`.
  - **17 GLBs sem uso apagados** (casas, torres, muros e peças de catedral do Quaternius, RGS e KayKit), uns 4 MB a menos; `CREDITOS.md` atualizado.
  - **Decidido pela IA (o Heitor revisa):** trocar todas as construções importadas pelo kit do próprio jogo, em vez de consertar modelo por modelo (é o que garante parede fechada e um só conjunto de materiais); os dois livros dos bancos da nave saíram; o altar das capelas voltou a ser de pedra; as medidas de porta, janela e beiral são minhas. Save, IDs, checkpoints, colisores das casas e rotas não mudaram. `npm test` (119) e `npm run build` passam; **ninguém viu ainda**: olhar a vila, a igreja por dentro e a estrada no link.

- **S6: a floresta, ligada pela estrada (pronto).** Spec 05. Área nova `floresta` (`src/mundo/Floresta.js`, `CONFIG.areas.floresta`), 40 × 90 m, `usaCeu` true, `luzJogador` 5, névoa verde-azulada 0x16302f. 40 árvores, 5 troncos caídos, 6 rochas, 26 vagalumes, paredes invisíveis nos 4 lados. Sem assets novos.
  - **Ligação:** a ponta sul da Estrada deixou de ser fechada. Portal `E — seguir pela trilha da floresta` em (0; 57,4) leva à floresta (chegada (0; -38,5)); na floresta, `E — voltar à estrada` em (0; -42,4) volta à estrada (chegada nova `chegadas.floresta` (0; 52,4)). A carroça virou cenário ao lado da pista; saíram a placa "Em obras", as estacas e o colisor que fechava a ponta; entrou a placa "Trilha da floresta". No fim da trilha há uma barricada com a placa "Trilha interrompida" (onde o Castelo entra depois).
  - **Lanterna** `floresta-clareira` ("Clareira da Floresta") a uns 6 m da chegada. **Patrulhas:** caçador, cavaleiro e penitente, com os números atuais de `CONFIG.inimigos`, a mais de 18 m da chegada e da lanterna.
  - **Som e trilha:** tipo novo `floresta` (vento, coruja, galhos que estalam); trilha `vilarejo`, para a música seguir sem reiniciar desde a estrada.
  - **Preservado:** chegadas, portais, lanterna `taverna-da-estrada` e patrulhas das áreas antigas (o teste compara os números); nenhum evento novo no save (entrar na floresta não grava nada; `floresta-clareira` salva como as outras lanternas); saves antigos carregam e renascem onde renasciam.
  - **Decidido pela IA (o Heitor revisa):** a floresta como primeira área nova; tipo de som próprio em vez de reaproveitar o da estrada (um teste exige tipo único por área); os volumes do som foram escolhidos só no código, **ninguém ouviu**; o fim da trilha fica fechado até a próxima área.
  - **Pendente:** o `requer` do portal e o `docs/mapa.md` da spec 05 não foram feitos; `tests/catedral.mjs` não atravessa o portal novo (cobre vilarejo → estrada → taverna); ninguém viu a floresta rodando (testes sem WebGL): olhar a floresta jogando. `npm test` (118) e `npm run build` passam.

- **S5: som ambiente por área e crossfade de trilha (pronto; a parte visual já estava).** Spec 04. Código em `src/audio/Ambiente.js` (camadas no WebAudio) e `src/audio/regras.js` (regras puras: taxas dos eventos, ganhos do crossfade); `Trilha.js` foi reescrita com dois players; `ativarArea` agora emite `area:entrou { id, som, trilha, transicao }`. Tempos em `CONFIG.audio` (`crossfadeAmbiente` 0,6 s, `crossfadeTrilha` 1,5 s). Tudo sintetizado, sem arquivo novo e sem mudança em `CREDITOS.md`. O ambiente obedece ao volume de efeitos, à pausa e ao silenciar, e só começa depois do primeiro gesto.
  - **Camadas** (`CONFIG.areas.<area>.som`, números de 0 a 1): vilarejo `vila` (vento 0,45, grilo 0,4, sino distante 0,3); estrada (vento 0,7, riacho 0,45, madeira rangendo 0,5); taverna (fogo 0,6, murmúrio 0,5, base 0,3); catedral `pedra` (ar 0,25, gotas 0,5, eco 0,7, base 0,6).
  - **Trilha** (`CONFIG.areas.<area>.trilha`): vilarejo, estrada e taverna usam a faixa `vilarejo` (a música segue sem reiniciar entre elas); a catedral usa `catedral`; a troca do Guardião mantém a regra de antes, agora com crossfade de 1,5 s.
  - **Contraste dos avisos de combate** (WCAG, contra névoa, fundo e céu das 4 áreas): o menor par é o pesado vermelho contra a névoa da estrada, 3,16:1 (o mínimo era 3:1); rasteira 6,6 a 10,8, inaparável 7,7 a 12,7, alto 9,1 a 15,1. Nenhum ajuste foi preciso. A tabela está na spec 04 e protegida por `tests/contraste.test.js`.
  - **Decidido pela IA (o Heitor revisa):** estrada e taverna não têm música própria (só há 4 faixas e 2 são do chefe), então o "mais quente" da taverna vem do som; os volumes e as taxas foram escolhidos só no código, **ninguém ouviu ainda: ouvir e ajustar os números**; o primeiro ambiente após o clique entra em 1,2 s, as trocas por portal em 0,6 s.
  - Save, IDs e `Toque.js` não mudaram. `npm test` (110) e `npm run build` passam; o teste de navegador não foi rodado.

- **S4: NPCs parados com falas (pronto, só a Parte B da spec 03).** `src/entidades/Npc.js` (regras puras `proximaFala`, `olharParaJogador`, `validarNpc`, `criarNpcs`) e `CONFIG.npc`. O contrato de área ganhou o campo opcional `npcs: [{ id, nome, modelo, x, z, olhar, falas }]`, validado em `areas.js` (recusa NPC sem `id`, sem posição, sem falas, fala vazia ou com mais de 90 letras, id repetido). O NPC respira, vira a cabeça e o corpo devagar para o jogador a 6 m, tem colisor pequeno e não pode ser ferido. **E** mostra a próxima fala (4 s, via `hud.avisar`) e no fim repete a última; o jogo não pausa e nada é salvo.
  - **Taverneiro** agora é um `Npc` (mesmas 4 falas, mesmo prompt `E — falar com o taverneiro`, mesma posição atrás do balcão); o rodízio de falas acabou (agora avança e repete a última) e ele passa a virar para o jogador.
  - **Viajante** novo na Estrada do Sul, na margem norte do riacho ao lado do embarcadouro (-6,2; 17,2), 2,2 m fora da pista, a mais de 8 m de patrulhas e longe da lanterna. Usa o modelo do taverneiro (`scary-doctor`) com tinta fria e postura curvada. 3 falas sobre o Véu, a lua e os sinos da catedral.
  - **Fora desta entrega:** a Parte A (variações `aparencia` do `Boneco`) foi dispensada porque os personagens agora são modelos GLB animados; o coveiro de teste no cemitério também ficou de fora.
  - **Decidido pela IA (o Heitor revisa):** o viajante reaproveita o modelo do taverneiro, porque os outros GLBs são de inimigos ou do jogador e confundiriam quem é hostil; o NPC declara `modelo` em vez de `personagem` e `pose`; não há faixa de texto nova (a fala usa o aviso do HUD); as falas são minhas e sombrias de propósito.
  - Save, IDs e `Toque.js` não mudaram; sem assets. `npm test` (89) e `npm run build` passam; o teste de navegador não foi rodado (ver o NPC no jogo real fica para o Gabriel testar pelo link).

- **E1: equilíbrio por simulação (pronto; o resto da Etapa E precisa de gente jogando).** Simulador em `tests/equilibrio.mjs` (`node tests/equilibrio.mjs`, uns 3 s; usa Jogador e Inimigos de verdade, passo de 1/60 s, sementes 1 a 60, 60 lutas por cenário) e teste rápido `tests/equilibrio.test.js` (8 lutas). Três jogadores simulados: **spam** (só o leve a cada 0,08 s, sem frasco), **hábil** (reação de 0,15 a 0,25 s, apara no meio da janela com erro de 0,045 s, pula a rasteira, quickstep no inaparável, visceral depois do parry) e **esquiva** (quickstep em todo golpe e bate). Só números em `src/config.js`:
  - `combate.leve.custo` 14 → 18; `combate.rally.porDano` 0,35 → 0,25; `inimigos.penitente.dano` 19 → 24; `inimigos.cacador.dano` 13 → 16; `inimigos.cacador.vida` 62 → 70. Guardião, janelas do parry, fichas e firmeza não mudaram. 2 rodadas de 3.
  - **Spam vence (antes → depois):** Guardião 70% → 7%; 2 cavaleiros 73% → 15%; 3 cavaleiros 32% → 0%; 3 mistos 70% → 13%. (Conferido com 200 lutas: 14%, 16%, 1%, 14%; a meta era no máximo 20% e 25%.) **Hábil:** 100%, 98%, 95%, 100% (era 100%, 98%, 95%, 98%). **Esquiva:** 100%, 100%, 97%, 95%.
  - O "antes" do simulador novo (Guardião 70%) não é o 58/60 antigo: a rotina antiga não foi guardada, então só vale comparar dentro do mesmo simulador. Premissas completas e tabela na spec 08, seção "E1".
  - **Decidido pela IA (o Heitor revisa):** a escolha das alavancas (estamina do leve mais cara, rally menor, dano dos comuns maior, caçador com mais vida) em vez de mexer no Guardião; o jogador hábil simulado é muito bom (sabe o instante do golpe, com erro pequeno), então a margem de "vencer mais da metade" ficou folgada: **sentir jogando** se o Guardião ficou duro para quem ainda aprende o parry. A pausa de impacto (hit stop) não entra na simulação.

- **Etapa D: golpe pelas costas e pulo contra rasteira (pronto).** Spec 09. Números em `CONFIG.combate.furtividade`, `costas`, `pisada` e `danoExtraNoAr`; regras puras em `src/entidades/Furtividade.js`:
  - **Z agacha** (anda a 45%, pose baixa; atacar, esquivar, atirar ou apanhar levantam; funciona na primeira pessoa e com mira travada). O inimigo percebe pelo cone de visão e pelo barulho (agachado quase não se ouve). **Em pé a percepção é a de antes** (um teste compara as duas regras); a única diferença é que correr pelas costas agora é ouvido a 7 m (antes 5). Quando um inimigo percebe o caçador, leva tiro ou apanha patrulhando, os vizinhos a até 10 m passam a perseguir após 0,4 s.
  - **Golpe pelas costas:** inimigo comum ainda sem perceber, caçador no cone de 60° atrás dele a até 1,6 m, aperta o ataque: execução silenciosa (letal, sem pausa nem tremor, sem alertar vizinhos, rally cheio, texto discreto "PELAS COSTAS"). Não vale no Guardião.
  - **Pisada:** pular a rasteira e cair a até 1,8 m do atacante em 0,8 s pisa nele (1,5× o leve, desequilibra 1,2 s e abre o visceral, o caçador quica). **Pular contra golpe alto** leva ×1,5 de dano (só um custo, sem aviso).
  - **Decidido pela IA (o Heitor revisa):** o golpe pelas costas não exige estar agachado, só inimigo comum patrulhando (agachado é só mais fácil de chegar); o golpe mantém o agachamento; quem foi alertado não alerta outros e o Guardião não alerta nem é alertado; a pisada vale também no Guardião; o dano extra no ar vale só para o tipo `alto` (inclui as varridas laterais do Guardião); agachado, Espaço não faz nada e beber o frasco não levanta o caçador; o cone de 100° e a `visaoNoEscuro` só valem para quem está agachado. Mais detalhes na seção "Decidido pela IA" da spec 09.
  - Save, IDs e `Toque.js` não mudaram; sem assets. `npm test` (80) e `npm run build` passam; o teste de navegador não foi rodado (o Gabriel testa pelo link publicado).

- **Personagens de fantasia sombria escolhidos pelo Gabriel.** Witch Hunter
  é o caçador jogável em terceira pessoa e Scary Doctor é o taverneiro.
  Terrifying Hooded Horror Woman aparece nas patrulhas rápidas da vila e
  Dark Knight é o visual do Guardião do Véu. Os quatro modelos foram
  reexportados em GLB com texturas de até 1K. Witch Hunter e Dark Knight
  receberam esqueletos para reaproveitar caminhadas, esquivas e ataques
  do PUGNA. O chefe usa a lâmina e o escudo da malha escolhida e mantém
  as duas fases, o alcance e a derrota gravada nos saves. O modelo do
  arquivo `dark-souls.zip`, identificado como Soul of Cinder na página
  do Sketchfab, ocupa as patrulhas de cavaleiros da vila. A publicação
  desse modelo foi confirmada pelo Gabriel. As duas variantes usam
  as rotas, colisores e valores das patrulhas existentes. Os seis
  modelos anteriores foram removidos. As encapuzadas reaproveitam a
  corrida original e executam os ataques com as mãos nas janelas do
  combate do PUGNA.

- **Vestígios da Romaria e personagens importados.** Os seis tipos de
  personagem agora usam modelos com esqueleto do Quaternius e do KayKit.
  As armas e poses do PUGNA acompanham os ossos, inclusive os avisos de
  golpe dos inimigos. A taverna recebeu provisões na fachada, pratos,
  garrafas e panelas no salão. A Estrada do Sul ganhou um embarcadouro,
  barco, rochas com musgo e reflexos animados na água. O adro, a fachada,
  as alas e o santuário da Catedral ganharam oferendas, panos e livros.
  Os adereços maiores ficam fora dos corredores e dos pontos de interação.

- **Expansão do vilarejo e da Catedral:** o mapa da vila passou de 94 ×
  155 m para 132 × 184 m, com o Bairro dos Estábulos, Largo da Romaria e
  Caminho das Urnas fechando o percurso lateral. A Catedral passou de
  44 × 42 m para 70 × 42 m, com duas entradas para cada ala nova. Modelos
  importados substituem boa parte da arquitetura e dos adereços. A
  Capela do Último Nome e o Arquivo das Vigílias são opcionais e a
  progressão publicada continua usando os mesmos checkpoints e selos.

- **Vilarejo e Catedral redesenhados:** em cima de `66edae4`, o caminho sul
  passa pelo arco de triagem e bifurca entre a rua do poço e o mercado. A
  Catedral ganhou um circuito a oeste pela Galeria dos Nomes, bancos
  redistribuídos e o estrado do coro. A grade do Santuário ainda pede os dois
  selos. A história do segundo toque, dos ossos e dos nomes liga os novos
  documentos às lápides e aos registros que já estavam no jogo. IDs e
  checkpoints publicados foram mantidos.

- **Quarto incremento gráfico:** em cima de `4470b28`, o vilarejo tem bruma
  violeta, a estrada tem névoa azul-esverdeada mais baixa, a catedral ganhou
  feixes de vitral e a taverna ganhou luz mais quente e fagulhas. Os perfis em
  `CONFIG.areas` funcionam em PS1 e HD. Névoa e fundo interpolam por 0,6 s em
  portais, com transição do céu entre exteriores. Este incremento cobre a parte
  visual de S5. As camadas de som ambiente da spec 04 seguem na fila.

- **Primeira pessoa opcional** a pedido de Gabriel. A câmera fica nos olhos e
  acompanha a altura do marcador na mira travada. Espada e pistola têm poses em
  uma cena de sobreposição. Sem trava, a direção do ataque segue o olhar
  horizontal. Perspectiva e gráfico são independentes e salvos como preferências.
  Regras de alcance, dano, colisões, progressão e controles de toque seguem as
  implementações atuais.

- **Terceiro incremento gráfico:** em cima de `c2f882b`, o caçador, os quatro
  tipos de inimigo e o taverneiro ganharam malhas facetadas. Couro, lã e metal
  têm variantes PBR no HD. As malhas usam os pivôs já existentes; a cor de aviso
  de golpe continua ligada à animação. A spec de NPCs (S4) segue na fila.

- **Segundo incremento gráfico:** em cima de `44afba9`, casas e fachada da
  taverna ganharam beirais, molduras e ferragens com nível de detalhe por
  distância. A catedral ganhou nervuras na rosácea, a estrada ganhou
  correnteza visível e a taverna ganhou uma moldura de pedra na lareira.
  Os quatro cenários agora usam sombras de contato estáticas. Telhas e lajes
  de ardósia têm conjuntos PBR próprios no HD. Veja o
  [guia gráfico](docs/reconstrucao-grafica.md) para comparar os dois modos.

- **Primeiro incremento da reconstrução gráfica:** após S7 (`2d87986`), o HD
  ganhou materiais PBR de pedra, terra, calçamento e madeira nas quatro áreas.
  O PS1 e o HD ganharam barris remodelados e o tapete ornamentado da taverna.
  A resolução HD tem presets de 720p a 2160p, com 720p como padrão. O manual
  [Reconstrução gráfica](docs/reconstrucao-grafica.md) registra como testar e
  o trabalho de Blender para o Heitor. O relato de S2 abaixo descreve a entrega original.

- **Pronto e no ar:** vilarejo, Catedral do Véu (nave, Ossário, Relicário, Santuário, selos), inimigos cavaleiro, caçador e Penitente, miniboss Guardião do Véu, bolsa e frascos de cura, lápides, atalhos, menu de configurações, trilha sonora, terceira pessoa, mira travada, parry com a pistola, crítico, visceral, execução, ataque forte carregado, rolamento e quickstep. Estado mais recente: **S7 pronto** (a bolsa aberta durante a luta deixa livre o canto das barras; só CSS). Antes: S3 (estrada e taverna). Antes dele, S2 (botão de gráfico PS1 / HD em Configurações). Antes dele, a Etapa C ficou completa com o PR C3.
- **Salvamento estilo Souls (item 1, pronto):** o jogo grava sozinho a cada acontecimento e não há salvar manual. O **Osso de Retorno** é usado pela bolsa, é único e de uso ilimitado. Hoje não há penalidade ao usar.
- **Base dos ataques (item 2, pronto):** todos os inimigos usam a mesma máquina de golpes (`src/entidades/Ataques.js`), com 3 fases (preparo, golpe ativo, recuperação) e 3 tipos, cada um com pose, cor e som próprios: **alto**, **pesado** (vermelho, sino grave) e **rasteira** (agachado, amarelo). As sequências de cada inimigo ficam em `CONFIG.inimigos` (`ataques`) e os números de cada tipo em `CONFIG.combate.ataquesInimigos`. A rasteira é larga, não pode ser aparada nem bloqueada e passa por baixo de quem está no ar.
- **Celular congelado (item 0, pronto):** aviso na tela inicial e ao começar em aparelho de toque, teste do celular fora dos obrigatórios, código de toque guardado.
- **Etapa A, contra o spam (pronta).** Todos os números estão em `CONFIG.combate`, com comentários:
  - **Apanhar interrompe o caçador** (`interrupcao`): o ataque leve é cortado em qualquer momento e ele cambaleia 0,4 s. O ataque forte só aguenta um golpe fraco (até 20 de dano) da metade do preparo até o fim da passagem da lâmina. Trocar golpe não compensa mais.
  - **Firmeza dos inimigos** (`atordoamentoInimigo`): depois de cambalear, o inimigo ganha um "fôlego" em que não cambaleia de novo (só o golpe crítico passa por cima). O caçador corrompido cambaleia 0,4 s e aguenta 1,8 s, então não dá mais para travá-lo até a morte: ele revida. O golpe pesado aguenta o ataque leve durante o aviso e o golpe (`aguentaLeve`).
  - **Inimigos não recuam mais só por apanhar:** o empurrão só vale inteiro quando o golpe faz cambalear. Nos outros casos sobra 12% dele (`empurraoFirme`).
  - **Rally** (`rally`): 70% do dano recebido fica recuperável por 4 s e aparece em laranja na barra de vida. Cada acerto devolve 0,35 de vida por ponto de dano causado (o leve devolve quase 8, o forte 20). Dano bloqueado não gera rally.
  - **Frasco com tempo** (`frasco`): 0,6 s bebendo, andando a 35% da velocidade, sem atacar nem pular. Se apanhar antes do fim, a cura é interrompida e o frasco não é gasto (dá para mudar em `perdeAoSerInterrompido`).
  - **A bolsa não pausa mais:** só o Esc pausa. Com a bolsa ou uma anotação aberta durante a partida, o mundo continua, o caçador fica parado e as barras continuam na tela. I ou "Voltar" retomam a luta; Esc leva à pausa. Pelo menu de pausa, a bolsa continua abrindo com o jogo parado.
  - **O que a simulação mostrou (um jogador que só aperta o ataque leve):** os inimigos agora revidam e interrompem. Contra os inimigos comuns o spam ainda vence, mas apanhando. Contra o Guardião ele perde por volta de metade da vida e às vezes morre. Fechar essa conta depende de ajuste de números (Etapa E) e do chefe novo (Etapa C).
- **Etapa B, PR B1: pistola, parry e balas (pronto).** Números em `CONFIG.combate.pistola`, com comentários:
  - **Clique direito ou C atiram.** O tiro sai na hora, de curto alcance (9 m), sem bala voando: vai no alvo da mira travada ou, sem trava, no inimigo mais próximo à frente. Parede no meio segura o tiro. Não gasta estamina; tem 0,3 s de recuperação (a esquiva corta depois de 0,1 s). Dá para atirar no ar.
  - **Parry:** o tiro conta se pegar o inimigo nos últimos 0,09 s do aviso ou nos primeiros 0,04 s do golpe, multiplicados pelo `janelaAparar` do tipo: uns 0,13 s no alto e 0,08 s no pesado (`janelaAparar` do pesado foi de 0,55 para 0,6). A regra fica em `MaquinaDeAtaque.naJanelaDeAparo` (`Ataques.js`), presa à fase do golpe do inimigo. Aparou: o golpe não entra, o inimigo fica desequilibrado 1,9 s (o Guardião, 1,15 s) e o próximo golpe é crítico. Fora da janela o tiro só arranha (6 de dano, não faz cambalear nem gasta o desequilíbrio). A rasteira nunca é aparada: o tiro gasta a bala e o jogo avisa "pule".
  - **Balas:** 8. Todo tiro gasta uma, acertando ou errando (é o anti-spam). Voltam ao descansar na lanterna, ao renascer e com o Osso. Não vão para o save (recarregar a página já renasce na lanterna com as balas cheias); o formato do save não mudou. Contador discreto acima dos frascos.
  - **Saíram:** o bloqueio (clique direito segurado), o aparo com C e o broquel do boneco, que agora carrega uma pistola de caixas e estica o braço com coice ao atirar. Sons novos sintetizados: estampido com eco e clique seco sem bala.
  - **Celular:** `Toque.js` e os botões de toque não mudaram. O `npm run test:celular` (opcional) agora falha porque ainda espera o bloqueio com o botão "Bloquear"; ficou registrado e não foi consertado. Os botões "Aparar" (C) e "Bloquear" (clique direito) do celular passam a atirar.
  - **Decidido pela IA (o Heitor revisa):** a proteção depois do parry (0,25 s) virou `pistola.invencivel` no config; o tiro na rasteira só dá o aviso "pule" durante o aviso e o golpe dela (não na recuperação); o tiro escolhe só inimigos visíveis, a até 1,6 m de desnível; quem patrulha e leva tiro passa a perseguir; apanhar durante a recuperação do tiro não faz cambalear (como quando está livre); o contador de balas some no modo de toque; o contador fica acima dos frascos, sempre visível, e fica apagado com 0 balas.
- **Etapa B, PR B2: visceral, execução e ataque forte carregado (pronto).** Números em `CONFIG.combate.visceral`, `execucao` e `carga`, com comentários:
  - **Visceral:** ao começar um ataque (leve ou forte), se houver um inimigo desequilibrado a até 2,3 m, à frente do caçador, sem parede no meio e com o caçador à frente dele, o ataque vira visceral. Não gasta estamina. Dura 0,7 s, com o caçador invencível o tempo todo, colado no inimigo e virado para ele; o inimigo fica preso no desequilíbrio até a lâmina entrar (aos 0,25 s). Dano de 3,5× o leve (77), pausa e tremor de tela, empurrão forte, e o inimigo sai cambaleando. Devolve **toda** a vida laranja (rally cheio, via `recuperarComGolpe(Infinity)`). Aparece "VISCERAL"; som de impacto grave com sino.
  - **Execução:** se o golpe aparado era pesado (`inimigo.abertoParaExecucao`), o visceral vira execução: 5× o leve (110), pausa e tremor maiores, "EXECUÇÃO" na tela e um som mais grave e mais longo.
  - **Crítico comum preservado:** bater no inimigo desequilibrado de lado ou de longe continua sendo o crítico de 2,6×.
  - **Ataque forte carregado:** o dano cresce com a carga, de 1× (soltar logo que vira forte) até 1,6× (carga máxima). Carga completa (95% ou mais) acertando **pelas costas** desequilibra o inimigo (`Inimigo.desequilibrar()`, extraído do `serAparado`, sem execução) e abre o visceral, que então vale por trás.
  - Código: `Jogador.alvoDoVisceral`, `iniciarVisceral` e `golpeVisceral` (ação `'visceral'`), `Inimigo.receberVisceral` (emite `golpe:visceral { execucao }`) e `Inimigo.desequilibrar`. Pose de estocada no `Boneco.js`. Save não mudou; `Toque.js` não mudou.
  - **Decidido pela IA (o Heitor revisa):** o visceral exige o inimigo num cone de 60° à frente do caçador e o caçador num cone de 60° à frente do inimigo (`visceral.abertura`); aberto pelas costas, vale o mesmo cone atrás dele; o caçador desliza até 1,15 m do inimigo durante o golpe (`visceral.encosta`); o empurrão do visceral é 7 (`visceral.empurrao`); o forte carregado num inimigo que já estava desequilibrado é só o crítico (não reabre o desequilíbrio, para não virar ciclo infinito); "carga completa" e "pelas costas" ficaram em `carga.completa` e `carga.costas`; o empurrão do forte pelas costas joga o inimigo para longe, então é preciso dar um passo para o visceral.
- **Etapa B, PR B3: quickstep (pronto).** Números em `CONFIG.combate.quickstep` (custo 14, duração 0,2 s, invencível 0,13 s, velocidade 11, espera 0,12 s):
  - Com a mira travada, a esquiva vira um **passo curto** na direção apertada (parado: para trás), sem rolar e sem virar o corpo: o caçador continua encarando o alvo. Pose de passo baixo no `Boneco.js` e zunido mais curto. O evento é `jogador:esquiva { quickstep: true }` (o rolamento manda `{ quickstep: false }`).
  - Sem mira, continua o rolamento, agora com invencibilidade de 0,22 s (era 0,26).
  - Código: `Jogador.quickstep` (escolhe o bloco `quickstep` ou `esquiva`). Save não mudou; `Toque.js` não mudou.
  - **Decidido pela IA (o Heitor revisa):** o quickstep não vira o corpo para a direção do passo (fica de frente para o alvo); o "parado: para trás" é para trás do corpo (que já encara o alvo); a duração do zunido do quickstep é a própria `quickstep.duracao`; a esquiva que já estava na fila usa o bloco da hora em que sai (com ou sem mira naquele instante).
- **Etapa C, PR C1: imprevisibilidade (pronto).** Números em `CONFIG.combate.imprevisibilidade` e nas sequências de `CONFIG.inimigos`:
  - **Variação do aviso:** cada golpe sorteia o preparo entre −12% e +12% (`variacaoPreparo`), nunca abaixo do `preparoMin` do tipo. Código: `montarGolpe(cfg, entrada, sorteio)` em `Ataques.js`; o inimigo passa o seu `this.sorteio`.
  - **Golpe atrasado:** um golpe da sequência escrito como `{ tipo: 'pesado', atraso: 0.35 }` ergue a arma no tempo normal (`subida`) e **segura** a pose pelo atraso antes de bater. O atraso soma ao `preparo`, então a janela do parry continua presa ao fim do aviso inteiro. O aviso sonoro toca no começo, igual, e o ronco do pesado dura só a subida: o som não entrega o atraso.
  - **Sequências novas:** cavaleiro `alto + pesado(atraso)`; caçador `alto + alto + rasteira`; penitente `alto + alto(atraso) + pesado`. As rasteiras subiram ~50% de peso (cavaleiro 2→3, caçador e penitente 1→1,5, Guardião na fase normal 1→1,5).
  - **Nenhuma sequência sai três vezes seguidas** (`sortearSequencia` recebe também a penúltima). A regra antiga continua: uma sequência especial não sai duas vezes seguidas.
  - Save não mudou; `Toque.js` não mudou; sem assets novos.
  - **Decidido pela IA (o Heitor revisa):** peso 2 para cada sequência nova; o atraso de 0,35 s fica escrito na própria sequência (não há um valor padrão no `combate`); a variação vale também para o Guardião (inclusive a fase final, que ainda não mudou); o brilho do aviso para de acelerar quando a pose chega ao alto e fica aceso durante o atraso; numa emenda de golpes o adiantamento só come a subida, nunca o atraso.
- **Etapa C, PR C2: fase final do Guardião (pronto).** Números em `CONFIG.inimigos.guardiao.faseFinal` e `CONFIG.combate.avisosInimigos`:
  - **Golpe que sobrescreve o tipo:** um golpe da sequência pode trocar qualquer campo do tipo, por exemplo `{ tipo: 'pesado', aparavel: false, aviso: 'inaparavel' }` (`montarGolpe` em `Ataques.js`). Um aviso com nome vira a cor de `combate.avisosInimigos` e fica em `golpe.nomeAviso`.
  - **Aviso próprio do inaparável:** arma e olhos branco-violeta e um sino grave duplo tocado "ao contrário" (cresce e corta). Sem texto de tutorial.
  - **Tiro no inaparável:** gasta a bala, só arranha (6) e emite `jogador:resposta-errada` com `aviso: 'inaparavel'`; o HUD só mostra o texto "Pule" para a rasteira comum. A resposta certa é a esquiva ou o quickstep.
  - **Sequências da fase final:** varrida dupla inaparável (lados +1 e −1) peso 3, pesado inaparável com atraso de 0,35 s peso 2, rasteira + alto peso 2, alto + alto peso 2: 5 de 9 do peso não podem ser aparados.
  - **Virada de fase:** rugido (som sintetizado), 1 s de invencibilidade (golpe, tiro e visceral não tiram vida) num estado novo `virada`, e ele se afasta 1,2 m do jogador (`faseFinal.virada`). O `desequilibrio` da fase final caiu de 1,15 s para 0,9 s.
  - `eventoDeDerrota`, IDs e formato do save não mudaram; `Toque.js` não mudou; sem assets novos.
  - **Decidido pela IA (o Heitor revisa):** a cor branco-violeta é `0xd9c8ff`; o passo para trás é de 1,2 m (um empurrão que some sozinho); durante a virada o Guardião fica de braços abertos encarando o jogador e não ataca; o dano que causa a virada entra inteiro, mas não faz cambalear; o golpe inaparável mantém a pose do tipo (lateral ou pesado), só a cor e o som mudam; o `tests/catedral.mjs` agora espera a virada acabar antes de testar o golpe da fase final (o passo para trás deixava o jogador fora do alcance).
- **Etapa C, PR C3: pressão em grupo e punição do frasco (pronto).** Números em `CONFIG.combate.grupo` e `CONFIG.combate.punirFrasco`:
  - **Fichas de ataque** (`src/entidades/Fichas.js`, regras puras: `pedir`, `devolver`, `limpar`): no máximo 2 inimigos comuns atacam ao mesmo tempo (`atacantesSimultaneos`). Quem chega a 4,5 m do caçador (`distanciaDeEspera`) pede uma ficha; sem ficha, fica rondando nessa distância, andando de lado e encarando. A ficha volta quando a sequência termina e quando ele cambaleia, é aparado ou morre (qualquer saída das fases de ataque, em `Inimigo.mudar`). O Guardião tem `chefe: true` e não usa ficha. O `Jogo.js` cria um conjunto por área (`area.fichas`) e limpa em `ativarArea` e `reporInimigos`.
  - **Punir o frasco:** ao ouvir `jogador:bebendo`, cada inimigo da área ativa que está em combate e livre (perseguindo ou recuando), a até 7 m, sorteia a chance de 80%; depois de 0,15 s, se ainda estiver livre e conseguir a ficha, começa a sequência com o aviso mais curto e avança durante o aviso até o alcance. O Guardião tem `punirFrasco: { chance: 1 }` e pune sempre.
  - Save não mudou; `Toque.js` não mudou; sem assets novos; sem som novo (o aviso do golpe já toca).
  - **Simulação "só aperta o ataque leve"** (mesma rotina do teste da Etapa A: aperta o leve a cada 0,08 s, com a ajuda de mira, numa arena vazia; 60 lutas por cenário, depois do C3): contra o **Guardião** venceu 58 de 60, terminando com mediana de 32 de vida (mínimo 9); contra **dois cavaleiros** venceu 49 de 60, com mediana de 75 de vida (13 das 49 vitórias com menos de 50); contra dois caçadores venceu 60 de 60 (mediana 76) e contra dois penitentes 60 de 60 (mediana 89). Contra três cavaleiros o C3 ajuda o spam: antes venceu 2 de 40, agora 12 de 40, porque só dois atacam por vez. **O resultado não bate com a spec** (que pedia perder para o Guardião e sair com menos de metade da vida contra dois comuns). O motivo: o C3 não muda nada nesses dois cenários. O spam não bebe frasco (então a punição não entra) e, com só dois inimigos, as fichas não limitam ninguém. Antes do C3 (com o C2) os números já eram os mesmos (Guardião: venceu 36 de 40, mediana 30 de vida). Os números não foram ajustados às cegas: fechar essa conta é trabalho de ajuste (Etapa E), por exemplo mais dano ou menos vida do Guardião, ou o pesado dele aguentando mais o leve. A rotina está descrita aqui para ser repetida; ela não ficou nos testes.
  - **Decidido pela IA (o Heitor revisa):** a ficha é pedida ao chegar a 4,5 m (não só no instante do golpe), para quem está sem ficha já parar ali e rondar; quem ronda só volta a correr atrás quando o caçador passa de 4,5 + 1 m (`grupo.folga`, número novo); quem esperava há mais tempo leva a ficha que volta (fila), para o terceiro não ficar de fora para sempre; o lado da ronda é sorteado quando o inimigo renasce e não muda; "em combate e livre" é estar perseguindo ou recuando; a distância e a chance são conferidas ao ouvir o gole e o "livre" de novo na hora de reagir; a "sequência mais rápida" é a de primeiro golpe com menor aviso (sem a variação; empate, a primeira da lista): o cavaleiro e o Guardião (fase normal) usam o alto sozinho, o caçador e o penitente o alto + alto e o Guardião na fase final a varrida dupla inaparável; o golpe da punição não é mais rápido que o normal, só começa na hora e o inimigo anda na velocidade de perseguição durante o aviso; quem não consegue ficha não pune; o chefe é marcado com `chefe: true` no config.
- **S2: botão de gráfico PS1 / HD (pronto).** Spec 02. Números em `CONFIG.render.estilos` (`ps1` e `hd`):
  - Em Configurações (tela inicial e pausa) há a opção **Gráfico**: **PS1** (padrão, idêntico ao de antes) ou **HD** (até 720 linhas, sem pontilhado nem redução de cores, sem tremida, texturas suavizadas, saturação 1,15 e contraste 1,08). Troca na hora, sem recarregar.
  - No HD, "Pixelização" e "Tremor dos vértices" ficam cinza e desativados; os valores do PS1 continuam guardados e voltam ao trocar.
  - A escolha é a preferência `estiloGrafico` na chave de preferências (`pugna-preferencias-v1`), não no progresso: persiste ao recarregar e "Apagar progresso" não a apaga. Preferência antiga sem o campo (ou com valor desconhecido) vira `'ps1'`. Formato do save de progresso não mudou.
  - Código: `RenderizadorRetro.definirEstilo(nome)` troca a resolução interna e os uniformes (mesmo renderizador); `texturas.js` ganhou `registrarTextura` e `definirFiltroTexturas` (Nearest ↔ Linear nas texturas já criadas, guardando o filtro original do PS1); o shader só aplica saturação/contraste quando são diferentes de 1 e só reduz cores quando `niveisDeCor` > 0, então o PS1 faz exatamente as mesmas contas de antes. `Toque.js` não mudou; sem assets novos.
  - A primeira pessoa entrou em uma entrega posterior como opção de câmera.
  - **Desempenho:** o `npm run test:browser` (em PS1) levou 22 s, igual aos 23 s de antes. Forçando o HD no teste inteiro levou 49 s, mas o teste usa renderização por software (SwiftShader, sem placa de vídeo), em que o custo cresce com o número de pixels; num PC com placa de vídeo a diferença deve ser pequena. Vale o Heitor sentir jogando.
  - **Decidido pela IA (o Heitor revisa):** os valores do PS1 saíram do topo de `CONFIG.render` e foram para `estilos.ps1` (`alturaInterna` continua sendo a pixelização padrão); no HD a imagem interna nunca passa da altura da janela (numa janela de 650 px ficam 650 linhas, não 720); o nome no menu é "PS1 (retrô)" e "HD", logo antes de "Pixelização"; a vinheta e o leve contraste de sempre continuam no HD; a placa de texto e o chão clonado do vilarejo também seguem o filtro; valor desconhecido de `estiloGrafico` vira PS1.
- **S3: estrada e taverna (pronto).** Spec 01. Números em `CONFIG.areas.estrada` e `CONFIG.areas.taverna`; código em `src/mundo/Estrada.js` e `Taverna.js`, mais duas linhas em `areas.js`:
  - **Estrada** (`estrada`, `usaCeu: true`, `luzJogador` 5): faixa de 30 × 120 m que corre de norte a sul, com terra batida de 8 m, cercas (paredes invisíveis para não sair), árvores secas, riacho com ponte de pedra (degraus de 0,15 e 0,3 m, dá para andar), três patrulhas (caçador, cavaleiro, caçador) e a ponta sul fechada por carroça tombada com a placa "Em obras". O Portão Sul do vilarejo virou portal (`E — sair pelo Portão Sul`, em `Vilarejo.js`, sem mexer na posição de nascer) e a chegada da estrada fica logo dentro do portão. Na ponta norte da estrada há o portão visto de fora (`E — voltar ao vilarejo`).
  - **Fachada da taverna** na estrada (peça `casa` de `pecas.js` ganhou `todasAcesas`, `xPorta` e `chamine`, sem mudar as casas do vilarejo): janelas acesas, porta com moldura e alpendre, placa pendurada legível dos dois lados, chaminé com 5 sprites de fumaça e luz quente. Porta com portal `E — entrar na taverna`. Lanterna **`taverna-da-estrada`** (nome "Taverna da Estrada") a uns 5 m da porta; ela renasce olhando para a taverna.
  - **Taverna** (`taverna`, `usaCeu: false`, `luzJogador` 3): salão de 12 × 9 m, névoa `0x2b1a12` com densidade 0,03, balcão fechado, prateleiras, 3 mesas com velas, 3 barris, escada decorativa na parede oeste, lareira com luz de 38 de intensidade que tremula (usa `animarTochas`) e um lampião fraco no teto. Piso com `depthWrite: false` e ordem fixa (`planoDeChao` em `pecas.js`, o mesmo esquema do vilarejo). O teto só aparece visto de baixo: com a câmera alta o salão fica à mostra.
  - **Bilhete da mesa:** evento `taverna:bilhete-da-mesa`, anotação em `Inventario.js` (aparece na bolsa como as outras). **Taverneiro:** boneco parado atrás do balcão, com `E — falar com o taverneiro`; 4 falas em rodízio (`CONFIG.areas.taverna.taverneiro.falas`). Sem loja, sem `Npc.js`.
  - Save, IDs antigos e `Toque.js` não mudaram. Sem assets (tudo sintetizado). A trilha ainda toca a faixa do vilarejo na estrada e na taverna (a spec 04 cuida do som).
  - **Testes:** `tests/areas.test.js` monta as quatro áreas de verdade (com um `document` de mentira, sem WebGL) e confere contrato, portais e chegadas, estrada aberta até a carroça, lanterna, bilhete e falas. `tests/catedral.mjs` ganhou um trecho `validarEstradaETaverna` (atravessa os dois portais, lê o bilhete, fala, descansa e recarrega), **escrito mas não rodado** (o dono não tem placa de vídeo e o navegador de teste foi dispensado neste PR). Convém rodar `npm run test:browser` numa máquina com navegador antes de integrar.
  - **Decidido pela IA (o Heitor revisa):** a estrada corre no eixo Z (norte-sul) para continuar o Portão Sul, com limites de 30 × 120 m (x de -18 a 12); a taverna fica do lado oeste da pista, com os fundos na cerca; o portal do vilarejo fica em z = 55,4 (raio 1,6) e a chegada em z = 52,6, para nascer no vilarejo não acender o aviso; o taverneiro **não** usa a classe `Boneco` (ela já traz chapéu, capa e armas): é um boneco simples de caixas, com avental e barba, polindo uma caneca; **o `Jogo.js` ganhou 1 linha** (ação `'falar'` em `interacaoObjeto`, prompt `E — falar com …` e a fala via `hud.avisar`), porque o sistema de anotações só sabe mostrar `E — ler:` e persiste o evento; as falas, o texto do bilhete e a placa "Em obras" são minhas e secas de propósito; luz do jogador 5 na estrada e 3 na taverna; a fala some sozinha em 4 s e não é salva; três patrulhas (caçador, cavaleiro, caçador), nenhuma perto da lanterna; a música continua a do vilarejo nas áreas novas.
- **Ganchos deixados:** `inimigo.abertoParaExecucao` (já usado pela execução do B2) e `inimigo.desequilibrar()` (abre o visceral sem execução; serve ao golpe pelas costas da Etapa D). O aviso `jogador:pulou-golpe` sai quando o jogador pula uma rasteira (Etapa D). `jogador.recuperarComGolpe(dano)` é o ponto de entrada do rally (`Infinity` = rally cheio, usado pelo visceral). `Jogador.receberDano` recebe os dados do golpe (`aparavel`, `bloqueavel`, `evitaPulando`...).
- **Infra:** `jogar.bat` com atualização automática, `atualizar.bat`, e regra de integração automática no `AGENTS.md` com o `CLAUDE.md` apontando para ele.
- **Specs (pronto):** `docs/specs/` tem uma página por tarefa futura (00 a 08), com objetivo, arquivos, critérios de aceite e modelo de IA recomendado. A ordem está na "Fila do Gabriel".
- **Contrato de área (pronto):** `src/mundo/areas.js` tem o registro das áreas, e cada área declara `luzJogador` e `usaCeu`. Área nova não exige mexer no `Jogo.js`.
- **A conferir:** origem das 4 músicas (o repositório é público). Os números da Etapa A são um primeiro chute e precisam ser sentidos jogando.
- **Pendente para o Heitor decidir:** a penalidade ao morrer (como as almas e os ecos de sangue; ela casa com o rally) e a penalidade do Osso de Retorno. Até lá, morrer e usar o osso não custam nada.

## Plano (fazer um por vez, cada um num chat novo)

O pedido atual prioriza acabamento das áreas existentes antes de expandir
o mapa. A [auditoria](docs/auditoria-visual.md#acabamento-das-áreas-existentes)
registra o que falta e a ordem sugerida.

- [x] **Polimento 1:** bancos e vitrais da Catedral.
- [x] **Polimento 2:** pedra, piso e luz da nave e do transepto, com leitura clara do corredor.
- [x] **Polimento 3:** materiais, iluminação e mobiliário do Ossário e do Relicário.
- [x] **Polimento 4:** melhorar a leitura da galeria, das passarelas e das escadas existentes.
- [x] **Polimento 5:** detalhar a Sala do Bronze e a Cripta das Urnas.
- [x] **Polimento 6:** refinar o Coro e a Abside, incluindo o entorno do altar.
- [x] **Polimento 7:** detalhar o Claustro e a Sacristia, incluindo os atalhos existentes.
- [x] **Polimento 8:** detalhar a Capela do Último Nome e o Arquivo das Vigílias.
- [x] **Polimento 9:** detalhar as mesas, os registros e a iluminação do Refeitório e do Cabido.
- [ ] **Polimento 10:** revisar a leitura e o desempenho do percurso completo da Catedral.
- [ ] Aplicar o padrão visual aos demais ambientes já jogáveis.

- [x] **Prompt 8 / 1A:** kit modular e planta maior do térreo.
- [x] **Prompt 8 / 1B:** galeria, torre, cripta, escadas e atalhos.
- [x] **Prompt 8 / 1C:** história das salas, clima e visibilidade.
- [x] **Prompt 8 / 2:** névoa exterior e profundidade visual.
- [x] **Prompt 8 / 3:** floresta maior e pontos narrativos.
- [x] **Prompt 8 / 4:** progressão com chave, armas e itens.

- [x] **1. Salvamento estilo Souls + Osso de Retorno** (ver "Decisões")
- [x] **2. Base dos ataques:** máquina de estados única para todos os inimigos humanos, com 3 fases e 3 tipos de golpe, aviso visual e sonoro por tipo.
- [x] **0. Congelar o celular** (ver "Decisões")
- [x] **A. Contra o spam (a base do Bloodborne):**
  - Apanhar interrompe o ataque leve do caçador. A parte final do ataque forte aguenta um golpe fraco.
  - Firmeza dos inimigos: não podem ser atordoados de novo por um tempo. Alguns golpes inimigos não são interrompidos (o inimigo aguenta o golpe e revida).
  - Rally: parte do dano recebido fica recuperável por alguns segundos. Cada acerto devolve uma fração dela. Aparece na barra de vida, em outra cor.
  - Frasco com tempo: uns 0,6 s de animação, andando devagar, e a cura é interrompida se o caçador apanhar.
  - Abrir a bolsa não pausa mais o jogo. Só o Esc pausa.
  - Inimigos param de recuar sozinhos só porque estão apanhando.
- [x] **B. Pistola, visceral e quickstep** (B1, B2 e B3 feitos):
  - Tiro instantâneo de curto alcance, sem bala voando. Conta como parry se acertar o inimigo num trecho do aviso dele ou no começo do golpe. Usar a máquina de golpes de `Ataques.js` para saber a fase: a janela fica presa à animação do inimigo, como no Bloodborne. A rasteira não pode ser aparada. O parry e o bloqueio do broquel saem aqui.
  - Munição limitada (balas), recuperada ao descansar na lanterna. Ideia do Bloodborne a considerar: gastar vida para fazer balas. Tiro errado gasta bala, e esse é o anti-spam. O tiro tem recuperação curta.
  - Valores iniciais sugeridos: janela de uns 0,13 s no golpe alto e 0,08 s no pesado, sem preparo antes da janela. Tudo ajustável no `config.js`.
  - Visceral: depois do parry, o ataque de frente vira um golpe especial, com dano alto (3 a 4×), um instante de cinema (pausa e tremor), invencibilidade durante a animação e rally cheio. O pesado aparado vira execução (usar `inimigo.abertoParaExecucao`, que já existe), com ainda mais dano.
  - Ataque forte carregado por completo: o dano cresce com a carga, e pelas costas abre o visceral.
  - Quickstep: com a mira travada, a esquiva vira um passo curto, com menos invencibilidade e recuperação curta. Sem mira, continua o rolamento. Reduzir um pouco a invencibilidade do rolamento.
- [x] **C. Chefe e imprevisibilidade** (C1, C2 e C3 feitos): pequena variação no tempo do aviso, golpes atrasados, sequências mais longas, e uma fase final do Guardião com golpes que não podem ser aparados (a fase 2 não pode ser vencida só com parry). Inimigos punem quem usa frasco perto deles. Limite de quantos inimigos atacam ao mesmo tempo. Rasteira mais frequente.
- [x] **D. Golpe pelas costas e pulo contra rasteira:** agachar (anda devagar, menos barulho), cone de visão, execução silenciosa por trás, alerta dos vizinhos se o jogador for visto (sem botão de toque). No ar durante o golpe ativo da rasteira, não leva dano; cair perto abre o contra-ataque pisando; pular contra ataque alto leva dano extra.
- [ ] **E. Ajuste fino com os amigos.** (E1, equilíbrio por simulação, feito; falta o ajuste jogando)
- [x] **Câmera estilo Souls (CAM1 a CAM4)** (spec 10): CAM1 (enquadramento), CAM2 (câmera com peso), CAM3 (mira travada estilo Souls), CAM3b (alvo colado e caçador transparente) e CAM4 (opções em Configurações) feitas. Falta só o Heitor sentir jogando e ajustar os números.
- [ ] **Depois:** broquel como item ou mão secundária alternativa (bloqueio), celular de volta se fizer sentido, golpes em sequência, armas com ritmos diferentes, interior de mais casas, sons gravados, Supabase (login e progresso), multiplayer para uns 5 amigos, mapa maior (floresta, castelo, caverna), modelos e animações de verdade.

## Fila do Gabriel (uma por vez, cada uma num chat novo)

As tarefas do Gabriel, na ordem. Cada uma tem (ou terá) uma spec de uma página em [`docs/specs/`](docs/specs/README.md). As letras B a E são as mesmas etapas do Plano acima; os "S" são tarefas de mundo e sistema. Quem terminar um item marca aqui **e** no Plano.

- [x] **0. Specs 00 a 08 escritas** (`docs/specs/`)
- [x] **0b. Contrato de área aplicado** (spec 00: `src/mundo/areas.js`)
- [x] **1. B: pistola, parry, visceral e quickstep** (spec 07; Opus ou Fable) — B1, B2 e B3 feitos (pistola, parry, balas, broquel fora; visceral, execução, forte carregado; quickstep)
- [x] **2. C: chefe e imprevisibilidade** (spec 08; Opus ou Fable) — C1, C2 e C3 feitos (variação do aviso, golpe atrasado, sequências novas, rasteira mais frequente; fase final do Guardião com golpes inaparáveis; no máximo 2 atacando juntos e punição do frasco)
- [x] **3. S2: botão de gráfico PS1 / HD** (spec 02) — PS1 padrão, HD com troca na hora
- [x] **4. S3: estrada e taverna** (spec 01) — estrada, fachada, taverna por dentro, taverneiro e bilhete; PR 23
- [x] **5. D: golpe pelas costas e pulo contra rasteira** (spec 09; Opus) — Z agacha, percepção por cone e barulho, alerta dos vizinhos, golpe pelas costas, pisada
- [x] **6. S4: personagens e NPCs** (spec 03) — NPCs parados com falas (taverneiro e viajante); a Parte A (variações do boneco) foi dispensada pelos modelos GLB
- [x] **7. S5: atmosfera por área** (spec 04) — parte visual no quarto
  incremento; som ambiente por área e crossfade de trilha entregues.
- [ ] **8. E: ajuste fino com os amigos** (E1 por simulação feito; falta o ajuste jogando)
- [x] **9. S6: primeira área nova** (floresta ligada pela estrada; spec 05; o Heitor revisa a escolha) — falta o `requer` do portal (o `docs/mapa.md` existe desde a direção de arte)
- [x] **10. S7: bolsa cobrindo a barra de vida em telas estreitas** — com a luta rolando, a tela da bolsa reserva 140 px embaixo (`.tela.ao-vivo` no `estilo.css`) e o painel rola por dentro; PR 24
- [ ] **11. S8: Supabase** (spec 06; precisa do Heitor para criar o projeto)
- [x] **Gráficos, incremento 1** — materiais PBR nas quatro áreas, barris,
  tapete retrô e resolução HD selecionável. Avaliação visual e desempenho com GPU pendentes.
- [x] **Gráficos, incremento 2** — fachada modular procedural, detalhes por
  distância, ardósia HD, sombras de contato, riacho animado, rosácea e lareira.
- [x] **Gráficos, incremento 3** — silhuetas do caçador, inimigos e taverneiro,
  com materiais HD de personagem e avisos de golpe preservados.
- [x] **Câmera em primeira pessoa** — opção de desktop com espada, pistola
  e mira travada nos dois modos gráficos.
- [x] **Gráficos, incremento 4** — luz, céu e bruma por área, feixes na
  catedral, fagulhas na taverna e transições de atmosfera nos portais.
- [x] **Gráficos, incremento 5** — redistribuição do vilarejo e interior da
  Catedral, com novos percursos e cinco registros da história do Véu.
- [x] **Gráficos, expansão dos mapas e primeira troca em escala de modelos**
  — 42 GLBs CC0, novas alas e bairros.
- [x] **Gráficos, personagens e decoração das quatro áreas** — modelos
  para o caçador, o taverneiro e os quatro tipos de inimigo, detalhes de
  taverna e Catedral e embarcadouro na estrada.
- [x] **Gráficos, seleção de fantasia sombria** — Witch Hunter, Scary
  Doctor, mulher encapuzada, Alma das Cinzas e Cavaleiro Negro do Sketchfab.
- [ ] **Direção de arte (prompt 7)** — Fases 1, 2 e 3 feitas (kit modular, textura por metro, casas em fileira, `docs/mapa.md`, névoa baixa, paleta, lua, presságios); falta ver no link e medir o HD na GPU do Heitor
- [ ] **Gráficos, próximo incremento** — testar o percurso real e medir o custo
  do HD com GPU. Usar o guia gráfico para comparar o primeiro piloto de
  Blender com a fachada procedural. Alinhar iluminação com S5 e os modelos
  animados com S4. Presets de celular ficam para depois.

**Decidido pela IA, o Heitor revisa** (detalhes nas specs): clique direito e C atiram; 8 balas, repostas na lanterna e não gravadas no save; visceral não gasta estamina; golpe comum de lado em inimigo desequilibrado continua crítico de 2,6×; golpes que não podem ser aparados avisam em branco-violeta; no máximo 2 inimigos comuns atacando juntos; NPCs não podem ser feridos; taverna sem loja; login por link mágico; a floresta como primeira área nova.

## Banco de ideias (guardadas, não fazer agora)

- Fragmentos de profecia espalhados, formando um "livro de profecias"
- Áreas psicodélicas perto dos seres maiores: chão de olhos, caminho de lava com olhos, céu que muda de cor
- Labirinto onírico gerado aleatoriamente nas áreas tomadas pelos seres
- Amigos vendo uns aos outros como presenças no mapa, e marcas ou mensagens deixadas para os outros
- Criaturas maiores (yeti acorrentado, rei-mariposa), bruxa como chefe
- Versão para PC ou Steam (Electron ou Tauri)
- Gastar vida para fazer balas (ideia do Bloodborne)
- Balas como item encontrado no mapa
- Penalidade por morrer (como as almas e os ecos de sangue)
