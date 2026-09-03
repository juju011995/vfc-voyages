// Remplacement de idb-keyval par Firestore, avec la même API minimale
// (get/set/del/keys/setMany/clear) pour que db.ts n'ait presque rien à
// changer — toute la logique métier (seeding, dédoublonnage, calculs...)
// reste identique, seule la couche de stockage change.
//
// Chaque clé actuelle (ex. "task:abc123") devient l'id d'un document dans
// la collection "kv" ; la valeur est enveloppée dans { value } car un
// document Firestore doit être un objet, alors que nos valeurs stockées
// sont parfois des tableaux ou (avant) n'importe quelle valeur structurée-
// clonable.
//
// Simplification assumée : comme le faisait déjà idb-keyval ici, on liste
// TOUTES les clés puis on filtre par préfixe côté app plutôt que d'une
// requête Firestore ciblée par préfixe — plus simple, quitte à lire un peu
// plus de documents que nécessaire. Largement suffisant pour le volume de
// données de ce projet (bien en dessous des quotas gratuits).

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { firestore } from "./firebase";

const KV_COLLECTION = "kv";
// Marge sous la limite Firestore de 500 opérations par batch.
const BATCH_SIZE = 400;

function kvDoc(key: string) {
  return doc(firestore, KV_COLLECTION, key);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function get<T>(key: string): Promise<T | undefined> {
  const snap = await getDoc(kvDoc(key));
  return snap.exists() ? (snap.data().value as T) : undefined;
}

// Écritures volontairement non attendues sur le round-trip réseau : la
// promesse renvoyée par setDoc()/deleteDoc()/commit() ne se résout qu'une
// fois le serveur ayant accusé réception — donc jamais tant qu'on est
// hors-ligne, ce qui bloquerait indéfiniment tout code appelant qui fait
// `await saveX(...)` avant de mettre à jour l'état local (exactement le cas
// dans toutes les pages). L'écriture locale (cache persistant) est, elle,
// appliquée immédiatement en interne par le SDK Firestore ; on laisse la
// synchronisation serveur se faire en tâche de fond.
function logWriteError(action: string, key: string) {
  return (err: unknown) => {
    console.error(`[kv] échec "${action}" pour la clé "${key}" (sera retenté par Firestore)`, err);
  };
}

export async function set(key: string, value: unknown): Promise<void> {
  setDoc(kvDoc(key), { value }).catch(logWriteError("set", key));
}

export async function del(key: string): Promise<void> {
  deleteDoc(kvDoc(key)).catch(logWriteError("del", key));
}

export async function keys(): Promise<string[]> {
  const snap = await getDocs(collection(firestore, KV_COLLECTION));
  return snap.docs.map((d) => d.id);
}

export async function setMany(entries: Array<[string, unknown]>): Promise<void> {
  for (const batchEntries of chunk(entries, BATCH_SIZE)) {
    const batch = writeBatch(firestore);
    for (const [key, value] of batchEntries) batch.set(kvDoc(key), { value });
    batch.commit().catch(logWriteError("setMany", `${batchEntries.length} clés`));
  }
}

export async function clear(): Promise<void> {
  const snap = await getDocs(collection(firestore, KV_COLLECTION));
  for (const batchDocs of chunk(snap.docs, BATCH_SIZE)) {
    const batch = writeBatch(firestore);
    for (const d of batchDocs) batch.delete(d.ref);
    batch.commit().catch(logWriteError("clear", `${batchDocs.length} documents`));
  }
}
