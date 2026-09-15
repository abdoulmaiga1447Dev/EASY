/**
 * Système de composants de l'espace SAVER Fleet Ops.
 * Direction : sobre & pro (type Linear/Stripe) + ergonomie d'app VTC.
 * Règles : surfaces PLEINES (aucun fond translucide), contrastes nets, coins arrondis,
 * animations rapides et discrètes (motion), retours au survol/clic systématiques.
 */
import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

// ---------------------------------------------------------------- Boutons
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";
const BTN_BASE = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors duration-150 outline-none disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "bg-gold text-dark hover:brightness-110 shadow-sm shadow-black/20",
  secondary: "bg-[#2A2D3A] text-white-premium hover:bg-[#333747]",
  ghost: "bg-transparent text-muted-premium hover:text-white-premium",
  danger: "bg-[#E5484D] text-white hover:brightness-110",
};
const BTN_SIZE: Record<BtnSize, string> = {
  sm: "text-xs px-3 py-2",
  md: "text-sm px-4 py-2.5",
  lg: "text-sm px-5 py-3",
};

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }
> = ({ variant = "primary", size = "md", className = "", children, ...props }) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    className={`${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
    {...(props as any)}
  >
    {children}
  </motion.button>
);

// ---------------------------------------------------------------- Surfaces
export const Panel: React.FC<{ children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void }> = ({ children, className = "", hover, onClick }) => (
  <motion.div
    onClick={onClick}
    whileHover={hover ? { y: -3 } : undefined}
    transition={{ type: "spring", stiffness: 300, damping: 24 }}
    className={`bg-surface rounded-2xl shadow-lg shadow-black/20 ${hover ? "cursor-pointer" : ""} ${className}`}
  >
    {children}
  </motion.div>
);

/** Apparition douce (à utiliser autour d'un écran ou d'une carte). */
export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay }}
    className={className}
  >
    {children}
  </motion.div>
);

/** Carte statistique (chiffre clé). */
export const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string; tone?: "gold" | "green" | "amber" | "red" | "neutral"; delay?: number }> = ({ icon, label, value, hint, tone = "neutral", delay = 0 }) => {
  const tones: Record<string, string> = {
    gold: "bg-[#0F3D28] text-gold",
    green: "bg-[#0F3D28] text-[#3EE07F]",
    amber: "bg-[#3D3210] text-[#FFCF5C]",
    red: "bg-[#3D1418] text-[#FF6B6B]",
    neutral: "bg-[#2A2D3A] text-white-premium",
  };
  return (
    <Reveal delay={delay}>
      <Panel className="p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${tones[tone]}`}>{icon}</div>
        <div className="text-3xl font-bold text-white-premium tracking-tight">{value}</div>
        <div className="text-sm text-muted-premium mt-1">{label}</div>
        {hint && <div className="text-xs text-muted-premium/70 mt-0.5">{hint}</div>}
      </Panel>
    </Reveal>
  );
};

// ---------------------------------------------------------------- Formulaires
export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="flex flex-col gap-1.5 text-sm">
    <span className="text-muted-premium font-medium">{label}</span>
    {children}
    {hint && <span className="text-xs text-muted-premium/70">{hint}</span>}
  </label>
);

const CONTROL = "bg-[#15161C] border border-[#33363F] rounded-xl px-3.5 py-2.5 text-white-premium outline-none transition-colors focus:border-gold";
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`${CONTROL} ${props.className || ""}`} />
);
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select {...props} className={`${CONTROL} cursor-pointer ${props.className || ""}`} />
);

// ---------------------------------------------------------------- Indicateurs
export const StatusBadge: React.FC<{ active: boolean; labels?: [string, string] }> = ({ active, labels = ["Actif", "Désactivé"] }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${active ? "bg-[#0F3D28] text-[#3EE07F]" : "bg-[#3D1418] text-[#FF6B6B]"}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-[#3EE07F]" : "bg-[#FF6B6B]"}`} />
    {active ? labels[0] : labels[1]}
  </span>
);

export const Spinner: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-[#33363F] border-t-gold rounded-full animate-spin" />
  </div>
);

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center py-14 text-muted-premium text-sm">{children}</div>
);

export const Toast: React.FC<{ message: string; kind?: "ok" | "err" }> = ({ message, kind = "ok" }) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 24 }}
    transition={{ type: "spring", stiffness: 400, damping: 28 }}
    className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-xl shadow-black/40 text-sm font-medium ${kind === "ok" ? "bg-gold text-dark" : "bg-[#E5484D] text-white"}`}
  >
    {message}
  </motion.div>
);

/** Modale centrée, animée, surfaces pleines. */
export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="bg-surface rounded-2xl shadow-2xl shadow-black/50 w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-semibold text-white-premium mb-4">{title}</h3>
      {children}
    </motion.div>
  </motion.div>
);

// ---------------------------------------------------------------- Image protégée
export const AuthImage: React.FC<{ mediaId: string | null | undefined; alt?: string; className?: string }> = ({ mediaId, alt = "", className = "" }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    if (!mediaId) { setUrl(null); return; }
    const token = localStorage.getItem("ev_access_token");
    fetch(`/api/media/${mediaId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => { if (!cancelled) { const u = URL.createObjectURL(b); revoked = u; setUrl(u); } })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; if (revoked) URL.revokeObjectURL(revoked); };
  }, [mediaId]);
  if (!mediaId) return <div className={`bg-[#15161C] flex items-center justify-center text-muted-premium text-xs ${className}`}>—</div>;
  if (!url) return <div className={`bg-[#15161C] animate-pulse ${className}`} />;
  return <img src={url} alt={alt} className={className} style={{ objectFit: "cover" }} />;
};
