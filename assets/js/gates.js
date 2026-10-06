(function () {
  const { D, U, tentativePill, weekHref, weekLink, assignmentStatus, assignmentPill } = window.Site;

  function row(a) {
    const label = a.type === "gate" ? `Gate ${a.number}` : "Presentation";
    const title = a.type === "gate" ? a.title.replace(/^Gate \d+:\s*/i, "") : a.title;
    return `<tr class="${assignmentStatus(a)}">
      <td class="nowrap"><b>${label}</b></td>
      <td><a href="${weekHref(a.due, a.id)}"><strong>${U.esc(title)}</strong></a><br><span class="muted">${U.esc(a.summary)}</span></td>
      <td class="nowrap">${U.fmtDate(a.due, { month: "short", day: "numeric" })}${tentativePill(a)}</td>
      <td class="nowrap">${weekLink(a.due, a.id)}</td>
      <td>${assignmentPill(a)}</td></tr>`;
  }

  document.getElementById("quarters").innerHTML = D.quarters.map((q) => {
    const items = D.assignments.filter((a) => a.quarter === q.id);
    const tentative = items.some((a) => a.tentative);
    return `<section>
      <div class="eyebrow">${U.esc(q.label)} · ${U.esc(q.course)} · ${U.esc(q.name)}</div>
      <h2>${U.esc(q.phase)}</h2>
      <div class="table-scroll"><table class="schedule">
        <tr><th></th><th>Assignment</th><th>Due</th><th>Week</th><th>Status</th></tr>
        ${items.map(row).join("")}
      </table></div>
      ${tentative ? `<p class="tentative-note">${U.esc(D.tentativeNote)}</p>` : ""}
    </section>`;
  }).join("");
})();
