# Créditos

## Código e arte
Arte e efeitos produzidos no código do projeto:

- **Modelos 3D**: montados com formas simples (caixas, cones, cilindros) em `src/mundo/pecas.js` e `src/entidades/`.
- **Texturas**: pintadas pixel a pixel em `src/render/texturas.js`.
- **Efeitos sonoros**: sintetizados em tempo real em `src/audio/Som.js`.
- **Lua e céu**: desenhados por shaders em `src/mundo/Lua.js` e `src/mundo/Ceu.js`.

## Modelos 3D distribuídos

Os GLBs estão em `public/assets/modelos/`. Os encaixes, rotações, tons e
materiais de algumas superfícies são aplicados pelo jogo.

| Arquivos | Origem | Licença |
|---|---|---|
| `rgs-*.glb` | Raphael Gonçalves (RGS Dev), [Sketchfab](https://sketchfab.com/3d-models/free-modular-low-poly-dungeon-pack-31f2e88017574702bb2c1c1e286dc747). Peças convertidas do FBX que o autor publicou no [OpenGameArt](https://opengameart.org/content/free-modular-low-poly-dungeon-pack). | CC0 |
| `Well`, `MarketStand_*`, `Bench_1`, `Barrel`, `Crate`, `Fence`, `Cart` | Quaternius, [Medieval Village Pack](https://quaternius.com/packs/medievalvillage.html). | CC0 |
| `CommonTree_Dead_*` | Quaternius, [Ultimate Nature Pack](https://quaternius.com/packs/ultimatenature.html). | CC0 |
| `Sword`, `Helmet*`, `Hammer_Double` | Quaternius, [Animated Knight Pack](https://quaternius.com/packs/knightcharacter.html) e [Modular Weapons Pack](https://quaternius.com/packs/medievalweapons.html). Os GLBs do Quaternius vieram da conversão [quaternius-showcase](https://github.com/trebeljahr/quaternius-showcase/tree/0128ca5/public/glb). | CC0 |
| `table_medium`, `torch`, `torch_mounted`, `banner_thin_red`, `rubble_half`, `shelf_large`, `key` | Kay Lousberg, [KayKit Dungeon Remastered](https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0/tree/b0ca9bd). | CC0 |
| `pistola-pugna`, `cais-madeira`, `estaca-cais`, `banco-peixes`, `ancora-rio` | Quaternius, [Pirate Kit no Sketchfab](https://sketchfab.com/3d-models/pirate-kit-70-models-52af2bc5ac5846ff84a0d671b897c0a2). Edição [CC0 do autor](https://quaternius.com/packs/piratekit.html), obtida pelo [espelho Open Assets](https://github.com/openassetsarchive/open-assets/releases/tag/pack-quaternius-pirate-kit-11e5f28f6330) e empacotada em GLB. | CC0 |
| `barco-rio`, `Bags`, `Hay`, `Cauldron`, `Package_1`, `Rock_Moss_*`, `Willow_Dead_3`, `Plant_3`, `Grass_2`, `WoodLog_Moss`, `Lilypad`, `Book2_Open`, `Book3_Closed`, `Chalice`, `Scroll`, `Pouch` | Quaternius, [Ships Pack](https://quaternius.com/packs/ships.html), [Medieval Village](https://quaternius.com/packs/medievalvillage.html), [Ultimate Nature](https://quaternius.com/packs/ultimatenature.html) e [Ultimate RPG](https://quaternius.com/packs/ultimaterpg.html). Conversão do quaternius-showcase. | CC0 |
| `bottle_A_green`, `bottle_B_brown`, `plate_food_A`, `plate_food_B`, `plate_stack`, `candle_triple`, `box_stacked`, `banner_patternC_brown`, `shelf_small_candles` | Kay Lousberg, [KayKit Dungeon Remastered](https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0/tree/b0ca9bd). | CC0 |
| `scary-doctor.glb` | atomizr, [Scary doctor character](https://sketchfab.com/3d-models/scary-doctor-character-778f51c354084d0eabf9a73cd5d024df). Taverneiro. Texturas redimensionadas e reexportação para o jogo. | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `mulher-encapuzada.glb` | Purple.Point, [Terrifying Hooded Horror Woman](https://sketchfab.com/3d-models/terrifying-hooded-horror-woman-f59d17be392f4494a5b85d927df48ffd). Patrulhas do vilarejo. Texturas redimensionadas e animação adaptada às poses do jogo. | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `cavaleiro-negro.glb` | Pigcraft, [Dark Knight – Spiked Black Armored Warrior](https://sketchfab.com/3d-models/dark-knight-spiked-black-armored-warrior-e2447a48b07c4f7f925356dd73e63ca6). Guardião do Véu. Redução de malha e texturas, esqueleto e pesos novos. | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `bruxo-cacador.glb` | Pigcraft, [Witch Hunter in Long Coat and Wide Hat](https://sketchfab.com/3d-models/witch-hunter-in-long-coat-and-wide-hat-7688bbfe0b2e4375a5175c145404abf1). Personagem jogável. Redução de malha e texturas, esqueleto e pesos novos. | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `alma-das-cinzas.glb` | Vasian-Digital3D, [Dark Souls](https://sketchfab.com/3d-models/dark-souls-b7a14e347ab04a188b07fe30f1ffaaf0), modelo de Soul of Cinder de Dark Souls III. Patrulhas do vilarejo. Rotação, ajuste de material, redução de texturas e adaptação das poses para o PUGNA. | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) indicada na página do modelo |

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
Ao baixar um modelo, textura ou som com permissão de redistribuição, guarde em
`public/assets/` e acrescente uma linha aqui:

| Arquivo | Autor / site | Link | Licença |
|---|---|---|---|
| _exemplo: public/assets/modelos/barril.glb_ | _Kenney_ | _https://kenney.nl/..._ | _CC0_ |
