# Web Search Tool

This tool enables Claude to search the web for real-time information using Anthropic's provider-defined web search capability through AI Gateway.

## Setup

### 1. Configure AI Gateway with BYOK (Bring Your Own Key)

This application uses Vercel AI Gateway. To use the web search tool:

1. Add your Anthropic API credentials in your Vercel team's [AI Gateway settings](https://vercel.com/docs/ai-gateway/byok)
2. Ensure web search is enabled in your Anthropic [Console settings](https://console.anthropic.com/settings/privacy)

The AI Gateway automatically routes requests through your configured Anthropic credentials.

### 2. Environment Variable

Ensure your AI Gateway API key is set in `.env.local`:

```bash
AI_GATEWAY_API_KEY=your_ai_gateway_api_key
```

## Usage

### In Chat Interface

Users can enable web search from the tool groups selection in the chat interface. Once enabled, Claude will automatically search the web when answering questions that require up-to-date information.

### Programmatic Usage

When using provider-defined tools through AI Gateway, you import the tool from the provider package but use it with the gateway model string:

```typescript
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Basic usage - note the model string format for AI Gateway
const result = await streamText({
  model: "anthropic/claude-opus-4-20250514",
  prompt: "What are the latest developments in AI?",
  tools: {
    web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
  },
});

// Advanced configuration
const result = await streamText({
  model: "anthropic/claude-sonnet-4-5",
  prompt: "Find technology news from specific sources",
  tools: {
    web_search: anthropic.tools.webSearch_20250305({
      maxUses: 3,
      allowedDomains: ["techcrunch.com", "wired.com"],
      blockedDomains: ["example-spam-site.com"],
      userLocation: {
        type: "approximate",
        country: "US",
        region: "California",
        city: "San Francisco",
        timezone: "America/Los_Angeles",
      },
    }),
  },
});
```

## Configuration Options

- **maxUses** (number): Maximum number of web searches Claude can perform. Default: 5
- **allowedDomains** (string[]): Optional list of domains Claude is allowed to search. Searches will be restricted to these domains.
- **blockedDomains** (string[]): Optional list of domains Claude should avoid when searching.
- **userLocation** (object): Optional user location information for geographically relevant search results.

## Error Handling

### Non-streaming (generateText, generateObject)

Web search errors throw exceptions:

```typescript
import { anthropic } from "@ai-sdk/anthropic";

try {
  const result = await generateText({
    model: "anthropic/claude-opus-4-20250514",
    prompt: "Search for something",
    tools: {
      web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
    },
  });
} catch (error) {
  if (error.message.includes("Web search failed")) {
    console.log("Search error:", error.message);
  }
}
```

### Streaming (streamText, streamObject)

Web search errors are delivered as error parts in the stream:

```typescript
import { anthropic } from "@ai-sdk/anthropic";

const result = await streamText({
  model: "anthropic/claude-opus-4-20250514",
  prompt: "Search for something",
  tools: {
    web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
  },
});

for await (const part of result.textStream) {
  if (part.type === "error") {
    console.log("Search error:", part.error);
  }
}
```

## Model Compatibility

Web search is supported on the following Claude models:

- `claude-opus-4-5`
- `claude-haiku-4-5`
- `claude-sonnet-4-5`
- `claude-opus-4-1`
- `claude-opus-4-0`
- `claude-sonnet-4-0`
- `claude-3-7-sonnet-latest`
- `claude-3-5-haiku-latest`

## How It Works

1. User asks a question that requires current information
2. Claude automatically calls the web search tool
3. The request is routed through AI Gateway to Anthropic using your BYOK credentials
4. The tool searches the web and returns relevant results
5. Claude uses the search results to formulate an up-to-date answer
6. Citations are included when Claude references specific search results

## Best Practices

- Enable web search for agents that need access to current events, news, or real-time data
- Use domain restrictions to ensure quality sources
- Set appropriate `maxUses` limits to control costs
- Provide user location for geographically relevant results
- Monitor search usage through the Vercel AI Gateway dashboard
- Configure BYOK credentials in AI Gateway for seamless provider routing

## Example Use Cases

**Note**: This project uses AI Gateway. For provider-defined tools like web search, import the tool from the provider package (`@ai-sdk/anthropic`) but use the gateway model string format (e.g., `"anthropic/claude-sonnet-4-5"`).

- Current events and news
- Real-time data (sports scores, stock prices, weather)
- Recent developments in technology or science
- Company information and updates
- Product reviews and comparisons
- Technical documentation and updates
