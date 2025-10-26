Firebase Hosting Deployment

Prerequisites
- Install and sign in to required CLIs:
  - GitHub CLI: gh auth login
  - Firebase CLI: firebase login
- Ensure you have push access to repo: Mr-Ahuja/not-split-wise

One-shot setup and deploy
1) From repo root, run:
   pwsh ./scripts/deploy.ps1

What the script does
- Creates or selects a Firebase project (prefers projectId: not-splitwise, falls back to not-splitwise-XXXX if taken)
- Ensures a default Web App and Hosting site exist
- Generates an access token (requires you to be logged in already)
- Sets GitHub Secrets on the repo:
  - FIREBASE_TOKEN
  - FIREBASE_PROJECT_ID
- Pushes main and watches the GitHub Actions workflow to deploy to Firebase Hosting

Manual steps (if you prefer)
1) Create/select a Firebase project:
   firebase projects:list
   firebase projects:create not-splitwise --display-name "Not Splitwise"

2) Create a Web App and Hosting site (idempotent):
   firebase apps:create web not-splitwise-web --project <PROJECT_ID> --display-name "Not Splitwise Web"
   firebase hosting:sites:create <PROJECT_ID> --project <PROJECT_ID>

3) Get a CI token (requires prior login):
   firebase login:print-access-token

4) Add GitHub Secrets:
   echo <TOKEN> | gh secret set FIREBASE_TOKEN -R Mr-Ahuja/not-split-wise -b-
   echo <PROJECT_ID> | gh secret set FIREBASE_PROJECT_ID -R Mr-Ahuja/not-split-wise -b-

5) Push and monitor:
   git push -u origin main
   gh run watch -R Mr-Ahuja/not-split-wise

Notes
- The workflow file is at .github/workflows/firebase-hosting.yml and builds apps/not-splitwise with pnpm.
- The app uses Vite and does not require VITE_* env vars for the current static scaffold. Add VITE_* as GitHub Variables when you start using Firebase SDK in the client.
- .temp remains ignored per .gitignore and is not part of the commit.

