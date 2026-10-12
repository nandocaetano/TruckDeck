# Compiles InputHelper.cs in memory and runs it. Started by server.js; not meant to be run by hand.
# Windows PowerShell 5.1 ships with every Windows 10/11, so the bridge needs no native
# Node modules and no build tools.
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'InputHelper.cs'
# System.Core holds MemoryMappedFile on .NET Framework; System.Drawing is the screen grab
Add-Type -Path $source -ReferencedAssemblies 'System.Core', 'System.Drawing'
[TruckDeck.InputHelper]::Run()
