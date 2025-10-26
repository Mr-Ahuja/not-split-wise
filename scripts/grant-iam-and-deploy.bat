@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ===============================================
REM Grant IAM roles to a service account and trigger
REM GitHub Actions deploy for Firebase Hosting.
REM Usage (cmd):
REM   scripts\grant-iam-and-deploy.bat [SERVICE_ACCOUNT_EMAIL]
REM If SERVICE_ACCOUNT_EMAIL is omitted, defaults to
REM firebase-adminsdk-fbsvc@not-splitwise-7560.iam.gserviceaccount.com
REM ===============================================

REM Config (override via env before calling if needed)
if "%PROJECT%"=="" set "PROJECT=not-splitwise-7560"
if "%REPO%"=="" set "REPO=Mr-Ahuja/not-split-wise"

REM Service Account (first arg overrides default)
if "%~1"=="" (
  set "SA=firebase-adminsdk-fbsvc@%PROJECT%.iam.gserviceaccount.com"
) else (
  set "SA=%~1"
)

echo == Granting IAM and triggering deploy ==
echo Project: %PROJECT%
echo Repo:    %REPO%
echo SA:      %SA%

where gcloud >NUL 2>&1 || (echo ERROR: gcloud not found. Install Google Cloud SDK and retry. & exit /b 1)
where gh >NUL 2>&1 || (echo ERROR: gh not found. Install GitHub CLI and retry. & exit /b 1)

echo.
echo Enabling required APIs (idempotent)...
gcloud services enable firebase.googleapis.com firebasehosting.googleapis.com serviceusage.googleapis.com --project "%PROJECT%"

echo.
echo Granting roles to %SA% ...
gcloud projects add-iam-policy-binding "%PROJECT%" --member="serviceAccount:%SA%" --role="roles/firebasehosting.admin"
gcloud projects add-iam-policy-binding "%PROJECT%" --member="serviceAccount:%SA%" --role="roles/serviceusage.serviceUsageConsumer"
gcloud projects add-iam-policy-binding "%PROJECT%" --member="serviceAccount:%SA%" --role="roles/firebase.admin"

echo.
echo Current bindings for %SA%:
gcloud projects get-iam-policy "%PROJECT%" --flatten="bindings[].members" --format="table(bindings.role, bindings.members)" --filter="bindings.members:%SA%"

echo.
echo Triggering GitHub Actions deploy...
for /f %%i in ('gh run list -R %REPO% --limit 1 --json databaseId --jq ".[0].databaseId"') do set "RUN_ID=%%i"

if not "%RUN_ID%"=="" (
  echo Rerunning last workflow run: %RUN_ID%
  gh run rerun %RUN_ID% -R %REPO%
) else (
  echo No previous workflow run found; creating empty commit to trigger CI.
  git commit --allow-empty -m "ci: trigger deploy from batch script"
  git push
)

echo.
echo Watching workflow output (press Ctrl+C to stop)...
gh run watch -R %REPO%

echo.
echo Done.
endlocal

