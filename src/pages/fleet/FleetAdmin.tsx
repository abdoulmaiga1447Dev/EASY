/**
 * Écran d'administration SAVER Fleet Ops (Partie A, Bloc 1).
 * Onglets : Sites & zones · Utilisateurs · Rôles & permissions · Paramètres · Audit.
 * Chaque onglet n'apparaît que si l'utilisateur a la permission correspondante ;
 * la sécurité réelle reste appliquée côté serveur.
 */
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "../../components/Button";
import { useRbac } from "../../context/RbacContext";
import {
  api, type SiteDTO, type ZoneDTO, type RoleDTO, type PermissionDTO,
  type UserDTO, type SettingsDTO, type AuditEntryDTO, type ApiError,
} from "../../api/fleet";
import { Field, Input, Select, StatusBadge, Toast, Spinner, EmptyState, Modal } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";

// ============================================================ Sites & zones
const SitesTab: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const { can } = useRbac();
  const [sites, setSites] = useState<SiteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nom: "", ville: "", waveAccountId: "" });
  const [zoneSite, setZoneSite] = useState<SiteDTO | null>(null);
  const [newZone, setNewZone] = useState("");

  const load = async () => {
    setLoading(true);
    try { setSites((await api.get<{ sites: SiteDTO[] }>("/api/sites")).sites); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const createSite = async () => {
    if (!form.nom || !form.ville) return notify({ message: "Nom et ville obligatoires", kind: "err" });
    try {
      await api.post("/api/sites", form);
      setForm({ nom: "", ville: "", waveAccountId: "" });
      notify({ message: "Site créé", kind: "ok" });
      load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  const addZone = async () => {
    if (!zoneSite || !newZone) return;
    try {
      await api.post(`/api/sites/${zoneSite.id}/zones`, { nom: newZone });
      const zones = (await api.get<{ zones: ZoneDTO[] }>(`/api/sites/${zoneSite.id}/zones`)).zones;
      setZoneSite({ ...zoneSite, zones });
      setNewZone("");
      load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };
  const delZone = async (z: ZoneDTO) => {
    try {
      await api.del(`/api/zones/${z.id}`);
      if (zoneSite) setZoneSite({ ...zoneSite, zones: (zoneSite.zones || []).filter((x) => x.id !== z.id) });
      load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      {can("site.creer") && (
        <div className="bg-surface border border-gold/10 rounded-lg p-5">
          <h4 className="font-medium text-white-premium mb-3">Nouveau site</h4>
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <Field label="Nom du hub"><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Hub Abidjan" /></Field>
            <Field label="Ville"><Input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Abidjan" /></Field>
            <Field label="Compte Wave"><Input value={form.waveAccountId} onChange={(e) => setForm({ ...form, waveAccountId: e.target.value })} placeholder="WAVE-…" /></Field>
            <Button id="btn-create-site" onClick={createSite}>Créer le site</Button>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {sites.map((s) => (
          <div key={s.id} className="bg-surface border border-gold/10 rounded-lg p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-white-premium">{s.nom}</div>
                <div className="text-sm text-muted-premium">{s.ville} · {s.timezone}</div>
                {s.waveAccountId && <div className="text-xs text-muted-premium mt-1">Wave : {s.waveAccountId}</div>}
              </div>
              <StatusBadge active={s.active} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(s.zones || []).map((z) => <span key={z.id} className="text-xs bg-dark border border-gold/10 rounded px-2 py-0.5 text-muted-premium">{z.nom}</span>)}
              {(s.zones || []).length === 0 && <span className="text-xs text-muted-premium">Aucune zone</span>}
            </div>
            {can("zone.gerer") && <button className="mt-3 text-xs text-gold hover:underline" onClick={() => setZoneSite(s)}>Gérer les zones</button>}
          </div>
        ))}
      </div>

      {zoneSite && (
        <Modal title={`Zones — ${zoneSite.nom}`} onClose={() => setZoneSite(null)}>
          <div className="flex gap-2 mb-4">
            <Input value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder="Nom de la zone" className="flex-1" />
            <Button id="btn-add-zone" onClick={addZone}>Ajouter</Button>
          </div>
          <div className="space-y-2">
            {(zoneSite.zones || []).map((z) => (
              <div key={z.id} className="flex justify-between items-center bg-dark rounded px-3 py-2">
                <span className="text-sm text-white-premium">{z.nom}</span>
                <button className="text-xs text-red-400 hover:underline" onClick={() => delZone(z)}>Supprimer</button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================================ Utilisateurs
const UsersTab: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const { can, ctx } = useRbac();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [roles, setRoles] = useState<RoleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const emptyForm = { name: "", email: "", phone: "", roleCode: "chauffeur", siteIds: [] as string[] };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      setUsers((await api.get<{ users: UserDTO[] }>("/api/users")).users);
      if (can("role.voir")) setRoles((await api.get<{ roles: RoleDTO[] }>("/api/roles")).roles);
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Rôles proposables : si l'utilisateur ne peut créer que des chauffeurs, on limite.
  const canCreateAny = can("utilisateur.creer");
  const roleOptions = useMemo(() => {
    const base = roles.length ? roles.map((r) => ({ code: r.code, nom: r.nom })) : [{ code: "chauffeur", nom: "Chauffeur (PR)" }];
    return canCreateAny ? base : base.filter((r) => r.code === "chauffeur");
  }, [roles, canCreateAny]);

  const createUser = async () => {
    if (!form.name || !form.email) return notify({ message: "Nom et email obligatoires", kind: "err" });
    try {
      const res = await api.post<{ user: UserDTO; motDePasseTemporaire?: string }>("/api/users", form);
      notify({ message: "Utilisateur créé", kind: "ok" });
      if (res.motDePasseTemporaire) setTempPwd(res.motDePasseTemporaire);
      setForm(emptyForm); setShowForm(false); load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  const toggleActive = async (u: UserDTO) => {
    try {
      await api.post(`/api/users/${u.id}/${u.active ? "deactivate" : "activate"}`);
      notify({ message: u.active ? "Compte désactivé" : "Compte activé", kind: "ok" });
      load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  const toggleSite = (id: string) => setForm((f) => ({ ...f, siteIds: f.siteIds.includes(id) ? f.siteIds.filter((s) => s !== id) : [...f.siteIds, id] }));

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-premium">{users.length} utilisateur(s)</span>
        {(can("utilisateur.creer") || can("chauffeur.creer")) && (
          <Button id="btn-new-user" onClick={() => setShowForm(true)}>+ Nouvel utilisateur</Button>
        )}
      </div>
      <div className="overflow-x-auto border border-gold/10 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-dark text-muted-premium">
            <tr><th className="text-left px-4 py-3">Nom</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Rôle</th><th className="text-left px-4 py-3">Statut</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gold/5">
                <td className="px-4 py-3 text-white-premium">{u.name}</td>
                <td className="px-4 py-3 text-muted-premium">{u.email}</td>
                <td className="px-4 py-3 text-muted-premium">{u.roleNom || u.roleCode}</td>
                <td className="px-4 py-3"><StatusBadge active={u.active} /></td>
                <td className="px-4 py-3 text-right">
                  {can("utilisateur.activer") && u.id !== ctx?.userId && (
                    <button className={`text-xs hover:underline ${u.active ? "text-red-400" : "text-gold"}`} onClick={() => toggleActive(u)}>
                      {u.active ? "Désactiver" : "Activer"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <EmptyState>Aucun utilisateur dans votre périmètre.</EmptyState>}
      </div>

      {showForm && (
        <Modal title="Nouvel utilisateur" onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <Field label="Nom complet"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Rôle">
              <Select value={form.roleCode} onChange={(e) => setForm({ ...form, roleCode: e.target.value })}>
                {roleOptions.map((r) => <option key={r.code} value={r.code}>{r.nom}</option>)}
              </Select>
            </Field>
            <Field label="Sites de rattachement">
              <div className="flex flex-wrap gap-2">
                {(ctx?.sites || []).map((s) => (
                  <button key={s.id} type="button" onClick={() => toggleSite(s.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${form.siteIds.includes(s.id) ? "bg-gold text-dark border-gold" : "border-gold/20 text-muted-premium"}`}>
                    {s.nom}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button id="btn-cancel-user" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button id="btn-save-user" onClick={createUser}>Créer</Button>
            </div>
          </div>
        </Modal>
      )}

      {tempPwd && (
        <Modal title="Mot de passe temporaire" onClose={() => setTempPwd(null)}>
          <p className="text-sm text-muted-premium mb-3">Communiquez ce mot de passe au nouvel utilisateur. Il ne sera plus affiché ensuite.</p>
          <div className="bg-dark rounded px-4 py-3 font-mono text-gold text-center text-lg">{tempPwd}</div>
        </Modal>
      )}
    </div>
  );
};

// ============================================================ Rôles & permissions
const RolesTab: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const { can, reload } = useRbac();
  const [roles, setRoles] = useState<RoleDTO[]>([]);
  const [perms, setPerms] = useState<PermissionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RoleDTO | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      setRoles((await api.get<{ roles: RoleDTO[] }>("/api/roles")).roles);
      setPerms((await api.get<{ permissions: PermissionDTO[] }>("/api/permissions")).permissions);
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const byCategory = useMemo(() => {
    const m = new Map<string, PermissionDTO[]>();
    for (const p of perms) { if (!m.has(p.categorie)) m.set(p.categorie, []); m.get(p.categorie)!.push(p); }
    return [...m.entries()];
  }, [perms]);

  const openEdit = (r: RoleDTO) => { setEditing(r); setSelected(new Set(r.permissions)); };
  const toggle = (code: string) => setSelected((s) => { const n = new Set(s); n.has(code) ? n.delete(code) : n.add(code); return n; });

  const save = async () => {
    if (!editing) return;
    try {
      await api.put(`/api/roles/${editing.id}/permissions`, { permissionCodes: [...selected] });
      notify({ message: "Permissions mises à jour", kind: "ok" });
      setEditing(null); load(); reload();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((r) => (
          <div key={r.id} className="bg-surface border border-gold/10 rounded-lg p-5">
            <div className="flex justify-between items-start">
              <div className="font-semibold text-white-premium">{r.nom}</div>
              {r.isSystem && <span className="text-[10px] uppercase tracking-wide text-gold/70 border border-gold/20 rounded px-1.5 py-0.5">Système</span>}
            </div>
            <p className="text-xs text-muted-premium mt-1 min-h-[32px]">{r.description}</p>
            <div className="flex justify-between items-center mt-3 text-xs text-muted-premium">
              <span>{r.permissions.length} permission(s)</span>
              <span>{r.nbUtilisateurs} utilisateur(s)</span>
            </div>
            {can("permission.assigner") && (
              <button className="mt-3 text-xs text-gold hover:underline" onClick={() => openEdit(r)}>Modifier les permissions</button>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={`Permissions — ${editing.nom}`} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            {byCategory.map(([cat, list]) => (
              <div key={cat}>
                <div className="text-xs uppercase tracking-wide text-gold/70 mb-1.5">{cat}</div>
                <div className="space-y-1">
                  {list.map((p) => (
                    <label key={p.code} className="flex items-center gap-2 text-sm text-white-premium cursor-pointer">
                      <input type="checkbox" checked={selected.has(p.code)} onChange={() => toggle(p.code)} className="accent-gold" />
                      <span>{p.libelle}</span>
                      <span className="text-[10px] text-muted-premium/60 font-mono">{p.code}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-surface">
              <Button id="btn-cancel-perms" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
              <Button id="btn-save-perms" onClick={save}>Enregistrer</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================================ Paramètres
const SETTINGS_GROUPS: { titre: string; champs: { key: string; label: string; suffix?: string }[] }[] = [
  { titre: "Salaire & éligibilité au fixe", champs: [
    { key: "salaireFixeJour", label: "Salaire fixe / jour", suffix: "FCFA" },
    { key: "eligibiliteCaJour", label: "Éligibilité : CA / jour", suffix: "FCFA" },
    { key: "eligibiliteCoursesJour", label: "Éligibilité : courses / jour" },
    { key: "eligibiliteHeures", label: "Éligibilité : heures" },
    { key: "eligibiliteHeuresEnLigne", label: "Éligibilité : heures en ligne" },
  ] },
  { titre: "KPI & période de paie", champs: [
    { key: "kpiObjectifMontant", label: "Objectif KPI / 2 sem.", suffix: "FCFA" },
    { key: "kpiSeuilCourses", label: "Seuil courses / 2 sem." },
    { key: "periodePaieJours", label: "Période de paie", suffix: "jours" },
  ] },
  { titre: "Bonus & pénalités", champs: [
    { key: "bonusPlafond", label: "Plafond bonus / 2 sem.", suffix: "FCFA" },
    { key: "penaliteRetardHeure", label: "Pénalité retard / h", suffix: "FCFA" },
    { key: "penaliteNonReversement", label: "Pénalité non-reversement", suffix: "FCFA" },
    { key: "penaliteAbsence", label: "Pénalité absence", suffix: "FCFA" },
    { key: "toleranceEcartReversement", label: "Tolérance écart reversement", suffix: "FCFA" },
  ] },
  { titre: "Avances", champs: [
    { key: "avanceEligibiliteJours", label: "Éligibilité avance", suffix: "jours sans pénalité" },
    { key: "avancePlafond", label: "Plafond avance", suffix: "FCFA" },
  ] },
  { titre: "Exploitation", champs: [
    { key: "socHandoverSeuil", label: "Seuil SOC handover", suffix: "%" },
    { key: "maintenanceKm", label: "Maintenance préventive", suffix: "km" },
    { key: "maintenanceJours", label: "Maintenance préventive", suffix: "jours" },
    { key: "alerteVisiteTechniqueJours", label: "Préavis visite technique", suffix: "jours" },
    { key: "alerteAssuranceJours", label: "Préavis assurance", suffix: "jours" },
  ] },
];

const SettingsTab: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const { can, ctx } = useRbac();
  const [siteId, setSiteId] = useState(ctx?.sites[0]?.id || "");
  const [settings, setSettings] = useState<SettingsDTO | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = async (sid: string) => {
    if (!sid) { setLoading(false); return; }
    setLoading(true);
    try {
      const s = await api.get<SettingsDTO>(`/api/settings/${sid}`);
      setSettings(s);
      const d: Record<string, number> = {};
      for (const g of SETTINGS_GROUPS) for (const c of g.champs) d[c.key] = s[c.key];
      setDraft(d);
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(siteId); }, [siteId]);

  const save = async () => {
    try {
      const s = await api.post<SettingsDTO>(`/api/settings/${siteId}`, draft);
      setSettings(s);
      notify({ message: `Paramètres enregistrés (version ${s.version})`, kind: "ok" });
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  if (loading) return <Spinner />;
  if (!settings) return <EmptyState>Sélectionnez un site pour voir ses paramètres.</EmptyState>;
  const readOnly = !can("parametre.modifier");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <Field label="Site">
          <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {(ctx?.sites || []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </Select>
        </Field>
        <span className="text-xs text-muted-premium">Version courante : {settings.version} · devise {settings.devise}</span>
      </div>
      {SETTINGS_GROUPS.map((g) => (
        <div key={g.titre} className="bg-surface border border-gold/10 rounded-lg p-5">
          <h4 className="font-medium text-white-premium mb-3">{g.titre}</h4>
          <div className="grid md:grid-cols-3 gap-3">
            {g.champs.map((c) => (
              <Field key={c.key} label={c.label} hint={c.suffix}>
                <Input type="number" value={draft[c.key] ?? ""} disabled={readOnly}
                  onChange={(e) => setDraft({ ...draft, [c.key]: Number(e.target.value) })} />
              </Field>
            ))}
          </div>
        </div>
      ))}
      {!readOnly && (
        <div className="flex justify-end">
          <Button id="btn-save-settings" onClick={save}>Enregistrer (nouvelle version)</Button>
        </div>
      )}
    </div>
  );
};

// ============================================================ Audit
const AuditTab: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const [entries, setEntries] = useState<AuditEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try { setEntries((await api.get<{ entries: AuditEntryDTO[] }>("/api/audit?limit=100")).entries); }
      catch (e) { notify({ message: errMsg(e), kind: "err" }); }
      finally { setLoading(false); }
    })();
  }, []);
  if (loading) return <Spinner />;
  return (
    <div className="overflow-x-auto border border-gold/10 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-dark text-muted-premium">
          <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Auteur</th><th className="text-left px-4 py-3">Action</th><th className="text-left px-4 py-3">Ressource</th></tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-t border-gold/5">
              <td className="px-4 py-3 text-muted-premium whitespace-nowrap">{new Date(e.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Abidjan" })}</td>
              <td className="px-4 py-3 text-white-premium">{e.actorName || "—"}</td>
              <td className="px-4 py-3 text-gold font-mono text-xs">{e.action}</td>
              <td className="px-4 py-3 text-muted-premium">{e.resourceType}{e.resourceId ? ` · ${e.resourceId.slice(0, 10)}…` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && <EmptyState>Aucune entrée d'audit.</EmptyState>}
    </div>
  );
};

// ============================================================ Conteneur
export const FleetAdmin: React.FC = () => {
  const { can } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); };

  const tabs = useMemo(() => [
    { key: "sites", label: "Sites & zones", show: can("site.voir"), el: <SitesTab notify={notify} /> },
    { key: "users", label: "Utilisateurs", show: can("utilisateur.voir"), el: <UsersTab notify={notify} /> },
    { key: "roles", label: "Rôles & permissions", show: can("role.voir"), el: <RolesTab notify={notify} /> },
    { key: "settings", label: "Paramètres", show: can("parametre.voir"), el: <SettingsTab notify={notify} /> },
    { key: "audit", label: "Journal d'audit", show: can("audit.voir"), el: <AuditTab notify={notify} /> },
  ].filter((t) => t.show), [can]);

  const [active, setActive] = useState(tabs[0]?.key || "sites");
  const current = tabs.find((t) => t.key === active) || tabs[0];

  if (tabs.length === 0) return <EmptyState>Vous n'avez pas accès à l'administration.</EmptyState>;
  return (
    <div>
      <div className="flex gap-1 border-b border-gold/10 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActive(t.key)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${active === t.key ? "border-gold text-gold" : "border-transparent text-muted-premium hover:text-white-premium"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {current?.el}
      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
};
