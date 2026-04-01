# Thomian Library System — Release Deploy Script
# -----------------------------------------------
# Usage:
#   .\deploy.ps1                  Deploy everything (bumps patch version)
#   .\deploy.ps1 -Target admin    Deploy admin only (bumps patch version)
#   .\deploy.ps1 -Target kiosk    Deploy kiosk only
#   .\deploy.ps1 -Target backend  Deploy backend only
#   .\deploy.ps1 -NoBump          Deploy without bumping the version
#   .\deploy.ps1 -Yes             Skip confirmation prompt

param(
    [ValidateSet('admin', 'kiosk', 'backend', 'all')]
    [string]$Target = 'all',
    [switch]$NoBump,
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# ── 0. Preview & confirm ─────────────────────────────────────────────────────
$currentVer = (Get-Content package.json -Raw | ConvertFrom-Json).version
$parts = $currentVer -split '\.'
$nextVer = if ($NoBump) { $currentVer } else { "$($parts[0]).$($parts[1]).$([int]$parts[2] + 1)" }

Write-Host ""
Write-Host "  Thomian Library System — Deploy" -ForegroundColor White
Write-Host "  ────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Target  : $(if ($Target -eq 'all') { 'admin + kiosk + backend' } else { $Target })" -ForegroundColor Yellow
Write-Host "  Version : v$currentVer$(if (-not $NoBump) { " → v$nextVer" })" -ForegroundColor Yellow
Write-Host ""

if (-not $Yes) {
    $ans = Read-Host "  Proceed? [Y/n]"
    if ($ans -and $ans -notmatch '^[Yy]') {
        Write-Host "  Cancelled." -ForegroundColor DarkGray
        exit 0
    }
}

# ── 1. Bump version ──────────────────────────────────────────────────────────
if (-not $NoBump) {
    Write-Host "`n► Bumping patch version..." -ForegroundColor Cyan
    node bump.mjs
}

$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version
Write-Host "► Version: v$ver" -ForegroundColor Green

# ── 2. Deploy backend ─────────────────────────────────────────────────────────
if ($Target -in 'backend', 'all') {
    Write-Host "`n► Deploying backend (v$ver)..." -ForegroundColor Cyan
    Push-Location backend
    npx wrangler deploy
    Pop-Location
}

# ── 3. Deploy admin ───────────────────────────────────────────────────────────
if ($Target -in 'admin', 'all') {
    Write-Host "`n► Building & deploying admin (v$ver)..." -ForegroundColor Cyan
    Push-Location admin
    npm run build
    npx wrangler pages deploy dist --project-name=thomian-admin --commit-dirty=true
    Pop-Location
}

# ── 4. Deploy kiosk ───────────────────────────────────────────────────────────
if ($Target -in 'kiosk', 'all') {
    Write-Host "`n► Building & deploying kiosk (v$ver)..." -ForegroundColor Cyan
    Push-Location kiosk
    npm run build
    npx wrangler pages deploy dist --project-name=thomian-kiosk --commit-dirty=true
    Pop-Location
}

# ── 5. Commit ─────────────────────────────────────────────────────────────────
Write-Host "`n► Committing release v$ver..." -ForegroundColor Cyan
git add -A
git commit -m "chore: release v$ver"
git tag "v$ver"

Write-Host "`n✓ Done! Release v$ver committed and tagged." -ForegroundColor Green
Write-Host "  Run 'git push ; git push --tags' to push to GitHub." -ForegroundColor DarkGray
