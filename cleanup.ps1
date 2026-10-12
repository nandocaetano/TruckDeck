<#
.SYNOPSIS
    Safe, targeted workspace cleanup for the Truck Deck project.

.DESCRIPTION
    Removes development clutter that accumulates during iteration: timestamped
    backup folders, stray .bak files, one-off patch scripts, scratch folders and
    the update archive.

    Everything the app needs to run is protected by an explicit allow-list and a
    path guard, so a wrong working directory or a bad pattern cannot touch
    source. Items are sent to the Recycle Bin, not hard-deleted, so a mistake is
    recoverable.

    The script does NOTHING by default: it prints what it would remove. Pass
    -Execute to actually move those items to the Recycle Bin.

.PARAMETER Execute
    Perform the cleanup. Without it the script runs as a dry run (default).

.PARAMETER HardDelete
    Permanently delete instead of using the Recycle Bin. Use only when the
    Recycle Bin is unavailable (e.g. a network drive). Requires -Execute.

.EXAMPLE
    .\cleanup.ps1
    Dry run. Lists every candidate and the space it would reclaim.

.EXAMPLE
    .\cleanup.ps1 -Execute
    Moves the listed items to the Recycle Bin.
#>

[CmdletBinding()]
param(
    [switch]$Execute,
    [switch]$HardDelete
)

$ErrorActionPreference = 'Stop'

# --- Guard: refuse to run anywhere that is not the Truck Deck project root -----
# Without this, a mistyped `cd` turns the patterns below loose on an unrelated
# folder. We require the two directories that unambiguously identify this repo.
$root = (Get-Location).Path
foreach ($marker in @('public', 'bridge')) {
    if (-not (Test-Path (Join-Path $root $marker) -PathType Container)) {
        Write-Host "ABORT: '$marker\' not found in $root" -ForegroundColor Red
        Write-Host "Run this script from the Truck Deck project root." -ForegroundColor Red
        exit 1
    }
}

# --- Protected: never removed, whatever a pattern below matches ---------------
# Directories holding anything the app serves, builds, ships or stores.
$protectedDirs = @(
    'public',        # the served front-end: html, css, js, skins, fonts
    'bridge',        # node server + input helper
    'tools',         # build.js
    'art',           # panel artwork (png/jpg that the app actually uses)
    'art_prompts',   # source prompts for that artwork
    'data',          # config.json, pin
    'store',         # persisted layouts
    'android',       # APK project
    'dist',          # build output (regenerable, but cheap to keep)
    '.git'
)
# Individual files at the root that must survive.
$protectedFiles = @(
    'README.md',
    'AI_GUIDELINES.md',
    'start.bat',
    'package.json',
    'package-lock.json',
    'cleanup.ps1',
    '.gitignore'
)

function Test-Protected {
    param([System.IO.FileSystemInfo]$Item)

    # Anything inside a protected directory tree is off-limits.
    foreach ($d in $protectedDirs) {
        $full = (Join-Path $root $d)
        if ($Item.FullName -eq $full) { return $true }
        if ($Item.FullName.StartsWith($full + [IO.Path]::DirectorySeparatorChar, 'OrdinalIgnoreCase')) { return $true }
    }
    # Named root files.
    if ($protectedFiles -contains $Item.Name) { return $true }
    return $false
}

# --- Candidates ---------------------------------------------------------------
$candidates = New-Object System.Collections.Generic.List[System.IO.FileSystemInfo]

function Add-Candidate {
    param([System.IO.FileSystemInfo]$Item, [string]$Reason)
    if ($null -eq $Item) { return }
    if (Test-Protected -Item $Item) { return }
    if ($candidates.FullName -contains $Item.FullName) { return }
    $Item | Add-Member -NotePropertyName CleanupReason -NotePropertyValue $Reason -Force
    $candidates.Add($Item)
}

# 1. Timestamped backup directories from earlier iterations (_backup_pre_sc25, ...)
Get-ChildItem -Path $root -Directory -Filter '_backup_*' |
    ForEach-Object { Add-Candidate -Item $_ -Reason 'backup folder' }

# 2. Scratch / experiment folders
foreach ($name in @('tmp_scsref', 'stickers_teste')) {
    $d = Get-Item (Join-Path $root $name) -ErrorAction SilentlyContinue
    if ($d) { Add-Candidate -Item $d -Reason 'scratch folder' }
}

