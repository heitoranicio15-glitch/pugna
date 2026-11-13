# Protocolo de atualização do PUGNA

Este guia vale para colaboradores e assistentes de IA. Consulte o [LEIAME](LEIAME.md) para rodar o jogo, conhecer os controles e localizar os sistemas.

## Antes de editar

1. Confira `git status --short --branch`, atualize as referências com `git fetch origin` e verifique os PRs abertos no GitHub. Confira se alguém já está mexendo no mesmo sistema.
2. Comece da `origin/main` em uma branch com nome descritivo. Use a branch existente ao continuar um PR. Se houver trabalho local de outra pessoa, preserve-o e use uma cópia de trabalho separada.
3. Registre no PR, assim que ele existir, o objetivo, as áreas afetadas e como testar. Quando dois trabalhos tocarem o mesmo sistema, alinhe a ordem de integração entre os responsáveis.

## Durante a implementação

- Mantenha o PR focado na atualização pedida. Reuse os componentes do jogo e ajuste os valores de combate e renderização em `src/config.js` quando couber. Atualize o `LEIAME.md` ao mudar controles, comportamentos ou instruções de uso.
- Ao criar uma área, declare seu ID, limites, portais, chegadas, checkpoints e patrulhas. Dê IDs únicos a checkpoints e eventos persistentes no formato `area:evento`. Preserve os identificadores já publicados. Se precisar mudar o formato do save, faça a migração e teste com dados antigos. Progresso e preferências usam chaves separadas.
- Para modelos, texturas e áudio, confira a autorização de distribuição pública e registre a origem e a licença em `CREDITOS.md` conforme a informação disponível. Use caminhos compatíveis com a publicação em `/pugna/`.

## Testes, PR e publicação

1. Rode `npm ci`, `npm test`, `npm run build` e `git diff --check`. Para mudanças que afetam a partida, rode `npm run test:browser` e jogue o trecho afetado. O LEIAME explica como instalar ou selecionar o navegador. Mudanças só de documentação pedem conferência dos links e comandos alterados.
2. Registre no PR o que mudou, como reproduzir o fluxo, os testes que realmente rodaram, os pontos ainda pendentes e qualquer impacto em saves ou assets. Antes de integrar, confira se a `main` avançou. Se houver alterações sobrepostas, resolva na branch do PR e repita os testes afetados.
3. Envie a branch e integre pelo pull request quando houver autorização para publicar. A integração na `main` dispara o GitHub Pages. Acompanhe a execução **Publicar o jogo** e abra o endereço público para conferir a versão e o fluxo afetado.
4. Se uma atualização causar regressão em produção, identifique o commit integrado e prepare um PR de reversão com `git revert`. Valide e acompanhe a nova publicação. Registre o motivo da reversão e o que ficou pendente para a próxima tentativa.
