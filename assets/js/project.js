(function () {
  const { D, U } = window.Site;
  const root = document.getElementById("project");
  const id = new URLSearchParams(location.search).get("id");
  const s = D.projects.find((p) => p.id === id);
  // Generic silhouette for students who opted out of directory release (no name, initials, or photo).
  const SILHOUETTE = `<svg class="silhouette" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z"/></svg>`;

  if (!s) {
    root.innerHTML = `<div class="hero"><a class="back" href="projects.html">All projects</a>
      <h1>Project not found</h1><p class="lede">We couldn’t find a project with that link. Please choose one from the projects page.</p></div>`;
    return;
  }

  document.title = `${s.title} · ${D.name}`;

  // Photo if provided; fall back to initials if missing or it fails to load.
  const avatar = (p) => {
    if (p.optedOut) return SILHOUETTE;
    return p.photo
      ? `<img src="${U.esc(p.photo)}" alt="Photo of ${U.esc(p.name)}" loading="lazy" data-initials="${U.esc(p.initials)}">`
      : `<span aria-hidden="true">${U.esc(p.initials)}</span>`;
  };

  root.innerHTML = `
    <div class="hero">
      <a class="back" href="projects.html">All projects</a>
      <div class="eyebrow">${U.esc(s.track)} · ${s.studentLed ? "Student-led project" : `Sponsored by ${U.esc(s.sponsor)}`}</div>
      <h1>${U.esc(s.title)}</h1>
      <p class="lede">${U.esc(s.summary)}</p>
      <div class="facts">
        <div><b>Sponsor</b>${s.studentLed ? "Student-led" : U.esc(s.sponsor)}</div>
        ${s.contact ? `<div><b>Sponsor contact</b>${U.esc(s.contact)}</div>` : ""}
        <div><b>Track</b>${U.esc(s.track)}</div>
        <div><b>Team size</b>${s.students.length} students</div>
        <div><b>Skills</b>${s.skills.map(U.esc).join(", ")}</div>
      </div>
    </div>
    <section>
      <h2>Meet the team</h2>
      <div class="team">${s.students.map(U.teamMember).map((p) => `
        <figure class="person" style="margin:0">
          <div class="photo">${avatar(p)}</div>
          <figcaption class="info"><b>${U.esc(p.name)}</b>${p.role ? `<span>${U.esc(p.role)}</span>` : ""}</figcaption>
        </figure>`).join("")}
      </div>
    </section>
    <section>
      <h2>Working with this team</h2>
      <p class="note">Sponsors: <a href="feedback.html?project=${encodeURIComponent(s.id)}">share feedback on this team</a>. Questions about this project? <a href="contact.html">Contact the instructors</a>.</p>
    </section>`;

  root.querySelectorAll(".photo img").forEach((img) => img.addEventListener("error", () => {
    img.replaceWith(document.createTextNode(img.dataset.initials));
  }, { once: true }));
})();
