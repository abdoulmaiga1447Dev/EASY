import React from "react";
import { motion } from "motion/react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "whatsapp";
  children: React.ReactNode;
  id: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  children,
  className = "",
  id,
  type = "button",
  ...props
}) => {
  let baseStyle = "px-5 py-2.5 rounded-lg font-sans font-medium text-xs tracking-wide transition-all duration-150 outline-none flex items-center justify-center gap-2 cursor-pointer";
  let variantStyle = "";

  if (variant === "primary") {
    // Elegant lux gold flat background
    variantStyle = "bg-gold text-dark hover:bg-gold/95 border border-gold/10 shadow-sm font-semibold active:translate-y-[1px]";
  } else if (variant === "outline") {
    // Subtle white border
    variantStyle = "bg-transparent text-white-premium border border-white/10 hover:border-white/25 hover:bg-white/5 active:translate-y-[1px]";
  } else if (variant === "ghost") {
    // Invisible until hover
    variantStyle = "bg-transparent text-muted-premium hover:text-white-premium hover:bg-white-premium/5 active:translate-y-[1px]";
  } else if (variant === "whatsapp") {
    // Flat premium green
    variantStyle = "bg-emerald-600 text-white-premium hover:bg-emerald-700 border border-emerald-600/10 shadow-sm active:translate-y-[1px]";
  }

  return (
    <motion.button
      id={id}
      type={type}
      whileTap={{ scale: 0.97 }}
      className={`${baseStyle} ${variantStyle} ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
};

