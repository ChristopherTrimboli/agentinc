"use client";

import { Check, Shuffle, Wand2, Coins, Rocket } from "lucide-react";

const STEPS = [
  { icon: Shuffle, label: "Randomize" },
  { icon: Wand2, label: "Image" },
  { icon: Coins, label: "Configure" },
  { icon: Rocket, label: "Launch" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Mint progress"
      className="flex items-center justify-center"
    >
      {STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;
        const Icon = step.icon;

        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                aria-current={isActive ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${step.label}${isComplete ? " (completed)" : isActive ? " (current)" : ""}`}
                className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isComplete
                    ? "bg-[#6FEC06] text-black"
                    : isActive
                      ? "bg-[#6FEC06]/15 text-[#6FEC06] ring-2 ring-[#6FEC06]/50"
                      : "bg-white/5 text-white/30"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-[#6FEC06]/20 blur-md -z-10 animate-pulse" />
                )}
                {isComplete ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold tracking-wide transition-colors duration-300 ${
                  isActive
                    ? "text-[#6FEC06]"
                    : isComplete
                      ? "text-white/70"
                      : "text-white/30"
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <div
                className="w-12 sm:w-16 h-[2px] mx-3 sm:mx-4 -mt-5 rounded-full overflow-hidden bg-white/10"
                aria-hidden="true"
              >
                <div
                  className={`h-full bg-[#6FEC06] rounded-full transition-all duration-500 ease-out ${
                    isComplete ? "w-full" : "w-0"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
