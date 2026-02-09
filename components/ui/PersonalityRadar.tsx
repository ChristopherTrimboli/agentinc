"use client";

import {
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  type PersonalityScores,
  type MBTIType,
  DIMENSIONS,
  MBTI_TYPES,
  LEGACY_TO_SCORES,
  deriveMBTI,
} from "@/lib/agentTraits";

/**
 * Resolve any personality identifier to MBTI type data and scores.
 * Handles: explicit scores, MBTI type strings ("INTJ"), and legacy types ("maverick").
 */
function resolvePersonality(
  personality: string,
  scores?: PersonalityScores,
): { mbti: (typeof MBTI_TYPES)[MBTIType]; scores: PersonalityScores } | null {
  // 1. Explicit scores provided — derive MBTI from them
  if (scores) {
    const type = deriveMBTI(scores);
    return { mbti: MBTI_TYPES[type], scores };
  }

  // 2. Personality string is already an MBTI type
  if (personality in MBTI_TYPES) {
    // No scores available — use neutral 50s (will show badge only, no radar)
    const defaultScores: PersonalityScores = {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50,
    };
    return { mbti: MBTI_TYPES[personality as MBTIType], scores: defaultScores };
  }

  // 3. Legacy personality type — map to OCEAN scores and derive MBTI
  const legacyScores = LEGACY_TO_SCORES[personality];
  if (legacyScores) {
    const type = deriveMBTI(legacyScores);
    return { mbti: MBTI_TYPES[type], scores: legacyScores };
  }

  return null;
}

interface PersonalityRadarProps {
  scores: PersonalityScores;
  /** Override the color of the radar fill (defaults to MBTI type color) */
  color?: string;
  /** Show the MBTI type badge below the chart */
  showMBTI?: boolean;
  /** CSS className for the container */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show score values on the axis labels */
  showValues?: boolean;
  /** Legacy personality ID for fallback display if no scores */
  legacyPersonality?: string;
}

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const SIZE_CLASSES = {
  sm: "min-h-[180px] max-h-[200px]",
  md: "min-h-[250px] max-h-[300px]",
  lg: "min-h-[350px] max-h-[400px]",
};

export function PersonalityRadar({
  scores,
  color,
  showMBTI = true,
  className = "",
  size = "md",
  showValues = false,
}: PersonalityRadarProps) {
  const mbtiType = deriveMBTI(scores);
  const mbti = MBTI_TYPES[mbtiType];
  const fillColor = color ?? mbti.color;

  const data = DIMENSIONS.map((dim) => ({
    dimension: dim.shortName,
    fullName: dim.name,
    score: scores[dim.id],
    fullMark: 100,
  }));

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <ChartContainer
        config={chartConfig}
        className={`w-full ${SIZE_CLASSES[size]}`}
      >
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" gridType="polygon" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={({ x, y, payload }) => {
              const dim = DIMENSIONS.find((d) => d.shortName === payload.value);
              const score = scores[dim?.id ?? "openness"];
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white/70 text-[10px] font-medium"
                >
                  {payload.value}
                  {showValues && (
                    <tspan className="fill-white/40 text-[8px]">
                      {` ${score}`}
                    </tspan>
                  )}
                </text>
              );
            }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_value, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName ?? "";
                }}
              />
            }
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke={fillColor}
            fill={fillColor}
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ChartContainer>

      {showMBTI && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg">{mbti.icon}</span>
          <div className="text-center">
            <p className="text-sm font-bold" style={{ color: fillColor }}>
              {mbti.id}
            </p>
            <p className="text-[10px] text-white/50">{mbti.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for use in cards and list items.
 * Always shows MBTI type — legacy personality types are auto-converted.
 */
export function PersonalityBadge({
  personality,
  scores,
  className = "",
}: {
  personality: string;
  scores?: PersonalityScores;
  className?: string;
}) {
  const resolved = resolvePersonality(personality, scores);
  if (!resolved) return null;

  const { mbti } = resolved;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${className}`}
      style={{
        backgroundColor: `${mbti.color}15`,
        borderColor: `${mbti.color}40`,
        color: mbti.color,
      }}
    >
      <span>{mbti.icon}</span>
      {mbti.id} &middot; {mbti.name}
    </span>
  );
}
