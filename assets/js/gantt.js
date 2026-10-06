// Gantt chart of every gate and presentation across both quarters (Overview page).
// Gates are bars covering their work period; presentations are diamonds on their date.
(function () {
  const { D, U, WEEKS, TODAY, weekHref, weekName, assignmentStatus } = window.Site;
  const root = document.getElementById("gantt");
  if (!root) return;

  const STATUS_LABEL = { done: "Complete", next: "Up next", upcoming: "Upcoming" };
  const pct = (f) => `${(f * 100).toFixed(3)}%`;
  const at = (iso) => U.timelineFraction(WEEKS, iso);
  const short = (iso) => U.fmtDate(iso, { month: "short", day: "numeric" });
  const quarterOf = (id) => D.quarters.find((q) => q.id === id);
  const reviewFor = (a) => D.milestones.find((m) => m.assignment === a.id) || null;

  // A gate's work period runs from the day after the previous gate in its quarter (or the quarter start) to its due date.
  function gateStart(a) {
    const earlier = D.assignments.filter((x) => x.type === "gate" && x.quarter === a.quarter && x.due < a.due);
    return earlier.length ? U.addDays(earlier[earlier.length - 1].due, 1) : quarterOf(a.quarter).start;
  }

  function label(a) {
    if (a.type === "gate") return `<b>G${a.number}</b> ${U.esc(a.title.replace(/^Gate \d+:\s*/i, ""))}`;
    const review = reviewFor(a);
    return `<b>◆</b> ${U.esc(review ? review.title : `${quarterOf(a.quarter).short} ${a.title.toLowerCase()}`)}`;
  }

  function mark(a) {
    const end = at(U.addDays(a.due, 1));
    if (a.type !== "gate") return `<i class="g-diamond" style="left:${pct((at(a.due) + end) / 2)}"></i>`;
    const start = at(gateStart(a));
    return `<i class="g-bar" style="left:${pct(start)};width:${pct(end - start)}"></i>`;
  }

  function row(a) {
    const status = assignmentStatus(a);
    const review = reviewFor(a);
    const sponsorTag = review ? `<span class="g-sponsor" title="${U.esc(review.title)} · sponsors ${U.esc(review.sponsor.toLowerCase())}">Sponsor review</span>` : "";
    const tip = `${a.title} · ${a.type === "gate" ? `due ${short(a.due)}` : short(a.due)} · ${STATUS_LABEL[status]}${a.tentative ? " (tentative)" : ""}`;
    return `<a class="g-row ${status}${a.tentative ? " tentative" : ""}" href="${weekHref(a.due, a.id)}" title="${U.esc(tip)}">
      <span class="g-label"><span class="g-name">${label(a)}</span>${sponsorTag}${status === "next" ? '<span class="pill next">Up next</span>' : ""}</span>
      <span class="g-track">${mark(a)}</span>
    </a>`;
  }

  function scale() {
    const quarters = D.quarters.map((q) => {
      const first = WEEKS.find((w) => w.quarter === q.id);
      return `<span class="g-quarter" style="left:${pct(at(first.start))}">${U.esc(q.label)} · ${U.esc(q.course)}</span>`;
    }).join("");
    const weeks = WEEKS.map((w) => `<span class="g-week" style="left:${pct(at(w.start))};width:${pct(7 / (WEEKS.length * 7))}" title="${U.esc(w.quarterLabel)} ${weekName(w).toLowerCase()} · ${short(w.start)}">${w.n === 11 ? "F" : w.n}</span>`).join("");
    return `<div class="g-row g-head" aria-hidden="true"><span class="g-label"></span><span class="g-track">${quarters}${weeks}</span></div>`;
  }

  function todayLine() {
    if (TODAY < WEEKS[0].start || TODAY > WEEKS[WEEKS.length - 1].end) return "";
    return `<div class="g-today" style="--at:${at(TODAY)}"><span>Today</span></div>`;
  }

  root.innerHTML = `<div class="gantt-scroll"><div class="gantt">${scale()}
    <div class="g-body">${D.assignments.map(row).join("")}${todayLine()}</div></div></div>
    <div class="g-legend">
      <span><i class="g-bar done"></i>Complete</span><span><i class="g-bar next"></i>Up next</span>
      <span><i class="g-bar upcoming"></i>Upcoming</span><span><i class="g-bar tentative"></i>Tentative date</span>
      <span><i class="g-diamond"></i>Presentation</span><span class="g-sponsor">Sponsor review</span>
    </div>`;
})();
