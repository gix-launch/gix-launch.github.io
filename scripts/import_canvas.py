#!/usr/bin/env python3
"""Import gates and presentations from Canvas course exports into assets/js/assignments.js.

Usage (from the repo root):
    python3 scripts/import_canvas.py

Only assignments in the "Gate..." and "Presentations" assignment groups are imported.
Peer evaluations, status reports, budgets, surveys, etc. are ignored.
"""
import glob
import html
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

NS = {"c": "http://canvas.instructure.com/xsd/cccv1p0"}
PACIFIC = ZoneInfo("America/Los_Angeles")
OUT_PATH = "assets/js/assignments.js"

# Each export: folder, course code, quarter id, and a day shift for exports from a previous year.
# Launch II was exported from Winter 2026; shifting 364 days (52 weeks) keeps weekdays for Winter 2027.
COURSES = [
    {"folder": "ref/launch I", "course": "TECHIN 540", "quarter": "autumn", "shift_days": 0},
    {"folder": "ref/launch II", "course": "TECHIN 542", "quarter": "winter", "shift_days": 364},
]

# Short, sponsor-facing summaries where the export has no single "dominant question".
SUMMARY_OVERRIDES = {
    "gate 7": "Map the full system into subsystems; each student builds and demos a Minimum Working System that de-risks a real product assumption.",
    "gate 8": "Each student usability-tests an early subsystem with real users before integration, and uses the evidence to reorder the build.",
    "gate 9": "Connect working subsystems, run integration tests with real data flowing between them, and plan full integration.",
    "gate 10": "Health check: most subsystems working, at least one partial integration demonstrated, and a two-week plan to finish.",
    "gate 11": "Alpha system: one complete, real end-to-end path from input to output. It may be slow, fragile, or partly manual.",
    "gate 12": "Show the end-to-end system works repeatedly under realistic conditions, and document where and why it breaks.",
    "gate 13": "Validate the end-to-end system with domain experts, industry partners, or real users: does it make sense outside the classroom?",
    "gate 14": "Turn validation evidence into action: decide what to fix, mitigate, or accept, and implement at least three changes.",
    "gate 15": "Beta system: stable, predictable, and demo-ready, with stability tests, failure modes, and recovery documented.",
    "TECHIN 540 mid-term presentation": "Product review on the problem, user, and market (Gates 1–3) plus the research plan in progress.",
    "TECHIN 540 final presentation": "Product review on research findings, the MVP, and the launch strategy (Gates 4–6), presented to instructors and sponsors.",
    "TECHIN 542 mid-quarter presentation": "System review of architecture, Minimum Working Systems, and early integration (Gates 7–9), with a live demo.",
    "TECHIN 542 final presentation": "Professional execution and readiness review of the built and tested system with instructors, stakeholders, and program leadership.",
}

FORMAT_OVERRIDES = {
    "TECHIN 540 mid-term presentation": "10-minute presentation with ongoing Q&A",
    "TECHIN 540 final presentation": "20-minute presentation with Q&A, including the project sponsor",
    "TECHIN 542 mid-quarter presentation": "12 minutes including demo and Q&A; poster required",
    "TECHIN 542 final presentation": "15 minutes including Q&A; slides locked the night before",
}

# Concise deliverables where the export mixes them with logistics or internal links (never publish those).
DELIVERABLE_OVERRIDES = {
    "gate 13": [
        "Stakeholder activities led by each team member, with video evidence",
        "Stakeholder feedback summary",
        "At least two evidence-backed gaps observed by each student",
        "Risk assessment for launch / demo",
    ],
    "TECHIN 542 mid-quarter presentation": [
        "Problem context and target user",
        "System overview and architecture (subsystems and integrations)",
        "Minimum Working Systems",
        "Early integration efforts, testing, and evidence",
        "Unknowns, risks, and next-step plan",
    ],
    "TECHIN 542 final presentation": [
        "Industry-style product and system review following the course slide template",
        "Every team member presents and can explain the whole project",
        "Built system, tested under realistic conditions, with strengths and limits explained",
    ],
}

