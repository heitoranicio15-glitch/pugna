# Créditos

## Código e arte
Arte e efeitos produzidos no código do projeto:

- **Modelos 3D**: montados com formas simples (caixas, cones, cilindros) em `src/mundo/pecas.js` e `src/entidades/`.
- **Texturas**: pintadas pixel a pixel em `src/render/texturas.js`.
- **Efeitos sonoros**: sintetizados em tempo real em `src/audio/Som.js`.
- **Lua e céu**: desenhados por shaders em `src/mundo/Lua.js` e `src/mundo/Ceu.js`.

## Materiais HD de cenário

O jogo distribui mapas de cor, normal OpenGL e rugosidade de 1K, convertidos
para WebP. Cada conjunto fica numa subpasta de `public/assets/materiais/`.

| Pasta | Autor / site | Licença |
|---|---|---|
| `castle_wall_slates` | Rob Tuytel / [Poly Haven](https://polyhaven.com/a/castle_wall_slates) | CC0 |
| `cobblestone_floor_001` | Rob Tuytel / [Poly Haven](https://polyhaven.com/a/cobblestone_floor_001) | CC0 |
| `old_planks_02` | Rob Tuytel / [Poly Haven](https://polyhaven.com/a/old_planks_02) | CC0 |
| `patterned_slate_tiles` | Dimitrios Savva / [Poly Haven](https://polyhaven.com/a/patterned_slate_tiles) | CC0 |
| `roof_slates_02` | Rob Tuytel / [Poly Haven](https://polyhaven.com/a/roof_slates_02) | CC0 |
| `stony_dirt_path` | eye-candy.xyz / [Poly Haven](https://polyhaven.com/a/stony_dirt_path) | CC0 |

## Materiais HD de personagens

Mapas WebP de 512 × 512. A cor do Caban foi neutralizada para receber as cores
das roupas do jogo.

| Pasta | Autor / site | Licença |
|---|---|---|
| `caban` | colormass e Rico Cilliers / [Poly Haven](https://polyhaven.com/a/caban) | CC0 |
| `fabric_leather_01` | Rob Tuytel / [Poly Haven](https://polyhaven.com/a/fabric_leather_01) | CC0 |
| `Metal032` | [ambientCG](https://ambientcg.com/view?id=Metal032) | CC0 |

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
