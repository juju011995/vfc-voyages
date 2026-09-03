// Connexion Firebase — synchronisation cloud entre appareils.
//
// Firestore fait déjà tout le travail « hors-ligne d'abord » qu'on veut :
// persistentLocalCache stocke les données dans IndexedDB côté navigateur,
// sert ce cache instantanément (avec ou sans réseau), et rejoue en tâche de
// fond les écritures faites hors-ligne dès que la connexion revient — sans
// code de synchronisation à écrire à la main.
//
// La config ci-dessous est volontairement publique (elle finit dans le
// bundle JS envoyé au navigateur, comme pour tout projet Firebase) : la
// protection réelle des données vient des règles de sécurité Firestore
// (voir firestore.rules), pas du secret de ces valeurs.

import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

const app = initializeApp(firebaseConfig);

export const firestore = initializeFirestore(app, {
  // Un seul onglet à la fois peut ouvrir le cache persistant par défaut ;
  // le tab manager multiple permet plusieurs onglets simultanés du même
  // appareil sans erreur (ex. desktop avec l'app ouverte deux fois).
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  // Beaucoup de champs optionnels de l'app (ex. Task.description) valent
  // `undefined` plutôt que d'être omis — Firestore rejette `undefined` par
  // défaut ; ce réglage l'ignore silencieusement au lieu de faire planter
  // chaque sauvegarde.
  ignoreUndefinedProperties: true,
});

export const auth = getAuth(app);

// Émulateur local (firebase emulators:start) — uniquement pour le
// développement/les tests, jamais en production (voir .env.local.example).
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}
