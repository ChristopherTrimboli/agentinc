import { tool } from "ai";
import { z } from "zod";

/**
 * IP Geolocation tools using ip-api.com (no API key required)
 * Free tier: 45 requests per minute
 */

const IP_API_URL = "https://ip-api.com/json";

const geolocateIPSchema = z.object({
  ip: z
    .string()
    .optional()
    .describe(
      "The IP address to geolocate. If not provided, returns info for the server's IP.",
    ),
});

/**
 * Get geolocation data for an IP address
 */
export const geolocateIP = tool({
  description:
    "Get geographic location information for an IP address including city, country, timezone, and ISP.",
  inputSchema: geolocateIPSchema,
  execute: async (input: z.infer<typeof geolocateIPSchema>) => {
    const url = input.ip
      ? `${IP_API_URL}/${encodeURIComponent(input.ip)}`
      : IP_API_URL;

    try {
      const response = await fetch(
        `${url}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "fail") {
        return {
          error: data.message || "Failed to geolocate IP",
          ip: input.ip || "current",
        };
      }

      return {
        ip: data.query,
        city: data.city,
        region: data.regionName,
        regionCode: data.region,
        country: data.country,
        countryCode: data.countryCode,
        zipCode: data.zip,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        organization: data.org,
        asn: data.as,
      };
    } catch (error) {
      return {
        error: `Failed to geolocate: ${error instanceof Error ? error.message : "Unknown error"}`,
        ip: input.ip || "current",
      };
    }
  },
});

const batchGeolocateSchema = z.object({
  ips: z
    .array(z.string())
    .min(1)
    .max(100)
    .describe("Array of IP addresses to geolocate (max 100)"),
});

/**
 * Batch geolocate multiple IP addresses
 */
export const batchGeolocateIPs = tool({
  description:
    "Get geographic location for multiple IP addresses in a single request. More efficient for bulk lookups.",
  inputSchema: batchGeolocateSchema,
  execute: async (input: z.infer<typeof batchGeolocateSchema>) => {
    try {
      const response = await fetch("https://ip-api.com/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          input.ips.map((ip) => ({
            query: ip,
            fields:
              "status,message,country,countryCode,regionName,city,lat,lon,timezone,query",
          })),
        ),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const results = data.map(
        (item: {
          status: string;
          message?: string;
          query: string;
          city?: string;
          regionName?: string;
          country?: string;
          countryCode?: string;
          lat?: number;
          lon?: number;
          timezone?: string;
        }) => {
          if (item.status === "fail") {
            return {
              ip: item.query,
              error: item.message || "Failed to geolocate",
            };
          }

          return {
            ip: item.query,
            city: item.city,
            region: item.regionName,
            country: item.country,
            countryCode: item.countryCode,
            latitude: item.lat,
            longitude: item.lon,
            timezone: item.timezone,
          };
        },
      );

      return {
        results,
        count: results.length,
      };
    } catch (error) {
      return {
        error: `Failed to batch geolocate: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

/**
 * All geolocation tools bundled together
 */
export const geolocationTools = {
  geolocateIP,
  batchGeolocateIPs,
};
