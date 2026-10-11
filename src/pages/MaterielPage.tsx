import { useEffect, useMemo, useState } from "react";
import {
  deleteMaterielItem,
  listMaterielCategories,
  listMaterielItems,
  listTasks,
  saveMaterielCategory,
  saveMaterielItem,
  saveTask,
} from "../lib/db";
import { pickNextTagColor } from "../lib/tagColors";
import {
  countMaterielItems,
  countEmbarkment,
  effectiveEmbarkmentStatus,
  embarkmentAfterPurchaseChange,
  purchaseAfterEmbarkmentChange,
  ITEM_STATUS_TO_TASK_STATUS,
  spentPriceEUR,
  totalPriceEUR,
  MATERIEL_STATUS_LABELS,
  materielEmbarkmentColor,
  materielStatusColor,
} from "../lib/materielCalc";
import { STATUS_TEXT_ON_COLOR } from "../lib/statusColors";
import type {
  MaterielCategory,
  MaterielEmbarkmentStatus,
  MaterielItem,
  MaterielItemStatus,
  Task,
} from "../lib/types";
import { TagFilter, type TagFilterValue } from "../components/shared/TagFilter";
import { TagManager } from "../components/shared/TagManager";
import { MaterielSummaryCard } from "../components/budget/MaterielSummaryCard";
import { MaterielItemList } from "../components/materiel/MaterielItemList";
import { MaterielItemEditor } from "../components/materiel/MaterielItemEditor";
import { MaterielChecklist } from "../components/materiel/MaterielChecklist";
import "./MaterielPage.css";

type MaterielView = "achats" | "embarquer";

const STATUS_FILTERS: Array<{ value: MaterielItemStatus | "tous"; label: string }> = [
  { value: "tous", label: "Tous" },
  { value: "a-acheter", label: MATERIEL_STATUS_LABELS["a-acheter"] },
  { value: "en-cours", label: MATERIEL_STATUS_LABELS["en-cours"] },
  { value: "achete", label: MATERIEL_STATUS_LABELS.achete },
  { value: "deja-possede", label: MATERIEL_STATUS_LABELS["deja-possede"] },
];

const EMBARKMENT_FILTERS: Array<{ value: MaterielEmbarkmentStatus | "tous"; label: string }> = [
  { value: "tous", label: "Tous" },
  { value: "a-prendre", label: "À prendre" },
  { value: "possede", label: "Possédé" },
  { value: "installe", label: "Installé" },
];

