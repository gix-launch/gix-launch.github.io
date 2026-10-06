// Demo day page: date, logistics, agenda, calendar export, and the teams presenting.
// The date comes from the milestone marked `demoDay`; everything else is in `demoDay` in data.js.
(function () {
  const { D, U, TODAY, weekHref, statusPill, tentativePill } = window.Site;
  const root = document.getElementById("demo");
  const demo = D.milestones.find((m) => m.demoDay);
  const info = D.demoDay || {};
  const ICS_FILENAME = "launch-studio-demo-day.ics";

  if (!demo) {
    root.innerHTML = `<div class="hero"><h1>Demo day</h1><p class="lede">The final demo date has not been set yet. Check back soon.</p></div>`;
    return;
  }

  const idx = D.milestones.indexOf(demo);
  const long = U.fmtDate(demo.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const fmtTime = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };
  const timeText = info.start && info.end ? `${fmtTime(info.start)} – ${fmtTime(info.end)}` : "Time to be announced";
  const placeText = info.location || "Location to be announced";
  const days = U.daysBetween(TODAY, demo.date);
  const when = days < 0 ? "This event has taken place." : days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `In ${days} days`;

  // ---- Calendar export ----
  const event = Object.freeze({
    uid: `demo-day-${demo.date}@launch-studio`,
    title: `${D.name}: ${demo.title}`,
    date: demo.date,
    start: info.start || null,
    end: info.end || null,
    description: `${demo.detail}${demo.tentative ? ` (${D.tentativeNote})` : ""}`,
    location: [info.location, info.address].filter(Boolean).join(", ") || null,
    url: location.href.split("#")[0],
  });

  function downloadIcs() {
    const blob = new Blob([U.icsEvent(event)], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href, download: ICS_FILENAME });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  // ---- Teams ----
  const byTrack = window.projectTracks.map((t) => ({ ...t, projects: D.projects.filter((p) => p.track === t.name) })).filter((t) => t.projects.length);
  const teamList = byTrack.map((t) => `
    <div class="demo-track ${t.cls}">
      <h3><i aria-hidden="true"></i>${U.esc(t.name)} <span class="muted">· ${t.projects.length}</span></h3>
      <ul>${t.projects.map((p) => `<li><a href="project.html?id=${encodeURIComponent(p.id)}">${U.esc(p.title)}</a>
        <span class="muted">${p.studentLed ? "Student-led" : U.esc(p.sponsor)}</span></li>`).join("")}</ul>
    </div>`).join("");

  root.innerHTML = `
    <div class="hero">
      <div class="eyebrow">${U.esc(D.year)} · Final demo &amp; handoff</div>
      <h1>Demo day</h1>
      <p class="lede">${U.esc(demo.detail)}</p>
      <div class="demo-facts">
        <div><b>When</b>${U.esc(long)}${tentativePill(demo)}<br><span class="muted">${U.esc(timeText)}</span></div>
        <div><b>Where</b>${U.esc(placeText)}${info.address ? `<br><span class="muted">${U.esc(info.address)}</span>` : ""}</div>
        <div><b>Sponsor attendance</b>${U.esc(demo.sponsor)}<br><span class="muted">${when}</span> ${statusPill(idx)}</div>
      </div>
      ${demo.tentative ? `<p class="tentative-note">${U.esc(D.tentativeNote)}</p>` : ""}
      <div class="demo-actions">
        <button class="btn" type="button" id="ics">Add to calendar (.ics)</button>
        <a class="btn ghost" href="${U.esc(U.googleCalendarUrl(event))}" target="_blank" rel="noopener">Add to Google Calendar</a>
        ${info.rsvp ? `<a class="btn ghost" href="${U.esc(info.rsvp)}" target="_blank" rel="noopener">RSVP</a>` : ""}
        <a class="btn ghost" href="${weekHref(demo.date, demo.assignment)}">See the week</a>
      </div>
    </div>

    <section>
      <h2>Agenda</h2>
      <p class="note">${demo.tentative ? "The running order is set; times will be posted when the date is confirmed." : "Times are shown in Pacific Time."}</p>
      <ol class="demo-agenda">${(info.agenda || []).map((a) => `<li><h3>${U.esc(a.title)}</h3><p>${U.esc(a.text)}</p></li>`).join("")}</ol>
    </section>

    <section>
      <h2>Bringing colleagues</h2>
      <p class="callout">${U.esc(info.guests || "Sponsors are welcome to bring colleagues.")}
        ${info.rsvp ? ` <a href="${U.esc(info.rsvp)}" target="_blank" rel="noopener">RSVP here</a>.` : ` <a href="contact.html">Contact us</a> with a head count.`}</p>
    </section>

    <section>
      <h2>Teams presenting</h2>
      <div class="demo-tracks">${teamList}</div>
    </section>`;

  document.getElementById("ics").addEventListener("click", downloadIcs);
})();
