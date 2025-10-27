import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, get, set, update, onValue, push, child } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export const ADMIN_EMAIL = 'preetamahuja9211@gmail.com';

export function isAdmin(user) {
  return !!user && user.email === ADMIN_EMAIL;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signOut() {
  await fbSignOut(auth);
}

export function emailKey(email) {
  // Realtime DB keys cannot contain . # $ [ ] /
  return email.replaceAll('.', ',');
}

export async function isUserApproved(email) {
  if (!email) return false;
  const snapshot = await get(ref(db, `allowedUsers/${emailKey(email)}`));
  return snapshot.exists() && !!snapshot.val();
}

export async function requestAccess(uid, email) {
  const reqRef = ref(db, `admin/requests/${uid}`);
  const now = Date.now();
  await set(reqRef, { email, requestedAt: now, approved: false });
}

export async function approveUser(email) {
  await set(ref(db, `allowedUsers/${emailKey(email)}`), true);
}

export async function addUserToGroup(uid, groupId) {
  const updates = {};
  updates[`groups/${groupId}/members/${uid}`] = true;
  updates[`userGroupLinks/${uid}/${groupId}`] = true;
  await update(ref(db), updates);
}

export async function createGroup(name, uid) {
  const groupsRef = ref(db, 'groups');
  const newRef = push(groupsRef);
  const groupId = newRef.key;
  const payload = { name, createdBy: uid, members: { [uid]: true } };
  await set(newRef, payload);
  await set(ref(db, `userGroupLinks/${uid}/${groupId}`), true);
  return groupId;
}

export async function addExpense(groupId, data) {
  const expRef = push(ref(db, `groups/${groupId}/expenses`));
  await set(expRef, data);
  await set(push(ref(db, `groups/${groupId}/history`)), { type: 'expense_added', createdAt: Date.now(), data });
}

export async function deleteExpense(groupId, expenseId, who) {
  const eRef = ref(db, `groups/${groupId}/expenses/${expenseId}`);
  const snap = await get(eRef);
  const prev = snap.exists() ? snap.val() : null;
  await set(eRef, null);
  await set(push(ref(db, `groups/${groupId}/history`)), { type: 'expense_deleted', createdAt: Date.now(), by: who, data: { id: expenseId, prev } });
}

export async function addSettlement(groupId, from, to, amount) {
  const sRef = push(ref(db, `groups/${groupId}/settlements`));
  const payload = { from, to, amount, createdAt: Date.now() };
  await set(sRef, payload);
  await set(push(ref(db, `groups/${groupId}/history`)), { type: 'settlement', createdAt: Date.now(), data: payload });
}

export async function tokenActive(token) {
  const snap = await get(ref(db, `admin/userInviteTokens/${token}/active`));
  return snap.exists() ? !!snap.val() : false;
}

export async function useToken(token, email) {
  if (!token) return false;
  const active = await tokenActive(token);
  if (!active) return false;
  await approveUser(email);
  // Optionally record usage timestamp
  await set(ref(db, `admin/userInviteTokens/${token}/lastUsedAt`), Date.now());
  return true;
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export { ref, get, set, update, onValue, push, child };

// Helpers for UI to display clearer auth errors
export function parseAuthError(err) {
  const code = err?.code || err?.message || 'unknown';
  const isConfigMissing = /configuration-not-found/i.test(code) || /CONFIGURATION_NOT_FOUND/i.test(err?.message || '');
  if (isConfigMissing) {
    return {
      code: 'auth/configuration-not-found',
      message: 'Firebase Authentication is not initialized for this project. Enable Authentication and the Google provider in the Firebase Console.',
      helpUrl: `https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/authentication/providers`
    };
  }
  return { code, message: err?.message || 'Authentication failed.' };
}
