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

### CAM3 — mira travada estilo Souls

- A inclinação segue cerca de 60% da altura do alvo (hoje é fixa, `mira.inclinacao`).
- Caçador e alvo cabem os dois no quadro.
- A câmera se afasta para alvos grandes (Guardião) e quando o alvo está muito perto.
- Travar e destravar é suave (sem tranco de giro nem de inclinação).
- Rever o cone de travar para combinar com a tela mais fechada.

### CAM4 — opções em Configurações

- Recentralizar sozinha (ligado ou desligado).
- Desviar de paredes (ligado ou desligado).
- Abertura da câmera (controle deslizante em volta do padrão).
- São preferências (`pugna-preferencias-v1`), não progresso. Sem botões de toque novos (celular congelado).

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

- [ ] Com a mira travada, caçador e alvo aparecem inteiros nos 4 inimigos e no Guardião, de 1,5 m a 10 m.
- [ ] Travar e destravar não dão tranco.

CAM4:

- [ ] As três opções aparecem em Configurações (tela inicial e pausa), valem na hora e ficam salvas.

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
