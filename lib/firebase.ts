// Firebase client SDK initialization.
//
// The Firebase "apiKey" is safe to expose in client code by design — it just
// identifies your project, it is not a secret. Firestore/Storage/Auth are
// actually protected by Security Rules, not by hiding this key. Anything
// that IS a real secret (service account keys, GitLab tokens, Supabase
// service_role/secret keys) must never live in this file or in any
// client-side code — those belong on the server only (e.g. Firebase Cloud
// Functions config / Secret Manager).

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAtLbivLHqv-75NzVBzDVvZQ1bz4MHLOJY",
  authDomain: "tsc--tama-studio-community.firebaseapp.com",
  databaseURL: "https://tsc--tama-studio-community-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tsc--tama-studio-community",
  storageBucket: "tsc--tama-studio-community.firebasestorage.app",
  messagingSenderId: "435629911456",
  appId: "1:435629911456:web:cd20355ee9d89c99efc8c5",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Auth providers: Google + GitHub as OAuth popups, plus Email & Password
// via signInWithEmailAndPassword / createUserWithEmailAndPassword directly.
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
