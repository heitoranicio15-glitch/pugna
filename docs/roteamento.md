# Roteamento: qual modelo e esforço usar

Medido em 2026-11-16 com Haiku 5.5, Sonnet 5.5 e Opus 5.5 (detalhes e ressalvas em [`custo-qualidade.md`](custo-qualidade.md)). Refazer quando mudarem modelos ou preços.

## Fluxo padrão de uma tarefa

1. **Implementar** no degrau inicial da tabela, com o prompt da tarefa + a lista de erros comuns (abaixo).
2. `node tools/portoes.mjs <base> <teto> <escopo>` até passar.
3. **Revisar** com o `revisor` (nunca o mesmo modelo do candidato).
4. Nota < 4: devolver as correções do revisor **à mesma tentativa** (SendMessage), até 2 rodadas; re-revisar só `git diff HEAD~1`.
5. Ainda < 4 depois de 2 rodadas, ou falhou 2 vezes pelo mesmo motivo: **sobe um degrau** e recomeça do passo 1.

## Tabela

| Classe de tarefa | Degrau inicial | Depois | Revisão |
| --- | --- | --- | --- |
| Leitura, inventário, docs | `leitor` Haiku baixo | Sonnet médio | não |
| Rodar verificação | `executor-testes` Haiku baixo | — | não |
| Cenário/acabamento guiado (adereços, materiais) | `implementador` Sonnet médio | Sonnet alto → Opus médio | Opus médio |
| Áudio/interface/ajuste sem número de combate | `implementador` Sonnet médio | Sonnet alto → Opus médio | Opus médio |
| Bug difícil, desempenho, shader, combate | `depurador` Sonnet alto | Opus médio → Opus alto → Fable médio | Opus médio (Sonnet alto se o candidato for Opus) |
| Diagnóstico barato antes de um bug difícil | Haiku médio (só investigar, não corrigir) | — | não |

## Lista de erros comuns (colar no prompt de cenário)

- Plano de chão na mesma altura de outro ou com `renderOrder` menor que o chão por baixo (z-fighting).
- Detalhe no lado que o jogador não vê; peça maior que o colisor; peça a 1–5 mm de outra.
- `PointLight` nova (muda a contagem de luzes e causa pausa de shader): use chama/halo e mancha de luz.
- Gerador aleatório próprio (use `criarSorteio`); material duplicado por peça.
- Assimetria sem motivo; rota que não liga às vizinhas.

## Custo esperado por tarefa aceita (referência)

Cenário ≈ US$ 1,0; áudio ≈ US$ 1,3; bug difícil ≈ US$ 2,3 (implementação + revisões). O orquestrador em Opus é o maior custo: mantenha relatórios curtos e delegue cedo.
