import { useEffect, useMemo, useState } from "react";
import {
  deleteCalendarEvent,
  listCalendarEvents,
  listTaskTags,
  listTasks,
  saveCalendarEvent,
} from "../lib/db";
import { buildAgenda, getUpcomingAgenda, groupAgendaByDate } from "../lib/calendarCalc";
import type { CalendarEvent, Task, TaskTag } from "../lib/types";
import { useTheme } from "../theme/ThemeProvider";
import { getPalette } from "../theme/palette";
import { MonthGrid } from "../components/calendar/MonthGrid";
import { AgendaList } from "../components/calendar/AgendaList";
import { EventEditor } from "../components/calendar/EventEditor";
import "./CalendarPage.css";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface CalendarPageProps {
  onOpenTaches: () => void;
}

export function CalendarPage({ onOpenTaches }: CalendarPageProps) {
  const { resolvedTheme } = useTheme();
  const palette = getPalette(resolvedTheme);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<TaskTag[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [editingEventId, setEditingEventId] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const [loadedEvents, loadedTasks, loadedTags] = await Promise.all([
        listCalendarEvents(),
        listTasks(),
        listTaskTags(),
      ]);
      setEvents(loadedEvents);
      setTasks(loadedTasks);
      setTags(loadedTags);
      setLoaded(true);
    })();
  }, []);

  const agenda = useMemo(() => buildAgenda(events, tasks), [events, tasks]);
  const agendaByDate = useMemo(() => groupAgendaByDate(agenda), [agenda]);
  const selectedDayItems = agendaByDate.get(selectedDate) ?? [];
  const upcoming = useMemo(() => getUpcomingAgenda(agenda, 5), [agenda]);

  const editingEvent = events.find((e) => e.id === editingEventId);

  async function handleAddEvent() {
    const now = Date.now();
    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title: "",
      date: selectedDate,
      source: "local",
      createdAt: now,
      updatedAt: now,
    };
    await saveCalendarEvent(newEvent);
    setEvents((prev) => [...prev, newEvent]);
    setEditingEventId(newEvent.id);
  }

  async function handleSaveEvent(updates: Partial<CalendarEvent>) {
    if (!editingEventId) return;
    setEvents((prev) => {
      const next = prev.map((e) =>
        e.id === editingEventId ? { ...e, ...updates, updatedAt: Date.now() } : e,
      );
      const updated = next.find((e) => e.id === editingEventId);
      if (updated) saveCalendarEvent(updated);
      return next;
    });
  }

  async function handleDeleteEvent(id: string) {
    await deleteCalendarEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setEditingEventId((current) => (current === id ? undefined : current));
  }

  function handleCloseEditor() {
    const event = events.find((e) => e.id === editingEventId);
    if (event && !event.title.trim()) {
      handleDeleteEvent(event.id);
    } else {
      setEditingEventId(undefined);
    }
  }

  if (!loaded) {
    return <p className="calendar-page__loading">Chargement…</p>;
  }

  return (
    <div className="calendar-page">
      <h2 className="calendar-page__heading">Calendrier</h2>

      <MonthGrid
        month={month}
        onMonthChange={setMonth}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        itemsByDate={agendaByDate}
        tags={tags}
      />

      <div className="calendar-page__day-header">
        <h3>
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h3>
        <button type="button" className="btn btn--primary" onClick={handleAddEvent}>
          + Événement
        </button>
      </div>

      <AgendaList
        items={selectedDayItems}
        tags={tags}
        palette={palette}
        onEditEvent={setEditingEventId}
        onOpenTask={onOpenTaches}
        emptyLabel="Rien de prévu ce jour-là."
      />

      {editingEvent && (
        <div className="calendar-page__editor-overlay">
          <EventEditor
            event={editingEvent}
            onClose={handleCloseEditor}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEvent}
          />
        </div>
      )}

      <h3 className="calendar-page__upcoming-title">À venir</h3>
      <AgendaList
        items={upcoming}
        tags={tags}
        palette={palette}
        onEditEvent={setEditingEventId}
        onOpenTask={onOpenTaches}
        emptyLabel="Rien de prévu dans les prochains jours."
      />
    </div>
  );
}
