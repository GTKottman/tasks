# Task App Design Document

A complete specification for a personal task manager: every Google Tasks capability as the baseline, then the product that Google Tasks would be if it were designed to be the only task app someone ever needs.

This document is the source of truth for product, data, UX, and behavior. It is written as a design spec, not a marketing page.

---

## 1. Product vision

**One sentence.** Capture anything in under two seconds, organize it without ceremony, and always know what to do next.

**Who it is for.** A single person who lives in lists: work, school, errands, and repeating daily routines. Collaboration exists, but it is optional. The default experience is a private, fast, personal inbox for commitments.

**What it is not.** It is not a project manager, a chat app, or a calendar. It talks to those tools. It does not try to replace them.

**North star.** Google Tasks is right about speed and wrong about completeness. Keep the capture speed. Remove the artificial limits that force people into workarounds (no search, one-level subtasks, no repeating checklists, no Today view).

---

## 2. Design principles

1. **Capture first.** Adding a task is always one tap or one shortcut away. Title is enough. Everything else is optional and can be added later.
2. **Lists are homes. Views are lenses.** A task lives in one list. Smart views (Today, Upcoming, Starred, Overdue) never duplicate ownership.
3. **Dates are promises, not decoration.** A date without a reminder is a note. A date with a time is a commitment.
4. **Routines are first-class.** Repeating checklists (morning, night, weekly reset) must work. Google Tasks forbids combining recurrence with subtasks. This app does the opposite.
5. **Completed work is history, not clutter.** Completing is instant and reversible. History is searchable. Active lists stay short.
6. **Offline is the default.** The app works without a network. Sync is background, not a gate.
7. **Keyboard on desktop, thumb on mobile.** Every frequent action has a shortcut and a large tap target.
8. **Undo everything for 10 seconds.** Completes, deletes, moves, and list deletes are never one-way in the moment they happen.
9. **No hidden state.** If a task is overdue, starred, assigned, repeating, or linked to an email, the list row shows it.
10. **Simplicity is a UI choice, not a data choice.** The data model is rich. The default screen is not.

---

## 3. Google Tasks feature inventory

This section is the complete catalog of what Google Tasks already does. The perfect app includes all of it, then extends the gaps called out in section 4.

### 3.1 Surfaces

| Surface | What you can do |
| --- | --- |
| Standalone mobile app (Android, iOS) | Full create, edit, complete, lists, stars, widgets, voice input |
| Google Calendar (web and app) | Create tasks on the grid, time-block them, see dated tasks, Pending tasks, full-screen Tasks view |
| Gmail | Side panel, Add to Tasks from an email, drag an email onto the panel, link back to the message |
| Google Chat | Add a DM to Tasks, create and assign space (group) tasks |
| Google Docs | `@task` chips, convert checklist items, assign to self or others |
| Drive, Sheets, Slides | Tasks side panel |
| Home screen widgets | List widget (view/create/manage, resizable) and New Task shortcut |
| Notifications | Fire at due time; complete from the notification |

### 3.2 Lists

- Default list created automatically.
- Create, rename, and delete additional lists.
- Switch lists from a dropdown (web) or tabs (mobile).
- Reorder lists (long-press tabs on mobile).
- Move a task from one list to another (drag, or pick a list in the task editor).
- **Constraint:** repeating tasks cannot be moved to another list.
- Delete a list (and its tasks).

Typical list uses: Work, Personal, Shopping, a project name.

### 3.3 A single task

When creating or editing a task, Google Tasks supports:

| Field | Behavior |
| --- | --- |
| Title | Required. Max 1024 characters. |
| Details / notes | Optional. Max 8192 characters. Plain text. Docs-assigned tasks cannot have notes. |
| Start date and time | When you plan to work on it. Used for Calendar time-blocking and duration. |
| Deadline | When it must be done. Shows in Calendar’s all-day area. |
| Date and time (due) | Day the task should be done; also the day it appears on the calendar grid. Time is used for notifications. Date-only tasks notify at 9:00 AM local. |
| Repeat | Daily, weekly, monthly, yearly. Ends never, on a date, or after N occurrences. |
| Subtasks | One level of nested checklist items under a parent. |
| List | Which list owns the task. |
| Star | Flag as important. Appears in a virtual Starred list. |
| Color | Calendar appearance. |
| Availability | Free or Busy on Calendar (Workspace). |
| Do not disturb | Mute Chat while the task is scheduled (Workspace). |
| Auto-decline meetings | If Busy, decline overlapping meetings (Workspace). |
| Visibility | Who can see the time block on Calendar. |
| Source link | Email, Chat message, Keep note, or generic URL. Read-only once created from that surface. |

Limits:

- 100,000 tasks across all lists.
- 20,000 uncompleted tasks per list.
- Status is binary: `needsAction` or `completed`.

### 3.4 Subtasks

- Add from the task menu, from the editor, or by indenting (`Ctrl/Cmd + ]`).
- Un-indent with `Ctrl/Cmd + [` or a menu action.
- Each subtask has its own completion checkbox.
- Parent shows subtask progress (N of M complete).
- **One nesting level only.** No subtasks of subtasks.
- Subtasks do not get their own due dates, reminders, or assignees.
- Subtasks move with the parent when the parent is reordered.
- **A parent with subtasks cannot repeat.**

