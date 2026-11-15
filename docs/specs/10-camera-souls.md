# 10 — Câmera estilo Souls (CAM1 a CAM4)

**Modelo recomendado:** Opus ou Fable. **Mexe na partida:** sim (rodar `npm run test:browser`).
**Fonte:** pedido do Heitor depois de jogar: a terceira pessoa não parecia a de um jogo Souls.
**(IA)** = decidido pela IA, o Heitor revisa. Os números moram em `CONFIG.camera` e `CONFIG.mira` (`src/config.js`).

## Objetivo

Fazer a câmera em terceira pessoa ter o enquadramento, o peso e a mira travada de um Souls
(a FromSoftware usa praticamente a mesma câmera desde o Demon's Souls). São 4 fases, uma por PR,
cada uma num chat novo. A primeira pessoa e a câmera do menu inicial **não mudam** em nenhuma fase.

## Números de referência

Parâmetros de câmera documentados do Elden Ring, comparados com o PUGNA antes da CAM1:

| Medida | Souls | PUGNA antes | PUGNA depois da CAM1 | Onde fica |
| --- | --- | --- | --- | --- |
| Abertura vertical (FOV) | 43° | 72° (a mesma da primeira pessoa) | **48°** | `CONFIG.camera.campoDeVisao` |
| Distância atrás do caçador | 4,0 m | 4,4 m | **4,2 m** | `CONFIG.camera.distancia` |
| Altura do ponto de giro | 1,42 m (peito) | 2,3 m (acima da cabeça) | **1,55 m** | `CONFIG.camera.alturaPivo` |
| Caçador na altura da tela | uns 57% | uns 28% | uns 50% | consequência dos três acima |

Como a conta é feita: a altura de mundo que cabe na tela, na distância do caçador, é
`2 × distância × tan(abertura ÷ 2)`. Com 72° a 4,4 m cabem 6,4 m (um caçador de 1,8 m ocupa 28%);
com 43° a 4,0 m cabem 3,15 m (57%); com 48° a 4,2 m cabem 3,74 m (48%, e uns 50% medidos nas fotos,
porque a câmera olha um pouco de cima).

## As 4 fases

### CAM1 — enquadramento (feita)

- A terceira pessoa ganhou abertura própria (`CONFIG.camera.campoDeVisao`). A primeira pessoa e o menu
  inicial continuam com `CONFIG.render.campoDeVisao` (72°), e o celular em pé com 88°
  (`CONFIG.render.campoDeVisaoCelularEmPe`). A regra é a função pura `campoDeVisao` em
  `src/nucleo/enquadramento.js`; o `Jogo.js` a chama a cada quadro, então trocar de perspectiva em
  Configurações (até com o jogo pausado) vale na hora.
- Valores: abertura 48°, ponto de giro 1,55 m, distância 4,2 m. `inclinacaoInicial` (−0,2) e
  `mira.inclinacao` (−0,27) **não mudaram**: nas fotos o caçador e o alvo já ficam bem enquadrados.
- O que dependia dos números antigos, conferido um a um:
  - **Câmera no chão olhando para cima** (`Jogador.atualizarCamera`): a regra continua a mesma (a câmera
    para a 0,25 m do chão, agora em `camera.folgaDoChao`). Com o giro mais baixo ela chega mais perto do
    caçador no limite de cima: 1,73 m (antes 2,73 m).
  - **Boneco que some de perto:** o limite saiu do código (`0.85` em `Jogo.js` e `Boneco.js`) e virou
    `camera.sumirBoneco`, que subiu para **1,25 m (IA)**. Com o giro no peito, a câmera a 1 m ficava colada
    nas costas e o caçador tapava a tela inteira.
  - **Marcador da mira travada:** a projeção do `pontoMira` usa a matriz da câmera, que é refeita a cada
    quadro com a abertura certa. O marcador continua em cima do alvo (foto do Guardião).
  - **Cone de travar (`mira.cone`):** é medido pelo ângulo no chão entre o olhar e o inimigo, não pela
    abertura. Não mudou (0,2, uns 78° para cada lado). Com a tela mais fechada (uns 38° para cada lado em
    16:9, antes 52°), dá para travar num inimigo que está um pouco fora da tela; a câmera vira para ele.
    A CAM3 revê isso.
  - **Taverna:** o teto continua aparecendo só visto de baixo. Na inclinação normal a câmera fica a 2,4 m
    (abaixo do teto de 3,5 m) e mostra o teto; olhando bem de cima ela passa do teto e o salão fica à mostra,
    como antes.
- Ferramenta nova: `node tests/fotos-camera.mjs <pasta> [prefixo] [--conferencia]` tira sempre as mesmas
  fotos (vila com cavaleiro a 4 m, nave da catedral, estrada, Guardião com mira travada), para comparar
  antes e depois nas próximas fases.

### CAM2 — câmera com peso (feita)

Antes a câmera andava grudada no caçador: cada rolamento, quickstep, pulo, degrau e pisada sacudia a imagem.
No Dark Souls a câmera persegue o personagem a uma taxa de 0,1 por quadro a 30 quadros por segundo (ela o
alcança em alguns décimos de segundo), e é isso que dá peso.

- **Ponto de giro com atraso.** A câmera gira em volta de um ponto (`jogador.pivo`) que persegue o caçador
  com atraso exponencial, em vez de ficar em cima dele. A regra é a função pura `seguirPonto` em
  `src/nucleo/enquadramento.js`. Ela usa a posição do caçador no quadro anterior para fazer a conta exata,
  então o resultado é o mesmo a 30 ou a 144 quadros por segundo.
- **Números** (`CONFIG.camera`): `seguirPlano` 6 e `seguirVertical` 3 (rapidez, por segundo; a vertical é
  mais lenta), `atrasoMaxPlano` 0,6 m e `atrasoMaxVertical` 0,4 m (o ponto nunca fica mais para trás que
  isso, nem no rolamento a 9,5 m/s). Andando (2,9 m/s) o atraso é de uns 0,5 m; correndo e rolando ele
  fica no limite de 0,6 m.
- **Rotação imediata.** O mouse gira a câmera na hora; só a posição tem atraso.
- **Teletransporte não suaviza.** `Jogador.reiniciar` (começar a partida, renascer na lanterna, Osso de
  Retorno) encaixa o ponto no caçador, e `atualizarCamera(0, 0)` com dt 0 também (atravessar portal).
  Voltar da primeira para a terceira pessoa também começa sem atraso.
- **Parede.** A câmera continua encurtando no mesmo quadro. A volta à distância normal ficou mais lenta
  (`voltaDistancia` 3, antes 6). Se houver parede entre o caçador e o ponto atrasado, o ponto é puxado
  para o lado do caçador; o raio da câmera sai do ponto de giro, não mais do caçador.
- **Chão.** O limite de "não entrar no chão olhando para cima" usa o chão dos pés do caçador, não o do
  ponto atrasado (senão, logo depois de subir um degrau, a câmera afundaria no piso de cima).
- **Boneco que some:** passou a usar a distância real da câmera ao peito do caçador (`jogador.distBoneco`),
  porque com o atraso ela difere um pouco de `distCamera` (andando de costas contra uma parede o caçador
  fica mais perto da câmera que o ponto de giro).
- Tremor de tela e "afundar" funcionam como antes. A primeira pessoa não mudou.
- **Ficou de fora (IA):** o boneco sumir de uma vez (trocar por transparência gradual) e a câmera muito perto
  ao olhar para o céu. Não estavam no pedido da CAM2; seguem como pendência.

### CAM3 — mira travada estilo Souls (feita)

Antes, com a mira travada, a câmera girava para o alvo e a inclinação ia para um valor fixo (`mira.inclinacao`).
No Elden Ring a inclinação acompanha 60% da altura do alvo (`lockRotXShiftRatio` 0,6) e o personagem e o alvo
ficam os dois no quadro. Tudo abaixo vale só na terceira pessoa; a primeira pessoa já mirava na altura do alvo.

- **Inclinação** (`inclinacaoDaMira`): `mira.inclinacao` (−0,27) mais `mira.inclinacaoFracao` (0,6) do ângulo
  entre o ponto de giro (peito do caçador) e o peito do alvo (`alvo.pos.y + 1,25 × escala`, o mesmo ponto do
  marcador), dentro de `camera.inclinacaoMin` e `inclinacaoMax`. Alvo a menos de `mira.inclinacaoDistMin` (1 m)
  conta como a 1 m, para o ângulo não disparar. Exemplos: cavaleiro a 4 m, −0,274; Guardião a 8 m, −0,23;
  a 5 m, −0,21; a 2 m, −0,12 (a câmera desce e olha mais para cima: a cabeça dele entra na tela).
- **Foco** (`focoDaMira`): a câmera olha para um ponto no caminho entre o caçador e o alvo: `mira.focoFracao`
  (30%) do caminho, no máximo `mira.focoMax` (1,5 m). A distância da câmera é contada a partir desse ponto e soma
  o desvio, então a câmera nunca fica mais perto do caçador do que sem a mira. O foco para antes de parede.
- **Distância** (`distanciaDaMira`): `mira.distPorEscala` (0,5 m) por ponto de escala do alvo acima de 1
  (Guardião 1,65: +0,33 m; cavaleiro 1,22: +0,11 m) e até `mira.pertoExtra` (1 m) quando o alvo está a menos de
  `mira.pertoDistancia` (2 m): +0,25 m a 1,5 m, +0,5 m a 1 m. A colisão da CAM2 continua valendo (encurta na
  hora ao bater em parede).
- **Transições.** O foco e a distância extra entram e saem por uma mola sem balanço (`acomodar`, rapidez
  `mira.acomodar` 6: uns 0,8 s, saindo e chegando devagar). O giro e a inclinação começam devagar e chegam à
  rapidez normal em `mira.entrada` (0,25 s) depois de travar ou de trocar de alvo; antes o giro partia na
  velocidade máxima. Ao destravar ou perder o alvo (`mira.semVisao`), o olhar fica onde está: só o foco e a
  distância voltam ao normal.
- **Combate igual.** A direção dos golpes, o quickstep, a escolha e a troca de alvo não mudaram.
- **Cone de travar (`mira.cone`): não mudou (IA).** O plano era revê-lo, mas o pedido da CAM3 foi manter a
  escolha de alvo como está. Continua dando para travar num inimigo um pouco fora da tela.
- **Limite conhecido:** com um inimigo do tamanho do caçador colado (1,5 m), o caçador ainda tapa o corpo
  dele, porque a câmera fica atrás do caçador na linha do alvo. Uma câmera um pouco de lado ou mais alta nesse
  caso resolveria; fica como ideia.
- Fotos de antes e depois em `docs/fotos/cam3/`. O `tests/fotos-camera.mjs` ganhou 7 fotos da mira (cavaleiro
  a 4 m e a 1,5 m, Guardião a 2 m e a 8 m, troca de alvo em 3 momentos).

### CAM3b — alvo colado e caçador transparente (feita)

Complemento da CAM3, para o "limite conhecido" dela (inimigo colado tapado pelo caçador). Só na terceira pessoa.

- **Alvo colado** (`fatorColado`, dentro de `inclinacaoDaMira`): com o alvo a menos de `mira.coladoDistancia`
  (2,5 m) a inclinação ganha um extra para baixo, que chega a `mira.coladoInclinacao` (−0,1 rad, uns 6°) em
  `mira.coladoCheio` (1,2 m). Como a câmera gira em volta do foco, inclinar para baixo também a faz subir
  (uns 0,4 m com o alvo a 1,5 m). Entra aos poucos, sem degrau. É pouco de propósito: nos Souls a queixa é a
  câmera subir demais de perto.
- **Caçador transparente** (`opacidadeDoCacador`, `coberturaDoAlvo`, `pontilhar`): o boneco não some mais de
  uma vez. A transparência é pontilhada (matriz de Bayer 4 × 4: parte dos pixels deixa de ser desenhada), como
  no PS1, e funciona nos dois modos gráficos; no HD o grão cresce com a resolução.
  - Pela distância: inteiro a partir de `camera.transparenteDe` (2,4 m), invisível em `camera.sumirBoneco`
    (1,25 m). Substitui o "aparece ou some" da CAM1.
  - Tapando o alvo travado: quando o ponto do marcador (peito do alvo) cai dentro da silhueta do caçador na
    tela (`mira.tapaLargura`, `mira.tapaAltura`), ele cai até `mira.tapaOpacidade` (30%). Entra numa faixa de
    `mira.tapaMargem` em volta da borda e aos poucos no tempo (`camera.transparenciaRapidez` 8).
- **Câmera de lado (estilo ombro): não entrou**, a pedido do Heitor.
- Fotos em `docs/fotos/cam3b/`. `tests/fotos-camera.mjs` ganhou `--so=nome1,nome2` e `--hd`.
- **Limite conhecido:** inimigo escuro atrás do caçador, na névoa, continua difícil de ler numa foto parada.

### CAM4 — opções em Configurações (feita)

Os jogos da FromSoftware têm opções de câmera (no PC muita gente desliga "Camera Auto-Rotate" e "Camera Auto
Wall Recovery"). O PUGNA ganhou três, em Configurações (tela inicial e pausa), logo abaixo de "Câmera". Valem só
na terceira pessoa (ficam cinza na primeira), valem na hora e ficam salvas.

- **Recentralizar sozinha** (`cameraRecentrar`, desligada por padrão; função pura `recentralizar`): andando ou
  correndo sem mexer o mouse por `camera.recentrarEspera` (1,5 s), o yaw volta para trás do corpo (`rumo`).
  O giro começa parado e chega à rapidez cheia em `recentrarEntrada` (0,5 s); a rapidez é `recentrarRapidez`
  (1,2 por segundo), nunca acima de `recentrarVelMax` (0,7 rad/s). Mexer o mouse, parar, travar a mira ou
  desligar a opção zera a espera na hora. Com o corpo virado mais que `recentrarSemVolta` (2,6 rad) em relação
  ao olhar (andando de frente para a câmera) ela não gira. A inclinação não é mexida.
- **Desviar de paredes** (`cameraDesviar`, ligada por padrão; função pura `desvioDeParede`): a cada quadro a
  câmera mede quanto do caminho até ela estaria livre com o yaw `camera.desviarAngulo` (0,3 rad) maior e menor.
  Se um lado está mais livre que o outro (diferença acima de `desviarMargem`, 0,08), o yaw gira para o lado
  livre, até `desviarVel` (0,6 rad/s), entrando e saindo com `desviarSuavidade` (4). Só age `desviarEspera`
  (0,5 s) depois do último movimento do mouse e nunca com a mira travada. Lados iguais (parede bem atrás, beco
  estreito, campo aberto): não gira, vale só o encurtar da CAM2. Desligada: só o encurtar da CAM2.
- **Abertura da câmera** (`cameraAbertura`): controle de `camera.aberturaMin` (40°) a `aberturaMax` (60°), de 1
  em 1 grau; o padrão é `camera.campoDeVisao` (48°). A função `campoDeVisao` recebe a abertura escolhida e a
  prende na faixa; primeira pessoa, menu inicial e celular em pé não mudam.
- **Preferências, não progresso:** os três campos ficam em `pugna-preferencias-v1` (`src/nucleo/Preferencias.js`).
  Valor ausente (preferência antiga) ou inválido vira o padrão; abertura fora da faixa fica na ponta. O save de
  progresso não mudou e "Apagar progresso" não apaga as opções.
- **Celular congelado:** nada novo no `Toque.js` nem botões de toque.
- **Fotos:** a CAM4 não muda o enquadramento com as opções no padrão (abertura 48°; sem parede ao lado o
  desvio não age), então não há fotos novas de antes e depois.

## Critérios de aceite

Valem para todas as fases:

- A primeira pessoa (abertura 72°, câmera nos olhos) e a câmera do menu inicial ficam iguais.
- `npm test`, `npm run build`, `npm run test:browser` e `git diff --check` passam.
- O PR traz as fotos de antes e depois dos 4 pontos fixos, tiradas com `tests/fotos-camera.mjs`.
- Todo número novo fica no `config.js`, comentado e com o valor antigo anotado, e entra em
  "Decidido pela IA (o Heitor revisa)" no PASSAGEM.
- Save, IDs e `Toque.js` não mudam.

CAM1:

- [x] Terceira pessoa com abertura própria; trocar de perspectiva em Configurações aplica a abertura certa na hora.
- [x] Caçador ocupa por volta de metade da altura da tela na inclinação inicial.
- [x] A câmera não entra no chão olhando para cima e não mostra o boneco por dentro colada na parede.
- [x] O marcador da mira travada fica em cima do alvo.
- [x] Taverna: teto visível de baixo, salão à mostra de cima.

CAM2:

- [x] Andando, pulando e esquivando, o caçador se desloca um pouco no quadro e a câmera o alcança suave.
- [x] Sair de perto de uma parede não dá zoom brusco.
- [x] O atraso nunca passa de 0,6 m no plano e 0,4 m na vertical, e é igual a 30 e a 144 quadros por segundo.
- [x] Começar a partida, renascer, Osso de Retorno e portal posicionam a câmera na hora.

CAM3:

- [x] Com a mira travada, caçador e Guardião aparecem inteiros de 2 m a 8 m (fotos).
- [x] Inimigo do tamanho do caçador a 1,5 m: a câmera sobe um pouco e o caçador fica transparente na frente dele (CAM3b).
- [x] Travar, trocar de alvo, destravar e perder o alvo não dão tranco (teste: o primeiro quadro depois de cada um).

CAM3b:

- [x] Com o alvo a menos de 2,5 m a câmera inclina e sobe um pouco, sem salto.
- [x] O caçador fica transparente aos poucos (pontilhado) perto da câmera e quando tapa o alvo travado, no PS1 e no HD.

CAM4:

- [x] As três opções aparecem em Configurações (tela inicial e pausa), valem na hora e ficam salvas.
- [x] Ficam cinza na primeira pessoa; "Apagar progresso" não as apaga; valor velho ou inválido vira o padrão.

## Decidido pela IA (o Heitor revisa)

- CAM1: abertura 48°, giro 1,55 m e distância 4,2 m foram os valores iniciais pedidos pelo Heitor; a IA
  os manteve depois de olhar as fotos. `inclinacaoInicial` e `mira.inclinacao` ficaram como estavam.
- CAM1: `camera.sumirBoneco` 0,85 → 1,25 m.
- CAM1: o celular deitado (congelado) usa a abertura nova da terceira pessoa; o celular em pé continua em 88°.
- CAM1: a lua e o céu parecem maiores na tela durante a partida (a abertura menor "aproxima" tudo). No menu
  inicial nada muda.
- CAM2: `seguirPlano` 6, `seguirVertical` 3, `atrasoMaxPlano` 0,6 m, `atrasoMaxVertical` 0,4 m e
  `voltaDistancia` 3 são as sugestões do Heitor, mantidas. O Dark Souls usa uns 3 no plano (mais "mole");
  6 é mais contido.
- CAM2: quando há parede entre o caçador e o ponto de giro, o ponto é puxado até antes da parede (em vez de
  pular para cima do caçador), para não dar tranco.
- CAM2: o limite do chão usa os pés do caçador; o boneco some pela distância real ao caçador.
- CAM3: `mira.inclinacaoFracao` 0,6, `focoFracao` 0,3, `focoMax` 1,5 m, `distPorEscala` 0,5 m e `pertoDistancia`
  2 m são as sugestões do Heitor, mantidas. Da IA: `pertoExtra` 1 m, `inclinacaoDistMin` 1 m, `acomodar` 6,
  `entrada` 0,25 s; `suavidade` 4 é o número que já estava solto no código.
- CAM3: a distância é contada a partir do foco; o foco para antes de parede; o `mira.cone` não foi mexido.
- CAM3b: `mira.coladoDistancia` 2,5 m é a sugestão do Heitor. Da IA: `coladoCheio` 1,2 m, `coladoInclinacao`
  −0,1 rad, `tapaOpacidade` 0,3, `tapaMargem` 0,05, `tapaLargura` 0,42 m, `tapaAltura` 1,95 m,
  `camera.transparenteDe` 2,4 m e `camera.transparenciaRapidez` 8. `camera.sumirBoneco` continua 1,25 m.
- CAM3b: a câmera sobe só pela inclinação; "tapar o alvo" é medido pelo ponto do marcador, não pelo corpo
  inteiro do alvo (senão o caçador ficaria transparente em quase toda luta travada).
- CAM4: `recentrarEspera` 1,5 s e a faixa de 40° a 60° são os pedidos do Heitor. Da IA: `recentrarEntrada` 0,5 s,
  `recentrarRapidez` 1,2, `recentrarVelMax` 0,7 rad/s, `recentrarSemVolta` 2,6 rad, `desviarAngulo` 0,3 rad,
  `desviarVel` 0,6 rad/s, `desviarMargem` 0,08, `desviarEspera` 0,5 s, `desviarSuavidade` 4 e o passo de 1 grau.
- CAM4: parar de andar zera a espera do recentralizar; andando de frente para a câmera ela não gira; a
  inclinação não é recentralizada. Como o caçador anda em relação à câmera, o efeito aparece principalmente
  ao andar de lado (a câmera gira e o caçador faz uma curva, como nos Souls).
- CAM4: o desvio de parede espera 0,5 s depois do mouse, não age com a mira travada e não gira quando os dois
  lados estão iguais (parede bem atrás ou beco estreito). As opções também valem no celular deitado (congelado).
