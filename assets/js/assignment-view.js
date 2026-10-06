// Renders a gate or presentation with its deliverables and rubric. Used by the week page.
(function () {
  const { U, tentativePill, assignmentStatus, assignmentPill } = window.Site;
  const bullets = (text) => {
    const parts = U.splitPhrases(text);
    return parts.length > 1 ? `<ul class="phrases">${parts.map((p) => `<li>${U.esc(p)}</li>`).join("")}</ul>` : U.esc(text);
  };

  // Canvas rubric with performance levels per criterion (Launch II).
  function levelTable(criteria) {
    const labels = criteria[0].levels.map((l) => l.label);
    return `<div class="table-scroll"><table class="rubric levels">
      <tr><th>Criterion</th>${labels.map((l) => `<th>${U.esc(l)}</th>`).join("")}</tr>
      ${criteria.map((c) => `<tr>
        <td>${U.esc(c.name)}${c.description ? `<small class="note">${U.esc(c.description)}</small>` : ""}</td>
        ${c.levels.map((l) => `<td>${bullets(l.text)}</td>`).join("")}
      </tr>`).join("")}
    </table></div>`;
  }

  // Criteria with a single description (Launch I).
  function criteriaTable(rubric) {
    return `<div class="table-scroll"><table class="rubric">
      <tr><th>Criterion</th><th>What we’re looking for</th></tr>
      ${rubric.criteria.map((c) => `<tr><td>${U.esc(c.name)}</td><td>${U.esc(c.description)}</td></tr>`).join("")}
    </table></div>`;
  }

  function rubricBlock(rubric) {
    if (!rubric || !rubric.criteria.length) {
      return `<div class="empty">The rubric for this assignment has not been published yet.</div>`;
    }
    return rubric.criteria.every((c) => c.levels && c.levels.length) ? levelTable(rubric.criteria) : criteriaTable(rubric);
  }

  function assignmentItem(a) {
    const kind = a.type === "gate" ? "Gate" : "Presentation";
    const when = a.type === "gate"
      ? `Due ${U.fmtDate(a.due, { weekday: "short", month: "short", day: "numeric" })}, ${U.esc(a.time)} PT`
      : `In class ${U.fmtDate(a.due, { weekday: "short", month: "short", day: "numeric" })}`;
    return `<article class="item ${assignmentStatus(a)}" id="${U.esc(a.id)}">
      <div class="item-head"><h3>${U.esc(a.title)}</h3><span><span class="pill kind">${kind}</span> ${assignmentPill(a)}${tentativePill(a)}</span></div>
      <div class="meta"><span><b>${when}</b></span><span>${U.esc(a.course)}</span>${a.format ? `<span>${U.esc(a.format)}</span>` : ""}</div>
      ${a.summary ? `<p class="question">${U.esc(a.summary)}</p>` : ""}
      ${a.deliverables.length ? `<h4>${a.type === "gate" ? "Key deliverables" : "Presentation components"}</h4>
        <ol class="deliverables">${a.deliverables.map((d) => `<li>${U.esc(d)}</li>`).join("")}</ol>` : ""}
      <h4>Grading rubric</h4>${rubricBlock(a.rubric)}
    </article>`;
  }

  window.AssignmentView = Object.freeze({ assignmentItem, rubricBlock });
})();
