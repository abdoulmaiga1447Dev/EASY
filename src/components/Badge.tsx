import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "green" | "slate" | "outline";
  id: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "gold",
  id,
  className = ""
}) => {
  let colorStyle = "";
  let dotColor = "";

  switch (variant) {
    case "gold":
      colorStyle = "bg-neutral-900/60 text-gold-light border border-gold/15";
      dotColor = "bg-gold";
      break;
    case "green":
      colorStyle = "bg-neutral-900/60 text-emerald-400 border border-emerald-500/15";
      dotColor = "bg-emerald-500";
      break;
    case "slate":
      colorStyle = "bg-neutral-900/60 text-muted-premium border border-white/5";
      dotColor = "bg-neutral-500";
      break;
    case "outline":
      colorStyle = "bg-transparent text-white-premium border border-white/10";
      dotColor = "bg-white-premium";
      break;
  }

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold ${colorStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      {children}
    </span>
  );
};
