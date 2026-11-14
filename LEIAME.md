# PUGNA

Base de um jogo 3D de navegador: ação e exploração, no estilo
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

### Celular e tablet (congelado)

**O celular não é suportado por enquanto.** O jogo ainda abre em aparelhos de
toque e mostra um aviso, mas as mecânicas novas do combate não têm botão de
toque. Jogue no computador, com teclado e mouse. Os controles de toque
continuam guardados no código (`src/interface/Toque.js`) para voltar depois.

### Teclado e mouse

| Ação | Tecla |
|---|---|
| Andar | W A S D |
| Girar a câmera | Mouse |
| Correr | Shift (segurando, em qualquer direção) |
| Pular | Espaço |
| Ataque leve | Clique esquerdo |
| Ataque forte (mais carga, mais dano) | Segurar o clique esquerdo e soltar |
| Visceral / execução | Atacar de frente um inimigo desequilibrado |
| Atirar com a pistola (parry) | Clique direito ou C |
| Travar / soltar a mira | Tab ou botão do meio do mouse |
| Trocar de alvo (mira travada) | Mover o mouse rápido para o lado |
| Esquivar | Ctrl, Alt ou Q (com uma direção, rola; parado, salta para trás; com a mira travada, dá um passo curto, o quickstep) |
| Interagir (portas, selos e lanternas) | E |
| Abrir e fechar a bolsa (o jogo **não** pausa) | I |
| Beber um frasco de cura (leva um instante) | R |
| Tela cheia | F |
| Pausar / soltar o mouse (só o Esc pausa) | Esc |

### Configurações e progresso

**Configurações** está disponível na tela inicial e no menu de pausa. É possível
ajustar o volume da música e dos efeitos separadamente, a sensibilidade do mouse,
o brilho, o gráfico, a pixelização e o tremor dos vértices.

**Gráfico** escolhe o estilo de imagem e troca na hora, sem recarregar:

- **PS1 (retrô)**, o padrão: o visual de sempre, pixelado, com pontilhado, poucas
  cores e tremida dos vértices. Quem nunca mexeu nas configurações vê este.
- **HD**: a mesma cena, menos pixelada (até 720 linhas), sem pontilhado, com
  texturas suavizadas e um pouco mais de cor e contraste. Nesse modo a pixelização
  e o tremor dos vértices ficam cinza e não valem; os valores escolhidos para o PS1
  ficam guardados e voltam ao trocar de novo.

Os números de cada estilo ficam em `CONFIG.render.estilos` (`src/config.js`).
Em **Configurações → Câmera**, escolha **Terceira pessoa** (padrão) ou
**Primeira pessoa** no computador. A câmera e o gráfico são preferências
independentes e ficam salvos ao recarregar. Na primeira pessoa, a espada e a
pistola aparecem nas mãos do caçador e os golpes sem trava seguem o seu olhar
no plano horizontal. **Tab** ou o botão do meio do mouse trava a mira.

O salvamento é no estilo Souls: **o jogo salva sozinho** a cada coisa que
acontece (descansar, recolher, abrir, usar um item, derrotar o Guardião). Não
existe salvar manualmente, e o menu de pausa mostra a última lanterna usada.

Para voltar à última lanterna sem morrer, use um **Osso de Retorno** pela bolsa
(**I**). Ele recupera vida e estamina e repõe os inimigos comuns, como a morte.
Os selos e a vitória sobre o Guardião continuam registrados. O osso é um item
único que o caçador sempre carrega e pode ser usado quantas vezes quiser.

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
- **Pistola (o parry do jogo):** o clique direito (ou **C**) dá um tiro na
  hora, de curto alcance (uns 9 metros), sem bala voando. Ele vai no inimigo da
  mira travada ou, sem trava, no mais próximo à frente; parede no meio segura o
  tiro. Se o tiro pegar o inimigo **no fim do aviso dele ou no comecinho do
  golpe**, é um **parry**: o golpe não entra e ele fica **desequilibrado** (o
  marcador da mira fica vermelho). A janela dura uns 0,13 s no golpe alto e uns 0,08 s no
  pesado. Fora dela o tiro só arranha (pouco dano, não faz cambalear) e o golpe
  entra normalmente. O Guardião se recompõe mais rápido.
