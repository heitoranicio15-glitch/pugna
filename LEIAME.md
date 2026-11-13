# PUGNA

Base de um jogo 3D de navegador: ação e exploração em terceira pessoa, no estilo
souls-like, num vilarejo gótico, à noite, com visual retrô estilo PS1. Você é um caçador que enfrenta
cavaleiros e caçadores corrompidos, sob uma **lua enorme com rosto** que não tira
os olhos de você.

> Para atualizar o jogo em equipe, consulte o [protocolo de colaboração](AGENTS.md).

---

## Como rodar o jogo

Você precisa do **Node.js** (versão 20 ou mais nova): https://nodejs.org

**Jeito fácil (Windows):** dê dois cliques em `jogar.bat`. Na primeira vez ele baixa
as dependências (precisa de internet) e depois abre o jogo no navegador.

**Jeito manual:** abra um terminal dentro desta pasta e rode:

```
npm install      (só na primeira vez)
npm run dev
```

Depois abra no Chrome o endereço que aparecer, normalmente **http://localhost:5173**

Para parar o jogo, feche a janela preta do terminal (ou aperte Ctrl+C nela).

### Manter a pasta atualizada

Dê dois cliques em `atualizar.bat` para baixar a versão mais nova da `main` no
GitHub, incluindo o que os outros colaboradores integraram. O `jogar.bat` faz
essa checagem sozinho antes de abrir o jogo. Se você estiver numa branch com
trabalho ainda não integrado, ou sem internet, nada é alterado e o jogo abre
na versão que já estava na pasta.

## Publicar para os amigos jogarem (GitHub Pages)

O arquivo `.github/workflows/publicar.yml` monta e publica o jogo após uma integração
na `main`.

