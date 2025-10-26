# Not Splitwise

A modern, invite‑only expense sharing app for tight‑knit communities. Think Splitwise, but private, India‑first (UPI‑friendly), real‑time, and Firebase‑powered. Design language derives from “the‑chosen‑one”.

## Highlights
- Invite‑only access with admin approvals
- Two invite types: group invite (bypasses base approval) and full user invite
- Real‑time groups, expenses, balances, and suggested settlements
- Admin panel to approve requests and manage user‑invite tokens
- SPA built with React + Vite; Hosting on Firebase; Realtime Database (RTDB)

## Directory Structure
- `apps/not-splitwise` — SPA code
  - `src/App.jsx` — routes, pages (Restricted, Dashboard, Group, Join, UserInvite, RequestAccess, Admin)
  - `src/firebase.js` — Firebase init + helpers
  - `src/styles/theme.css` — theme (derived from the‑chosen‑one)
  - `public/` — favicon and logo
  - `firebase.json` — hosting + database rules path
  - `database.rules.json` — RTDB rules (deployed)
  - `scripts/deploy.ps1` — fetch SDK config, write env, build, and deploy
- `.temp/` — CoFrame docs and templates (ignored by git)

## Setup
1) Firebase project: `not-splitwise-7560`
2) Authentication: enable Google provider
3) Realtime Database: create default instance in region `us-east1`
4) Local build/deploy

```
cd apps/not-splitwise
npm install
# Optional: run locally
npm run dev
# One‑shot build+deploy (writes .env.local via Firebase CLI SDK config)
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -ProjectId not-splitwise-7560 -DbLocation us-east1
```

## Environment
- Generated at `apps/not-splitwise/.env.local` via deploy script
- RTDB URL is region‑aware: `https://<project>-default-rtdb.us-east1.firebasedatabase.app`

## RTDB Rules (summary)
- `allowedUsers/{emailKey}`: admin‑only writes; auth users can read (for approval checks)
- `admin/**`: admin‑only; `admin/requests/{uid}` allows the requester to write their own request
- `userProfiles/{uid}`: user can read/write own profile (fixes permission_denied on login sync)
- `groups/{groupId}`: members can read/write; on create, creator must be present in `members`
- `userGroupLinks/{uid}/{groupId}`: user can manage their own links

Rules file: `apps/not-splitwise/database.rules.json`

## Routes
- `/` Restricted landing (login + routing to dashboard or request access)
- `/dashboard` Approved users (or admin) — list/create groups
- `/group/:groupId` Members — add expenses (equal/custom split), view balances & settlements
- `/join?groupId=...` Group invite (bypasses base approval)
- `/user-invite?token=...` Full user invite (adds to allowedUsers)
- `/request-access` Writes `/admin/requests/{uid}`
- `/admin` Admin (approvals + user‑invite tokens)

## Copy UX
- Copy icons appear next to URLs (hover on desktop, always visible on mobile)
- Implemented for group invites and admin user‑invite links

## Notes
- The app treats `preetamahuja9211@gmail.com` as admin and auto‑approved.
- Push notifications (FCM) are planned phase‑2.

## CoFrame
- CoFrame documents and templates live under `.temp/` and are ignored from git.

