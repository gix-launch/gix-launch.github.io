(function () {
  const { D, U, WEEKS, NOW_WEEK, statusPill, tentativePill, weekName, dueIn } = window.Site;
  const { assignmentItem } = window.AssignmentView;
  const DEFAULT_TITLE = "Project work · weekly sponsor meeting";

  const requested = new URLSearchParams(location.search).get("id");
  const found = WEEKS.findIndex((w) => w.id === (requested || NOW_WEEK.id));
  const idx = Math.max(0, found);
  const week = WEEKS[idx];
  const quarter = D.quarters.find((q) => q.id === week.quarter);
  const label = (w) => `${D.quarters.find((q) => q.id === w.quarter).short} · ${weekName(w)}`;
  const short = (iso) => U.fmtDate(iso, { weekday: "short", month: "short", day: "numeric" });

  const assignments = dueIn(week);
  const reviews = U.inWeek(D.milestones, week, "date");
  document.title = `${label(week)} · ${D.name}`;

  function reviewItem(m) {
    const i = D.milestones.indexOf(m);
    return `<div class="item"><div class="item-head"><h3>${U.esc(m.title)}</h3><span>${statusPill(i)}${tentativePill(m)}</span></div>
      <div class="meta"><span><b>When</b> ${short(m.date)}</span><span><b>Sponsor attendance</b> ${U.esc(m.sponsor)}</span></div>
      <p style="margin:0">${U.esc(m.detail)}</p></div>`;
  }

  const prev = WEEKS[idx - 1];
  const next = WEEKS[idx + 1];
  const empty = (msg) => `<div class="empty">${msg}</div>`;
  const anyTentative = assignments.some((a) => a.tentative) || reviews.some((m) => m.tentative);

  document.getElementById("week").innerHTML = `
    <div class="hero">
      ${requested && found === -1 ? `<div class="callout" style="margin-bottom:20px">That week was not found. Showing ${U.esc(label(week))}.</div>` : ""}
      <div class="eyebrow">${U.esc(quarter.label)} · ${U.esc(quarter.course)} · ${weekName(week)}${week.id === NOW_WEEK.id ? " · Current week" : ""}</div>
      <h1>${U.esc(U.weekTitle(assignments, DEFAULT_TITLE))}</h1>
      <p class="lede">${U.fmtDate(week.start, { weekday: "long", month: "long", day: "numeric" })} – ${U.fmtDate(week.end, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · ${U.esc(quarter.phase)}</p>
      ${anyTentative ? `<p class="tentative-note">${U.esc(D.tentativeNote)}</p>` : ""}
      <div class="week-nav">
        ${prev ? `<a class="btn ghost" href="week.html?id=${prev.id}">← ${U.esc(label(prev))}</a>` : "<span></span>"}
        ${next ? `<a class="btn ghost" href="week.html?id=${next.id}">${U.esc(label(next))} →</a>` : ""}
      </div>
    </div>
    ${reviews.length ? `<section><h2>Sponsor calendar</h2>${reviews.map(reviewItem).join("")}</section>` : ""}
    <section><h2>Gates &amp; presentations</h2>
      ${assignments.length ? assignments.map(assignmentItem).join("")
        : empty("Nothing due this week. Teams continue project work and hold their weekly sponsor meeting.")}</section>`;

  // Scroll to an anchored assignment after rendering (e.g. week.html?id=winter-2#gate-7).
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
  }
})();
