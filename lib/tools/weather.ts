import { tool } from "ai";
import { z } from "zod";

/**
 * Example weather tool - demonstrates a simple tool that works with any model
 *
 * In production, you would connect this to a real weather API
 */

const getWeatherSchema = z.object({
  location: z
    .string()
    .describe(
      "The city and state/country, e.g., 'San Francisco, CA' or 'London, UK'",
    ),
  unit: z
    .enum(["celsius", "fahrenheit"])
    .default("fahrenheit")
    .describe("Temperature unit"),
});

/**
 * Get current weather for a location
 * This is a mock implementation - connect to a real API in production
 */
export const getWeather = tool({
  description:
    "Get the current weather for a location. Returns temperature, conditions, and humidity.",
  inputSchema: getWeatherSchema,
  execute: async (input: z.infer<typeof getWeatherSchema>) => {
    // Mock weather data - in production, call a real weather API
    const mockWeatherData: Record<
      string,
      { temp: number; condition: string; humidity: number }
    > = {
      "san francisco": { temp: 62, condition: "Foggy", humidity: 78 },
      "new york": { temp: 45, condition: "Cloudy", humidity: 65 },
      "los angeles": { temp: 72, condition: "Sunny", humidity: 45 },
      london: { temp: 48, condition: "Rainy", humidity: 85 },
      tokyo: { temp: 58, condition: "Clear", humidity: 55 },
      paris: { temp: 52, condition: "Partly Cloudy", humidity: 70 },
    };

    const locationKey = input.location.toLowerCase().split(",")[0].trim();
    const weather = mockWeatherData[locationKey];

    if (!weather) {
      // Return random weather for unknown locations
      const conditions = ["Sunny", "Cloudy", "Partly Cloudy", "Rainy", "Clear"];
      const randomCondition =
        conditions[Math.floor(Math.random() * conditions.length)];
      const randomTemp = Math.floor(Math.random() * 40) + 40; // 40-80°F
      const randomHumidity = Math.floor(Math.random() * 50) + 30; // 30-80%

      const tempValue =
        input.unit === "celsius"
          ? Math.round(((randomTemp - 32) * 5) / 9)
          : randomTemp;

      return {
        location: input.location,
        temperature: tempValue,
        unit: input.unit,
        condition: randomCondition,
        humidity: randomHumidity,
        note: "Weather data simulated for demonstration",
      };
    }

    const tempValue =
      input.unit === "celsius"
        ? Math.round(((weather.temp - 32) * 5) / 9)
        : weather.temp;

    return {
      location: input.location,
      temperature: tempValue,
      unit: input.unit,
      condition: weather.condition,
      humidity: weather.humidity,
    };
  },
});

/**
 * Get weather forecast for a location
 */
const getForecastSchema = z.object({
  location: z.string().describe("The city and state/country"),
  days: z
    .number()
    .min(1)
    .max(7)
    .default(3)
    .describe("Number of days to forecast"),
  unit: z
    .enum(["celsius", "fahrenheit"])
    .default("fahrenheit")
    .describe("Temperature unit"),
});

export const getForecast = tool({
  description: "Get a weather forecast for the next few days.",
  inputSchema: getForecastSchema,
  execute: async (input: z.infer<typeof getForecastSchema>) => {
    const conditions = [
      "Sunny",
      "Cloudy",
      "Partly Cloudy",
      "Rainy",
      "Clear",
      "Windy",
    ];
    const forecast = [];

    for (let i = 0; i < input.days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);

      const highF = Math.floor(Math.random() * 30) + 50; // 50-80°F
      const lowF = highF - Math.floor(Math.random() * 15) - 5; // 5-20 degrees lower

      const high =
        input.unit === "celsius" ? Math.round(((highF - 32) * 5) / 9) : highF;
      const low =
        input.unit === "celsius" ? Math.round(((lowF - 32) * 5) / 9) : lowF;

      forecast.push({
        date: date.toISOString().split("T")[0],
        high,
        low,
        unit: input.unit,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        chanceOfRain: Math.floor(Math.random() * 100),
      });
    }

    return {
      location: input.location,
      forecast,
      note: "Forecast data simulated for demonstration",
    };
  },
});

/**
 * All weather tools bundled together
 */
export const weatherTools = {
  getWeather,
  getForecast,
};
