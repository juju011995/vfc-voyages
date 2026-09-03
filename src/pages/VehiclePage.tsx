import { useEffect, useMemo, useState } from "react";
import {
  deleteMaintenanceLog,
  getVehicleSettings,
  listMaintenanceLogs,
  listMaintenanceTypes,
  listTasks,
  saveMaintenanceLog,
  saveMaintenanceType,
  saveTask,
  saveVehicleSettings,
} from "../lib/db";
import { pickNextTagColor } from "../lib/tagColors";
import { buildMaintenanceStatuses, computeCurrentOdometerKm } from "../lib/vehicleCalc";
import type { MaintenanceLog, MaintenanceType, Task, VehicleSettings } from "../lib/types";
import { TagFilter, type TagFilterValue } from "../components/shared/TagFilter";
import { TagManager } from "../components/shared/TagManager";
import { MaintenanceCard } from "../components/vehicle/MaintenanceCard";
import { MaintenanceLogEditor } from "../components/vehicle/MaintenanceLogEditor";
import { MaintenanceLogList } from "../components/vehicle/MaintenanceLogList";
import { IntervalManager } from "../components/vehicle/IntervalManager";
import { IconWrench } from "../components/icons/Icons";
import "./VehiclePage.css";

type SubTab = "echeances" | "carnet";

