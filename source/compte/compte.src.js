/* Carnet Yang Sheng : comptes et synchronisation (Firebase).
   Regroupé en un seul fichier par : sh source/compte/build.sh  →  source/vendor/compte.js */
import {initializeApp} from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
  GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, updateProfile, deleteUser
} from 'firebase/auth';
import {getFirestore, doc, getDoc, setDoc, deleteDoc} from 'firebase/firestore/lite';

let auth = null, db = null;
const RECENT_MS = 5 * 60 * 1000;

function pub(u) {
  if (!u) return null;
  const p = (u.providerData && u.providerData[0]) || {};
  return {uid: u.uid, email: u.email || p.email || '', nom: u.displayName || p.displayName || '', photo: u.photoURL || p.photoURL || '', fournisseur: p.providerId || 'password'};
}

export async function init(config, onUser) {
  const app = initializeApp(config);
  auth = initializeAuth(app, {persistence: [indexedDBLocalPersistence, browserLocalPersistence], popupRedirectResolver: browserPopupRedirectResolver});
  auth.languageCode = 'fr';
  db = getFirestore(app);
  let redirectError = null;
  try { await getRedirectResult(auth); } catch (e) { redirectError = e; }
  onAuthStateChanged(auth, u => onUser(pub(u)));
  if (redirectError) throw redirectError;
}

export async function inscription(email, mdp, nom) {
  const c = await createUserWithEmailAndPassword(auth, email, mdp);
  if (nom) await updateProfile(c.user, {displayName: nom});
  return pub(auth.currentUser);
}
export async function connexion(email, mdp) { await signInWithEmailAndPassword(auth, email, mdp); return pub(auth.currentUser); }
export async function oubli(email) { await sendPasswordResetEmail(auth, email); }
export async function fournisseur(nom) {
  const p = nom === 'facebook' ? new FacebookAuthProvider() : new GoogleAuthProvider();
  if (nom === 'google') p.setCustomParameters({prompt: 'select_account'});
  try { await signInWithPopup(auth, p); return pub(auth.currentUser); }
  catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e && e.code)) {
      await signInWithRedirect(auth, p); return null;
    }
    throw e;
  }
}
export async function deconnexion() { await signOut(auth); }
export async function renommer(nom) { if (auth.currentUser) await updateProfile(auth.currentUser, {displayName: nom}); }

const ref = () => doc(db, 'utilisateurs', auth.currentUser.uid);
export async function lire() { const s = await getDoc(ref()); return s.exists() ? s.data() : null; }
export async function ecrire(data) { await setDoc(ref(), data); }
export async function supprimer() {
  const u = auth.currentUser; if (!u) return;
  const last = Date.parse(u.metadata && u.metadata.lastSignInTime) || 0;
  if (Date.now() - last > RECENT_MS) { const e = new Error('recent'); e.code = 'auth/requires-recent-login'; throw e; }
  await deleteDoc(ref());
  await deleteUser(u);
}
