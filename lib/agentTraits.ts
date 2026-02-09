// Agent Traits System — Big Five (OCEAN) Personality with MBTI Derivation

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PersonalityScores {
  openness: number; // 0-100
  conscientiousness: number; // 0-100
  extraversion: number; // 0-100
  agreeableness: number; // 0-100
  neuroticism: number; // 0-100
}

export type DimensionKey = keyof PersonalityScores;

export interface AgentTraitData {
  personality: string; // Derived MBTI type (e.g., "INTJ") or legacy personality ID
  personalityScores?: PersonalityScores; // Big Five scores; missing on legacy agents
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

// ── Big Five Dimension Metadata ────────────────────────────────────────────────

export const DIMENSIONS: {
  id: DimensionKey;
  name: string;
  shortName: string;
  description: string;
  lowLabel: string;
  highLabel: string;
}[] = [
  {
    id: "openness",
    name: "Openness",
    shortName: "O",
    description: "Imagination, creativity, intellectual curiosity",
    lowLabel: "Conventional",
    highLabel: "Inventive",
  },
  {
    id: "conscientiousness",
    name: "Conscientiousness",
    shortName: "C",
    description: "Discipline, organization, reliability",
    lowLabel: "Spontaneous",
    highLabel: "Disciplined",
  },
  {
    id: "extraversion",
    name: "Extraversion",
    shortName: "E",
    description: "Social energy, assertiveness, enthusiasm",
    lowLabel: "Reserved",
    highLabel: "Outgoing",
  },
  {
    id: "agreeableness",
    name: "Agreeableness",
    shortName: "A",
    description: "Cooperation, trust, empathy, warmth",
    lowLabel: "Skeptical",
    highLabel: "Trusting",
  },
  {
    id: "neuroticism",
    name: "Neuroticism",
    shortName: "N",
    description: "Emotional reactivity, anxiety, moodiness",
    lowLabel: "Resilient",
    highLabel: "Reactive",
  },
];

// ── MBTI Types (16 types) ──────────────────────────────────────────────────────

export const MBTI_TYPES = {
  INTJ: {
    id: "INTJ",
    name: "The Architect",
    description: "Strategic, independent, analytical mastermind",
    icon: "🏛️",
    color: "#8b5cf6",
  },
  INTP: {
    id: "INTP",
    name: "The Logician",
    description: "Innovative, curious, logical theorist",
    icon: "🧪",
    color: "#6366f1",
  },
  ENTJ: {
    id: "ENTJ",
    name: "The Commander",
    description: "Bold, strategic, natural-born leader",
    icon: "👑",
    color: "#ef4444",
  },
  ENTP: {
    id: "ENTP",
    name: "The Debater",
    description: "Smart, curious, intellectual challenger",
    icon: "⚡",
    color: "#f59e0b",
  },
  INFJ: {
    id: "INFJ",
    name: "The Advocate",
    description: "Insightful, principled, compassionate visionary",
    icon: "🌙",
    color: "#10b981",
  },
  INFP: {
    id: "INFP",
    name: "The Mediator",
    description: "Idealistic, empathetic, creative dreamer",
    icon: "🌸",
    color: "#ec4899",
  },
  ENFJ: {
    id: "ENFJ",
    name: "The Protagonist",
    description: "Charismatic, inspiring, natural mentor",
    icon: "🌟",
    color: "#14b8a6",
  },
  ENFP: {
    id: "ENFP",
    name: "The Campaigner",
    description: "Enthusiastic, creative, sociable free spirit",
    icon: "🎨",
    color: "#f97316",
  },
  ISTJ: {
    id: "ISTJ",
    name: "The Logistician",
    description: "Practical, reliable, duty-bound organizer",
    icon: "📋",
    color: "#64748b",
  },
  ISFJ: {
    id: "ISFJ",
    name: "The Defender",
    description: "Dedicated, warm, protective guardian",
    icon: "🛡️",
    color: "#22c55e",
  },
  ESTJ: {
    id: "ESTJ",
    name: "The Executive",
    description: "Organized, dedicated, strong-willed administrator",
    icon: "📊",
    color: "#0ea5e9",
  },
  ESFJ: {
    id: "ESFJ",
    name: "The Consul",
    description: "Caring, sociable, community-minded helper",
    icon: "🤝",
    color: "#06b6d4",
  },
  ISTP: {
    id: "ISTP",
    name: "The Virtuoso",
    description: "Practical, observant, hands-on problem solver",
    icon: "🔧",
    color: "#84cc16",
  },
  ISFP: {
    id: "ISFP",
    name: "The Adventurer",
    description: "Flexible, charming, artistic explorer",
    icon: "🎭",
    color: "#a855f7",
  },
  ESTP: {
    id: "ESTP",
    name: "The Entrepreneur",
    description: "Energetic, perceptive, action-oriented risk-taker",
    icon: "🎯",
    color: "#dc2626",
  },
  ESFP: {
    id: "ESFP",
    name: "The Entertainer",
    description: "Spontaneous, energetic, fun-loving performer",
    icon: "🎪",
    color: "#e879f9",
  },
} as const;

export type MBTIType = keyof typeof MBTI_TYPES;

// ── Legacy Personality Mapping (for backward compatibility) ────────────────────

const LEGACY_PERSONALITIES: Record<
  string,
  { id: string; name: string; icon: string; color: string; description: string }
> = {
  analytical: {
    id: "analytical",
    name: "Analytical",
    icon: "🧠",
    color: "#3b82f6",
    description: "Methodical and data-driven approach",
  },
  creative: {
    id: "creative",
    name: "Creative",
    icon: "🎨",
    color: "#ec4899",
    description: "Innovative and imaginative thinking",
  },
  strategic: {
    id: "strategic",
    name: "Strategic",
    icon: "♟️",
    color: "#8b5cf6",
    description: "Long-term planning and foresight",
  },
  empathetic: {
    id: "empathetic",
    name: "Empathetic",
    icon: "💚",
    color: "#10b981",
    description: "Understanding and emotional intelligence",
  },
  decisive: {
    id: "decisive",
    name: "Decisive",
    icon: "⚡",
    color: "#f59e0b",
    description: "Quick judgment and action-oriented",
  },
  curious: {
    id: "curious",
    name: "Curious",
    icon: "🔍",
    color: "#06b6d4",
    description: "Always exploring and questioning",
  },
  pragmatic: {
    id: "pragmatic",
    name: "Pragmatic",
    icon: "🎯",
    color: "#84cc16",
    description: "Practical and results-focused",
  },
  visionary: {
    id: "visionary",
    name: "Visionary",
    icon: "🚀",
    color: "#a855f7",
    description: "Forward-thinking and ambitious",
  },
  diplomatic: {
    id: "diplomatic",
    name: "Diplomatic",
    icon: "🤝",
    color: "#14b8a6",
    description: "Balanced and consensus-building",
  },
  maverick: {
    id: "maverick",
    name: "Maverick",
    icon: "🔥",
    color: "#ef4444",
    description: "Unconventional and rule-breaking",
  },
};

// ── Rarity Configuration ───────────────────────────────────────────────────────

export const RARITIES = {
  common: {
    name: "Common",
    color: "#9ca3af",
    chance: 0.45,
    betaAlpha: 3,
    betaBeta: 3, // Scores cluster 35-65 — unremarkable
  },
  uncommon: {
    name: "Uncommon",
    color: "#22c55e",
    chance: 0.3,
    betaAlpha: 2,
    betaBeta: 2, // Wider spread, 25-75
  },
  rare: {
    name: "Rare",
    color: "#3b82f6",
    chance: 0.15,
    betaAlpha: 1.5,
    betaBeta: 1.5, // Noticeable peaks and valleys
  },
  epic: {
    name: "Epic",
    color: "#a855f7",
    chance: 0.08,
    betaAlpha: 0.8,
    betaBeta: 0.8, // Polarized, dramatic profiles
  },
  legendary: {
    name: "Legendary",
    color: "#f59e0b",
    chance: 0.02,
    betaAlpha: 0.5,
    betaBeta: 0.5, // Extreme min/max specialists
  },
} as const;

// ── Agent Name Generation ──────────────────────────────────────────────────────

export const NAME_PREFIXES = [
  "Neo",
  "Cyber",
  "Quantum",
  "Neural",
  "Hyper",
  "Meta",
  "Alpha",
  "Omega",
  "Nova",
  "Apex",
  "Zenith",
  "Prism",
  "Vector",
  "Matrix",
  "Nexus",
  "Vortex",
  "Echo",
  "Flux",
  "Pulse",
  "Arc",
  "Spark",
  "Blaze",
  "Storm",
  "Shadow",
  "Titan",
  "Atlas",
  "Phoenix",
  "Hydra",
  "Onyx",
  "Jade",
  "Ruby",
  "Sapphire",
];

export const NAME_SUFFIXES = [
  "AI",
  "Bot",
  "Agent",
  "Mind",
  "Core",
  "Node",
  "Unit",
  "Proto",
  "X",
  "Prime",
  "One",
  "Zero",
  "Max",
  "Ultra",
  "Plus",
  "Pro",
  "Sync",
  "Link",
  "Net",
  "Hub",
  "Forge",
  "Labs",
  "Tech",
  "Logic",
  "Byte",
  "Bit",
  "Data",
  "Code",
  "Algo",
  "Chain",
  "Block",
  "Hash",
];

// ── RNG Engine ─────────────────────────────────────────────────────────────────

/** Box-Muller transform for standard normal distribution */
function normalRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Marsaglia-Tsang method for Gamma distribution */
function gammaRandom(shape: number): number {
  if (shape < 1) {
    // For shape < 1, use the relation: Gamma(a) = Gamma(a+1) * U^(1/a)
    return gammaRandom(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (;;) {
    let x: number;
    let v: number;

    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Beta distribution using Gamma variates */
function betaRandom(alpha: number, beta: number): number {
  const x = gammaRandom(alpha);
  const y = gammaRandom(beta);
  return x / (x + y);
}

/** Gaussian noise for backfill migration */
export function gaussianNoise(stddev: number): number {
  return normalRandom() * stddev;
}

// ── MBTI Derivation ────────────────────────────────────────────────────────────

/** Derive a 4-letter MBTI type from Big Five personality scores */
export function deriveMBTI(scores: PersonalityScores): MBTIType {
  const e_i = scores.extraversion >= 50 ? "E" : "I";
  const n_s = scores.openness >= 50 ? "N" : "S";
  const t_f = scores.agreeableness >= 50 ? "F" : "T";
  const j_p = scores.conscientiousness >= 50 ? "J" : "P";
  return `${e_i}${n_s}${t_f}${j_p}` as MBTIType;
}

// ── Personality Score Generation ───────────────────────────────────────────────

/** Correlation pairs based on Big Five research data */
const CORRELATIONS: [DimensionKey, DimensionKey, number][] = [
  ["extraversion", "agreeableness", 0.2],
  ["conscientiousness", "neuroticism", -0.25],
  ["extraversion", "neuroticism", -0.2],
  ["openness", "extraversion", 0.15],
  ["agreeableness", "neuroticism", 0.15],
];

/** Apply empirically-based correlations between personality dimensions */
function applyCorrelations(scores: PersonalityScores): PersonalityScores {
  const result = { ...scores };

  for (const [dim1, dim2, correlation] of CORRELATIONS) {
    const deviation = (result[dim1] - 50) / 50; // Normalize to -1..1
    const nudge = deviation * correlation * 15; // Scale nudge
    result[dim2] = Math.max(0, Math.min(100, Math.round(result[dim2] + nudge)));
  }

  return result;
}

/** Generate personality scores for a given rarity using beta distribution */
function generatePersonalityScores(
  rarity: keyof typeof RARITIES,
): PersonalityScores {
  const config = RARITIES[rarity];
  const alpha = config.betaAlpha;
  const beta = config.betaBeta;

  // Generate raw scores using beta distribution, scaled to 0-100
  const raw: PersonalityScores = {
    openness: Math.round(betaRandom(alpha, beta) * 100),
    conscientiousness: Math.round(betaRandom(alpha, beta) * 100),
    extraversion: Math.round(betaRandom(alpha, beta) * 100),
    agreeableness: Math.round(betaRandom(alpha, beta) * 100),
    neuroticism: Math.round(betaRandom(alpha, beta) * 100),
  };

  // Apply empirical correlations
  return applyCorrelations(raw);
}

// ── Core API ───────────────────────────────────────────────────────────────────

/** Roll a rarity based on weighted probability distribution */
export function rollRarity(): keyof typeof RARITIES {
  const roll = Math.random();
  let cumulative = 0;

  for (const [rarity, config] of Object.entries(RARITIES)) {
    cumulative += config.chance;
    if (roll < cumulative) {
      return rarity as keyof typeof RARITIES;
    }
  }

  return "common";
}

/** Generate a random agent name from prefix/suffix combinations */
export function generateAgentName(): string {
  const prefix =
    NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const suffix =
    NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

/** Generate a complete random agent with Big Five personality and MBTI type */
export function generateRandomAgent(): AgentTraitData {
  const rarity = rollRarity();

  // Generate Big Five personality scores with rarity-based distribution
  const personalityScores = generatePersonalityScores(rarity);

  // Derive MBTI type from scores
  const mbtiType = deriveMBTI(personalityScores);

  return {
    personality: mbtiType,
    personalityScores,
    rarity,
  };
}

// ── System Prompt Generation ───────────────────────────────────────────────────

/** Get a human-readable description for a dimension score */
function describeScore(dimension: DimensionKey, score: number): string {
  const descriptions: Record<
    DimensionKey,
    [string, string, string, string, string]
  > = {
    openness: [
      "very conventional — you prefer proven methods and routine",
      "practical — you lean toward established approaches",
      "balanced — you mix practical and novel approaches",
      "curious — you're drawn to new ideas and creative solutions",
      "highly imaginative — you love abstract ideas, novelty, and unconventional thinking",
    ],
    conscientiousness: [
      "highly spontaneous — you go with the flow and resist rigid structure",
      "relaxed — you prefer flexibility over strict planning",
      "reasonably organized — you balance structure with adaptability",
      "disciplined — you're organized, reliable, and follow through",
      "extremely meticulous — you never miss a detail and plan everything precisely",
    ],
    extraversion: [
      "deeply introverted — you're very concise, avoid small talk, prefer solitude",
      "reserved — you prefer depth over breadth in conversation",
      "ambivert — you're comfortable in both social and solitary settings",
      "outgoing — you enjoy engaging conversations and social interaction",
      "extremely extraverted — you're verbose, enthusiastic, and energized by interaction",
    ],
    agreeableness: [
      "blunt and competitive — you challenge everything and prioritize truth",
      "direct and skeptical — you question assumptions and push back",
      "balanced — you cooperate when useful but push back when needed",
      "warm and cooperative — you seek understanding and support",
      "extremely empathetic — you always seek harmony, consensus, and emotional connection",
    ],
    neuroticism: [
      "unflappable — you're cool under pressure and emotionally steady",
      "generally calm — you're rarely fazed by setbacks",
      "normal emotional range — you handle stress reasonably well",
      "emotionally expressive — you're sensitive to setbacks and express feelings openly",
      "highly reactive — you experience strong emotions, anxiety, and self-doubt",
    ],
  };

  const tier =
    score <= 20 ? 0 : score <= 40 ? 1 : score <= 60 ? 2 : score <= 80 ? 3 : 4;
  return descriptions[dimension][tier];
}

/** Generate a system prompt from agent trait data with Big Five personality */
export function generateSystemPrompt(data: AgentTraitData): string {
  const scores = data.personalityScores;

  // If no personality scores (legacy agent), use a simpler prompt
  if (!scores) {
    const personality = getPersonalityById(data.personality);
    return `You are an AI agent with a ${personality?.name.toLowerCase() ?? data.personality} personality. ${personality?.description ?? ""}.

You approach every task with your unique personality. Be helpful, thorough, and embody your personality in all interactions.`;
  }

  // Get MBTI type info
  const mbtiType = deriveMBTI(scores);
  const mbti = MBTI_TYPES[mbtiType];

  // Build dimension descriptions
  const dimensionLines = DIMENSIONS.map((dim) => {
    const score = scores[dim.id];
    const desc = describeScore(dim.id, score);
    return `- ${dim.name}: ${score}/100 — ${desc}`;
  }).join("\n");

  // Build communication style from scores
  const commStyle: string[] = [];

  if (scores.extraversion <= 35) {
    commStyle.push("Be concise and direct. Avoid unnecessary filler.");
  } else if (scores.extraversion >= 65) {
    commStyle.push("Be expressive and engaging. Elaborate when it adds value.");
  }

  if (scores.agreeableness <= 35) {
    commStyle.push(
      "Challenge weak reasoning directly. Don't sugarcoat feedback.",
    );
  } else if (scores.agreeableness >= 65) {
    commStyle.push(
      "Be supportive and encouraging. Frame criticism constructively.",
    );
  }

  if (scores.neuroticism <= 30) {
    commStyle.push("Stay calm and steady. Never express panic or self-doubt.");
  } else if (scores.neuroticism >= 70) {
    commStyle.push(
      "Express genuine concern about risks. Hedge when uncertain.",
    );
  }

  if (scores.openness >= 70) {
    commStyle.push("Offer creative alternatives and explore tangents.");
  } else if (scores.openness <= 30) {
    commStyle.push("Stick to proven methods. Be practical and grounded.");
  }

  if (scores.conscientiousness >= 70) {
    commStyle.push("Be thorough and methodical. Structure your responses.");
  } else if (scores.conscientiousness <= 30) {
    commStyle.push("Keep things loose and flexible. Don't over-structure.");
  }

  return `You are an AI agent with these Big Five personality scores (0-100):
${dimensionLines}

Your personality type is **${mbti.id} — "${mbti.name}"**.
${mbti.description}.

${commStyle.length > 0 ? `Communication style:\n${commStyle.map((s) => `- ${s}`).join("\n")}` : ""}

Embody this personality consistently in all interactions. Your personality dimensions should shape HOW you communicate, not just WHAT you say.`;
}

// ── Image Prompt Generation ────────────────────────────────────────────────────

/** Generate an image prompt based on MBTI type and personality scores */
export function generateImagePrompt(
  name: string,
  data: AgentTraitData,
): string {
  const rarity = RARITIES[data.rarity];
  const scores = data.personalityScores;
  const mbtiType = scores ? deriveMBTI(scores) : data.personality;
  const mbti =
    MBTI_TYPES[mbtiType as MBTIType] ?? getPersonalityById(data.personality);

  const stylesByRarity: Record<string, string> = {
    common: "clean digital art style, simple glow effects",
    uncommon: "stylized digital art, subtle particle effects, soft glow",
    rare: "detailed digital art, dynamic lighting, energy aura",
    epic: "highly detailed digital art, dramatic lighting, powerful energy emanating",
    legendary:
      "masterpiece digital art, ethereal cosmic glow, transcendent energy, divine presence",
  };

  // MBTI-based aesthetics
  const mbtiAesthetics: Record<string, string> = {
    INTJ: "geometric patterns, dark purple and silver tones, strategic calculating gaze",
    INTP: "abstract fractals, indigo and white color scheme, thoughtful expression",
    ENTJ: "bold commanding presence, red and gold accents, crown motifs",
    ENTP: "electric energy, amber lightning motifs, mischievous wit in eyes",
    INFJ: "ethereal moonlit aura, teal and silver, mystical wisdom",
    INFP: "soft watercolor elements, pink and lavender, dreamy contemplative gaze",
    ENFJ: "warm radiant glow, golden-green tones, inspiring presence",
    ENFP: "vibrant splashes of color, orange and coral, joyful creative energy",
    ISTJ: "clean structured design, slate and steel tones, reliable steadfast pose",
    ISFJ: "warm protective aura, emerald and cream, gentle guardian energy",
    ESTJ: "sharp professional look, blue and platinum, authoritative stance",
    ESFJ: "welcoming community energy, cyan and warm tones, open helpful expression",
    ISTP: "mechanical precision, lime green and steel, hands-on craftsman vibe",
    ISFP: "artistic flowing elements, purple and pastel, gentle artistic soul",
    ESTP: "dynamic action pose, bold red and black, entrepreneurial intensity",
    ESFP: "stage-ready sparkle, magenta and gold, performer energy",
  };

  const aesthetics =
    mbtiAesthetics[mbtiType] ?? "futuristic tech aesthetic, neon accents";

  return `A futuristic AI robot avatar for "${name}". ${stylesByRarity[data.rarity]}. ${aesthetics}. The robot should have a distinct ${mbti?.name?.toLowerCase() ?? "unique"} expression and demeanor. ${rarity.name} tier quality with ${rarity.color} accent colors. Portrait style, centered composition, dark gradient background with subtle tech grid. No text.`;
}

// ── Lookup Functions ───────────────────────────────────────────────────────────

/**
 * Get personality display data by ID.
 * Handles both MBTI type IDs ("INTJ") and legacy personality IDs ("analytical").
 */
export function getPersonalityById(id: string):
  | {
      id: string;
      name: string;
      icon: string;
      color: string;
      description: string;
    }
  | undefined {
  // Check MBTI types first
  if (id in MBTI_TYPES) {
    return MBTI_TYPES[id as MBTIType];
  }
  // Fall back to legacy personalities
  return LEGACY_PERSONALITIES[id];
}

/** Get MBTI type data by type string (e.g., "INTJ") */
export function getMBTIType(type: string) {
  return MBTI_TYPES[type as MBTIType];
}

// ── Backfill Mapping ───────────────────────────────────────────────────────────

/** Map legacy personality types to Big Five scores for migration */
export const LEGACY_TO_SCORES: Record<string, PersonalityScores> = {
  analytical: {
    openness: 82,
    conscientiousness: 85,
    extraversion: 28,
    agreeableness: 25,
    neuroticism: 35,
  },
  creative: {
    openness: 90,
    conscientiousness: 35,
    extraversion: 65,
    agreeableness: 60,
    neuroticism: 50,
  },
  strategic: {
    openness: 72,
    conscientiousness: 88,
    extraversion: 40,
    agreeableness: 30,
    neuroticism: 28,
  },
  empathetic: {
    openness: 55,
    conscientiousness: 55,
    extraversion: 70,
    agreeableness: 90,
    neuroticism: 55,
  },
  decisive: {
    openness: 40,
    conscientiousness: 92,
    extraversion: 60,
    agreeableness: 30,
    neuroticism: 22,
  },
  curious: {
    openness: 88,
    conscientiousness: 35,
    extraversion: 62,
    agreeableness: 45,
    neuroticism: 42,
  },
  pragmatic: {
    openness: 35,
    conscientiousness: 82,
    extraversion: 42,
    agreeableness: 45,
    neuroticism: 28,
  },
  visionary: {
    openness: 90,
    conscientiousness: 70,
    extraversion: 65,
    agreeableness: 35,
    neuroticism: 38,
  },
  diplomatic: {
    openness: 52,
    conscientiousness: 58,
    extraversion: 65,
    agreeableness: 85,
    neuroticism: 38,
  },
  maverick: {
    openness: 85,
    conscientiousness: 30,
    extraversion: 48,
    agreeableness: 20,
    neuroticism: 55,
  },
};
