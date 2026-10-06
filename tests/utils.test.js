const test = require("node:test");
const assert = require("node:assert/strict");
const U = require("../assets/js/utils.js");

const QUARTERS = [
  { id: "autumn", label: "Autumn", start: "2026-09-28", weeks: 11 },
  { id: "winter", label: "Winter", start: "2027-01-04", weeks: 11 },
];
const WEEKS = U.buildWeeks(QUARTERS);

test("addDays crosses month and year boundaries", () => {
  assert.equal(U.addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(U.addDays("2026-10-01", -1), "2026-09-30");
});

test("buildWeeks creates Monday–Sunday weeks with stable ids", () => {
  assert.equal(WEEKS.length, 22);
  assert.deepEqual(
    { id: WEEKS[0].id, n: WEEKS[0].n, start: WEEKS[0].start, end: WEEKS[0].end, quarter: WEEKS[0].quarter },
    { id: "autumn-1", n: 1, start: "2026-09-28", end: "2026-10-04", quarter: "autumn" },
  );
  assert.equal(WEEKS[11].id, "winter-1");
  assert.equal(WEEKS[10].end, "2026-12-13");
});

test("buildWeeks does not mutate its input", () => {
  const input = [{ id: "q", label: "Q", start: "2026-01-05", weeks: 1 }];
  const snapshot = JSON.stringify(input);
  U.buildWeeks(input);
  assert.equal(JSON.stringify(input), snapshot);
});

test("findWeek returns the week containing a date, or null in a break", () => {
  assert.equal(U.findWeek(WEEKS, "2026-10-06").id, "autumn-2");
  assert.equal(U.findWeek(WEEKS, "2026-10-04").id, "autumn-1");
  assert.equal(U.findWeek(WEEKS, "2026-12-25"), null);
});

test("currentWeek falls back to the next week during breaks and the last week after the end", () => {
  assert.equal(U.currentWeek(WEEKS, "2026-11-04").id, "autumn-6");
  assert.equal(U.currentWeek(WEEKS, "2026-12-25").id, "winter-1");
  assert.equal(U.currentWeek(WEEKS, "2026-01-01").id, "autumn-1");
  assert.equal(U.currentWeek(WEEKS, "2030-01-01").id, "winter-11");
});

test("inWeek filters items by a date field", () => {
  const items = [{ d: "2026-10-05" }, { d: "2026-10-12" }, { d: "2026-10-11" }];
  assert.deepEqual(U.inWeek(items, WEEKS[1], "d"), [{ d: "2026-10-05" }, { d: "2026-10-11" }]);
});

test("milestoneProgress counts completed milestones and finds the next one", () => {
  const ms = [{ date: "2026-10-01" }, { date: "2026-10-10" }, { date: "2026-11-01" }];
  assert.deepEqual(U.milestoneProgress(ms, "2026-10-10"), { done: 1, total: 3, nextIndex: 1 });
  assert.deepEqual(U.milestoneProgress(ms, "2027-01-01"), { done: 3, total: 3, nextIndex: -1 });
});

test("timeElapsed is clamped between 0 and 1", () => {
  assert.equal(U.timeElapsed(WEEKS, "2020-01-01"), 0);
  assert.equal(U.timeElapsed(WEEKS, "2030-01-01"), 1);
  const mid = U.timeElapsed(WEEKS, "2026-11-15");
  assert.ok(mid > 0 && mid < 1);
});

test("daysBetween counts whole days", () => {
  assert.equal(U.daysBetween("2026-10-01", "2026-10-06"), 5);
  assert.equal(U.daysBetween("2026-10-06", "2026-10-01"), -5);
});

test("esc escapes HTML special characters", () => {
  assert.equal(U.esc(`<a href="x">&'</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  assert.equal(U.esc(null), "");
});

test("initials uses the first and last name", () => {
  assert.equal(U.initials("Maya Chen"), "MC");
  assert.equal(U.initials("Mateo Gómez Ruiz"), "MR");
  assert.equal(U.initials("Cher"), "C");
});

test("isValidISODate rejects malformed and impossible dates", () => {
  assert.equal(U.isValidISODate("2026-10-01"), true);
  assert.equal(U.isValidISODate("2026-02-30"), false);
  assert.equal(U.isValidISODate("10/01/2026"), false);
  assert.equal(U.isValidISODate(undefined), false);
});

test("validateContact reports each missing or invalid field", () => {
  assert.deepEqual(U.validateContact({ name: "A", email: "a@uw.edu", recipient: "x", message: "Hello there" }), {});
  const errs = U.validateContact({ name: " ", email: "nope", recipient: "", message: "hi" });
  assert.deepEqual(Object.keys(errs).sort(), ["email", "message", "name", "recipient"]);
});

const CONTACTS = {
  people: {
    ann: { name: "Ann Lee", title: "Instructor", email: "ann@uw.edu" },
    bo: { name: "Bo Kim", title: null, email: null },
  },
  groups: [
    { label: "Course", text: "For course questions, contact", people: ["ann"] },
    { label: "Teams", text: "For team questions, contact", people: ["bo"] },
  ],
};

test("contactGroups resolves each group's people by key", () => {
  const groups = U.contactGroups(CONTACTS);
  assert.deepEqual(groups.map((g) => g.people.map((p) => p.name)), [["Ann Lee"], ["Bo Kim"]]);
  assert.equal(groups[0].label, "Course");
  assert.equal(groups[0].people[0].key, "ann");
});

test("contactGroups rejects a group that names an unknown person", () => {
  const bad = { ...CONTACTS, groups: [{ label: "X", text: "", people: ["zed"] }] };
  assert.throws(() => U.contactGroups(bad), /Unknown contact "zed"/);
});

test("contactRecipients lists only people with an email, tagged with their group", () => {
  assert.deepEqual(U.contactRecipients(U.contactGroups(CONTACTS)), [
    { group: "Course", name: "Ann Lee", email: "ann@uw.edu" },
  ]);
});

test("splitPhrases splits rubric text on semicolons and newlines", () => {
  assert.deepEqual(U.splitPhrases("Clear map; Owners labeled\nRisks named;  "), ["Clear map", "Owners labeled", "Risks named"]);
  assert.deepEqual(U.splitPhrases(""), []);
  assert.deepEqual(U.splitPhrases(null), []);
});

test("weekTitle prefers a due item's title and falls back to a default", () => {
  const items = [{ title: "Gate 1: The Problem", type: "gate" }, { title: "Mid-term", type: "presentation" }];
  assert.equal(U.weekTitle(items, "Project work"), "Gate 1: The Problem");
  assert.equal(U.weekTitle([], "Project work"), "Project work");
});

test("countdown splits the time left into days, hours, minutes, and seconds", () => {
  const to = new Date("2027-03-17T00:00:00").getTime();
  const from = to - (3 * 864e5 + 4 * 36e5 + 5 * 6e4 + 6 * 1e3);
  assert.deepEqual(U.countdown(from, to), { days: 3, hours: 4, minutes: 5, seconds: 6, done: false });
});

test("countdown is done at and after the target time", () => {
  const to = new Date("2027-03-17T00:00:00").getTime();
  assert.deepEqual(U.countdown(to, to), { days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
  assert.deepEqual(U.countdown(to + 5000, to), { days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
});

test("nextDate finds the earliest date on or after today", () => {
  const items = [{ due: "2026-10-15" }, { due: "2026-10-22" }, { due: "2026-10-22" }];
  assert.equal(U.nextDate(items, "due", "2026-10-16"), "2026-10-22");
  assert.equal(U.nextDate(items, "due", "2026-10-15"), "2026-10-15");
  assert.equal(U.nextDate(items, "due", "2027-01-01"), null);
});

test("dateStatus marks past dates done and every item on the next date as next", () => {
  assert.equal(U.dateStatus("2026-10-15", "2026-10-16", "2026-10-22"), "done");
  assert.equal(U.dateStatus("2026-10-22", "2026-10-16", "2026-10-22"), "next");
  assert.equal(U.dateStatus("2026-10-29", "2026-10-16", "2026-10-22"), "upcoming");
});

test("timelineFraction maps dates onto instructional weeks, skipping breaks", () => {
  assert.equal(U.timelineFraction(WEEKS, "2026-09-28"), 0);
  assert.equal(U.timelineFraction(WEEKS, "2027-01-04"), 0.5);
  assert.equal(U.timelineFraction(WEEKS, "2026-12-25"), 0.5);
  assert.equal(U.timelineFraction(WEEKS, "2020-01-01"), 0);
  assert.equal(U.timelineFraction(WEEKS, "2030-01-01"), 1);
  assert.equal(U.timelineFraction(WEEKS, "2026-10-05"), 7 / 154);
});
