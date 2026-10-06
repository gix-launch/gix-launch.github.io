// Project card markup shared by the home and projects pages.
// Cards are colour-coded by track; mixed-track projects blend the two track colours (see .track-* in site.css).
(function () {
  const TRACKS = Object.freeze([
    { name: "Connected devices", cls: "track-devices" },
    { name: "Robotics", cls: "track-robotics" },
    { name: "Mixed track", cls: "track-mixed" },
  ]);
  const trackClass = (track) => (TRACKS.find((t) => t.name === track) || {}).cls || "";
  window.projectTracks = TRACKS;
  window.projectTrackClass = trackClass;

  window.projectCard = function projectCard(p, i) {
    const { esc } = window.CapUtils;
    return `<a class="card project-card ${trackClass(p.track)}" href="project.html?id=${encodeURIComponent(p.id)}">
    <div class="idx">Project ${String(i + 1).padStart(2, "0")} · <span class="track-label">${esc(p.track)}</span></div>
    <h3>${esc(p.title)}</h3>
    <div class="sponsor">${p.studentLed ? "Student-led project" : esc(p.sponsor)}</div>
    <p>${esc(p.summary)}</p>
    <div class="tags">${p.skills.map((k) => `<span class="tag">${esc(k)}</span>`).join("")}</div>
  </a>`;
  };

  window.trackLegend = function trackLegend() {
    return `<div class="track-legend" aria-label="Project tracks">${TRACKS.map((t) =>
      `<span class="${t.cls}"><i aria-hidden="true"></i>${t.name}</span>`).join("")}</div>`;
  };
})();
