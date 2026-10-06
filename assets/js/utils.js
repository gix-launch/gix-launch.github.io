// Pure helpers shared by every page. Dates are ISO strings ("YYYY-MM-DD") in local time.
(function (root) {
  const DAY_MS = 864e5;
  const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MIN_MESSAGE_LENGTH = 10;

  const parse = (iso) => new Date(iso + "T12:00:00");
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function isValidISODate(s) {
    if (typeof s !== "string" || !ISO_RE.test(s)) return false;
    return toISO(parse(s)) === s;
  }

  function addDays(iso, n) {
    const d = parse(iso);
    return toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12));
  }

  const daysBetween = (fromISO, toISOStr) => Math.round((parse(toISOStr) - parse(fromISO)) / DAY_MS);

  function buildWeeks(quarters) {
    return quarters.flatMap((q) =>
      Array.from({ length: q.weeks }, (_, i) => {
        const start = addDays(q.start, i * 7);
        return Object.freeze({
          id: `${q.id}-${i + 1}`,
          quarter: q.id,
          quarterLabel: q.label,
          n: i + 1,
          start,
          end: addDays(start, 6),
        });
      }),
    );
  }

  const findWeek = (weeks, iso) => weeks.find((w) => w.start <= iso && iso <= w.end) || null;

  function currentWeek(weeks, iso) {
    return findWeek(weeks, iso) || weeks.find((w) => w.start > iso) || weeks[weeks.length - 1];
  }

  const inWeek = (items, week, key) => items.filter((it) => week.start <= it[key] && it[key] <= week.end);

  function milestoneProgress(milestones, iso) {
    const nextIndex = milestones.findIndex((m) => m.date >= iso);
    const done = nextIndex === -1 ? milestones.length : nextIndex;
    return { done, total: milestones.length, nextIndex };
  }

  function timeElapsed(weeks, iso) {
    const span = daysBetween(weeks[0].start, weeks[weeks.length - 1].end);
    const ratio = daysBetween(weeks[0].start, iso) / span;
    return Math.min(1, Math.max(0, ratio));
  }

  // Earliest date (by `key`) on or after `iso`, or null if everything is in the past.
  function nextDate(items, key, iso) {
    return items.map((it) => it[key]).filter((d) => d >= iso).sort()[0] || null;
  }

  // "done" before today, "next" for everything on the next upcoming date, "upcoming" after that.
  function dateStatus(date, iso, next) {
    if (date < iso) return "done";
    return date === next ? "next" : "upcoming";
  }

  // Position of a date (0–1) on a timeline made of the instructional weeks only; breaks take no space.
  function timelineFraction(weeks, iso) {
    const total = weeks.length * 7;
    const i = weeks.findIndex((w) => iso <= w.end);
    if (i === -1) return 1;
    const offset = Math.max(0, daysBetween(weeks[i].start, iso));
    return (i * 7 + offset) / total;
  }

  const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => (s == null ? "" : String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]));

  function initials(name) {
    const parts = String(name).trim().split(/\s+/);
    const first = parts[0] ? parts[0][0] : "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  // Students who opted out of UW directory release are listed as { optedOut: true }: no name, initials, or photo.
  const OPTED_OUT_LABEL = "Team member";

  // A student entry is a name, { name, photo, role }, or { optedOut: true }.
  function teamMember(entry) {
    if (entry && entry.optedOut) return { name: OPTED_OUT_LABEL, initials: "", photo: null, role: null, optedOut: true };
    const { name, photo = null, role = null } = typeof entry === "string" ? { name: entry } : entry;
    return { name, initials: initials(name), photo, role, optedOut: false };
  }

  // Named students on a team, in order. Opted-out students are left out entirely (no name to show).
  const teamNames = (students) => students.map(teamMember).filter((m) => !m.optedOut).map((m) => m.name);

  // ---- Calendar export (RFC 5545) ----
  const ICS_LINE_OCTETS = 75;
  const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const compactDate = (iso) => iso.replace(/-/g, "");
  const compactTime = (hhmm) => `${hhmm.replace(":", "")}00`;

  // Long lines continue on the next line after a single space. Folds between whole characters so
  // multi-byte text is never split, and keeps every line within 75 octets.
  const utf8Length = (ch) => new TextEncoder().encode(ch).length;
  function icsFold(line) {
    const out = [];
    let current = "";
    let bytes = 0;
    for (const ch of line) {
      const size = utf8Length(ch);
      const limit = out.length === 0 ? ICS_LINE_OCTETS : ICS_LINE_OCTETS - 1;
      if (bytes + size > limit) { out.push(current); current = ""; bytes = 0; }
      current += ch;
      bytes += size;
    }
    out.push(current);
    return out.map((l, i) => (i === 0 ? l : " " + l)).join("\r\n");
  }

  // Floating local times (no TZID): the event lands at the same wall-clock time wherever it is opened.
  function icsDates(ev) {
    if (ev.start && ev.end) {
      return [`DTSTART:${compactDate(ev.date)}T${compactTime(ev.start)}`, `DTEND:${compactDate(ev.date)}T${compactTime(ev.end)}`];
    }
    return [`DTSTART;VALUE=DATE:${compactDate(ev.date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(ev.date, 1))}`];
  }

  // One-event calendar file. `ev` = { uid, title, date, start?, end?, description?, location?, url? }.
  // Without start/end it is an all-day event. Returns the file contents as a string.
  function icsEvent(ev) {
    if (!isValidISODate(ev.date)) throw new Error(`icsEvent: invalid date "${ev.date}"`);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Launch Studio//Sponsor site//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${ev.uid}`, `DTSTAMP:${stamp}`, ...icsDates(ev),
      `SUMMARY:${icsText(ev.title)}`,
      ev.description ? `DESCRIPTION:${icsText(ev.description)}` : null,
      ev.location ? `LOCATION:${icsText(ev.location)}` : null,
      ev.url ? `URL:${ev.url}` : null,
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean);
    return lines.map(icsFold).join("\r\n") + "\r\n";
  }

  // "Add to Google Calendar" link for the same event.
  function googleCalendarUrl(ev) {
    const dates = ev.start && ev.end
      ? `${compactDate(ev.date)}T${compactTime(ev.start)}/${compactDate(ev.date)}T${compactTime(ev.end)}`
      : `${compactDate(ev.date)}/${compactDate(addDays(ev.date, 1))}`;
    const details = [ev.description, ev.url].filter(Boolean).join("\n\n");
    const params = new URLSearchParams({ action: "TEMPLATE", text: ev.title, dates });
    if (details) params.set("details", details);
    if (ev.location) params.set("location", ev.location);
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  function validateContact({ name, email, recipient, message }) {
    const errors = {};
    if (!name || !name.trim()) errors.name = "Please enter your name.";
    if (!email || !EMAIL_RE.test(email.trim())) errors.email = "Please enter a valid email address.";
    if (!recipient) errors.recipient = "Please choose who to contact.";
    if (!message || message.trim().length < MIN_MESSAGE_LENGTH) {
      errors.message = `Please write at least ${MIN_MESSAGE_LENGTH} characters.`;
    }
    return errors;
  }

  // Contact page: each group lists people by key into `contacts.people`.
  function contactGroups({ people, groups }) {
    return groups.map((g) => ({
      ...g,
      people: g.people.map((key) => {
        if (!people[key]) throw new Error(`Unknown contact "${key}" in group "${g.label}"`);
        return { ...people[key], key };
      }),
    }));
  }

  // Message-form recipients: everyone with an email, in page order.
  const contactRecipients = (groups) => groups.flatMap((g) =>
    g.people.filter((p) => p.email).map((p) => ({ group: g.label, name: p.name, email: p.email })));

  const splitPhrases = (text) => (text ? String(text).split(/;|\n/).map((p) => p.trim()).filter(Boolean) : []);

  // A week is named after the first gate or presentation due in it.
  const weekTitle = (dueItems, fallback) => (dueItems.length ? dueItems[0].title : fallback);

  // Today's date, overridable with ?today=YYYY-MM-DD to preview the site at any point in the year.
  function todayISO() {
    const override = root.location ? new URLSearchParams(root.location.search).get("today") : null;
    return isValidISODate(override) ? override : toISO(new Date());
  }

  // Time left from one timestamp (ms) to another, split for display. Never negative.
  function countdown(fromMs, toMs) {
    const left = Math.max(0, Math.floor((toMs - fromMs) / 1000));
    return {
      days: Math.floor(left / 86400),
      hours: Math.floor((left % 86400) / 3600),
      minutes: Math.floor((left % 3600) / 60),
      seconds: left % 60,
      done: left === 0,
    };
  }

  function fmtDate(iso, opts) {
    return parse(iso).toLocaleDateString("en-US", opts || { month: "short", day: "numeric", year: "numeric" });
  }

  const api = Object.freeze({
    isValidISODate, addDays, daysBetween, buildWeeks, findWeek, currentWeek, inWeek,
    milestoneProgress, timeElapsed, esc, initials, OPTED_OUT_LABEL, teamMember, teamNames, icsEvent, googleCalendarUrl, validateContact, contactGroups, contactRecipients, todayISO, fmtDate,
    splitPhrases, weekTitle, countdown, nextDate, dateStatus, timelineFraction,
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CapUtils = api;
})(typeof window !== "undefined" ? window : globalThis);
