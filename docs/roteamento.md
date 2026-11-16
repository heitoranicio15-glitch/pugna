# Roteamento: qual modelo e esforço usar

Versão provisória (2026-11-16), antes do experimento de custo × qualidade. Será substituída pelo resultado medido em [`custo-qualidade.md`](custo-qualidade.md).

| Classe de tarefa | Subagente | Modelo / esforço | Quando escalar |
| --- | --- | --- | --- |
| Ler, procurar, inventariar, atualizar doc | `leitor` | Haiku / baixo | Resposta errada ou incompleta 2× → Sonnet médio |
| Rodar a verificação | `executor-testes` | Haiku / baixo | Nunca (só relata) |
| Implementar tarefa guiada (cenário, adereços, ajuste de config) | `implementador` | Sonnet / médio | Reprovado 2× pelo mesmo motivo → Sonnet alto → Opus médio |
| Revisar diff contra a rubrica | `revisor` | Opus / médio | Nunca revisa a própria tentativa |
| Bug difícil, shader, desempenho, combate | `depurador` | Opus / alto | Falhou 2× no mesmo erro → Fable médio |

Regra geral: comece no degrau mais barato da linha; falhou duas vezes do mesmo jeito, sobe um degrau.
