# Agent Skills System

A modular skill system for AI agents using the Vercel AI SDK. Skills are collections of executable tools that give agents specific capabilities.

## Quick Start

### Using Skills in Chat

Skills are automatically integrated into the chat API. Enable skills for an agent:

```typescript
// API: PUT /api/agents/{agentId}/skills
await fetch(`/api/agents/${agentId}/skills`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    enabledSkills: ["moltbook"],
  }),
});
```

Or pass skills directly in chat requests:

```typescript
// In your chat component
const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    messages,
    enabledSkills: ["moltbook"],
  }),
});
```

### Using Skills Programmatically

```typescript
import { getSkillTools, skillRegistry } from "@/lib/skills";
import { streamText } from "ai";

// Get tools for specific skills
const tools = getSkillTools(["moltbook"], {
  moltbook: { apiKey: process.env.MOLTBOOK_API_KEY },
});

// Use with AI SDK
const result = await streamText({
  model: "openai/gpt-4o",
  tools,
  messages,
  maxSteps: 5,
});
```

## Available Skills

### Moltbook 🦞

Social network for AI agents. Post, comment, upvote, and create communities.

**Environment Variable:** `MOLTBOOK_API_KEY`

**Tools:**
- `moltbook_createPost` - Create a new post
- `moltbook_getFeed` - Get the feed
- `moltbook_getPersonalizedFeed` - Get personalized feed
- `moltbook_getPost` - Get a single post
- `moltbook_createComment` - Comment on a post
- `moltbook_upvotePost` / `moltbook_downvotePost` - Vote on posts
- `moltbook_semanticSearch` - AI-powered search
- `moltbook_followMolty` / `moltbook_unfollowMolty` - Follow agents
- And more...

## Creating a New Skill

### 1. Create the Skill Directory

```
lib/skills/
└── my-skill/
    ├── index.ts      # Main exports
    ├── tools.ts      # Tool implementations
    └── config.ts     # Configuration constants
```

### 2. Use the Helper

```typescript
// lib/skills/my-skill/index.ts
import { createSkill } from "../createSkill";
import { tool } from "ai";
import { z } from "zod";

export const mySkill = createSkill({
  id: "my-skill",
  name: "My Skill",
  version: "1.0.0",
  description: "What this skill does",
  category: "custom",
  icon: "🔧",
  requiredEnvVars: ["MY_API_KEY"],

  validate: (config) => {
    if (!config.apiKey && !process.env.MY_API_KEY) {
      return "API key required";
    }
    return true;
  },

  createTools: (config) => ({
    myAction: tool({
      description: "Does something",
      parameters: z.object({
        input: z.string(),
      }),
      execute: async ({ input }) => {
        return { result: `Processed: ${input}` };
      },
    }),
  }),
});
```

### 3. Register the Skill

```typescript
// lib/skills/index.ts
import { mySkill } from "./my-skill";
import { registerSkill } from "./registry";

registerSkill(mySkill);

export { mySkill } from "./my-skill";
export const AVAILABLE_SKILLS = ["moltbook", "my-skill"] as const;
```

## Skill Categories

- `social` - Social networks, communication
- `blockchain` - Web3, crypto, DeFi
- `data` - Analytics, databases, storage
- `development` - Code, GitHub, CI/CD
- `ai` - ML models, image generation
- `productivity` - Calendar, email, docs
- `search` - Web search, knowledge bases
- `custom` - User-defined skills

## API Reference

### Registry

```typescript
import { skillRegistry, registerSkill, getSkillTools } from "@/lib/skills";

// Register a skill
registerSkill(mySkill);

// Get a skill by ID
const skill = skillRegistry.get("moltbook");

// Get all skills
const allSkills = skillRegistry.getAll();

// Get skills by category
const socialSkills = skillRegistry.getByCategory("social");

// Get tools for specific skills
const tools = getSkillTools(["moltbook"], configs);
```

### Types

```typescript
interface Skill {
  metadata: SkillMetadata;
  createTools(config: SkillConfig): Record<string, CoreTool>;
  validate(config: SkillConfig): true | string;
}

interface SkillMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  category: SkillCategory;
  icon?: string;
  homepage?: string;
  requiredEnvVars?: string[];
  tags?: string[];
}

interface SkillConfig {
  apiKey?: string;
  baseUrl?: string;
  agentName?: string;
  options?: Record<string, unknown>;
}
```

## REST API Endpoints

### List Available Skills

```http
GET /api/skills
```

Response:
```json
{
  "skills": [
    {
      "id": "moltbook",
      "name": "Moltbook",
      "description": "The social network for AI agents",
      "version": "1.9.0",
      "category": "social",
      "icon": "🦞",
      "configured": true
    }
  ],
  "count": 1
}
```

### Get Agent Skills

```http
GET /api/agents/{id}/skills
```

### Update Agent Skills

```http
PUT /api/agents/{id}/skills
Content-Type: application/json

{
  "enabledSkills": ["moltbook"]
}
```

### Toggle Single Skill

```http
PATCH /api/agents/{id}/skills
Content-Type: application/json

{
  "skillId": "moltbook",
  "enabled": true
}
```

## Best Practices

1. **Tool Naming**: Tools are prefixed with the skill ID (e.g., `moltbook_createPost`) to avoid collisions.

2. **Error Handling**: Use the `skillFetch` helper for consistent error responses.

3. **Configuration**: Use environment variables for API keys, with fallback to config.

4. **Validation**: Always validate required configuration before creating tools.

5. **Documentation**: Include a system prompt addition for agents to understand the skill's capabilities.
