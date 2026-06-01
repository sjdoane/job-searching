import type { Project } from "./types";

/**
 * Projects — ordered for a balanced, multidisciplinary read. The first six are
 * featured (each gets a detail page); the rest fill the "More work" grid.
 *
 * Accuracy guardrails honored here (do not loosen):
 *  - SEA-Quadruped: honest ~8.5 cm open-loop sim jump (NOT 15 cm); designed +
 *    simulation-validated, not yet fully assembled; "MuJoCo MJX + Brax PPO"; FEA
 *    on the springs is included (owner-confirmed).
 *  - DJ Mixer: "real-time / low-latency" — the "<50 ms" figure is unverified, so
 *    it is intentionally NOT stated as a number here.
 *  - Pendulum: Sam is credited for CAD + all 3D printing + analysis/sim/writeup.
 *  - KalshiBot / pit-backtest: framed as research methodology + engineering,
 *    never as profitable strategies.
 *  - ADAProsthetics: $125K prize; 1 of 6 finalists from 90+ teams.
 */
export const projects: Project[] = [
  // ───────────────────────────── Featured ─────────────────────────────
  {
    slug: "adaprosthetics",
    name: "ADAProsthetics",
    tagline: "Adjustable pediatric prosthetic — venture-pitch finalist",
    year: "2023 – Present",
    role: "Co-Leader · Lead CAD & Product Design",
    org: "USC MEDesign",
    pillars: ["Venture", "Product", "Mechanical"],
    tech: ["SolidWorks", "Fusion 360", "Machining", "NSF I-Corps", "Customer Discovery"],
    featured: true,
    summary:
      "An adjustable lower-limb prosthetic for growing pediatric amputees, designed to cut the cost and clinic visits of constant replacements. One of 6 finalists from 90+ teams in USC's $125K Maseeh Entrepreneurship Prize.",
    problem:
      "Pediatric amputees outgrow prosthetics quickly, forcing frequent, expensive replacements and prosthetist visits. ADAProsthetics is an adjustable mechanism — compatible with standard industry adapters — that lets a prosthetic grow with the child in 0.13-inch increments, extending usable life and lowering treatment cost.",
    contributions: [
      "Co-led the project and owned all CAD and product design across two years and multiple prototype iterations — the adjustment mechanisms in SolidWorks and a prosthetic foot in Fusion 360.",
      "Designed and machined functional prototypes on a lathe and drill press; presented to the USC Board of Councilors.",
      "Ran 60+ customer-discovery interviews (patients, prosthetists, manufacturers, angel investors) using NSF I-Corps methodology to validate pain points and product-market fit.",
      "Translated interview findings into the design direction and an ISO-compliant testing plan.",
    ],
    highlights: [
      "Adapter-compatible mechanism with 0.13-inch adjustment resolution.",
      "Recognized by prosthetists, professors, and venture investors.",
    ],
    metrics: [
      { value: "1 of 6", label: "finalists from 90+ teams" },
      { value: "$125K", label: "Maseeh Prize competition" },
      { value: "60+", label: "customer-discovery interviews" },
    ],
    links: [],
  },
  {
    slug: "sea-quadruped",
    name: "SEA Quadruped",
    tagline: "RL jumping robot with series-elastic knees",
    year: "2026",
    role: "Sole Author · AME 456 Capstone",
    org: "USC",
    pillars: ["Robotics", "AI/ML"],
    tech: ["MuJoCo MJX", "Brax PPO", "JAX", "Python", "FEA", "3D Printing"],
    featured: true,
    summary:
      "A ~0.64 kg 3D-printed quadruped that stores energy in torsion-spring 'series-elastic' knees to jump with weak servos, taught to jump by a PPO policy in MuJoCo MJX. The headline work: catching and fixing a simulator exploit that was inflating the policy's jump height.",
    problem:
      "The robot's servos (1.4 N·m stall, 5.97 rad/s no-load) are far too weak to launch the body directly — peak jump power exceeds the motor's continuous rating several times over. The fix is biological: put a torsion spring in series at each knee, wind energy into it during a crouch, and release it explosively, the same power-amplification trick used by fleas and the MIT Cheetah.",
    contributions: [
      "Designed the quadruped (MuJoCo MJCF model, leg and series-elastic-spring geometry) and built the full simulation and training pipeline.",
      "Trained a PPO jumping policy in MuJoCo MJX (Brax PPO, 1,024 parallel GPU environments, 50M steps) for repeatable pogo-stick jumps.",
      "Performed FEA on the torsion springs — loads, displacement, spring constant — to size the series-elastic elements.",
      "Diagnosed a simulator reward-hacking exploit (the policy drove joints at 3.46× the motor's real no-load speed to fake height) and eliminated it three ways: one-sided backdrive damping, a 20× stronger action-smoothness penalty, and a 5 Hz action low-pass filter.",
    ],
    highlights: [
      "Energy-based series-elastic model (Pratt & Williamson dynamics) with a per-stiffness deflection limit; swept spring stiffness to find the stability/height optimum.",
      "A research log of 14+ failed training runs, each fixing a distinct physics bug — intellectual honesty as an engineering discipline.",
    ],
    metrics: [
      { value: "~8.5 cm", label: "honest open-loop sim jump" },
      { value: "3.46×", label: "reward-hack overspeed caught & fixed" },
      { value: "50M", label: "PPO steps · 1,024 parallel envs" },
    ],
    status:
      "Designed and simulation-validated with a sim-to-real deployment plan; the physical robot is not yet fully assembled.",
    links: [{ label: "GitHub", href: "https://github.com/sjdoane/SEA-Quadruped" }],
  },
  {
    slug: "pit-backtest",
    name: "PIT Backtesting Framework",
    tagline: "Research-grade U.S.-equity backtester",
    year: "2026",
    role: "Sole Author · Personal Project",
    pillars: ["Quant"],
    tech: ["Python", "Polars", "NumPy", "mypy-strict", "pytest"],
    featured: true,
    summary:
      "A U.S.-equity backtesting framework built to show four research-grade properties working together: structural point-in-time data discipline, combinatorial purged cross-validation, deflated-Sharpe multiple-testing correction, and Almgren-calibrated transaction-cost realism.",
    problem:
      "Most open-source backtesters either permit lookahead bias by convention rather than by construction, or overstate returns by under-modeling execution costs. PIT is an opinionated response: an event-driven daily-bar engine where common leakage patterns are hard to write, where the default scorecard is the López de Prado chapter-14 analytics rather than a bare Sharpe, and where the default cost model is Almgren-2005 square-root impact with mandatory sensitivity bands.",
    contributions: [
      "Implemented combinatorial purged cross-validation (purge + embargo), the Probabilistic and Deflated Sharpe Ratios, and Minimum Track Record Length — reproducing the Bailey–López de Prado (2014) worked example to 1e-3.",
      "Built a structural point-in-time data layer: dual-timestamp records, persistent-identifier resolution, point-in-time S&P 500 membership, corporate-action and delisting handling, and a lookahead-leak guard.",
      "Modeled transaction costs with an Almgren-2005 square-root market-impact model and required sensitivity bands on every report.",
      "Drove the project through a 15-entry architecture-decision record, self-correcting a propagated numerical error in the deflated-Sharpe reference value.",
    ],
    highlights: [
      "Polars end-to-end and mypy-strict across ~64 modules; statistics hand-implemented with no scipy (inverse-normal CDF via the Acklam approximation to ~1e-9).",
      "Honest about trust boundaries — enumerates remaining leakage vectors rather than claiming leakage is impossible.",
    ],
    metrics: [
      { value: "~630", label: "passing tests · mypy-strict" },
      { value: "1e-3", label: "match to the published Deflated Sharpe" },
      { value: "CPCV", label: "+ Deflated Sharpe + Almgren costs" },
    ],
    status:
      "Research framework / infrastructure — engine, validation, cost, and data layers built and tested; a full strategy worked-study is the remaining milestone. Tooling, not a profitable strategy.",
    links: [{ label: "GitHub", href: "https://github.com/sjdoane/pit-backtest" }],
  },
  {
    slug: "achordion",
    name: "A(Chord)ion",
    tagline: "An electronic accordion built from scratch",
    year: "2025 – Present",
    role: "Mechanical Lead · USC Makers",
    pillars: ["Mechanical", "Product"],
    tech: ["Siemens NX", "Sensor Integration", "Ultrasonic (HC-SR04)", "Fabrication", "Embedded"],
    featured: true,
    summary:
      "A working electronic accordion built from scratch for under $50 — a full mechanical system in Siemens NX, an ultrasonic 'bellows' squeeze sensor, and a live demo on Qualcomm hardware. I owned the mechanical design and sensor integration.",
    problem:
      "A maker-team instrument that recreates accordion playing without traditional reeds and bellows: sing a pitch and the system detects it and voices a chord, while an ultrasonic sensor reads the squeeze of the bellows to control expression and volume.",
    contributions: [
      "Designed the complete mechanical system from scratch in Siemens NX — housing, collapsible bellows with a custom hinge, and piano-key assembly — fabricated from ABS and ripstop nylon for under $50.",
      "Led sensor integration: mapped an HC-SR04 ultrasonic transducer into a real-time bellows-velocity → volume-expression pipeline (median filtering, smoothed velocity estimation, hysteresis deadband).",
      "Built modular, detachable housings for PCBs, sensors, and wiring across both sides of the instrument.",
      "Collaborated with EE/CS teammates on system integration (FFT pitch detection) and presented a live demo to a board of Qualcomm engineers.",
    ],
    highlights: [
      "Eight chord types; ultrasonic distance → velocity → expression mapping with jitter rejection on a Raspberry Pi / Qualcomm single-board computer.",
    ],
    metrics: [
      { value: "<$50", label: "in materials, built from scratch" },
      { value: "Qualcomm", label: "live hardware demo" },
    ],
    links: [{ label: "GitHub", href: "https://github.com/frawgmanman/a-chord-ion" }],
  },
  {
    slug: "dj-mixer",
    name: "Gesture-Controlled DJ Mixer",
    tagline: "A webcam becomes a contactless DJ controller",
    year: "2025",
    role: "Computer-Vision & Gesture Pipeline",
    org: "USC SEP Hackathon · a16z-sponsored",
    pillars: ["AI/ML", "Product"],
    tech: ["MediaPipe", "TypeScript", "React", "Tone.js", "Web Audio"],
    featured: true,
    summary:
      "A browser turns a webcam into a contactless dual-deck DJ controller: MediaPipe tracks both hands, a five-mode gesture state machine classifies postures into DJ commands, and a Web-Audio engine performs real-time multi-stem mixing. I built the computer-vision and gesture-recognition pipeline.",
    problem:
      "DJ equipment is expensive and physical. This project lets any laptop with a webcam act as a dual-deck mixer — each hand drives a deck, and gestures map to play/pause, tempo, filter sweeps, stem toggles, and crossfades.",
    contributions: [
      "Built the computer-vision pipeline with Google MediaPipe (two hands, 21 landmarks each) feeding a five-mode gesture state machine — transport, pinch-2D, stems, blend, idle — with priority arbitration.",
      "Engineered a scale-invariant recognition pipeline: hand-relative coordinate normalization, pinch hysteresis, EMA smoothing, and rate limiting for stable, jitter-free real-time control.",
      "Drove real-time dual-deck mixing — multi-stem playback, dynamic EQ filter sweeps (400–8000 Hz), equal-power crossfades, and tempo control (0.8×–1.2×).",
    ],
    highlights: [
      "Decoupled the CV subsystem from the audio/UI layer via a typed event bus — enabling clean two-person parallel development.",
    ],
    metrics: [
      { value: "2 hands", label: "21 landmarks each · MediaPipe" },
      { value: "5 modes", label: "gesture classifier" },
      { value: "real-time", label: "gesture → audio control" },
    ],
    links: [{ label: "GitHub", href: "https://github.com/mhrmich/Tech_Week" }],
  },
  {
    slug: "kineticlip",
    name: "KinetiClip",
    tagline: "Wearable gait analysis for post-ACL recovery",
    year: "2025",
    role: "Hardware & Sensor Fusion",
    org: "USC ASBME Makeathon",
    pillars: ["Mechanical", "AI/ML"],
    tech: ["Arduino", "C++", "9-axis IMU", "Sensor Fusion", "SolidWorks", "3D Printing"],
    featured: true,
    summary:
      "Wearable IMU clips that quantify gait asymmetry and toe-out angle for post-ACL-reconstruction recovery — a low-cost alternative to lab motion capture. Built in a hackathon: 3D-printed housings, 9-axis IMUs, and a C++ sensor-fusion pipeline.",
    problem:
      "Gait abnormalities linger 6–12 months after ACL surgery, but lab motion-capture is expensive and inaccessible. KinetiClip gives physical therapists quantitative gait metrics from cheap, clip-on wearable sensors.",
    contributions: [
      "Built an Arduino-based motion-tracking system with custom 3D-printed clips (both hips and the affected heel), each housing a 9-axis IMU; designed the housings in SolidWorks.",
      "Implemented a C++ sensor-fusion pipeline at 20 Hz — zero-voltage calibration (100-sample averaging), 5-sample moving-average filtering, and ±0.5°/s deadband thresholding to suppress gyro drift.",
      "Computed toe-out angle by numerically integrating the differential angular velocity between heel- and pelvis-mounted gyros, plus a stride-based gait symmetry index.",
    ],
    highlights: [
      "Overflow-protected numerical integration; stride detection via sign changes in hip-pitch rate.",
    ],
    metrics: [
      { value: "20 Hz", label: "real-time sensor fusion" },
      { value: "9-axis", label: "IMU per clip (×3)" },
      { value: "±0.5°/s", label: "drift-killing deadband" },
    ],
    links: [],
  },

  // ───────────────────────────── More work ─────────────────────────────
  {
    slug: "kalshibot",
    name: "Kalshi Trading Bot",
    tagline: "Prediction-market quant research system",
    year: "2026",
    role: "Personal Project",
    pillars: ["Quant", "AI/ML"],
    tech: ["Python", "scikit-learn", "RSA-PSS API", "Backtesting"],
    featured: false,
    summary:
      "A ~16k-LOC quant research system for Kalshi prediction markets: a literature-grounded pipeline with pre-registered out-of-sample gates, a live execution harness with a persisted kill-switch, and disciplined, honest strategy kills. A research-methodology and engineering story — not a profitable bot.",
    metrics: [
      { value: "~16k LOC", label: "+ ~600 tests" },
      { value: "15+", label: "research rounds, honestly killed" },
    ],
    status: "In progress · framed as research discipline and engineering.",
    links: [{ label: "GitHub", href: "https://github.com/sjdoane/KalshiBot" }],
  },
  {
    slug: "pendulum-drag",
    name: "Pendulum Drag Extraction",
    tagline: "Drag coefficients from a sub-$100 pendulum",
    year: "2026",
    role: "USC AME 341b",
    pillars: ["Quant", "Mechanical"],
    tech: ["MATLAB", "Nonlinear Least-Squares", "CAD", "3D Printing", "Arduino DAQ"],
    featured: false,
    summary:
      "A free-decay pendulum that extracts bluff-body drag coefficients by fitting a nested four-model damping hierarchy (MATLAB nonlinear least-squares) to encoder-measured swing decay — within ~3% of literature — then feeds them into a rocket-reentry stabilization simulation. I did the CAD and all 3D printing, the drag-extraction analysis, the reentry simulation, and the writeup.",
    metrics: [
      { value: "~3%", label: "of literature drag coefficients" },
      { value: "<1%", label: "apparatus validation error" },
    ],
    links: [{ label: "GitHub", href: "https://github.com/sjdoane/pendulum-drag-extraction" }],
  },
  {
    slug: "reward-sculptor",
    name: "Reward Sculptor",
    tagline: "An LLM agent that rewrites RL reward functions",
    year: "2025",
    role: "Personal Project",
    pillars: ["AI/ML"],
    tech: ["Python", "Claude API", "FastAPI", "React", "Knowledge Graph"],
    featured: false,
    summary:
      "An autonomous agent that improves reinforcement-learning reward functions in a closed loop — train, diagnose the failure with an LLM, retrieve a fix from a knowledge graph of RL papers, rewrite the reward — where every edit cites the arXiv paper that justified it. Wrapped in a FastAPI + React control panel.",
    metrics: [{ value: "60+", label: "tests; verified end-to-end on Hopper-v4" }],
    links: [{ label: "GitHub", href: "https://github.com/sjdoane/RL-Sculptor" }],
  },
  {
    slug: "fungi-classification",
    name: "Fungi Image Classification",
    tagline: "Transfer learning across 5 CNN backbones",
    year: "2025",
    role: "USC Coursework",
    pillars: ["AI/ML"],
    tech: ["Keras", "PyTorch", "ResNet", "Transfer Learning"],
    featured: false,
    summary:
      "A controlled transfer-learning study fine-tuning five ImageNet CNN backbones (ResNet50/101, EfficientNetB0, DenseNet201, VGG16) on ~9,100 microscopic fungi images, with a memory-efficient data pipeline and mixed-precision GPU training. ResNet50 won at test macro-F1 0.89 and AUC 0.98.",
    metrics: [
      { value: "0.8921", label: "test macro-F1 (ResNet50)" },
      { value: "0.9755", label: "AUC" },
    ],
    links: [{ label: "GitHub", href: "https://github.com/sjdoane/image-classification" }],
  },
  {
    slug: "combat-robot",
    name: "Combat Robot",
    tagline: "Fabricated under a strict weight budget",
    year: "2026 – Present",
    role: "USC Advanced Robotics Combat",
    pillars: ["Mechanical", "Robotics"],
    tech: ["CAD", "Machining", "Additive Manufacturing"],
    featured: false,
    summary:
      "Designed and fabricated a combat robot within a strict weight budget, iterating chassis geometry across multiple prototypes — mill, lathe, additive manufacturing — to balance impact survivability against weight.",
    links: [],
  },
  {
    slug: "music-dna",
    name: "Music DNA",
    tagline: "Full-stack music-taste app with an LLM",
    year: "2025",
    role: "Personal Project",
    pillars: ["Product", "AI/ML"],
    tech: ["React", "Vite", "Claude API", "Spotify OAuth"],
    featured: false,
    summary:
      "A React/Vite web app that ingests Spotify/Apple Music library exports (custom multi-format CSV/JSON parsers), computes shared-song overlap and a genre 'Music DNA' profile against a 2,700-song library, and uses the Claude API to recommend albums bridging two listeners' tastes.",
    metrics: [{ value: "2,700+", label: "song library analyzed" }],
    links: [{ label: "GitHub", href: "https://github.com/sjdoane/music-dna" }],
  },
  {
    slug: "syllabus-to-calendar",
    name: "Syllabus → Calendar",
    tagline: "PDF syllabi to Google Calendar via Claude",
    year: "2025",
    role: "Personal Project",
    pillars: ["AI/ML", "Product"],
    tech: ["Python", "Claude API", "pdfplumber", "Google Calendar API"],
    featured: false,
    summary:
      "A Python CLI that reads course-syllabus PDFs (pdfplumber with an OCR fallback), uses Claude to extract every dated deliverable into structured JSON, and creates Google Calendar events with reminders — hardened with schema-constrained prompting and a human-in-the-loop review step.",
    links: [{ label: "GitHub", href: "https://github.com/sjdoane/syllabus-to-calendar" }],
  },
  {
    slug: "powerplant-regression",
    name: "Power-Plant Energy Regression",
    tagline: "OLS / KNN regression on 9,568 records",
    year: "2025",
    role: "USC DSCI-552",
    pillars: ["Quant", "AI/ML"],
    tech: ["Python", "scikit-learn", "Regression"],
    featured: false,
    summary:
      "Built and tuned OLS, polynomial, and KNN regression models on 9,568 power-plant records; a tuned KNN (k=4) reached test MSE 14.07, beating the best linear model, with OLS R² of 0.929.",
    metrics: [{ value: "0.929", label: "OLS R²" }],
    links: [{ label: "GitHub", href: "https://github.com/sjdoane/powerplant-energy-ml-regression" }],
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
export const moreProjects = projects.filter((p) => !p.featured);

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
