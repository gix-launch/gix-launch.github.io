// Calendar export helpers (demo day "Add to calendar"): a pure .ics builder and a Google Calendar link.
const test = require("node:test");
const assert = require("node:assert/strict");
const U = require("../assets/js/utils.js");

const EVENT = Object.freeze({
  uid: "demo-day-2027@launch-studio",
  title: "Launch Studio final demo & handoff",
  date: "2027-03-17",
  description: "Final review; posters, demos\nBring colleagues.",
  location: "GIX, Bellevue, WA",
  url: "https://example.org/demo.html",
});

test("icsEvent builds an all-day VCALENDAR with CRLF line endings", () => {
  const ics = U.icsEvent(EVENT);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /\r\nVERSION:2\.0\r\n/);
  assert.match(ics, /\r\nUID:demo-day-2027@launch-studio\r\n/);
  assert.match(ics, /\r\nDTSTART;VALUE=DATE:20270317\r\n/);
  // All-day events end on the following day (exclusive end), per RFC 5545.
  assert.match(ics, /\r\nDTEND;VALUE=DATE:20270318\r\n/);
  assert.match(ics, /\r\nSUMMARY:Launch Studio final demo & handoff\r\n/);
  assert.match(ics, /\r\nURL:https:\/\/example\.org\/demo\.html\r\n/);
  assert.match(ics, /\r\nDTSTAMP:\d{8}T\d{6}Z\r\n/);
  assert.ok(!ics.includes("\n\n"), "no bare LF line endings");
});

test("icsEvent escapes commas, semicolons, and newlines in text fields", () => {
  const ics = U.icsEvent(EVENT);
  assert.match(ics, /DESCRIPTION:Final review\; posters\\, demos\\nBring colleagues\./);
  assert.match(ics, /LOCATION:GIX\\, Bellevue\\, WA/);
});

test("icsEvent uses times when start and end are given", () => {
  const ics = U.icsEvent({ ...EVENT, start: "13:00", end: "16:30" });
  assert.match(ics, /\r\nDTSTART:20270317T130000\r\n/);
  assert.match(ics, /\r\nDTEND:20270317T163000\r\n/);
  assert.ok(!ics.includes("VALUE=DATE"));
});

test("icsEvent folds lines longer than 75 octets", () => {
  const long = "x".repeat(200);
  const ics = U.icsEvent({ ...EVENT, description: long });
  const lines = ics.split("\r\n");
  assert.ok(lines.every((l) => Buffer.byteLength(l, "utf8") <= 75), "every line fits in 75 octets");
  const unfolded = ics.replace(/\r\n[ \t]/g, "");
  assert.ok(unfolded.includes(`DESCRIPTION:${long}`));
});

test("icsEvent leaves out empty optional fields and rejects a bad date", () => {
  const ics = U.icsEvent({ uid: "u", title: "T", date: "2027-03-17" });
  assert.ok(!ics.includes("LOCATION"));
  assert.ok(!ics.includes("DESCRIPTION"));
  assert.ok(!ics.includes("URL:"));
  assert.throws(() => U.icsEvent({ uid: "u", title: "T", date: "2027-3-17" }), /date/i);
});

test("googleCalendarUrl builds an all-day or timed template link", () => {
  const allDay = new URL(U.googleCalendarUrl(EVENT));
  assert.equal(allDay.origin + allDay.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(allDay.searchParams.get("action"), "TEMPLATE");
  assert.equal(allDay.searchParams.get("text"), EVENT.title);
  assert.equal(allDay.searchParams.get("dates"), "20270317/20270318");
  assert.equal(allDay.searchParams.get("location"), EVENT.location);
  assert.ok(allDay.searchParams.get("details").includes(EVENT.url));

  const timed = new URL(U.googleCalendarUrl({ ...EVENT, start: "13:00", end: "16:30" }));
  assert.equal(timed.searchParams.get("dates"), "20270317T130000/20270317T163000");
});
