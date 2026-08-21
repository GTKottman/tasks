import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { completionUpdates } from "../shared/taskCompletion";

type DailyItem = { id: string; sourceItemId: string | null; label: string; completed: boolean; sectionTitle: string; sectionOrder: number; parentSourceId: string | null };
type DailyRoutine = { id: string; routineId: string; routineName: string; category: string; weekdays: number[]; startTime: string; endTime: string; scheduled: boolean; items: DailyItem[] };
type Day = { date: string; status: "complete" | "partial" | "low" | "none"; completed: number; total: number };
type EditorItem = { editorId: string; label: string; parentId?: string | null };
type EditorSection = { editorId: string; title: string; items: EditorItem[] };
type EditorRoutine = { id?: string; name: string; category: string; weekdays: number[]; startTime: string; endTime: string; sortOrder: number; sections: EditorSection[]; archivedAt?: string | null };
type ApiRoutine = { id: string; name: string; category: string; sortOrder: number; archivedAt: string | null; versions: Array<{ weekdays: number[]; startTime: string; endTime: string; sections: Array<{ title: string; items: Array<{ id: string; label: string; parentId: string | null }> }> }> };

const SOUND_NAMES = ["box-checked", "box-unchecked", "section-completed", "routine-completed"] as const;
const audioCache = new Map<string, HTMLAudioElement>();
function getSound(name: string) {
  const cached = audioCache.get(name);
  if (cached) return cached;
  const audio = new Audio(`/assets/sounds/${name}.wav`);
  audio.preload = "auto";
  audioCache.set(name, audio);
  return audio;
}

let csrfToken = "";
function groupItemsBySection(items: DailyItem[]): Array<[string, DailyItem[]]> {
  const groups = new Map<string, DailyItem[]>();
  for (const item of items) {
    const group = groups.get(item.sectionTitle) ?? [];
    group.push(item);
    groups.set(item.sectionTitle, group);
  }
  return [...groups.entries()];
}

function dailyItemHierarchy(items: DailyItem[]) {
  const sourceIds = new Set(items.flatMap((item) => item.sourceItemId ? [item.sourceItemId] : []));
  const children = new Map<string | null, DailyItem[]>();
  for (const item of items) {
    const parentId = item.parentSourceId && sourceIds.has(item.parentSourceId) ? item.parentSourceId : null;
    children.set(parentId, [...(children.get(parentId) ?? []), item]);
  }
  const rows: Array<{ item: DailyItem; depth: number; parentLabel: string | null }> = [];
  const visited = new Set<string>();
  const append = (item: DailyItem, depth: number, parentLabel: string | null) => {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    rows.push({ item, depth, parentLabel });
    if (item.sourceItemId) {
      for (const child of children.get(item.sourceItemId) ?? []) append(child, depth + 1, item.label);
    }
  };
  for (const item of children.get(null) ?? []) append(item, 0, null);
  for (const item of items) append(item, 0, null);
  return rows;
}

function Chevron({ expanded }: { expanded: boolean }) {
  return <svg className="chevron" viewBox="0 0 20 20" aria-hidden="true">
    <path d={expanded ? "M5.75 7.75 10 12l4.25-4.25" : "m8 5.75 4.25 4.25L8 14.25"} />
  </svg>;
}

async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}), ...options.headers },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error ?? "Request failed");
  return body as T;
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ csrfToken: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      csrfToken = result.csrfToken;
      onLogin();
    } catch (reason) { setError((reason as Error).message); }
  }
  return <main className="login"><form className="card login-card" onSubmit={submit}>
    <p className="eyebrow">A gentle rhythm for</p><h1>Daily Routines</h1>
    <label>Email<input name="email" type="email" autoComplete="username" required /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <p className="error" role="alert">{error}</p>}<button>Sign in</button>
  </form></main>;
}

