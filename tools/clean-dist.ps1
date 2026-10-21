# clean-dist.ps1 — remove development artifacts from dist/ before shipping
# Run from repo root: .\tools\clean-dist.ps1

$dist = "$PSScriptRoot\..\dist"

# Files that must never ship: PIN, logs, backups, editor copies
$patterns = @(
    "$dist\data\config.json",       # contains real PIN
    "$dist\data\bridge.log",        # runtime log
    "$dist\public\*.bak",           # timestamped backups
    "$dist\public\*Copia*",         # manual copies
    "$dist\public\* - Copia*"
)

foreach ($pattern in $patterns) {
    Get-Item $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "Removing: $($_.FullName)"
        Remove-Item $_.FullName -Force
    }
}

# Remove backup layout files (keep only layouts.json)
Get-ChildItem "$dist\data\" -Filter "layouts_*.json" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Removing backup layout: $($_.Name)"
    Remove-Item $_.FullName -Force
}

Write-Host "dist/ cleaned."
