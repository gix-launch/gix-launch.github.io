// Renders the shared header (with Weeks menu), sponsor marquee, and footer on every page,
// and exposes small render helpers used by several pages.
(function () {
  const D = window.CAPSTONE;
  const U = window.CapUtils;
  if (!D || !U) {
    document.body.insertAdjacentHTML("afterbegin", '<p style="padding:24px">Site data failed to load. Check that the files in assets/js/ are present.</p>');
    return;
  }

  const WEEKS = U.buildWeeks(D.quarters);
  const TODAY = U.todayISO();
  const NOW_WEEK = U.currentWeek(WEEKS, TODAY);
  const page = document.body.dataset.page;
  const dueIn = (w) => U.inWeek(D.assignments, w, "due");
  const weekName = (w) => (w.n === 11 ? "Finals week" : `Week ${w.n}`);

  const NAV = [
    { id: "home", label: "Overview", href: "index.html" },
    { id: "weeks", label: "Weeks", menu: true },
    { id: "gates", label: "Gates & rubrics", href: "gates.html" },
    { id: "projects", label: "Projects", href: "projects.html" },
    { id: "sponsors", label: "Sponsor guide", href: "sponsors.html" },
    { id: "demo", label: "Demo day", href: "demo.html" },
    { id: "feedback", label: "Feedback", href: "feedback.html" },
    { id: "contact", label: "Contact", href: "contact.html" },
  ];

  function weeksMenu() {
    const cols = D.quarters.map((q) => {
      const links = WEEKS.filter((w) => w.quarter === q.id).map((w) => {
        const due = dueIn(w);
        const tag = due.length ? `<small>${U.esc(due.map((a) => (a.type === "gate" ? `G${a.number}` : "Pres.")).join(" · "))}</small>`
          : `<small>${U.fmtDate(w.start, { month: "short", day: "numeric" })}</small>`;
        return `<a class="${w.id === NOW_WEEK.id ? "now" : ""} ${due.length ? "has-due" : ""}" href="week.html?id=${w.id}"><span>${weekName(w)}</span>${tag}</a>`;
      }).join("");
      return `<div><h4>${U.esc(q.label)} · ${U.esc(q.course)}</h4>${links}</div>`;
    }).join("");
    return `<div class="dd${page === "week" ? " active" : ""}">
      <button type="button" aria-expanded="false" aria-haspopup="true">Weeks ▾</button>
      <div class="dd-panel">${cols}</div></div>`;
  }

  function header() {
    const items = NAV.map((n) => n.menu ? weeksMenu()
      : `<a href="${n.href}"${n.id === page ? ' aria-current="page"' : ""}>${n.label}</a>`).join("");
    return `<header class="site-header"><div class="wrap">
      <a class="brand" href="index.html"><img src="assets/logos/logo.png" alt="University of Washington Global Innovation Exchange"><b>${U.esc(D.name)}</b></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="nav" id="site-nav" aria-label="Main">${items}</nav>
    </div></header>`;
  }

  // A sponsor's logo (with an optional text label), or its name as text when there is no logo.
  function sponsorMark(sp) {
    if (!sp.logo) return `<span class="mark-text">${U.esc(sp.name)}</span>`;
    // `logoScale` is one number for every logo, or an array with one number per logo.
    const scaleOf = (i) => Number([].concat(sp.logoScale)[Array.isArray(sp.logoScale) ? i : 0]) || 1;
    const img = [].concat(sp.logo).map((src, i) =>
      `<img src="${U.esc(src)}" alt="${i === 0 ? U.esc(sp.name) : ""}" style="--s:${scaleOf(i)}">`).join("");
    const label = sp.label ? `<span class="mark-label" aria-hidden="true">${U.esc(sp.label)}</span>` : "";
    const cls = Array.isArray(sp.logo) ? "mark multi" : "mark";
    return `<span class="${cls}">${sp.labelFirst ? label + img : img + label}</span>`;
  }

  const projectsOf = (sp) => D.projects.filter((p) => p.sponsor === sp.name);
  const sponsorHref = (sp) => {
    const own = projectsOf(sp);
    return own.length === 1 ? `project.html?id=${encodeURIComponent(own[0].id)}` : "projects.html";
  };

  function sponsorLinks() {
    return D.sponsors.map((sp) => `<a href="${sponsorHref(sp)}">${sponsorMark(sp)}</a>`).join("");
  }

  function marquee() {
    const one = sponsorLinks();
    // Track is duplicated so the -50% scroll loops seamlessly; the copy is hidden from assistive tech.
    return `<div class="marquee" aria-label="Industry sponsors"><div class="wrap marquee-inner">
      <span class="marquee-label">${U.esc(D.year)} Sponsors</span>
      <div class="marquee-viewport"><div class="marquee-track">${one}<span aria-hidden="true" style="display:contents">${one.replace(/<a /g, '<a tabindex="-1" ')}</span></div></div>
    </div></div>`;
  }

  function footer() {
    return `<footer class="site-footer"><div class="wrap">
      <span>${U.esc(D.courseLine)} · ${U.esc(D.program)} · ${U.esc(D.dates)}</span>
      <span><a href="contact.html">Contact us</a></span>
    </div></footer>`;
  }

  function wireNav() {
    const dd = document.querySelector(".dd");
    const btn = dd.querySelector("button");
    const setOpen = (open) => { dd.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!dd.classList.contains("open")); });
    document.addEventListener("click", (e) => { if (!dd.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && dd.classList.contains("open")) { setOpen(false); btn.focus(); } });

    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("site-nav");
    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("open");
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  document.body.insertAdjacentHTML("afterbegin", header() + marquee());
  document.body.insertAdjacentHTML("beforeend", footer());
  wireNav();

  // ---- Shared helpers ----
  const progress = U.milestoneProgress(D.milestones, TODAY);
  const STATUS_LABEL = { done: "Complete", next: "Up next", upcoming: "Upcoming" };
  function milestoneStatus(i) {
    if (progress.nextIndex === -1 || i < progress.nextIndex) return "done";
    return i === progress.nextIndex ? "next" : "upcoming";
  }
  const statusPill = (i) => { const s = milestoneStatus(i); return `<span class="pill ${s}">${STATUS_LABEL[s]}</span>`; };
  const tentativePill = (item) => (item.tentative ? ' <span class="pill tentative" title="Projected from the Winter 2026 schedule">Tentative</span>' : "");
  const weekOf = (iso) => U.findWeek(WEEKS, iso);
  const weekHref = (iso, anchor) => { const w = weekOf(iso); return w ? `week.html?id=${w.id}${anchor ? "#" + anchor : ""}` : ""; };
  const weekLink = (iso, anchor) => {
    const w = weekOf(iso);
    return w ? `<a href="${weekHref(iso, anchor)}">${U.esc(w.quarterLabel)} ${w.n === 11 ? "finals" : "wk " + w.n}</a>` : "";
  };
  const assignmentById = (id) => D.assignments.find((a) => a.id === id) || null;
  // Gates and presentations: past ones are done; everything due on the next date is up next.
  const NEXT_DUE = U.nextDate(D.assignments, "due", TODAY);
  const assignmentStatus = (a) => U.dateStatus(a.due, TODAY, NEXT_DUE);
  const assignmentPill = (a) => { const s = assignmentStatus(a); return `<span class="pill ${s}">${STATUS_LABEL[s]}</span>`; };

  window.Site = Object.freeze({
    D, U, WEEKS, TODAY, NOW_WEEK, progress, milestoneStatus, statusPill, tentativePill,
    weekOf, weekHref, weekLink, weekName, dueIn, assignmentById, assignmentStatus, assignmentPill,
    sponsorMark, sponsorHref, projectsOf,
  });
})();
