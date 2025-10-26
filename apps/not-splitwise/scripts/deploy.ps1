param(
  [string]$ProjectId = "not-splitwise-7560",
  [string]$AppDisplayName = "not-splitwise-web",
  [string]$DbLocation = "us-east1"
)

$ErrorActionPreference = 'Stop'

function Section($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Info($msg) { Write-Host "[i] $msg" -ForegroundColor Gray }
function Success($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "[x] $msg" -ForegroundColor Red }

# Move to script directory (apps/not-splitwise)
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location -Path ..  # go to apps/not-splitwise

Section "Environment checks"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node not found"; exit 1 }
if (-not (Get-Command cmd -ErrorAction SilentlyContinue)) { Fail "cmd not found"; exit 1 }
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) { Fail "Firebase CLI not found. Install: npm i -g firebase-tools"; exit 1 }

$nodeV = node -v
$npmV = cmd /c npm -v
$fbV = cmd /c firebase --version
Info "node: $nodeV | npm: $npmV | firebase: $fbV"

Section "Firebase project selection"
cmd /c "firebase use $ProjectId" | Out-Null
Success "Using project: $ProjectId"

Section "Ensure Web App exists"
$appsJson = cmd /c "firebase apps:list --project $ProjectId --json"
$apps = ($appsJson | ConvertFrom-Json).result.apps
$webApp = $apps | Where-Object { $_.platform -eq 'WEB' } | Select-Object -First 1
if (-not $webApp) {
  Info "No WEB app found. Creating..."
  $createJson = cmd /c "firebase apps:create web $AppDisplayName --project $ProjectId --json"
  $webApp = ($createJson | ConvertFrom-Json).result
  Success "Created WEB app: $($webApp.displayName) ($($webApp.appId))"
} else {
  Success "Found WEB app: $($webApp.displayName) ($($webApp.appId))"
}

Section "Fetch SDK config"
$cfgJson = cmd /c "firebase apps:sdkconfig web $($webApp.appId) --project $ProjectId --json"
$cfg = ($cfgJson | ConvertFrom-Json).result.sdkConfig
if (-not $cfg) { Fail "Failed to fetch SDK config"; exit 1 }
Success "SDK config fetched"

Section "Resolve Realtime Database URL"
$dbUrl = $cfg.databaseURL
if (-not $dbUrl) {
  try {
    $dbListJson = cmd /c "firebase database:instances:list --project $ProjectId --json" 2>$null
    if ($dbListJson) {
      $dbList = ($dbListJson | ConvertFrom-Json).result.instances
      $defaultDb = $dbList | Where-Object { $_.databaseId -like '*-default-rtdb' } | Select-Object -First 1
      if ($defaultDb -and $defaultDb.databaseUrl) { $dbUrl = $defaultDb.databaseUrl }
    }
  } catch {
    Info "Could not list DB instances; falling back to default URL"
  }
}
if (-not $dbUrl) { $dbUrl = "https://$ProjectId-default-rtdb.$DbLocation.firebasedatabase.app" }
Success "Database URL: $dbUrl"

Section "Write .env.local"
$envPath = Join-Path (Get-Location) ".env.local"
$envContent = @(
  "VITE_FIREBASE_API_KEY=$($cfg.apiKey)",
  "VITE_FIREBASE_AUTH_DOMAIN=$($cfg.authDomain)",
  "VITE_FIREBASE_DATABASE_URL=$dbUrl",
  "VITE_FIREBASE_PROJECT_ID=$($cfg.projectId)",
  "VITE_FIREBASE_STORAGE_BUCKET=$($cfg.storageBucket)",
  "VITE_FIREBASE_MESSAGING_SENDER_ID=$($cfg.messagingSenderId)",
  "VITE_FIREBASE_APP_ID=$($cfg.appId)"
) -join "`n"
Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Success ".env.local written"

Section "Install dependencies"
cmd /c "npm install"
if ($LASTEXITCODE -ne 0) { Fail "npm install failed"; exit 1 }
Success "Dependencies installed"

Section "Build"
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) { Fail "Build failed"; exit 1 }
Success "Build complete (dist/)"

Section "Deploy to Firebase Hosting"
$deployOutput = cmd /c "firebase deploy --only hosting --project $ProjectId" 2>&1
Write-Host $deployOutput
$hostingUrl = ($deployOutput -split "`n") | Where-Object { $_ -match 'Hosting URL:' } | ForEach-Object {
  ($_ -split 'Hosting URL:\s*')[1].Trim()
} | Select-Object -First 1
if ($hostingUrl) { Success "Deployed: $hostingUrl" } else { Fail "Deployed, but could not parse Hosting URL" }
