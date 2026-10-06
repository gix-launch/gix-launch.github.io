const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../assets/js/project-filter.js");

const TRACKS = ["Connected devices", "Robotics", "Mixed track"];
const PROJECTS = [
  { id: "a", sponsor: "T-Mobile", track: "Connected devices" },
  { id: "b", sponsor: "Student-led", studentLed: true, track: "Robotics" },
  { id: "c", sponsor: "UW Medicine", track: "Connected devices" },
  { id: "d", sponsor: "T-Mobile", track: "Robotics" },
  { id: "e", sponsor: "Redesign Collective + Fabmatch", track: "Connected devices" },
];
const OPTIONS = F.filterOptions(PROJECTS, TRACKS);
const NONE = { track: null, sponsor: null };

test("slugify makes URL-safe keys", () => {
  assert.equal(F.slugify("Connected devices"), "connected-devices");
  assert.equal(F.slugify("Redesign Collective + Fabmatch"), "redesign-collective-fabmatch");
  assert.equal(F.slugify("T-Mobile"), "t-mobile");
});

test("filterOptions lists tracks in display order and sponsors with student-led last", () => {
  assert.deepEqual(OPTIONS.track, ["Connected devices", "Robotics"]);
  assert.deepEqual(OPTIONS.sponsor, ["T-Mobile", "UW Medicine", "Redesign Collective + Fabmatch", "Student-led"]);
});

test("sponsorOf groups student-led projects under one label", () => {
  assert.equal(F.sponsorOf({ sponsor: "Anything", studentLed: true }), "Student-led");
  assert.equal(F.sponsorOf({ sponsor: "NVIDIA" }), "NVIDIA");
});

test("matchesFilters combines track and sponsor; null means any", () => {
  assert.equal(F.matchesFilters(PROJECTS[0], NONE), true);
  assert.equal(F.matchesFilters(PROJECTS[0], { track: "Robotics", sponsor: null }), false);
  assert.equal(F.matchesFilters(PROJECTS[3], { track: "Robotics", sponsor: "T-Mobile" }), true);
  assert.equal(F.matchesFilters(PROJECTS[1], { track: null, sponsor: "Student-led" }), true);
});

test("optionCounts counts each value while keeping the other filter", () => {
  const counts = F.optionCounts(PROJECTS, { track: "Robotics", sponsor: null }, "sponsor", OPTIONS.sponsor);
  assert.deepEqual(Object.fromEntries(counts), {
    "T-Mobile": 1, "UW Medicine": 0, "Redesign Collective + Fabmatch": 0, "Student-led": 1,
  });
  const trackCounts = F.optionCounts(PROJECTS, { track: "Robotics", sponsor: "T-Mobile" }, "track", OPTIONS.track);
  assert.deepEqual(Object.fromEntries(trackCounts), { "Connected devices": 1, Robotics: 1 });
});

test("parseFilters reads known slugs and ignores unknown or missing values", () => {
  assert.deepEqual(F.parseFilters("?track=robotics&sponsor=t-mobile", OPTIONS), { track: "Robotics", sponsor: "T-Mobile" });
  assert.deepEqual(F.parseFilters("?track=space&sponsor=<script>", OPTIONS), NONE);
  assert.deepEqual(F.parseFilters("", OPTIONS), NONE);
});

test("filtersToSearch round-trips through parseFilters", () => {
  const filters = { track: "Connected devices", sponsor: "Redesign Collective + Fabmatch" };
  const search = F.filtersToSearch(filters);
  assert.equal(search, "?track=connected-devices&sponsor=redesign-collective-fabmatch");
  assert.deepEqual(F.parseFilters(search, OPTIONS), filters);
  assert.equal(F.filtersToSearch(NONE), "");
});

test("helpers do not mutate their inputs", () => {
  const snapshot = JSON.stringify(PROJECTS);
  F.filterOptions(PROJECTS, TRACKS);
  F.optionCounts(PROJECTS, NONE, "track", OPTIONS.track);
  assert.equal(JSON.stringify(PROJECTS), snapshot);
});
