import { tool } from "ai";
import { z } from "zod";

/**
 * DateTime utility tools - pure computation, no external APIs needed
 */

const getCurrentTimeSchema = z.object({
  timezone: z
    .string()
    .optional()
    .describe(
      "IANA timezone name (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo'). Defaults to UTC.",
    ),
  format: z
    .enum(["iso", "readable", "unix"])
    .default("readable")
    .describe(
      "Output format: 'iso' (ISO 8601), 'readable' (human-friendly), or 'unix' (timestamp)",
    ),
});

/**
 * Get the current time in a specific timezone
 */
export const getCurrentTime = tool({
  description:
    "Get the REAL current date and time RIGHT NOW. Use this when asked 'what time is it', 'what's the date', 'current time', etc. Returns actual live time data, not code.",
  inputSchema: getCurrentTimeSchema,
  execute: async (input: z.infer<typeof getCurrentTimeSchema>) => {
    const now = new Date();
    const timezone = input.timezone || "UTC";

    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        weekday: "long",
        timeZoneName: "short",
      });

      const parts = formatter.formatToParts(now);
      const getPart = (type: string) =>
        parts.find((p) => p.type === type)?.value || "";

      const isoInTz = `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}:${getPart("second")}`;

      let formatted: string | number;
      switch (input.format) {
        case "iso":
          formatted = isoInTz;
          break;
        case "unix":
          formatted = Math.floor(now.getTime() / 1000);
          break;
        case "readable":
        default:
          formatted = `${getPart("weekday")}, ${getPart("month")}/${getPart("day")}/${getPart("year")} ${getPart("hour")}:${getPart("minute")}:${getPart("second")} ${getPart("timeZoneName")}`;
      }

      return {
        timezone,
        formatted,
        iso: isoInTz,
        unix: Math.floor(now.getTime() / 1000),
        utc: now.toISOString(),
      };
    } catch {
      return {
        error: `Invalid timezone: '${timezone}'. Use IANA timezone names like 'America/New_York', 'Europe/London', 'Asia/Tokyo'.`,
        validExamples: [
          "UTC",
          "America/New_York",
          "America/Los_Angeles",
          "Europe/London",
          "Europe/Paris",
          "Asia/Tokyo",
          "Asia/Shanghai",
          "Australia/Sydney",
        ],
      };
    }
  },
});

const convertTimezoneSchema = z.object({
  time: z
    .string()
    .describe(
      "The time to convert (ISO 8601 format or common formats like '2024-01-15 14:30')",
    ),
  fromTimezone: z
    .string()
    .describe("Source timezone (IANA name like 'America/New_York')"),
  toTimezone: z
    .string()
    .describe("Target timezone (IANA name like 'Europe/London')"),
});

/**
 * Convert a time between timezones
 */
export const convertTimezone = tool({
  description:
    "Convert a date/time from one timezone to another. Handles daylight saving time automatically.",
  inputSchema: convertTimezoneSchema,
  execute: async (input: z.infer<typeof convertTimezoneSchema>) => {
    try {
      // Parse the input time
      let date: Date;
      const timeStr = input.time.trim();

      // Try parsing as ISO or common format
      if (timeStr.includes("T") || timeStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(timeStr);
      } else {
        // Try common formats
        date = new Date(timeStr.replace(" ", "T"));
      }

      if (isNaN(date.getTime())) {
        return {
          error: `Could not parse time: '${input.time}'. Use formats like '2024-01-15T14:30:00' or '2024-01-15 14:30'.`,
        };
      }

      // Format in source timezone
      const fromFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: input.fromTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
      });

      // Format in target timezone
      const toFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: input.toTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        weekday: "long",
        timeZoneName: "short",
      });

      const toParts = toFormatter.formatToParts(date);
      const getPart = (type: string) =>
        toParts.find((p) => p.type === type)?.value || "";

      return {
        input: {
          time: input.time,
          timezone: input.fromTimezone,
          formatted: fromFormatter.format(date),
        },
        output: {
          timezone: input.toTimezone,
          formatted: `${getPart("weekday")}, ${getPart("month")}/${getPart("day")}/${getPart("year")} ${getPart("hour")}:${getPart("minute")}:${getPart("second")} ${getPart("timeZoneName")}`,
          iso: `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}:${getPart("second")}`,
        },
      };
    } catch (error) {
      return {
        error: `Timezone conversion failed: ${error instanceof Error ? error.message : "Invalid timezone"}`,
        hint: "Use IANA timezone names like 'America/New_York', 'Europe/London', 'Asia/Tokyo'",
      };
    }
  },
});

const dateDiffSchema = z.object({
  from: z.string().describe("Start date (ISO format or common formats)"),
  to: z.string().describe("End date (ISO format or common formats)"),
  unit: z
    .enum(["days", "hours", "minutes", "seconds", "weeks", "months", "years"])
    .default("days")
    .describe("Unit for the difference"),
});

/**
 * Calculate the difference between two dates
 */
