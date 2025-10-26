Param(
  [string]$Repo = "Mr-Ahuja/not-split-wise",
  [string]$PreferredProjectId = "not-splitwise"
)

$ErrorActionPreference = 'Stop'

function Assert-Tool {
  param([string]$Name,[string]$Check)
  Write-Host "Checking $Name..." -ForegroundColor Cyan
  try { Invoke-Expression $Check | Out-Null } catch { throw "Required tool missing: $Name" }
}

function Ensure-FirebaseProject {
  param([string]$Desired)
  $exists = $false
  try {
    $list = firebase projects:list 2>$null | Out-String
    if ($list -match "\b$Desired\b") { $exists = $true }
  } catch { $exists = $false }

  if ($exists) { return $Desired }

  $suffix = Get-Random -Minimum 1000 -Maximum 9999
  $projectId = "$Desired-$suffix"
  Write-Host "Creating Firebase project: $projectId" -ForegroundColor Yellow
  firebase projects:create $projectId --display-name "Not Splitwise" --non-interactive

  return $projectId
}

function Ensure-WebApp {
  param([string]$ProjectId)
  try {
    firebase apps:create web not-splitwise-web --project $ProjectId --display-name "Not Splitwise Web" --non-interactive | Out-Null
  } catch { Write-Host "Web app may already exist: $($_.Exception.Message)" -ForegroundColor DarkGray }
}

function Ensure-HostingSite {
  param([string]$ProjectId)
  try {
    firebase hosting:sites:create $ProjectId --project $ProjectId --non-interactive | Out-Null
  } catch { Write-Host "Hosting site check: $($_.Exception.Message)" -ForegroundColor DarkGray }
}

function Get-FirebaseToken {
  try {
    $t = firebase login:print-access-token 2>$null
    if ($t) { return $t.Trim() }
  } catch { }
  throw "No Firebase access token available. Run 'firebase login' in this shell and re-run."
}

# 1) Pre-reqs
Assert-Tool -Name 'GitHub CLI (gh)' -Check 'gh --version'
Assert-Tool -Name 'Firebase CLI (firebase)' -Check 'firebase --version'

# 2) Firebase project + app + hosting
$ProjectId = Ensure-FirebaseProject -Desired $PreferredProjectId
Ensure-WebApp -ProjectId $ProjectId
Ensure-HostingSite -ProjectId $ProjectId

# 3) Token and GitHub secrets
$Token = Get-FirebaseToken
Write-Host "Setting GitHub secrets on $Repo" -ForegroundColor Cyan
($Token) | gh secret set FIREBASE_TOKEN -R $Repo -b-
($ProjectId) | gh secret set FIREBASE_PROJECT_ID -R $Repo -b-

# Update local .firebaserc default to match project (optional)
try {
  $rcPath = Join-Path (Get-Location) ".\apps\not-splitwise\.firebaserc"
  if (Test-Path $rcPath) {
    $obj = Get-Content $rcPath -Raw | ConvertFrom-Json
    if ($obj.projects.default -ne $ProjectId) {
      $obj.projects.default = $ProjectId
      ($obj | ConvertTo-Json -Depth 8) | Set-Content -NoNewline $rcPath
      Write-Host ".firebaserc updated to $ProjectId" -ForegroundColor DarkGreen
    }
  }
} catch { Write-Host "Could not update .firebaserc: $($_.Exception.Message)" -ForegroundColor DarkGray }

Write-Host "Secrets set. Pushing and watching CI..." -ForegroundColor Green

# 4) Push and watch
git push -u origin main

try {
  gh run watch -R $Repo
} catch {
  Write-Host "Could not watch run. Listing latest runs:" -ForegroundColor Yellow
  gh run list -R $Repo --limit 5
}

Write-Host "Done. Ensure Firebase Hosting shows the deployed site for project: $ProjectId" -ForegroundColor Green