- **Visceral:** atacar (leve ou forte) um inimigo desequilibrado **de frente e
  de perto** vira um golpe especial: o caçador cola nele e enfia a espada
  (3,5 vezes o dano do leve), com pausa e tremor de tela. Durante a animação
  ele fica invencível, o golpe não gasta estamina e devolve **toda** a parte
  laranja da vida (rally cheio). Aparece **VISCERAL** na tela.
- **Execução:** se o golpe aparado era um **pesado**, o visceral vira
  execução: 5 vezes o dano do leve, pausa e tremor maiores e um sino mais grave.
  Aparece **EXECUÇÃO**.
- **Crítico:** bater num inimigo desequilibrado de lado ou de longe (sem
  visceral) continua sendo um golpe crítico de 2,6 vezes o dano.
- **Balas:** são 8 (contador acima dos frascos). Todo tiro gasta uma, acertando
  ou não: atirar sem parar não compensa. Elas só voltam ao **descansar** na
  lanterna, ao morrer ou com o Osso de Retorno. Sem bala, a pistola só dá um
  clique seco. Atirar não gasta estamina e tem uma recuperação curta (a esquiva
  corta o fim dela).
- **Não existe bloqueio.** O broquel saiu: contra um golpe, as respostas são o
  tiro no tempo certo, a esquiva ou o pulo (contra a rasteira).
- Tudo gasta **estamina** (barra verde): correr, pular, atacar e esquivar. Sem
  estamina você não ataca nem corre.
- A esquiva te deixa **invencível por um instante** (0,22 s no rolamento). Você pode apertar **Q**
  pouco antes de terminar a recuperação da espada para encaixar a esquiva.
- **Quickstep:** com a mira travada, a esquiva não rola: vira um passo curto e
  rápido na direção apertada (parado, para trás), sem tirar os olhos do inimigo.
  Gasta menos estamina (14 em vez de 22) e volta mais rápido, mas a invencibilidade
  é menor (0,13 s). Sem mira, continua o rolamento.
- Toque e solte para um ataque leve. Ao carregar um ataque forte, o caçador
  ergue a espada e um som sinaliza a carga. O golpe acompanha a passagem da lâmina e
  é interrompido se atingir pedra antes do alvo.
- **Ataque forte carregado:** quanto mais tempo segurando, mais dano (até 1,6
  vez o forte na carga máxima; ao chegar nela o golpe sai sozinho). Com a carga
  **completa** acertando o inimigo **pelas costas**, ele fica desequilibrado e
  abre o visceral (por trás; sem execução).
- O ataque forte **interrompe** o golpe dos inimigos comuns. O ataque leve
  interrompe o caçador corrompido. O Guardião mantém o ataque mesmo ao receber um golpe forte.
- **Apanhar interrompe você.** Se um golpe entrar durante o seu ataque leve, o
  ataque é cortado e o caçador cambaleia um instante: trocar golpe não compensa.
  O ataque forte aguenta um golpe **fraco** só na parte final (da metade do
  preparo até a lâmina passar). Golpes fortes dos inimigos cortam até o forte.
- **Inimigos têm firmeza.** Depois de cambalear uma vez, o inimigo aguenta os
  golpes seguintes por um tempo (ouve-se um tinido seco), quase não sai do
  lugar e revida. Não dá para prender um inimigo só apertando o ataque: bata,
  veja a resposta dele e puna. O golpe pesado não é interrompido pelo ataque leve.
- **Rally (revide):** quando você apanha, parte da vida perdida fica **laranja**
  na barra por uns 4 segundos. Cada golpe que você acerta nesse tempo devolve
  um pedaço dela (o forte devolve mais). Se o tempo acabar, a parte laranja
  some.
- **Frasco de cura:** beber leva um instante. O caçador anda devagar, não ataca
  e, se apanhar antes de terminar, a cura é interrompida (o frasco não é gasto).
  Afaste-se antes de beber: quem está lutando com você e a até uns 7 m
  costuma **punir o gole** (avança na hora com o golpe mais rápido que tem; o
  Guardião pune sempre).
- **Em grupo, no máximo 2 atacam juntos.** Os outros inimigos comuns ficam
  rondando a uns 4,5 m, andando de lado e encarando, esperando a vez. Quando um
  termina a sequência, cambaleia, é aparado ou morre, a vez passa para quem
  esperava. O Guardião não espera a vez.