export const dateDiff = tool({
  description:
    "Calculate the difference between two dates in various units (days, hours, weeks, etc.).",
  inputSchema: dateDiffSchema,
  execute: async (input: z.infer<typeof dateDiffSchema>) => {
    try {
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return {
          error:
            "Could not parse one or both dates. Use ISO format like '2024-01-15' or '2024-01-15T14:30:00'.",
        };
      }

      const diffMs = toDate.getTime() - fromDate.getTime();
      const diffSeconds = diffMs / 1000;
      const diffMinutes = diffSeconds / 60;
      const diffHours = diffMinutes / 60;
      const diffDays = diffHours / 24;
      const diffWeeks = diffDays / 7;

      // Approximate months and years
      const diffMonths = diffDays / 30.44; // Average days per month
      const diffYears = diffDays / 365.25; // Account for leap years

      let primaryValue: number;
      switch (input.unit) {
        case "seconds":
          primaryValue = Math.round(diffSeconds);
          break;
        case "minutes":
          primaryValue = Math.round(diffMinutes);
          break;
        case "hours":
          primaryValue = Math.round(diffHours * 100) / 100;
          break;
        case "weeks":
          primaryValue = Math.round(diffWeeks * 100) / 100;
          break;
        case "months":
          primaryValue = Math.round(diffMonths * 100) / 100;
          break;
        case "years":
          primaryValue = Math.round(diffYears * 100) / 100;
          break;
        case "days":
        default:
          primaryValue = Math.round(diffDays);
      }

      const isPast = diffMs < 0;

      return {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        difference: {
          value: Math.abs(primaryValue),
          unit: input.unit,
          direction: isPast ? "past" : "future",
          readable: `${Math.abs(primaryValue)} ${input.unit} ${isPast ? "ago" : "from now"}`,
        },
        breakdown: {
          days: Math.round(Math.abs(diffDays)),
          hours: Math.round(Math.abs(diffHours)),
          minutes: Math.round(Math.abs(diffMinutes)),
          weeks: Math.round(Math.abs(diffWeeks) * 10) / 10,
        },
      };
    } catch (error) {
      return {
        error: `Date calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

const addToDateSchema = z.object({
  date: z
    .string()
    .optional()
    .describe("Starting date (ISO format). Defaults to now if not provided."),
  add: z.object({
    years: z.number().optional().describe("Years to add (can be negative)"),
    months: z.number().optional().describe("Months to add (can be negative)"),
    weeks: z.number().optional().describe("Weeks to add (can be negative)"),
    days: z.number().optional().describe("Days to add (can be negative)"),
    hours: z.number().optional().describe("Hours to add (can be negative)"),
    minutes: z.number().optional().describe("Minutes to add (can be negative)"),
  }),
  timezone: z.string().optional().describe("Timezone for output formatting"),
});

/**
 * Add or subtract time from a date
 */
export const addToDate = tool({
  description:
    "Add or subtract time units from a date. Use negative numbers to subtract. Useful for calculating future/past dates.",
  inputSchema: addToDateSchema,
  execute: async (input: z.infer<typeof addToDateSchema>) => {
    try {
      const date = input.date ? new Date(input.date) : new Date();

      if (isNaN(date.getTime())) {
        return {
          error: `Could not parse date: '${input.date}'`,
        };
      }

      const result = new Date(date);

      if (input.add.years)
        result.setFullYear(result.getFullYear() + input.add.years);
      if (input.add.months)
        result.setMonth(result.getMonth() + input.add.months);
      if (input.add.weeks)
        result.setDate(result.getDate() + input.add.weeks * 7);
      if (input.add.days) result.setDate(result.getDate() + input.add.days);
      if (input.add.hours) result.setHours(result.getHours() + input.add.hours);
      if (input.add.minutes)
        result.setMinutes(result.getMinutes() + input.add.minutes);

      const timezone = input.timezone || "UTC";
      let formattedResult: string;

      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        });
        formattedResult = formatter.format(result);
      } catch {
        formattedResult = result.toISOString();
      }

      return {
        original: date.toISOString(),
        added: input.add,
        result: {
          iso: result.toISOString(),
          formatted: formattedResult,
          unix: Math.floor(result.getTime() / 1000),
        },
      };
    } catch (error) {
      return {
        error: `Date calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

const formatDateSchema = z.object({
  date: z
    .string()
    .optional()
    .describe("Date to format (ISO format). Defaults to now."),
  locale: z
    .string()
    .default("en-US")
    .describe("Locale for formatting (e.g., 'en-US', 'de-DE', 'ja-JP')"),
  style: z
    .enum(["short", "medium", "long", "full"])
    .default("long")
    .describe("Date style: short, medium, long, or full"),
  timezone: z.string().optional().describe("Timezone for the formatted output"),
});

/**
 * Format a date in various locales and styles
 */
export const formatDate = tool({
  description:
    "Format a date according to a specific locale and style. Supports international date formats.",
  inputSchema: formatDateSchema,
  execute: async (input: z.infer<typeof formatDateSchema>) => {
    try {
      const date = input.date ? new Date(input.date) : new Date();

      if (isNaN(date.getTime())) {
        return {
          error: `Could not parse date: '${input.date}'`,
        };
      }

      const options: Intl.DateTimeFormatOptions = {
        dateStyle: input.style,
        timeStyle: input.style,
      };

      if (input.timezone) {
        options.timeZone = input.timezone;
      }

      const formatted = new Intl.DateTimeFormat(input.locale, options).format(
        date,
      );

      // Also provide relative time
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let relative: string;
      if (diffDays === 0) {
        relative = "today";
      } else if (diffDays === 1) {
        relative = "tomorrow";
      } else if (diffDays === -1) {
        relative = "yesterday";
      } else if (diffDays > 0) {
        relative = `in ${diffDays} days`;
      } else {
        relative = `${Math.abs(diffDays)} days ago`;
      }

      return {
        input: date.toISOString(),
        formatted,
        locale: input.locale,
        style: input.style,
        timezone: input.timezone || "local",
        relative,
      };
    } catch (error) {
      return {
        error: `Date formatting failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

/**
 * All datetime tools bundled together
 */
export const datetimeTools = {
  getCurrentTime,
  convertTimezone,
  dateDiff,
  addToDate,
  formatDate,
};