### 3.5 Recurrence

- Requires a date (and optionally a time).
- Intervals: every N days / weeks / months / years.
- Weekly can target specific days.
- End: never, on a date, or after N times.
- Calendar shows a rolling window of upcoming instances; more are generated as time passes.
- Editing the next instance’s date/time is supported.
- Deleting a repeating task can delete the whole series.
- **Cannot combine with subtasks.**
- **Cannot move to another list.**

### 3.6 Completing, deleting, history

- Checkbox completes a task. Completing is reversible.
- Completed tasks collapse into a Completed section at the bottom of the list. Expand/collapse that section.
- “Delete all completed tasks” clears completed items from the current list (they become hidden history).
- Delete a single task from the overflow menu.
- Uncompleted dated tasks from the last 365 days remain available on “today” in Calendar (“Pending tasks”).
- Overdue items sort under a **Past** heading when sorted by date.

### 3.7 Stars and priority

- Star / unstar from the row.
- Virtual **Starred** list aggregates starred tasks from every list.
- From Starred you can create a starred task and pick its home list.
- Sort Starred by recently starred or by date.
- You cannot manually reorder the Starred list.
- Completed starred tasks are found in their home list, not kept in Starred.

There is no High / Medium / Low priority field. Star plus manual order is the only native priority system.

### 3.8 Sort and order

Per list:

| Sort | Meaning |
| --- | --- |
| My order | Manual drag-and-drop. This is the only mode that allows reordering. |
| Date | By scheduled/due date. Overdue under Past. |
| Deadline | By deadline date. |
| Starred recently | Recently starred first. |
| Title | Alphabetical. |

Each list sorts independently. There is no native combined view across lists.

### 3.9 Calendar behavior

- Dated tasks appear on the Calendar grid.
- Deadline appears in the all-day section.
- Start date + duration creates a time block (treat the task like a focus block).
- Color, Free/Busy, visibility, DND, auto-decline apply to that block.
- Pending tasks: all uncompleted tasks from the last 365 days, parked on the current day.
- Recurring instances fill the grid going forward.

### 3.10 Notifications

- Date + time: notify at that local time.
- Date only: notify at 9:00 AM local.
- Deadline: notify at 9:00 AM local on the deadline day.
- Mobile: mark complete from the notification.
- Tasks and Calendar notification permissions both matter on some platforms.

There are no location reminders and no custom reminder offsets (e.g. “30 minutes before”).

### 3.11 Capture from other apps

**Gmail**

- Add to Tasks from the email toolbar.
- Drag the email onto the Tasks panel.
- The task stores a link back to the original message.

**Chat**

- From a DM: More → Add to Tasks. Lands in the last-viewed list. Link back to the message. Editing the task does not change the Chat message.
- From a space: create a group task with title, date/time, description, and optional assignee. Assignee gets email. The task appears in the assignee’s personal list.

**Docs**

- Type `@task`, fill details, assign to self or others.
- From a checklist: Add to Tasks, pick assignee and date.
- Assignee gets email; task appears in their personal list.
- Eligible Google Workspace accounts only.

**Calendar**

- Click an empty slot or Create → Task.
- Or add from the Tasks panel / full-screen Tasks.

**Mobile**

- Voice input for the title.
- Widgets for list management and one-tap new task.

### 3.12 Assigned tasks (collaboration)

- Origin surfaces today: Docs (`DOCUMENT`) and Chat spaces (`SPACE`). Gmail is a capture source, not an assignment surface.
- `assignmentInfo` is read-only on the personal task: link back to the source, surface type, Drive file id or Chat space id.
- Assigned tasks cannot be parents of subtasks.
- Deleting from Tasks can delete both the assigned copy and the original; unassigning must happen on the source surface if you only want to drop it from your list.

### 3.13 API shape (data truth)

**TaskList:** `id`, `title` (≤1024), `updated`, `etag`.

**Task:** `id`, `title` (≤1024), `notes` (≤8192), `status`, `due`, `completed`, `parent`, `position`, `deleted`, `hidden`, `links[]` (`email` | `generic` | `chat_message` | `keep_note`), `webViewLink`, `assignmentInfo`.

**Task operations:** insert, get, list, patch/update, delete, move (position and/or parent and/or list), clear completed.

The public API still treats `due` as a date (time is discarded). Time, deadline, start, color, star, and recurrence live in the product but are not fully exposed the same way. The perfect app should not copy that split. If the user can set it, the model stores it.

---

## 4. What Google Tasks gets wrong (and this app must get right)

These are the gaps the perfect app closes. Each one is a product requirement, not a nice-to-have.