const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function Dashboard() {
  const [date, setDate] = useState(localToday);
  const [year, setYear] = useState(new Date().getFullYear());
  const [routines, setRoutines] = useState<DailyRoutine[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [sound, setSound] = useState(localStorage.getItem("routine-sound") !== "off");
  const [error, setError] = useState("");
  const [, setClock] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("collapsed-routine-categories") ?? "[]") as string[]); }
    catch { return new Set(); }
  });
  const [collapsedRoutines, setCollapsedRoutines] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("collapsed-routines") ?? "[]") as string[]); }
    catch { return new Set(); }
  });
  const load = async () => {
    try {
      const result = await api<{ routines: DailyRoutine[]; yearStatus: Day[] }>(`/api/dashboard?date=${date}&year=${year}`);
      setRoutines(result.routines); setDays(result.yearStatus); setError("");
    } catch (reason) { setError((reason as Error).message); }
  };
  useEffect(() => { void load(); }, [date, year]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        SOUND_NAMES.forEach((name) => getSound(name).load());
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);
  const active = (routine: DailyRoutine) => {
    if (date !== localToday()) return false;
    const now = new Date(); const minutes = now.getHours() * 60 + now.getMinutes();
    const toMinutes = (time: string) => time.split(":").map(Number).reduce((h, m) => h * 60 + m);
    const start = toMinutes(routine.startTime); const end = toMinutes(routine.endTime);
    const inTimeRange = end === start ? false : end > start ? minutes >= start && minutes < end : minutes >= start || minutes < end;
    return routine.weekdays.includes(now.getDay()) && inTimeRange;
  };
  const toggleCategory = (category: string) => setCollapsedCategories((current) => {
    const next = new Set(current);
    if (next.has(category)) next.delete(category); else next.add(category);
    localStorage.setItem("collapsed-routine-categories", JSON.stringify([...next]));
    return next;
  });
  const toggleRoutineCollapse = (routineId: string) => setCollapsedRoutines((current) => {
    const next = new Set(current);
    if (next.has(routineId)) next.delete(routineId); else next.add(routineId);
    localStorage.setItem("collapsed-routines", JSON.stringify([...next]));
    return next;
  });
  const play = (name: string) => {
    if (!sound) return;
    const audio = getSound(name).cloneNode(true) as HTMLAudioElement;
    void audio.play().catch(() => undefined);
  };
  const toggle = async (item: DailyItem) => {
    const completed = !item.completed;
    const routine = routines.find((entry) => entry.items.some((entryItem) => entryItem.id === item.id));
    if (!routine) return;
    const updates = completionUpdates(routine.items, item.id, completed);
    const nextItems = routine.items.map((entry) => updates.has(entry.id) ? { ...entry, completed: updates.get(entry.id)! } : entry);
    const sectionItems = routine?.items.filter((entry) => entry.sectionTitle === item.sectionTitle) ?? [];
    const sectionWasComplete = sectionItems.every((entry) => entry.completed);
    const routineWasComplete = routine?.items.every((entry) => entry.completed) ?? false;
    const sectionNowComplete = nextItems.filter((entry) => entry.sectionTitle === item.sectionTitle).every((entry) => entry.completed);
    const routineNowComplete = nextItems.every((entry) => entry.completed);
    setRoutines((all) => all.map((entry) => entry.routineId === routine.routineId ? { ...entry, items: nextItems } : entry));
    play(`box-${completed ? "checked" : "unchecked"}`);
    if (routineNowComplete && !routineWasComplete) play("routine-completed");
    else if (sectionNowComplete && !sectionWasComplete) play("section-completed");
    try { await api(`/api/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ completed }) }); await load(); }
    catch (reason) { setError((reason as Error).message); await load(); }
  };
  const groupedRoutines = new Map<string, DailyRoutine[]>();
  for (const routine of routines) {
    const group = groupedRoutines.get(routine.category) ?? [];
    group.push(routine);
    groupedRoutines.set(routine.category, group);
  }
  return <main>
    <header><div><p className="eyebrow">A gentle rhythm for</p><h1>Daily Routines</h1></div><nav><Link to="/manage">Edit routines</Link><button className="pill" onClick={() => { const next = !sound; setSound(next); localStorage.setItem("routine-sound", next ? "on" : "off"); }}>{sound ? "Sounds on" : "Sounds off"}</button></nav></header>
    <div className="date-row"><label>Day<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><button className="pill" onClick={() => setDate(localToday())}>Today</button></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="dashboard">
      <section className="routines" aria-label={`Routines for ${date}`}>
        {routines.length === 0 && <div className="card empty">Nothing scheduled. Take a gentle pause.</div>}
        {[...groupedRoutines.entries()].map(([category, categoryRoutines]) => {
          const categoryCollapsed = collapsedCategories.has(category);
          return <section className="routine-category" key={category}>
            <div className="category-heading">
              <h2>{category}</h2><small>{categoryRoutines.length} routine{categoryRoutines.length === 1 ? "" : "s"}</small>
              <button type="button" aria-label={`${categoryCollapsed ? "Expand" : "Collapse"} ${category}`} aria-expanded={!categoryCollapsed} onClick={() => toggleCategory(category)}><Chevron expanded={!categoryCollapsed} /></button>
            </div>
            {!categoryCollapsed && <div className="category-routines">{categoryRoutines.map((routine) => {
              const sections = groupItemsBySection(routine.items);
              const routineCollapsed = collapsedRoutines.has(routine.routineId);
              return <article className={`routine ${active(routine) ? "active" : ""} ${routine.scheduled ? "" : "off-day"}`} key={routine.routineId}>
                <div className="routine-heading">
                  <h2>{routine.routineName}</h2>
                  <span>{routine.scheduled ? `${routine.startTime} to ${routine.endTime}` : `Off day · ${routine.startTime} to ${routine.endTime}`}</span>
                  <button type="button" aria-label={`${routineCollapsed ? "Expand" : "Collapse"} ${routine.routineName}`} aria-expanded={!routineCollapsed} onClick={() => toggleRoutineCollapse(routine.routineId)}><Chevron expanded={!routineCollapsed} /></button>
                </div>
                {!routineCollapsed && <div className="sections">{sections.map(([title, items]) => <section className="section" key={title}><h3>{title}</h3>
                  {dailyItemHierarchy(items).map(({ item, depth, parentLabel }) => <label className={`check ${depth ? "nested" : ""}`} style={{ "--nest-depth": depth } as CSSProperties} key={item.id}><input type="checkbox" checked={item.completed} disabled={!routine.scheduled} onChange={() => routine.scheduled && void toggle(item)} /><span className="check-copy"><span>{item.label}</span>{parentLabel && <small>Under: {parentLabel}</small>}</span></label>)}
                </section>)}</div>}
              </article>;
            })}</div>}
          </section>;
        })}
      </section>
      <aside className="year-panel"><div className="year-heading"><button aria-label="Previous year" onClick={() => setYear(year - 1)}>‹</button><h2>{year}</h2><button aria-label="Next year" onClick={() => setYear(year + 1)}>›</button></div>
        <div className="dot-grid" aria-label={`${year} completion calendar`}>{days.map((day) => <button key={day.date} onClick={() => setDate(day.date)} className={`dot ${day.status} ${date === day.date ? "selected" : ""}`} title={`${day.date}: ${day.total ? `${day.completed} of ${day.total}` : "no schedules"}`} aria-label={`${day.date}: ${day.status}`} />)}</div>
        <div className="key"><span><i className="complete" />100%</span><span><i className="partial" />50-99%</span><span><i className="low" />0-49%</span><span><i className="none" />No schedules</span></div>
      </aside>
    </div>
  </main>;
}

const editorId = () => crypto.randomUUID();
const blankItem = (): EditorItem => ({ editorId: editorId(), label: "", parentId: null });
const blankSection = (): EditorSection => ({ editorId: editorId(), title: "", items: [blankItem()] });
const blankRoutine = (): EditorRoutine => ({ name: "", category: "Uncategorized", weekdays: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "09:00", sortOrder: 0, sections: [blankSection()] });

function flattenEditorItems(items: EditorItem[]): EditorItem[] {
  const ids = new Set(items.map((item) => item.editorId));
  const children = new Map<string | null, EditorItem[]>();
  for (const item of items) {
    const parentId = item.parentId && ids.has(item.parentId) && item.parentId !== item.editorId ? item.parentId : null;
    children.set(parentId, [...(children.get(parentId) ?? []), { ...item, parentId }]);
  }
  const result: EditorItem[] = [];
  const visited = new Set<string>();
  const append = (item: EditorItem) => {
    if (visited.has(item.editorId)) return;
    visited.add(item.editorId);
    result.push(item);
    for (const child of children.get(item.editorId) ?? []) append(child);
  };
  for (const item of children.get(null) ?? []) append(item);
  for (const item of items) append({ ...item, parentId: null });
  return result;
}

function reorderEditorItems(items: EditorItem[], activeId: string, overId: string) {
  const active = items.find((item) => item.editorId === activeId);
  let over = items.find((item) => item.editorId === overId);
  if (!active || !over) return items;
  while ((over.parentId ?? null) !== (active.parentId ?? null) && over.parentId) {
    over = items.find((item) => item.editorId === over!.parentId);
    if (!over) return items;
  }
  if ((active.parentId ?? null) !== (over.parentId ?? null) || active.editorId === over.editorId) return items;
  const siblings = items.filter((item) => (item.parentId ?? null) === (active.parentId ?? null));
  const reordered = arrayMove(siblings, siblings.indexOf(active), siblings.indexOf(over));
  let siblingIndex = 0;
  const next = items.map((item) => (item.parentId ?? null) === (active.parentId ?? null) ? reordered[siblingIndex++] : item);
  return flattenEditorItems(next);
}

function descendantIds(items: EditorItem[], itemId: string) {
  const descendants = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.parentId === itemId || (item.parentId && descendants.has(item.parentId))) {
        if (!descendants.has(item.editorId)) { descendants.add(item.editorId); changed = true; }
      }
    }
  }
  return descendants;
}

function DragHandle({ label, attributes, listeners }: { label: string; attributes: DraggableAttributes; listeners?: DraggableSyntheticListeners }) {
  return <button className="drag-handle" type="button" aria-label={label} {...attributes} {...listeners}><span /><span /><span /></button>;
}

function SortableEditorRow({ id, label, children, className = "" }: { id: string; label: string; children: (handle: ReactNode) => ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition } as CSSProperties;
  const handle = <DragHandle label={label} attributes={attributes} listeners={listeners} />;
  return <div ref={setNodeRef} style={style} className={`${className} ${isDragging ? "dragging" : ""}`}>{children(handle)}</div>;
}

function Manage() {
  const [routines, setRoutines] = useState<EditorRoutine[]>([]);
  const [draft, setDraft] = useState<EditorRoutine>(blankRoutine);
  const [message, setMessage] = useState("");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const load = async () => {
    const data = await api<ApiRoutine[]>("/api/routines");
    setRoutines(data.map((routine) => {
      const version = routine.versions[0];
      return { id: routine.id, name: routine.name, category: routine.category, sortOrder: routine.sortOrder, archivedAt: routine.archivedAt, weekdays: version?.weekdays ?? [], startTime: version?.startTime ?? "08:00", endTime: version?.endTime ?? "09:00", sections: version?.sections.map((section) => {
        const editorIdsByApiId = new Map(section.items.map((item) => [item.id, editorId()]));
        return {
          editorId: editorId(),
          title: section.title,
          items: flattenEditorItems(section.items.map((item) => ({
            editorId: editorIdsByApiId.get(item.id)!,
            label: item.label,
            parentId: item.parentId ? editorIdsByApiId.get(item.parentId) ?? null : null,
          }))),
        };
      }) ?? [] };
    }));
  };
  useEffect(() => { void load(); }, []);
  const changeSection = (index: number, section: EditorSection) => setDraft({ ...draft, sections: draft.sections.map((entry, i) => i === index ? section : entry) });
  const dropSection = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = draft.sections.findIndex((section) => section.editorId === active.id);
    const newIndex = draft.sections.findIndex((section) => section.editorId === over.id);
    if (oldIndex >= 0 && newIndex >= 0) setDraft({ ...draft, sections: arrayMove(draft.sections, oldIndex, newIndex) });
  };
  const dropItem = (sectionIndex: number, { active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const section = draft.sections[sectionIndex];
    changeSection(sectionIndex, { ...section, items: reorderEditorItems(section.items, String(active.id), String(over.id)) });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        name: draft.name,
        category: draft.category,
        weekdays: draft.weekdays,
        startTime: draft.startTime,
        endTime: draft.endTime,
        sortOrder: draft.sortOrder,
        archivedAt: draft.archivedAt,
        clientDate: localToday(),
        confirmReplace: Boolean(draft.id),
        sections: draft.sections.map((section) => ({
          title: section.title,
          items: section.items.map((item) => ({
            label: item.label,
            parentIndex: item.parentId ? section.items.findIndex((candidate) => candidate.editorId === item.parentId) : null,
          })),
        })),
      };
      await api(draft.id ? `/api/routines/${draft.id}` : "/api/routines", {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setMessage("Routine saved."); setDraft(blankRoutine()); await load();
    } catch (reason) { setMessage((reason as Error).message); }
  };
  const archive = async (id: string) => {
    if (!confirm("Archive this routine? Existing daily history will remain available.")) return;
    await api(`/api/routines/${id}`, { method: "DELETE", body: JSON.stringify({ confirm: true, clientDate: localToday() }) }); await load(); setDraft(blankRoutine());
  };
  return <main><header><div><p className="eyebrow">Shape your days</p><h1>Edit routines</h1></div><nav><Link to="/">Dashboard</Link></nav></header>
    <div className="manage-layout"><aside className="card routine-list"><button onClick={() => setDraft(blankRoutine())}>+ New routine</button>{routines.map((routine) => <button className={draft.id === routine.id ? "selected-row" : ""} key={routine.id} onClick={() => setDraft(structuredClone(routine))}>{routine.name}{routine.archivedAt ? " (archived)" : ""}</button>)}</aside>
      <form className="card editor" onSubmit={save}><div><h2>{draft.id ? "Edit routine" : "New routine"}</h2><p className="editor-help">Drag the three-line handles to rearrange sections and tasks. On touch screens, press and hold the handle first.</p></div>
        <div className="form-grid"><label>Name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></label><label>Category<input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} required /></label><label>Start<input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} required /></label><label>End<input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} required /></label><label>Display order<input type="number" min="0" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} required /></label></div>
        <fieldset><legend>Scheduled days</legend>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => <label className="day" key={day}><input type="checkbox" checked={draft.weekdays.includes(index)} onChange={() => setDraft({ ...draft, weekdays: draft.weekdays.includes(index) ? draft.weekdays.filter((value) => value !== index) : [...draft.weekdays, index] })} />{day}</label>)}</fieldset>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dropSection}>
          <SortableContext items={draft.sections.map((section) => section.editorId)} strategy={verticalListSortingStrategy}>
            {draft.sections.map((section, sectionIndex) => <SortableEditorRow id={section.editorId} label={`Drag to reorder ${section.title || "section"}`} className="section-sortable" key={section.editorId}>{(sectionHandle) =>
              <section className="section-editor"><div className="editor-row section-editor-heading">{sectionHandle}<input aria-label="Section title" placeholder="Section title" value={section.title} onChange={(e) => changeSection(sectionIndex, { ...section, title: e.target.value })} required /><button className="danger" type="button" onClick={() => confirm("Remove this section and its items?") && setDraft({ ...draft, sections: draft.sections.filter((_, i) => i !== sectionIndex) })}>Remove</button></div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => dropItem(sectionIndex, event)}>
                  <SortableContext items={section.items.map((item) => item.editorId)} strategy={verticalListSortingStrategy}>
                    <div className="item-editor-list">{section.items.map((item, itemIndex) => {
                      const parent = section.items.find((candidate) => candidate.editorId === item.parentId);
                      const excludedParents = descendantIds(section.items, item.editorId);
                      return <SortableEditorRow id={item.editorId} label={`Drag to reorder ${item.label || "task"}`} className={`item-sortable ${parent ? "nested" : ""}`} key={item.editorId}>{(itemHandle) =>
                        <div className="editor-row item-row">{itemHandle}<div className="item-fields"><input aria-label="Item label" placeholder="Checklist item" value={item.label} onChange={(e) => changeSection(sectionIndex, { ...section, items: section.items.map((entry, i) => i === itemIndex ? { ...entry, label: e.target.value } : entry) })} required /><label className="parent-picker"><span>Parent</span><select aria-label={`Parent task for ${item.label || "task"}`} value={item.parentId ?? ""} onChange={(e) => {
                          const parentId = e.target.value || null;
                          changeSection(sectionIndex, { ...section, items: flattenEditorItems(section.items.map((entry) => entry.editorId === item.editorId ? { ...entry, parentId } : entry)) });
                        }}><option value="">Top-level task</option>{section.items.filter((candidate) => candidate.editorId !== item.editorId && (!candidate.parentId || candidate.editorId === item.parentId) && !excludedParents.has(candidate.editorId)).map((candidate) => <option key={candidate.editorId} value={candidate.editorId}>{candidate.label || "Untitled task"}</option>)}</select></label>{parent && <small className="parent-cue">Under: {parent.label || "Untitled task"}</small>}</div><button className="danger item-remove" type="button" aria-label={`Remove ${item.label || "checklist item"}`} onClick={() => confirm("Remove this checklist item?") && changeSection(sectionIndex, { ...section, items: flattenEditorItems(section.items.filter((_, i) => i !== itemIndex)) })}>×</button></div>
                      }</SortableEditorRow>;
                    })}</div>
                  </SortableContext>
                </DndContext>
                <button type="button" onClick={() => changeSection(sectionIndex, { ...section, items: [...section.items, blankItem()] })}>+ Add item</button>
              </section>
            }</SortableEditorRow>)}
          </SortableContext>
        </DndContext>
        <button type="button" onClick={() => setDraft({ ...draft, sections: [...draft.sections, blankSection()] })}>+ Add section</button>
        <div className="actions"><button type="submit">{draft.archivedAt ? "Restore and save" : "Save routine"}</button>{draft.id && !draft.archivedAt && <button className="danger" type="button" onClick={() => void archive(draft.id!)}>Archive routine</button>}</div>{message && <p role="status">{message}</p>}
      </form></div>
  </main>;
}

export function App() {
  const [ready, setReady] = useState(false); const [authenticated, setAuthenticated] = useState(false); const navigate = useNavigate();
  useEffect(() => { api<{ authenticated: boolean; csrfToken: string }>("/api/auth/status").then((result) => { csrfToken = result.csrfToken; setAuthenticated(result.authenticated); setReady(true); }).catch(() => setReady(true)); }, []);
  const logout = async () => { await api("/api/auth/logout", { method: "POST" }); setAuthenticated(false); navigate("/"); };
  if (!ready) return <div className="loading">Loading…</div>;
  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;
  return <><button className="logout" onClick={() => void logout()}>Sign out</button><Routes><Route path="/" element={<Dashboard />} /><Route path="/manage" element={<Manage />} /><Route path="*" element={<Navigate to="/" />} /></Routes></>;
}