- **A bolsa não pausa o jogo.** Com ela aberta, o mundo continua e o caçador
  fica parado. Só o **Esc** pausa.
- **Cavaleiro:** lento e forte. Usa os três tipos de ataque e às vezes emenda um
  golpe alto com um pesado **atrasado**. Esquive ou saia de lado e puna.
- **Caçador:** rápido, dá dois golpes seguidos e pula para trás, solta rasteiras
  e às vezes fecha os dois golpes com uma rasteira.
- **Penitente:** dois golpes seguidos, rasteira, um golpe pesado e às vezes três
  golpes seguidos (alto, alto **atrasado** e pesado).

### Os tipos de ataque dos inimigos

Todo golpe inimigo tem três fases: **preparo** (o aviso), **golpe ativo** (a arma
pode acertar) e **recuperação** (ele fica aberto, é a hora de bater). Cada tipo
avisa de um jeito e pede uma resposta diferente:

| Tipo | Como reconhecer | Melhor resposta |
|---|---|---|
| **Alto** | Ergue a arma acima da cabeça; tinido de metal | Tiro de pistola no fim do aviso (parry) ou esquivar |
| **Pesado** | Arma atrás da cabeça, corpo arqueado; arma e olhos **vermelhos**; sino grave | Tiro de pistola com a janela mais curta, ou esquivar |
| **Rasteira** | Agacha com a arma de lado; arma e olhos **amarelos**; aço raspando e dois estalos | **Pular** (**Espaço**). É larga e pega quem está de lado. O tiro não apara (só arranha e gasta a bala) |

A esquiva serve contra os três, mas não dá recompensa. Aparar o golpe alto abre
o **visceral**; aparar o pesado abre a **execução**, que causa ainda mais dano.

**Ninguém bate como um metrônomo.** O aviso de cada golpe dura um pouco mais ou
um pouco menos a cada vez (até 12%). Alguns golpes são **atrasados**: o inimigo
ergue a arma e **segura** a pose antes de bater. O som toca no começo, como
sempre, então quem atira no ritmo decorado erra o parry: espere a arma descer.
A mesma sequência de golpes nunca sai três vezes seguidas.
- Ao morrer você volta à última **lanterna** em que descansou. Descansar recupera
  vida, estamina e balas e faz os inimigos comuns reaparecerem.

## Catedral do Véu

Aproxime-se do portal ao norte do vilarejo e pressione **E**. A nave tem uma
lanterna à direita da entrada. Explore o **Ossário**, a oeste, e o **Relicário**,
a leste. Recolha com **E** o selo de cada ala para abrir a grade do **Santuário**.
A **Galeria dos Nomes** liga o lado oeste da entrada ao fundo do Ossário e
permite voltar à nave por outra arcada. No Santuário, dois degraus levam ao altar.
O **Guardião do Véu** usa golpes altos, pesados e rasteiras. Quando perde
metade da vida, ruge, fica invencível por 1 segundo e se afasta um passo. Na
**fase final** ele não pode ser vencido só com parry: a maior parte dos golpes
acende a arma e os olhos em **branco-violeta** e toca um sino grave duplo, que
cresce ao contrário. Esses golpes (a varrida dupla e um pesado que segura a pose)
**não podem ser aparados**: o tiro gasta a bala e só arranha. A resposta é a
esquiva ou o quickstep. Os outros golpes da fase (rasteira + alto, alto + alto)
seguem as regras de sempre, e o desequilíbrio depois de um parry dura só 0,9 s.
Para voltar ao vilarejo, use **E** na porta ao sul da nave.

O jogo guarda neste navegador a última lanterna usada, os dois selos e a derrota
do Guardião. Selos e derrota são salvos assim que acontecem. A lanterna determina
onde você volta ao morrer ou reabrir o jogo.

### Exploração e bolsa

- **Vila:** saindo do Portão Sul em direção ao poço, contorne o muro pelo arco
  de triagem à direita. Depois do arco, a travessa a leste passa pelas bancas
  do mercado e volta à praça. A oeste ficam o baú da Casa da Sineira e a
  chave na Oficina do Poço. No adro, procure a abertura na cerca do cemitério.
