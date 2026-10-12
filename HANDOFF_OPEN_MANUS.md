# TruckDeck — handoff completo do redesign `modern`

## Objetivo do trabalho

Assumir e refazer o skin `modern` (`eu_frame`) nas duas orientações. O resultado atual foi rejeitado visualmente pelo usuário e deve ser tratado como uma implementação provisória, não como direção aprovada.

O alvo é um painel de caminhão premium e fotorealista: couro/plástico moldado, recessos físicos, telas OLED pretas integradas e botões automotivos com profundidade real. Não transformar em uma interface web plana.

## Regra principal do projeto

Leia `AI_GUIDELINES.md` integralmente antes de editar. Este projeto é HTML/CSS/JavaScript simples, sem framework. A telemetria chega por SSE. Faça alterações cirúrgicas e nunca substitua `public/app.js` por inteiro.

Depois de qualquer alteração em `public/`, execute obrigatoriamente:

```text
node tools/build.js
```

Confira o resultado gerado em `dist/preview.html`. Não edite `public/index.html` ou `dist/preview.html` manualmente.

## Local do projeto

```text
C:\Users\caeta\Desktop\TruckDeck
```

O diretório não possui `.git`. Há vários backups locais na raiz, que podem ser usados para comparar versões anteriores.

## Escopo visual aprovado pelo usuário

### Horizontal

- Fundo: `public/skins/modern/bg-landscape.jpg`, derivado de `edited-image (6).jpg`.
- Duas telas OLED pequenas no topo.
- Tela esquerda: condução/OBD, com velocidade e marcha persistentes, odômetro e telemetria crítica do caminhão sem duplicações.
- Tela direita: utilidades/infotainment, incluindo música/mídia, mensagens recebidas, temperatura ambiente e relógio, usando somente campos já existentes no contrato.
- A área inferior deve conter os grupos de botões organizados horizontalmente.
- O usuário pediu que todos os botões horizontais usem a aparência desta referência:
  `C:\Users\caeta\Pictures\ETS@\Botoes\image.jpg`
- Cópia atualmente servida: `public/skins/modern/button-horizontal.jpg`.
- Os botões obrigatórios Save, Map e Enter devem ficar sempre ancorados no canto superior direito.

### Vertical

- Fundo: `public/skins/modern/bg-portrait.jpg`, derivado de `image (1).jpg`.
- A tela OLED superior deve usar toda a área de tela.
- Velocidade e marcha ficam no centro, grandes e persistentes.
- RPM digital horizontal abaixo do centro.
- Telemetria OBD e viagem organizada ao redor, sem inventar campos.
- O pequeno recesso imediatamente abaixo da tela deve permanecer totalmente vazio.
- Bloco principal de botões no recesso largo central.
- Blocos de freio/retarder e utilidades nos dois recessos inferiores.
- O usuário pediu dois formatos visuais no vertical:
  - quadrado: `C:\Users\caeta\Pictures\ETS@\Botoes\image (2).jpg`
  - vertical: `C:\Users\caeta\Pictures\ETS@\Botoes\image (7).jpg`
- Cópias atualmente servidas:
  - `public/skins/modern/button-portrait-square.jpg`
  - `public/skins/modern/button-portrait-vertical.jpg`

## Mapeamento obrigatório dos botões

### Bloco superior vertical

Linha 1:

1. Start/Stop
2. Parking Brake
3. Hazard/Alert
4. Lights
5. High Beam
6. Beacon

Linha 2:

1. Wipers
2. Wipers Off
3. Lane Assist
4. Toggle Lane Assist
5. Emergency Brake

O pedido dizia 12 botões, mas enumerava apenas 11 nessa grade. A implementação provisória preencheu as posições restantes com funções existentes (`light_horn` e `horn`). Confirme a intenção visual pelo catálogo antes de consolidar; não invente ação nova.

### Bloco inferior esquerdo, 3 x 3

1. Engine Brake (-), Engine Brake Toggle, Engine Brake (+)
2. Retarder (-), Retarder Toggle/Auto, Retarder (+)
3. Trailer, Trailer Brake, Differential Lock

### Bloco inferior direito, 3 x 3

1. Cruise -, Cruise/Set, Cruise Resume
2. Front Cab Up, Rear Cab Up, Reset Trailer
3. Front Cab Down, Rear Cab Down, Mirrors

### Sistema

As três ações já existentes são:

- `quick_save`
- `world_map`
- `activate`

Devem ficar no canto superior direito. Não criar estado local ou telemetria para elas.

## Arquitetura implementada até agora

### `public/frames.js`

Foram adicionados os arrays `upperFns`, `brakeFns`, `utilityFns` e `modernSystem()`. Ambos os cortes `T` e `P` recebem os mesmos grupos funcionais.

O corte horizontal tem `gps` à esquerda e `rtext` de mídia/utilidades à direita. O corte vertical tem um `gps` principal. Verifique todos os campos exibidos contra o contrato existente antes de mudar a tela.