function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString("fr-FR")} km`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function VehiclePage() {
  const [subTab, setSubTab] = useState<SubTab>("echeances");
  const [loaded, setLoaded] = useState(false);

  const [types, setTypes] = useState<MaintenanceType[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vehicleSettings, setVehicleSettings] = useState<VehicleSettings>({
    startingOdometerKm: 0,
  });
  const [currentOdometerKm, setCurrentOdometerKm] = useState(0);
  const [odometerInput, setOdometerInput] = useState("0");

  const [showTypeManager, setShowTypeManager] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<TagFilterValue>("tous");

  useEffect(() => {
    (async () => {
      const [loadedTypes, loadedLogs, loadedTasks, settings] = await Promise.all([
        listMaintenanceTypes(),
        listMaintenanceLogs(),
        listTasks(),
        getVehicleSettings(),
      ]);
      const odometer = await computeCurrentOdometerKm(settings);
      setTypes(loadedTypes);
      setLogs(loadedLogs);
      setTasks(loadedTasks);
      setVehicleSettings(settings);
      setCurrentOdometerKm(odometer);
      setOdometerInput(String(settings.startingOdometerKm));
      setLoaded(true);
    })();
  }, []);

  const statuses = useMemo(
    () => buildMaintenanceStatuses(types, logs, currentOdometerKm),
    [types, logs, currentOdometerKm],
  );

  const linkedTaskByTypeId = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of tasks) {
      if (task.linkedVehicleTypeId) map.set(task.linkedVehicleTypeId, task);
    }
    return map;
  }, [tasks]);

  const linkableTasks = useMemo(() => tasks.filter((t) => !t.linkedVehicleTypeId), [tasks]);

  const editingLog = logs.find((l) => l.id === editingLogId);

  const filteredLogs = useMemo(
    () => logs.filter((l) => typeFilter === "tous" || l.typeId === typeFilter),
    [logs, typeFilter],
  );

  // -- Types ------------------------------------------------------------
  async function handleAddType(name: string) {
    const type: MaintenanceType = {
      id: crypto.randomUUID(),
      name,
      isDefault: false,
      color: pickNextTagColor(types.map((t) => t.color)),
      createdAt: Date.now(),
    };
    await saveMaintenanceType(type);
    setTypes((prev) => [...prev, type]);
  }

  async function handleRenameType(id: string, name: string) {
    const type = types.find((t) => t.id === id);
    if (!type) return;
    const updated = { ...type, name };
    await saveMaintenanceType(updated);
    setTypes((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleArchiveType(id: string) {
    const type = types.find((t) => t.id === id);
    if (!type) return;
    const updated = { ...type, archived: true };
    await saveMaintenanceType(updated);
    setTypes((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleChangeTypeColor(id: string, color: string) {
    const type = types.find((t) => t.id === id);
    if (!type) return;
    const updated = { ...type, color };
    await saveMaintenanceType(updated);
    setTypes((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleChangeInterval(typeId: string, intervalKm: number | undefined) {
    const type = types.find((t) => t.id === typeId);
    if (!type) return;
    const updated = { ...type, intervalKm };
    await saveMaintenanceType(updated);
    setTypes((prev) => prev.map((t) => (t.id === typeId ? updated : t)));
  }

  // -- Odomètre -------------------------------------------------------------
  async function handleSaveOdometer() {
    const parsed = parseInt(odometerInput, 10);
    const updated: VehicleSettings = {
      startingOdometerKm: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    };
    await saveVehicleSettings(updated);
    setVehicleSettings(updated);
    const odometer = await computeCurrentOdometerKm(updated);
    setCurrentOdometerKm(odometer);
  }

  // -- Interventions --------------------------------------------------------
  async function handleOpenLogEditor(typeId?: string, prefillKm?: number) {
    const now = Date.now();
    const targetTypeId = typeId ?? types.find((t) => !t.archived)?.id ?? "";
    const log: MaintenanceLog = {
      id: crypto.randomUUID(),
      typeId: targetTypeId,
      date: todayIso(),
      km: prefillKm !== undefined ? Math.round(prefillKm) : Math.round(currentOdometerKm),
      createdAt: now,
      updatedAt: now,
    };
    await saveMaintenanceLog(log);
    setLogs((prev) => [...prev, log]);
    setEditingLogId(log.id);
  }

  async function handleSaveLog(updates: Partial<MaintenanceLog>) {
    if (!editingLogId) return;
    const current = logs.find((l) => l.id === editingLogId);
    if (!current) return;
    const updated: MaintenanceLog = { ...current, ...updates, updatedAt: Date.now() };
    await saveMaintenanceLog(updated);
    setLogs((prev) => prev.map((l) => (l.id === editingLogId ? updated : l)));
  }

  async function handleDeleteLog(id: string) {
    await deleteMaintenanceLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setEditingLogId((current) => (current === id ? undefined : current));
  }

  // -- Lien tâche -------------------------------------------------------------
  async function handleLinkTask(typeId: string, taskId: string) {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const now = Date.now();
    const previouslyLinked = tasks.find(
      (t) => t.linkedVehicleTypeId === typeId && t.id !== taskId,
    );

    const nextTasks = [...tasks];
    if (previouslyLinked) {
      const { linkedVehicleTypeId, ...rest } = previouslyLinked;
      void linkedVehicleTypeId;
      const cleared: Task = { ...rest, updatedAt: now };
      await saveTask(cleared);
      const idx = nextTasks.findIndex((t) => t.id === cleared.id);
      if (idx !== -1) nextTasks[idx] = cleared;
    }

    const updatedTarget: Task = { ...target, linkedVehicleTypeId: typeId, updatedAt: now };
    await saveTask(updatedTarget);
    const idx = nextTasks.findIndex((t) => t.id === updatedTarget.id);
    if (idx !== -1) nextTasks[idx] = updatedTarget;

    setTasks(nextTasks);
  }

  async function handleUnlinkTask(typeId: string) {
    const linked = tasks.find((t) => t.linkedVehicleTypeId === typeId);
    if (!linked) return;
    const { linkedVehicleTypeId, ...rest } = linked;
    void linkedVehicleTypeId;
    const cleared: Task = { ...rest, updatedAt: Date.now() };
    await saveTask(cleared);
    setTasks((prev) => prev.map((t) => (t.id === cleared.id ? cleared : t)));
  }

  if (!loaded) {
    return <p className="vehicle-page__loading">Chargement…</p>;
  }

  return (
    <div className="vehicle-page">
      <h2 className="vehicle-page__heading page-heading">
        <span className="page-heading-icon">
          <IconWrench />
        </span>
        Véhicule
      </h2>

      <div className="vehicle-page__toolbar" role="tablist" aria-label="Sections Véhicule">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "echeances"}
          className={subTab === "echeances" ? "is-active" : ""}
          onClick={() => setSubTab("echeances")}
        >
          Échéances
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "carnet"}
          className={subTab === "carnet" ? "is-active" : ""}
          onClick={() => setSubTab("carnet")}
        >
          Carnet
        </button>
      </div>

      <div className="vehicle-page__odometer">
        <label>
          <span>Kilométrage de départ (avant le voyage)</span>
          <div className="vehicle-page__odometer-row">
            <input
              type="text"
              inputMode="numeric"
              value={odometerInput}
              onChange={(e) => setOdometerInput(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={handleSaveOdometer}
            />
            <span>km</span>
          </div>
        </label>
        <p className="vehicle-page__odometer-current">
          Kilométrage actuel estimé : <strong>{formatKm(currentOdometerKm)}</strong>
          {vehicleSettings.startingOdometerKm === 0 && " (= km parcourus depuis le départ)"}
        </p>
      </div>

      <button
        type="button"
        className="vehicle-page__types-toggle"
        onClick={() => setShowTypeManager((v) => !v)}
      >
        {showTypeManager ? "Masquer la gestion des types" : "Gérer les types d'entretien"}
      </button>

      {showTypeManager && (
        <div className="vehicle-page__type-manager">
          <TagManager
            items={types}
            addPlaceholder="Nouveau type…"
            onAdd={handleAddType}
            onRename={handleRenameType}
            onArchive={handleArchiveType}
            onFilter={(id) => {
              setTypeFilter(id);
              setSubTab("carnet");
            }}
            showColorPicker
            onColorChange={handleChangeTypeColor}
          />
          <h4 className="vehicle-page__interval-title">Intervalles (km)</h4>
          <IntervalManager types={types} onChangeInterval={handleChangeInterval} />
        </div>
      )}

      {subTab === "echeances" && (
        <div className="vehicle-page__section">
          {statuses.length === 0 ? (
            <p className="vehicle-page__empty">Aucun type d'entretien pour l'instant.</p>
          ) : (
            <div className="vehicle-page__cards">
              {statuses.map((status) => (
                <MaintenanceCard
                  key={status.type.id}
                  status={status}
                  linkedTask={linkedTaskByTypeId.get(status.type.id)}
                  linkableTasks={linkableTasks}
                  currentOdometerKm={currentOdometerKm}
                  onOpenLogEditor={handleOpenLogEditor}
                  onLinkTask={handleLinkTask}
                  onUnlinkTask={handleUnlinkTask}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "carnet" && (
        <div className="vehicle-page__section">
          <div className="vehicle-page__section-header">
            <TagFilter
              items={types}
              value={typeFilter}
              onChange={setTypeFilter}
              allLabel="Tous les types"
            />
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => handleOpenLogEditor()}
            >
              + Ajouter
            </button>
          </div>
          <MaintenanceLogList
            logs={filteredLogs}
            types={types}
            onEdit={(log) => setEditingLogId(log.id)}
          />
        </div>
      )}

      {editingLog && (
        <div className="vehicle-page__editor-overlay">
          <MaintenanceLogEditor
            log={editingLog}
            types={types}
            onClose={() => setEditingLogId(undefined)}
            onSave={handleSaveLog}
            onDelete={handleDeleteLog}
          />
        </div>
      )}
    </div>
  );
}
