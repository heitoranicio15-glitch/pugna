# 01 — Estrada e taverna

**Modelo recomendado:** Sonnet. **Depende de:** spec 00 (contrato de área) e, para o taverneiro, spec 03 (NPCs).

## Objetivo

Dar ao vilarejo uma saída para o resto do mundo: uma **estrada** que liga o vilarejo às próximas áreas e, no meio dela, uma **taverna** de beira de estrada no clima dos bares do Witcher (madeira escura, lareira, canecas, pouca gente, luz quente contra a noite azul). É um lugar de respiro: sem inimigos dentro, com uma lanterna de descanso por perto.

## O que entra

- **Área `estrada`** (`src/mundo/Estrada.js`): faixa comprida e estreita (uns 120 × 30 m), chão de terra batida, cercas, árvores secas, uma ponte de pedra, 2 ou 3 inimigos em patrulha, céu e lua visíveis (`usaCeu: true`). Portal no vilarejo pelo **Portão Sul** (o portão já existe no cenário) e uma ponta "em obras" bloqueada por carroça tombada, onde entrarão as áreas novas (spec 05).
- **Taverna vista de fora**: construída com as peças de `pecas.js` (casa grande, placa pendurada, janelas acesas, chaminé com fumaça simples). Porta com portal `E — entrar na taverna`.
- **Área `taverna`** (`src/mundo/Taverna.js`): interior pequeno (uns 12 × 9 m), `usaCeu: false`, névoa fraca e quente, balcão, 3 mesas, lareira com luz laranja tremulando, barris, escada decorativa (sem andar de cima). Segue a nota técnica do chão (`depthWrite: false`).
- **Taverneiro**: NPC parado atrás do balcão, com 3 ou 4 falas curtas que se revezam (tom seco, sem tutorial, sem explicar mecânica). Usa o sistema de NPCs da spec 03. Sem loja por enquanto **(decidido pela IA, o Heitor revisa)**.
- **Lanterna** `taverna-da-estrada` do lado de fora, perto da porta.
- Um registro para ler na mesa (evento `taverna:bilhete-da-mesa`), para dar um motivo de explorar.

## Arquivos

`src/mundo/Estrada.js` e `src/mundo/Taverna.js` (novos), `src/mundo/areas.js` (2 linhas no registro), `src/mundo/Vilarejo.js` (portal e chegada no Portão Sul), `src/mundo/pecas.js` (só se faltar peça: placa, balcão, barril, mesa), `src/config.js` (`CONFIG.areas.estrada`, `CONFIG.areas.taverna`), `tests/areas.test.js`, `tests/catedral.mjs` (um trecho curto), LEIAME e PASSAGEM.

## Critérios de aceite

1. O `Jogo.js` **não é alterado** (prova de que o contrato da spec 00 funciona).
2. Dá para ir vilarejo → estrada → taverna e voltar; descansar na lanterna nova e renascer nela depois de recarregar a página.
3. IDs novos únicos (`estrada`, `taverna`, `taverna-da-estrada`, eventos `taverna:...`); nenhum ID antigo muda; save antigo carrega normal.
4. Sem botões de toque novos; sem tutorial; visual PS1.
5. `npm test`, `npm run build` e `npm run test:browser` passam; o teste do navegador atravessa os dois portais novos.
6. Dois PRs pequenos: (a) estrada + fachada, (b) interior + taverneiro.
