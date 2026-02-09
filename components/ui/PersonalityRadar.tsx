/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
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
  DIMENSIONS,
  MBTI_TYPES,
  deriveMBTI,
} from "@/lib/agentTraits";

interface PersonalityRadarProps {
  scores: PersonalityScores;
  /** Override the color of the radar fill (defaults to MBTI type color) */
  color?: string;
  /** CSS className for the container */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Display variant - full with all details or compact for cards */
  variant?: "full" | "compact";
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
  className = "",
  size = "md",
  variant = "full",
}: PersonalityRadarProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredDim, setHoveredDim] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  const mbtiType = deriveMBTI(scores);
  const mbti = MBTI_TYPES[mbtiType];
  const fillColor = color ?? mbti.color;

  const data = DIMENSIONS.map((dim) => ({
    dimension: dim.shortName,
    fullName: dim.name,
    score: scores[dim.id],
    fullMark: 100,
  }));

  // Calculate average score for display
  const avgScore = Math.round(
    Object.values(scores).reduce((sum, val) => sum + val, 0) / 5,
  );

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Trigger animation when scores change
  useEffect(() => {
    if (mounted) {
      setAnimationKey((prev) => prev + 1);
    }
  }, [scores, mounted]);

  // Compact version for cards
  if (variant === "compact") {
    return (
      <div
        className={`relative ${className}`}
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1)" : "scale(0.95)",
          transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        }}
      >
        {/* Chart with minimal styling */}
        <ChartContainer
          config={chartConfig}
          className="w-full min-h-[160px] max-h-[180px]"
        >
          <RadarChart data={data}>
            <PolarGrid
              stroke={`${fillColor}20`}
              strokeWidth={1}
              gridType="polygon"
              style={{ transition: "stroke 0.7s ease" }}
            />

            <PolarAngleAxis
              dataKey="dimension"
              tick={({ x, y, payload }) => {
                const dim = DIMENSIONS.find(
                  (d) => d.shortName === payload.value,
                );
                const score = scores[dim?.id ?? "openness"];
                const isHovered = hoveredDim === dim?.id;

                return (
                  <g
                    onMouseEnter={() => setHoveredDim(dim?.id ?? null)}
                    onMouseLeave={() => setHoveredDim(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <text
                      x={x}
                      y={y - 5}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="font-bold tracking-wider transition-all duration-200"
                      style={{
                        fill: isHovered ? fillColor : "rgba(255,255,255,0.65)",
                        fontSize: isHovered ? "11px" : "10px",
                        filter: isHovered
                          ? `drop-shadow(0 0 3px ${fillColor})`
                          : "none",
                      }}
                    >
                      {payload.value}
                    </text>

                    <text
                      x={x}
                      y={y + 7}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="font-mono font-semibold tabular-nums"
                      style={{
                        fill: isHovered ? fillColor : "rgba(255,255,255,0.4)",
                        fontSize: isHovered ? "10px" : "9px",
                        transition: "fill 0.3s ease, font-size 0.3s ease",
                      }}
                    >
                      {score}
                    </text>
                  </g>
                );
              }}
            />

            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />

            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="backdrop-blur-xl bg-black/80 border border-white/10 rounded-lg shadow-2xl text-xs"
                  labelFormatter={(_value, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullName ?? "";
                  }}
                />
              }
            />

            {/* Glow layer */}
            <Radar
              key={`glow-${animationKey}`}
              dataKey="score"
              stroke={fillColor}
              fill={fillColor}
              fillOpacity={0.08}
              strokeWidth={0}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-in-out"
              hide
            />

            {/* Main radar */}
            <Radar
              key={`main-${animationKey}`}
              name="Score"
              dataKey="score"
              stroke={fillColor}
              fill={fillColor}
              fillOpacity={0.25}
              strokeWidth={2.5}
              dot={{
                fill: fillColor,
                r: 3.5,
                strokeWidth: 1.5,
                stroke: "rgba(0,0,0,0.4)",
              }}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-in-out"
              style={{
                filter: `drop-shadow(0 0 5px ${fillColor}60)`,
              }}
            />
          </RadarChart>
        </ChartContainer>
      </div>
    );
  }

  // Full version with all details
  return (
    <div
      className={`relative flex flex-col items-center ${className}`}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "scale(1)" : "scale(0.95)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
      }}
    >
      {/* Outer glow effect */}
      <div
        className="absolute inset-0 rounded-2xl blur-2xl opacity-20 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle at center, ${fillColor}, transparent 70%)`,
          animation: "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      />

      {/* Main container with glass effect */}
      <div className="relative w-full rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-sm border border-white/5 p-6 shadow-2xl">
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none rounded-2xl transition-all duration-700"
          style={{
            backgroundImage: `linear-gradient(${fillColor} 1px, transparent 1px), linear-gradient(90deg, ${fillColor} 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Header with stats */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold relative overflow-hidden transition-all duration-700"
              style={{
                background: `linear-gradient(135deg, ${fillColor}20, ${fillColor}10)`,
                boxShadow: `0 0 20px ${fillColor}20, inset 0 0 20px ${fillColor}10`,
              }}
            >
              <span className="relative z-10 transition-all duration-500">
                {mbti.icon}
              </span>
              <div
                className="absolute inset-0 opacity-30 transition-all duration-700"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${fillColor}, transparent)`,
                }}
              />
            </div>
            <div>
              <p className="text-xs font-mono text-white/40 tracking-wider">
                PERSONALITY_MATRIX
              </p>
              <p
                className="text-sm font-bold tracking-wide transition-colors duration-500"
                style={{ color: fillColor }}
              >
                {mbti.id} · {mbti.name}
              </p>
            </div>
          </div>

          {/* Average score indicator */}
          <div className="flex flex-col items-end">
            <p className="text-xs font-mono text-white/40 tracking-wider">
              AVG_SCORE
            </p>
            <div className="flex items-baseline gap-1">
              <span
                className="text-2xl font-bold tabular-nums transition-all duration-500"
                style={{ color: fillColor }}
              >
                {avgScore}
              </span>
              <span className="text-xs text-white/30 font-mono">/100</span>
            </div>
          </div>
        </div>

        {/* Chart container */}
        <div className="relative">
          {/* Scanline effect */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] z-20"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
              animation: "scanline 8s linear infinite",
            }}
          />

          <ChartContainer
            config={chartConfig}
            className={`w-full ${SIZE_CLASSES[size]} relative z-10`}
          >
            <RadarChart data={data}>
              {/* Multi-layer grid for depth */}
              <PolarGrid
                stroke={`${fillColor}15`}
                strokeWidth={1}
                gridType="polygon"
                style={{ transition: "stroke 0.7s ease" }}
              />
              <PolarGrid
                stroke={`${fillColor}08`}
                strokeWidth={2}
                gridType="circle"
                style={{ transition: "stroke 0.7s ease" }}
              />

              <PolarAngleAxis
                dataKey="dimension"
                tick={({ x, y, payload }) => {
                  const dim = DIMENSIONS.find(
                    (d) => d.shortName === payload.value,
                  );
                  const score = scores[dim?.id ?? "openness"];
                  const isHovered = hoveredDim === dim?.id;

                  return (
                    <g
                      onMouseEnter={() => setHoveredDim(dim?.id ?? null)}
                      onMouseLeave={() => setHoveredDim(null)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Background glow on hover */}
                      {isHovered && (
                        <circle
                          cx={x}
                          cy={y}
                          r={24}
                          fill={fillColor}
                          opacity={0.1}
                          style={{
                            filter: `blur(8px)`,
                          }}
                        />
                      )}

                      {/* Dimension label */}
                      <text
                        x={x}
                        y={y - 8}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-bold tracking-wider transition-all duration-200"
                        style={{
                          fill: isHovered ? fillColor : "rgba(255,255,255,0.7)",
                          fontSize: isHovered ? "13px" : "11px",
                          filter: isHovered
                            ? `drop-shadow(0 0 4px ${fillColor})`
                            : "none",
                        }}
                      >
                        {payload.value}
                      </text>

                      {/* Score value */}
                      <text
                        x={x}
                        y={y + 6}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono font-semibold tabular-nums"
                        style={{
                          fill: isHovered
                            ? fillColor
                            : "rgba(255,255,255,0.35)",
                          fontSize: isHovered ? "12px" : "9px",
                          transition: "fill 0.3s ease, font-size 0.3s ease",
                        }}
                      >
                        {score}
                      </text>

                      {/* Decorative corner brackets */}
                      {isHovered && (
                        <>
                          <line
                            x1={x - 15}
                            y1={y - 18}
                            x2={x - 10}
                            y2={y - 18}
                            stroke={fillColor}
                            strokeWidth={1.5}
                            opacity={0.6}
                          />
                          <line
                            x1={x - 15}
                            y1={y - 18}
                            x2={x - 15}
                            y2={y - 13}
                            stroke={fillColor}
                            strokeWidth={1.5}
                            opacity={0.6}
                          />
                          <line
                            x1={x + 15}
                            y1={y - 18}
                            x2={x + 10}
                            y2={y - 18}
                            stroke={fillColor}
                            strokeWidth={1.5}
                            opacity={0.6}
                          />
                          <line
                            x1={x + 15}
                            y1={y - 18}
                            x2={x + 15}
                            y2={y - 13}
                            stroke={fillColor}
                            strokeWidth={1.5}
                            opacity={0.6}
                          />
                        </>
                      )}
                    </g>
                  );
                }}
              />

              <PolarRadiusAxis
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />

              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="backdrop-blur-xl bg-black/80 border border-white/10 rounded-lg shadow-2xl"
                    labelFormatter={(_value, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.fullName ?? "";
                    }}
                  />
                }
              />

              {/* Outer glow radar */}
              <Radar
                key={`glow-${animationKey}`}
                dataKey="score"
                stroke={fillColor}
                fill={fillColor}
                fillOpacity={0.05}
                strokeWidth={0}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-in-out"
                hide
              />

              {/* Main radar with animated stroke */}
              <Radar
                key={`main-${animationKey}`}
                name="Score"
                dataKey="score"
                stroke={fillColor}
                fill={fillColor}
                fillOpacity={0.2}
                strokeWidth={2.5}
                dot={{
                  fill: fillColor,
                  r: 4,
                  strokeWidth: 2,
                  stroke: "rgba(0,0,0,0.5)",
                }}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-in-out"
                style={{
                  filter: `drop-shadow(0 0 6px ${fillColor}60)`,
                }}
              />
            </RadarChart>
          </ChartContainer>
        </div>

        {/* Dimension legend */}
        <div className="grid grid-cols-5 gap-2 mt-4 relative z-10">
          {DIMENSIONS.map((dim) => {
            const score = scores[dim.id];
            const isHovered = hoveredDim === dim.id;
            const percentage = score;

            return (
              <div
                key={dim.id}
                className="flex flex-col gap-1 transition-all duration-200"
                onMouseEnter={() => setHoveredDim(dim.id)}
                onMouseLeave={() => setHoveredDim(null)}
                style={{
                  opacity: hoveredDim ? (isHovered ? 1 : 0.4) : 1,
                  transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                }}
              >
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-white/40 tracking-wider uppercase">
                    {dim.shortName}
                  </span>
                  <span className="text-white/60 font-bold tabular-nums transition-all duration-500">
                    {score}
                  </span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${percentage}%`,
                      background: `linear-gradient(90deg, ${fillColor}80, ${fillColor})`,
                      boxShadow: isHovered ? `0 0 8px ${fillColor}` : "none",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tech detail overlay in corners */}
        <div className="absolute top-2 left-2 text-[8px] font-mono text-white/20 tracking-wider">
          ID:{mbti.id}
        </div>
        <div className="absolute top-2 right-2 text-[8px] font-mono text-white/20 tracking-wider">
          VER:2.1
        </div>
        <div className="absolute bottom-2 left-2 text-[8px] font-mono text-white/20 tracking-wider">
          OCEAN_MODEL
        </div>
        <div className="absolute bottom-2 right-2 text-[8px] font-mono text-white/20 tracking-wider flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
          ACTIVE
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.05);
          }
        }
        @keyframes scanline {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(10px);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Compact badge showing MBTI type.
 */
export function PersonalityBadge({
  scores,
  className = "",
}: {
  scores: PersonalityScores;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const mbtiType = deriveMBTI(scores);
  const mbti = MBTI_TYPES[mbtiType];

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border relative overflow-hidden transition-all duration-300 ${className}`}
      style={{
        backgroundColor: `${mbti.color}08`,
        borderColor: `${mbti.color}30`,
        color: mbti.color,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "scale(1)" : "scale(0.9)",
        boxShadow: `0 0 15px ${mbti.color}10, inset 0 0 15px ${mbti.color}05`,
      }}
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${mbti.color}10, transparent, ${mbti.color}10)`,
        }}
      />

      {/* Icon with glow */}
      <span
        className="relative z-10 text-sm"
        style={{
          filter: `drop-shadow(0 0 4px ${mbti.color}40)`,
        }}
      >
        {mbti.icon}
      </span>

      {/* Text */}
      <span className="relative z-10 font-mono tracking-wider">{mbti.id}</span>

      <span className="relative z-10 opacity-60">&middot;</span>

      <span className="relative z-10 font-medium">{mbti.name}</span>

      {/* Corner accent */}
      <div
        className="absolute top-0 right-0 w-6 h-6 opacity-20"
        style={{
          background: `radial-gradient(circle at top right, ${mbti.color}, transparent)`,
        }}
      />
    </span>
  );
}
