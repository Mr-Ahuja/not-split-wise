# Not Splitwise — Implementation Checklist

> Track progress toward MVP and beyond. Tick when complete and verified.

## MVP Access & Onboarding
- [ ] Auth gate: redirect approved users to `/dashboard`, others to `/request-access`
- [ ] Request Access: write to `/admin/requests/{requestId}` (idempotent per email)
- [ ] Admin approve: add `/allowedUsers/{email} = true` and remove request
- [ ] Admin panel UI: list pending, approve/reject, view approved users

## Groups & Invites
- [ ] Create Group: write `/groups/{groupId}` with creator in `members`
- [ ] User links: update `/userGroupLinks/{uid}` on create/join
- [ ] Group Invite: generate URL `/join?groupId=...`, auto-join handler
- [ ] Group Page: display members, expenses, add expense, split

## User-Invite Tokens
- [ ] Token model under `/admin/invites/{token}` (email|issuedAt|expiresAt|used)
- [ ] Generate/regenerate from admin panel, with revoke
- [ ] Validate on `/user-invite?token=...` and grant full access on success
- [ ] Mark token used (single-use) or enforce TTL

## Route Guards & Middleware
- [ ] Centralize approval and group-membership checks
- [ ] Support invite-session (query param) until first write completes

## Realtime Database Rules
- [ ] Encode email keys (replace `.` with `(dot)`)
- [ ] Enforce member-only read/write for `/groups/{groupId}`
- [ ] Admin-only read/write for `/admin/**`
- [ ] Allow `/allowedUsers/{email}` writes only by admin
- [ ] Add tests/docs for rules edge cases

## CI/CD & Ops
- [ ] Repo variables set: `VITE_*`, `VITE_ADMIN_EMAIL`
- [ ] Repo secrets set: `FIREBASE_PROJECT_ID`, `FIREBASE_TOKEN`
- [ ] Successful build on `main`; deploy to Firebase Hosting
- [ ] Add preview channel deploy (optional)

## Notifications (Phase 2)
- [ ] FCM setup (v2), permission flow
- [ ] Push on approval and on expense updates

## UX Polish
- [ ] A11y: color contrast, focus rings, keyboard nav
- [ ] Mobile-first layout checks
- [ ] Consistent the-choosen-one components (buttons/cards/bg)

## Docs
- [ ] Update `PROJECT_UNDERSTANDING.md` with any contract changes
- [ ] Admin SOPs (approve, token lifecycle, incident notes)

