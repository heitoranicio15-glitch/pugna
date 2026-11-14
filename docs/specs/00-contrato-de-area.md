# 00 — Contrato de área

**Modelo recomendado:** Sonnet. **Mexe na partida:** sim (rodar `npm run test:browser`).

## Objetivo

Hoje o `Jogo.js` cria `Vilarejo` e `Catedral` pelo nome e tem regras escritas à mão ("céu só no vilarejo", "luz do jogador 8 na catedral"). Queremos que cada área **declare** tudo o que o jogo precisa saber dela e que exista **um registro único** (`src/mundo/areas.js`). Área nova = uma classe + uma linha no registro, sem tocar no `Jogo.js`.

## O contrato (toda área expõe)

| Campo | Tipo | Hoje |
| --- | --- | --- |
| `id` | texto único, minúsculo, com hífen | `'vilarejo'`, `'catedral'` (publicados: **não mudar**) |
| `nome` | texto mostrado ao entrar | já existe |
| `limites` | `{ minX, maxX, minZ, maxZ }` | já existe |
| `nevoa` | `THREE.FogExp2` (ou `null`) | já existe |
| `luzJogador` | número (intensidade da luz que acompanha o caçador) | **novo**: vilarejo 5, catedral 8 (hoje em `Jogo.js:431`) |
| `usaCeu` | booleano (mostra e atualiza céu e lua) | **novo**: vilarejo `true`, catedral `false` (hoje em `Jogo.js:428` e `:608`) |
| `portais` | lista de `{ x, z, raio, destino, texto }` | já existe |
| `chegadas` | `{ [idDaAreaDeOrigem]: { x, z, yaw } }` | já existe |
| `pontosDeDescanso` | lista de `{ id, nome, x, z, olhar }` | já existe (IDs publicados: `portao-sul`, `adro-da-igreja`, `nave-do-veu`) |
| `inimigos` | lista de `{ tipo, rota, ...opcionais }` | já existe |
| `grupo`, `colisores`, `objetos` | cena, colisões e objetos interativos | já existem |
| `nascimento` *(só a área inicial)* | `{ x, z }` | vilarejo |
| `aplicarProgresso(progresso)`, `atualizar(dt, tempo)` *(opcionais)* | funções | já existem |

Os valores `luzJogador` de cada área ficam em `src/config.js` (bloco novo `CONFIG.areas = { vilarejo: { luzJogador: 5 }, catedral: { luzJogador: 8 } }`).

## `src/mundo/areas.js` (novo)

- `REGISTRO`: lista ordenada de fábricas, ex. `[{ id: 'vilarejo', criar: (cena, ceu) => new Vilarejo(cena, ceu.direcaoLua) }, { id: 'catedral', criar: (cena) => new Catedral(cena) }]`. A primeira é a área inicial.
- `validarArea(area)`: confere os campos obrigatórios e devolve a lista de problemas (vazia = ok). Sem depender de navegador.
- `montarAreas(lista)`: recebe áreas **já criadas** (reais ou de mentira) e devolve `{ areas, porId, inicial, checkpoints }`, onde `checkpoints` é um `Map(idDoPonto -> { area, ponto })`. Lança erro com mensagem clara se houver `id` de área ou de ponto repetido, portal apontando para área inexistente ou portal sem a `chegada` correspondente no destino. Função pura, testável no Node.
- `criarAreas(cena, ceu)`: percorre o `REGISTRO`, cria cada área e devolve `montarAreas(...)`.

## Mudança mínima no `Jogo.js`

- Construtor: troca a criação manual por `criarAreas(cena, ceu)`. Mantém `this.vilarejo` e `this.catedral` como atalhos (`porId.get(...)`), porque o teste do navegador e a lógica dos selos/Guardião usam esses nomes.
- `ativarArea`: usa `area.usaCeu` e `area.luzJogador` no lugar das comparações com `this.vilarejo`/`this.catedral`.
- Laço principal: atualiza o céu se `this.mundo.usaCeu`.
- "Voltar ao título" e "apagar progresso": usam a área inicial do registro.
- **Fica de fora (de propósito):** selos, grade e Guardião continuam citando a catedral; a música continua como está (a spec 04 trata de som e atmosfera).

## Critérios de aceite

1. `npm test`, `npm run build` e `npm run test:browser` passam sem alterar os testes existentes.
2. Teste novo (`tests/areas.test.js`): uma área "de mentira" (objeto simples com os campos do contrato) entra por `montarAreas` junto de outra, e o teste confere `porId`, `inicial`, `checkpoints`, portal ↔ chegada, e os erros (id repetido, destino inexistente, campo faltando em `validarArea`).
3. Save antigo continua valendo: mesma chave `pugna-progresso-v1`, mesmos IDs de área, lanterna e eventos. Nenhuma migração.
4. No jogo nada muda para quem joga (mesma névoa, céu, luz e portais).
5. `grep -n "=== this.vilarejo\|=== this.catedral" src/nucleo/Jogo.js` não mostra mais regra de céu/luz.
6. LEIAME ("Mapa maior / outras áreas") e PASSAGEM atualizados.
