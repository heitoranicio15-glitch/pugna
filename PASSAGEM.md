# PASSAGEM — contexto do PUGNA para cada chat novo

> **Para a IA:** leia só este arquivo e a spec da tarefa. `LEIAME.md` (como rodar e onde fica cada sistema) e [`docs/mapa-do-codigo.md`](docs/mapa-do-codigo.md) só sob demanda. O histórico detalhado de cada etapa está em [`docs/historico/`](docs/historico/). Ao terminar, atualize "Estado atual" (≤ 15 linhas; o detalhe vai para o histórico) e marque o "Plano". Escreva em português simples: o dono não é programador.

## O projeto

- **PUGNA:** jogo 3D de navegador (Three.js + Vite), PC; celular congelado. Ajustes em `src/config.js`. Node 20+.
- **Equipe:** Heitor (dono) e Gabriel Tavares (colaborador); uns 5 amigos testam.
- **Repositório:** `heitoranicio15-glitch/pugna`, publica sozinho em https://heitoranicio15-glitch.github.io/pugna/
- **Fluxo:** manda o `AGENTS.md`: branch a partir da `main`, PR, `npm run verificar`, integração automática.
- **Visão:** souls-like gótico, noturno e triste (Bloodborne/Dark Souls/Berserk), low-poly com filtro PS1; lua enorme com rosto sempre olhando; azul/violeta, laranja no fogo, verde-ácido em olhos e magia. Explorar é o prazer; combate agressivo e visceral, que pune a defesa passiva e o spam.

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

- **Catedral:** labirinto de 4 andares com dez etapas de polimento (PRs #38–#54); luzes fora da câmera saem do render.
- **Mundo jogável:** vilarejo, Catedral do Véu, Portão Sul (selado até a chave do Guardião), Estrada e Taverna, Floresta Seca (instanciada).
- **Combate:** etapas A, B, C, D e câmera Souls prontas; três armas novas; E1 (equilíbrio por simulação) feito.
- **Em aberto:** pausa > 1 s na primeira subida da escada da Torre; validar a Catedral jogando; acabamento no Vilarejo e Portão Sul → Estrada e Taverna → Floresta Seca; acabamento geral (animação, passos por superfície, avisos, acessibilidade).
- **Custo de sessão:** ver [`docs/custo-qualidade.md`](docs/custo-qualidade.md) e [`docs/roteamento.md`](docs/roteamento.md) (qual modelo usar por tarefa).
- Detalhe de cada etapa: [`docs/historico/2026-11-passagem-ate-pr54.md`](docs/historico/2026-11-passagem-ate-pr54.md).

## Plano (um por vez)

A [auditoria](docs/auditoria-visual.md#acabamento-das-áreas-existentes) diz o que falta e a ordem.

- [x] (a) Pausa na escada da Torre: luzes da Catedral em degraus de 4 + shaders pré-compilados ao entrar (`src/render/aquecimento.js`). Conferir jogando no PC do Heitor.
- [x] (b) Acabamento do Vilarejo e Portão Sul: portão e rota (`AcabamentoPortao.js`), praça do poço com anéis de lajes e rotas para os quatro lados (`AcabamentoPraca.js`).
- [x] (c) Acabamento da Estrada e Taverna: fachada, porta, letreiro, lanternas sem luz nova e calçada até a pista (`AcabamentoTaverna.js`). Salão interno não mexido.
- [x] (d) Acabamento da Floresta Seca: entrada, margens e marcos da trilha, clareira, ruína, cabana, poço e ponte (`AcabamentoFloresta.js`).
- [ ] (e) Acabamento geral. Feito: passos pelo piso sob o jogador (pedra, madeira, terra; `superficie` nos colisores). Falta: avisos/acessibilidade/animação.
- [ ] **E. Ajuste fino com os amigos** (falta o ajuste jogando).
- [ ] **S8: Supabase** (spec 06; precisa do Heitor criar o projeto).
- [ ] **Gráficos:** medir o custo do HD com GPU no PC do Heitor; piloto de Blender.
- [ ] **Depois:** broquel como item/mão secundária, celular de volta, golpes em sequência, armas com ritmos diferentes.

Feitos (detalhes no histórico): polimentos 1–10 da Catedral; Prompt 8 (1A–4); itens 0, 1, 2; etapas A–D; CAM1–CAM4; S2–S7; gráficos 1–5; primeira pessoa. Specs em [`docs/specs/`](docs/specs/README.md).

**Decidido pela IA, o Heitor revisa** (detalhes nas specs): clique direito e C atiram; 8 balas, repostas na lanterna e não gravadas no save; visceral não gasta estamina; golpe comum de lado em inimigo desequilibrado continua crítico de 2,6×; golpes que não podem ser aparados avisam em branco-violeta; no máximo 2 inimigos comuns atacando juntos; NPCs não podem ser feridos; taverna sem loja; login por link mágico; a floresta como primeira área nova.

## Dúvidas para o Heitor ou o Gabriel

- (nenhuma pendente)

## Banco de ideias (não fazer agora)

Profecias em fragmentos; áreas psicodélicas; labirinto onírico; presença dos amigos no mapa; criaturas maiores e bruxa-chefe; versão Steam; gastar vida por balas; balas no mapa; penalidade por morrer.
