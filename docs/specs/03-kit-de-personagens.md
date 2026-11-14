# 03 — Kit de personagens

**Modelo recomendado:** Sonnet.

## Objetivo

Poder povoar o mundo com gente diferente sem modelar nada novo: **variações visuais** do mesmo boneco de caixas e **NPCs parados com falas curtas**. O PASSAGEM manda reaproveitar o mesmo esqueleto e as mesmas animações.

## Parte A — variações do boneco

- `Boneco.js` passa a aceitar um objeto `aparencia` (tudo opcional, o padrão é o caçador de hoje): `{ chapeu: 'aba-larga' | 'capuz' | 'nenhum', capa: true/false, corRoupa, corCapa, corPele, altura (0.9 a 1.1), largura (0.9 a 1.2), maoDireita: 'espada' | 'nada' | 'caneca' | 'cajado', maoEsquerda: ..., avental: true/false, barba: true/false }`.
- Conjuntos prontos em `CONFIG.personagens`: `cacador` (o jogador), `taverneiro`, `aldea`, `monge`, `mendigo`, `coveiro`. Cores dentro da paleta do jogo (azul e violeta, com detalhes quentes).
- O boneco do jogador não muda de aparência nem de animação.

## Parte B — NPCs parados

- `src/entidades/Npc.js`: usa o `Boneco` com uma `aparencia`, fica parado numa pose (`em-pe`, `sentado`, `encostado`, `varrendo`) com respiração leve e vira a cabeça para o jogador quando ele chega perto.
- Contrato de área ganha o campo opcional `npcs: [{ id, personagem, x, z, olhar, pose, falas: ['...', '...'] }]`. O `Jogo.js` cria os NPCs junto das lanternas (única mudança nele).
- Falar: chegar perto, virado para ele, e **E — falar**. A fala aparece numa faixa de texto embaixo da tela por uns 4 s; cada **E** mostra a próxima; no fim, repete a última. **O jogo não pausa** (só o Esc pausa).
- Falas curtas (até ~90 letras), tom sombrio, **nunca tutorial**. Podem dar pistas do mundo.
- NPC não luta, não leva dano e não bloqueia o caminho além de um colisor pequeno **(decidido pela IA, o Heitor revisa: nos souls dá para matar NPC)**.
- Persistência opcional: evento `area:falou-com-<id>` só quando uma fala precisar destravar algo. Por padrão não grava nada.

## Arquivos

`src/entidades/Boneco.js`, `src/entidades/Npc.js` (novo), `src/config.js`, `src/mundo/Interacoes.js` (ação `falar`), `src/interface/Hud.js` e `estilo.css` (faixa de fala), `src/nucleo/Jogo.js` (criar e atualizar NPCs da área), `src/mundo/areas.js` (validar `npcs`), testes, LEIAME.

## Critérios de aceite

1. O caçador fica idêntico ao de hoje (comparar captura de tela antes e depois).
2. Um NPC de teste no vilarejo (um coveiro no cemitério) fala 3 frases em sequência com **E**, com o mundo rodando.
3. Sem botão de toque novo. Sem mudança no formato do save.
4. Testes novos: `aparencia` vazia = caçador; sequência de falas; `validarArea` recusa NPC sem `id` ou sem `falas`.
5. `npm test`, `npm run build`, `npm run test:browser` passam.
