# Mapa do PUGNA

Plano das áreas em metros. O norte é o lado **−Z** (onde ficam a igreja e a lua); o
jogador nasce no Portão Sul (+Z) olhando para o norte. As regras de coesão viram
números em `src/config.js` (`CONFIG.vila` e `CONFIG.arte`) e são conferidas por
`tests/vila.test.js` e `tests/aderecos.test.js`.

## Grafo das áreas

```
                 Catedral do Véu
                        |
              Vilarejo (Portão Sul) ---- Estrada do Sul ---- Taverna
                                               |
                                            Floresta ---- (Castelo, futuro)
```

| Área | Lanterna (ID) | Portais |
| --- | --- | --- |
| `vilarejo` | `portao-sul` (−2,7; 49), `adro-da-igreja` (8,5; −36) | Catedral (porta da igreja), Estrada (Portão Sul, z 55,4) |
| `catedral` | `nave-do-veu` (4,55; 6,55) | Vilarejo (z 8,45) |
| `estrada` | `taverna-da-estrada` | Vilarejo (norte), Taverna (porta), Floresta (sul) |
| `taverna` | — | Estrada |
| `floresta` | `floresta-clareira` | Estrada (norte); o sul fecha na barricada "Trilha interrompida" |

Ainda pendente da spec 05: o portal trancado (`requer`) e os atalhos.

## O vilarejo (132 × 184 m)

### Eixo, praça e ponto focal

- **Eixo principal** (x = 0): Portão Sul (z 56) → triagem (z 37, gargalo marcado pelo
  arco à direita) → praça do poço (0; 0) → rua do adro → **Catedral** (z −48).
  A igreja e as agulhas ficam sempre no fim da reta, com a lua atrás: é o ponto
  focal da vila. O muro da triagem e o poço cortam a linha reta de visão.
- **Rua oeste** e **rua do mercado** (z ≈ 1 a 3) cruzam a praça desencontradas e
  levam aos dois anéis de bairros.
- **Anel oeste:** Bairro dos Estábulos (x ≈ −47, z 13 a 44), descida até o fundo
  (x ≈ −47, z −55 a −3), travessa sul (z −52,5) e Caminho das Urnas (x ≈ −30,
  z −119 a −53).
- **Anel leste:** rua do mercado → Largo da Romaria (x ≈ 48, z −54 a 4) → descida
  (x 43, z −86 a −50) → travessa (z −95).
- **Rua dos fundos** (z −105,7, x −32,5 a 32,5): liga os dois anéis atrás da igreja.
- **Bairro do Portão Leste** (novo): rua de x 3 a 48 em z 48,6 e subida em x 50,7
  (z 6 a 47). Fecha o quadrante sudeste, que era um campo vazio.

### Larguras (`CONFIG.vila.ruas`)

| Classe | Largura | Onde |
| --- | --- | --- |
| Principal | 6,5 m | eixo do Portão Sul ao adro, rua oeste, rua do mercado |
| Secundária | 5,5 m | todas as ruas dos bairros |
| Beco | 3,2 m | passagem do arco da triagem (gargalo marcado) |
| Praça / pátio | livre | praça do poço, adro, mercado, triagem, largo das urnas |

O quickstep anda 2,2 m; com o corpo do caçador, **3 m** é o corredor mínimo
(`CONFIG.vila.corredorMinimo`). O beco tem 3,2 m. Nenhum vão entre paredes por onde
se anda é mais estreito que isso (o teste procura).

### Casas (`CONFIG.vila.tipos`)

| Tipo | Fachada × fundo | Parede | Andares |
| --- | --- | --- | --- |
| Pequena | 7 × 6,5 m | 3,8 m | térrea |
| Média | 8,5 × 7,5 m | 6 m | sobrado |
| Grande | 10,5 × 9 m | 7,2 m | sobrado alto |

Porta 1,2 × 2,2 m, janela 0,95 × 1,15 m, pé-direito 3 m e beiral 0,45 m em todas
(`CONFIG.arte.casa`). As casas são postas por `src/mundo/QuadrasVilarejo.js`:

- **Fileiras** dos dois lados de cada rua principal ou secundária, a 0,6 m da beira,
  com a porta para a rua e o ritmo média, pequena, média, grande, pequena, média.
- Casas da mesma fileira **se encostam**. Quando um lote está ocupado (torre, abrigo,
  rota de patrulha, lanterna, placa), a fileira abre um vão de **pelo menos um beco**.
  Nunca sobra fresta entre duas paredes.