### `public/app.js`

`mountModernGrids(p)` cria contêineres CSS Grid para `upper`, `brakes`, `utility` e `system`, movendo os botões renderizados para dentro desses grupos.

Foi corrigido um bug que apagava a classe `k-modern` dos botões durante a renderização. O trecho correto mantém a classe quando `page().skin === 'eu_frame'`.

Não remova essa correção sem substituir o mecanismo de montagem, porque a ausência de `k-modern` fez todos os botões desaparecerem.

### `public/app.css`

O bloco principal do skin começa aproximadamente na linha 150. Os grids modernos começam aproximadamente na linha 233.

Todos os seletores específicos deste trabalho devem permanecer escopados sob:

```text
#app[data-style="eu_frame"] #panel.skin.eu-modern .w.sk.k-modern
```

O pedido original dizia usar `.w.sk.k-modern` para evitar vazamento para outros skins.

O Start/Stop (`data-fn="engine"`) já tem uma moldura metálica CSS adicional. Preserve uma moldura claramente mais forte e realista que as demais.

## Estado atual rejeitado

A implementação mais recente:

- colocou os 12 botões horizontais superiores em uma única fileira;
- colocou cada grupo horizontal de nove botões em uma única fileira;
- aplicou `button-horizontal.jpg` a todo botão horizontal;
- aplicou o botão quadrado no bloco vertical superior;
- aplicou o botão vertical nos dois blocos inferiores;
- usou a imagem como `background-size: 100% 100%` em vários casos.

O usuário respondeu: **“ficou muito ruim”**. Não faça pequenos ajustes sobre essa composição esperando aprovação. Reavalie proporção, recorte, densidade, legibilidade dos ícones, espaço entre botões e integração com os recessos físicos.

Prováveis causas visuais:

1. As imagens de referência incluem grande área quadriculada que não é transparência real; usar o JPG inteiro como fundo de cada botão traz o tabuleiro para dentro da interface.
2. `background-size: 100% 100%` distorce o botão.
3. Doze botões em uma única linha ficam estreitos demais.
4. As imagens precisam ser recortadas para a peça física antes do uso, idealmente gerando PNG/WebP com transparência real e margens consistentes.
5. Os botões devem se encaixar nos recessos da arte de fundo e manter tamanho útil para toque.

## Próximo passo recomendado

1. Inspecione as imagens originais e recorte cada botão até os limites externos da moldura.
2. Remova o fundo quadriculado de verdade e exporte recursos com alpha.
3. Monte primeiro uma prova visual apenas com os botões e recessos, sem mexer na telemetria.
4. Use `object-fit: contain` ou `background-size: contain`, mantendo a proporção original.
5. Distribua os botões em duas ou três fileiras no horizontal, conforme o espaço físico e o tamanho de toque.
6. No vertical, determine por geometria quais células recebem botão quadrado ou vertical; não estique nenhum recurso.
7. Confira o painel nas dimensões horizontal e vertical e só então finalize tipografia/ícones.
8. Execute `node tools/build.js` e valide `dist/preview.html`.

## Regras de desempenho e telemetria

- Use `text-shadow` para o brilho OLED.
- Não use `filter: drop-shadow` em velocidade, RPM ou outros elementos que atualizam rapidamente.
- Não invente campos de telemetria ou estados locais.
- `renderPanel()` só para alterações estruturais.
- `updateStates()` atualiza texto/classes por frame e não deve reconstruir DOM.

## Arquivos principais para revisar

- `AI_GUIDELINES.md`
- `public/frames.js`
- `public/app.js`
- `public/app.css`
- `public/catalog.js`
- `public/skins/modern/`
- `tools/build.js`
- `dist/preview.html` (somente conferir)

## Referências originais fornecidas

Fundos:

- `C:\Users\caeta\Downloads\scania_2025_digital\edited-image (6).jpg`
- `C:\Users\caeta\Downloads\scania_2025_digital\image (1).jpg`

Coleção de botões:

- `C:\Users\caeta\Pictures\ETS@\Botoes\`

Capturas do problema anterior:

- `C:\Users\caeta\AppData\Local\Temp\codex-clipboard-a3bc3aaa-88ca-4d3d-bc6e-588de9f0e206.png`
- `C:\Users\caeta\AppData\Local\Temp\codex-clipboard-1898485b-5ffe-4a79-9ba1-adffbf6fd4a4.png`

## Critério de conclusão

O trabalho só está pronto quando:

- os botões aparecem nas duas orientações;
- os recursos não estão distorcidos nem mostram o fundo quadriculado;
- os grupos respeitam os recessos físicos;
- Speed/Gear permanecem sempre visíveis;
- não há telemetria duplicada;
- Save/Map/Enter ficam no canto superior direito;
- o recesso pequeno vertical permanece vazio;
- somente o skin `modern` é afetado;
- `node tools/build.js` termina com sucesso;
- `dist/preview.html` foi inspecionado nas duas orientações.
