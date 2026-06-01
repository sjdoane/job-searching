/**
 * Identity, education, skills, and contact — all public-appropriate.
 * GPA, honors, and education are verified facts; no salary/location preferences
 * or any job-search internals appear here.
 */

export const profile = {
  name: "Samuel Doane",
  location: "Los Angeles, CA",
  eyebrow: "Mechanical · Robotics · AI/ML · Quant",

  // Hero — the headline renders as two parts; the second is accented.
  headlineLead: "Engineer-builder spanning",
  headlineAccent: "mechanical design, robotics, AI/ML, and quant.",
  intro:
    "USC Mechanical Engineering (B.S.) and a M.S. in AI/ML. I take ideas from CAD and machined hardware to reinforcement-learning robots, real-time computer vision, and research-grade quantitative tooling — end to end, and I keep the numbers honest.",

  about: [
    "I'm a USC engineer finishing a B.S. in Mechanical Engineering and a M.S. in Artificial Intelligence & Machine Learning. My work lives at the seams between disciplines: I design and machine real hardware, train reinforcement-learning policies and computer-vision systems, and build research-grade quantitative tooling.",
    "That range shows up in what I build — an adjustable pediatric prosthetic that reached the finals of a $125K venture competition; a series-elastic jumping robot where the hardest engineering was catching the simulator cheating its own reward; a research-grade equity backtester with combinatorial purged cross-validation and ~630 tests. I like problems that need both a wrench and a model.",
    "Across three internships I've moved from product development at a Series-C medical-device company, to investment analysis at an early-stage VC, to incoming technology & management consulting — a deliberately cross-disciplinary path. I care about rigor, intellectual honesty, and building things that hold up under scrutiny.",
  ],
} as const;

export const education = {
  school: "University of Southern California",
  location: "Los Angeles, CA",
  dates: "Aug 2023 – May 2027",
  degrees: [
    { degree: "B.S. Mechanical Engineering", detail: "GPA 3.93 / 4.0" },
    {
      degree: "M.S. Artificial Intelligence & Machine Learning",
      detail: "GPA 4.0 / 4.0",
    },
  ],
  honors: ["Presidential Scholarship", "6× Dean's List"],
  coursework: [
    "Machine Learning",
    "Bio-Inspired Robotics",
    "Mechatronics",
    "CAD",
    "Electronics & Wearables",
    "Heat Transfer",
    "Fluid Dynamics",
  ],
} as const;

export interface SkillGroup {
  title: string;
  skills: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    title: "Mechanical & Hardware",
    skills: [
      "SolidWorks",
      "Siemens NX",
      "Fusion 360",
      "Finite Element Analysis",
      "3D Printing",
      "CNC · Lathe · Mill",
      "Mechatronics",
      "Sensor Integration",
      "Arduino / C++",
    ],
  },
  {
    title: "AI / ML",
    skills: [
      "Python",
      "PyTorch & Keras",
      "Reinforcement Learning (PPO)",
      "Computer Vision",
      "MuJoCo MJX",
      "scikit-learn",
      "Transfer Learning",
    ],
  },
  {
    title: "Quant & Analysis",
    skills: [
      "Backtesting",
      "Combinatorial Purged CV",
      "Time-Series Analysis",
      "Market-Impact Modeling",
      "MATLAB",
      "Statistics",
      "Design of Experiments",
      "NumPy / Polars",
    ],
  },
  {
    title: "Product & Venture",
    skills: [
      "Product Strategy",
      "User Research",
      "Human-Centered Design",
      "Customer Discovery (NSF I-Corps)",
      "Rapid Prototyping",
      "Technical Communication",
    ],
  },
];

export const socials = {
  email: "sjdoane@usc.edu",
  linkedin: "https://www.linkedin.com/in/samdoane",
  github: "https://github.com/sjdoane",
} as const;

export const siteUrl = "https://www.samueldoaneportfolio.com";
