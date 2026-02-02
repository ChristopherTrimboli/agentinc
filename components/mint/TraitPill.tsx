"use client";

interface TraitPillProps {
  icon: string;
  name: string;
  size?: "sm" | "md";
  className?: string;
}

export function TraitPill({
  icon,
  name,
  size = "sm",
  className = "",
}: TraitPillProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border bg-[#120557]/40 border-[#6FEC06]/20 ${sizeClasses[size]} ${className}`}
    >
      <span className="text-base">{icon}</span>
      <span className="font-medium text-white/80">{name}</span>
    </div>
  );
}
