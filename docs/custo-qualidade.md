# Custo × qualidade das sessões de IA

Tokens estimados = bytes ÷ 3,5. Preços em [`tools/precos.json`](../tools/precos.json). Custo real de cada subagente: `node tools/custo.mjs` (lê o `usage` dos transcritos em `~/.claude/projects/*/<sessão>/subagents/`).

## Baseline (2026-11-16, commit f7f6293)

| Item | Bytes | Tokens ≈ |
| --- | ---: | ---: |
| `CLAUDE.md` | 38 | 11 |
| `AGENTS.md` | 4 000 | 1 143 |
| `PASSAGEM.md` | 84 314 | 24 090 |
| `LEIAME.md` | 44 019 | 12 577 |
| **Leitura obrigatória no início** (os quatro acima) | **132 371** | **≈ 37 800** |
| `docs/specs/*.md` (11 arquivos; a tarefa usa um) | 76 362 | 21 817 |
| `docs/auditoria-visual.md` | 16 843 | 4 812 |
| `docs/mapa.md` | 16 382 | 4 680 |
| `docs/reconstrucao-grafica.md` | 16 818 | 4 805 |
| Saída de `npm test` (169 testes) | 38 243 | 10 927 |
| Saída de `npm run build` | 699 | 200 |

## Depois da Parte 1

| Item | Bytes | Tokens ≈ |
| --- | ---: | ---: |
| `CLAUDE.md` + `AGENTS.md` + `PASSAGEM.md` (obrigatórios) | 12 071 | **≈ 3 450** |
| `docs/mapa-do-codigo.md` (sob demanda) | 5 976 | 1 707 |
| `LEIAME.md` (sob demanda) | 44 019 | 12 577 |
| Saída de `npm run verificar` (testes + build + diff --check) | 74 | 21 |

- Custo fixo de início: **≈ 37 800 → ≈ 3 450 tokens (−91 %)**, meta ≤ 8 000 cumprida.
- Validação: **≈ 11 100 → ≈ 21 tokens** por rodada (`npm run verificar` em vez de `npm test` + `npm run build`).
- O histórico completo do antigo `PASSAGEM.md` está, sem reescrita, em [`docs/historico/2026-11-passagem-ate-pr54.md`](historico/2026-11-passagem-ate-pr54.md).

## Achado: custo de partida de cada subagente

Medido com `tools/custo.mjs` nesta sessão: um subagente `general-purpose` em Haiku escreve **36 mil a 110 mil tokens de cache** antes de trabalhar (prompt do sistema + definição das ferramentas, inclusive as de MCP). Em Haiku isso custa centavos (US$ 0,007–0,026 por tarefa); em Sonnet seria ≈ 20× e em Opus ≈ 40×. Por isso os agentes de `.claude/agents/` declaram só as ferramentas que usam (`tools:`), e tarefas curtas de leitura vão para o `leitor` (Haiku).


## Instrumentos e critério de aceito (Parte 2.1)

- **Portões automáticos:** `node tools/portoes.mjs <base> <teto> <prefixos>` roda `npm run verificar` (inclui `tests/aderecos.test.js`, `tests/planta-catedral.test.js` e o novo `tests/orcamento.test.js`), conta as linhas do diff e lista arquivos fora do escopo.
- **Orçamento por área** (`tests/orcamento.test.js`, Node, sem WebGL): triângulos, objetos e encaixes de modelo com teto de +15 % sobre `tests/orcamento-base.json`; densidade de textura por metro de cada textura procedural dentro de ±10 % da base. Base inicial (Node): vilarejo 68 777 tri / 960 obj / 138 modelos; catedral 34 356 / 339 / 6; estrada 12 634 / 498 / 138; taverna 1 998 / 103 / 38; floresta 117 500 / 253 / 1. Os números de `auditoria-visual.md` (≈ 50 mil triângulos por câmera no Chrome) não são comparáveis em Node e ficam como referência de navegador.
- **Rubrica do revisor** (em `.claude/agents/revisor.md`, nota 0–5, lê só o diff): geometria fecha sem sobreposição; textura/escala coerentes; adereço com motivo e sem bloquear; orientação do jogador; IDs/saves/colisões/combate; sem duplicação nem custo evitável. O revisor nunca é do mesmo modelo do candidato.
- **Aceito:** passa todos os portões e revisor ≥ 4/5.

## Resultado do experimento (2026-11-16)

Modelos: Haiku 5.5, Sonnet 5.5, Opus 5.5 (Fable não foi preciso). Mesmo commit de partida (`dbd659e`), mesmo prompt por tarefa, cada tentativa em worktree isolado. Custo medido com `tools/custo.mjs` (US$, preços de `tools/precos.json`). "Revisão" = revisor Opus médio (Sonnet alto quando o candidato era Opus). **Amostra pequena: 1 execução por célula — indicativo, não estatístico.**

