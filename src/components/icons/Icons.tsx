// Icônes partagées de l'app — SVG "contours" fait main (stroke currentColor,
// pas d'emoji), une par module, réutilisées à la fois dans la navigation
// principale (AppShell) et dans les en-têtes de chaque module.

export function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3a1 1 0 0 0 1-1v-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Van/4x4 avec cellule pop-up à l'arrière — module Carte. */
export function IconVan() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M2 17v-4l3-4h4l2-3h5v7h5v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 17h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="6.5" cy="18" r="1.6" fill="currentColor" />
      <circle cx="17.5" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.5" cy="14" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Presse-papiers + case cochée — module Tâches. */
export function IconChecklist() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9" y="2.3" width="6" height="3" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m7.7 11.2 1.3 1.3 2.7-2.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 10.3h3.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.7 16h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Caisse de rangement ouverte — module Matériel. */
export function IconCrate() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M3 8 12 4l9 4-9 4-9-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M3 8v7.5L12 19l9-3.5V8M12 12v7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Barre horizontale + points — menu "Plus". */
export function IconDots() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function IconChartBars() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M4 20V4M4 20h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 16v-4M13 16V8M18 16v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Empreinte de patte — module Loki. */
export function IconPawprint() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="15.6" rx="4.3" ry="3.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6.3" cy="9.3" r="1.7" fill="currentColor" />
      <circle cx="10.5" cy="6.3" r="1.7" fill="currentColor" />
      <circle cx="14.5" cy="6.3" r="1.7" fill="currentColor" />
      <circle cx="18" cy="9.6" r="1.7" fill="currentColor" />
    </svg>
  );
}

/** Clé plate — module Véhicule (carnet d'entretien). */
export function IconWrench() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M19 5a4 4 0 0 1-5.3 4.9L7 16.6a1.7 1.7 0 0 1-2.4 0l-.2-.2a1.7 1.7 0 0 1 0-2.4l6.7-6.7A4 4 0 1 1 19 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Carte d'identité (photo + lignes) — module Administratif. */
export function IconIdCard() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8" cy="10.3" r="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.3 16c.5-1.8 1.9-2.6 3.4-2.6s2.9.8 3.4 2.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M14.2 9.3h3.6M14.2 12.3h3.6M14.2 15.3h2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Roue dentée — module Paramètres. */
export function IconGear() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.3v2.6M12 18.1v2.6M20.7 12h-2.6M5.9 12H3.3M18 6l-1.8 1.8M7.8 16.2 6 18M18 18l-1.8-1.8M7.8 7.8 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9.5h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="13.7" r="1" fill="currentColor" />
      <circle cx="12" cy="13.7" r="1" fill="currentColor" />
      <circle cx="16" cy="13.7" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconSun() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.7 6.7 0 0 0 10.2 10.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
