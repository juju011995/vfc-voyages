import { useEffect, useMemo, useState } from "react";
import {
  deleteLokiDocument,
  deleteTreatment,
  deleteVetContact,
  deleteWeightEntry,
  getLokiCountrySettings,
  listBorderRequirements,
  listLokiDocuments,
  listStops,
  listTaskTags,
  listTasks,
  listTreatments,
  listVetContacts,
  listWeightEntries,
  saveBorderRequirement,
  saveLokiCountrySettings,
  saveLokiDocument,
  saveTreatment,
  saveVetContact,
  saveWeightEntry,
} from "../lib/db";
import { getTasksByTagName } from "../lib/taskCalc";
import { computeVisibleCountries, getDetectedCountries } from "../lib/lokiData";
import type {
  BorderRequirement,
  LokiCountrySettings,
  LokiDocument,
  Stop,
  Task,
  TaskTag,
  Treatment,
  VetContact,
  WeightEntry,
} from "../lib/types";
import { useTheme } from "../theme/ThemeProvider";
import { getPalette } from "../theme/palette";
import { DocumentList } from "../components/loki/DocumentList";
import { DocumentEditor } from "../components/loki/DocumentEditor";
import { WeightChart } from "../components/loki/WeightChart";
import { TreatmentList } from "../components/loki/TreatmentList";
import { TreatmentEditor } from "../components/loki/TreatmentEditor";
import { VetList } from "../components/loki/VetList";
import { VetEditor } from "../components/loki/VetEditor";
import { BorderChecklist } from "../components/loki/BorderChecklist";
import { LokiTaskList } from "../components/loki/LokiTaskList";
import { CountryManager } from "../components/loki/CountryManager";
import { IconPawprint } from "../components/icons/Icons";
import "./LokiPage.css";

type SubTab = "sante" | "veterinaires" | "frontieres" | "taches";

interface LokiPageProps {
  onOpenTaches: () => void;
}

