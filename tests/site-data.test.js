// Sanity checks on the hand-edited parts of data.js that the new pages depend on.
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const U = require("../assets/js/utils.js");

function loadSiteData() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../assets/js/data.js"), "utf8"), sandbox);
  return sandbox.window.CAPSTONE;
}
const D = loadSiteData();

test("milestones use one of three sponsor-attendance labels", () => {
  const allowed = ["Optional", "Encouraged", "Required"];
  for (const m of D.milestones) assert.ok(allowed.includes(m.sponsor), `${m.title}: "${m.sponsor}"`);
});

test("exactly one milestone is demo day and it requires sponsors", () => {
  const demo = D.milestones.filter((m) => m.demoDay);
  assert.equal(demo.length, 1);
  assert.equal(demo[0].sponsor, "Required");
});

test("demo day settings have valid times and a non-empty agenda", () => {
  const d = D.demoDay;
  assert.ok(d, "demoDay is set");
  for (const t of [d.start, d.end]) if (t !== null) assert.match(t, /^\d{2}:\d{2}$/);
  assert.ok(Array.isArray(d.agenda) && d.agenda.length > 0);
  for (const item of d.agenda) assert.ok(item.title && item.text, "agenda items have a title and text");
});

test("feedback check-in windows are valid, ordered, and within the quarters", () => {
  const w = D.feedback.windows;
  assert.ok(w.length >= 2);
  const first = D.quarters[0].start;
  const last = U.addDays(D.quarters[D.quarters.length - 1].start, D.quarters[D.quarters.length - 1].weeks * 7 - 1);
  let prev = "";
  for (const win of w) {
    assert.ok(U.isValidISODate(win.opens) && U.isValidISODate(win.closes), `${win.label} dates`);
    assert.ok(win.opens <= win.closes, `${win.label} closes after it opens`);
    assert.ok(win.opens >= first && win.closes <= last, `${win.label} falls inside the program`);
    assert.ok(win.opens > prev, "windows are in order");
    assert.ok(D.quarters.some((q) => q.id === win.quarter), `${win.label} names a quarter`);
    prev = win.opens;
  }
});

test("past cohort outcomes and testimonials have the fields the page renders", () => {
  const { alumni } = D;
  assert.ok(alumni && Array.isArray(alumni.outcomes) && Array.isArray(alumni.testimonials));
  for (const o of alumni.outcomes) assert.ok(o.cohort && o.title && o.text, "outcome has cohort, title, text");
  for (const t of alumni.testimonials) assert.ok(t.quote && t.name, "testimonial has quote and name");
});
