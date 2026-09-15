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
  AlertTriangle, Users, ChevronRight, TrendingUp,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
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
    <div className="bg-[#141416] border border-[#232327] rounded-2xl p-10 text-center">
      <h3 className="text-lg font-semibold text-[#EDEDED]">{titre}</h3>
      <p className="text-sm text-[#8A8A8A] mt-2">Module prévu pour la {bloc}. L'ossature (rôles, permissions, sites) est déjà en place.</p>
    </div>
  </Reveal>
);

// --------------------------- Tableau de bord ---------------------------
const STATUT_COLORS: Record<string, string> = {
  Disponible: "#00C853", Attribue: "#3B82F6", EnCharge: "#06B6D4",
  Immobilise: "#EF4444", EnMaintenance: "#F59E0B", HorsFlotte: "#6B7280",
};
const STATUT_LABEL: Record<string, string> = {
  Disponible: "Disponible", Attribue: "Attribué", EnCharge: "En charge",
  Immobilise: "Immobilisé", EnMaintenance: "En maintenance", HorsFlotte: "Hors flotte",
};

const Dashboard: React.FC<{ onNavigate: (s: Section) => void }> = ({ onNavigate }) => {
  const { ctx, can } = useRbac();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [week, setWeek] = useState<{ date: string; A: any[]; B: any[] }[]>([]);
  const [planning, setPlanning] = useState<{ shifts: { A: any[]; B: any[] }; chauffeurs: any[] } | null>(null);

  useEffect(() => {
    if (!ctx) return;
    const site = ctx.sites[0]?.id;
    (async () => {
      try {
        if (can("vehicule.voir")) setVehicles((await api.get<{ vehicles: any[] }>("/api/fleet/vehicles?pageSize=100")).vehicles);
        if (can("alerte.voir")) setAlerts((await api.get<{ alerts: any[] }>("/api/fleet/alerts")).alerts);
        if (can("attribution.voir") && site) {
          setWeek((await api.get<{ days: { date: string; A: any[]; B: any[] }[] }>(`/api/fleet/assignments/week?siteId=${site}`)).days);
          setPlanning(await api.get(`/api/fleet/assignments?siteId=${site}`));
        }
      } catch { /* permissions/erreurs ignorées : les blocs concernés ne s'affichent pas */ }
    })();
  }, [ctx, can]);

  if (!ctx) return null;

  const heure = new Date().getHours();
  const greet = heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";
  const dateJour = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const disponibles = vehicles.filter((v) => v.statut === "Disponible").length;
  const dispoRate = vehicles.length ? Math.round((disponibles / vehicles.length) * 100) : 0;
  const attribsJour = planning ? planning.shifts.A.length + planning.shifts.B.length : 0;

  const statutCounts = vehicles.reduce<Record<string, number>>((acc, v) => { acc[v.statut] = (acc[v.statut] || 0) + 1; return acc; }, {});
  const donutData = Object.entries(statutCounts).map(([statut, value]) => ({ statut, name: STATUT_LABEL[statut] || statut, value }));
  const areaData = week.map((d) => ({ jour: new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short" }), attributions: d.A.length + d.B.length }));

  const showFlotte = can("vehicule.voir") && vehicles.length > 0;
  const showAttrib = can("attribution.voir") && week.length > 0;

  const tilesAll: { key: string; label: string; value: React.ReactNode; delta?: string; deltaTone?: "green" | "red" | "muted"; show: boolean }[] = [
    { key: "veh", label: "Véhicules", value: vehicles.length || "—", delta: `${disponibles} disponibles`, deltaTone: "muted", show: can("vehicule.voir") },
    { key: "dispo", label: "Disponibilité flotte", value: vehicles.length ? `${dispoRate}%` : "—", delta: vehicles.length ? (dispoRate >= 50 ? "Flotte opérationnelle" : "Sous 50 %") : undefined, deltaTone: dispoRate >= 50 ? "green" : "red", show: can("vehicule.voir") },
    { key: "alt", label: "Alertes en cours", value: can("alerte.voir") ? alerts.length : "—", delta: alerts.length > 0 ? "à traiter" : "aucune", deltaTone: alerts.length > 0 ? "red" : "green", show: can("alerte.voir") },
    { key: "att", label: "Attributions du jour", value: attribsJour, delta: planning ? `${planning.chauffeurs.length} chauffeurs` : undefined, deltaTone: "muted", show: can("attribution.voir") },
  ];
  const tiles = tilesAll.filter((t) => t.show);

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white-premium tracking-tight">{greet}, {ctx.name.split(" ")[0]}</h1>
            <p className="text-muted-premium mt-1.5">{ROLE_LABELS[ctx.roleCode || ""] || ctx.roleCode} · {ctx.allSites ? "Tous les sites" : ctx.sites.map((s) => s.nom).join(", ") || "Aucun site"}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141416] border border-[#232327] text-sm text-[#8A8A8A] capitalize">
            <CalendarClock size={16} className="text-[#22C55E]" /> {dateJour}
          </div>
        </div>
      </Reveal>

      {tiles.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {tiles.map((t, i) => <StatCard key={t.key} label={t.label} value={t.value} delta={t.delta} deltaTone={t.deltaTone} delay={i * 0.06} />)}
        </div>
      )}

      {(showFlotte || showAttrib) && (
        <div className="grid lg:grid-cols-3 gap-4">
          {showAttrib && (
            <Reveal className="lg:col-span-2">
              <Panel className="p-5 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white-premium">Attributions · 7 jours</h2>
                  <span className="text-xs text-muted-premium">{areaData.reduce((s, d) => s + d.attributions, 0)} au total</span>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gAttr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E5E5E5" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#E5E5E5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="jour" tick={{ fill: "#8A8A8A", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#8A8A8A", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                      <Tooltip contentStyle={{ background: "#141416", border: "1px solid #232327", borderRadius: 12, color: "#EDEDED" }} labelStyle={{ color: "#8A8A8A" }} cursor={{ stroke: "#33343A" }} />
                      <Area type="monotone" dataKey="attributions" stroke="#E5E5E5" strokeWidth={2.5} fill="url(#gAttr)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </Reveal>
          )}
          {showFlotte && (
            <Reveal delay={0.05}>
              <Panel className="p-5 h-full">
                <h2 className="font-semibold text-white-premium mb-2">Répartition de la flotte</h2>
                <div className="relative h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={2} stroke="none">
                        {donutData.map((d) => <Cell key={d.statut} fill={STATUT_COLORS[d.statut] || "#6B7280"} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#141416", border: "1px solid #232327", borderRadius: 12, color: "#EDEDED" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-2xl font-bold text-white-premium">{vehicles.length}</div>
                    <div className="text-xs text-muted-premium">véhicules</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {donutData.map((d) => (
                    <div key={d.statut} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-muted-premium"><span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUT_COLORS[d.statut] || "#6B7280" }} />{d.name}</span>
                      <span className="text-white-premium font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </Reveal>
          )}
        </div>
      )}

      {can("alerte.voir") && alerts.length > 0 && (
        <Reveal>
          <Panel className="p-5">
            <h2 className="font-semibold text-white-premium mb-3">Alertes récentes</h2>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl bg-[#0F0F11] px-3.5 py-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.severity === "critical" ? "#EF4444" : "#F59E0B" }} />
                  <span className="text-sm text-white-premium flex-1 min-w-0 truncate">{a.message}</span>
                </div>
              ))}
            </div>
          </Panel>
        </Reveal>
      )}

      {shortcuts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-premium uppercase tracking-wide mb-3">Accès rapides</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shortcuts.map((s, i) => (
              <Reveal key={s.section} delay={0.1 + i * 0.06}>
                <Panel hover onClick={() => onNavigate(s.section)} className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#1C1C20] text-[#8A8A8A] flex items-center justify-center shrink-0">{s.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#EDEDED]">{s.titre}</div>
                    <div className="text-xs text-[#8A8A8A] mt-0.5 truncate">{s.desc}</div>
                  </div>
                  <ChevronRight size={18} className="text-[#8A8A8A] shrink-0" />
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
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED]">
      <header className="flex justify-between items-center px-5 sm:px-8 h-16 bg-[#0A0A0B] border-b border-[#1A1A1D]">
        <div className="flex items-center gap-2.5">
          {isBank ? <Building2 className="text-[#22C55E]" size={20} /> : <Car className="text-[#22C55E]" size={20} />}
          <span className="font-semibold">{isBank ? "Portail Investisseur" : "Portail Client — Flotte"}</span>
        </div>
        <button onClick={logout} className="text-sm text-[#8A8A8A] hover:text-[#EDEDED] flex items-center gap-1.5"><LogOut size={16} /> Déconnexion</button>
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

  if (loading) return <div className="min-h-screen bg-[#0A0A0B]"><Spinner /></div>;
  if (!ctx) return <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center"><EmptyState>Contexte indisponible. Reconnectez-vous.</EmptyState></div>;

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
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-[#1C1C20] text-[#EDEDED]" : "text-[#8A8A8A] hover:text-[#EDEDED] hover:bg-[#141416]"}`}>
        {n.icon} {n.label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED]">
      {/* En-tête mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[#0A0A0B] border-b border-[#1A1A1D]">
        <button aria-label="Ouvrir le menu" onClick={() => setSidebarOpen(true)} className="p-1 text-[#EDEDED]"><Menu size={22} /></button>
        <span className="font-bold text-[#EDEDED]">SAVER Fleet Ops</span>
        <button aria-label="Déconnexion" onClick={logout} className="p-1 text-[#8A8A8A]"><LogOut size={20} /></button>
      </header>

      <div className="lg:flex">
        <AnimatePresence>
          {sidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        </AnimatePresence>

        {/* Barre latérale */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A0A0B] border-r border-[#1A1A1D] flex flex-col transform transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="px-5 h-16 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22C55E] to-[#0EA5E9] shrink-0" />
              <div>
                <div className="font-bold text-[#EDEDED] leading-none">Fleet Ops</div>
                <div className="text-[10px] text-[#8A8A8A] mt-0.5">SAVER · EASY</div>
              </div>
            </div>
            <button aria-label="Fermer le menu" className="lg:hidden text-[#8A8A8A] p-1" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
          </div>
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {nav.map((n) => <NavButton key={n.key} n={n} />)}
          </nav>
          <div className="p-3">
            <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-[#141416] border border-[#232327]">
              <div className="w-9 h-9 rounded-full bg-[#1C1C20] border border-[#232327] text-[#EDEDED] font-semibold flex items-center justify-center text-sm shrink-0">{initials}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[#EDEDED] truncate">{ctx.name}</div>
                <div className="text-xs text-[#8A8A8A] truncate">{ROLE_LABELS[ctx.roleCode || ""] || ctx.roleCode}</div>
              </div>
              <button onClick={logout} aria-label="Déconnexion" className="text-[#8A8A8A] hover:text-[#EDEDED] p-1"><LogOut size={18} /></button>
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
