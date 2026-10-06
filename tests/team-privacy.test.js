// Students who opted out of UW directory release must not have their name, initials, or photo on the site.
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

test("teamMember lists a plain name with no photo", () => {
  assert.deepEqual(U.teamMember("Ada Lovelace"),
    { name: "Ada Lovelace", initials: "AL", photo: null, role: null, optedOut: false });
});

test("teamMember keeps a photo and role when given", () => {
  assert.deepEqual(U.teamMember({ name: "Ada Lovelace", photo: "a.jpg", role: "Lead" }),
    { name: "Ada Lovelace", initials: "AL", photo: "a.jpg", role: "Lead", optedOut: false });
});

test("teamMember shows an opted-out student as an anonymous team member", () => {
  assert.deepEqual(U.teamMember({ optedOut: true }),
    { name: U.OPTED_OUT_LABEL, initials: "", photo: null, role: null, optedOut: true });
});

test("teamMember drops any name, photo, or role left on an opted-out entry", () => {
  const m = U.teamMember({ optedOut: true, name: "Ada Lovelace", photo: "a.jpg", role: "Lead" });
  assert.equal(m.name, U.OPTED_OUT_LABEL);
  assert.equal(m.initials, "");
  assert.equal(m.photo, null);
  assert.equal(m.role, null);
});

test("teamMember does not mutate its input", () => {
  const input = Object.freeze({ name: "Ada Lovelace", photo: "a.jpg" });
  U.teamMember(input);
  assert.deepEqual(input, { name: "Ada Lovelace", photo: "a.jpg" });
});

test("every student in data.js is a name, a { name, photo } entry, or a bare opt-out marker", () => {
  const { projects } = loadSiteData();
  for (const p of projects) {
    assert.ok(p.students.length > 0, `${p.id} has no students`);
    for (const s of p.students) {
      if (typeof s === "string") {
        assert.ok(s.trim(), `${p.id} has an empty student name`);
      } else if (s.optedOut) {
        // The marker must carry nothing that could identify the student.
        assert.deepEqual(Object.keys(s), ["optedOut"], `${p.id} opt-out entry holds extra fields`);
      } else {
        assert.ok(s.name && s.name.trim(), `${p.id} has a student entry without a name`);
      }
    }
  }
});

test("data.js marks four students as opted out of directory release", () => {
  // Array.from: data.js runs in a separate VM realm, whose arrays fail strict deepEqual against local ones.
  const optedOut = Array.from(loadSiteData().projects.flatMap((p) => p.students.filter((s) => s.optedOut).map(() => p.id)));
  assert.deepEqual(optedOut.sort(), [
    "msr-accessible-robotics", "msr-cognitive-support", "redesign-textile-intake", "student-home-helper",
  ]);
});

test("teamNames lists named students only, skipping opt-outs", () => {
  const names = U.teamNames(["Ada Lovelace", { optedOut: true }, { name: "Grace Hopper", photo: "g.jpg" }]);
  assert.deepEqual(names, ["Ada Lovelace", "Grace Hopper"]);
  assert.deepEqual(U.teamNames([{ optedOut: true }]), []);
});

test("every student photo in data.js points to an existing web-sized image", () => {
  const { projects } = loadSiteData();
  for (const p of projects) {
    for (const s of p.students) {
      if (typeof s !== "object" || !s.photo) continue;
      assert.match(s.photo, /^assets\/img\/students\/[a-z0-9-]+\.jpg$/, `${p.id}: ${s.name} photo is not a prepared headshot`);
      assert.ok(fs.existsSync(path.join(__dirname, "..", s.photo)), `${p.id}: missing ${s.photo}`);
    }
  }
});