| Tarefa | Célula | Implementação | Revisão | Total | Tempo | Nota | Aceito |
| --- | --- | ---: | ---: | ---: | ---: | :---: | :---: |
| T1 Portão Sul | Haiku médio | 0,05 | 0,43 | 0,48 | 3 min | 3 | não |
| T1 | **Sonnet médio + 1 correção** | 0,44 | 0,59 | **1,03** | 8 min | 4 | **sim** |
| T1 | Sonnet alto | 0,62 | 0,49 | 1,11 | 4 min | 3 | não |
| T1 | Opus médio (controle de teto) | 1,17 | 0,44 | 1,60 | 5 min | 3 | não |
| T2 pausa da Torre | Haiku médio | 0,05 | 0,71 | 0,76 | 3 min | 3 | não |
| T2 | Sonnet médio | 0,35 | 0,36 | 0,71 | 2 min | 2 | não |
| T2 | **Sonnet alto + 1 correção** | 1,64 | 0,67 | **2,31** | 13 min | 4 | **sim** |
| T3 passos (prompt v1) | Haiku médio | 0,07 | 0,57 | 0,64 | 3 min | 3 | não |
| T3 (prompt v1) | Sonnet médio | 0,43 | 0,25 | 0,68 | 1,5 min | 2 | não (prompt ambíguo) |
| T3 (prompt v2) | **Sonnet médio + 2 correções** | 0,81 | 0,47 | **1,28** | 6 min | 5 | **sim** |

Custo por aceito, contando todo o retrabalho da escada: T1 US$ 4,22; T2 US$ 3,78; T3 US$ 2,60. Começando já no degrau recomendado abaixo, seria ≈ US$ 1,0 (T1), 2,3 (T2) e 1,3 (T3). Orquestração (Opus, sessão inteira): ≈ US$ 7,5 até o fim do experimento — o maior custo isolado.

### Fronteira de Pareto (custo × nota, por tarefa)

- T1: Haiku médio (0,48; 3) → **Sonnet médio + correção (1,03; 4)**. Sonnet alto e Opus médio ficam fora (mais caros, nota 3).
- T2: Sonnet médio (0,71; 2) é dominado por Haiku médio (0,76; 3); **Sonnet alto + correção (2,31; 4)** é o único aceito.
- T3: Haiku médio (0,64; 3) → **Sonnet médio + 2 correções (1,28; 5)**.

### O que aprendemos

1. **Nenhuma tentativa passou de primeira** (todas 2–3/5, inclusive Opus médio). O que converte em aceito é **revisão + 1–2 rodadas de correção na mesma tentativa** (continuar o agente custa pouco: o contexto já está em cache). Subir de modelo sem revisar não ajudou em T1.
2. **A revisão custa tanto quanto a implementação** (US$ 0,25–0,71 por revisão Opus). Revise só o candidato que passou nos portões; re-revise só o diff da correção (`git diff HEAD~1`), que custa 3–5× menos.
3. **Prompt ambíguo custa uma célula inteira** (T3 v1). Antes de subir de modelo, confira se o pedido e a rubrica dizem a mesma coisa.
4. **Haiku acha a causa, mas não fecha o trabalho**: em T2 diagnosticou a contagem de luzes antes de Sonnet médio. Bom para investigação/leitura; fraco para correção completa.
5. **Os portões automáticos não medem qualidade**: as 10 tentativas passaram neles; todas as reprovações vieram do revisor. Os erros recorrentes (z-fighting de planos, detalhe no lado invisível, PointLight nova, RNG duplicado) viraram uma lista de checagem no prompt.

### Placar do Gabriel (2.4)

A preencher no link publicado, 2 minutos por vencedor: 1 consigo me orientar? 2 vejo algo quebrado, esticado ou sobreposto? 3 parece da mesma família da nave da Catedral? 4 roda sem engasgar no meu PC? Se reprovar um vencedor, registre o porquê aqui e ajuste a rubrica em `.claude/agents/revisor.md`.

O experimento só se repete quando mudarem os modelos ou os preços.

## Parte 3 com a política nova (2026-11-16)

| Item | Célula | Rodadas de correção | Nota final | PR |
| --- | --- | :---: | :---: | --- |
| (b) praça do poço | Sonnet médio | 1 | 4 | #62 |
| (c) Estrada e Taverna | Sonnet médio | 0 (4/5 de primeira; ajustes finos) | 4 | #61 |
| (d) Floresta Seca | Sonnet médio | 0 (4/5 de primeira; ajustes finos) | 4 | #63 |

Com a lista de erros comuns no prompt, 2 de 3 tarefas de cenário passaram de primeira (no experimento, 0 de 10). Custo total da sessão: subagentes ≈ US$ 15,1; orquestrador (Opus) ≈ US$ 12,4.
