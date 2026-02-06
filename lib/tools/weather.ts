import { tool } from "ai";
import { z } from "zod";

/**
 * Real weather tools using Open-Meteo API (free, no API key required)
 * https://open-meteo.com/
 */

// ─── WMO Weather Code → Human-readable condition ────────────────────────────

const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

function weatherCondition(code: number): string {
  return WMO_CODES[code] ?? "Unknown";
}

// ─── Geocoding helper ────────────────────────────────────────────────────────

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // state / region
}

async function geocode(location: string): Promise<GeoResult> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`Could not find location: "${location}". Try a different city name.`);
  }
  const r = data.results[0];
  return {
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country ?? "",
    admin1: r.admin1,
  };
}

// ─── getWeather ──────────────────────────────────────────────────────────────

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
 * Get current weather for a location using Open-Meteo
 */
export const getWeather = tool({
  description:
    "Get the current weather for a location. Returns temperature, conditions, humidity, and wind speed.",
  inputSchema: getWeatherSchema,
  execute: async (input: z.infer<typeof getWeatherSchema>) => {
    try {
      const geo = await geocode(input.location);

      const tempUnit = input.unit === "celsius" ? "celsius" : "fahrenheit";
      const windUnit = input.unit === "celsius" ? "kmh" : "mph";

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${geo.latitude}&longitude=${geo.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
        `&temperature_unit=${tempUnit}` +
        `&wind_speed_unit=${windUnit}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      const c = data.current;

      const displayLocation = geo.admin1
        ? `${geo.name}, ${geo.admin1}, ${geo.country}`
        : `${geo.name}, ${geo.country}`;

      return {
        location: displayLocation,
        temperature: c.temperature_2m,
        feelsLike: c.apparent_temperature,
        unit: input.unit,
        condition: weatherCondition(c.weather_code),
        humidity: c.relative_humidity_2m,
        windSpeed: c.wind_speed_10m,
        windUnit: windUnit,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  },
});

// ─── getForecast ─────────────────────────────────────────────────────────────

const getForecastSchema = z.object({
  location: z.string().describe("The city and state/country"),
  days: z
    .number()
    .min(1)
    .max(14)
    .default(3)
    .describe("Number of days to forecast (up to 14)"),
  unit: z
    .enum(["celsius", "fahrenheit"])
    .default("fahrenheit")
    .describe("Temperature unit"),
});

/**
 * Get weather forecast for a location using Open-Meteo
 */
export const getForecast = tool({
  description: "Get a weather forecast for the next few days.",
  inputSchema: getForecastSchema,
  execute: async (input: z.infer<typeof getForecastSchema>) => {
    try {
      const geo = await geocode(input.location);

      const tempUnit = input.unit === "celsius" ? "celsius" : "fahrenheit";

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${geo.latitude}&longitude=${geo.longitude}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
        `&temperature_unit=${tempUnit}` +
        `&wind_speed_unit=${input.unit === "celsius" ? "kmh" : "mph"}` +
        `&forecast_days=${input.days}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      const d = data.daily;

      const displayLocation = geo.admin1
        ? `${geo.name}, ${geo.admin1}, ${geo.country}`
        : `${geo.name}, ${geo.country}`;

      const forecast = d.time.map((date: string, i: number) => ({
        date,
        high: d.temperature_2m_max[i],
        low: d.temperature_2m_min[i],
        unit: input.unit,
        condition: weatherCondition(d.weather_code[i]),
        chanceOfRain: d.precipitation_probability_max[i],
        maxWindSpeed: d.wind_speed_10m_max[i],
      }));

      return {
        location: displayLocation,
        forecast,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  },
});

// ─── Export bundle ────────────────────────────────────────────────────────────

/**
 * All weather tools bundled together
 */
export const weatherTools = {
  getWeather,
  getForecast,
};
