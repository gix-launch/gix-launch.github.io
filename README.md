# Launch Studio — Sponsor Site

Static multi-page site (no build step) for industry sponsors of GIX Integrated Launch Studio I & II
(TECHIN 540, Autumn 2026 · TECHIN 542, Winter 2027). Open `index.html` in a browser, or publish the
folder to GitHub Pages / UW web hosting. (Don't publish `ref/` — it holds the raw Canvas exports.)

## Pages
| Page | Purpose |
|---|---|
| `index.html` | Overview + current progress (this week, gates passed, timeline), Spirit of Launch projects (two-quarter journey), Schedule (Gantt chart of all gates and presentations), color-coded expectations, Project overview cards, sponsor thank-you, "Interested in sponsoring a project?" contact (Katelin Cannon) |
| `week.html?id=winter-2` | One page per week: sponsor reviews, gates/presentations due, deliverables, and full rubric. Reached from the **Weeks** menu. |
| `gates.html` | All 15 gates and 4 presentations by quarter. Passed items are greyed out and the next one is highlighted. |
| `sponsors.html` | Sponsor guide: outcomes, sponsor role, communication (with feedback check-in dates), alpha-demo expectations, confidentiality & AI |
| `demo.html` | Demo day: date, time and location, agenda, "Add to calendar" (.ics download and Google Calendar link), guest note, and the teams presenting by track |
| `projects.html` / `project.html?id=<project id>` | Project cards (filter by track and sponsor; filters are kept in the URL, e.g. `projects.html?track=robotics&sponsor=student-led`) → team page with student photos |
| `contact.html` | Who to contact by topic (course & academics, teams & students, sponsorship) + message form (opens an email draft) |
| `feedback.html?project=<project id>` | Sponsor feedback survey (name, company, 1–5 star rating, comments, questions) and the check-in windows. See **Sponsor feedback** below. |

## Updating content
- **Gates & presentations** come from Canvas. Re-export the courses into `ref/launch I` and `ref/launch II`, then run
  `python3 scripts/import_canvas.py` to regenerate `assets/js/assignments.js`. Only the "Gate…" and "Presentations"
  assignment groups are imported. Short sponsor-facing summaries and a few cleaned-up deliverable lists live in the
  `*_OVERRIDES` dictionaries at the top of the script.
- **Winter dates** are projected from the Winter 2026 export (`shift_days: 364`) and marked *Tentative*. When the
  Winter 2027 course is set up, re-export it and set `shift_days` to `0`, then remove `tentative: true` from the
  winter milestones in `data.js`.
- **Projects** (`projects` in `assets/js/data.js`) were summarized from the decks in `ref/Sponsor decks` and the students from
  `ref/team_roster_final.csv`. Student-led projects have `studentLed: true` and stay out of the sponsor banner.
- **Directory-release opt-outs:** students who have opted out of UW directory release cannot have their names posted.
  In `data.js`, list them as `{ optedOut: true }` and leave out their name, initials, and photo. The project page
  shows an unnamed "Team member" card, so team sizes stay correct. The roster CSV still has every name, so check new
  rosters against the opt-out list before copying names in. `tests/team-privacy.test.js` checks the four current opt-outs.
- **Demo day** (`demoDay` in `data.js`): set `start`/`end` (24-hour local time) once the time is known, otherwise the
  calendar entry is all-day; add `location`/`address` and an optional `rsvp` link. The date itself is the milestone
  marked `demoDay: true`. The calendar file is generated in the browser, so nothing needs a server.
- **Sponsor attendance** on each milestone is `"Optional"`, `"Encouraged"`, or `"Required"` (`tests/site-data.test.js`).
- **Feedback check-in windows** (`feedback.windows` in `data.js`) are shown on the feedback page and in the sponsor guide.
  They are proposed dates following each review; adjust them to match when you actually send the request.
- **Past cohorts** (`alumni` in `data.js`): add `outcomes` (cohort, sponsor, title, text, optional link) and
  `testimonials` (quote, name, title, cohort). The "Where Launch projects go" section on the Overview page is hidden
  until at least one entry exists. Publish quotes only with the sponsor's permission.
- **Everything else** (sponsor review milestones, sponsor guide text, contacts) is in `assets/js/data.js`.
- Points are not shown anywhere on the site; the import still keeps them in `assignments.js`.
- **Student photos:** drop the original headshot in `assets/headshots/`, add the student to `HEADSHOTS` in
  `scripts/prepare_headshots.py` (data.js name → file name), and run `python3 scripts/prepare_headshots.py`. It writes a
  480px square crop to `assets/img/students/<name>.jpg`. Then replace the student's name in `data.js` with
  `{ name: "…", photo: "assets/img/students/<name>.jpg" }`. Tweak a bad crop with `CROP_OVERRIDES` in the script.
  `assets/headshots/` holds full-size originals (about 100 MB) and is git-ignored. Don't publish it.
- **Sponsor logos** (banner and the Overview thank-you section) are listed in `sponsors` in `data.js`. Drop the original
  logo files in `assets/logos/`, list them in `LOGOS` at the top of `scripts/prepare_logos.py`, and run
  `python3 scripts/prepare_logos.py` (needs Pillow) to trim, clean up, and resize them into `assets/img/sponsors/`.
  A sponsor with `logo: null` is shown as text, a list of logos is shown side by side (joint sponsors), and
  `logoScale` enlarges compact or stacked logos. The site logo is `assets/logos/logo.png`.

## Sponsor feedback
`feedback.html` replaces the Google Form. Sponsors fill it in on the site, with no Google sign-in. A small Google Apps
Script (`apps-script/feedback.gs`) saves each response as a row in a private Google Sheet and emails it to `NOTIFY`
(set at the top of the script). The email subject starts with **[Follow-up needed]** when the rating is below 3 stars
or the sponsor asked to discuss their feedback.

Send each sponsor their team's link, `feedback.html?project=<project id>` (ids are in `projects` in `data.js`). It
selects the project and fills in the company. The page is also in the menu, the Sponsor guide, and each project page.

**One-time setup (about 10 minutes)**
1. Create a Google Sheet, e.g. "Launch Studio sponsor feedback".
2. In the Sheet, open **Extensions → Apps Script**. Replace everything in `Code.gs` with the contents of
   `apps-script/feedback.gs`, edit `NOTIFY` if needed, and save.
3. Click **Deploy → New deployment**, choose the type **Web app**, and set *Execute as* to **Me** and *Who has access*
   to **Anyone**. Click **Deploy** and allow the permissions it asks for (edit this Sheet, send email as you).
   If **Anyone** is not offered, your Google Workspace domain doesn't allow public web apps; ask UW-IT, or use another
   account the program controls.
4. Copy the **Web app URL** (it ends in `/exec`) into `feedback.endpoint` in `assets/js/data.js` and publish the site.
5. Test it: open the URL in a browser (you should see `"ok":true`), then submit the form once. A **Responses** tab
   appears in the Sheet.

"Anyone" means anyone can *send* a response. Only people you share the Sheet with can *read* responses. You can add your
own columns, such as "Followed up by", to the right of the existing ones.

To change the script later, edit it in the Apps Script editor, then use **Deploy → Manage deployments → Edit →
Version: New version → Deploy**. This keeps the same URL; a *new* deployment gets a new URL. The site checks the same
rules in `assets/js/feedback-form.js`, so keep the rating and length limits in both files in sync.

Until `endpoint` is set, or when a response can't be sent (for example, if a sponsor's company network blocks Google),
the form offers to open the answers as an email draft to `feedback.contact` or to copy them.

## Previewing a date
Add `?today=YYYY-MM-DD` to any URL (e.g. `index.html?today=2027-02-12`) to see progress as of that date.

## Tests
```
node --test tests/*.test.js
```

`templates/` contains the three original design samples (A, B, C) for reference.
