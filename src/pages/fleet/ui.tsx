/** Petits composants UI partagés par l'espace SAVER Fleet Ops (thème sombre / accent gold). */
import React from "react";

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="flex flex-col gap-1.5 text-sm">
    <span className="text-muted-premium font-medium">{label}</span>
    {children}
    {hint && <span className="text-xs text-muted-premium/70">{hint}</span>}
  </label>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`bg-dark border border-gold/15 focus:border-gold/50 rounded-md px-3 py-2 text-white-premium outline-none transition ${props.className || ""}`}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className={`bg-dark border border-gold/15 focus:border-gold/50 rounded-md px-3 py-2 text-white-premium outline-none transition ${props.className || ""}`}
  />
);

export const StatusBadge: React.FC<{ active: boolean; labels?: [string, string] }> = ({ active, labels = ["Actif", "Désactivé"] }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${active ? "bg-gold/15 text-gold" : "bg-red-500/15 text-red-400"}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-gold" : "bg-red-400"}`} />
    {active ? labels[0] : labels[1]}
  </span>
);

export const Toast: React.FC<{ message: string; kind?: "ok" | "err" }> = ({ message, kind = "ok" }) => (
  <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm ${kind === "ok" ? "bg-gold text-dark" : "bg-red-500 text-white"}`}>
    {message}
  </div>
);

export const Spinner: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
  </div>
);

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center py-12 text-muted-premium text-sm">{children}</div>
);

/** Modale légère centrée. */
export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
    <div className="bg-surface border border-gold/20 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-semibold text-white-premium mb-4">{title}</h3>
      {children}
    </div>
  </div>
);
