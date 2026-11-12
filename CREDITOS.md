# Créditos

## Código e arte
Todo o conteúdo desta fase foi feito no próprio código do projeto:

- **Modelos 3D**: montados com formas simples (caixas, cones, cilindros) em `src/mundo/pecas.js` e `src/entidades/`.
- **Texturas**: pintadas pixel a pixel em `src/render/texturas.js`.
- **Sons**: sintetizados em tempo real em `src/audio/Som.js` (não há arquivos de áudio).
- **Lua e céu**: desenhados por shaders em `src/mundo/Lua.js` e `src/mundo/Ceu.js`.

Nenhum asset de terceiros foi baixado até agora. A pasta `public/assets` está vazia de propósito.

## Bibliotecas
| Biblioteca | Para quê | Licença |
|---|---|---|
| [Three.js](https://threejs.org) | motor 3D | MIT |
| [Vite](https://vitejs.dev) | servidor de desenvolvimento | MIT |

## Referências visuais
As imagens da pasta `referencias/` servem só como guia de clima, cor e composição.
Elas **não** fazem parte do jogo e não devem ser distribuídas com ele.

## Como registrar assets novos
Ao baixar um modelo, textura ou som (somente licença **CC0** ou equivalente), guarde em
`public/assets/` e acrescente uma linha aqui:

| Arquivo | Autor / site | Link | Licença |
|---|---|---|---|
| _exemplo: public/assets/modelos/barril.glb_ | _Kenney_ | _https://kenney.nl/..._ | _CC0_ |