export function LokiPage({ onOpenTaches }: LokiPageProps) {
  const { resolvedTheme } = useTheme();
  const palette = getPalette(resolvedTheme);

  const [subTab, setSubTab] = useState<SubTab>("sante");
  const [loaded, setLoaded] = useState(false);

  const [documents, setDocuments] = useState<LokiDocument[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [vetContacts, setVetContacts] = useState<VetContact[]>([]);
  const [borderRequirements, setBorderRequirements] = useState<BorderRequirement[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTags, setTaskTags] = useState<TaskTag[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [countrySettings, setCountrySettings] = useState<LokiCountrySettings>({
    manuallyAdded: [],
    manuallyRemoved: [],
  });

  const [editingDocumentId, setEditingDocumentId] = useState<string | undefined>();
  const [editingTreatmentId, setEditingTreatmentId] = useState<string | undefined>();
  const [editingVetId, setEditingVetId] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const [docs, weights, treats, allTasks, tags, allStops, settings] = await Promise.all([
        listLokiDocuments(),
        listWeightEntries(),
        listTreatments(),
        listTasks(),
        listTaskTags(),
        listStops(),
        getLokiCountrySettings(),
      ]);
      const detected = getDetectedCountries(allStops);
      const desiredCountries = computeVisibleCountries(detected, settings);
      const [vets, borders] = await Promise.all([
        listVetContacts(desiredCountries),
        listBorderRequirements(desiredCountries),
      ]);
      setDocuments(docs);
      setWeightEntries(weights);
      setTreatments(treats);
      setVetContacts(vets);
      setBorderRequirements(borders);
      setTasks(allTasks);
      setTaskTags(tags);
      setStops(allStops);
      setCountrySettings(settings);
      setLoaded(true);
    })();
  }, []);

  const detectedCountries = useMemo(() => getDetectedCountries(stops), [stops]);
  const visibleCountries = useMemo(
    () => computeVisibleCountries(detectedCountries, countrySettings),
    [detectedCountries, countrySettings],
  );

  async function handleAddCountry(country: string) {
    setCountrySettings((prev) => {
      if (prev.manuallyAdded.includes(country) && !prev.manuallyRemoved.includes(country)) {
        return prev;
      }
      const next: LokiCountrySettings = {
        manuallyAdded: prev.manuallyAdded.includes(country)
          ? prev.manuallyAdded
          : [...prev.manuallyAdded, country],
        manuallyRemoved: prev.manuallyRemoved.filter((c) => c !== country),
      };
      saveLokiCountrySettings(next);
      return next;
    });
  }

  async function handleRemoveCountry(country: string) {
    setCountrySettings((prev) => {
      const next: LokiCountrySettings = {
        manuallyAdded: prev.manuallyAdded.filter((c) => c !== country),
        manuallyRemoved: prev.manuallyRemoved.includes(country)
          ? prev.manuallyRemoved
          : [...prev.manuallyRemoved, country],
      };
      saveLokiCountrySettings(next);
      return next;
    });
  }

  // Sème vétos/frontières pour tout nouveau pays qui apparaît dans la liste
  // affichée (détection Carte ou ajout manuel) — jamais de suppression ici.
  useEffect(() => {
    if (!loaded) return;
    const missingVetCountries = visibleCountries.filter(
      (c) => !vetContacts.some((v) => v.country === c),
    );
    const missingBorderCountries = visibleCountries.filter(
      (c) => !borderRequirements.some((r) => r.country === c),
    );
    if (missingVetCountries.length === 0 && missingBorderCountries.length === 0) return;
    (async () => {
      const [vets, borders] = await Promise.all([
        listVetContacts(visibleCountries),
        listBorderRequirements(visibleCountries),
      ]);
      setVetContacts(vets);
      setBorderRequirements(borders);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCountries, loaded]);

  const lokiTag = taskTags.find((t) => t.name.trim().toLowerCase() === "loki");
  const lokiTasks = useMemo(() => getTasksByTagName(tasks, taskTags, "Loki"), [tasks, taskTags]);

  const vetsByCountry = useMemo(() => {
    const map = new Map<string, VetContact[]>();
    for (const contact of vetContacts) {
      if (!map.has(contact.country)) map.set(contact.country, []);
      map.get(contact.country)!.push(contact);
    }
    return map;
  }, [vetContacts]);

  const editingDocument = documents.find((d) => d.id === editingDocumentId);
  const editingTreatment = treatments.find((t) => t.id === editingTreatmentId);
  const editingVet = vetContacts.find((v) => v.id === editingVetId);

  // -- Documents --------------------------------------------------------
  async function handleAddDocument() {
    const now = Date.now();
    const doc: LokiDocument = {
      id: crypto.randomUUID(),
      title: "",
      type: "vaccin",
      createdAt: now,
      updatedAt: now,
    };
    await saveLokiDocument(doc);
    setDocuments((prev) => [...prev, doc]);
    setEditingDocumentId(doc.id);
  }

  async function handleSaveDocument(updates: Partial<LokiDocument>) {
    if (!editingDocumentId) return;
    setDocuments((prev) => {
      const next = prev.map((d) =>
        d.id === editingDocumentId ? { ...d, ...updates, updatedAt: Date.now() } : d,
      );
      const updated = next.find((d) => d.id === editingDocumentId);
      if (updated) saveLokiDocument(updated);
      return next;
    });
  }

  async function handleDeleteDocument(id: string) {
    await deleteLokiDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setEditingDocumentId((current) => (current === id ? undefined : current));
  }

  function handleCloseDocumentEditor() {
    const doc = documents.find((d) => d.id === editingDocumentId);
    if (doc && !doc.title.trim()) {
      handleDeleteDocument(doc.id);
    } else {
      setEditingDocumentId(undefined);
    }
  }

  // -- Poids --------------------------------------------------------------
  async function handleAddWeight(date: string, weightKg: number) {
    const entry: WeightEntry = { id: crypto.randomUUID(), date, weightKg, createdAt: Date.now() };
    await saveWeightEntry(entry);
    setWeightEntries((prev) => [...prev, entry]);
  }

  async function handleDeleteWeight(id: string) {
    await deleteWeightEntry(id);
    setWeightEntries((prev) => prev.filter((e) => e.id !== id));
  }

  // -- Traitements ----------------------------------------------------------
  async function handleAddTreatment() {
    const now = Date.now();
    const treatment: Treatment = {
      id: crypto.randomUUID(),
      type: "antiparasitaire",
      date: new Date().toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };
    await saveTreatment(treatment);
    setTreatments((prev) => [treatment, ...prev]);
    setEditingTreatmentId(treatment.id);
  }

  async function handleSaveTreatment(updates: Partial<Treatment>) {
    if (!editingTreatmentId) return;
    setTreatments((prev) => {
      const next = prev.map((t) =>
        t.id === editingTreatmentId ? { ...t, ...updates, updatedAt: Date.now() } : t,
      );
      const updated = next.find((t) => t.id === editingTreatmentId);
      if (updated) saveTreatment(updated);
      return next;
    });
  }

  async function handleDeleteTreatment(id: string) {
    await deleteTreatment(id);
    setTreatments((prev) => prev.filter((t) => t.id !== id));
    setEditingTreatmentId((current) => (current === id ? undefined : current));
  }

  // -- Vétérinaires ---------------------------------------------------------
  async function handleAddVet(country: string) {
    const now = Date.now();
    const contact: VetContact = {
      id: crypto.randomUUID(),
      country,
      prefilled: false,
      createdAt: now,
      updatedAt: now,
    };
    await saveVetContact(contact);
    setVetContacts((prev) => [...prev, contact]);
    setEditingVetId(contact.id);
  }

  async function handleSaveVet(updates: Partial<VetContact>) {
    if (!editingVetId) return;
    setVetContacts((prev) => {
      const next = prev.map((v) =>
        v.id === editingVetId ? { ...v, ...updates, updatedAt: Date.now() } : v,
      );
      const updated = next.find((v) => v.id === editingVetId);
      if (updated) saveVetContact(updated);
      return next;
    });
  }

  async function handleDeleteVet(id: string) {
    // Les fiches pré-remplies ne sont pas supprimables (bouton absent côté éditeur) ;
    // celles ajoutées manuellement le sont, y compris en base.
    await deleteVetContact(id);
    setVetContacts((prev) => prev.filter((v) => v.id !== id));
    setEditingVetId((current) => (current === id ? undefined : current));
  }

  // -- Frontières -----------------------------------------------------------
  async function handleToggleBorderItem(country: string, itemId: string) {
    setBorderRequirements((prev) => {
      const next = prev.map((req) =>
        req.country === country
          ? {
              ...req,
              items: req.items.map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item,
              ),
              updatedAt: Date.now(),
            }
          : req,
      );
      const updated = next.find((req) => req.country === country);
      if (updated) saveBorderRequirement(updated);
      return next;
    });
  }

  async function handleSaveBorderNotes(country: string, notes: string) {
    setBorderRequirements((prev) => {
      const next = prev.map((req) =>
        req.country === country ? { ...req, notes, updatedAt: Date.now() } : req,
      );
      const updated = next.find((req) => req.country === country);
      if (updated) saveBorderRequirement(updated);
      return next;
    });
  }

  if (!loaded) {
    return <p className="loki-page__loading">Chargement…</p>;
  }

  return (
    <div className="loki-page">
      <h2 className="loki-page__heading page-heading">
        <span className="page-heading-icon">
          <IconPawprint />
        </span>
        Loki
      </h2>

      <div className="loki-page__toolbar" role="tablist" aria-label="Sections Loki">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "sante"}
          className={subTab === "sante" ? "is-active" : ""}
          onClick={() => setSubTab("sante")}
        >
          Santé
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "veterinaires"}
          className={subTab === "veterinaires" ? "is-active" : ""}
          onClick={() => setSubTab("veterinaires")}
        >
          Vétérinaires
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "frontieres"}
          className={subTab === "frontieres" ? "is-active" : ""}
          onClick={() => setSubTab("frontieres")}
        >
          Frontières
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "taches"}
          className={subTab === "taches" ? "is-active" : ""}
          onClick={() => setSubTab("taches")}
        >
          Tâches
        </button>
      </div>

      {subTab === "sante" && (
        <div className="loki-page__section">
          <div className="loki-page__section-header">
            <h3>Documents &amp; vaccins</h3>
            <button type="button" className="btn btn--primary" onClick={handleAddDocument}>
              + Ajouter
            </button>
          </div>
          <DocumentList documents={documents} onEdit={(d) => setEditingDocumentId(d.id)} />

          {editingDocument && (
            <div className="loki-page__editor-overlay">
              <DocumentEditor
                document={editingDocument}
                onClose={handleCloseDocumentEditor}
                onSave={handleSaveDocument}
                onDelete={handleDeleteDocument}
              />
            </div>
          )}

          <h3 className="loki-page__section-title">Carnet santé — poids</h3>
          <WeightChart
            entries={weightEntries}
            onAdd={handleAddWeight}
            onDelete={handleDeleteWeight}
          />

          <div className="loki-page__section-header">
            <h3>Traitements antiparasitaires</h3>
            <button type="button" className="btn btn--primary" onClick={handleAddTreatment}>
              + Ajouter
            </button>
          </div>
          <TreatmentList
            treatments={treatments}
            onEdit={(t) => setEditingTreatmentId(t.id)}
          />

          {editingTreatment && (
            <div className="loki-page__editor-overlay">
              <TreatmentEditor
                treatment={editingTreatment}
                onClose={() => setEditingTreatmentId(undefined)}
                onSave={handleSaveTreatment}
                onDelete={handleDeleteTreatment}
              />
            </div>
          )}
        </div>
      )}

      {subTab === "veterinaires" && (
        <div className="loki-page__section">
          <p className="loki-page__hint">
            Liste liée à l'itinéraire de la Carte — ajoute ou retire un pays
            manuellement pour préparer une destination pas encore confirmée.
            Aucune adresse n'est devinée automatiquement.
          </p>
          <CountryManager
            visibleCountries={visibleCountries}
            detectedCountries={detectedCountries}
            onAddCountry={handleAddCountry}
            onRemoveCountry={handleRemoveCountry}
          />
          <VetList
            countries={visibleCountries}
            contactsByCountry={vetsByCountry}
            onEdit={(v) => setEditingVetId(v.id)}
            onAddForCountry={handleAddVet}
          />
          {editingVet && (
            <div className="loki-page__editor-overlay">
              <VetEditor
                contact={editingVet}
                onClose={() => setEditingVetId(undefined)}
                onSave={handleSaveVet}
                onDelete={handleDeleteVet}
              />
            </div>
          )}
        </div>
      )}

      {subTab === "frontieres" && (
        <div className="loki-page__section">
          <CountryManager
            visibleCountries={visibleCountries}
            detectedCountries={detectedCountries}
            onAddCountry={handleAddCountry}
            onRemoveCountry={handleRemoveCountry}
          />
          <BorderChecklist
            requirements={visibleCountries
              .map((country) => borderRequirements.find((r) => r.country === country))
              .filter((r): r is BorderRequirement => Boolean(r))}
            onToggleItem={handleToggleBorderItem}
            onSaveNotes={handleSaveBorderNotes}
          />
        </div>
      )}

      {subTab === "taches" && (
        <div className="loki-page__section">
          <LokiTaskList
            tasks={lokiTasks}
            lokiTag={lokiTag}
            palette={palette}
            onOpenTaches={onOpenTaches}
          />
        </div>
      )}
    </div>
  );
}
