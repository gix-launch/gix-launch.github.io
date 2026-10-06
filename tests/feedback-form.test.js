const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../assets/js/feedback-form.js");

const PROJECTS = [
  { id: "tm-pets", sponsor: "T-Mobile", title: "Smart pet recovery station" },
  { id: "uwm-derm", sponsor: "UW Medicine", title: "Dermatology triage" },
  { id: "student-drone", sponsor: "Student-led", studentLed: true, title: "Perching drone" },
  { id: "tm-know", sponsor: "T-Mobile", title: "Knowledge capture" },
];
const IDS = PROJECTS.map((p) => p.id);
const VALID = Object.freeze({
  project: "tm-pets", name: " Grace Sung ", organization: " T-Mobile ", rating: "4",
  comments: "  Great progress.  ", questions: "", website: "",
});

test("parseRating accepts whole numbers from 1 to 5 only", () => {
  assert.equal(F.parseRating("1"), 1);
  assert.equal(F.parseRating(5), 5);
  for (const bad of ["0", "6", "3.5", "", null, undefined, "abc"]) assert.equal(F.parseRating(bad), null, String(bad));
});

test("needsFollowUp is true below 3 stars or when the sponsor asks to discuss", () => {
  assert.equal(F.needsFollowUp({ rating: 2, discuss: false }), true);
  assert.equal(F.needsFollowUp({ rating: 3, discuss: false }), false);
  assert.equal(F.needsFollowUp({ rating: 5, discuss: true }), true);
});

test("validateFeedback accepts a complete response", () => {
  assert.deepEqual(F.validateFeedback(VALID, IDS), {});
});

test("validateFeedback requires project, name, organization, and rating", () => {
  const errors = F.validateFeedback({ project: "", name: " ", organization: "", rating: "" }, IDS);
  assert.deepEqual(Object.keys(errors).sort(), ["name", "organization", "project", "rating"]);
});

test("validateFeedback rejects unknown projects and out-of-range ratings", () => {
  const errors = F.validateFeedback({ ...VALID, project: "nope", rating: "7" }, IDS);
  assert.ok(errors.project);
  assert.ok(errors.rating);
});

test("validateFeedback limits the length of each answer", () => {
  const long = (n) => "x".repeat(n + 1);
  const errors = F.validateFeedback({
    ...VALID, name: long(F.LIMITS.name), organization: long(F.LIMITS.organization),
    comments: long(F.LIMITS.comments), questions: long(F.LIMITS.questions),
  }, IDS);
  assert.deepEqual(Object.keys(errors).sort(), ["comments", "name", "organization", "questions"]);
});

test("buildSubmission trims answers and records the project", () => {
  const sub = F.buildSubmission({ ...VALID, discuss: "on" }, PROJECTS[0]);
  assert.deepEqual(sub, {
    projectId: "tm-pets", projectTitle: "Smart pet recovery station", sponsor: "T-Mobile",
    name: "Grace Sung", organization: "T-Mobile", rating: 4, discuss: true,
    comments: "Great progress.", questions: "", website: "",
  });
  assert.ok(Object.isFrozen(sub));
});

test("buildSubmission labels student-led projects and treats a missing checkbox as no", () => {
  const sub = F.buildSubmission({ ...VALID, project: "student-drone" }, PROJECTS[2]);
  assert.equal(sub.sponsor, "Student-led");
  assert.equal(sub.discuss, false);
});

test("buildSubmission does not mutate its inputs", () => {
  const values = { ...VALID };
  const snapshot = JSON.stringify([values, PROJECTS[0]]);
  F.buildSubmission(values, PROJECTS[0]);
  assert.equal(JSON.stringify([values, PROJECTS[0]]), snapshot);
});

test("projectOptions groups projects by sponsor in data order with student-led last", () => {
  assert.deepEqual(F.projectOptions(PROJECTS), [
    { label: "T-Mobile", projects: [{ id: "tm-pets", title: "Smart pet recovery station" }, { id: "tm-know", title: "Knowledge capture" }] },
    { label: "UW Medicine", projects: [{ id: "uwm-derm", title: "Dermatology triage" }] },
    { label: "Student-led", projects: [{ id: "student-drone", title: "Perching drone" }] },
  ]);
});

test("feedbackEmail includes every answer and flags follow-up", () => {
  const sub = F.buildSubmission({ ...VALID, rating: "2", questions: "When is the final demo?" }, PROJECTS[0]);
  const { subject, body } = F.feedbackEmail(sub, "Launch Studio");
  assert.match(subject, /^\[Launch Studio\] Sponsor feedback: Smart pet recovery station \(2\/5\)/);
  for (const text of ["Grace Sung", "T-Mobile", "2 of 5 stars", "Follow-up requested: Yes", "Great progress.", "When is the final demo?"]) {
    assert.ok(body.includes(text), text);
  }
});

test("feedbackEmail marks empty optional answers", () => {
  const { body } = F.feedbackEmail(F.buildSubmission({ ...VALID, comments: "" }, PROJECTS[0]), "Launch Studio");
  assert.match(body, /Follow-up requested: No/);
  assert.match(body, /Additional information:\n\(none\)/);
});
