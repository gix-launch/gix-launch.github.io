// Sponsor feedback page. Sends each response to the Google Apps Script web app in `feedback.endpoint`
// (data.js), which saves it to a private Google Sheet. With no endpoint, or when sending fails, the sponsor
// can open the same answers as an email draft to `feedback.contact` or copy them.
// Link a sponsor straight to their team with feedback.html?project=<project id>.
(function () {
  const { D, U } = window.Site;
  const FF = window.FeedbackForm;
  const $ = (id) => document.getElementById(id);
  const FIELDS = ["project", "name", "organization", "rating", "comments", "questions"];
  const SEND_TIMEOUT_MS = 20000;
  const config = D.feedback || {};
  const contact = D.contacts.people[config.contact] || null;
  const form = $("feedback-form");
  const projectById = (id) => D.projects.find((p) => p.id === id) || null;

  $("f-project").innerHTML = `<option value="">Choose your project…</option>` + FF.projectOptions(D.projects).map((g) =>
    `<optgroup label="${U.esc(g.label)}">${g.projects.map((p) => `<option value="${U.esc(p.id)}">${U.esc(p.title)}</option>`).join("")}</optgroup>`).join("");

  $("stars").innerHTML = Array.from({ length: FF.RATING_MAX }, (_, i) => {
    const n = i + 1;
    return `<input type="radio" id="r-${n}" name="rating" value="${n}">` +
      `<label for="r-${n}"><span aria-hidden="true">★</span><span class="sr-only">${n} star${n > 1 ? "s" : ""}</span></label>`;
  }).join("");
  const stars = Array.from(form.querySelectorAll('input[name="rating"]'));

  // Sponsored projects fill in the organization; the sponsor can still change it.
  function fillOrganization(project) {
    if (project && !project.studentLed && !$("f-organization").value.trim()) $("f-organization").value = project.sponsor;
  }

  function renderRating() {
    const rating = FF.parseRating(form.elements.rating.value);
    stars.forEach((input) => input.nextElementSibling.classList.toggle("on", rating !== null && Number(input.value) <= rating));
    $("rating-caption").textContent = rating ? `${rating} of ${FF.RATING_MAX} stars` : "Not rated yet";
    $("followup-low").hidden = !(rating && rating < FF.FOLLOW_UP_BELOW);
    $("followup-ask").hidden = !(rating && rating >= FF.FOLLOW_UP_BELOW);
  }

  // Returns true when there is at least one error, after showing them and focusing the first.
  function showErrors(errors) {
    FIELDS.forEach((f) => {
      $(`e-${f}`).textContent = errors[f] || "";
      $(`f-${f}`).setAttribute("aria-invalid", errors[f] ? "true" : "false");
    });
    const first = FIELDS.find((f) => errors[f]);
    if (first) (first === "rating" ? stars[0] : $(`f-${first}`)).focus();
    return Boolean(first);
  }

  function setBusy(busy) {
    $("submit").disabled = busy;
    $("submit").textContent = busy ? "Sending…" : "Send feedback";
  }

  async function send(submission) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      // Plain text keeps this a "simple" request, so the browser skips the CORS preflight Apps Script can't answer.
      const res = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(submission),
        signal: controller.signal,
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result || !result.ok) throw new Error((result && result.error) || `HTTP ${res.status}`);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  function showThanks(sub) {
    $("feedback-box").innerHTML = `
      <h3 tabindex="-1">Thank you, ${U.esc(sub.name)}</h3>
      <p>Your feedback on <b>${U.esc(sub.projectTitle)}</b> was sent to the Launch Studio faculty and staff.</p>
      ${FF.needsFollowUp(sub) ? "<p>A faculty or staff member will reach out to set up a time to talk.</p>" : ""}
      <a class="btn ghost" href="feedback.html?project=${encodeURIComponent(sub.projectId)}">Share more feedback</a>`;
    $("feedback-box").querySelector("h3").focus();
  }

  // Email draft and copy buttons, for when the form can't be sent (or no endpoint is set up yet).
  function showFallback(sub, message) {
    const { subject, body } = FF.feedbackEmail(sub, D.name);
    $("form-status").textContent = message;
    if (!contact || !contact.email) return;
    $("fallback-email").href = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $("fallback-copy").onclick = () => navigator.clipboard.writeText(`To: ${contact.email}\nSubject: ${subject}\n\n${body}`)
      .then(() => { $("form-status").textContent = `Copied. Paste your answers into an email to ${contact.email}.`; })
      .catch(() => { $("form-status").textContent = `Couldn’t copy automatically. Please email your answers to ${contact.email}.`; });
    $("fallback").hidden = false;
  }

  async function submit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    if (showErrors(FF.validateFeedback(values, D.projects.map((p) => p.id)))) {
      $("form-status").textContent = "";
      return;
    }
    const sub = FF.buildSubmission(values, projectById(values.project));
    $("fallback").hidden = true;

    if (!config.endpoint) {
      showFallback(sub, "Opening your email app with your feedback ready to send. If nothing happens, use the buttons below.");
      window.location.href = $("fallback-email").href;
      return;
    }

    setBusy(true);
    $("form-status").textContent = "Sending…";
    try {
      await send(sub);
      showThanks(sub);
    } catch (err) {
      console.error("Sponsor feedback could not be sent", err);
      setBusy(false);
      showFallback(sub, "We couldn’t send your feedback. Your answers are still here: try again, or send them by email instead.");
    }
  }

  // A field's error goes away as soon as the sponsor changes that field.
  form.addEventListener("input", (e) => {
    const field = e.target.name;
    if (!FIELDS.includes(field)) return;
    $(`e-${field}`).textContent = "";
    $(`f-${field}`).setAttribute("aria-invalid", "false");
  });
  form.addEventListener("change", (e) => {
    if (e.target.name === "rating") renderRating();
    if (e.target.name === "project") fillOrganization(projectById(e.target.value));
  });
  form.addEventListener("submit", submit);

  // Check-in windows, with the current one highlighted.
  const TODAY = U.todayISO();
  const short = (iso) => U.fmtDate(iso, { month: "short", day: "numeric" });
  $("windows").innerHTML = (config.windows || []).map((w) => {
    const open = w.opens <= TODAY && TODAY <= w.closes;
    const past = w.closes < TODAY;
    return `<li class="${open ? "open" : past ? "past" : ""}"><b>${U.esc(w.label)}</b> · ${short(w.opens)} – ${short(w.closes)}${w.tentative ? " (tentative)" : ""}${open ? ' <span class="pill next">Open now</span>' : ""}</li>`;
  }).join("");

  const linked = projectById(new URLSearchParams(location.search).get("project"));
  if (linked) {
    $("f-project").value = linked.id;
    fillOrganization(linked);
  }
})();
