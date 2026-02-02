"use client";

import { Loader2, Check, AlertCircle, Rocket } from "lucide-react";
import { LaunchStep } from "@/lib/hooks/useMintAgent";

interface LaunchModalProps {
  isLaunching: boolean;
  launchSteps: LaunchStep[];
}

export function LaunchModal({ isLaunching, launchSteps }: LaunchModalProps) {
  if (!isLaunching) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000028]/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-[#0a0520]/95 rounded-2xl p-8 border border-[#6FEC06]/20 shadow-2xl shadow-[#6FEC06]/10">
        <div className="text-center mb-8">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-2xl bg-[#6FEC06]/30 blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30">
              <Rocket className="w-8 h-8 text-[#6FEC06] animate-bounce" />
            </div>
          </div>
          <h3 className="font-bold text-xl font-display">Minting Agent</h3>
          <p className="text-white/50 text-sm mt-1">
            Please approve any wallet prompts
          </p>
        </div>
        <div className="space-y-3">
          {launchSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                step.status === "loading"
                  ? "bg-[#6FEC06]/10 border border-[#6FEC06]/30"
                  : step.status === "complete"
                    ? "bg-[#6FEC06]/5 border border-[#6FEC06]/20"
                    : step.status === "error"
                      ? "bg-red-500/10 border border-red-500/30"
                      : "bg-[#120557]/30 border border-white/10"
              }`}
            >
              <div className="flex-shrink-0">
                {step.status === "pending" && (
                  <div className="w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center text-white/40 text-xs font-medium">
                    {index + 1}
                  </div>
                )}
                {step.status === "loading" && (
                  <Loader2 className="w-6 h-6 text-[#6FEC06] animate-spin" />
                )}
                {step.status === "complete" && (
                  <div className="w-6 h-6 rounded-full bg-[#6FEC06] flex items-center justify-center">
                    <Check className="w-4 h-4 text-black" />
                  </div>
                )}
                {step.status === "error" && (
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  step.status === "loading"
                    ? "text-white"
                    : step.status === "complete"
                      ? "text-[#6FEC06]"
                      : step.status === "error"
                        ? "text-red-400"
                        : "text-white/40"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