export function MaterielPage() {
  const [categories, setCategories] = useState<MaterielCategory[]>([]);
  const [items, setItems] = useState<MaterielItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [view, setView] = useState<MaterielView>("achats");
  const [categoryFilter, setCategoryFilter] = useState<TagFilterValue>("tous");
  const [statusFilter, setStatusFilter] = useState<MaterielItemStatus | "tous">("tous");
  const [embarkmentFilter, setEmbarkmentFilter] = useState<MaterielEmbarkmentStatus | "tous">(
    "tous",
  );
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | undefined>();
  const [autoSwitchNotice, setAutoSwitchNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [cats, loadedItems, loadedTasks] = await Promise.all([
        listMaterielCategories(),
        listMaterielItems(),
        listTasks(),
      ]);
      setCategories(cats);
      setItems(loadedItems);
      setTasks(loadedTasks);
      setLoaded(true);
    })();
  }, []);

  async function refreshItemsAndTasks() {
    const [freshItems, freshTasks] = await Promise.all([listMaterielItems(), listTasks()]);
    setItems(freshItems);
    setTasks(freshTasks);
  }

  const filteredItems = useMemo(
    () =>
      items
        .filter((i) => categoryFilter === "tous" || i.categoryId === categoryFilter)
        .filter((i) => statusFilter === "tous" || i.status === statusFilter),
    [items, categoryFilter, statusFilter],
  );

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MaterielItem[]>();
    for (const item of filteredItems) {
      if (!map.has(item.categoryId)) map.set(item.categoryId, []);
      map.get(item.categoryId)!.push(item);
    }
    return map;
  }, [filteredItems]);

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => !c.archived && (categoryFilter === "tous" || c.id === categoryFilter),
      ),
    [categories, categoryFilter],
  );

  // Vue "À embarquer" : mêmes catégories/filtre catégorie que la vue Achats,
  // mais son propre filtre de statut (embarquement, pas achat).
  const checklistFilteredItems = useMemo(
    () =>
      items
        .filter((i) => categoryFilter === "tous" || i.categoryId === categoryFilter)
        .filter(
          (i) => embarkmentFilter === "tous" || effectiveEmbarkmentStatus(i) === embarkmentFilter,
        ),
    [items, categoryFilter, embarkmentFilter],
  );

  const checklistItemsByCategory = useMemo(() => {
    const map = new Map<string, MaterielItem[]>();
    for (const item of checklistFilteredItems) {
      if (!map.has(item.categoryId)) map.set(item.categoryId, []);
      map.get(item.categoryId)!.push(item);
    }
    return map;
  }, [checklistFilteredItems]);

  // La progression et les compteurs de la vue "À embarquer" portent sur
  // TOUS les items (pas seulement ceux visibles après filtre), pour rester
  // stables quel que soit le filtre choisi.
  const embarkmentCounts = useMemo(() => countEmbarkment(items), [items]);

  const linkedTaskByItemId = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of tasks) {
      if (task.linkedMaterielItemId) map.set(task.linkedMaterielItemId, task);
    }
    return map;
  }, [tasks]);

  const editingItem = items.find((i) => i.id === editingItemId);
  const editingItemLinkedTask = editingItem
    ? linkedTaskByItemId.get(editingItem.id)
    : undefined;
  const linkableTasks = useMemo(
    () => tasks.filter((t) => !t.linkedMaterielItemId),
    [tasks],
  );

  const counts = useMemo(() => countMaterielItems(items), [items]);
  const total = useMemo(() => totalPriceEUR(items), [items]);
  const spent = useMemo(() => spentPriceEUR(items), [items]);

  // -- Catégories -------------------------------------------------------------
  async function handleAddCategory(name: string) {
    const category: MaterielCategory = {
      id: crypto.randomUUID(),
      name,
      isDefault: false,
      color: pickNextTagColor(categories.map((c) => c.color)),
      createdAt: Date.now(),
    };
    await saveMaterielCategory(category);
    setCategories((prev) => [...prev, category]);
  }

  async function handleRenameCategory(id: string, name: string) {
    const category = categories.find((c) => c.id === id);
    if (!category) return;
    const updated = { ...category, name };
    await saveMaterielCategory(updated);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleArchiveCategory(id: string) {
    const category = categories.find((c) => c.id === id);
    if (!category) return;
    const updated = { ...category, archived: true };
    await saveMaterielCategory(updated);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleChangeCategoryColor(id: string, color: string) {
    const category = categories.find((c) => c.id === id);
    if (!category) return;
    const updated = { ...category, color };
    await saveMaterielCategory(updated);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  // -- Items --------------------------------------------------------------
  async function handleAddItem(categoryId: string) {
    const now = Date.now();
    const item: MaterielItem = {
      id: crypto.randomUUID(),
      name: "",
      categoryId,
      quantity: 1,
      status: "a-acheter",
      createdAt: now,
      updatedAt: now,
    };
    await saveMaterielItem(item);
    setItems((prev) => [...prev, item]);
    setEditingItemId(item.id);
  }

  async function handleSaveItem(updates: Partial<MaterielItem>) {
    if (!editingItemId) return;
    const current = items.find((i) => i.id === editingItemId);
    if (!current) return;
    const updated: MaterielItem = { ...current, ...updates, updatedAt: Date.now() };
    await saveMaterielItem(updated);
    await refreshItemsAndTasks();
  }

  async function handleDeleteItem(id: string) {
    await deleteMaterielItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setEditingItemId((current) => (current === id ? undefined : current));
    await refreshItemsAndTasks();
  }

  function handleCloseItemEditor() {
    const item = items.find((i) => i.id === editingItemId);
    if (item && !item.name.trim()) {
      handleDeleteItem(item.id);
    } else {
      setEditingItemId(undefined);
    }
  }

  async function handleStatusChange(id: string, status: MaterielItemStatus) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    // Un achat qui devient "acheté"/"déjà possédé" avance l'embarquement à
    // "possédé" s'il était encore "à prendre" ; un retour à "à acheter"/"en
    // cours" le remet à "à prendre", sauf s'il est déjà "installé" (jamais
    // de régression automatique) — voir embarkmentAfterPurchaseChange.
    const embarkmentStatus = embarkmentAfterPurchaseChange(
      effectiveEmbarkmentStatus(item),
      status,
    );
    const updated: MaterielItem = { ...item, status, embarkmentStatus, updatedAt: Date.now() };
    await saveMaterielItem(updated);
    await refreshItemsAndTasks();
  }

  async function handleEmbarkmentChange(id: string, embarkmentStatus: MaterielEmbarkmentStatus) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    // Marquer "possédé"/"installé" un objet pas encore acheté bascule
    // automatiquement son achat en "déjà possédé" — signalé par un message
    // discret, corrigible en "Acheté" depuis la fiche de l'item.
    const status = purchaseAfterEmbarkmentChange(item.status, embarkmentStatus);
    const updated: MaterielItem = { ...item, status, embarkmentStatus, updatedAt: Date.now() };
    await saveMaterielItem(updated);
    if (status !== item.status) {
      setAutoSwitchNotice(
        `« ${item.name || "Cet item"} » est passé en achat « Déjà possédé » — modifiable dans sa fiche si besoin.`,
      );
      window.setTimeout(() => setAutoSwitchNotice(null), 5000);
    }
    await refreshItemsAndTasks();
  }

  async function handleLinkTask(itemId: string, taskId: string) {
    const item = items.find((i) => i.id === itemId);
    const target = tasks.find((t) => t.id === taskId);
    if (!item || !target) return;

    const previouslyLinked = tasks.find(
      (t) => t.linkedMaterielItemId === itemId && t.id !== taskId,
    );
    if (previouslyLinked) {
      const { linkedMaterielItemId, ...rest } = previouslyLinked;
      await saveTask({ ...rest, updatedAt: Date.now() });
    }

    await saveTask({
      ...target,
      linkedMaterielItemId: itemId,
      status: ITEM_STATUS_TO_TASK_STATUS[item.status],
      updatedAt: Date.now(),
    });
    await refreshItemsAndTasks();
  }

  async function handleUnlinkTask(itemId: string) {
    const linked = tasks.find((t) => t.linkedMaterielItemId === itemId);
    if (!linked) return;
    const { linkedMaterielItemId, ...rest } = linked;
    await saveTask({ ...rest, updatedAt: Date.now() });
    await refreshItemsAndTasks();
  }

  if (!loaded) {
    return <p className="materiel-page__loading">Chargement…</p>;
  }

  return (
    <div className="materiel-page">
      <MaterielSummaryCard totalEUR={total} spentEUR={spent} counts={counts} />

      <div className="materiel-page__view-toggle" role="tablist" aria-label="Vue Matériel">
        <button
          type="button"
          role="tab"
          aria-selected={view === "achats"}
          className={view === "achats" ? "is-active" : ""}
          onClick={() => setView("achats")}
        >
          Achats
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "embarquer"}
          className={view === "embarquer" ? "is-active" : ""}
          onClick={() => setView("embarquer")}
        >
          À embarquer
        </button>
      </div>

      {autoSwitchNotice && <p className="materiel-page__notice">{autoSwitchNotice}</p>}

      <TagFilter
        items={categories}
        value={categoryFilter}
        onChange={setCategoryFilter}
        allLabel="Toutes catégories"
      />

      {view === "achats" ? (
        <>
          <div
            className="materiel-page__status-filter"
            role="tablist"
            aria-label="Filtrer par statut d'achat"
          >
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.value;
              const color = f.value === "tous" ? undefined : materielStatusColor(f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? "is-active" : ""}
                  style={
                    active
                      ? color
                        ? { background: color, color: STATUS_TEXT_ON_COLOR }
                        : undefined
                      : { color: "var(--color-text)" }
                  }
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="materiel-page__categories-toggle"
            onClick={() => setShowCategoryManager((v) => !v)}
          >
            {showCategoryManager ? "Masquer la gestion des catégories" : "Gérer les catégories"}
          </button>

          {showCategoryManager && (
            <TagManager
              items={categories}
              addPlaceholder="Nouvelle catégorie…"
              onAdd={handleAddCategory}
              onRename={handleRenameCategory}
              onArchive={handleArchiveCategory}
              onFilter={(id) => {
                setCategoryFilter(id);
                setShowCategoryManager(false);
              }}
              showColorPicker
              onColorChange={handleChangeCategoryColor}
            />
          )}

          <MaterielItemList
            categories={visibleCategories}
            itemsByCategory={itemsByCategory}
            linkedTaskByItemId={linkedTaskByItemId}
            onOpen={(item) => setEditingItemId(item.id)}
            onStatusChange={handleStatusChange}
            onAddForCategory={handleAddItem}
          />
        </>
      ) : (
        <>
          <div
            className="materiel-page__status-filter"
            role="tablist"
            aria-label="Filtrer par statut d'embarquement"
          >
            {EMBARKMENT_FILTERS.map((f) => {
              const active = embarkmentFilter === f.value;
              const color = f.value === "tous" ? undefined : materielEmbarkmentColor(f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? "is-active" : ""}
                  style={
                    active
                      ? color
                        ? { background: color, color: STATUS_TEXT_ON_COLOR }
                        : undefined
                      : { color: "var(--color-text)" }
                  }
                  onClick={() => setEmbarkmentFilter(f.value)}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <MaterielChecklist
            categories={visibleCategories}
            itemsByCategory={checklistItemsByCategory}
            counts={embarkmentCounts}
            onEmbarkmentChange={handleEmbarkmentChange}
          />
        </>
      )}

      {editingItem && (
        <div className="materiel-page__editor-overlay">
          <MaterielItemEditor
            item={editingItem}
            categories={categories}
            linkedTask={editingItemLinkedTask}
            linkableTasks={linkableTasks}
            onClose={handleCloseItemEditor}
            onSave={handleSaveItem}
            onDelete={handleDeleteItem}
            onLinkTask={(taskId) => handleLinkTask(editingItem.id, taskId)}
            onUnlinkTask={() => handleUnlinkTask(editingItem.id)}
          />
        </div>
      )}
    </div>
  );
}