# 3. Stray backup scripts and the update archive sitting at the root
Get-ChildItem -Path $root -File | Where-Object {
    $_.Name -like '_backup_*' -or $_.Name -eq '_update.zip'
} | ForEach-Object { Add-Candidate -Item $_ -Reason 'stray backup/archive' }

# 4. One-off patch scripts, already applied
Get-ChildItem -Path $root -File -Filter 'patch-*.py' |
    ForEach-Object { Add-Candidate -Item $_ -Reason 'spent patch script' }

# 5. Editor/tooling .bak files anywhere under public\ (the files themselves are
#    protected by tree, so target the .bak suffix explicitly and only that).
Get-ChildItem -Path (Join-Path $root 'public') -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -eq '.bak' -or $_.Name -match '\.\d{8}-\d{6}\.bak$' } |
    ForEach-Object {
        $_ | Add-Member -NotePropertyName CleanupReason -NotePropertyValue 'editor .bak' -Force
        if (-not ($candidates.FullName -contains $_.FullName)) { $candidates.Add($_) }
    }

# 6. The original request: loose reference images, PDF drafts and text notes,
#    ROOT LEVEL ONLY. Artwork under art\ is protected by tree and never matched.
Get-ChildItem -Path $root -File |
    Where-Object { $_.Extension -in @('.png', '.jpg', '.jpeg', '.pdf', '.txt') } |
    ForEach-Object { Add-Candidate -Item $_ -Reason 'loose reference file' }

# --- Report -------------------------------------------------------------------
if ($candidates.Count -eq 0) {
    Write-Host "Nothing to clean. Workspace is already tidy." -ForegroundColor Green
    exit 0
}

function Get-Size {
    param([System.IO.FileSystemInfo]$Item)
    if ($Item.PSIsContainer) {
        $m = Get-ChildItem $Item.FullName -Recurse -File -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum
        return [long]($m.Sum)
    }
    return [long]$Item.Length
}

$total = 0L
Write-Host ""
Write-Host "Cleanup candidates in $root" -ForegroundColor Cyan
Write-Host ("-" * 72)
foreach ($c in $candidates | Sort-Object CleanupReason, Name) {
    $size = Get-Size -Item $c
    $total += $size
    $kind = if ($c.PSIsContainer) { 'DIR ' } else { 'FILE' }
    Write-Host ("{0} {1,9:N1} MB  {2,-22} {3}" -f $kind, ($size / 1MB), $c.CleanupReason, $c.Name)
}
Write-Host ("-" * 72)
Write-Host ("{0} items, {1:N1} MB" -f $candidates.Count, ($total / 1MB)) -ForegroundColor Yellow

if (-not $Execute) {
    Write-Host ""
    Write-Host "DRY RUN - nothing was removed." -ForegroundColor Yellow
    Write-Host "Re-run with -Execute to move these to the Recycle Bin." -ForegroundColor Yellow
    exit 0
}

# --- Execute ------------------------------------------------------------------
if (-not $HardDelete) {
    # Recycle Bin keeps the operation reversible. This is the whole reason the
    # script does not just call Remove-Item.
    Add-Type -AssemblyName Microsoft.VisualBasic
}

$removed = 0
foreach ($c in $candidates) {
    try {
        if ($HardDelete) {
            Remove-Item -LiteralPath $c.FullName -Recurse -Force
        }
        elseif ($c.PSIsContainer) {
            [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(
                $c.FullName,
                [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
                [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
        }
        else {
            [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
                $c.FullName,
                [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
                [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
        }
        $removed++
        Write-Host "removed: $($c.Name)" -ForegroundColor DarkGray
    }
    catch {
        Write-Host "FAILED : $($c.Name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host ("Done. {0} of {1} items removed, {2:N1} MB reclaimed." -f $removed, $candidates.Count, ($total / 1MB)) -ForegroundColor Green
if (-not $HardDelete) {
    Write-Host "Items are in the Recycle Bin if you need them back." -ForegroundColor Green
}
Write-Host ""
Write-Host "Next: run 'node tools\build.js' to confirm the build still succeeds." -ForegroundColor Cyan