# Fix typos in Canvas rubric criterion names.
CRITERION_NAME_FIXES = {
    "IntegrationTesting & Evidence": "Integration Testing & Evidence",
    "Demo Readiness Assess": "Demo Readiness Assessment",
    "Subsystem Dev": "Subsystem Development",
    "Next 2 Week Plan": "Next 2-Week Plan",
}

# Presentations happen in class; gates are due at the stated time.
PRESENTATION_DATE_OVERRIDES = {
    # Final slides are due 11:59 pm the day before the TECHIN 542 final presentation.
    "TECHIN 542 final presentation": 1,
}


def text_of(el: ET.Element, tag: str) -> str:
    found = el.find("c:" + tag, NS)
    return found.text if found is not None and found.text else ""


def strip_tags(fragment: str) -> str:
    s = re.sub(r"<[^>]+>", "", fragment)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def nice_title(raw: str) -> str:
    title = html.unescape(raw).strip()
    if title.isupper():
        title = title.title()
    return re.sub(r"\bE2E\b|\bMws\b", lambda m: m.group(0).upper(), title).replace("Mid-Term", "Mid-term")


def section(body: str, start_pattern: str, end_pattern: str) -> str:
    m = re.search(start_pattern, body, re.I)
    if not m:
        return ""
    rest = body[m.end():]
    end = re.search(end_pattern, rest, re.I)
    return rest[: end.start()] if end else rest


def extract_deliverables(body: str) -> list[str]:
    end = r"<h\d[^>]*>\s*(<strong>)?\s*(Guiding Questions|Deliverable Format|How This)"
    sec = section(body, r">\s*(Key Deliverables|Presentation Components):?\s*<", end)
    if not sec:  # e.g. two-stage gates without a "Key Deliverables" heading
        sec = section(body, r"^", end)
        stages = [strip_tags(h) for h in re.findall(r"<h[34][^>]*>(.*?)</h[34]>", sec, re.S)]
        return [h for h in stages if h and not h.lower().startswith(("guiding", "how this"))]
    headings = [strip_tags(h) for h in re.findall(r"<h[2-5][^>]*>(.*?)</h[2-5]>", sec, re.S)]
    numbered = [re.sub(r"^\d+\.\s*", "", h) for h in headings if re.match(r"^\d+\.", h)]
    if numbered:
        return numbered
    items = [strip_tags(li) for li in re.findall(r"<li[^>]*>(.*?)</li>", sec, re.S)]
    return [i for i in items if i][:8]


def extract_summary(body: str) -> str:
    m = re.search(r"Dominant question:\s*(?:</strong>)?\s*(?:<em>)?\s*[\"“](.*?)[\"”]", body, re.S)
    return strip_tags(m.group(1)) if m else ""


def extract_table_rubric(body: str) -> dict | None:
    """Launch I embeds its rubric as an HTML table plus a score-band line."""
    sec = section(body, r"How This (Assignment|Presentation) Is Graded", r"$^")
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", sec, re.S)
    criteria = []
    for row in rows:
        cells = [strip_tags(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)]
        if len(cells) >= 2 and cells[0] and cells[0].lower() != "criterion":
            criteria.append({"name": cells[0], "description": cells[1]})
    if not criteria:
        return None
    total = re.search(r"Total:\s*(\d+)\s*points", strip_tags(sec))
    each = round(int(total.group(1)) / len(criteria), 2) if total else None
    bands = re.search(r"\d+\s*-\s*\d+\s*=\s*Proficient[^<]*", strip_tags(sec))
    return {
        "criteria": [{**c, "points": each} for c in criteria],
        "bands": bands.group(0).strip() if bands else "",
    }


def canvas_rubrics(folder: str) -> dict[str, dict]:
    rubrics = {}
    for r in ET.parse(f"{folder}/course_settings/rubrics.xml").getroot():
        criteria = []
        for c in r.find("c:criteria", NS):
            levels = [{"label": text_of(x, "description").strip(), "points": float(text_of(x, "points") or 0),
                       "text": text_of(x, "long_description").strip()} for x in c.find("c:ratings", NS)]
            name = text_of(c, "description").strip()
            criteria.append({"name": CRITERION_NAME_FIXES.get(name, name), "points": float(text_of(c, "points") or 0),
                             "description": text_of(c, "long_description").strip(), "levels": levels})
        rubrics[r.get("identifier")] = {"criteria": criteria, "bands": ""}
    return rubrics


