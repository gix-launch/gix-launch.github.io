(function () {
  const { D, U } = window.Site;
  const $ = (id) => document.getElementById(id);
  const groups = U.contactGroups(D.contacts);
  const recipients = U.contactRecipients(groups);
  const FIELDS = ["name", "email", "recipient", "message"];

  const personCard = (p) => `
    <div class="card contact-card">
      <h3>${U.esc(p.name)}</h3>
      ${p.title ? `<p class="muted">${U.esc(p.title)}</p>` : ""}
      ${p.email ? `<p><a href="mailto:${U.esc(p.email)}">${U.esc(p.email)}</a></p>` : ""}
    </div>`;

  $("contact-groups").innerHTML = groups.map((g) => `
    <div class="contact-group">
      <div class="stat-label">${U.esc(g.label)}</div>
      <p class="contact-topic">${U.esc(g.text)}:</p>
      ${g.people.map(personCard).join("")}
    </div>`).join("");

  $("f-recipient").innerHTML = `<option value="">Choose…</option>` + groups.map((g) => {
    const opts = recipients
      .map((r, i) => (r.group === g.label ? `<option value="${i}">${U.esc(r.name)}</option>` : ""))
      .join("");
    return opts ? `<optgroup label="${U.esc(g.label)}">${opts}</optgroup>` : "";
  }).join("");

  $("contact-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.target).entries());
    const errors = U.validateContact(values);

    FIELDS.forEach((f) => {
      $(`e-${f}`).textContent = errors[f] || "";
      $(`f-${f}`).setAttribute("aria-invalid", errors[f] ? "true" : "false");
    });
    const firstError = FIELDS.find((f) => errors[f]);
    if (firstError) {
      $(`f-${firstError}`).focus();
      $("form-status").textContent = "";
      return;
    }

    const to = recipients[Number(values.recipient)];
    const subject = `[${D.name}] Message from ${values.name.trim()} (${values.role})`;
    const body = `${values.message.trim()}\n\n— ${values.name.trim()}\n${values.email.trim()}\n${values.role}`;
    window.location.href = `mailto:${to.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $("form-status").textContent = `Opening an email to ${to.email}… If nothing happens, email them directly.`;
  });
})();
