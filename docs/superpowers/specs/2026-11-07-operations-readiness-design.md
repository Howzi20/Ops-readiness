# Operations Readiness Module — Design

Date: 2026-11-07 · Status: approved in conversation (concept stage)

## Purpose
> Update: built as a **standalone web app** (its own repo, port 3200), not inside fm-app.

**Operations Readiness** tracks a site from
construction / blank canvas through to operational readiness and Go-Live, replacing the Excel
transition tracker workbook.

## Users & hosting
- Team tool. Simple email/password login. Every logged-in user sees and edits every site; no roles.
- Runs locally for now (developer MacBook). SQLite now, swappable to Postgres when hosted.
- Contacts are separate from logins: RACI can reference any site contact, including client people with no login.

## Stack
Next.js (App Router, TypeScript) · Prisma + SQLite · Tailwind CSS · simple session auth (bcrypt + signed cookie,
upgradeable to Microsoft SSO later) · Vitest for unit tests · Playwright for one end-to-end test.

Module code lives under `src/app/readiness` and `src/modules/readiness`; shared login/db/layout under `src/lib`,
so later modules sit beside it.

## Data model
- **User** — name, email, password hash.
- **Template** — site type (e.g. "New build (standard)", "Takeover"). Has **TemplateWorkstream** → **TemplateTask**
  (section, title, default priority, phase, sort order). No date offsets: target dates are entered manually per site.
- **Site** — name, client, address, template used, transition start, PC (Practical Completion) and Go-Live dates.
- **Contact** (per site) — name, organisation (Our team / Client / Other), role, initials, phone, email, leave notes.
- **Workstream** (per site) — copied from template, with owner (contact).
- **Task** (per site) — section, title, R/A/C/I contacts, priority 1–3, target date, status, progress 0–100,
  phase (Pre-PC / Post-PC), documented (Yes/No/N/A), notes, flag override + override note, last updated by/at.
- **KeyDate** — extra custom milestones (name, date).
- **Risk** — number, function, description, identified by, date recorded, severity, likelihood, responsible,
  target date, action to close, status (Open / Closed).

Creating a site deep-copies the chosen template. Template changes affect only sites created afterwards.
A site can be saved as a new template.

## Rules (`src/modules/readiness/rules.ts`)
- Status: To Commence · In Progress · Delayed · Completed · N/A. Priority 1 / 2 / 3.
- Setting status Completed sets progress to 100. Progress 100 does not auto-complete.
- **Flag**: manual override (requires note) wins. Else RED if target date passed and status not Completed/N/A;
  YELLOW if target date within 14 days and progress < 50; else GREEN. No target date → GREEN.
- **Completion**: average progress of tasks excluding N/A. Site total = average over all site tasks (not of workstreams).
- **At risk** workstream = at least one RED task.
- Flag and completion are computed, never stored.

## Screens
1. Sites list — cards (completion, days to PC/Go-Live, red/yellow counts); New Site form (picks template).
2. Site dashboard — key dates & countdowns, overall %, open flags, workstreams at risk, a tile per workstream.
   Site tabs: Dashboard · Workstreams · Flags · Risks · Contacts · Key Dates · Settings.
3. Workstream task table — grouped by section; inline edit of status/progress/date/RACI; side panel for notes,
   flag override, phase, documented; filters (phase, status, flag, person); add task / section.
4. Flags — all red/yellow tasks across workstreams, sorted by date, filterable.
5. Risks — editable register; open first, closed collapsed.
6. Contacts — grouped by organisation.
7. Key Dates — PC, Go-Live, transition start + custom, with countdowns.
8. Templates — create/rename/duplicate, edit workstreams & tasks, save site as template.
9. Login + Users (any user can add a user).

## Seed data
- Import script reads a tracker workbook from a local path (never committed) and builds the "New build (standard)"
  template: tabs 1, 1A, 2, 3, 4, 4A, 5, 6, 7, 7A, 8, 9, 14 (tab 14 → Post-PC). Task wording, sections and
  priority only — no names, dates, statuses or notes.
- A demo site with fictional contacts for showing the dashboard.

## Error handling
Server-side validation on every write; inline edits roll back with a short error on failure;
last-write-wins with "last updated by X at Y" shown.

## Testing
Unit tests for flag, completion and template copy rules. One Playwright test: login → create site → update task →
dashboard & flags reflect it.

## Out of scope (v2+)
Vendor tracker, handover register, communications plan, recruitment / org structure, Excel import/export,
audit history, roles/permissions, hosting.