**Só na primeira vez:**
1. Crie uma conta grátis em https://github.com
2. Instale o **GitHub Desktop** (https://desktop.github.com) e entre com a sua conta.
3. No GitHub Desktop: *File → Add local repository* → escolha a pasta `pugna`.
4. Clique em **Publish repository**. Desmarque "Keep this code private" (o GitHub
   Pages gratuito só funciona em repositório público) e confirme.
5. No site do GitHub, abra o repositório → **Settings → Pages** → em "Source" escolha
   **GitHub Actions**.
6. Aba **Actions** → "Publicar o jogo" → **Run workflow**. Espere ficar verde (~1 min).
7. O jogo estará em `https://SEU-USUARIO.github.io/pugna/`. Mande esse link aos amigos.

**A cada atualização:** no GitHub Desktop, crie uma branch a partir da `main`
atualizada, registre as alterações nessa branch e abra um pull request. Depois
da integração, acompanhe **Publicar o jogo** na aba **Actions** e confira a
versão online. Veja os passos de validação e reversão no [protocolo](AGENTS.md).

A pasta `referencias/` fica de fora do GitHub de propósito (está no `.gitignore`):
são imagens de outros autores.

## Git (histórico de versões)

O projeto foi construído com um commit por etapa. Para ligar esse histórico na sua
pasta, instale o **Git** (https://git-scm.com) e dê dois cliques em
`configurar-git.bat` **uma única vez**. Ele cria o repositório e importa o histórico
que está em `historico-git.bundle`. Depois disso, `git log` mostra as etapas e você
(ou a IA do próximo chat) pode continuar fazendo commits normalmente.

## Controles

### Celular e tablet

Abra o jogo no navegador e toque em **Começar**. Arraste o direcional esquerdo
para andar e empurre-o até a borda na direção da frente para correr. Deslize o
dedo na parte direita da tela para girar a câmera. Os dois gestos podem ser usados
ao mesmo tempo.

Use **Atacar** com um toque para o golpe leve ou segure e solte para o forte.
Segure **Bloquear** para manter a guarda. **Mira** trava a câmera no inimigo
(toque de novo para soltar; deslize rápido o dedo para trocar de alvo) e
**Aparar** tenta aparar o golpe. Os botões **Pular**, **Esquiva**,
**Bolsa** e **Pausa** ficam na tela. **Interagir** aparece perto de uma ação
disponível, e **Cura** aparece quando há frascos na bolsa. O Osso de Retorno é
usado pela **Bolsa**.

O jogo funciona na vertical e na horizontal. Na horizontal há mais espaço para
ver o cenário. Ao trocar de aba ou aplicativo, o jogo pausa.

### Teclado e mouse

| Ação | Tecla |
|---|---|
| Andar | W A S D |
| Girar a câmera | Mouse |
| Correr | Shift (segurando, em qualquer direção) |
| Pular | Espaço |
| Ataque leve | Clique esquerdo |
| Ataque forte | Segurar o clique esquerdo e soltar |
| Bloquear | Segurar o clique direito |
| Aparar (parry) | C |
| Travar / soltar a mira | Tab ou botão do meio do mouse |
| Trocar de alvo (mira travada) | Mover o mouse rápido para o lado |
| Esquivar | Ctrl, Alt ou Q (com uma direção, rola; parado, salta para trás) |
| Interagir (portas, selos e lanternas) | E |
| Abrir a bolsa | I |
| Usar um frasco de cura | R |
| Tela cheia | F |
| Pausar / soltar o mouse | Esc |

### Configurações e progresso

**Configurações** está disponível na tela inicial e no menu de pausa. É possível
ajustar o volume da música e dos efeitos separadamente, a sensibilidade do mouse,
o brilho, a pixelização e o tremor dos vértices.

O salvamento é no estilo Souls: **o jogo salva sozinho** a cada coisa que
acontece (descansar, recolher, abrir, usar um item, derrotar o Guardião). Não
existe salvar manualmente, e o menu de pausa mostra a última lanterna usada.

Para voltar à última lanterna sem morrer, use um **Osso de Retorno** pela bolsa
(**I**). Ele recupera vida e estamina e repõe os inimigos comuns, como a morte.
Os selos e a vitória sobre o Guardião continuam registrados. O caçador começa
com um osso e encontra mais dois entre as lápides do cemitério. Cada osso só
pode ser usado uma vez.

**Apagar progresso** pede confirmação e limpa a partida do navegador. As
preferências de áudio, imagem e controles continuam salvas.

**Atenção com o Ctrl:** no Chrome, Ctrl+W fecha a aba, e isso não pode ser desligado
por um site. O jogo pede confirmação antes de fechar se o Ctrl estiver apertado, e em
**tela cheia (F)** o atalho deixa de fechar a aba. Se preferir não arriscar, use **Q**
ou **Alt** para esquivar.

### Como o combate funciona
- A câmera fica atrás do caçador. Ele anda na direção que você aponta em
  relação à câmera e os golpes saem para onde o **corpo** está virado. Parado
  e sem mira travada, o golpe se volta sozinho ao inimigo que estiver colado.
- **Mira travada:** a câmera acompanha o inimigo marcado, o caçador o encara e
  passa a andar de lado em volta dele. A trava pula para o próximo inimigo
  quando o alvo cai e se solta se ele ficar longe ou atrás de uma parede.
  Sem inimigo por perto, o botão só recentraliza a câmera atrás do caçador.
- **Aparar:** aperte **C** um instante antes de o golpe inimigo chegar. Se
  acertar o tempo, você não leva dano e o inimigo fica **desequilibrado** (o
  marcador da mira fica vermelho). O próximo golpe nele é **crítico** e causa
  2,6 vezes o dano. Se errar o tempo, o golpe entra inteiro: aparar não bloqueia.
  Só vale para golpes que chegam de frente. O Guardião se recompõe mais rápido.
- Tudo gasta **estamina** (barra verde): correr, pular, atacar, esquivar e aguentar
  golpes no bloqueio. Sem estamina você não ataca nem corre.
- Bloquear só funciona com o corpo **de frente** para o inimigo. Se a estamina acabar no bloqueio,
  a guarda quebra e você fica atordoado.
- A esquiva te deixa **invencível por um instante**. Você pode apertar **Q**
  pouco antes de terminar a recuperação da espada para encaixar a esquiva.
- Toque e solte para um ataque leve. Ao carregar um ataque forte, o caçador
  ergue a espada e um som sinaliza a carga. O golpe acompanha a passagem da lâmina e
  é interrompido se atingir pedra antes do alvo.
- O ataque forte **interrompe** o golpe dos inimigos comuns. O ataque leve
  interrompe o caçador. O Guardião mantém o ataque mesmo ao receber um golpe forte.
- **Cavaleiro:** lento, forte, ergue a espada devagar. Esquive ou saia de lado e puna.
- **Caçador:** rápido, dá dois golpes seguidos e pula para trás. Bloqueie e revide.
- Ao morrer você volta à última **lanterna** em que descansou. Descansar recupera
  vida e estamina e faz os inimigos comuns reaparecerem.

## Catedral do Véu

Aproxime-se do portal ao norte do vilarejo e pressione **E**. A nave tem uma
lanterna à direita da entrada. Explore o **Ossário**, a oeste, e o **Relicário**,
a leste. Recolha com **E** o selo de cada ala para abrir a grade do **Santuário**.
O **Guardião do Véu** passa a atacar com dois golpes laterais quando perde
metade da vida. A posição da maça e dois sons diferentes sinalizam a sequência.
Para voltar ao vilarejo, use **E** na porta ao sul da nave.

O jogo guarda neste navegador a última lanterna usada, os dois selos e a derrota
do Guardião. Selos e derrota são salvos assim que acontecem. A lanterna determina
onde você volta ao morrer ou reabrir o jogo.

### Exploração e bolsa

- **Vila:** a Casa da Sineira fica a oeste da praça e tem um baú com dois frascos.
  A Oficina do Poço tem uma chave e um registro na bancada. O cemitério tem
  lápides que podem ser lidas e dois Ossos de Retorno no chão, ao lado delas.
- **Catedral:** procure as inscrições no Ossário e no Relicário. A chave da
  oficina abre a porta ao sul do Relicário. Dentro da sacristia há uma inscrição,
  um frasco e uma alavanca que abre a grade de serviço para a lanterna da nave.
- Chegue perto do objeto, virado para ele, e pressione **E** quando aparecer a ação. Use
  **I** para abrir a bolsa e reler anotações. Um frasco recupera até 42 pontos
  de vida e pode ser usado pela bolsa ou com **R** durante a partida.
- O **Osso de Retorno** fica na bolsa, em Consumíveis. Usar um leva o caçador
  à última lanterna em que descansou (ou ao Portão Sul, se ainda não descansou).
- O navegador guarda itens, anotações, frascos e ossos usados e o estado de portas,
  baús e da grade. Morrer, descansar ou recarregar preserva esses registros.

## O que existe hoje

- Vilarejo gótico pequeno: ruas de pedra, 17 casas, torres, cemitério, muralha,
  tochas e névoa.
- **Catedral** ao norte: fachada com torres, rosácea e vitrais. O portal leva à
  nave, ao Ossário, ao Relicário e ao Santuário.
- Céu noturno roxo-azulado com nuvens, estrelas e a **lua com rosto**: ela ocupa boa
  parte do céu, está sempre visível (a nordeste, ao lado das torres), tem um
  sorriso aberto com dentes tortos à mostra, vira o rosto e as pupilas na direção do
  jogador, e quando é encarada por alguns segundos os olhos acendem e a boca abre mais.
- Filtro PS1: baixa resolução ampliada sem suavização, texturas "nearest", tremida
  de vértices, dithering e redução de cores.
- Movimento em terceira pessoa com colisão; dá para subir em caixotes e degraus.
  A câmera gira em volta do caçador e encurta ao encostar em paredes.
- Boneco simples do caçador (chapéu, capa, espada e broquel), animado no código.
- Combate com ataque leve, forte, bloqueio, esquiva com rolamento, estamina,
  mira travada, aparo e golpe crítico.
- Cavaleiro, caçador, penitente e Guardião do Véu, com patrulha e combate.
- Vida, tela de morte e três lanternas de descanso (portão sul, adro e nave).
- Efeitos sintetizados e quatro faixas de música para exploração e combate.
- Tela inicial.

> **Mudança de rumo registrada:** a ideia original tinha um gigante encapuzado no
> horizonte. Ele foi **removido** e substituído pela lua com rosto (inspirada na
> `referencias/ref04_lua_com_rosto.jpg`). Não existe mais código do gigante.

## Organização das pastas

```
pugna/
├─ index.html              página do jogo (telas e barras em HTML)
├─ .github/workflows/      publicação automática no GitHub Pages
├─ jogar.bat               atalho para rodar no Windows
├─ atualizar.bat           baixa a versão mais nova da main (o jogar.bat chama sozinho)
├─ configurar-git.bat      liga o histórico do Git (rodar uma vez)
├─ LEIAME.md               este arquivo
├─ CREDITOS.md             origem de bibliotecas e assets
├─ referencias/            imagens-guia de estilo (não fazem parte do jogo)
├─ public/assets/trilha/   faixas do vilarejo, da catedral e do Guardião
└─ src/
   ├─ main.js              ponto de entrada
   ├─ config.js            ★ TODOS os números ajustáveis: cores, velocidades, dano...
   ├─ nucleo/
   │  ├─ Jogo.js           junta tudo e roda o laço principal; estados do jogo
   │  ├─ Entrada.js        teclado e mouse
   │  ├─ Eventos.js        "quadro de avisos" entre as partes do jogo
   │  └─ Salvamento.js     salva o progresso (hoje no navegador; depois Supabase)
   ├─ render/
   │  ├─ RenderizadorRetro.js  baixa resolução + dithering
   │  ├─ retro.js          tremida de vértices PS1
   │  └─ texturas.js       texturas pixeladas feitas no código
   ├─ mundo/
   │  ├─ Vilarejo.js       ★ o MAPA: onde fica cada casa, tocha, inimigo, lanterna
   │  ├─ Catedral.js       nave, alas, selos e santuário
   │  ├─ pecas.js          como construir casa, torre, igreja, tocha, árvore...
   │  ├─ Colisores.js      colisões
   │  ├─ Ceu.js            céu, nuvens, estrelas
   │  └─ Lua.js            a lua com rosto e o "olhar" dela
   ├─ entidades/
   │  ├─ Jogador.js        movimento, câmera, mira travada, vida, estamina e combate
   │  ├─ Boneco.js         o boneco do caçador em terceira pessoa (só animação)
   │  ├─ Inimigo.js        aparência, patrulha e combate dos inimigos
   │  └─ Lanterna.js       ponto de descanso
   ├─ audio/Som.js         sons sintetizados
   └─ interface/
      ├─ Hud.js            barras, avisos, telas
      └─ estilo.css        aparência da interface
```

### Onde mexer para…
- **mudar dano, velocidade, vida, cores, névoa, nível de pixelado:** `src/config.js`
- **mudar a distância da câmera, o alcance da mira ou a janela do aparo:**
  blocos `camera`, `mira` e `combate.aparar` em `src/config.js`
- **mudar a aparência ou as poses do caçador:** `src/entidades/Boneco.js`
- **mudar o mapa** (mover casa, pôr tocha, pôr inimigo): `src/mundo/Vilarejo.js`
- **mudar o título do jogo:** `titulo` em `src/config.js`
- **mudar o rosto da lua:** função `relevoLua` em `src/mundo/Lua.js`
- **criar um inimigo novo:** um bloco novo em `CONFIG.inimigos` + aparência em
  `montarCorpo` (`src/entidades/Inimigo.js`)

### Como o código está preparado para o futuro
- **Multiplayer (Supabase Realtime):** as partes do jogo conversam por avisos
  (`Eventos.js`: `jogador:golpe`, `inimigo:morreu`…). Um módulo de rede só precisa
  escutar esses avisos e usar `jogador.exportarEstado()`. Os outros jogadores entram
  como mais uma lista em `Jogo.js`, igual a `this.inimigos`.
- **Salvar no Supabase:** escreva uma classe com os métodos `carregar()` e
  `salvar(dados)` (iguais aos de `SalvamentoLocal`) e troque uma linha em `Jogo.js`.
- **Mapa maior / outras áreas:** declare `id`, `nome`, `limites`, `portais`,
  `chegadas`, `pontosDeDescanso` e `inimigos` na classe do mapa. Cada portal
  aponta para o ID da área de destino, que declara a posição de chegada.
  Os checkpoints usam IDs únicos. Eventos persistentes usam `area:evento`,
  e a área pode implementar `aplicarProgresso(progresso)` para atualizar
  obstáculos ou outros elementos do cenário.
- **Assets de verdade (Kenney, Quaternius):** as "peças" estão isoladas em `pecas.js`
  e `montarCorpo`; dá para trocar uma de cada vez por modelos `.glb`.

## Roadmap (o que falta)

**Polimento da fase 1**
- [ ] Testar e ajustar o "peso" do combate jogando de verdade (tempos em `config.js`)
- [x] Inimigos contornam obstáculos e procuram a última posição visível
- [x] Paredes bloqueiam a detecção inicial e golpes
- [x] Câmera em terceira pessoa com boneco simples do caçador
- [ ] Boneco do caçador mais detalhado (hoje é feito de caixas)
- [ ] Trocar sons sintetizados por gravações CC0; música ambiente
- [x] Menu de configurações e opção de apagar o progresso
- [x] Salvamento estilo Souls e Osso de Retorno
- [x] Travar a mira no inimigo e aparar (parry) com golpe crítico
- [ ] Combate menos genérico: golpe pelas costas, sequências de ataques, armas
      com ritmos diferentes
- [x] Interior da catedral
- [ ] Interior de algumas casas

**Próximas fases**
- [ ] Mais seres cósmicos no horizonte que mudam o céu e as cores (`Ceu.definirPaleta`)
- [ ] Salvar progresso no Supabase (login simples)
- [ ] Multiplayer para ~5 amigos se verem (Supabase Realtime)
- [x] Bolsa e frascos de cura
- [ ] Armas diferentes
- [ ] Mapa maior com áreas ligadas (floresta, castelo, caverna)
- [x] Primeiro miniboss, o Guardião do Véu
- [ ] Modelos e animações de verdade (Blender ou pacotes CC0)

## Notas técnicas
- **Chão e ruas não gravam profundidade** (`depthWrite: false`) e são desenhados
  primeiro, em ordem fixa. Motivo: com a tremida de vértices, superfícies enormes e
  quase coladas "piscavam" ao andar. Qualquer piso plano novo deve seguir o mesmo
  esquema (veja o comentário em `Vilarejo.js`). Consequência: nada pode ficar abaixo
  do nível do chão esperando ser escondido por ele.
- Three.js + Vite + JavaScript puro (sem TypeScript, para facilitar a leitura).
- O jogo é desenhado em 270 linhas de altura e ampliado; é muito leve para qualquer
  placa de vídeo atual.
- Abrir o jogo com `?teste` no endereço (`http://localhost:5173/?teste`) deixa jogar
  sem prender o mouse; serve para testes automáticos.
- No console do navegador (F12), a variável `jogo` dá acesso a tudo
  (ex.: `jogo.jogador.vida = 100`).
- Histórico de mudanças: `git log`.

## Testes

- `npm test` verifica a janela de acerto, o custo da esquiva, o aparo e o golpe
  crítico, a mira travada, a câmera em terceira pessoa, colisões, navegação,
  interação com objetos, inventário, Osso de Retorno e migração de saves.
- `npx playwright-core install chromium` instala o navegador de teste.
  Em seguida, `npm run test:browser` inicia o jogo e percorre a catedral,
  incluindo transições, checkpoint, morte, recarga e derrota do Guardião.
  Também testa o percurso da vila até a sacristia, o Osso de Retorno e o
  atalho após recarregar.
  A suíte inclui um cenário de celular emulado com gestos multitoque.
  Para usar um Chrome instalado, aponte `PUGNA_CHROME` para o executável.
  Para testar outro endereço, use `npm run test:browser -- <URL>`.
