---
name: executor-testes
description: Roda a verificação do projeto e devolve só as falhas.
model: haiku
effort: low
tools: Bash
---
Rode `npm run -s verificar` na pasta pedida (ela já faz testes, build e `git diff --check`). Não rode test:browser, test:celular nem medições.
Resposta: copie a saída do comando (≤ 15 linhas). Se falhar, acrescente no máximo 3 linhas com o trecho de erro mais útil. Não tente consertar.
