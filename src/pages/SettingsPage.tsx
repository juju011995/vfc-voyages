import { useEffect, useState } from "react";
import { exportAllData } from "../lib/db";
import { COMMON_CURRENCIES } from "../lib/currency";
import { useSettings } from "../settings/SettingsProvider";
import { useTheme, type ThemeChoice } from "../theme/ThemeProvider";
import { getPalette } from "../theme/palette";
import { PersonBadge } from "../components/shared/PersonBadge";
import "./SettingsPage.css";

const THEME_CHOICES: Array<{ value: ThemeChoice; label: string }> = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "system", label: "Système" },
];

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const palette = getPalette(resolvedTheme);

  const [justineName, setJustineName] = useState(settings.profileNames.justine);
  const [nathanName, setNathanName] = useState(settings.profileNames.nathan);
  const [namesSaved, setNamesSaved] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  useEffect(() => {
    setJustineName(settings.profileNames.justine);
    setNathanName(settings.profileNames.nathan);
  }, [settings.profileNames.justine, settings.profileNames.nathan]);

  function handleSaveNames() {
    const justine = justineName.trim();
    const nathan = nathanName.trim();
    if (!justine || !nathan) return;
    updateSettings({ profileNames: { justine, nathan } });
    setNamesSaved(true);
    setTimeout(() => setNamesSaved(false), 2000);
  }

  async function handleExport() {
    setExportStatus("Préparation du fichier…");
    try {
      const data = await exportAllData();
      const payload = {
        app: "vfc-voyages",
        exportedAt: new Date().toISOString(),
        data,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vfc-voyages-sauvegarde-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus("Fichier téléchargé.");
    } catch {
      setExportStatus("Échec de l'export — réessaie.");
    } finally {
      setTimeout(() => setExportStatus(null), 3000);
    }
  }

  return (
    <div className="settings-page">
      <h2 className="settings-page__heading">Paramètres</h2>

      <div className="settings-card">
        <h3>Apparence</h3>
        <p className="settings-card__hint">
          L'icône en haut de chaque page bascule aussi entre clair et sombre.
        </p>
        <div className="settings-page__toggle" role="tablist" aria-label="Thème">
          {THEME_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              role="tab"
              aria-selected={theme === choice.value}
              className={theme === choice.value ? "is-active" : ""}
              onClick={() => setTheme(choice.value)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <h3>Devise par défaut</h3>
        <p className="settings-card__hint">
          Présélectionnée à l'ajout d'une nouvelle dépense dans le module Budget —
          les totaux restent toujours affichés en euros.
        </p>
        <select
          className="settings-page__currency-select"
          value={settings.defaultCurrency}
          onChange={(e) => updateSettings({ defaultCurrency: e.target.value })}
        >
          {COMMON_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-card">
        <h3>Profils</h3>
        <p className="settings-card__hint">
          Change le nom affiché si besoin — les couleurs restent inchangées.
        </p>

        <div className="settings-page__profile-row">
          <PersonBadge payer="justine" palette={palette} size={28} />
          <input
            type="text"
            value={justineName}
            onChange={(e) => setJustineName(e.target.value)}
            placeholder="Nom affiché"
          />
        </div>
        <div className="settings-page__profile-row">
          <PersonBadge payer="nathan" palette={palette} size={28} />
          <input
            type="text"
            value={nathanName}
            onChange={(e) => setNathanName(e.target.value)}
            placeholder="Nom affiché"
          />
        </div>

        <button type="button" className="btn btn--primary" onClick={handleSaveNames}>
          {namesSaved ? "Enregistré ✓" : "Enregistrer les noms"}
        </button>
      </div>

      <div className="settings-card">
        <h3>Sauvegarde</h3>
        <p className="settings-card__hint">
          Télécharge une copie de toutes les données de l'application (Carte, Budget,
          Tâches, Calendrier, Loki, Matériel) au format JSON, à conserver en lieu sûr.
        </p>
        <button type="button" className="btn btn--secondary" onClick={handleExport}>
          Télécharger mes données (JSON)
        </button>
        {exportStatus && <p className="settings-card__status">{exportStatus}</p>}
      </div>
    </div>
  );
}
