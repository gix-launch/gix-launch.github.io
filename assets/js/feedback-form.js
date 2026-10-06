// Pure helpers for the sponsor feedback form on feedback.html: validation, the payload sent to the
// Google Apps Script receiver (apps-script/feedback.gs), and the email-draft fallback.
// The Apps Script repeats these checks, so keep RATING_MAX, FOLLOW_UP_BELOW, and LIMITS in sync with it.
(function (root) {
  const RATING_MAX = 5;
  const FOLLOW_UP_BELOW = 3;
  const STUDENT_LED = "Student-led";
  const LIMITS = Object.freeze({ name: 120, organization: 160, comments: 5000, questions: 2000 });

  const clean = (s) => (s == null ? "" : String(s).trim());
  const sponsorOf = (p) => (p.studentLed ? STUDENT_LED : p.sponsor);

  function parseRating(value) {
    const s = clean(value);
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return n >= 1 && n <= RATING_MAX ? n : null;
  }

  const needsFollowUp = ({ rating, discuss }) => rating < FOLLOW_UP_BELOW || Boolean(discuss);

  function validateFeedback(values, projectIds) {
    const errors = {};
    if (!projectIds.includes(values.project)) errors.project = "Please choose your project.";
    if (!clean(values.name)) errors.name = "Please enter your name.";
    if (!clean(values.organization)) errors.organization = "Please enter your company or organization.";
    if (parseRating(values.rating) === null) errors.rating = `Please choose a rating from 1 to ${RATING_MAX} stars.`;
    Object.entries(LIMITS).forEach(([field, max]) => {
      if (!errors[field] && clean(values[field]).length > max) errors[field] = `Please keep this under ${max} characters.`;
    });
    return errors;
  }

  // `values` come from the form (FormData entries); the checkbox is "on" when checked and missing otherwise.
  function buildSubmission(values, project) {
    return Object.freeze({
      projectId: project.id,
      projectTitle: project.title,
      sponsor: sponsorOf(project),
      name: clean(values.name),
      organization: clean(values.organization),
      rating: parseRating(values.rating),
      discuss: values.discuss === "on" || values.discuss === true,
      comments: clean(values.comments),
      questions: clean(values.questions),
      website: clean(values.website), // honeypot: real visitors never see or fill this field
    });
  }

  // Project picker: grouped by sponsor in data order, with student-led projects last.
  function projectOptions(projects) {
    const labels = [...new Set(projects.map(sponsorOf))];
    const ordered = [...labels.filter((l) => l !== STUDENT_LED), ...labels.filter((l) => l === STUDENT_LED)];
    return ordered.map((label) => ({
      label,
      projects: projects.filter((p) => sponsorOf(p) === label).map((p) => ({ id: p.id, title: p.title })),
    }));
  }

  // Plain-text version of a submission, for the email draft when the form can't be sent.
  function feedbackEmail(sub, siteName) {
    const orNone = (s) => s || "(none)";
    const subject = `[${siteName}] Sponsor feedback: ${sub.projectTitle} (${sub.rating}/${RATING_MAX})`;
    const body = [
      `Project: ${sub.projectTitle} (${sub.sponsor})`,
      `Name: ${sub.name}`,
      `Company/Organization: ${sub.organization}`,
      `Rating: ${sub.rating} of ${RATING_MAX} stars`,
      `Follow-up requested: ${needsFollowUp(sub) ? "Yes" : "No"}`,
      "",
      `Additional information:\n${orNone(sub.comments)}`,
      "",
      `Questions:\n${orNone(sub.questions)}`,
    ].join("\n");
    return { subject, body };
  }

  const api = Object.freeze({
    RATING_MAX, FOLLOW_UP_BELOW, LIMITS,
    parseRating, needsFollowUp, validateFeedback, buildSubmission, projectOptions, feedbackEmail,
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.FeedbackForm = api;
})(typeof window !== "undefined" ? window : globalThis);