- **Catedral:** procure as inscrições no Ossário e no Relicário. A chave da
  oficina abre a porta ao sul do Relicário. Dentro da sacristia há uma inscrição,
  um frasco e uma alavanca que abre a grade de serviço para a lanterna da nave.
- **História:** leia o aviso da triagem, as contas do mercado, as lápides e os
  registros para descobrir o que aconteceu na noite do segundo toque. As
  anotações ficam na bolsa.
- **Taverna:** o bilhete na mesa é uma anotação (vai para a bolsa); o taverneiro responde
  a **E — falar**.
- Chegue perto do objeto, virado para ele, e pressione **E** quando aparecer a ação. Use
  **I** para abrir a bolsa e reler anotações (o jogo não pausa). Um frasco recupera até 42 pontos
  de vida e pode ser usado pela bolsa ou com **R** durante a partida. A cura leva um
  instante e é interrompida se o caçador apanhar.
- O **Osso de Retorno** fica na bolsa e não acaba. Usar leva o caçador
  à última lanterna em que descansou (ou ao Portão Sul, se ainda não descansou).
- O navegador guarda itens, anotações, frascos usados e o estado de portas,
  baús e da grade. Morrer, descansar ou recarregar preserva esses registros.

## Estrada e taverna

Saia pelo **Portão Sul** do vilarejo (aproxime-se do portão e pressione **E**) para
chegar à **Estrada do Sul**: uma faixa de terra batida de uns 120 × 30 m, com cercas,
árvores secas, um riacho com ponte de pedra e três inimigos em patrulha. O céu e a lua
aparecem como no vilarejo. A ponta sul está fechada por uma **carroça tombada** ("Em
obras"): é por ali que as áreas novas vão entrar. Na ponta norte, **E** volta ao vilarejo.

Do lado esquerdo da estrada fica a **taverna**: fachada de madeira e pedra, janelas
acesas, placa pendurada e chaminé soltando fumaça. Perto da porta há uma **lanterna**
(descanse com **E**; ao morrer ou recarregar a página, o caçador volta a ela). Na
porta, **E — entrar na taverna**.

Dentro (12 × 9 m, sem inimigos) há balcão, três mesas, barris, uma escada que não leva a
lugar nenhum e uma lareira de luz laranja que tremula. No balcão, o **taverneiro**:
**E — falar** mostra uma fala curta por vez, em rodízio (ele não vende nada por enquanto).
Numa das mesas há um **bilhete**, que se lê com **E** como as outras anotações e fica na bolsa.
Para sair, **E** na porta ao sul. Os tamanhos, a névoa, a luz da lareira e as falas
ficam em `CONFIG.areas.estrada` e `CONFIG.areas.taverna` (`src/config.js`).

## O que existe hoje

- Vilarejo gótico pequeno: ruas de pedra, 17 casas, torres, cemitério, muralha,
  tochas e névoa.
- **Catedral** ao norte: fachada com torres, rosácea e vitrais. O portal leva à
  nave, ao Ossário, ao Relicário e ao Santuário.
- **Estrada do Sul** e **taverna** (saída pelo Portão Sul): estrada com ponte, patrulhas e
  uma carroça tombada que ainda fecha o caminho; taverna com lareira, taverneiro e um
  bilhete para ler.
- Céu noturno roxo-azulado com nuvens, estrelas e a **lua com rosto**: ela ocupa boa
  parte do céu, está sempre visível (a nordeste, ao lado das torres), tem um
  sorriso aberto com dentes tortos à mostra, vira o rosto e as pupilas na direção do
  jogador, e quando é encarada por alguns segundos os olhos acendem e a boca abre mais.
- Filtro PS1: baixa resolução ampliada sem suavização, texturas "nearest", tremida
  de vértices, dithering e redução de cores. Ambos os modos têm barris facetados
  com cintas e tapete ornamentado na taverna.
- Em **Configurações → Gráfico → HD**, pedra, terra e madeira ganham materiais
  escaneados que reagem à luz. A **Resolução HD** vai de 720p a 2160p, limitada
  à área visível e ao navegador. Comece em 720p; para 4K, use uma tela 4K em
  tela cheia e um desktop com GPU. A escolha fica salva neste navegador.
- Nas duas versões, as casas têm guarnições de madeira e ferragens visíveis
  de perto, a rosácea da catedral tem nervuras, o riacho tem ondas e a lareira
  tem arco e cornija. O HD também usa ardósia escaneada nos telhados e nas lajes.
- Cada área tem uma paleta própria nos dois modos. O vilarejo tem bruma violeta,
  a estrada puxa para o azul-esverdeado, os vitrais da catedral projetam feixes
  e a taverna tem luz quente e fagulhas na lareira.
- Movimento com colisão; dá para subir em caixotes e degraus. A câmera em terceira
  pessoa encurta ao encostar em paredes. A primeira pessoa acompanha os olhos.
- Caçador com chapéu, capa com pregas, espada e pistola animados no código.
  Os inimigos têm armaduras facetadas e viseiras que acendem nos avisos de
  golpe. O modo HD acrescenta materiais de tecido, couro e aço.
- Combate com ataque leve, forte, esquiva com rolamento (quickstep com a mira travada), estamina, mira travada,
  pistola com parry, balas limitadas, golpe crítico, visceral, execução e
  ataque forte que cresce com a carga.
- Regras contra o spam: apanhar interrompe o ataque, inimigos com firmeza,
  rally (recuperar vida revidando), frasco com tempo e bolsa que não pausa.
- Cavaleiro, caçador, penitente e Guardião do Véu, com patrulha e combate.
- Ataques inimigos de três tipos (alto, pesado e rasteira), cada um com aviso
  visual e sonoro próprio.
- Vida, tela de morte e quatro lanternas de descanso (portão sul, adro, nave e taverna da estrada).
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
├─ docs/specs/             uma página por tarefa futura (ver a Fila no PASSAGEM.md)
├─ public/assets/trilha/   faixas do vilarejo, da catedral e do Guardião
└─ src/
   ├─ main.js              ponto de entrada
   ├─ config.js            ★ TODOS os números ajustáveis: cores, velocidades, dano...
   ├─ nucleo/
   │  ├─ Jogo.js           junta tudo e roda o laço principal; estados do jogo
   │  ├─ Entrada.js        teclado e mouse (e o toque, congelado)
   │  ├─ Eventos.js        "quadro de avisos" entre as partes do jogo
   │  └─ Salvamento.js     salva o progresso (hoje no navegador; depois Supabase)
   ├─ render/
   │  ├─ RenderizadorRetro.js  baixa resolução + dithering; definirEstilo('ps1'|'hd')
   │  ├─ retro.js          tremida de vértices PS1
   │  ├─ texturas.js       texturas pixeladas feitas no código (filtro troca no HD)
   │  └─ materiaisHd.js    variantes PBR carregadas ao selecionar HD
   ├─ mundo/
   │  ├─ Vilarejo.js       ★ o MAPA: onde fica cada casa, tocha, inimigo, lanterna
   │  ├─ areas.js          registro das áreas: uma linha por área nova
   │  ├─ Catedral.js       nave, alas, selos e santuário
   │  ├─ Estrada.js        estrada ao sul, ponte, carroça e a fachada da taverna
   │  ├─ Taverna.js        interior da taverna, lareira e taverneiro
   │  ├─ pecas.js          como construir casa, torre, igreja, tocha, árvore...
   │  ├─ Colisores.js      colisões
   │  ├─ Ceu.js            céu, nuvens, estrelas
   │  └─ Lua.js            a lua com rosto e o "olhar" dela
   ├─ entidades/
   │  ├─ Jogador.js        movimento, câmera, mira travada, vida, estamina e combate
   │  ├─ Boneco.js         o boneco do caçador em terceira pessoa (só animação)
   │  ├─ Arma.js           mãos, espada e pistola para a câmera em primeira pessoa
   │  ├─ Inimigo.js        aparência, patrulha e combate dos inimigos
   │  ├─ Ataques.js        fases e tipos de ataque (a máquina única dos inimigos)
   │  ├─ Fichas.js         quantos inimigos atacam ao mesmo tempo (fichas de ataque)
   │  └─ Lanterna.js       ponto de descanso
   ├─ audio/Som.js         sons sintetizados
   └─ interface/
      ├─ Hud.js            barras, avisos, telas
      └─ estilo.css        aparência da interface
```

### Onde mexer para…
- **mudar dano, velocidade, vida, cores e nível de pixelado:** `src/config.js`
- **mudar a atmosfera de uma área:** `CONFIG.areas` em `src/config.js`
  reúne a névoa, a cor de fundo, a luz ambiente e a paleta de céu dos exteriores.
- **mudar a distância da câmera ou o alcance da mira:** blocos `camera` e `mira`
  em `src/config.js`
- **mudar a pistola** (balas, dano, alcance, janela do parry, tempo de
  desequilíbrio): bloco `combate.pistola` em `src/config.js`. A janela de cada
  tipo de golpe é multiplicada por `janelaAparar` em `combate.ataquesInimigos`.
  A regra que prende a janela à fase do golpe é `naJanelaDeAparo` em
  `src/entidades/Ataques.js`
- **mudar a esquiva ou o quickstep** (custo, duração, invencibilidade,
  velocidade, espera): blocos `combate.esquiva` e `combate.quickstep` em
  `src/config.js`
- **mudar o visceral, a execução ou a carga do forte:** blocos
  `combate.visceral`, `combate.execucao` e `combate.carga` em `src/config.js`
  (o crítico comum fica em `combate.critico`)
- **mudar quantos inimigos atacam juntos ou a punição do frasco:** blocos
  `combate.grupo` e `combate.punirFrasco` em `src/config.js` (o Guardião tem
  `chefe: true`, que dispensa a ficha, e `punirFrasco: { chance: 1 }`)
- **mudar a aparência ou as poses do caçador:** `src/entidades/Boneco.js`
- **mudar o mapa** (mover casa, pôr tocha, pôr inimigo): `src/mundo/Vilarejo.js`
  (a estrada e a taverna ficam em `Estrada.js` e `Taverna.js`; o que o taverneiro diz,
  em `CONFIG.areas.taverna.taverneiro.falas`)
- **mudar o título do jogo:** `titulo` em `src/config.js`
- **mudar o rosto da lua:** função `relevoLua` em `src/mundo/Lua.js`
- **criar um inimigo novo:** um bloco novo em `CONFIG.inimigos` + aparência em
  `montarCorpo` (`src/entidades/Inimigo.js`)
- **mudar quais ataques um inimigo usa:** a lista `ataques` do inimigo em
  `CONFIG.inimigos` (cada item é uma sequência de golpes com um `peso`)
- **mudar dano, tempo de aviso ou largura de um tipo de ataque:** bloco
  `combate.ataquesInimigos` em `src/config.js`
- **mudar a variação do aviso:** `combate.imprevisibilidade.variacaoPreparo`;
  **golpe atrasado:** escreva o golpe da sequência como
  `{ tipo: 'pesado', atraso: 0.35 }` em `CONFIG.inimigos`
- **golpe que não pode ser aparado:** escreva o golpe como
  `{ tipo: 'pesado', aparavel: false, aviso: 'inaparavel' }` (qualquer campo do
  tipo pode ser trocado assim); a cor fica em `combate.avisosInimigos`
- **mudar a fase final do Guardião:** `CONFIG.inimigos.guardiao.faseFinal`
  (sequências, `desequilibrio` e `virada`: invencibilidade e passo para trás)
- **mudar as regras contra o spam:** blocos `combate.interrupcao` (apanhar corta
  o ataque), `combate.atordoamentoInimigo` (firmeza), `combate.rally` e
  `combate.frasco` em `src/config.js`
- **mudar a pose de aviso de um tipo de ataque:** os casos `preparo` e `ativo`
  em `src/entidades/Inimigo.js`; os sons ficam em `src/audio/Som.js`

### Como o código está preparado para o futuro
- **Multiplayer (Supabase Realtime):** as partes do jogo conversam por avisos
  (`Eventos.js`: `jogador:golpe`, `inimigo:morreu`…). Um módulo de rede só precisa
  escutar esses avisos e usar `jogador.exportarEstado()`. Os outros jogadores entram
  como mais uma lista em `Jogo.js`, igual a `this.inimigos`.
- **Salvar no Supabase:** escreva uma classe com os métodos `carregar()` e
  `salvar(dados)` (iguais aos de `SalvamentoLocal`) e troque uma linha em `Jogo.js`.
- **Mapa maior / outras áreas:** área nova = uma classe com os campos do contrato
  (`id`, `nome`, `limites`, `nevoa`, `luzJogador`, `usaCeu`, `portais`, `chegadas`,
  `pontosDeDescanso` e `inimigos`) + uma linha no `REGISTRO` de `src/mundo/areas.js`;
  o `Jogo.js` não precisa mudar. `luzJogador` é a força da luz que acompanha o
  caçador (valor em `CONFIG.areas`) e `usaCeu` diz se a área mostra o céu e a lua.
  O registro confere tudo ao iniciar e avisa se algo estiver errado. Cada portal
  aponta para o ID da área de destino, que declara a posição de chegada.
  A estrada e a taverna foram acrescentadas só com duas classes e duas linhas no
  registro (o portal do Portão Sul no vilarejo é um portal comum).
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
- [x] Primeira pessoa opcional no menu de câmera do computador
- [x] Boneco facetado do caçador com capa, botas, chapéu e armas remodelados
- [ ] Trocar sons sintetizados por gravações CC0; música ambiente
- [x] Menu de configurações e opção de apagar o progresso
- [x] Salvamento estilo Souls e Osso de Retorno
- [x] Travar a mira no inimigo e aparar (parry) com golpe crítico
- [x] Base dos ataques: fases e tipos (alto, pesado, rasteira) com avisos próprios
- [x] Contra o spam: interrupção ao apanhar, firmeza dos inimigos, rally, frasco
      com tempo e bolsa sem pausa
- [x] Pistola como parry, com balas (o broquel saiu do combate)
- [x] Golpe visceral, execução e ataque forte carregado
- [x] Quickstep (esquiva curta com a mira travada)
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
- No PS1, o padrão são 270 linhas de altura ampliadas na tela. No HD, o alvo
  respeita o limite de pixels equivalente ao preset em 16:9.
- Abrir o jogo com `?teste` no endereço (`http://localhost:5173/?teste`) deixa jogar
  sem prender o mouse; serve para testes automáticos.
- No console do navegador (F12), a variável `jogo` dá acesso a tudo
  (ex.: `jogo.jogador.vida = 100`).
- Histórico de mudanças: `git log`.

## Testes

- `npm test` verifica a janela de acerto, o custo da esquiva, o quickstep com a mira, o tiro de pistola
  (janela do parry, balas, parede, alcance), o golpe crítico, o visceral, a execução e a carga do forte, as fases e os tipos de ataque dos inimigos, o golpe inaparável e a fase final do Guardião, as fichas de ataque (no máximo 2 atacando juntos) e a punição do frasco, a interrupção ao apanhar,
  a firmeza dos inimigos, o rally, o frasco interrompido, a mira travada, a câmera em terceira pessoa, colisões, navegação,
  interação com objetos, inventário, Osso de Retorno e migração de saves. O
  `tests/areas.test.js` também monta as quatro áreas de verdade (sem navegador) e confere
  o contrato, os portais e chegadas, a estrada aberta até a carroça, a lanterna e o bilhete.
- `npx playwright-core install chromium` instala o navegador de teste.
  Em seguida, `npm run test:browser` inicia o jogo e percorre a catedral,
  incluindo transições, checkpoint, morte, recarga e derrota do Guardião.
  Também testa o percurso da vila até a sacristia, o frasco com tempo, o rally,
  a bolsa sem pausa, o Osso de Retorno, o contador de balas (atirar baixa,
  descansar repõe), o dano do forte com carga, um visceral no Guardião, a
  virada de fase e o aviso do golpe inaparável, e o atalho após recarregar. Ele também
  atravessa os portais do Portão Sul e da taverna, lê o bilhete, fala com o taverneiro
  e descansa na lanterna nova.
  O cenário de celular está congelado e saiu dos testes obrigatórios. Para
  conferi-lo mesmo assim, rode `npm run test:celular`.
  Para usar um Chrome instalado, aponte `PUGNA_CHROME` para o executável.
  O `npm run test:celular` hoje falha porque ainda espera o bloqueio, que saiu
  na Etapa B (o celular está congelado; o teste fica como está).
  Para testar outro endereço, use `npm run test:browser -- <URL>`.
