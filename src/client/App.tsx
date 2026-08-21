import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";

type DailyItem = { id: string; label: string; completed: boolean; sectionTitle: string; sectionOrder: number; parentSourceId: string | null };
type DailyRoutine = { id: string; routineName: string; startTime: string; endTime: string; items: DailyItem[] };
type Day = { date: string; status: "complete" | "partial" | "low" | "none"; completed: number; total: number };
type EditorItem = { label: string; parentIndex?: number | null };
type EditorSection = { title: string; items: EditorItem[] };
type EditorRoutine = { id?: string; name: string; weekdays: number[]; startTime: string; endTime: string; sortOrder: number; sections: EditorSection[]; archivedAt?: string | null };
type ApiRoutine = { id: string; name: string; sortOrder: number; archivedAt: string | null; versions: Array<{ weekdays: number[]; startTime: string; endTime: string; sections: Array<{ title: string; items: Array<{ id: string; label: string; parentId: string | null }> }> }> };

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
    return minutes >= toMinutes(routine.startTime) && minutes < toMinutes(routine.endTime);
  };
  const play = (name: string) => {
    if (!sound) return;
    const audio = getSound(name).cloneNode(true) as HTMLAudioElement;
    void audio.play().catch(() => undefined);
  };
  const toggle = async (item: DailyItem) => {
    const completed = !item.completed;
    const routine = routines.find((entry) => entry.items.some((entryItem) => entryItem.id === item.id));
    const sectionItems = routine?.items.filter((entry) => entry.sectionTitle === item.sectionTitle) ?? [];
    const sectionWasComplete = sectionItems.every((entry) => entry.completed);
    const routineWasComplete = routine?.items.every((entry) => entry.completed) ?? false;
    const sectionNowComplete = completed && sectionItems.every((entry) => entry.id === item.id || entry.completed);
    const routineNowComplete = completed && (routine?.items.every((entry) => entry.id === item.id || entry.completed) ?? false);
    setRoutines((all) => all.map((routine) => ({ ...routine, items: routine.items.map((entry) => entry.id === item.id ? { ...entry, completed } : entry) })));
    play(`box-${completed ? "checked" : "unchecked"}`);
    if (routineNowComplete && !routineWasComplete) play("routine-completed");
    else if (sectionNowComplete && !sectionWasComplete) play("section-completed");
    try { await api(`/api/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ completed }) }); await load(); }
    catch (reason) { setError((reason as Error).message); await load(); }
  };
  return <main>
    <header><div><p className="eyebrow">A gentle rhythm for</p><h1>Daily Routines</h1></div><nav><Link to="/manage">Manage</Link><button className="pill" onClick={() => { const next = !sound; setSound(next); localStorage.setItem("routine-sound", next ? "on" : "off"); }}>{sound ? "Sounds on" : "Sounds off"}</button></nav></header>
    <div className="date-row"><label>Day<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><button className="pill" onClick={() => setDate(localToday())}>Today</button></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="dashboard">
      <section className="routines" aria-label={`Routines for ${date}`}>
        {routines.length === 0 && <div className="card empty">Nothing scheduled. Take a gentle pause.</div>}
        {routines.map((routine) => {
          const sections = groupItemsBySection(routine.items);
          return <article className={`routine ${active(routine) ? "active" : ""}`} key={routine.id}>
            <div className="routine-heading"><h2>{routine.routineName}</h2><span>{routine.startTime} to {routine.endTime}</span></div>
            <div className="sections">{sections.map(([title, items]) => <section className="section" key={title}><h3>{title}</h3>
              {items.map((item) => <label className={`check ${item.parentSourceId ? "nested" : ""}`} key={item.id}><input type="checkbox" checked={item.completed} onChange={() => void toggle(item)} /><span>{item.label}</span></label>)}
            </section>)}</div>
          </article>;
        })}
      </section>
      <aside className="year-panel"><div className="year-heading"><button aria-label="Previous year" onClick={() => setYear(year - 1)}>‹</button><h2>{year}</h2><button aria-label="Next year" onClick={() => setYear(year + 1)}>›</button></div>
        <div className="dot-grid" aria-label={`${year} completion calendar`}>{days.map((day) => <button key={day.date} onClick={() => setDate(day.date)} className={`dot ${day.status} ${date === day.date ? "selected" : ""}`} title={`${day.date}: ${day.total ? `${day.completed} of ${day.total}` : "no schedules"}`} aria-label={`${day.date}: ${day.status}`} />)}</div>
        <div className="key"><span><i className="complete" />100%</span><span><i className="partial" />50-99%</span><span><i className="low" />0-49%</span><span><i className="none" />No schedules</span></div>
      </aside>
    </div>
  </main>;
}

const blankRoutine = (): EditorRoutine => ({ name: "", weekdays: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "09:00", sortOrder: 0, sections: [{ title: "", items: [{ label: "" }] }] });
function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy;
}
function reindexEditorItems(previous: EditorItem[], next: EditorItem[]): EditorItem[] {
  return next.map((item, itemIndex) => {
    const oldIndex = previous.indexOf(item);
    const oldParentIndex = oldIndex >= 0 ? previous[oldIndex].parentIndex : null;
    const parent = oldParentIndex == null ? undefined : previous[oldParentIndex];
    const parentIndex = parent ? next.indexOf(parent) : -1;
    return { ...item, parentIndex: parentIndex >= 0 && parentIndex < itemIndex ? parentIndex : null };
  });
}

function Manage() {
  const [routines, setRoutines] = useState<EditorRoutine[]>([]);
  const [draft, setDraft] = useState<EditorRoutine>(blankRoutine);
  const [message, setMessage] = useState("");
  const load = async () => {
    const data = await api<ApiRoutine[]>("/api/routines");
    setRoutines(data.map((routine) => {
      const version = routine.versions[0];
      return { id: routine.id, name: routine.name, sortOrder: routine.sortOrder, archivedAt: routine.archivedAt, weekdays: version?.weekdays ?? [], startTime: version?.startTime ?? "08:00", endTime: version?.endTime ?? "09:00", sections: version?.sections.map((section) => {
        const indexById = new Map(section.items.map((item, index) => [item.id, index]));
        return { title: section.title, items: section.items.map((item) => ({ label: item.label, parentIndex: item.parentId ? indexById.get(item.parentId) : null })) };
      }) ?? [] };
    }));
  };
  useEffect(() => { void load(); }, []);
  const changeSection = (index: number, section: EditorSection) => setDraft({ ...draft, sections: draft.sections.map((entry, i) => i === index ? section : entry) });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api(draft.id ? `/api/routines/${draft.id}` : "/api/routines", { method: draft.id ? "PUT" : "POST", body: JSON.stringify({ ...draft, confirmReplace: Boolean(draft.id) }) });
      setMessage("Routine saved."); setDraft(blankRoutine()); await load();
    } catch (reason) { setMessage((reason as Error).message); }
  };
  const archive = async (id: string) => {
    if (!confirm("Archive this routine? Existing daily history will remain available.")) return;
    await api(`/api/routines/${id}`, { method: "DELETE", body: JSON.stringify({ confirm: true }) }); await load(); setDraft(blankRoutine());
  };
  return <main><header><div><p className="eyebrow">Shape your days</p><h1>Manage</h1></div><nav><Link to="/">Dashboard</Link></nav></header>
    <div className="manage-layout"><aside className="card routine-list"><button onClick={() => setDraft(blankRoutine())}>+ New routine</button>{routines.map((routine) => <button className={draft.id === routine.id ? "selected-row" : ""} key={routine.id} onClick={() => setDraft(structuredClone(routine))}>{routine.name}{routine.archivedAt ? " (archived)" : ""}</button>)}</aside>
      <form className="card editor" onSubmit={save}><h2>{draft.id ? "Edit routine" : "New routine"}</h2>
        <div className="form-grid"><label>Name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></label><label>Start<input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} required /></label><label>End<input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} required /></label><label>Display order<input type="number" min="0" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} required /></label></div>
        <fieldset><legend>Scheduled days</legend>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => <label className="day" key={day}><input type="checkbox" checked={draft.weekdays.includes(index)} onChange={() => setDraft({ ...draft, weekdays: draft.weekdays.includes(index) ? draft.weekdays.filter((value) => value !== index) : [...draft.weekdays, index] })} />{day}</label>)}</fieldset>
        {draft.sections.map((section, sectionIndex) => <section className="section-editor" key={sectionIndex}><div className="editor-row"><input aria-label="Section title" placeholder="Section title" value={section.title} onChange={(e) => changeSection(sectionIndex, { ...section, title: e.target.value })} required /><button type="button" onClick={() => setDraft({ ...draft, sections: move(draft.sections, sectionIndex, -1) })}>↑</button><button type="button" onClick={() => setDraft({ ...draft, sections: move(draft.sections, sectionIndex, 1) })}>↓</button><button className="danger" type="button" onClick={() => confirm("Remove this section and its items?") && setDraft({ ...draft, sections: draft.sections.filter((_, i) => i !== sectionIndex) })}>Remove</button></div>
          {section.items.map((item, itemIndex) => <div className="editor-row item-row" key={itemIndex}><input aria-label="Item label" placeholder="Checklist item" value={item.label} onChange={(e) => changeSection(sectionIndex, { ...section, items: section.items.map((entry, i) => i === itemIndex ? { ...entry, label: e.target.value } : entry) })} required /><label className="nested-box"><input type="checkbox" checked={item.parentIndex != null} disabled={itemIndex === 0} onChange={(e) => changeSection(sectionIndex, { ...section, items: section.items.map((entry, i) => i === itemIndex ? { ...entry, parentIndex: e.target.checked ? itemIndex - 1 : null } : entry) })} />Nested</label><button type="button" onClick={() => changeSection(sectionIndex, { ...section, items: reindexEditorItems(section.items, move(section.items, itemIndex, -1)) })}>↑</button><button type="button" onClick={() => changeSection(sectionIndex, { ...section, items: reindexEditorItems(section.items, move(section.items, itemIndex, 1)) })}>↓</button><button className="danger" type="button" onClick={() => confirm("Remove this checklist item?") && changeSection(sectionIndex, { ...section, items: reindexEditorItems(section.items, section.items.filter((_, i) => i !== itemIndex)) })}>×</button></div>)}
          <button type="button" onClick={() => changeSection(sectionIndex, { ...section, items: [...section.items, { label: "" }] })}>+ Add item</button>
        </section>)}
        <button type="button" onClick={() => setDraft({ ...draft, sections: [...draft.sections, { title: "", items: [{ label: "" }] }] })}>+ Add section</button>
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
