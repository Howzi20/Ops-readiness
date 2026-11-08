# Operations Readiness

A standalone web app that tracks a site from construction / blank canvas through Practical Completion (PC)
to Go-Live, replacing the Excel transition tracker.

Design spec: [`docs/superpowers/specs/2026-11-07-operations-readiness-design.md`](docs/superpowers/specs/2026-11-07-operations-readiness-design.md)

## Run it on your Mac

Needs [Node.js 20+](https://nodejs.org) (`brew install node`).

```bash
git clone <this repo's URL> ops-readiness
cd ops-readiness
npm install
cp .env.example .env
npm run setup             # creates the local database and loads the template + demo site
npm run dev
```

Open **http://localhost:3200**. You go straight into the app with no login (prototype mode).

### Turning logins on

Set `REQUIRE_LOGIN="true"` in `.env` and restart `npm run dev`. Sign in with **admin@readiness.local / readiness**,
then change that password and add your team on the **Users** page.

It runs on port **3200** so it doesn't clash with other apps on port 3000. To use a different port, change `-p 3200`
in `package.json`.

The database is a single local file (`prisma/dev.db`, not committed). Delete it and run `npm run setup` to start fresh.

## What's in it

- **Sites**: one card per site with completion, days to PC / Go-Live, and red/yellow counts.
- **Site dashboard**: completion, countdowns, open flags, tasks by status, workload per person, what's due in the next
  14 days, and a tile per workstream.
- **Workstream boards** with four views of the same tasks:
  - **Table**: collapsible colour-coded groups, colour-filled status and priority cells you click to change, avatar
    pickers for RACI, a progress slider, an automatic flag, and a summary row per group.
  - **Kanban**: cards in status columns. Drag a card to change its status.
  - **Timeline**: a Gantt chart with bars from start date to target date, plus Today, PC and Go-Live lines.
  - **Calendar**: tasks on their target dates, month by month.
- **Task panel**: an **Updates** thread of dated comments, plus a details tab for dates, phase, RACI, progress,
  description and a manual flag override (needs a reason).
- **Flags**: every red/yellow task across the site in one list.
- **Risks, Contacts, Key Dates, Settings** (including "save site as template").
- **Templates**: a "New build (standard)" template with about 620 generic readiness tasks across 13 workstreams. You can duplicate it or build others.

### Flag rules
Manual override wins. Otherwise **Red** = past target date and not Completed/N/A; **Yellow** = due within 14 days and
under 50%; **Green** otherwise. The rules are in `src/modules/readiness/rules.ts`.

## Code layout

```
src/lib/                      shared: database, login/session, dates
src/components/               shared UI
src/modules/readiness/        logic: rules, template copying, queries, server actions
src/app/(app)/readiness/      screens
prisma/schema.prisma          database tables
prisma/seed/                  seed script + template JSON
scripts/extract_template.py   rebuild a template JSON from a tracker workbook
```

## Tests

```bash
npm test          # unit tests: flag/completion rules, template copying
npm run e2e       # browser test: login → new site → update task → dashboard & flags
```

## Rebuilding the template from a workbook

```bash
cp scripts/anonymise.example.json scripts/anonymise.local.json   # then list the names to replace
python3 -I scripts/extract_template.py "path/to/Transition Tracker.xlsx" prisma/seed/template-new-build.json
```

Only task wording, sections, priority and phase are extracted. Company, client, tenant, vendor and product names
are replaced using `scripts/anonymise.local.json`, which is git-ignored so the real names are never published.
Keep workbooks with client data out of the repo (`*.xlsx` is git-ignored).