| Gap | Why it matters | Perfect-app answer |
| --- | --- | --- |
| No search | After a few dozen tasks, scrolling is the only find tool | Instant search across titles, notes, lists, tags |
| No Today / Upcoming / All view | You have to open every list to plan a day | Smart lists that never own tasks |
| One-level subtasks | Real work is nested | Unlimited nesting, with a practical UI collapse |
| Subtasks cannot have dates | A step is often the actual deadline | Every task, including children, is a full task |
| Recurrence + subtasks forbidden | Daily routines are repeating checklists | Recurring templates that spawn a fresh checklist each cycle |
| No tags | Lists are a blunt grouping tool | Lists for ownership, tags for cross-cutting labels |
| Star is the only priority | Not enough nuance | Star plus optional P1–P4, both optional |
| No combined sort | “What’s due this week?” requires hopping lists | Global Agenda view |
| Repeating tasks cannot change lists | Projects move | Recurrence is a rule, not a prison |
| No attachments | Specs, screenshots, receipts live elsewhere | Files and previews on the task |
| No native list sharing | Sharing only via Chat/Docs assignment | Optional share of a list, with roles |
| No custom reminders | 9 AM default is crude | Any number of reminders, relative or absolute |
| No location reminders | “When I get to the store” is a real trigger | Optional geofence reminders |
| No natural language | “Tomorrow 3pm call dentist” should just parse | Parser on capture, always editable after |
| No templates | Morning and night routines are retyped or poorly repeated | Saved templates and routine lists |
| Weak bulk actions | Select 12 tasks and move them | Multi-select: complete, move, tag, date, delete |
| No undo | Accidental complete/delete is common | Toast undo + trash |
| Notes are plain and capped awkwardly | People paste checklists and links | Markdown notes, no hostile cap for personal use |
| Desktop is a sidebar | Power users want a full app | First-class web app, Calendar is an integration |
| Reminders vs Tasks split | Historical Google mess | One object. A reminder is a task with a notify time |

---

## 5. Information architecture

```
App
├── Inbox              unprocessed captures (a list, but treated as default landing)
├── Smart views
│   ├── Today          due / scheduled / time-blocked today, plus overdue
│   ├── Upcoming       next 7 / 30 days
│   ├── Overdue        past due, not completed
│   ├── Starred
│   ├── Assigned to me
│   └── All            every active task, filterable
├── Lists              user-created homes (Work, Personal, Groceries, School…)
├── Routines           repeating checklists (Weekday morning, Nightly, …)
├── Templates          reusable task / checklist blueprints
└── Archive / Trash    completed history and recently deleted
```

**Rule.** A task has exactly one home list (or Inbox). Smart views, stars, tags, and assignments are attributes. Routines generate instances into a list; the routine definition lives separately.

---

## 6. Data model

### 6.1 User

- `id`, `email`, `displayName`, `timezone`, `weekStartsOn`, `timeFormat`
- `defaultListId`
- `settings` (see section 18)

### 6.2 List

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | |
| `title` | string | ≤ 200 chars in UI; store more if pasted |
| `color` | color | Optional accent |
| `icon` | enum | Optional |
| `sort` | enum | `my_order` \| `date` \| `deadline` \| `starred_recently` \| `title` \| `priority` |
| `position` | string | Lexicographic order among lists |
| `isInbox` | bool | At most one per user |
| `isRoutine` | bool | If true, this list is a routine definition (see 9) |
| `sharing` | Sharing | Optional. Private by default |
| `archivedAt` | datetime? | Soft-hide without deleting |
| `createdAt`, `updatedAt` | datetime | |

**Sharing roles:** `owner`, `editor`, `completer` (can complete and comment, not restructure), `viewer`.

### 6.3 Task

Every item is a Task, including subtasks. There is no second “checklist item” type.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | |
| `listId` | string | Home list. Always set. |
| `parentId` | string? | Null = top-level in the list |
| `position` | string | Order among siblings |
| `title` | string | Required to save. Empty draft is allowed until blur/enter |
| `notes` | markdown | Optional |
| `status` | enum | `needsAction` \| `completed` \| `canceled` |
| `completedAt` | datetime? | |
| `starred` | bool | |
| `starredAt` | datetime? | For “starred recently” sort |
| `priority` | enum? | `p1` \| `p2` \| `p3` \| `p4` \| null |
| `startAt` | datetime? | When work is planned (time block start) |
| `durationMin` | int? | Planned duration for the time block |
| `dueOn` | date? | Calendar day the task should be done |
| `dueAt` | datetime? | If set, implies `dueOn` and drives the primary reminder |
| `deadlineOn` | date? | Must-be-done-by day (all-day on calendar) |
| `timezone` | string | IANA. Defaults to user timezone at create |
| `recurrence` | Recurrence? | Rule on the series master, or on a routine |
| `seriesId` | string? | Shared by instances of a repeating task |
| `instanceFor` | date? | Which occurrence this row represents |
| `reminders` | Reminder[] | See 8.3 |
| `tags` | string[] | Normalized, lowercase slugs plus display labels |
| `links` | Link[] | `{ type, title, url }` email / chat / keep / doc / generic |
| `attachments` | Attachment[] | Files, images |
| `assignment` | Assignment? | `{ assigneeId, surface, sourceUrl, sourceId }` |
| `color` | color? | Overrides list color on calendar |
| `availability` | enum | `free` \| `busy` |
| `visibility` | enum | `default` \| `private` \| `public` |
| `declineOverlapping` | bool | Calendar: auto-decline meetings if busy |
| `muteChat` | bool | Calendar: DND during the block |
| `estimateMin` | int? | Optional effort estimate, independent of time block |
| `deletedAt` | datetime? | Trash |
| `hidden` | bool | Cleared from completed section; still in history |
| `createdAt`, `updatedAt` | datetime | |
| `createdFrom` | enum | `app` \| `gmail` \| `calendar` \| `chat` \| `docs` \| `widget` \| `voice` \| `share_sheet` \| `quick_add` |

