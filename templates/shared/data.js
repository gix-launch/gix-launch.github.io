// Sample content shared by all three templates.
// Sponsors and projects are FICTIONAL placeholders — replace with this year's real data.
window.CAPSTONE = Object.freeze({
  course: "TECHIN 540",
  program: "UW Global Innovation Exchange",
  year: "2026–27",
  tagline: "What students and sponsors can expect from each other, from kickoff to final showcase.",

  milestones: [
    { date: "2026-10-06", title: "Kickoff & sponsor pitches", owner: "Sponsors", detail: "Sponsors present problem statements (10 min each). Students ask questions and rank their interest." },
    { date: "2026-10-20", title: "Team matching", owner: "Instructors", detail: "Teams of 3–4 are formed and assigned a sponsor. Sponsors receive team rosters and contact info." },
    { date: "2026-11-03", title: "Project charter signed", owner: "Both", detail: "Scope, deliverables, meeting cadence, data access, and IP/NDA terms agreed and signed by sponsor." },
    { date: "2026-12-08", title: "Design review", owner: "Both", detail: "Teams present research findings and a proposed solution. Sponsors give go / adjust feedback." },
    { date: "2027-01-26", title: "Alpha prototype demo", owner: "Students", detail: "First working prototype demonstrating the core interaction or technical pipeline." },
    { date: "2027-03-09", title: "Mid-project review", owner: "Both", detail: "Progress against charter; risks and scope changes are agreed in writing." },
    { date: "2027-04-27", title: "Beta & user testing", owner: "Students", detail: "Feature-complete beta tested with target users; findings shared with sponsor." },
    { date: "2027-06-04", title: "Final showcase & handoff", owner: "Both", detail: "Public showcase, final report, code/docs handoff to sponsor." },
  ],

  sponsors: [
    { name: "Cascade Health Labs", sector: "Digital health", contact: "Product Lead", project: "Remote rehab coach", summary: "A wearable + mobile system that guides post-surgery knee rehabilitation at home and flags missed sessions to clinicians.", skills: ["IoT", "Mobile", "UX research"], team: 4 },
    { name: "Northwind Robotics", sector: "Robotics", contact: "Engineering Manager", project: "Warehouse pick assist", summary: "Vision-based assist for human pickers that highlights the correct bin and verifies picks to cut error rates.", skills: ["Computer vision", "Embedded", "HRI"], team: 4 },
    { name: "Evergreen Energy Co.", sector: "Clean energy", contact: "Innovation Director", project: "Home load forecaster", summary: "Forecast household energy demand from smart-meter data and nudge residents to shift usage off-peak.", skills: ["ML", "Data viz", "Behavior design"], team: 3 },
    { name: "Salish Sea Analytics", sector: "Environmental data", contact: "Chief Scientist", project: "Shoreline sensor network", summary: "Low-power sensor buoys and a dashboard for monitoring water temperature and turbidity along the shoreline.", skills: ["Hardware", "LoRa", "Dashboards"], team: 4 },
    { name: "Pike Street Retail Tech", sector: "Retail", contact: "VP of Stores", project: "Smart shelf restock", summary: "Detect low-stock shelves from existing cameras and route restock tasks to associates in real time.", skills: ["Edge AI", "Systems", "Service design"], team: 3 },
    { name: "Rainier Mobility", sector: "Transportation", contact: "Program Manager", project: "Accessible transit wayfinding", summary: "Indoor/outdoor wayfinding for transit riders with low vision, combining audio cues and haptics.", skills: ["Accessibility", "AR/Audio", "Prototyping"], team: 4 },
  ],

  expectations: {
    students: [
      "Send an agenda 24 hours before every sponsor meeting.",
      "Share meeting notes and action items within 24 hours.",
      "Submit a short status report every two weeks.",
      "Raise risks and scope changes early — never surprise the sponsor at a review.",
      "Treat sponsor data and IP according to the signed charter and NDA.",
    ],
    sponsors: [
      "Name one primary contact who can commit ~1–2 hours per week.",
      "Hold a 30-minute check-in with the team every one to two weeks.",
      "Provide data, hardware, or system access agreed in the charter by Nov 3.",
      "Respond to questions and deliverables within 5 business days.",
      "Attend the Design Review, Mid-project Review, and Final Showcase.",
      "Complete a short evaluation of the team at mid-point and end.",
    ],
  },

  assignments: [
    { name: "Project charter", due: "2026-11-03", weight: 10, sponsorRole: "Sign-off", description: "Problem statement, scope, deliverables, success metrics, communication plan." },
    { name: "Design review", due: "2026-12-08", weight: 15, sponsorRole: "Feedback", description: "Research synthesis, concept options, chosen direction, technical plan." },
    { name: "Alpha prototype", due: "2027-01-26", weight: 15, sponsorRole: "Optional demo", description: "Working prototype of core functionality with a demo video." },
    { name: "Mid-project review", due: "2027-03-09", weight: 15, sponsorRole: "Feedback + evaluation", description: "Progress report, updated plan, risk log, revised scope if needed." },
    { name: "Beta & user testing", due: "2027-04-27", weight: 15, sponsorRole: "Feedback", description: "Feature-complete beta, test protocol, findings, and iteration plan." },
    { name: "Final showcase & report", due: "2027-06-04", weight: 20, sponsorRole: "Attend + evaluation", description: "Public demo, poster, final report, and documented handoff package." },
    { name: "Sponsor & peer evaluation", due: "2027-06-06", weight: 10, sponsorRole: "Evaluation", description: "Combined sponsor rating and confidential peer evaluations." },
  ],

  rubricLevels: ["Exemplary", "Proficient", "Developing", "Beginning"],
  rubric: [
    { criterion: "Problem framing", weight: 15, levels: [
      "Insightful, evidence-based framing that reshapes the sponsor's view of the problem.",
      "Clear problem grounded in research with defined users and success metrics.",
      "Problem stated but evidence or metrics are thin.",
      "Problem unclear or copied from the sponsor brief without analysis." ] },
    { criterion: "Technical execution", weight: 25, levels: [
      "Robust, well-architected solution that exceeds charter scope.",
      "Working solution meets charter deliverables with sound engineering.",
      "Partially working; key features fragile or missing.",
      "Prototype does not demonstrate the core function." ] },
    { criterion: "User-centered design", weight: 20, levels: [
      "Multiple rounds of testing with real users clearly drive design decisions.",
      "At least one round of user testing informs iteration.",
      "Limited testing; decisions mostly by assumption.",
      "No meaningful user input." ] },
    { criterion: "Sponsor communication", weight: 15, levels: [
      "Proactive, professional, sponsor reports high confidence throughout.",
      "Consistent agendas, notes, and status reports; issues raised promptly.",
      "Irregular communication; some surprises at reviews.",
      "Sponsor frequently uninformed or meetings missed." ] },
    { criterion: "Teamwork & process", weight: 10, levels: [
      "Equitable contribution, clear roles, excellent project management.",
      "Roles defined; tasks tracked; minor imbalances resolved.",
      "Uneven contribution or loosely tracked work.",
      "Significant conflict or disengagement unaddressed." ] },
    { criterion: "Presentation & documentation", weight: 15, levels: [
      "Compelling story; handoff docs let sponsor continue the work immediately.",
      "Clear presentation; complete report and code documentation.",
      "Presentation or docs missing important pieces.",
      "Disorganized; sponsor cannot use the handoff." ] },
  ],
});
