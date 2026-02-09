"use client";

import { Check, Shuffle, Wand2, Coins, Rocket } from "lucide-react";

const STEP_ICONS = [
  <Shuffle key="shuffle" className="w-4 h-4" />,
  <Wand2 key="wand" className="w-4 h-4" />,
  <Coins key="coins" className="w-4 h-4" />,
  <Rocket key="rocket" className="w-4 h-4" />,
];

const STEP_TITLES = ["Randomize", "Generate Image", "Configure", "Launch"];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Mint progress"
      className="flex items-center justify-center gap-2"
    >
      {STEP_TITLES.map((title, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;
        return (
          <div key={index} className="flex items-center">
            <div
              aria-current={isActive ? "step" : undefined}
              aria-label={`Step ${index + 1}: ${title}${isComplete ? " (completed)" : isActive ? " (current)" : ""}`}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                isComplete
                  ? "bg-[#6FEC06]/15 text-[#6FEC06] border border-[#6FEC06]/30"
                  : isActive
                    ? "bg-[#6FEC06]/10 text-[#6FEC06] border border-[#6FEC06]/40 shadow-lg shadow-[#6FEC06]/10"
                    : "bg-[#120557]/30 text-white/50 border border-white/10"
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-[#6FEC06]/20 blur-lg -z-10" />
              )}
              <div
                className={`w-5 h-5 flex items-center justify-center transition-transform ${isActive ? "scale-110" : ""}`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : STEP_ICONS[index]}
              </div>
              <span className="text-xs font-semibold tracking-wide hidden sm:inline">
                {title}
              </span>
              {/* Mobile: Show abbreviated label on hover/focus */}
              <span className="sr-only sm:hidden">{title}</span>
            </div>
            {index < STEP_TITLES.length - 1 && (
              <div
                className="w-8 h-[2px] mx-2 bg-[#120557] rounded-full overflow-hidden"
                aria-hidden="true"
              >
                <div
                  className={`h-full bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] transition-all duration-500 ${isComplete ? "w-full" : "w-0"}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
