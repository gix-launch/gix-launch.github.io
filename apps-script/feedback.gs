// Sponsor feedback receiver: a Google Apps Script web app that saves each response from feedback.html
// as a row in the Google Sheet this script belongs to, and emails NOTIFY about it.
// Setup: see "Sponsor feedback" in the README. Paste this whole file into the script editor (Code.gs).
// The site checks the same rules in assets/js/feedback-form.js; keep RATING_MAX, FOLLOW_UP_BELOW, and LIMITS in sync.

// ---- Settings ----
const NOTIFY = ["luyaoniu@uw.edu"]; // who is emailed about each response; add more addresses to this list
const SHEET_NAME = "Responses";
const MAX_PER_HOUR = 60; // spam guard: responses accepted per hour across all sponsors

const RATING_MAX = 5;
const FOLLOW_UP_BELOW = 3;
const LIMITS = { name: 120, organization: 160, comments: 5000, questions: 2000, projectTitle: 200, sponsor: 120 };
const PROJECT_ID_RE = /^[a-z0-9-]{1,80}$/;
const HEADERS = ["Submitted", "Project", "Sponsor", "Name", "Organization", "Rating", "Wants to discuss",
  "Follow-up", "Additional information", "Questions", "Project ID"];

// ---- Web app entry points ----
function doGet() {
  return json({ ok: true, message: "Sponsor feedback receiver is running." });
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "null");
    const errors = validateSubmission(data);
    if (errors.length) return json({ ok: false, error: errors.join(" ") });
    if (data.website) return json({ ok: true }); // honeypot filled: a bot, so drop it quietly

    const record = toRecord(data, new Date());
    const saved = withLock(() => {
      if (!takeRateLimitSlot(CacheService.getScriptCache(), MAX_PER_HOUR)) return false;
      responsesSheet().appendRow(toRow(record));
      return true;
    });
    if (!saved) return json({ ok: false, error: "We are receiving too many responses right now. Please try again later or send your feedback by email." });

    notify(record);
    return json({ ok: true, followUp: record.followUp });
  } catch (err) {
    console.error("Sponsor feedback failed", err && err.stack ? err.stack : err);
    return json({ ok: false, error: "We could not save your feedback. Please try again or send it by email." });
  }
}

// ---- Pure helpers (tested in tests/feedback-apps-script.test.js) ----
const text = (s) => (s == null ? "" : String(s).trim());

function validateSubmission(data) {
  if (!data || typeof data !== "object") return ["The response was empty."];
  const errors = [];
  if (!PROJECT_ID_RE.test(text(data.projectId))) errors.push("Unknown project.");
  if (!text(data.name)) errors.push("Name is required.");
  if (!text(data.organization)) errors.push("Company or organization is required.");
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > RATING_MAX) errors.push(`Rating must be 1 to ${RATING_MAX}.`);
  Object.keys(LIMITS).forEach((field) => {
    if (text(data[field]).length > LIMITS[field]) errors.push(`${field} is too long.`);
  });
  return errors;
}

function toRecord(data, submitted) {
  const discuss = data.discuss === true;
  return Object.freeze({
    submitted,
    projectId: text(data.projectId),
    projectTitle: text(data.projectTitle),
    sponsor: text(data.sponsor),
    name: text(data.name),
    organization: text(data.organization),
    rating: data.rating,
    discuss,
    followUp: data.rating < FOLLOW_UP_BELOW || discuss,
    comments: text(data.comments),
    questions: text(data.questions),
  });
}

// Text starting with = + - @ would run as a spreadsheet formula; a leading apostrophe keeps it as text.
const sheetSafe = (s) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);
const yesNo = (b) => (b ? "Yes" : "No");

function toRow(r) {
  const byHeader = {
    "Submitted": r.submitted,
    "Project": sheetSafe(r.projectTitle),
    "Sponsor": sheetSafe(r.sponsor),
    "Name": sheetSafe(r.name),
    "Organization": sheetSafe(r.organization),
    "Rating": r.rating,
    "Wants to discuss": yesNo(r.discuss),
    "Follow-up": yesNo(r.followUp),
    "Additional information": sheetSafe(r.comments),
    "Questions": sheetSafe(r.questions),
    "Project ID": r.projectId,
  };
  return HEADERS.map((h) => byHeader[h]);
}

function notificationEmail(r, sheetUrl) {
  const flag = r.followUp ? "[Follow-up needed] " : "";
  const subject = `${flag}Sponsor feedback: ${r.projectTitle} (${r.rating}/${RATING_MAX})`;
  const body = [
    `${r.name} (${r.organization}) rated ${r.projectTitle} ${r.rating} of ${RATING_MAX} stars.`,
    r.followUp ? "They asked to talk, or rated the team below 3 stars. Please reach out to set up a time." : "",
    "",
    `Additional information:\n${r.comments || "(none)"}`,
    "",
    `Questions:\n${r.questions || "(none)"}`,
    "",
    sheetUrl ? `All responses: ${sheetUrl}` : "",
  ].filter((line, i, all) => line !== "" || all[i - 1] !== "").join("\n");
  return { subject, body };
}

// One counter per clock hour in the script cache. Call inside the script lock so counts don't race.
function takeRateLimitSlot(cache, max) {
  const key = `responses-${Math.floor(Date.now() / 3600000)}`;
  const used = Number(cache.get(key)) || 0;
  if (used >= max) return false;
  cache.put(key, String(used + 1), 3600);
  return true;
}

// ---- Google services ----
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function responsesSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const existing = book.getSheetByName(SHEET_NAME);
  if (existing) return existing;
  const sheet = book.insertSheet(SHEET_NAME);
  sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  return sheet;
}

// The response is already saved, so an email problem is logged rather than reported to the sponsor.
function notify(record) {
  if (!NOTIFY.length) return;
  try {
    const { subject, body } = notificationEmail(record, SpreadsheetApp.getActiveSpreadsheet().getUrl());
    MailApp.sendEmail(NOTIFY.join(","), subject, body);
  } catch (err) {
    console.error("Feedback saved, but the notification email failed", err && err.stack ? err.stack : err);
  }
}

// Lets the Node tests load this file; Apps Script has no `module`, so this line does nothing there.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HEADERS, LIMITS, validateSubmission, toRecord, toRow, sheetSafe, notificationEmail, takeRateLimitSlot };
}
