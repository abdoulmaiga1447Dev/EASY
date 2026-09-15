/**
 * Espace de travail SAVER Fleet Ops — coquille commune aux profils internes.
 * Direction : sobre & pro (Linear/Stripe) + ergonomie app VTC. Sidebar à accent,
 * transitions animées entre sections, tableau de bord à cartes de statistiques.
 * Responsive : tiroir coulissant sur mobile, barre fixe sur grand écran.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Shield, Car, CalendarClock, LogOut, User, Building2, Wallet, Menu, X,
  AlertTriangle, Users, ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRbac } from "../../context/RbacContext";
import { api } from "../../api/fleet";
import { FleetAdmin } from "./FleetAdmin";
import { FleetVehicles } from "./FleetVehicles";
import { FleetAssignments } from "./FleetAssignments";
import { Spinner, EmptyState, StatCard, Panel, Reveal } from "./ui";

type Section = "dashboard" | "admin" | "vehicules" | "attribution" | "moi";

const ROLE_LABELS: Record<string, string> = {
  admin_direction: "Admin / Direction",
  superviseur_logistique: "Superviseur Logistique",
  responsable_terrain: "Responsable terrain",
  dispatcher: "Dispatcher",
  finance: "Finance",
  maintenance: "Maintenance",
  chauffeur: "Chauffeur",
  externe_banque: "Banque / Investisseur",
  externe_client: "Client flotte",
};

const Placeholder: React.FC<{ titre: string; bloc: string }> = ({ titre, bloc }) => (
  <Reveal>
    <div className="bg-surface rounded-2xl p-10 text-center shadow-lg shadow-black/20">
      <h3 className="text-lg font-semibold text-white-premium">{titre}</h3>
      <p className="text-sm text-muted-premium mt-2">Module prévu pour la {bloc}. L'ossature (rôles, permissions, sites) est déjà en place.</p>
    </div>
  </Reveal>
);

// --------------------------- Tableau de bord ---------------------------
const Dashboard: React.FC<{ onNavigate: (s: Section) => void }> = ({ onNavigate }) => {
  const { ctx, can } = useRbac();
  const [stats, setStats] = useState<{ vehicules?: number; disponibles?: number; alertes?: number; attributions?: number; chauffeurs?: number }>({});

  useEffect(() => {
    if (!ctx) return;
    const site = ctx.sites[0]?.id;
    (async () => {
      const s: typeof stats = {};
      try {
        if (can("vehicule.voir")) {
          const v = await api.get<{ vehicles: any[] }>("/api/fleet/vehicles?pageSize=100");
          s.vehicules = v.vehicles.length;
          s.disponibles = v.vehicles.filter((x) => x.statut === "Disponible").length;
        }
        if (can("alerte.voir")) {
          const a = await api.get<{ alerts: any[] }>("/api/fleet/alerts");
          s.alertes = a.alerts.length;
        }
        if (can("attribution.voir") && site) {
          const d = await api.get<{ shifts: { A: any[]; B: any[] }; chauffeurs: any[] }>(`/api/fleet/assignments?siteId=${site}`);
          s.attributions = d.shifts.A.length + d.shifts.B.length;
          s.chauffeurs = d.chauffeurs.length;
        }
      } catch { /* permissions/erreurs ignorées : les tuiles concernées ne s'affichent pas */ }
      setStats(s);
    })();
  }, [ctx, can]);

  if (!ctx) return null;

  const tiles: { key: string; icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string; tone: any; show: boolean }[] = [
    { key: "veh", icon: <Car size={20} />, label: "Véhicules", value: stats.vehicules ?? "—", hint: stats.disponibles != null ? `${stats.disponibles} disponibles` : undefined, tone: "gold", show: can("vehicule.voir") },
    { key: "alt", icon: <AlertTriangle size={20} />, label: "Alertes en cours", value: stats.alertes ?? "—", tone: (stats.alertes ?? 0) > 0 ? "amber" : "green", show: can("alerte.voir") },
    { key: "att", icon: <CalendarClock size={20} />, label: "Attributions du jour", value: stats.attributions ?? "—", tone: "neutral", show: can("attribution.voir") },
    { key: "chf", icon: <Users size={20} />, label: "Chauffeurs (site)", value: stats.chauffeurs ?? "—", tone: "neutral", show: can("attribution.voir") },
  ].filter((t) => t.show);

  const shortcutsAll: { section: Section; icon: React.ReactNode; titre: string; desc: string; show: boolean }[] = [
    { section: "admin", icon: <Shield size={18} />, titre: "Administration", desc: "Sites, utilisateurs, rôles, paramètres", show: ctx.permissions.some((p) => ["site.voir", "utilisateur.voir", "role.voir", "parametre.voir", "audit.voir"].includes(p)) },
    { section: "vehicules", icon: <Car size={18} />, titre: "Véhicules", desc: "Flotte, documents, échéances", show: can("vehicule.voir") },
    { section: "attribution", icon: <CalendarClock size={18} />, titre: "Attribution", desc: "Planning véhicule ↔ chauffeur", show: can("attribution.voir") },
    { section: "moi", icon: <Wallet size={18} />, titre: "Mon espace", desc: "Profil, planning, documents", show: ctx.roleCode === "chauffeur" },
  ];
  const shortcuts = shortcutsAll.filter((s) => s.show);

  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold text-white-premium tracking-tight">Bonjour, {ctx.name.split(" ")[0]} 👋</h1>
          <p className="text-muted-premium mt-1.5">{ROLE_LABELS[ctx.roleCode || ""] || ctx.roleCode} · {ctx.allSites ? "Tous les sites" : ctx.sites.map((s) => s.nom).join(", ") || "Aucun site"}</p>
        </div>
      </Reveal>

      {tiles.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {tiles.map((t, i) => <StatCard key={t.key} icon={t.icon} label={t.label} value={t.value} hint={t.hint} tone={t.tone} delay={i * 0.06} />)}
        </div>
      )}

      {shortcuts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-premium uppercase tracking-wide mb-3">Accès rapides</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shortcuts.map((s, i) => (
              <Reveal key={s.section} delay={0.1 + i * 0.06}>
                <Panel hover onClick={() => onNavigate(s.section)} className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#0F3D28] text-gold flex items-center justify-center shrink-0">{s.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white-premium">{s.titre}</div>
                    <div className="text-xs text-muted-premium mt-0.5 truncate">{s.desc}</div>
                  </div>
                  <ChevronRight size={18} className="text-muted-premium shrink-0" />
                </Panel>
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --------------------------- Portail externe ---------------------------
const ExternalPortal: React.FC = () => {
  const { ctx } = useRbac();
  const { logout } = useAuth();
  if (!ctx) return null;
  const isBank = ctx.roleCode === "externe_banque";
  return (
    <div className="min-h-screen bg-dark text-white-premium">
      <header className="flex justify-between items-center px-5 sm:px-8 h-16 bg-surface shadow-md shadow-black/20">
        <div className="flex items-center gap-2.5">
          {isBank ? <Building2 className="text-gold" size={20} /> : <Car className="text-gold" size={20} />}
          <span className="font-semibold">{isBank ? "Portail Investisseur" : "Portail Client — Flotte"}</span>
        </div>
        <button onClick={logout} className="text-sm text-muted-premium hover:text-white-premium flex items-center gap-1.5"><LogOut size={16} /> Déconnexion</button>
      </header>
      <main className="max-w-4xl mx-auto p-5 sm:p-8">
        <Reveal>
          <Panel className="p-6">
            <h2 className="text-xl font-semibold">{isBank ? "Vue financière globale" : "Vos véhicules"}</h2>
            <p className="text-sm text-muted-premium mt-2">
              {isBank
                ? "Marge/km, cashflow et P&L en lecture seule. Aucune donnée nominative de chauffeur n'est accessible depuis ce portail."
                : "Performance de vos véhicules, remboursement restant et montant à encaisser. Vous ne voyez que les véhicules dont vous êtes propriétaire."}
            </p>
            <p className="text-xs text-muted-premium/70 mt-4">Les indicateurs seront alimentés par les données des Parties B à D.</p>
          </Panel>
        </Reveal>
      </main>
    </div>
  );
};

// --------------------------- Layout principal ---------------------------
export const FleetWorkspace: React.FC = () => {
  const { logout } = useAuth();
  const { ctx, loading } = useRbac();
  const [section, setSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div className="min-h-screen bg-dark"><Spinner /></div>;
  if (!ctx) return <div className="min-h-screen bg-dark flex items-center justify-center"><EmptyState>Contexte indisponible. Reconnectez-vous.</EmptyState></div>;

  if (ctx.roleCode === "externe_banque" || ctx.roleCode === "externe_client") return <ExternalPortal />;

  const go = (s: Section) => { setSection(s); setSidebarOpen(false); };

  const navItems: { key: Section; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard size={18} />, show: true },
    { key: "admin", label: "Administration", icon: <Shield size={18} />, show: ctx.permissions.some((p) => ["site.voir", "utilisateur.voir", "role.voir", "parametre.voir", "audit.voir"].includes(p)) },
    { key: "vehicules", label: "Véhicules", icon: <Car size={18} />, show: ctx.permissions.includes("vehicule.voir") },
    { key: "attribution", label: "Attribution", icon: <CalendarClock size={18} />, show: ctx.permissions.includes("attribution.voir") },
    { key: "moi", label: "Mon espace", icon: <User size={18} />, show: ctx.roleCode === "chauffeur" },
  ];
  const nav = navItems.filter((n) => n.show);
  const initials = ctx.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const NavButton: React.FC<{ n: typeof navItems[number] }> = ({ n }) => {
    const active = section === n.key;
    return (
      <button onClick={() => go(n.key)}
        className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-[#2A2D3A] text-gold" : "text-muted-premium hover:text-white-premium hover:bg-[#23262F]"}`}>
        {active && <motion.span layoutId="nav-accent" className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gold" />}
        {n.icon} {n.label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-dark text-white-premium">
      {/* En-tête mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-surface shadow-md shadow-black/20">
        <button aria-label="Ouvrir le menu" onClick={() => setSidebarOpen(true)} className="p-1 text-white-premium"><Menu size={22} /></button>
        <span className="font-bold text-gold">SAVER Fleet Ops</span>
        <button aria-label="Déconnexion" onClick={logout} className="p-1 text-muted-premium"><LogOut size={20} /></button>
      </header>

      <div className="lg:flex">
        <AnimatePresence>
          {sidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        </AnimatePresence>

        {/* Barre latérale */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface flex flex-col transform transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="px-5 h-16 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold text-dark font-bold flex items-center justify-center text-sm">E</div>
              <div>
                <div className="font-bold text-white-premium leading-none">Fleet Ops</div>
                <div className="text-[10px] text-muted-premium mt-0.5">SAVER · EASY</div>
              </div>
            </div>
            <button aria-label="Fermer le menu" className="lg:hidden text-muted-premium p-1" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
          </div>
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {nav.map((n) => <NavButton key={n.key} n={n} />)}
          </nav>
          <div className="p-3">
            <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-[#23262F]">
              <div className="w-9 h-9 rounded-full bg-gold text-dark font-bold flex items-center justify-center text-sm shrink-0">{initials}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white-premium truncate">{ctx.name}</div>
                <div className="text-xs text-gold truncate">{ROLE_LABELS[ctx.roleCode || ""] || ctx.roleCode}</div>
              </div>
              <button onClick={logout} aria-label="Déconnexion" className="text-muted-premium hover:text-white-premium p-1"><LogOut size={18} /></button>
            </div>
          </div>
        </aside>

        {/* Contenu */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={section}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}>
              {section === "dashboard" && <Dashboard onNavigate={go} />}
              {section === "admin" && <FleetAdmin />}
              {section === "vehicules" && <FleetVehicles />}
              {section === "attribution" && <FleetAssignments />}
              {section === "moi" && <Placeholder titre="Mon espace chauffeur" bloc="Partie B (check-in, planning, reversement)" />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
