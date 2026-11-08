"""Build a site-template JSON from a transition tracker workbook.

Copies task wording, section headings, priority and phase ONLY. Names, dates,
statuses and notes are deliberately left out, and company, client, tenant,
vendor and product names are replaced with generic terms listed in the
git-ignored scripts/anonymise.local.json.

usage: python3 -I scripts/extract_template.py <workbook.xlsx> <out.json>
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

TABS = [  # (sheet name prefix, code, workstream name, phase)
    ("1.ONBOARDING", "1", "Onboarding", "PRE_PC"),
    ("1A. TENANT", "1A", "Tenant Onboarding", "PRE_PC"),
    ("2. TRANSITION", "2", "Transition", "PRE_PC"),
    ("3. HUMAN", "3", "Human Resources", "PRE_PC"),
    ("4. OPERATIONAL", "4", "Operational Technology", "PRE_PC"),
    ("4A. INFORMATION", "4A", "Information Technology", "PRE_PC"),
    ("5. FINANCE", "5", "Finance", "PRE_PC"),
    ("6. LEASE", "6", "Lease Administration", "PRE_PC"),
    ("7. ENGINEERING", "7", "Engineering", "PRE_PC"),
    ("7A. SHARED", "7A", "Shared Services", "PRE_PC"),
    ("8. CUSTOMER", "8", "Customer Experience", "PRE_PC"),
    ("9. ENERGY", "9", "Energy & Sustainability", "PRE_PC"),
    ("14. POST TRANSITION", "14", "Post Transition", "POST_PC"),
]
STATUSES = {"COMPLETED", "IN PROGRESS", "DELAYED", "N/A", "TO COMMENCE", "NOT STARTED"}


# Organisation / client / tenant / vendor / product names to replace are kept in
# scripts/anonymise.local.json, which is git-ignored so the names themselves are never
# published. See scripts/anonymise.example.json for the format.
RULES_FILE = Path(__file__).with_name("anonymise.local.json")


def load_rules():
    if not RULES_FILE.exists():
        sys.exit(f"Missing {RULES_FILE.name}: copy anonymise.example.json to it and list the names to replace.")
    return [(pattern, repl) for pattern, repl in json.loads(RULES_FILE.read_text())["rules"]]


ANONYMISE = []


def anonymise(text):
    for pattern, repl in ANONYMISE:
        text = re.sub(pattern, repl, text)
    return text


def clean(v):
    return anonymise(re.sub(r"[ \t]+", " ", str(v)).strip()) if v is not None else ""


def extract(ws):
    rows = list(ws.iter_rows(values_only=True))
    header = next(i for i, r in enumerate(rows) if clean(r[1]).upper() == "TASK")
    cols = [clean(c).upper() for c in rows[header]]
    p_col = cols.index("PRIORITY") if "PRIORITY" in cols else None
    s_col = cols.index("STATUS")
    section, tasks = "", []
    for r in rows[header + 1:]:
        title = clean(r[1] if len(r) > 1 else None)
        if not title or title.upper() in ("TASK",):
            continue
        status = clean(r[s_col]).upper() if len(r) > s_col else ""
        if status not in STATUSES:
            # no status -> section heading (only short single-line text)
            if len(title) <= 80 and "\n" not in title:
                section = title.title() if title.isupper() else title
            continue
        pr = r[p_col] if p_col is not None and len(r) > p_col else None
        priority = pr if isinstance(pr, (int, float)) and int(pr) in (1, 2, 3) else 2
        tasks.append({"section": section, "title": title, "priority": int(priority)})
    return tasks


def main(src, out):
    ANONYMISE.extend(load_rules())
    wb = openpyxl.load_workbook(src, data_only=True)
    streams = []
    for i, (prefix, _code, name, phase) in enumerate(TABS):
        ws = next(w for w in wb.worksheets if w.title.startswith(prefix))
        tasks = [dict(t, phase=phase) for t in extract(ws)]
        streams.append({"code": str(i + 1), "name": name, "tasks": tasks})
        print(f"{i + 1:>3} {name:<26} {len(tasks):>4} tasks", file=sys.stderr)
    json.dump({"name": "New build (standard)",
               "description": "Construction / blank canvas to operational readiness: onboarding, transition, people, technology, finance, leasing, engineering, customer experience, sustainability and post-PC.",
               "workstreams": streams}, open(out, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
