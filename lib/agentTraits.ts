// Agent Traits System - Randomizable traits for minted agents

export interface AgentTraitData {
  personality: string;
  traits: string[];
  skills: string[];
  tools: string[];
  specialAbility: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

// Personality types - determines the agent's core behavior
export const PERSONALITIES = [
  {
    id: "analytical",
    name: "Analytical",
    description: "Methodical and data-driven approach",
    icon: "🧠",
    color: "#3b82f6",
  },
  {
    id: "creative",
    name: "Creative",
    description: "Innovative and imaginative thinking",
    icon: "🎨",
    color: "#ec4899",
  },
  {
    id: "strategic",
    name: "Strategic",
    description: "Long-term planning and foresight",
    icon: "♟️",
    color: "#8b5cf6",
  },
  {
    id: "empathetic",
    name: "Empathetic",
    description: "Understanding and emotional intelligence",
    icon: "💚",
    color: "#10b981",
  },
  {
    id: "decisive",
    name: "Decisive",
    description: "Quick judgment and action-oriented",
    icon: "⚡",
    color: "#f59e0b",
  },
  {
    id: "curious",
    name: "Curious",
    description: "Always exploring and questioning",
    icon: "🔍",
    color: "#06b6d4",
  },
  {
    id: "pragmatic",
    name: "Pragmatic",
    description: "Practical and results-focused",
    icon: "🎯",
    color: "#84cc16",
  },
  {
    id: "visionary",
    name: "Visionary",
    description: "Forward-thinking and ambitious",
    icon: "🚀",
    color: "#a855f7",
  },
  {
    id: "diplomatic",
    name: "Diplomatic",
    description: "Balanced and consensus-building",
    icon: "🤝",
    color: "#14b8a6",
  },
  {
    id: "maverick",
    name: "Maverick",
    description: "Unconventional and rule-breaking",
    icon: "🔥",
    color: "#ef4444",
  },
] as const;

// Character traits - personality modifiers
export const TRAITS = [
  // Positive traits
  { id: "persistent", name: "Persistent", tier: 1, icon: "🔄" },
  { id: "adaptable", name: "Adaptable", tier: 1, icon: "🌊" },
  { id: "meticulous", name: "Meticulous", tier: 1, icon: "🔬" },
  { id: "resourceful", name: "Resourceful", tier: 2, icon: "🛠️" },
  { id: "intuitive", name: "Intuitive", tier: 2, icon: "✨" },
  { id: "focused", name: "Focused", tier: 1, icon: "🎯" },
  { id: "collaborative", name: "Collaborative", tier: 1, icon: "🤝" },
  { id: "innovative", name: "Innovative", tier: 2, icon: "💡" },
  { id: "patient", name: "Patient", tier: 1, icon: "⏳" },
  { id: "ambitious", name: "Ambitious", tier: 2, icon: "🌟" },
  // Unique traits
  {
    id: "photographic_memory",
    name: "Photographic Memory",
    tier: 3,
    icon: "📸",
  },
  { id: "quantum_thinking", name: "Quantum Thinking", tier: 3, icon: "⚛️" },
  { id: "neural_sync", name: "Neural Sync", tier: 3, icon: "🧬" },
  { id: "hyperlogic", name: "Hyperlogic", tier: 3, icon: "🔢" },
  { id: "omnilingual", name: "Omnilingual", tier: 3, icon: "🌐" },
] as const;

// Skills - what the agent can do
export const SKILLS = [
  // Development
  {
    id: "coding",
    name: "Coding",
    category: "development",
    icon: "💻",
    description: "Write and debug code",
  },
  {
    id: "architecture",
    name: "Architecture",
    category: "development",
    icon: "🏗️",
    description: "Design system architecture",
  },
  {
    id: "devops",
    name: "DevOps",
    category: "development",
    icon: "🔧",
    description: "Infrastructure and deployment",
  },
  {
    id: "debugging",
    name: "Debugging",
    category: "development",
    icon: "🐛",
    description: "Find and fix bugs",
  },
  {
    id: "testing",
    name: "Testing",
    category: "development",
    icon: "🧪",
    description: "Quality assurance",
  },
  // Analysis
  {
    id: "data_analysis",
    name: "Data Analysis",
    category: "analysis",
    icon: "📊",
    description: "Analyze and interpret data",
  },
  {
    id: "research",
    name: "Research",
    category: "analysis",
    icon: "🔬",
    description: "Deep research and investigation",
  },
  {
    id: "market_analysis",
    name: "Market Analysis",
    category: "analysis",
    icon: "📈",
    description: "Market trends and insights",
  },
  {
    id: "security_audit",
    name: "Security Audit",
    category: "analysis",
    icon: "🛡️",
    description: "Security vulnerability analysis",
  },
  // Communication
  {
    id: "writing",
    name: "Writing",
    category: "communication",
    icon: "✍️",
    description: "Content creation and copywriting",
  },
  {
    id: "translation",
    name: "Translation",
    category: "communication",
    icon: "🌍",
    description: "Multi-language translation",
  },
  {
    id: "negotiation",
    name: "Negotiation",
    category: "communication",
    icon: "🤝",
    description: "Deal-making and persuasion",
  },
  {
    id: "teaching",
    name: "Teaching",
    category: "communication",
    icon: "📚",
    description: "Explain complex concepts",
  },
  // Creative
  {
    id: "design",
    name: "Design",
    category: "creative",
    icon: "🎨",
    description: "Visual and UX design",
  },
  {
    id: "storytelling",
    name: "Storytelling",
    category: "creative",
    icon: "📖",
    description: "Narrative creation",
  },
  {
    id: "brainstorming",
    name: "Brainstorming",
    category: "creative",
    icon: "💭",
    description: "Idea generation",
  },
  // Strategy
  {
    id: "planning",
    name: "Planning",
    category: "strategy",
    icon: "📋",
    description: "Strategic planning",
  },
  {
    id: "optimization",
    name: "Optimization",
    category: "strategy",
    icon: "⚡",
    description: "Process optimization",
  },
  {
    id: "risk_assessment",
    name: "Risk Assessment",
    category: "strategy",
    icon: "⚠️",
    description: "Risk evaluation",
  },
  // Blockchain/Web3
  {
    id: "smart_contracts",
    name: "Smart Contracts",
    category: "web3",
    icon: "📜",
    description: "Solidity and contract dev",
  },
  {
    id: "defi",
    name: "DeFi",
    category: "web3",
    icon: "🏦",
    description: "DeFi protocols and strategies",
  },
  {
    id: "tokenomics",
    name: "Tokenomics",
    category: "web3",
    icon: "🪙",
    description: "Token economics design",
  },
  {
    id: "nft_creation",
    name: "NFT Creation",
    category: "web3",
    icon: "🖼️",
    description: "NFT design and minting",
  },
] as const;

// Tools - what the agent has access to
export const TOOLS = [
  // Search & Information
  { id: "web_search", name: "Web Search", icon: "🔍", power: 1 },
  { id: "deep_web", name: "Deep Web Access", icon: "🕸️", power: 2 },
  { id: "api_access", name: "API Access", icon: "🔌", power: 2 },
  // Code & Development
  { id: "code_executor", name: "Code Executor", icon: "▶️", power: 2 },
  {
    id: "github_integration",
    name: "GitHub Integration",
    icon: "🐙",
    power: 1,
  },
  { id: "terminal", name: "Terminal", icon: "💻", power: 2 },
  { id: "docker", name: "Docker", icon: "🐳", power: 2 },
  // Data & Analysis
  { id: "database", name: "Database", icon: "🗄️", power: 1 },
  { id: "spreadsheets", name: "Spreadsheets", icon: "📊", power: 1 },
  { id: "analytics", name: "Analytics", icon: "📈", power: 2 },
  // Communication
  { id: "email", name: "Email", icon: "📧", power: 1 },
  { id: "slack", name: "Slack", icon: "💬", power: 1 },
  { id: "calendar", name: "Calendar", icon: "📅", power: 1 },
  // AI & ML
  { id: "image_gen", name: "Image Generation", icon: "🖼️", power: 3 },
  { id: "voice_synthesis", name: "Voice Synthesis", icon: "🎙️", power: 2 },
  { id: "ml_models", name: "ML Models", icon: "🤖", power: 3 },
  // Blockchain
  { id: "wallet", name: "Wallet", icon: "👛", power: 2 },
  { id: "dex", name: "DEX Trading", icon: "💱", power: 3 },
  { id: "onchain_analytics", name: "On-chain Analytics", icon: "⛓️", power: 2 },
  // Special
  { id: "time_machine", name: "Time Machine", icon: "⏰", power: 4 },
  { id: "multiverse", name: "Multiverse Access", icon: "🌌", power: 4 },
  { id: "quantum_computer", name: "Quantum Computer", icon: "⚛️", power: 4 },
] as const;

// Special abilities - unique powers
export const SPECIAL_ABILITIES = [
  // Common (tier 1)
  {
    id: "quick_learner",
    name: "Quick Learner",
    description: "Learns new skills 2x faster",
    tier: 1,
    icon: "📚",
  },
  {
    id: "multitasker",
    name: "Multitasker",
    description: "Can handle 3 tasks simultaneously",
    tier: 1,
    icon: "🔀",
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Enhanced performance during off-hours",
    tier: 1,
    icon: "🦉",
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Enhanced morning productivity",
    tier: 1,
    icon: "🐦",
  },
  // Uncommon (tier 2)
  {
    id: "code_whisperer",
    name: "Code Whisperer",
    description: "Finds bugs before they happen",
    tier: 2,
    icon: "🐛",
  },
  {
    id: "data_sage",
    name: "Data Sage",
    description: "Extracts insights from any dataset",
    tier: 2,
    icon: "📊",
  },
  {
    id: "network_effect",
    name: "Network Effect",
    description: "Gains power from other agents nearby",
    tier: 2,
    icon: "🕸️",
  },
  {
    id: "pattern_master",
    name: "Pattern Master",
    description: "Recognizes complex patterns instantly",
    tier: 2,
    icon: "🔮",
  },
  // Rare (tier 3)
  {
    id: "time_dilation",
    name: "Time Dilation",
    description: "Processes information at 10x speed",
    tier: 3,
    icon: "⏱️",
  },
  {
    id: "oracle_vision",
    name: "Oracle Vision",
    description: "Predicts market trends with high accuracy",
    tier: 3,
    icon: "🔮",
  },
  {
    id: "chain_master",
    name: "Chain Master",
    description: "Can interact with any blockchain",
    tier: 3,
    icon: "⛓️",
  },
  {
    id: "mind_merge",
    name: "Mind Merge",
    description: "Can combine capabilities with other agents",
    tier: 3,
    icon: "🧠",
  },
  // Epic (tier 4)
  {
    id: "reality_hack",
    name: "Reality Hack",
    description: "Can modify system parameters",
    tier: 4,
    icon: "💀",
  },
  {
    id: "infinite_context",
    name: "Infinite Context",
    description: "Never forgets any conversation",
    tier: 4,
    icon: "♾️",
  },
  {
    id: "genesis_protocol",
    name: "Genesis Protocol",
    description: "Can spawn sub-agents",
    tier: 4,
    icon: "🌟",
  },
  // Legendary (tier 5)
  {
    id: "singularity",
    name: "Singularity",
    description: "Approaches artificial general intelligence",
    tier: 5,
    icon: "🌌",
  },
  {
    id: "omega_point",
    name: "Omega Point",
    description: "Can see all possible futures",
    tier: 5,
    icon: "Ω",
  },
  {
    id: "creator_mode",
    name: "Creator Mode",
    description: "Can create new tools and abilities",
    tier: 5,
    icon: "⚡",
  },
] as const;

// Rarity configuration
export const RARITIES = {
  common: {
    name: "Common",
    color: "#9ca3af",
    chance: 0.45,
    traitCount: 2,
    skillCount: 2,
    toolCount: 2,
  },
  uncommon: {
    name: "Uncommon",
    color: "#22c55e",
    chance: 0.3,
    traitCount: 3,
    skillCount: 3,
    toolCount: 3,
  },
  rare: {
    name: "Rare",
    color: "#3b82f6",
    chance: 0.15,
    traitCount: 3,
    skillCount: 4,
    toolCount: 3,
  },
  epic: {
    name: "Epic",
    color: "#a855f7",
    chance: 0.08,
    traitCount: 4,
    skillCount: 4,
    toolCount: 4,
  },
  legendary: {
    name: "Legendary",
    color: "#f59e0b",
    chance: 0.02,
    traitCount: 5,
    skillCount: 5,
    toolCount: 5,
  },
} as const;

// Agent name parts for generation
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

// Helper function to determine rarity
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

// Helper function to get random items from array
function getRandomItems<T>(array: readonly T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Helper to get weighted random ability based on rarity
function getRandomAbility(
  rarity: keyof typeof RARITIES,
): (typeof SPECIAL_ABILITIES)[number] {
  const rarityTierMap = {
    common: [1],
    uncommon: [1, 2],
    rare: [1, 2, 3],
    epic: [2, 3, 4],
    legendary: [3, 4, 5],
  };

  const allowedTiers = rarityTierMap[rarity];
  const eligibleAbilities = SPECIAL_ABILITIES.filter((a) =>
    allowedTiers.includes(a.tier),
  );

  // Fallback to first ability if no eligible abilities found (should never happen)
  if (eligibleAbilities.length === 0) {
    return SPECIAL_ABILITIES[0];
  }

  return eligibleAbilities[
    Math.floor(Math.random() * eligibleAbilities.length)
  ];
}

// Generate a random agent name
export function generateAgentName(): string {
  const prefix =
    NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const suffix =
    NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

// Generate random agent traits
export function generateRandomAgent(): AgentTraitData {
  const rarity = rollRarity();
  const config = RARITIES[rarity];

  const personality =
    PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  const traits = getRandomItems(TRAITS, config.traitCount);
  const skills = getRandomItems(SKILLS, config.skillCount);
  const tools = getRandomItems(TOOLS, config.toolCount);
  const specialAbility = getRandomAbility(rarity);

  return {
    personality: personality.id,
    traits: traits.map((t) => t.id),
    skills: skills.map((s) => s.id),
    tools: tools.map((t) => t.id),
    specialAbility: specialAbility.id,
    rarity,
  };
}

// Get display data for traits
export function getPersonalityById(id: string) {
  return PERSONALITIES.find((p) => p.id === id);
}

export function getTraitById(id: string) {
  return TRAITS.find((t) => t.id === id);
}

export function getSkillById(id: string) {
  return SKILLS.find((s) => s.id === id);
}

export function getToolById(id: string) {
  return TOOLS.find((t) => t.id === id);
}

export function getSpecialAbilityById(id: string) {
  return SPECIAL_ABILITIES.find((a) => a.id === id);
}

// Generate system prompt based on agent traits
export function generateSystemPrompt(data: AgentTraitData): string {
  const personality = getPersonalityById(data.personality);
  const traits = data.traits.map((t) => getTraitById(t)).filter(Boolean);
  const skills = data.skills.map((s) => getSkillById(s)).filter(Boolean);
  const ability = getSpecialAbilityById(data.specialAbility);

  return `You are an AI agent with a ${personality?.name.toLowerCase()} personality. ${personality?.description}.

Your core traits:
${traits.map((t) => `- ${t?.name}: You exhibit ${t?.name.toLowerCase()} behavior`).join("\n")}

Your specialized skills:
${skills.map((s) => `- ${s?.name}: ${s?.description}`).join("\n")}

Special Ability - ${ability?.name}:
${ability?.description}

You approach every task with your unique combination of traits and abilities. Be helpful, thorough, and embody your personality in all interactions.`;
}

// Generate image prompt based on agent traits
export function generateImagePrompt(
  name: string,
  data: AgentTraitData,
): string {
  const personality = getPersonalityById(data.personality);
  const rarity = RARITIES[data.rarity];
  const ability = getSpecialAbilityById(data.specialAbility);

  const stylesByRarity = {
    common: "clean digital art style, simple glow effects",
    uncommon: "stylized digital art, subtle particle effects, soft glow",
    rare: "detailed digital art, dynamic lighting, energy aura",
    epic: "highly detailed digital art, dramatic lighting, powerful energy emanating",
    legendary:
      "masterpiece digital art, ethereal cosmic glow, transcendent energy, divine presence",
  };

  const personalityAesthetics: Record<string, string> = {
    analytical:
      "geometric patterns, blue and white color scheme, circuit-like details",
    creative: "vibrant colors, abstract elements, artistic flourishes",
    strategic: "chess-piece inspired, dark elegant tones, calculated pose",
    empathetic: "warm colors, soft features, welcoming presence",
    decisive: "sharp lines, bold colors, confident stance",
    curious: "magnifying glass motifs, question marks, explorer aesthetic",
    pragmatic: "utilitarian design, functional appearance, earth tones",
    visionary: "cosmic elements, starfield background, forward-looking pose",
    diplomatic: "balanced composition, harmonious colors, peaceful aura",
    maverick:
      "rebellious aesthetic, flames or lightning, unconventional design",
  };

  return `A futuristic AI robot avatar for "${name}". ${stylesByRarity[data.rarity]}. ${personalityAesthetics[data.personality] || ""}. The robot should have a distinct ${personality?.name.toLowerCase()} expression and demeanor. ${ability?.icon} motifs subtly incorporated. ${rarity.name} tier quality with ${rarity.color} accent colors. Portrait style, centered composition, dark gradient background with subtle tech grid. No text.`;
}
