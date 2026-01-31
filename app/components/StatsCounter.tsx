"use client";

import { useEffect, useState } from "react";
import SlotCounter from "react-slot-counter";

interface StatItem {
  value: string | number;
  label: string;
  prefix?: string;
  suffix?: string;
}

export default function StatsCounter() {
  const [stats, setStats] = useState<StatItem[]>([
    { value: 0, label: "Active Agents" },
    { value: 0, label: "AI Companies" },
    { value: 0, label: "Revenue Generated", prefix: "$" },
    { value: 0, label: "Token Holders" },
  ]);

  useEffect(() => {
    const generateRandomStats = () => {
      return [
        {
          value: Math.floor(Math.random() * 900) + 100,
          label: "Active Agents",
        },
        { value: Math.floor(Math.random() * 90) + 10, label: "AI Companies" },
        {
          value: Math.floor(Math.random() * 900000) + 100000,
          label: "Revenue Generated",
          prefix: "$",
        },
        {
          value: Math.floor(Math.random() * 9000) + 1000,
          label: "Token Holders",
        },
      ];
    };

    const timeout = setTimeout(() => {
      setStats(generateRandomStats());
    }, 500);

    const interval = setInterval(() => {
      setStats(generateRandomStats());
    }, 4000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const formatValue = (stat: StatItem): string => {
    if (typeof stat.value === "number") {
      return stat.value.toLocaleString();
    }
    return String(stat.value);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fade-in-up animate-delay-400">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="gradient-border p-6 text-center card-hover relative backdrop-blur-sm"
        >
          <div className="text-xl md:text-2xl font-bold mb-1 flex items-center justify-center">
            {stat.prefix && (
              <span style={{ color: "#6FEC06" }}>{stat.prefix}</span>
            )}
            <SlotCounter
              value={formatValue(stat)}
              duration={2}
              animateOnVisible={{ triggerOnce: false, rootMargin: "0px" }}
              useMonospaceWidth
              sequentialAnimationMode
              speed={1.4}
            />
            {stat.suffix && (
              <span style={{ color: "#6FEC06" }}>{stat.suffix}</span>
            )}
          </div>
          <div className="text-white/60 text-sm">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
