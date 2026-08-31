param(
  [string]$ProjectName = "reporte-agentes-mlti",
  [switch]$SkipDataBuild,
  [switch]$AccessReady
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DataFile = Join-Path $Root "dashboard\data\current.json"

if (-not $AccessReady) {
  throw "No se despliega con datos reales hasta confirmar que Cloudflare Access ya protege el sitio. Repite con -AccessReady cuando este configurado."
}

Set-Location $Root

if (-not $SkipDataBuild) {
  node scripts\build-dashboard-data.js
}

if (-not (Test-Path -LiteralPath $DataFile)) {
  throw "No existe dashboard\data\current.json. Genera los datos antes de desplegar."
}

npx wrangler pages deploy dashboard --project-name $ProjectName
