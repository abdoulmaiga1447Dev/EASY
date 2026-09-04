import React from "react";
import { motion } from "motion/react";

interface CardProps {
  children: React.ReactNode;
  id: string;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  id,
  className = "",
  glow = false
}) => {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-surface border border-gold/10 hover:border-gold/30 rounded-lg p-6 transition-all duration-300 ${
        glow ? "gold-glow" : ""
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};

