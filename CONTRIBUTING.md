# Contributing — Not Splitwise

A short guide for working on the Not Splitwise app (React + Vite + Firebase Hosting/RTDB) following the “the-choosen-one” design language.

## Prerequisites
- Node 20.x and pnpm (Corepack): `corepack enable && corepack prepare pnpm@latest --activate`
- GitHub CLI (gh), Firebase CLI (firebase) — authenticated
- Access to repo secrets/vars (maintainers):
  - Secrets: `FIREBASE_TOKEN`, `FIREBASE_PROJECT_ID`
  - Variables: `VITE_*` config keys, `VITE_ADMIN_EMAIL`

## Local Setup
```
cd apps/not-splitwise
pnpm i
cp .env.example .env  # fill VITE_* if needed
pnpm dev
```
Build locally:
```
pnpm build
```

## Branching & Commits
- Branch names:
  - `feat/<area>-<short>` (features)
  - `fix/<area>-<short>` (bug fixes)
  - `chore/<area>-<short>` (infra/docs/refactor)
- Commit message style (suggested):
  - `feat(access): request flow writes to /admin/requests`
  - `fix(rtdb): guard email key encoding`

## CoFrame Alignment
- Implementation: `Agent-Context/implementations/not-splitwise.cfi.json`
  - Keep build/dev commands and artifact patterns in sync with `apps/not-splitwise`.
  - Hosting: Firebase via GitHub Actions.

## CI/CD
- Workflow file: `apps/not-splitwise/.github/workflows/firebase-hosting.yml`
- On push to `main`: builds with pnpm and deploys to Firebase Hosting using repo secrets/vars.
- Do not commit secrets; use GitHub Secrets/Variables.

## Theme & UX
- Follow `apps/not-splitwise/src/styles/theme.css` (the-choosen-one language: dark glass, gradients, constellation bg optional).
- Keep mobile-first; verify contrast and tap targets.

## Security Notes
- Never hardcode credentials.
- When using email as RTDB keys, encode `.` to `(dot)`.
- Route guards are client-side convenience; RTDB rules are the source of truth.

## Definition of Done (MVP features)
- Access gating: authenticated users are redirected per approval state.
- Request Access: writes an idempotent entry to `/admin/requests`.
- Admin Approvals: approve creates `/allowedUsers/<email> = true`.
- Group flows: create/join; membership reflected under `/groups/*/members` and `/userGroupLinks`.
- Tokens: user-invite tokens validated and single-use or time-bound.
- RTDB rules enforce the above; basic unit or integration checks for critical logic.

## Getting Help
- Open a GitHub Discussion or tag `@Mr-Ahuja` in PRs.

