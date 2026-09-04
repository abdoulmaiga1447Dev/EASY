/**
 * Espace de travail SAVER Fleet Ops — layout commun aux profils internes.
 * Sidebar pilotée par les permissions, en-tête avec identité/rôle/site, et sections :
 *  - Tableau de bord (accueil par profil, squelette + widgets Partie A) ;
 *  - Administration (Bloc 1, complet) ;
 *  - Véhicules (Flux 7, Bloc 2) et Attribution (Flux 8, Bloc 3) : emplacements réservés.
 * Les profils externes (banque, client) reçoivent un portail cloisonné dédié.
 */
import React, { useState } from "react";
import {
  LayoutDashboard, Shield, Car, CalendarClock, LogOut, User, Building2, Wallet,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRbac } from "../../context/RbacContext";
import { FleetAdmin } from "./FleetAdmin";
import { FleetVehicles } from "./FleetVehicles";
import { Spinner, EmptyState } from "./ui";

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
  <div className="bg-surface border border-dashed border-gold/20 rounded-lg p-10 text-center">
    <h3 className="text-lg font-semibold text-white-premium">{titre}</h3>
    <p className="text-sm text-muted-premium mt-2">Module prévu pour la {bloc}. L'ossature (rôles, permissions, sites) est déjà en place.</p>
  </div>
);

// --------------------------- Tableau de bord par profil ---------------------------
const Dashboard: React.FC = () => {
  const { ctx } = useRbac();
  if (!ctx) return null;
  const cards: { icon: React.ReactNode; titre: string; desc: string; show: boolean }[] = [
    { icon: <Shield size={20} />, titre: "Administration", desc: "Sites, utilisateurs, rôles & paramètres", show: ctx.permissions.some((p) => ["site.voir", "utilisateur.voir", "role.voir", "parametre.voir", "audit.voir"].includes(p)) },
    { icon: <Car size={20} />, titre: "Véhicules", desc: "Flotte, documents, échéances (Flux 7)", show: ctx.permissions.includes("vehicule.voir") },
    { icon: <CalendarClock size={20} />, titre: "Attribution", desc: "Planning quotidien véhicule ↔ chauffeur (Flux 8)", show: ctx.permissions.includes("attribution.voir") },
    { icon: <Wallet size={20} />, titre: "Finance", desc: "Reversements, paie, exports", show: ctx.permissions.some((p) => ["reversement.voir", "paie.calculer"].includes(p)) },
  ].filter((c) => c.show);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white-premium">Bonjour, {ctx.name}</h2>
        <p className="text-muted-premium mt-1">{ROLE_LABELS[ctx.roleCode || ""] || ctx.roleCode} · {ctx.allSites ? "Tous les sites" : ctx.sites.map((s) => s.nom).join(", ") || "Aucun site"}</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.titre} className="bg-surface border border-gold/10 rounded-lg p-5">
            <div className="text-gold mb-3">{c.icon}</div>
            <div className="font-semibold text-white-premium">{c.titre}</div>
            <div className="text-xs text-muted-premium mt-1">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --------------------------- Portail externe (cloisonné) ---------------------------
const ExternalPortal: React.FC = () => {
  const { ctx } = useRbac();
  const { logout } = useAuth();
  if (!ctx) return null;
  const isBank = ctx.roleCode === "externe_banque";
  return (
    <div className="min-h-screen bg-dark text-white-premium">
      <header className="flex justify-between items-center px-6 py-4 border-b border-gold/10">
        <div className="flex items-center gap-2">
          {isBank ? <Building2 className="text-gold" size={20} /> : <Car className="text-gold" size={20} />}
          <span className="font-semibold">{isBank ? "Portail Investisseur" : "Portail Client — Gestion de flotte"}</span>
        </div>
        <button onClick={logout} className="text-sm text-muted-premium hover:text-white-premium flex items-center gap-1.5"><LogOut size={16} /> Déconnexion</button>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-surface border border-gold/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold">{isBank ? "Vue financière globale" : "Vos véhicules"}</h2>
          <p className="text-sm text-muted-premium mt-2">
            {isBank
              ? "Marge/km, cashflow et P&L en lecture seule. Aucune donnée nominative de chauffeur n'est accessible depuis ce portail."
              : "Performance de vos véhicules, remboursement restant et montant à encaisser. Vous ne voyez que les véhicules dont vous êtes propriétaire."}
          </p>
          <p className="text-xs text-muted-premium/70 mt-4">Les indicateurs seront alimentés par les données des Parties B à D (courses, reversements, coûts).</p>
        </div>
      </main>
    </div>
  );
};

// --------------------------- Layout principal ---------------------------
export const FleetWorkspace: React.FC = () => {
  const { logout } = useAuth();
  const { ctx, loading } = useRbac();
  const [section, setSection] = useState<Section>("dashboard");

  if (loading) return <div className="min-h-screen bg-dark"><Spinner /></div>;
  if (!ctx) return <div className="min-h-screen bg-dark flex items-center justify-center"><EmptyState>Contexte indisponible. Reconnectez-vous.</EmptyState></div>;

  // Profils externes : portail dédié cloisonné.
  if (ctx.roleCode === "externe_banque" || ctx.roleCode === "externe_client") return <ExternalPortal />;

  const navItems: { key: Section; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard size={18} />, show: true },
    { key: "admin", label: "Administration", icon: <Shield size={18} />, show: ctx.permissions.some((p) => ["site.voir", "utilisateur.voir", "role.voir", "parametre.voir", "audit.voir"].includes(p)) },
    { key: "vehicules", label: "Véhicules", icon: <Car size={18} />, show: ctx.permissions.includes("vehicule.voir") },
    { key: "attribution", label: "Attribution", icon: <CalendarClock size={18} />, show: ctx.permissions.includes("attribution.voir") },
    { key: "moi", label: "Mon espace", icon: <User size={18} />, show: ctx.roleCode === "chauffeur" },
  ];
  const nav = navItems.filter((n) => n.show);

  return (
    <div className="min-h-screen bg-dark text-white-premium flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-gold/10 flex flex-col">
        <div className="px-5 py-5 border-b border-gold/10">
          <div className="font-bold text-gold">SAVER Fleet Ops</div>
          <div className="text-xs text-muted-premium mt-0.5">EASY</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <button key={n.key} onClick={() => setSection(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${section === n.key ? "bg-gold/15 text-gold" : "text-muted-premium hover:text-white-premium hover:bg-white/5"}`}>
              {n.icon} {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gold/10">
          <div className="px-3 py-2 text-xs text-muted-premium truncate">{ctx.name}<br /><span className="text-gold">{ROLE_LABELS[ctx.roleCode || ""] || ctx.roleCode}</span></div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-premium hover:text-white-premium hover:bg-white/5">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu */}
      <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
        {section === "dashboard" && <Dashboard />}
        {section === "admin" && <FleetAdmin />}
        {section === "vehicules" && <FleetVehicles />}
        {section === "attribution" && <Placeholder titre="Attribution quotidienne" bloc="Partie A — Bloc 3 (Flux 8)" />}
        {section === "moi" && <Placeholder titre="Mon espace chauffeur" bloc="Partie B (check-in, planning, reversement)" />}
      </main>
    </div>
  );
};
