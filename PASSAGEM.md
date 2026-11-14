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

- **Câmera:** terceira pessoa, com mira travada (Tab ou botão do meio do mouse).
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

- **Pronto e no ar:** vilarejo, Catedral do Véu (nave, Ossário, Relicário, Santuário, selos), inimigos cavaleiro, caçador e Penitente, miniboss Guardião do Véu, bolsa e frascos de cura, lápides, atalhos, menu de configurações, trilha sonora, terceira pessoa, mira travada, parry com a pistola, crítico, visceral, execução, ataque forte carregado, rolamento e quickstep.
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
- **Ganchos deixados:** `inimigo.abertoParaExecucao` (já usado pela execução do B2) e `inimigo.desequilibrar()` (abre o visceral sem execução; serve ao golpe pelas costas da Etapa D). O aviso `jogador:pulou-golpe` sai quando o jogador pula uma rasteira (Etapa D). `jogador.recuperarComGolpe(dano)` é o ponto de entrada do rally (`Infinity` = rally cheio, usado pelo visceral). `Jogador.receberDano` recebe os dados do golpe (`aparavel`, `bloqueavel`, `evitaPulando`...).
- **Ainda não existe:** contra-ataque pisando e dano extra ao pular contra golpe alto.
- **Infra:** `jogar.bat` com atualização automática, `atualizar.bat`, e regra de integração automática no `AGENTS.md` com o `CLAUDE.md` apontando para ele.
- **Specs (pronto):** `docs/specs/` tem uma página por tarefa futura (00 a 08), com objetivo, arquivos, critérios de aceite e modelo de IA recomendado. A ordem está na "Fila do Gabriel".
- **Contrato de área (pronto):** `src/mundo/areas.js` tem o registro das áreas, e cada área declara `luzJogador` e `usaCeu`. Área nova não exige mexer no `Jogo.js`.
- **A conferir:** origem das 4 músicas (o repositório é público). Os números da Etapa A são um primeiro chute e precisam ser sentidos jogando. O painel da bolsa cobre um pedaço da barra de vida em telas estreitas.
- **Pendente para o Heitor decidir:** a penalidade ao morrer (como as almas e os ecos de sangue; ela casa com o rally) e a penalidade do Osso de Retorno. Até lá, morrer e usar o osso não custam nada.

## Plano (fazer um por vez, cada um num chat novo)

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
- [ ] **C. Chefe e imprevisibilidade** (C1 feito; faltam C2 fase final e C3 grupo/frasco): pequena variação no tempo do aviso, golpes atrasados, sequências mais longas, e uma fase final do Guardião com golpes que não podem ser aparados (a fase 2 não pode ser vencida só com parry). Inimigos punem quem usa frasco perto deles. Limite de quantos inimigos atacam ao mesmo tempo. Rasteira mais frequente.
- [ ] **D. Golpe pelas costas e pulo contra rasteira:** agachar (anda devagar, menos barulho), cone de visão, execução silenciosa por trás, alerta dos vizinhos se o jogador for visto (sem botão de toque). No ar durante o golpe ativo da rasteira, não leva dano; cair perto abre o contra-ataque pisando; pular contra ataque alto leva dano extra.
- [ ] **E. Ajuste fino com os amigos.**
- [ ] **Depois:** broquel como item ou mão secundária alternativa (bloqueio), celular de volta se fizer sentido, golpes em sequência, armas com ritmos diferentes, interior de mais casas, sons gravados, Supabase (login e progresso), multiplayer para uns 5 amigos, mapa maior (floresta, castelo, caverna), modelos e animações de verdade.

## Fila do Gabriel (uma por vez, cada uma num chat novo)

As tarefas do Gabriel, na ordem. Cada uma tem (ou terá) uma spec de uma página em [`docs/specs/`](docs/specs/README.md). As letras B a E são as mesmas etapas do Plano acima; os "S" são tarefas de mundo e sistema. Quem terminar um item marca aqui **e** no Plano.

- [x] **0. Specs 00 a 08 escritas** (`docs/specs/`)
- [x] **0b. Contrato de área aplicado** (spec 00: `src/mundo/areas.js`)
- [x] **1. B: pistola, parry, visceral e quickstep** (spec 07; Opus ou Fable) — B1, B2 e B3 feitos (pistola, parry, balas, broquel fora; visceral, execução, forte carregado; quickstep)
- [ ] **2. C: chefe e imprevisibilidade** (spec 08; Opus ou Fable) — C1 feito (variação do aviso, golpe atrasado, sequências novas, rasteira mais frequente); faltam C2 fase final e C3 grupo/frasco
- [ ] **3. S2: botão de gráfico PS1 / HD** (spec 02)
- [ ] **4. S3: estrada e taverna** (spec 01)
- [ ] **5. D: golpe pelas costas e pulo contra rasteira** (sem spec ainda; Opus)
- [ ] **6. S4: personagens e NPCs** (spec 03)
- [ ] **7. S5: atmosfera por área** (spec 04)
- [ ] **8. E: ajuste fino com os amigos**
- [ ] **9. S6: primeira área nova** (castelo, floresta ou caverna; spec 05; o Heitor escolhe)
- [ ] **10. S7: bolsa cobrindo a barra de vida em telas estreitas**
- [ ] **11. S8: Supabase** (spec 06; precisa do Heitor para criar o projeto)

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
