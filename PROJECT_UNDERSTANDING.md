# Not Splitwise — Project Understanding

A modern, invite-only expense-sharing app for tight-knit communities. Think Splitwise, but private, UPI-friendly, real-time, and fully Firebase-powered — without multi-currency clutter.

## Product Vision
- Private-by-default access model; no open sign-ups.
- India-first UX (simple, fast, mobile-first); UPI-friendly.
- Real-time collaboration with Firebase Realtime Database.
- Single admin (Preetam) owns onboarding and moderation.

## Non-Goals (Initial)
- No multi-currency handling.
- No public discovery or open registrations.
- No complex settlement engines beyond group splits.

## Design Language
- Uses the “the-choosen-one” theme: dark glass surfaces, constellation background, gradient CTAs.
- Shared tokens/components mirrored from Agent-Context’s theme stylesheet.

## Roles & Access Model
- Admin (email: `preetamahuja9211@gmail.com`)
  - Full app + `/admin` panel
  - Approve/reject access requests, manage user-invite tokens, monitor groups
- User
  - Access to dashboard and groups they belong to; can create groups
- Guest
  - No access unless invited; can request access or join via group invite link

## Access Flow
1) Base App Access (Restricted)
   - User signs in (Firebase Auth).
   - If email is in `/allowedUsers` → go to `/dashboard`.
   - Else → redirect to `/request-access` (writes entry under `/admin/requests`).
   - Admin reviews requests in `/admin` and approves (adds email to `/allowedUsers`).

2) Group Invite Link (Bypasses Base Approval)
   - Link form: `/join?groupId=ABC123`.
   - On open: user signs in; user is auto-added to the group and may access that group’s page.
   - User remains constrained to that group unless later fully approved.

3) User Invite Link (Full App Access)
   - Link form: `/user-invite?token=XYZ456`.
   - On open: email is added to `/allowedUsers`; user gets full access (can create groups).
   - Token is revocable/regenerable by Admin; use sparingly.

## App Routes (SPA)
- `/` or `/restricted` — Sign-in and routing logic.
- `/dashboard` — Approved users; list groups and recent activity.
- `/group/:groupId` — Group ledger and expense tracking; group invite OK.
- `/join` — Group invite entry point (query: `groupId`).
- `/user-invite` — Full-access onboarding via token (query: `token`).
- `/request-access` — Form to request app access.
- `/admin` — Admin-only panel for approvals, tokens, and monitoring.

## Firebase Realtime DB Structure (Initial)
```
/allowedUsers/
  - user1@gmail.com: true
  - user2@gmail.com: true

/admin/
  /requests/
    - requestId1: {
        email: user@gmail.com,
        requestedAt: timestamp,
        approved: false
      }

/groups/
  - groupId123:
      name: "Trip to Manali"
      createdBy: uid123
      members: {
        uid123: true,
        uid456: true
      }
      expenses:
        - expenseId1:
            title: "Hotel"
            amount: 3000
            paidBy: uid123
            split: {
              uid123: 1500,
              uid456: 1500
            }

/userGroupLinks/
  - uid123: [groupId123, groupId789]
```

## Auth & Access Rules (Planned)
- Must be authenticated.
- Allow if any of:
  - Email in `/allowedUsers`, OR
  - Has valid user-invite token, OR
  - Member of a group via invite link.
- Group data access limited to group members.
- Admin requests and approvals restricted to Admin email.

## Notification Engine (Phase 2)
- Firebase Cloud Messaging (v2) for:
  - User approval notifications.
  - Expense updates and mentions.

## Tech Stack
- Framework: React (Vite)
- Hosting: Firebase Hosting
- Auth: Firebase Auth (Email/Google)
- Database: Firebase Realtime Database
- Push: Firebase Cloud Messaging (Phase 2)
- Styling: Theme-aligned CSS (optionally Tailwind or MUI later)

## Repo & CI (Current Setup)
- App path: `apps/not-splitwise`
- Build: `pnpm build` (Vite)
- Deploy: GitHub Actions → Firebase Hosting
  - Workflow: `apps/not-splitwise/.github/workflows/firebase-hosting.yml`
  - Requires GitHub Secrets: `FIREBASE_TOKEN`, `FIREBASE_PROJECT_ID`
  - Requires GitHub Variables: `VITE_*` keys and `VITE_ADMIN_EMAIL`
- Firebase config files:
  - `apps/not-splitwise/firebase.json`
  - `apps/not-splitwise/database.rules.json`
  - `.firebaserc` default project: `not-splitwise`

## Environment Variables (Vite)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_ADMIN_EMAIL` (default Admin email)

## Initial UI Modules (Scaffolded)
- Restricted gate (sign-in, redirect based on approval state).
- Dashboard placeholder.
- Group page placeholder.
- Join and User-Invite placeholders (to be wired to DB writes and token validation).
- Admin panel placeholder (restricted by Admin email).

## Security & Risk Notes
- Enforce email key encoding (replace `.` with `(dot)`) when using email as RTDB keys.
- Tokens for user-invite must be single-use or time-bound; store in `/admin/invites`.
- Validate group membership server-side via RTDB rules; client guards are not sufficient.
- Avoid storing sensitive PII beyond email.
- Consider rate-limiting requests creation (/admin/requests) to mitigate abuse.

## Backlog / Next Steps
1) Request Access: write flow to `/admin/requests` and idempotent client guard.
2) Admin Panel: list requests, approve → add to `/allowedUsers`, reject options.
3) Group Creation: create group, add creator to members, update `/userGroupLinks`.
4) Group Invite: generate shareable `groupId` link, auto-join on `/join`.
5) User-Invite Tokens: generate, store, validate, full-access onboarding on `/user-invite`.
6) Route Guards: centralize approval/group checks; handle query-based invite sessions.
7) Rules Hardening: finalize RTDB rules for all flows; add tests.
8) FCM (Phase 2): integrate push notifications.
9) UI Polish: responsive and a11y checks per theme guidance.

## Local Dev
```
cd apps/not-splitwise
pnpm i
pnpm dev
```
Build:
```
pnpm build
```

## Deployment
- Push to `main` to trigger GitHub Actions deploy to Firebase Hosting.
- Ensure repo Secrets/Variables are set as above.

