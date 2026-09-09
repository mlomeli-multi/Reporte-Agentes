param(
  [string]$ProjectName = "reporte-agentes-mlti",
  [switch]$SkipDataBuild,
  [switch]$AccessReady
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DataFile = Join-Path $Root "dashboard\data\current.json"
$WranglerVersion = "4.130.0"
$LocalWrangler = Join-Path $Root "node_modules\.bin\wrangler.cmd"

if (-not $AccessReady) {
  throw "No se despliega con datos reales hasta confirmar que Cloudflare Access ya protege el sitio. Repite con -AccessReady cuando este configurado."
}

Set-Location $Root
$env:CI = "1"
$env:NO_COLOR = "1"
$env:NO_UPDATE_NOTIFIER = "1"
$env:WRANGLER_SEND_METRICS = "false"

if (-not $SkipDataBuild) {
  node scripts\build-dashboard-data.js
}

if (-not (Test-Path -LiteralPath $DataFile)) {
  throw "No existe dashboard\data\current.json. Genera los datos antes de desplegar."
}

$CommitHash = "manual"
try {
  $CommitHash = (git rev-parse HEAD).Trim()
} catch {
  Write-Host "No se pudo leer el commit local; se usara metadata manual."
}

if (Test-Path -LiteralPath $LocalWrangler) {
  & $LocalWrangler pages deploy dashboard --project-name $ProjectName --branch main --commit-dirty=true --commit-hash $CommitHash --commit-message "Publish private dashboard V1"
} else {
  npx --yes "wrangler@$WranglerVersion" pages deploy dashboard --project-name $ProjectName --branch main --commit-dirty=true --commit-hash $CommitHash --commit-message "Publish private dashboard V1"
}
