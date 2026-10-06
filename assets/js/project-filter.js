// Track and sponsor filters for the project cards on projects.html.
// Filtering hides already-rendered cards, so each card keeps its "Project NN" number.
// The active filters live in the URL (?track=robotics&sponsor=t-mobile) so a filtered view can be shared.
(function (root) {
  const STUDENT_LED = "Student-led";
  const KEYS = Object.freeze(["track", "sponsor"]);
  const NO_FILTERS = Object.freeze({ track: null, sponsor: null });

  const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const sponsorOf = (p) => (p.studentLed ? STUDENT_LED : p.sponsor);
  const valueOf = (p, key) => (key === "sponsor" ? sponsorOf(p) : p[key]);

  // Options keyed by filter name. Tracks in display order (only those in use); sponsors in data order with student-led projects last.
  function filterOptions(projects, trackOrder) {
    const tracks = trackOrder.filter((t) => projects.some((p) => p.track === t));
    const named = [...new Set(projects.filter((p) => !p.studentLed).map(sponsorOf))];
    const sponsors = projects.some((p) => p.studentLed) ? [...named, STUDENT_LED] : named;
    return Object.freeze({ track: Object.freeze(tracks), sponsor: Object.freeze(sponsors) });
  }

  const matchesFilters = (p, filters) => KEYS.every((k) => !filters[k] || valueOf(p, k) === filters[k]);

  // How many projects each value of `key` would show, given the current value of the other filter.
  function optionCounts(projects, filters, key, values) {
    return new Map(values.map((v) => [v, projects.filter((p) => matchesFilters(p, { ...filters, [key]: v })).length]));
  }

  // Only slugs that match a known option are accepted; anything else is treated as "no filter".
  function parseFilters(search, options) {
    const params = new URLSearchParams(search || "");
    const pick = (key) => options[key].find((v) => slugify(v) === params.get(key)) || null;
    return Object.freeze({ track: pick("track"), sponsor: pick("sponsor") });
  }

  function filtersToSearch(filters) {
    const params = new URLSearchParams();
    KEYS.forEach((k) => { if (filters[k]) params.set(k, slugify(filters[k])); });
    const s = params.toString();
    return s ? `?${s}` : "";
  }

  const api = Object.freeze({ slugify, sponsorOf, filterOptions, matchesFilters, optionCounts, parseFilters, filtersToSearch });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ProjectFilter = api;

  if (typeof document === "undefined") return;

  // ---------- Browser wiring ----------
  const LABELS = Object.freeze({ track: "Track", sponsor: "Sponsor" });

  function chip(key, value, label, cls) {
    const swatch = cls ? '<i aria-hidden="true"></i>' : "";
    return `<button type="button" class="chip ${cls || ""}" data-key="${key}" data-value="${root.CapUtils.esc(value)}">` +
      `${swatch}${root.CapUtils.esc(label)} <span class="n"></span></button>`;
  }

  function controlsHTML(options, trackClass) {
    const row = (key) => `<div class="filter-row"><span class="filter-label" id="filter-${key}">${LABELS[key]}</span>` +
      `<div class="chips" role="group" aria-labelledby="filter-${key}">${chip(key, "", "All")}` +
      options[key].map((v) => chip(key, v, v, key === "track" ? trackClass(v) : "")).join("") + "</div></div>";
    return KEYS.map(row).join("") +
      '<p class="filter-status" aria-live="polite"><span></span> <button type="button" class="link-btn" data-clear>Clear filters</button></p>';
  }

  function updateChips(controls, projects, options, filters) {
    KEYS.forEach((key) => {
      const counts = optionCounts(projects, filters, key, options[key]);
      controls.querySelectorAll(`.chip[data-key="${key}"]`).forEach((btn) => {
        const value = btn.dataset.value || null;
        const active = filters[key] === value;
        const n = value ? counts.get(value) : projects.filter((p) => matchesFilters(p, { ...filters, [key]: null })).length;
        btn.setAttribute("aria-pressed", String(active));
        btn.disabled = !active && n === 0;
        btn.querySelector(".n").textContent = n;
      });
    });
  }

  function render(state) {
    const { projects, options, filters, controls, cards, empty } = state;
    const shown = projects.map((p) => matchesFilters(p, filters));
    Array.from(cards.children).forEach((card, i) => { card.hidden = !shown[i]; });
    const count = shown.filter(Boolean).length;
    const active = KEYS.some((k) => filters[k]);
    controls.querySelector(".filter-status span").textContent = `Showing ${count} of ${projects.length} projects`;
    controls.querySelector("[data-clear]").hidden = !active;
    empty.hidden = count > 0;
    updateChips(controls, projects, options, filters);
    syncURL(filters);
  }

  // Best effort: browsers block replaceState on file:// pages, and filtering still works without it.
  function syncURL(filters) {
    try {
      root.history.replaceState(null, "", root.location.pathname + filtersToSearch(filters) + root.location.hash);
    } catch (err) {
      if (err.name !== "SecurityError") throw err;
    }
  }

  // Clicking the active chip again turns that filter off.
  function nextFilters(filters, btn) {
    if (btn.hasAttribute("data-clear")) return NO_FILTERS;
    const key = btn.dataset.key;
    const value = btn.dataset.value || null;
    return Object.freeze({ ...filters, [key]: filters[key] === value ? null : value });
  }

  root.mountProjectFilter = function mountProjectFilter({ projects, trackOrder, trackClass, controls, cards, empty }) {
    const options = filterOptions(projects, trackOrder);
    controls.innerHTML = controlsHTML(options, trackClass);
    let state = { projects, options, controls, cards, empty, filters: parseFilters(root.location.search, options) };
    controls.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || btn.disabled) return;
      state = { ...state, filters: nextFilters(state.filters, btn) };
      render(state);
    });
    render(state);
  };
})(typeof window !== "undefined" ? window : globalThis);