- Se um muro fica logo atrás (menos de um beco), a casa fica mais funda e encosta nele.
- Uma de cada três casas tem janelas acesas (sempre as mesmas).
- Os **arcos de pedra** atravessam as ruas compridas (7 hoje): emolduram a rua e
  cortam a vista de ponta a ponta.
- Os **miolos de quarteirão** recebem ruínas de muro e árvores secas a cada 7 m, longe
  das ruas, das rotas e dos pontos de interação.

### Planta (cada letra = 3 m)

`H` casa · `#` muro, torre, igreja, abrigo · `=` rua principal · `-` rua secundária ·
`:` beco · `.` praça ou pátio · `A` arco · `P` porta da catedral · `L` lanterna ·
`O` poço · `S` nascimento. A coluna da esquerda é o z.

```
 -127 #
 -124
 -121
 -118          HH--HHH
 -115          HH--HHH              HHH
 -112          HH--HHH              HHH
 -109            --
 -106           .----------A-----------
 -103           .----------------------HHH
 -100           .--HH   HHHHHHH        HHH
  -97           .--HH   HHHHHHH   ----------
  -94           .--HH     ####    ----------
  -91           .--       ####      HHHH
  -88          HH--      #######    HHHH
  -85          HH-AHHH   ######       HH  - HH
  -82          HH--HHH   ######        HH - HH
  -79          HH--HHH ##########      HH - HH
  -76          HH--HHH ##########  #   HH - HH
  -73          HH--HHH ##########  #   HH - HH
  -70          HH--HHH   ######        HH - HH
  -67          HH--      #######      HHH - HH
  -64            --HHHH  ######       HHH - HH
  -61       HHHHH--HHHH  #######      HHH -
  -58       HHHHH--HHHH  ######       HHH -
  -55       -----------  #######   .      -
  -52    HH------------  #######   .      ---HHH
  -49    HH--    HH     .###P###   .     HH--HHH
  -46    HH--    HH     ........   .     HH--HHH
  -43    HH--HHH HH     ............     HH--
  -40    HH--HHH        ........           -A
  -37    HH--HHH        ...==...           --
  -34    HH--HHH        HHH==HHH           --HHH
  -31    HH--HHH        HHH==HHH   ##      --HHH
  -28    HH-AHHH        HHH==HHH           --HHH
  -25    HH--HHH        HHH==HHH           --HHH
  -22    HH--           HHH==HHH           --HHH
  -19    HH--           HHH==HHH           --HHH
  -16    HH--              ==HHH           --HHH
  -13   HHH--              ==HHH           --HHH
  -10   HHH-- HHHH         ==              --HHH
   -7   HHH-- HHHHHH     ....... HHHHH HHHH--HHH
   -4      -- HHHHHH     ....... HHHHH HHHH--HHH
   -1      =================O... HHHHH HHHH--HHH
    2      =======A==========.==============-
    5                    .....==============
    8         HHHHHH     ..==.......     HH --HHH
   11         HHHHHH     ..==.......     HH --HHH
   14    HH -            HH==HHH ..         --HHH
   17    HH - HH         HH==HHH ..         --HHH
   20    HH - HH         HH==HHH ..     ##  --HHH
   23       - HH         HH==    ..     ##  --HHH
   26       - HH         HH==......         -AHH
   29    HH - HH    ##     ==......       HH--HH
   32    HH - HH    ##     ==::           HH--HHH
   35    HH - HH HHHHHH      ::             --HHH
   38    HH - HH HHHHHH      ::  HHH     HHH--HHH
   41    HH -              ==::HHHHHHHHHHHHH--
   44       ---------------==. HHHHHHHHHHHHH--
   47                      ==-----------------
   50        HHHHHHHHHH    L=-------A-------
   53        HHHHHHHHHH    =S
   56 #      HHHHHHHHHH  ##==##
```

### Gargalos e pontos fixos

- **Gargalo marcado:** o arco da triagem (beco de 3,2 m em x 5,5, z 31 a 43).
- **Abrigos com interação:** Casa da sineira (−15,9; 7,45) com o baú, Oficina do poço
  (−9,25; −9,65) com a chave da sacristia.
- **Placas e registros:** triagem, mercado, Marco dos Ausentes, Bairro dos Estábulos,
  Largo da Romaria, Caminho das Urnas, lápides da sineira e do aprendiz.
- Rotas de patrulha, lanternas, portais e nascimento **não mudaram** de lugar; as
  fileiras desviam deles (folga de 1,6 m).
