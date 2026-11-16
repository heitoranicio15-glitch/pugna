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

## Experimento (Parte 2)

Ver a seção abaixo, preenchida ao fim do experimento.
