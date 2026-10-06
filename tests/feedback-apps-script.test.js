const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../apps-script/feedback.gs");

const VALID = Object.freeze({
  projectId: "tm-pets", projectTitle: "Smart pet recovery station", sponsor: "T-Mobile",
  name: "Grace Sung", organization: "T-Mobile", rating: 4, discuss: false,
  comments: "Great progress.", questions: "", website: "",
});
const WHEN = new Date("2026-11-12T18:00:00Z");

const fakeCache = () => {
  const store = new Map();
  return { get: (k) => store.get(k) ?? null, put: (k, v) => store.set(k, v) };
};

test("validateSubmission accepts a complete response", () => {
  assert.deepEqual(S.validateSubmission(VALID), []);
});

test("validateSubmission rejects missing fields, bad ratings, and bad project ids", () => {
  const errors = S.validateSubmission({ ...VALID, name: "", organization: " ", rating: 9, projectId: "<script>" });
  assert.equal(errors.length, 4);
});

test("validateSubmission rejects non-objects and over-long answers", () => {
  assert.equal(S.validateSubmission(null).length, 1);
  assert.equal(S.validateSubmission({ ...VALID, comments: "x".repeat(S.LIMITS.comments + 1) }).length, 1);
});

test("toRecord marks follow-up below 3 stars or when the sponsor asks to discuss", () => {
  assert.equal(S.toRecord(VALID, WHEN).followUp, false);
  assert.equal(S.toRecord({ ...VALID, rating: 2 }, WHEN).followUp, true);
  assert.equal(S.toRecord({ ...VALID, discuss: true }, WHEN).followUp, true);
});

test("toRow follows HEADERS and neutralizes spreadsheet formulas", () => {
  const row = S.toRow(S.toRecord({ ...VALID, name: "=HYPERLINK(\"http://x\")", comments: "+1 great" }, WHEN));
  assert.equal(row.length, S.HEADERS.length);
  const at = (h) => row[S.HEADERS.indexOf(h)];
  assert.equal(at("Submitted"), WHEN);
  assert.equal(at("Name"), "'=HYPERLINK(\"http://x\")");
  assert.equal(at("Additional information"), "'+1 great");
  assert.equal(at("Rating"), 4);
  assert.equal(at("Follow-up"), "No");
});

test("sheetSafe leaves ordinary text alone", () => {
  assert.equal(S.sheetSafe("Going well"), "Going well");
  assert.equal(S.sheetSafe("-2 days late"), "'-2 days late");
  assert.equal(S.sheetSafe("@team"), "'@team");
});

test("notificationEmail flags follow-up in the subject", () => {
  const email = S.notificationEmail(S.toRecord({ ...VALID, rating: 2 }, WHEN), "https://sheet");
  assert.match(email.subject, /^\[Follow-up needed\] Sponsor feedback: Smart pet recovery station \(2\/5\)/);
  assert.ok(email.body.includes("https://sheet"));
  assert.ok(email.body.includes("Grace Sung (T-Mobile)"));
  assert.doesNotMatch(S.notificationEmail(S.toRecord(VALID, WHEN), "").subject, /Follow-up/);
});

test("takeRateLimitSlot allows up to the limit and then refuses", () => {
  const cache = fakeCache();
  for (let i = 0; i < 3; i++) assert.equal(S.takeRateLimitSlot(cache, 3), true);
  assert.equal(S.takeRateLimitSlot(cache, 3), false);
});
