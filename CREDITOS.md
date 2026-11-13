# Créditos

## Código e arte
Arte e efeitos produzidos no código do projeto:

- **Modelos 3D**: montados com formas simples (caixas, cones, cilindros) em `src/mundo/pecas.js` e `src/entidades/`.
- **Texturas**: pintadas pixel a pixel em `src/render/texturas.js`.
- **Efeitos sonoros**: sintetizados em tempo real em `src/audio/Som.js`.
- **Lua e céu**: desenhados por shaders em `src/mundo/Lua.js` e `src/mundo/Ceu.js`.

## Trilha sonora

As quatro faixas vieram do ZIP fornecido pelo colaborador, que confirmou a autorização
de publicação. Os arquivos de origem não trazem título nem autoria nos metadados.

| Arquivo em `public/assets/trilha/` | Uso no jogo |
|---|---|
| `vilarejo.mp3` | Exploração do vilarejo |
| `catedral.mp3` | Exploração da catedral |
| `guardiao.mp3` | Primeira fase do Guardião do Véu |
| `guardiao-fase-final.mp3` | Segunda fase do Guardião do Véu |

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