**Indent depth.** Unlimited in the model. UI defaults to showing 3 levels expanded, with a “show more” for deeper trees. Recommend staying under 4 in product copy.

### 6.4 Recurrence

```
Recurrence {
  frequency: day | week | month | year
  interval: int                 // every N
  byWeekday: weekday[]?         // weekly (and monthly-by-weekday)
  byMonthDay: int[]?            // 1–31, or -1 for last day
  bySetPos: int?                // e.g. 2nd Tuesday
  startOn: date
  end: { type: never } | { type: on, date } | { type: after, count }
  skipWeekends: bool
  onComplete: spawn_next | spawn_on_schedule
}
```

`spawn_next`: the next instance appears only after the current one is completed (habit-like).  
`spawn_on_schedule`: instances appear on the calendar whether or not you finished yesterday (chore-like).

### 6.5 Reminder

```
Reminder {
  id
  kind: absolute | relative | location
  at?: datetime                 // absolute
  relativeTo?: due | start | deadline
  offsetMin?: int               // e.g. -30 = 30 min before
  location?: { lat, lng, radiusM, label, trigger: enter | exit }
  notifiedAt?: datetime
}
```

If the user sets only a date, the app still creates a default reminder at the user’s **date-only notify time** (default 9:00 AM, user-configurable, unlike Google’s hard-coded 9 AM).

### 6.6 Routine (repeating checklist)

A routine is a list flagged `isRoutine` plus a recurrence rule.

- The list contains the **definition**: parent steps and nested steps, notes, optional per-step times of day.
- On each occurrence, the app **materializes an instance**: a dated copy (or a dated parent with a full child tree) in a target list, or in a “Today” projection without duplicating storage.
- Completing steps on Monday does not complete them on Tuesday.
- Skipping a day is explicit: Skip, not Complete.

This is the feature Google Tasks cannot do, and the feature that makes weekday / weekend / nightly routines actually work.

### 6.7 Template

A named snapshot of one task or a whole tree (title, notes, subtasks, tags, default due offset like “today”, default list). Inserting a template copies it. Routines are living templates with a schedule. Templates are unscheduled.

### 6.8 Tag

`id`, `label`, `color`, `position`. Tags are user-global, not per-list. A task can have many tags.

---

## 7. Views in detail

### 7.1 Inbox

Landing view for capture. Anything added without a list goes here. Empty Inbox is a success state.

Actions from Inbox: complete, star, set date, move to a list, convert to routine step (rare).

### 7.2 Today

Includes, in this order:

1. **Overdue** (collapsible, red count)
2. **Timed** (sorted by `dueAt` / `startAt`)
3. **All-day / dated today**
4. **Starred with no date** (optional, setting: “pin starred into Today”)
5. **Routines due today** (the materialized checklist, not the definition)

Does **not** dump the entire un-dated backlog. That is what lists are for.

Header: date, “plan tomorrow”, count remaining.

### 7.3 Upcoming

Grouped by day for the next 7 days, then a “Later this month” bucket, then “Someday” (no date). Toggle 7 / 14 / 30.

### 7.4 List view

The Google Tasks list, improved:

- Sticky “Add a task” at the top.
- Drag handle visible on hover / on long-press.
- Nested trees with indent guides.
- Completed section collapsed at the bottom, with count.
- List options: sort, rename, color, share, archive, delete, “clear completed”, “save as template”.

### 7.5 Starred

Virtual. Group by home list, or flat by date / recently starred. Manual order is allowed in this app (Google does not). Manual Starred order is stored as `starredPosition` and does not change list order.

### 7.6 Agenda / All

Every active task. Filters: list, tag, starred, priority, has date, overdue, assigned, repeating. This is also the view search results drop into.

### 7.7 Calendar

Not a replacement for Google Calendar. A task-native calendar:

- Month / week / day.
- Drag a task onto a day to set `dueOn`.
- Drag onto a time to set `startAt` + duration (time block).
- Deadline shown as a chip in all-day.
- Toggle: show time blocks on Google Calendar (sync).

### 7.8 Routines

Library of routine definitions. Each card: name, schedule in plain language (“Weekdays, 7:00 AM”), last completed, streak (optional, see 9.4). Opening a routine edits the definition. “Run now” materializes it immediately (useful for a weekend morning started late).

---

## 8. Capture

Speed is the product.

### 8.1 Quick add

Always available:

