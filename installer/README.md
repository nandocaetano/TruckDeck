# TruckDeck Bridge Setup

Este diretório contém o script NSIS do instalador do bridge standalone.

## Pré-requisitos

- Execute `npm run build:exe` em `bridge/` antes da compilação do instalador.
- O comando copia `TruckDeckBridge.exe`, todo o conteúdo de `public/`, `input-helper.ps1`, `InputHelper.cs` e `Start TruckDeck Bridge.bat` para `dist/`.
- O NSIS verificado nesta máquina é a versão `v3.13`, instalado em `C:\Program Files (x86)\NSIS\makensis.exe`.

## Compilar

A partir da raiz do repositório, execute:

```powershell
& "C:\Program Files (x86)\NSIS\makensis.exe" installer\truckdeck.nsi
```

O instalador resultante será escrito em `installer\TruckDeckBridge-Setup.exe`.

O instalador copia `dist/` para `%LOCALAPPDATA%\TruckDeck`, cria `TruckDeck Bridge.lnk` no Menu Iniciar e oferece, opcionalmente, um atalho na Área de Trabalho. O desinstalador remove a instalação e os atalhos; não acessa `%APPDATA%\TruckDeck\data`.

## Phase 1

A Phase 1 apenas escreve e verifica o script. A compilação com NSIS não é executada nesta fase; ela fica para a Phase 2 após aprovação explícita.