def to_pacific(due_utc: str, shift_days: int) -> datetime:
    dt = datetime.fromisoformat(due_utc).replace(tzinfo=timezone.utc).astimezone(PACIFIC)
    return dt + timedelta(days=shift_days)


def import_course(cfg: dict) -> list[dict]:
    folder = cfg["folder"]
    groups = {g.get("identifier"): html.unescape(text_of(g, "title")).strip()
              for g in ET.parse(f"{folder}/course_settings/assignment_groups.xml").getroot()}
    rubrics = canvas_rubrics(folder)
    out = []
    for settings in glob.glob(f"{folder}/*/assignment_settings.xml"):
        root = ET.parse(settings).getroot()
        group = groups.get(text_of(root, "assignment_group_identifierref"), "")
        if text_of(root, "workflow_state") != "published":
            continue
        if not (group.startswith("Gate") or group == "Presentations"):
            continue
        due_raw = text_of(root, "due_at")
        if not due_raw:
            continue
        pages = glob.glob(os.path.join(os.path.dirname(settings), "*.html"))
        body = open(pages[0], encoding="utf-8").read() if pages else ""
        title = nice_title(text_of(root, "title"))
        is_gate = group.startswith("Gate")
        gate_no = re.match(r"Gate (\d+)", title, re.I)
        key = f"gate {gate_no.group(1)}" if is_gate and gate_no else f"{cfg['course']} {title.lower()}"
        due = to_pacific(due_raw, cfg["shift_days"] + PRESENTATION_DATE_OVERRIDES.get(key, 0))
        rubric = rubrics.get(text_of(root, "rubric_identifierref")) or extract_table_rubric(body)
        out.append({
            "id": ("gate-" + gate_no.group(1)) if is_gate and gate_no else re.sub(r"[^a-z0-9]+", "-", key.lower()).strip("-"),
            "course": cfg["course"],
            "quarter": cfg["quarter"],
            "type": "gate" if is_gate else "presentation",
            "number": int(gate_no.group(1)) if is_gate and gate_no else None,
            "title": title,
            "due": due.strftime("%Y-%m-%d"),
            "time": None if not is_gate else due.strftime("%-I:%M %p").lower(),
            "points": float(text_of(root, "points_possible") or 0),
            "tentative": cfg["shift_days"] != 0,
            "summary": SUMMARY_OVERRIDES.get(key) or extract_summary(body),
            "format": FORMAT_OVERRIDES.get(key),
            "deliverables": DELIVERABLE_OVERRIDES.get(key) or extract_deliverables(body),
            "rubric": rubric,
        })
    return out


def main() -> None:
    if not all(os.path.isdir(c["folder"]) for c in COURSES):
        sys.exit("Run from the repo root; expected Canvas exports in ref/launch I and ref/launch II.")
    items = sorted((a for c in COURSES for a in import_course(c)), key=lambda a: (a["due"], a["type"], a["number"] or 0))
    missing = [a["title"] for a in items if not a["summary"]]
    if missing:
        print("Warning: no summary for:", ", ".join(missing), file=sys.stderr)
    header = "// GENERATED by scripts/import_canvas.py from the Canvas exports in ref/. Do not edit by hand.\n"
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(header + "window.CAPSTONE_ASSIGNMENTS = Object.freeze(" + json.dumps(items, indent=1, ensure_ascii=False) + ");\n")
    print(f"Wrote {len(items)} assignments to {OUT_PATH}")
    for a in items:
        crit = len(a["rubric"]["criteria"]) if a["rubric"] else 0
        print(f"  {a['due']} {a['course']} {a['title'][:60]:60} {a['points']:>5} pts  rubric:{crit}  deliverables:{len(a['deliverables'])}")


if __name__ == "__main__":
    main()
