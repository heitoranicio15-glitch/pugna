# PASSAGEM — contexto do PUGNA para cada chat novo

> **Para a IA:** leia este arquivo, o `LEIAME.md` e o `AGENTS.md` antes de qualquer tarefa. O LEIAME descreve o código; este arquivo descreve as decisões de design e o plano. Ao terminar cada tarefa, atualize a seção "Estado atual" e marque o item no "Plano". Explique tudo em português simples: o dono do projeto não é programador.

## O projeto

- **Nome:** PUGNA, um jogo 3D de navegador (Three.js + Vite), jogável no PC e no celular.
- **Equipe:** Heitor (dono) e Gabriel Tavares (colaborador). Uns 5 amigos jogam e dão feedback.
- **Repositório:** `heitoranicio15-glitch/pugna`. Ele publica sozinho no GitHub Pages: https://heitoranicio15-glitch.github.io/pugna/
- **Pasta do Heitor:** `C:\Users\Heitor\OneDrive\Documentos\Jogo\pugna`. O `jogar.bat` puxa a `main` antes de abrir o jogo, e o `atualizar.bat` só atualiza.
- **Fluxo:** o `AGENTS.md` manda. Cada mudança vai numa branch nova a partir da `main`, entra por pull request e passa pelos testes (`npm test`, `npm run build` e `npm run test:browser` se mexer na partida). A IA pode integrar sozinha se os testes passarem e não houver conflito. Se houver conflito ou teste falhando, ela para e explica.
- **Requisitos:** Node.js 20 ou mais novo. Os valores ajustáveis ficam em `src/config.js`.

## Visão

Ação e exploração num mundo medieval gótico, vazio e triste, à noite, no estilo de Bloodborne, Dark Souls e Berserk. O jogador é um caçador de chapéu, capa, espada e broquel. Seres cósmicos distorcem o mundo, mas nunca lutam. A presença deles aparece numa **lua enorme e medonha, com rosto, sempre olhando para o jogador**, e nas cores estranhas do céu. O clima é contemplativo e sombrio, mas bonito. Explorar é o prazer principal, e o combate tem peso.

**Visual:** 3D low-poly com filtro retrô estilo PS1 (resolução baixa, texturas pixeladas, névoa). A base é azul e violeta profundos, com laranja no fogo e verde-ácido em olhos e magia. É psicodélico sem ser escrachado.

## Decisões já tomadas (não mudar sem o Heitor pedir)

- **Câmera:** terceira pessoa, com mira travada (Tab ou botão do meio do mouse).
- **Sem o gigante encapuzado:** ele foi excluído. A lua é a presença no céu.
- **Salvamento estilo Souls:** o jogo salva sozinho o tempo todo. Ao morrer, o jogador renasce na última lanterna em que descansou, e os inimigos comuns voltam. Não existe salvar manualmente. O "voltar ao checkpoint" vira um item consumível, o Osso de Retorno.
- **Escopo:** semi-linear (vilarejo, catedral, depois áreas ligadas por atalhos). Nada de mundo aberto. Os inimigos são humanos de armadura, que reaproveitam o mesmo esqueleto e as mesmas animações.
- **Pistola:** fica para a fase 2, como escolha de mão secundária. O broquel faz parry colado e permite bloquear. A pistola faz parry à distância, gasta munição e não bloqueia. As duas usam o mesmo gancho de interrupção.

## A regra de ouro do combate

Cada resposta do jogador precisa ser a melhor contra algum tipo de ataque. Se não for assim, a esquiva domina e o resto vira enfeite.

| Ataque inimigo | Melhor resposta | Recompensa |
| --- | --- | --- |
| Alto (normal) | Parry (C) ou esquiva | Parry: inimigo desequilibrado e golpe crítico |
| Pesado | Parry, com janela menor | Execução (muito dano, pausa, tremor de tela) |
| Rasteira (larga) | Pulo | Contra-ataque pisando no inimigo; a rasteira não pode ser aparada |
| Qualquer um | Esquiva (rolamento, ou quickstep com a mira) | Nenhuma: é segura, mas não recompensa |
| Antes da luta | Golpe pelas costas (agachado, sem ser visto) | Execução silenciosa |

## Estado atual

- **Pronto e no ar:** vilarejo, Catedral do Véu (nave, Ossário, Relicário, Santuário, selos), inimigos cavaleiro e Penitente, miniboss Guardião do Véu, bolsa e frascos de cura, lápides, atalhos, menu de configurações, trilha sonora, suporte a celular, terceira pessoa, mira travada, parry com crítico e rolamento.
- **Infra:** `jogar.bat` com atualização automática, `atualizar.bat`, e regra de integração automática no `AGENTS.md` com o `CLAUDE.md` apontando para ele.
- **A conferir:** origem das 4 músicas (o repositório é público) e ajuste fino da câmera e do parry jogando com o mouse.

## Plano (fazer um por vez, cada um num chat novo)

- [ ] **1. Salvamento estilo Souls + Osso de Retorno** (ver "Decisões")
- [ ] **2. Base dos ataques:** máquina de estados única para todos os inimigos humanos. Cada ataque tem 3 fases (preparação, golpe ativo, recuperação) e um tipo (alto, rasteira, pesado), com aviso visual e sonoro diferente por tipo. A rasteira é larga. Manter o parry e o crítico. Deixar ganchos para pulo e execução.
- [ ] **3. Quickstep + execução:** com a mira travada, a esquiva vira um passo curto, com menos invencibilidade e recuperação curta. Sem mira, continua o rolamento. Parry num ataque pesado (janela menor) abre a execução. A rasteira não pode ser aparada.
- [ ] **4. Golpe pelas costas:** agachar (anda devagar, menos barulho), cone de visão, execução silenciosa por trás, alerta dos vizinhos se o jogador for visto. Botão Agachar no celular.
- [ ] **5. Pulo contra rasteira:** no ar durante o golpe ativo, não leva dano. Cair perto abre o contra-ataque pisando. Pular contra ataque alto leva dano extra.
- [ ] **6. Ajuste de peso do combate** com o feedback dos amigos
- [ ] **Depois:** golpes em sequência, armas com ritmos diferentes, pistola, interior de mais casas, sons gravados, Supabase (login e progresso), multiplayer para uns 5 amigos, mapa maior (floresta, castelo, caverna), modelos e animações de verdade.

## Banco de ideias (guardadas, não fazer agora)

- Fragmentos de profecia espalhados, formando um "livro de profecias"
- Áreas psicodélicas perto dos seres maiores: chão de olhos, caminho de lava com olhos, céu que muda de cor
- Labirinto onírico gerado aleatoriamente nas áreas tomadas pelos seres
- Amigos vendo uns aos outros como presenças no mapa, e marcas ou mensagens deixadas para os outros
- Criaturas maiores (yeti acorrentado, rei-mariposa), bruxa como chefe
- Versão para PC ou Steam (Electron ou Tauri)