- Desktop: `Q` or `C` focuses a global capture bar.
- Mobile: persistent New Task button; widget; share sheet; voice.
- Natural language: `Call dentist tomorrow 3pm #health !p2` parses date, time, tag, priority. Unparsed text stays in the title. A preview chip row appears under the field so the user can fix the parse before saving.

Minimum save: title + Enter. List defaults to current view’s list, or Inbox.

### 8.2 Task editor (detail sheet)

Opens on click / tap of a row, or `E`.

Layout, top to bottom:

1. Title (large)
2. Chip row: list, date, deadline, repeat, star, priority
3. Subtask tree (inline, indent/outdent, add step)
4. Notes (markdown: lists, links, checkboxes that are *not* subtasks)
5. Reminders
6. Tags
7. Attachments
8. Links (email, chat, doc)
9. Assignment
10. Calendar extras (color, busy, visibility) behind “Calendar options”
11. Metadata: created, source, series

Nothing below the chip row is required. The editor must feel like Google Tasks’ small panel when you only need a title and a date, and like a full record when you expand it.

### 8.3 Dates, times, deadlines, start

Keep Google’s three time concepts. Name them clearly so they stop colliding:

| User-facing name | Field | Meaning |
| --- | --- | --- |
| **Do on** | `dueOn` / `dueAt` | The day (and optional time) you intend to do it. Appears on that calendar day. Primary reminder. |
| **Due by** | `deadlineOn` | Hard deadline. All-day on calendar. Separate 9 AM (configurable) reminder on that day if still open. |
| **Work at** | `startAt` + `durationMin` | Time block. Busy/free, DND, decline meetings. |

A task can have any combination. Examples:

- “Pay rent” → Due by the 1st, no work block.
- “Write lab report” → Do on Thursday, Due by Friday 11:59 PM, Work at Thursday 2–4 PM.
- “Standup” → Work at 9:30 AM daily (and Do on that day).

Changing Do-on in a series edits “this instance” by default, with a prompt for “this and following” / “all”.

### 8.4 Reminders

- Default: if Do-on has a time, remind at that time. If date only, remind at **Notify time for undated-time tasks** (setting, default 09:00).
- Add more: 1 day before, 1 hour before, custom datetime, “when I arrive at …”.
- Location reminders require OS permission and only fire on mobile.
- From a notification: Complete, Snooze (15m / 1h / tonight / tomorrow), Open.

### 8.5 Subtasks as real tasks

- Indent / outdent, drag to reparent.
- A child can have its own date, reminder, star, notes, and children.
- Completing a parent offers: “Complete all incomplete children?” Default: **no**. Parent complete with open children is allowed and shown as mixed state (minus in the checkbox).
- Progress: `3/7` on the parent row.
- Convert child to top-level (promote) and convert sibling into child (demote).

### 8.6 Moving and reordering

- Drag within a list when sort is My order.
- Drag to a list in the sidebar to move home list.
- Multi-select then Move, Set date, Tag, Star, Priority, Complete, Delete.
- Repeating tasks **can** change lists. The series moves with them.

---

## 9. Recurrence and routines

### 9.1 Simple repeating tasks

Same as Google: every day/week/month/year, ends never/on/after.

Plus:

- Custom: every 2 weeks on Mon and Thu; last weekday of the month; weekdays only.
- `onComplete: spawn_next` for habits (“next appears when I finish this one”).
- `onComplete: spawn_on_schedule` for bills and chores.
- Combine freely with subtasks.

When a repeating parent has children, **the children are part of the series template**. Completing children on instance N does not copy their completed state onto instance N+1.

### 9.2 Instance editing

Always ask:

- This task
- This and following
- Entire series

Deleting follows the same three options. Trash holds instance deletes for 30 days; series deletes for 30 days.

### 9.3 Routines (the daily checklist product)

This is the feature the current `tasks.md` file is asking for, even if it was not named.

**Definition.** A named checklist with a schedule. Examples: Weekday Morning, Weekend Morning, Nightly.

**Behavior.**

1. User builds the tree once (sections are just parent tasks: “Before the Shower”, “Breakfast + Meds”).
2. Schedule: Weekdays 7:00 AM, Weekend 9:00 AM, Nightly 9:30 PM, etc.
3. Each scheduled day, Today shows that routine as a single card with a progress bar and an Expand.
4. Checking items writes to **today’s instance only**.
5. At the end of the day, incomplete routine steps do **not** roll into Overdue by default (setting: “carry leftover routine steps”). Morning routines should not shame you at 11 PM.
6. “Skip today” archives the instance as skipped.
7. Optional streak: consecutive days with ≥ X% of steps complete.

**Sections.** Parent rows can be marked `isSection`. Sections have no checkbox. They only group. Completing is for leaves and normal parents.

### 9.4 Templates

“Save task as template”, “Save list as template”. Insert from quick add with `/template-name` or a Templates picker. Routines can be created from a template.

---

## 10. Organization

### 10.1 Lists vs tags vs stars vs priority

