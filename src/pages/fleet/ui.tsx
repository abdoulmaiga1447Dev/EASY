/**
 * Système de composants de l'espace SAVER Fleet Ops.
 * Palette : monochrome très sombre (type dashboard analytics de référence).
 *   fond #0A0A0B · cartes #141416 · bordures #232327 · champs #0F0F11
 *   texte #EDEDED · secondaire #8A8A8A · accent vert #22C55E (ponctuel) · rouge #EF4444
 * Règle : AUCUN aplat de couleur derrière les icônes. Surfaces pleines, bordures fines,
 * animations rapides et discrètes.
 */
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// ---------------------------------------------------------------- Boutons
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";
const BTN_BASE = "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors duration-150 outline-none disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "bg-[#22C55E] text-black font-semibold hover:bg-[#16A34A]",
  secondary: "bg-[#1C1C20] text-[#EDEDED] border border-[#232327] hover:bg-[#26262A]",
  ghost: "bg-transparent text-[#8A8A8A] hover:text-[#EDEDED]",
  danger: "bg-[#EF4444] text-white hover:brightness-110",
};
const BTN_SIZE: Record<BtnSize, string> = {
  sm: "text-xs px-3 py-2",
  md: "text-sm px-4 py-2.5",
  lg: "text-sm px-5 py-3",
};

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }
> = ({ variant = "primary", size = "md", className = "", children, ...props }) => (
  <motion.button whileTap={{ scale: 0.96 }} className={`${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`} {...(props as any)}>
    {children}
  </motion.button>
);

// ---------------------------------------------------------------- Surfaces
export const Panel: React.FC<{ children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void }> = ({ children, className = "", hover, onClick }) => (
  <motion.div
    onClick={onClick}
    whileHover={hover ? { y: -2, borderColor: "#33343A" } : undefined}
    transition={{ type: "spring", stiffness: 300, damping: 24 }}
    className={`bg-[#141416] border border-[#232327] rounded-2xl ${hover ? "cursor-pointer" : ""} ${className}`}
  >
    {children}
  </motion.div>
);

export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay }} className={className}>
    {children}
  </motion.div>
);

/** Carte KPI épurée (label · grand chiffre · variation optionnelle). Sans icône. */
export const StatCard: React.FC<{ label: string; value: React.ReactNode; delta?: string; deltaTone?: "green" | "red" | "muted"; delay?: number }> = ({ label, value, delta, deltaTone = "muted", delay = 0 }) => {
  const tone = deltaTone === "green" ? "text-[#22C55E]" : deltaTone === "red" ? "text-[#EF4444]" : "text-[#8A8A8A]";
  return (
    <Reveal delay={delay}>
      <Panel className="p-5">
        <div className="text-sm text-[#8A8A8A]">{label}</div>
        <div className="text-3xl font-bold text-[#EDEDED] tracking-tight mt-2">{value}</div>
        {delta && <div className={`text-xs mt-2 ${tone}`}>{delta}</div>}
      </Panel>
    </Reveal>
  );
};

// ---------------------------------------------------------------- Formulaires
export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="flex flex-col gap-1.5 text-sm">
    <span className="text-[#8A8A8A] font-medium">{label}</span>
    {children}
    {hint && <span className="text-xs text-[#6B6B72]">{hint}</span>}
  </label>
);

const CONTROL = "bg-[#0F0F11] border border-[#232327] rounded-xl px-3.5 py-2.5 text-[#EDEDED] outline-none transition-colors focus:border-[#22C55E]";
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`${CONTROL} ${props.className || ""}`} />
);
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select {...props} className={`${CONTROL} cursor-pointer ${props.className || ""}`} />
);

// ---------------------------------------------------------------- Indicateurs
export const StatusBadge: React.FC<{ active: boolean; labels?: [string, string] }> = ({ active, labels = ["Actif", "Désactivé"] }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${active ? "border-[#1E3A2A] text-[#22C55E]" : "border-[#3A1E22] text-[#EF4444]"}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
    {active ? labels[0] : labels[1]}
  </span>
);

export const Spinner: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-[#232327] border-t-[#22C55E] rounded-full animate-spin" />
  </div>
);

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center py-14 text-[#8A8A8A] text-sm">{children}</div>
);

export const Toast: React.FC<{ message: string; kind?: "ok" | "err" }> = ({ message, kind = "ok" }) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }}
    transition={{ type: "spring", stiffness: 400, damping: 28 }}
    className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-xl shadow-black/50 text-sm font-medium ${kind === "ok" ? "bg-[#22C55E] text-black" : "bg-[#EF4444] text-white"}`}
  >
    {message}
  </motion.div>
);

/** Modale centrée, animée, surfaces pleines. */
export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="bg-[#141416] border border-[#232327] rounded-2xl shadow-2xl shadow-black/60 w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-semibold text-[#EDEDED] mb-4">{title}</h3>
      {children}
    </motion.div>
  </motion.div>
);

// ---------------------------------------------------------------- Image protégée (agrandissable au clic)
export const AuthImage: React.FC<{ mediaId: string | null | undefined; alt?: string; className?: string; zoomable?: boolean }> = ({ mediaId, alt = "", className = "", zoomable = true }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
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
  if (!mediaId) return <div className={`bg-[#0F0F11] flex items-center justify-center text-[#8A8A8A] text-xs ${className}`}>—</div>;
  if (!url) return <div className={`bg-[#0F0F11] animate-pulse ${className}`} />;
  return (
    <>
      <img src={url} alt={alt} className={`${className} ${zoomable ? "cursor-zoom-in" : ""}`} style={{ objectFit: "cover" }} onClick={zoomable ? () => setZoom(true) : undefined} />
      <AnimatePresence>
        {zoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out" onClick={() => setZoom(false)}>
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} src={url} alt={alt} className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
