# Truck Deck - Fluxo de Produção e Mapeamento de Painéis

Este documento define as regras absolutas e a esteira de produção para a criação, aprovação e lançamento de novos painéis (skins/dashboards) no aplicativo Truck Deck. Todos os desenvolvedores e agentes de IA devem seguir este fluxo rigorosamente.

## Fase 1: Criação e Validação Visual (Test Build)
**Objetivo:** Criação de assets e aprovação estética.
- Criação de recursos gráficos (Backgrounds fotorrealistas, botões RGBA, ponteiros, fontes, etc.).
- Os componentes são organizados no diretório do novo painel (ex: `public/skins/nome_do_painel/`).
- O painel é montado de forma rudimentar apenas para testes de design e layout.
- **Status:** Versão de Teste (Draft). O código do painel não é definitivo.

## Fase 2: Mapeamento Visual (Editor "Sandbox")
**Objetivo:** Gerar a planta baixa do painel de forma visual e segura.
- **Sem Live Sync:** O Editor funciona 100% isolado do jogo principal. Não há salvamento em tempo real que altere a interface do usuário final automaticamente.
- O Editor organiza os pacotes visuais de backgrounds e botões.
- O Diretor do Projeto (Usuário) abre o Editor, arrasta os componentes, posiciona, define as chaves e as funções visualmente (com liberdade total para misturar peças de pacotes diferentes).
- Concluído o design, o Usuário clica em **"Exportar"**.
- O Editor faz o download de um arquivo `layout.json` (A Planta do Painel).

## Fase 3: Implementação e Oficialização
**Objetivo:** Integrar o painel ao código de produção.
- O Usuário entrega o arquivo `layout.json` mapeado para os agentes de desenvolvimento (Bots).
- Os Bots recebem o JSON e injetam o mapeamento de forma rígida e otimizada no código do aplicativo (arquivos de configuração, `app.js`, `server.js`).
- Somente após esta injeção o painel ganha o status de **Versão Final**.

## Fase 4: Estratégia de Lançamento e Monetização
**Objetivo:** Decidir como e quando o painel chega ao público.
- Após a Versão Final, a equipe decide se o pacote entra no próximo update ou se será retido.
- **Regra da v1.0.0:** Os painéis **Modern** (Moderno) e **Soviet** (Soviético) são o pacote base. Eles justificam o preço de compra inicial do aplicativo.
- **Painéis Futuros:** Novos painéis que passarem por esta esteira de produção (ex: Scania, Vintage, etc.) serão desenvolvidos como módulos adicionais e **cobrados à parte** (DLC / In-App Purchases).