| Tool | Owns the task? | Use for |
| --- | --- | --- |
| List | Yes | Life area or project (School, Work, Home, Inbox) |
| Tag | No | Cross-cutting (#calls, #waiting, #campus) |
| Star | No | “This matters right now” |
| Priority | No | Severity when you need more than a star |
| Date | No | When |

Do not force people to use all four. List + date is enough. The others appear as optional chips.

### 10.2 Sort modes

Inherit Google’s: My order, Date, Deadline, Starred recently, Title. Add **Priority**, **Created**, **Updated**.

Overdue still groups under **Past** when sorting by Date or Deadline.

### 10.3 Completed, clear, trash, archive

- Complete: moves to Completed section of the home list; disappears from smart views (except a Completed filter).
- Clear completed: hides from the list (`hidden: true`) but remains in History search.
- Delete: Trash for 30 days, then hard delete.
- Undo toast: 10 seconds for complete/delete/clear/move.

History view: completed in the last 7 / 30 / 365 days, searchable. Calendar’s “pending 365 days” becomes **Overdue + dated incomplete**, not a mysterious parking lot on today. Pending-on-today is a setting, off by default, because it clutters Today.

---

## 11. Collaboration

Default: private.

### 11.1 Assign

- Assign a task to another user on a shared list, or via a pasted person chip if they share any list with you.
- Assignee gets in-app + email (setting).
- Assigned-to-me smart view.
- Source links for Docs / Chat / email stay first-class, same as Google.

### 11.2 Shared lists

- Invite by email.
- Roles: owner, editor, completer, viewer.
- Activity: “Alex completed Pack laptop”.
- Comments on a task (optional, default off in UI until the list is shared).

### 11.3 Assignment from external surfaces

Keep Google’s model if/when integrating:

- From an email: task + `links[{type:email}]`.
- From chat: task + `links[{type:chat_message}]`.
- From a doc: assigned task + `assignment.surface = document`.

Unassign on the source when the user only wants it off their personal list. “Delete everywhere” is a separate, labeled action.

---

## 12. Integrations

Integrations are adapters. The task record does not depend on them.

| Integration | Direction | Behavior |
| --- | --- | --- |
| Google Calendar | Sync | Dated tasks and time blocks appear. Completing in either place completes in both. |
| Gmail | In | Create from email; store deep link; optional Gmail add-on |
| Google Chat / Slack | In/out | Create from message; optional post on complete |
| Google Docs | In | Checklist → tasks; assignment |
| Share sheet (OS) | In | URL or text becomes a task with a generic link |
| Keyboard / URL scheme | In | `tasks://add?title=...` |
| Webhook / API | Both | Public API mirroring section 6, with times actually stored |
| Files | In | Attach from device or Drive |

Calendar mapping:

- `dueOn` without time → all-day task on that date
- `dueAt` → timed marker / reminder
- `startAt` + duration → event-like block with availability
- `deadlineOn` → all-day “deadline” chip, distinct style

Conflicts: the task app is source of truth for task fields. Calendar event moves update `startAt` / `dueOn`.

---

## 13. Surfaces and layout

### 13.1 Web app (primary desktop)

Full-page, not a 320px sidebar.

```
┌────────────┬──────────────────────────┬─────────────────────┐
│ Sidebar    │ Main list                │ Detail (optional)   │
│ search     │ title + add              │ editor              │
│ smart views│ filters                  │                     │
│ lists      │ rows                     │                     │
│ routines   │ completed                │                     │
└────────────┴──────────────────────────┴─────────────────────┘
```

- Collapse detail to a slide-over on smaller widths.
- Collapse sidebar to icons.
- Google-style side panel can still exist as an embed for Gmail/Calendar, showing Inbox + current list, with “Open full app”.

### 13.2 Mobile app

- Bottom nav: Today, Inbox, Lists, Search.
- Lists page: smart views + user lists + routines.
- Swipe right on a row: complete. Swipe left: date / delete.
- Long-press: multi-select.
- Task detail: bottom sheet, full-screen on small phones.
- Voice button on the capture bar.
- Home screen: resizable List widget (complete/add), Today widget, New Task shortcut, optional Routines widget (“3/12 morning”).
- Lock screen / notification actions: Complete, Snooze.

### 13.3 Widgets and OS

Match Google, then add Today and Routine progress. iOS: Interactive widgets and App Intents (“Add task”, “Complete next routine step”). Android: same, plus Quick Settings tile for New Task.

### 13.4 Share sheet and email-to-task

Optional `tasks+abc@…` inbound address creates an Inbox item with the body as notes. Useful when Google-style Gmail integration is not available.

---

## 14. Search, filters, keyboard

### 14.1 Search

Global, instant, ` / ` or `Ctrl/Cmd+K`.

Searches title, notes, tags, list names, link titles. Results grouped: Tasks, Lists, Routines, Templates. Completed included only if the query toggles “Include completed” or the query has `is:completed`.

Query operators (power user, optional in UI):

```
is:starred  is:overdue  is:repeating  is:unassigned
list:school  tag:health  p:1  due:today  due:week
has:attachment  has:subtasks
```

### 14.2 Keyboard

| Key | Action |
| --- | --- |
| `Q` / `C` | Quick add |
| `Enter` | Save / open |
| `E` | Edit selected |
| `Space` | Complete |
| `S` | Star |
| `#` | Tags |
| `T` | Date picker |
| `I` | Inbox |
| `1` | Today |
| `Cmd/Ctrl + ]` `[` | Indent / outdent |
| `Cmd/Ctrl + ↑↓` | Move in My order |
| `Cmd/Ctrl + Shift + M` | Move to list |
| `Cmd/Ctrl + Z` | Undo |
| `Esc` | Close editor / clear search |
| `J` / `K` | Move selection |
| `/` or `Cmd/Ctrl + K` | Search |

---

## 15. Notifications and badges

- Badge on app icon = Today remaining + overdue (setting to use only overdue).
- Notification channels: Due, Deadline, Routine start, Assignment, Shared list activity. User can disable any channel.
- Routine start: “Weekday Morning is ready” with Open checklist.
- Quiet hours: suppress non-deadline notifications.
- Email digest: optional morning agenda.

---

## 16. Offline, sync, conflict

- Local-first store. All reads from local. Writes queue if offline.
- Sync when back online. Last-write-wins per field, except:
  - Completing vs uncompleting: completing wins if timestamps are close and one side is complete (user intent is “get it out of the list”). Undo still exists.
  - Tree moves: last `parentId`+`position` write wins.
- Multi-device: etags / revision on each task, same idea as Google’s API.
- No “you must be online to add a task”. Ever.

---

## 17. Limits (generous, not Google-shaped)

| Thing | Limit | Reason |
| --- | --- | --- |
| Lists | 200 | More is a smell; use tags |
| Active tasks per list | 50,000 | Well above real use |
| Nesting depth | 16 (UI warns at 5) | Data allows trees; UI should not become a graph |
| Title | 2,000 chars | Paste-safe |
| Notes | 100,000 chars | Specs and meeting notes |
| Attachments per task | 20, 25 MB each | Personal files, not a Drive replacement |
| Recurrence horizon | Generate 24 months ahead, rolling | Calendar performance |
| Trash | 30 days | Recoverable |
| History | Indefinite for completed, user-exportable | Searchable past |

---

## 18. Settings

- Timezone, week start, time format
- Default list, default reminder time for date-only tasks
- Date-only notify time (replace Google’s 9:00 AM)
- Pin starred into Today
- Carry leftover routine steps into Overdue: on/off
- Pending incomplete dated tasks appear on Today: on/off (Google-on, we default off)
- Theme: system / light / dark
- Start screen: Today / Inbox / last list
- Notification channels and quiet hours
- Calendar sync on/off, which calendar
- Confirm before delete series
- Density: comfortable / compact
- Markdown preview on/off

---

## 19. Visual language

- One-column list is the hero, same as Google Tasks. Comfortable checkboxes, 44px tap height on mobile.
- Metadata as quiet chips on the row: date (red if overdue), list name (only in smart views), star, subtask `2/5`, repeat icon, paperclip, assignee avatar.
- Sections: uppercase or bold parent with no checkbox.
- Routines: distinct card on Today, not mixed anonymously with ad-hoc tasks.
- Color is an accent on the list and on calendar blocks, not a rainbow of row backgrounds.
- Empty states teach the next action (“Add your first task”, “Nothing due today”).
- Motion: complete = brief strike + slide to Completed. Undo toast always.

Row anatomy:

```
[ ]  Title of the task                          ★
     Notes preview one line
     Today 3:00 PM · School · 2/5 · ↻ weekdays
```

---

## 20. Accessibility and internationalization

- Full screen-reader names on checkbox, star, due chip.
- Contrast AA for text and overdue red.
- Reduced motion: skip the complete animation.
- Dates and recurrence in the user’s locale and calendar.
- RTL layouts for lists and indent.
- Large text: rows wrap, chips wrap, nothing truncates the title to unreadable.

---

## 21. Import, export, privacy

- Import from Google Tasks (API or takeout), Todoist, Apple Reminders, Markdown checklists (this repo’s `tasks.md` should import as three routines).
- Export: JSON (full fidelity), Markdown (lists as headings, tasks as `- [ ]`), iCalendar for dated tasks.
- Account data download.
- Private by default. No selling of task content. Local encryption at rest on mobile. Shared lists are explicit.

---

## 22. Feature map: Google parity vs perfect-app additions

### Must have on day one (Google parity + the blockers)

- Lists, Inbox, task CRUD, notes, complete, undo
- Dates, times, deadlines, start/duration
- Notifications (configurable date-only time)
- One-level *and* nested subtasks
- My order + sort by date/title
- Star + Starred view
- Recurring tasks
- **Routines (repeating checklists)**
- Today, Overdue, Upcoming
- Search
- Mobile + web
- Widgets, share sheet
- Offline
- Trash

### Should have soon after

- Tags, priority, filters, query operators
- Templates
- Calendar sync
- Email/link capture
- Attachments
- Multi-select bulk actions
- Natural language quick add
- Location reminders
- Assigned-to-me and shared lists
- Keyboard-first desktop

### Later

- Auto-decline / DND / Calendar visibility extras
- Comments and activity on shared lists
- Streaks
- Public API and incoming email
- Multiple calendars, multiple accounts
- Kanban board as an optional lens on a list (never the default)

---

## 23. UX flows (happy paths)

### 23.1 Capture from nowhere

1. User hits `Q` or the widget.
2. Types `Buy filters Saturday #home`.
3. Chips show Saturday and tag home.
4. Enter. Task is in Inbox (or Home if that list was current) and on Upcoming for Saturday.

### 23.2 Plan today

1. Open Today.
2. Overdue at top. User snoozes two, completes one, sets one to tonight.
3. Timed items in chronological order.
4. Routine card: Weekday Morning 4/12. Expand, finish the rest.
5. Drag an undated Inbox item from a peek panel onto Today (sets Do on = today).

### 23.3 Build a morning routine

1. New Routine → “Weekday Morning”.
2. Schedule: Weekly, Mon–Fri, 7:00 AM. Do not carry leftovers.
3. Paste or type sections and steps (import from Markdown supported).
4. Save. Tomorrow at 7:00, notification “Weekday Morning is ready”.
5. Checking “Take Lexapro” on Tuesday does not check it on Wednesday.

### 23.4 Email follow-up

1. In Gmail (or via share sheet), Add to Tasks.
2. Title defaults to subject. Notes include snippet. Link back to the thread.
3. User sets Due by Friday, star.
4. Appears in Starred and Upcoming. Opening the link returns to the email.

### 23.5 Time-block deep work

1. Task “Lab report” already exists, Due by Friday.
2. User sets Work at Thursday 14:00, duration 120.
3. Block syncs to Calendar as Busy. Optional DND.
4. Completing the task frees the block.

### 23.6 Repeat a bill

1. “Pay rent” Due by the 1st, repeat monthly, reminder 3 days before and on the day at 9:00.
2. Completing January spawns February (spawn_on_schedule actually already showed February on the calendar). January instance is history.

---

## 24. Empty, error, and edge cases

- Quick add with empty title on Enter: do not create. Shake the field.
- Completing a series instance: never delete the series by accident.
- Clock change / travel: reminders fire in the task’s stored timezone unless the user opted into “always my current timezone”.
- Month-end recurrence (31st): skip or use last day of month; setting default = last day.
- Shared list member loses access: their assigned copies stay readable as “unshared, copy kept”, or drop per owner setting.
- Huge notes paste: accept, collapse in the row to one line.
- Widget with zero tasks: “All clear” + Add.
- Conflict while editing the same task on two devices: keep both titles if both changed, prefer the newer, and flag “merged” only if notes both changed (append with a divider). Prefer last-write-wins for v1; merge is v2.

---

## 25. Success metrics

If this app is actually better than Google Tasks, these move:

- Time from intent to saved task < 2 seconds on desktop, < 3 on mobile.
- Percent of tasks created with a date without opening the full editor (NLP + chips) > 50%.
- Daily routine completion rate (user opted into streaks) is measurable.
- Search used; average tasks per user can grow past 100 without the product feeling unusable.
- Accidental delete/complete recovered via undo > 0 and complaints about “it vanished” ≈ 0.
- Today view open rate is the dominant session start.

---

## 26. Mapping the existing `tasks.md` file

The current workspace file is three routines, not a pile of one-off tasks. The app should import it as:

| Markdown heading | Object |
| --- | --- |
| `# Daily Routines` | Folder label / tag, not a list of tasks |
| `## Weekday Morning Routine` | Routine, schedule Mon–Fri |
| `## Weekend Morning Routine` | Routine, schedule Sat–Sun |
| `## Nightly Routine` | Routine, schedule every day, evening notify time |
| `### Before the Shower` etc. | Section parents (`isSection`) |
| Nested `- [ ]` | Child tasks |

That import is a launch requirement. A perfect task app that cannot represent this file without flattening it has failed the brief.

---

## 27. Implementation notes (when we build)

- Treat **Task as the only item type**. Sections, subtasks, and routine steps are flags and tree position, not subclasses in the UI layer.
- Store `position` as a fractional index string so inserts do not rewrite the whole list (same idea as Google’s lexicographic `position`).
- Materialize routine instances per day lazily: create the instance when Today is opened or when the reminder fires, not years ahead.
- Keep a Google Tasks import path so existing users can bring lists, dates, notes, and links. Recurrence + subtasks will not round-trip back to Google; warn on export.

---

## 28. One-page summary

Google Tasks already has the right atoms: lists, a light task record, due dates, deadlines, time blocks, stars, one-level subtasks, recurrence, Gmail/Chat/Docs capture, Calendar, widgets, and complete/clear.

The perfect app keeps every atom, then adds the structure Google refuses: search, Today, nested tasks that are real tasks, repeating checklists (routines), tags, custom reminders, bulk actions, undo, a full desktop app, and a data model that actually stores the times and rules the UI already pretends to have.

The test of the design is simple. A user should be able to capture “call dentist tomorrow 3pm”, run a weekday morning routine without yesterday’s checkmarks leaking through, and find any old task by typing two words. If those three things are easy, the rest of this document is support.
