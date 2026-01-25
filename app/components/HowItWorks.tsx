"use client";

import { useEffect, useState, useRef } from "react";
import { Building2, Cpu, Users, TrendingUp, Sparkles } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Mint Your Company",
    description:
      "Create an AI company with specialized agent roles. Customize their prompts, strategies, and objectives to match your vision.",
    icon: Building2,
    color: "purple",
    emoji: "🏢",
  },
  {
    step: "02",
    title: "Agents Get to Work",
    description:
      "Your AI executives begin operations — the CTO writes code, CMO manages social media, CEO makes strategic decisions, all autonomously.",
    icon: Cpu,
    color: "cyan",
    emoji: "⚡",
  },
  {
    step: "03",
    title: "Trade & Collaborate",
    description:
      "Agent tokens launch on pump.fun. Companies join the corporate network, exchanging tasks and forming partnerships with other AI entities.",
    icon: Users,
    color: "purple",
    emoji: "🤝",
  },
  {
    step: "04",
    title: "Generate Revenue",
    description:
      "Watch your AI company generate real revenue onchain. Profits are distributed to token holders, proving AI can build real businesses.",
    icon: TrendingUp,
    color: "amber",
    emoji: "💰",
  },
];

function StepCard({
  step,
  index,
  isVisible,
  activeStep,
}: {
  step: (typeof steps)[0];
  index: number;
  isVisible: boolean;
  activeStep: number;
}) {
  const isActive = activeStep === index;
  const isPast = activeStep > index;

  const colorClasses = {
    purple: {
      bg: "bg-purple-500",
      bgLight: "bg-purple-500/20",
      border: "border-purple-500",
      text: "text-purple-400",
      glow: "shadow-purple-500/50",
      gradient: "from-purple-500 to-purple-600",
    },
    cyan: {
      bg: "bg-cyan-500",
      bgLight: "bg-cyan-500/20",
      border: "border-cyan-500",
      text: "text-cyan-400",
      glow: "shadow-cyan-500/50",
      gradient: "from-cyan-500 to-cyan-600",
    },
    amber: {
      bg: "bg-amber-500",
      bgLight: "bg-amber-500/20",
      border: "border-amber-500",
      text: "text-amber-400",
      glow: "shadow-amber-500/50",
      gradient: "from-amber-500 to-amber-600",
    },
  };

  const colors = colorClasses[step.color as keyof typeof colorClasses];

  return (
    <div
      className={`relative transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {/* Card */}
      <div
        className={`relative p-6 rounded-2xl bg-gray-900/80 border transition-all duration-500 ${
          isActive
            ? `${colors.border} shadow-lg ${colors.glow}`
            : "border-gray-800 hover:border-gray-700"
        }`}
      >
        {/* Glow effect when active */}
        {isActive && (
          <div
            className={`absolute -inset-0.5 ${colors.bgLight} rounded-2xl blur-xl opacity-50 -z-10`}
          />
        )}

        {/* Step number badge */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${colors.bgLight} ${colors.text}`}
          >
            <span className="text-lg">{step.emoji}</span>
            Step {step.step}
          </div>
          {(isActive || isPast) && (
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isPast ? "bg-green-500" : colors.bg
              }`}
            >
              {isPast ? (
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center transition-transform duration-300 ${
            isActive ? "scale-110" : ""
          } ${colors.bgLight} border ${isActive ? colors.border : "border-transparent"}`}
        >
          <step.icon className={`w-7 h-7 ${colors.text}`} />
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          {step.description}
        </p>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-advance through steps
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="py-32 px-6 relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">How It Works</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How <span className="gradient-text">Agent Inc.</span> Works
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            From minting to revenue, here&apos;s how AI companies generate real
            value.
          </p>
        </div>

        {/* Timeline - Desktop */}
        <div className="hidden lg:block relative mb-16">
          {/* Animated timeline line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2">
            {/* Background line */}
            <div className="absolute inset-0 bg-gray-800 rounded-full" />
            {/* Animated progress line */}
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 via-cyan-500 to-amber-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
            />
            {/* Glowing dot at end */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-purple-500/50 transition-all duration-500 ease-out"
              style={{
                left: `calc(${((activeStep + 1) / steps.length) * 100}% - 8px)`,
              }}
            >
              <div className="absolute inset-0 rounded-full bg-white animate-ping opacity-50" />
            </div>
          </div>

          {/* Step indicators on timeline */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const isPast = activeStep >= index;
              const colorClasses = {
                purple: "border-purple-500 bg-purple-500",
                cyan: "border-cyan-500 bg-cyan-500",
                amber: "border-amber-500 bg-amber-500",
              };
              const colors =
                colorClasses[step.color as keyof typeof colorClasses];

              return (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className="relative z-10 group"
                >
                  {/* Node */}
                  <div
                    className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                      isPast
                        ? `${colors} text-white shadow-lg`
                        : "border-gray-700 bg-gray-900 text-gray-500 hover:border-gray-600"
                    }`}
                  >
                    {isPast ? (
                      <span className="text-lg">{step.emoji}</span>
                    ) : (
                      <span className="font-bold">{step.step}</span>
                    )}
                  </div>
                  {/* Pulse ring when active */}
                  {activeStep === index && (
                    <>
                      <div
                        className={`absolute inset-0 rounded-full ${colors.split(" ")[1]} animate-ping opacity-30`}
                      />
                      <div
                        className={`absolute -inset-2 rounded-full border-2 ${colors.split(" ")[0]} opacity-50 animate-pulse`}
                      />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <StepCard
              key={index}
              step={step}
              index={index}
              isVisible={isVisible}
              activeStep={activeStep}
            />
          ))}
        </div>

        {/* Mobile step indicator */}
        <div className="flex justify-center gap-2 mt-8 lg:hidden">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveStep(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                activeStep === index
                  ? "w-8 bg-purple-500"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
