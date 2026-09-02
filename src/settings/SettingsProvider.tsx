// Contexte global pour AppSettings (devise par défaut, noms de profils) —
// même principe que ThemeProvider (src/theme/ThemeProvider.tsx), mais
// persisté en IndexedDB plutôt qu'en localStorage puisque ces réglages ne
// sont pas nécessaires avant le premier rendu (pas de flash à éviter comme
// pour le thème). Un seul point d'écriture (updateSettings) pour éviter
// toute course entre deux champs modifiés séparément (ex. devise et noms).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAppSettings, saveAppSettings } from "../lib/db";
import type { AppSettings } from "../lib/types";

const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: "EUR",
  profileNames: { justine: "Justine", nathan: "Nathan" },
};

interface SettingsContextValue {
  settings: AppSettings;
  /** false tant que la lecture initiale depuis IndexedDB n'est pas terminée. */
  loaded: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getAppSettings();
      setSettings(stored);
      setLoaded(true);
    })();
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next: AppSettings = {
        ...prev,
        ...patch,
        profileNames: { ...prev.profileNames, ...patch.profileNames },
      };
      saveAppSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, loaded, updateSettings }),
    [settings, loaded, updateSettings],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings doit être utilisé dans <SettingsProvider>");
  return ctx;
}
