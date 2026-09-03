import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "../lib/firebase";
import "./PinGate.css";

// Verrou d'accès partagé — PAS un vrai système de sécurité, juste une
// protection contre un accès accidentel si le lien de l'app traîne quelque
// part (cf. demande explicite : un seul code pour Justine et Nathan, pas de
// compte individuel). Le code n'est jamais stocké/comparé en clair : seul
// son hash SHA-256 est embarqué dans le build (VITE_APP_PIN_HASH), donc un
// coup d'œil rapide au bundle ne le révèle pas — mais quelqu'un de
// techniquement capable pourrait contourner ce verrou, qui ne protège en
// rien les données côté Firestore (voir firestore.rules pour ça).
const UNLOCKED_KEY = "vfc-voyages-unlocked";

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function PinGate({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(UNLOCKED_KEY) === "1");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  // Restaure la session Firebase si l'appareil est déjà "dans les murs"
  // (code déjà validé ici par le passé) mais que l'auth anonyme n'a pas
  // encore été rétablie pour ce chargement de page.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user && localStorage.getItem(UNLOCKED_KEY) === "1") {
        signInAnonymously(auth).catch(() => {
          localStorage.removeItem(UNLOCKED_KEY);
          setUnlocked(false);
        });
      }
    });
    return unsubscribe;
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setChecking(true);
    setError(false);
    try {
      const hash = await sha256Hex(pin.trim());
      if (hash !== import.meta.env.VITE_APP_PIN_HASH) {
        setError(true);
        return;
      }
      await signInAnonymously(auth);
      localStorage.setItem(UNLOCKED_KEY, "1");
      setUnlocked(true);
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  }

  if (unlocked) {
    if (!authReady) {
      return <p className="pin-gate__loading">Chargement…</p>;
    }
    return <>{children}</>;
  }

  return (
    <div className="pin-gate">
      <form className="pin-gate__card" onSubmit={handleSubmit}>
        <h1 className="pin-gate__title">VFC Voyages</h1>
        <p className="pin-gate__hint">Entrez le code d'accès partagé</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          className="pin-gate__input"
          placeholder="Code d'accès"
        />
        {error && <p className="pin-gate__error">Code incorrect.</p>}
        <button type="submit" className="btn btn--primary" disabled={checking || !pin.trim()}>
          {checking ? "Vérification…" : "Valider"}
        </button>
      </form>
    </div>
  );
}
