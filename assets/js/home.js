(function () {
  const { D, U, WEEKS, TODAY, NOW_WEEK, progress, sponsorMark, sponsorHref, projectsOf,
    weekHref, weekName, dueIn } = window.Site;
  const $ = (id) => document.getElementById(id);
  const DEFAULT_WEEK = "Project work · weekly sponsor meeting";
  const short = (iso) => U.fmtDate(iso, { month: "short", day: "numeric" });
  const quarterOf = (id) => D.quarters.find((q) => q.id === id);

  $("eyebrow").textContent = `${D.program} · MSTI Launch Projects · ${D.year}`;
  $("headline").textContent = D.headline;
  $("tagline").textContent = D.tagline;

  // ---- Demo day countdown ----
  // Live when viewing today; frozen at midnight of the previewed date when ?today= is set.
  const demo = D.milestones.find((m) => m.demoDay);
  const COUNTDOWN_UNITS = [["days", "Days"], ["hours", "Hours"], ["minutes", "Minutes"], ["seconds", "Seconds"]];
  const isPreview = U.isValidISODate(new URLSearchParams(location.search).get("today"));

  function renderCountdown() {
    const target = new Date(demo.date + "T00:00:00").getTime();
    const now = isPreview ? new Date(TODAY + "T00:00:00").getTime() : Date.now();
    const left = U.countdown(now, target);
    const head = `<div><div class="stat-label">Final demo day${demo.tentative ? " · tentative" : ""}</div>
      <div class="countdown-date">${U.fmtDate(demo.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div></div>`;
    const body = left.done
      ? `<div class="countdown-done">${demo.date === TODAY ? "Demo day is today. See you there!" : "Thank you for joining the final demo."}</div>`
      : `<div class="countdown-units" role="timer" aria-label="Time until the final demo">${COUNTDOWN_UNITS.map(([k, label]) =>
          `<div><b>${String(left[k]).padStart(2, "0")}</b><span>${label}</span></div>`).join("")}</div>`;
    const link = `<a class="btn ghost countdown-link" href="demo.html">Demo day details &amp; calendar</a>`;
    $("countdown").innerHTML = head + body + link;
    return left.done;
  }

  if (demo) {
    $("countdown").hidden = false;
    const finished = renderCountdown();
    if (!finished && !isPreview) {
      const timer = setInterval(() => { if (renderCountdown()) clearInterval(timer); }, 1000);
    }
  }

  // ---- Current progress ----
  function thisWeekCard() {
    const due = dueIn(NOW_WEEK);
    const q = quarterOf(NOW_WEEK.quarter);
    const inWeek = U.findWeek(WEEKS, TODAY);
    const list = due.length
      ? `<ul>${due.map((a) => `<li>${U.esc(a.title)}${a.type === "gate" ? ` · due ${short(a.due)}` : ` · ${short(a.due)}`}</li>`).join("")}</ul>`
      : `<p class="muted">No gates or presentations due.</p>`;
    return `<div class="card this-week">
      <div class="stat-label">${inWeek ? "This week" : "Coming up"} · ${U.esc(q.short)} ${weekName(NOW_WEEK).toLowerCase()}</div>
      <h3>${U.esc(U.weekTitle(due, DEFAULT_WEEK))}</h3>
      <div class="muted" style="margin-bottom:10px">${short(NOW_WEEK.start)} – ${short(NOW_WEEK.end)} · ${U.esc(q.course)} · ${U.esc(q.phase)}</div>
      ${list}
      <a class="btn" href="week.html?id=${NOW_WEEK.id}">Open this week</a>
    </div>`;
  }

  function gatesCard() {
    const gates = D.assignments.filter((a) => a.type === "gate");
    const done = gates.filter((a) => a.due < TODAY).length;
    const next = gates.find((a) => a.due >= TODAY);
    const pct = Math.round((done / gates.length) * 100);
    const days = next ? U.daysBetween(TODAY, next.due) : 0;
    const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    return `<div class="card"><div class="stat-label">Gates passed</div>
      <div class="stat-big">${done} <span class="muted" style="font-size:22px">of ${gates.length}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="muted" style="font-size:14px">${next
        ? `Next: <a href="${weekHref(next.due, next.id)}"><b>${U.esc(next.title)}</b></a> · ${short(next.due)} (${when})`
        : "All gates complete."}</div></div>`;
  }

  function reviewCard() {
    const next = D.milestones[progress.nextIndex];
    const pct = Math.round(U.timeElapsed(WEEKS, TODAY) * 100);
    return `<div class="card"><div class="stat-label">Project timeline</div>
      <div class="stat-big">${pct}%</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="muted" style="font-size:14px">${next
        ? `Next review: <b>${U.esc(next.title)}</b> · ${short(next.date)}${next.tentative ? " (tentative)" : ""}`
        : "All reviews complete."}</div></div>`;
  }

  $("progress").innerHTML = thisWeekCard() + gatesCard() + reviewCard();

  // ---- Journey ----
  const gateCount = (qid) => D.assignments.filter((a) => a.type === "gate" && a.quarter === qid).length;
  $("journey").innerHTML =
    D.quarters.map((q) => `<div class="q ${q.id}">${U.esc(q.label)} · ${U.esc(q.course)}</div>`).join("") +
    D.stages.map((s, i) => `<div class="stage${i === D.stages.length - 1 ? " end" : ""}"><h3>${U.esc(s.name)}</h3><p>${U.esc(s.text)}</p></div>`).join("") +
    `<div class="loop"><b>Test → Learn → Improve → Repeat</b><br>Test throughout development; revisit research, scope, and design as evidence changes.</div>`;
  $("gate-note").innerHTML = `${gateCount("autumn") + gateCount("winter")} assessed checkpoints (gates): ${gateCount("autumn")} in Autumn, ${gateCount("winter")} in Winter. Each requires evidence-backed work. <a href="gates.html">See all gates and rubrics</a>.`;

  $("exp-students").innerHTML = D.expectations.students.map((e) => `<li>${U.esc(e)}</li>`).join("");
  $("exp-sponsors").innerHTML = D.expectations.sponsors.map((e) => `<li>${U.esc(e)}</li>`).join("");

  $("track-legend").innerHTML = window.trackLegend();
  $("project-cards").innerHTML = D.projects.map(window.projectCard).join("");

  // ---- Thank you ----
  // Each sponsor's projects with the named students on each team (opted-out students are not listed).
  $("thanks").innerHTML = D.sponsors.map((sp) => {
    const lines = projectsOf(sp).map((p) => {
      const names = U.teamNames(p.students);
      return `<span class="thanks-project">${U.esc(p.title)}</span>${names.length ? `<span class="thanks-team">${U.esc(names.join(", "))}</span>` : ""}`;
    });
    return `<a class="thanks-card" href="${sponsorHref(sp)}">
      <div class="thanks-logo">${sponsorMark(sp)}</div>
      <b>${U.esc(sp.name)}</b>
      <span>${lines.join("")}</span></a>`;
  }).join("");

  // ---- Past cohorts ----
  const alumni = D.alumni || { outcomes: [], testimonials: [] };
  if (alumni.outcomes.length || alumni.testimonials.length) {
    $("alumni").hidden = false;
    $("alumni-outcomes").innerHTML = alumni.outcomes.map((o) => `
      <article class="card accent">
        <div class="idx">${U.esc(o.cohort)}${o.sponsor ? ` · ${U.esc(o.sponsor)}` : ""}</div>
        <h3>${U.esc(o.title)}</h3>
        <p>${U.esc(o.text)}</p>
        ${o.link ? `<p><a href="${U.esc(o.link)}" target="_blank" rel="noopener">Learn more</a></p>` : ""}
      </article>`).join("");
    $("alumni-quotes").innerHTML = alumni.testimonials.map((t) => `
      <blockquote class="testimonial">
        <p>“${U.esc(t.quote)}”</p>
        <footer><b>${U.esc(t.name)}</b>${t.title ? `<span>${U.esc(t.title)}</span>` : ""}${t.cohort ? `<span class="muted">${U.esc(t.cohort)} sponsor</span>` : ""}</footer>
      </blockquote>`).join("");
    $("alumni-outcomes").hidden = !alumni.outcomes.length;
    $("alumni-quotes").hidden = !alumni.testimonials.length;
  }

  // ---- Interested in sponsoring ----
  const contact = D.contacts.people[D.sponsorship.contact];
  $("sponsor-cta").innerHTML = `
    <p>${U.esc(D.sponsorship.text)}</p>
    <div class="sponsor-cta-contact">
      <div><div class="stat-label">Contact</div>
        <b>${U.esc(contact.name)}</b><br>
        <span class="muted">${U.esc(contact.title)}</span><br>
        <a href="mailto:${U.esc(contact.email)}">${U.esc(contact.email)}</a></div>
      <a class="btn" href="mailto:${U.esc(contact.email)}">Email ${U.esc(contact.name)}</a>
    </div>`;
})();
