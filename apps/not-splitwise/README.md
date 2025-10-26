# Not Splitwise (Firebase SPA)

A modern, invite-only expense sharing app built with React + Vite and Firebase (Auth + Realtime Database). Design derived from the the-choosen-one theme.

## Local Setup

- Create a Firebase Web App under project `not-splitwise-7560` and copy the Web Config.
- Copy `.env.local.example` to `.env.local` and fill values.

```
cd apps/not-splitwise
pnpm i   # or npm ci
pnpm dev # or npm run dev
```

## Build

```
pnpm build
```

Artifacts are output to `dist/`.

## Firebase Hosting (local CLI)

Ensure you have the Firebase CLI installed and are logged in:

```
npm i -g firebase-tools  # if needed
firebase login
cd apps/not-splitwise
firebase use not-splitwise-7560  # .firebaserc already sets default
firebase deploy --only hosting
```

This deploys the SPA with SPA rewrites to `index.html`.

## Routes

- `/` Restricted landing (sign in, route to dashboard or request access)
- `/dashboard` Approved users only (list/create groups)
- `/group/:groupId` Group page; members (or approved users) can view/add expenses
- `/join?groupId=...` Group invite link (no base approval needed)
- `/user-invite?token=...` User invite link (bypass approval, adds to allowedUsers)
- `/request-access` Request approval (writes to `/admin/requests`)
- `/admin` Admin panel for approvals and invite tokens (email: `preetamahuja9211@gmail.com`)

## Realtime Database Structure (MVP)

```
allowedUsers/{emailKey}: true
admin/requests/{uid}: { email, requestedAt, approved }
admin/userInviteTokens/{token}: { active, createdAt, createdBy, lastUsedAt? }
groups/{groupId}: { name, createdBy, members/{uid}: true, expenses/{pushId}: {...} }
userGroupLinks/{uid}/{groupId}: true
```

`emailKey` replaces `.` with `,` for RTDB key safety.

## Notes

- Security rules are not included here (planned). Configure RTDB rules to enforce:
  - Authenticated users only
  - Access if email is allowed OR via group membership
  - Admin-only access to `/admin/*` for `preetamahuja9211@gmail.com`
- Push notifications (FCM) are phase 2.
