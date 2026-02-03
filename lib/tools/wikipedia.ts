import { tool } from "ai";
import { z } from "zod";

/**
 * Wikipedia tools using the free MediaWiki API (no API key required)
 * Be a good citizen: include a User-Agent header
 */

const WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1";
const WIKIPEDIA_ACTION_API = "https://en.wikipedia.org/w/api.php";

const USER_AGENT = "AgentInc/1.0 (https://agentinc.com; contact@agentinc.com)";

const getWikiSummarySchema = z.object({
  topic: z
    .string()
    .describe(
      "The topic to look up on Wikipedia (e.g., 'Solana blockchain', 'Albert Einstein')",
    ),
});

/**
 * Get a summary of a Wikipedia article
 */
export const getWikiSummary = tool({
  description:
    "Get a concise summary of a Wikipedia article for a given topic. Returns the extract, thumbnail, and link to full article.",
  inputSchema: getWikiSummarySchema,
  execute: async (input: z.infer<typeof getWikiSummarySchema>) => {
    // Convert topic to Wikipedia title format (spaces to underscores, capitalize first letter)
    const title = input.topic
      .trim()
      .replace(/\s+/g, "_")
      .replace(/^(.)/, (m) => m.toUpperCase());

    try {
      const response = await fetch(
        `${WIKIPEDIA_API}/page/summary/${encodeURIComponent(title)}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (response.status === 404) {
        // Try searching for the topic instead
        return await searchAndSummarize(input.topic);
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        title: data.title,
        extract: data.extract,
        description: data.description || null,
        thumbnail: data.thumbnail?.source || null,
        url:
          data.content_urls?.desktop?.page ||
          `https://en.wikipedia.org/wiki/${title}`,
        lastModified: data.timestamp || null,
      };
    } catch (error) {
      return {
        error: `Failed to fetch Wikipedia summary: ${error instanceof Error ? error.message : "Unknown error"}`,
        topic: input.topic,
      };
    }
  },
});

/**
 * Helper function to search and return the best matching article summary
 */
async function searchAndSummarize(query: string) {
  try {
    const searchResponse = await fetch(
      `${WIKIPEDIA_ACTION_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`,
      {
        headers: {
          "User-Agent": USER_AGENT,
        },
      },
    );

    if (!searchResponse.ok) {
      throw new Error(`Search API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const results = searchData.query?.search;

    if (!results || results.length === 0) {
      return {
        error: `No Wikipedia article found for '${query}'`,
        topic: query,
        suggestion: "Try a more specific or alternative search term",
      };
    }

    // Fetch summary for the top result
    const topResult = results[0];
    const title = topResult.title.replace(/\s+/g, "_");

    const summaryResponse = await fetch(
      `${WIKIPEDIA_API}/page/summary/${encodeURIComponent(title)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      },
    );

    if (!summaryResponse.ok) {
      throw new Error(`Summary API error: ${summaryResponse.status}`);
    }

    const data = await summaryResponse.json();

    return {
      title: data.title,
      extract: data.extract,
      description: data.description || null,
      thumbnail: data.thumbnail?.source || null,
      url:
        data.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${title}`,
      lastModified: data.timestamp || null,
      note: `Searched for '${query}', showing result for '${data.title}'`,
    };
  } catch (error) {
    return {
      error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      topic: query,
    };
  }
}

const searchWikipediaSchema = z.object({
  query: z.string().describe("The search query"),
  limit: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe("Number of results to return (1-10)"),
});

/**
 * Search Wikipedia for articles matching a query
 */
export const searchWikipedia = tool({
  description:
    "Search Wikipedia for articles matching a query. Returns titles, snippets, and links to full articles.",
  inputSchema: searchWikipediaSchema,
  execute: async (input: z.infer<typeof searchWikipediaSchema>) => {
    try {
      const response = await fetch(
        `${WIKIPEDIA_ACTION_API}?action=query&list=search&srsearch=${encodeURIComponent(input.query)}&srlimit=${input.limit}&format=json&origin=*`,
        {
          headers: {
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const results = data.query?.search || [];

      if (results.length === 0) {
        return {
          results: [],
          query: input.query,
          message: "No results found",
        };
      }

      const formattedResults = results.map(
        (result: {
          title: string;
          snippet: string;
          pageid: number;
          wordcount: number;
        }) => ({
          title: result.title,
          snippet: result.snippet.replace(/<[^>]*>/g, ""), // Strip HTML tags
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/\s+/g, "_"))}`,
          pageId: result.pageid,
          wordCount: result.wordcount,
        }),
      );

      return {
        results: formattedResults,
        query: input.query,
        totalResults: data.query?.searchinfo?.totalhits || results.length,
      };
    } catch (error) {
      return {
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        query: input.query,
      };
    }
  },
});

/**
 * All Wikipedia tools bundled together
 */
export const wikipediaTools = {
  getWikiSummary,
  searchWikipedia,
};
