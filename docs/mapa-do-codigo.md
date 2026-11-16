# Mapa do código

Use este mapa para localizar cada sistema; os nomes são exports ou métodos principais.

## Núcleo e jogo
- `src/main.js` — ponto de entrada — `Jogo`
- `src/nucleo/Jogo.js` — laço, estados e painéis — `Jogo`, `pausar`, `retomar`
- `src/nucleo/Entrada.js` — teclado, mouse e toque — `Entrada`
- `src/nucleo/Eventos.js` — barramento de eventos — `Eventos`
- `src/nucleo/Inventario.js` — itens, munição e frascos — `ITENS`, `contarFrascos`
- `src/nucleo/Progressao.js` — chaves e portais — `areasAlcancaveis`
- `src/nucleo/Salvamento.js` — save local e normalização — `SalvamentoLocal`
- `src/nucleo/Preferencias.js` — preferências do jogador — `carregarPreferencias`
- `src/nucleo/enquadramento.js` — câmera e mira — `seguirPonto`, `focoDaMira`

## Entidades e combate
- `src/entidades/Jogador.js` — controle, mira e combate — `Jogador`, `atirar`
- `src/entidades/Inimigo.js` — IA, estados e golpes — `Inimigo`, `golpear`
- `src/entidades/Boneco.js` — corpo visual e transparência — `Boneco`
- `src/entidades/Arma.js` — armas de fogo e corpo a corpo — `Arma`
- `src/entidades/Ataques.js` — sequências e janelas de golpe — `MaquinaDeAtaque`
- `src/entidades/Fichas.js` — limite de atacantes simultâneos — `Fichas`
- `src/entidades/Furtividade.js` — percepção e ataque pelas costas — `percebe`
- `src/entidades/Lanterna.js` — fontes de luz do mundo — `Lanterna`
- `src/entidades/Npc.js` — NPCs e falas — `Npc`, `criarNpcs`
- `src/entidades/ModeloDePersonagem.js` — montagem de personagens — `modeloDePersonagem`
- `src/entidades/ModelosDeArma.js` — modelos das armas — `montarModelosDeArma`
- `src/entidades/formas.js` — geometrias básicas — `caixa`, `lamina`

## Mundo e áreas
- `src/mundo/areas.js` — registro e validação de áreas — `REGISTRO`, `validarArea`
- `src/mundo/Vilarejo.js` — vila e progresso local — `Vilarejo`
- `src/mundo/BairrosVilarejo.js` — bairros da vila — `montarBairrosVilarejo`
- `src/mundo/QuadrasVilarejo.js` — quadras e lotes — `montarQuadras`
- `src/mundo/ExploracaoVilarejo.js` — objetos exploráveis da vila — `montarExploracaoVilarejo`
- `src/mundo/PortaoSul.js` — portão sul — `montarPortaoSul`
- `src/mundo/Estrada.js` — estrada e taverna — `Estrada`
- `src/mundo/Rio.js` — rio e ponte — `montarRio`
- `src/mundo/Taverna.js` — interior da taverna — `Taverna`
- `src/mundo/Floresta.js` — floresta e trilha — `Floresta`
- `src/mundo/Bosque.js` — árvores e recorte do bosque — `plantarBosque`
- `src/mundo/PaisagemExterior.js` — paisagem externa — `paisagemExterior`
- `src/mundo/Espolios.js` — baús e armas no mundo — `montarEspoliosCatedral`
- `src/mundo/Pressagios.js` — corvos e tochas — `Pressagios`
- `src/mundo/Ceu.js` — céu e paleta — `Ceu`
- `src/mundo/Lua.js` — lua e shader — `Lua`
- `src/mundo/Atmosfera.js` — névoa e clima por área — `Atmosfera`
- `src/mundo/Colisores.js` — colisão e alturas — `Colisores`
- `src/mundo/Navegacao.js` — caminhos entre pontos — `Navegacao`
- `src/mundo/Interacoes.js` — alvo da mira e interação — `alvoProximo`
- `src/mundo/Decoracao.js` — decoração de vila e catedral — `decorar`
- `src/mundo/Aderecos.js` — placas, frascos e chaves — `placa`, `chave`
- `src/mundo/pecas.js` — arcos, abóbadas e lotes — `arcoOgival`, `LoteDeCenario`
- `src/mundo/efeitosCenario.js` — feixes, fagulhas e sombras — `feixeDeLuz`

## Catedral
- `src/mundo/Catedral.js` — classe principal da catedral — `Catedral`
- `src/mundo/PlantaCatedral.js`, `NiveisCatedral.js`, `KitCatedral.js`, `AcabamentoCatedral.js`, `FerragensCatedral.js`, `CenasCatedral.js`, `CoroEAbside.js`, `RefeitorioECabido.js`, `CapelaEArquivo.js`, `AlasDosSelos.js`, `BronzeECripta.js`, `Sacristia.js` — planta, níveis, salas e acabamentos — `plantaTerreo`, `montarKit`, `montarSacristia`

## Render
- `src/render/RenderizadorRetro.js` — renderização e estilos — `RenderizadorRetro`
- `src/render/retro.js` — material retrô e pontilhado — `retro`
- `src/render/modelos.js` — carrega modelos prontos — `carregarModelo`
- `src/render/texturas.js` — texturas procedurais — `prepararTextura`
- `src/render/materiaisHd.js` — materiais HD por área — `MateriaisHd`

## Interface
- `src/interface/Hud.js` — vida, balas e avisos — `Hud`
- `src/interface/Menu.js` — menus e opções — `Menu`
- `src/interface/Bolsa.js` — inventário e leituras — `Bolsa`
- `src/interface/Toque.js` — controles de toque — `Toque`

## Áudio
- `src/audio/Som.js` — efeitos sonoros — `Som`
- `src/audio/Ambiente.js` — ambiência por área — `Ambiente`
- `src/audio/Trilha.js` — trilha musical e fades — `Trilha`
- `src/audio/regras.js` — faixas e planejador de sons — `FAIXAS`, `criarPlanejador`

## Config
- `src/config.js` — valores de jogo, render e combate — `CONFIG`

## Testes
- `tests/aderecos.test.js` — adereços com apoio válido
- `tests/areas.test.js` — validação e montagem das áreas
- `tests/atmosfera.test.js` — névoa e transição de atmosfera
- `tests/audio.test.js` — sons, trilha e planejador
- `tests/contraste.test.js` — contraste de cores por área
- `tests/equilibrio.test.js` — equilíbrio das lutas
- `tests/jogabilidade.test.js` — fluxos de combate
- `tests/npc.test.js` — NPCs e falas
- `tests/planta-catedral.test.js` — caminhos na planta
- `tests/progressao.test.js` — progresso e portais
- `tests/vila.test.js` — vila e exploração
- `tests/catedral.mjs` — teste de navegador
- `tests/equilibrio.mjs` — simulação de lutas por cenário
- `tests/mobile.mjs` — validação de celular (opcional)
- `tests/fotos-camera.mjs` — fotos da câmera
- `tests/medir-cenario.mjs` — medição de cenário
- `tests/medir-quadro.mjs` — medição de quadro
- `tests/medir-percurso-catedral.mjs` — medição de percurso na catedral
