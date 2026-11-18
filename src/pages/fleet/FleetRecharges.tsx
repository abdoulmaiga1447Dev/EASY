/**
 * Recharge EV.
 * - Chauffeur (recharge.enregistrer) : demande une recharge, payée par le Superviseur
 *   (voir RechargeDemandes.tsx) — il ne déclare plus ses recharges lui-même.
 * - Superviseur Logistique (recharge.superviser) : boîte des demandes, suivi
 *   consommation / coûts / anomalies, saisie manuelle (équipe), gestion des bornes.
 */
import React, { useEffect, useMemo, useState } from "react";
import { BatteryCharging, AlertTriangle } from "lucide-react";
import { useRbac } from "../../context/RbacContext";
import { api, uploadMedia, type ApiError } from "../../api/fleet";
import { Btn, Reveal, Field, Input, Select, Spinner, EmptyState, Toast, Modal, AuthImage } from "./ui";
import { ChauffeurRecharge, SuperviseurBoite, ControleRecharges, useDemandesATraiter, useRechargesAControler } from "./RechargeDemandes";
import { useRealtime } from "../../api/realtime";
import rechargeHero from "../../assets/recharge-hero.webp";
import easyLogo from "../../assets/images/easy-logo-green.png";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const fcfa = (n: number) => (n ?? 0).toLocaleString("fr-FR") + " F";
const TYPE_LABEL: Record<string, string> = { DOMESTIQUE: "Réseau SAVER", PARTENAIRE: "Partenaire" };

// Hero animé : l'image « easy CHARGE » en bandeau, avec un léger zoom (Ken Burns),
// une lueur verte pulsée et un reflet qui balaie — pour éclairer la page.
const RechargeHero: React.FC = () => (
  <div className="relative mb-6 rounded-2xl overflow-hidden border border-[#232327] h-44 sm:h-56">
    <style>{`
      @keyframes rchZoom { 0%{transform:scale(1.04)} 100%{transform:scale(1.14)} }
      @keyframes rchGlow { 0%,100%{opacity:.25} 50%{opacity:.6} }
      @keyframes rchSweep { 0%{transform:translateX(-140%) skewX(-12deg)} 100%{transform:translateX(320%) skewX(-12deg)} }
    `}</style>
    {/* Image (zoom lent) */}
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${rechargeHero})`, animation: "rchZoom 20s ease-in-out infinite alternate" }} />
    {/* Voile dégradé : fondu vers le fond sombre + lisibilité du titre (bas gauche) */}
    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,11,0.92) 0%, rgba(10,10,11,0.35) 45%, rgba(10,10,11,0.05) 100%)" }} />
    {/* Lueur verte pulsée (côté borne) */}
    <div className="absolute -left-8 top-0 bottom-0 w-44 pointer-events-none" style={{ background: "radial-gradient(circle at 30% 50%, rgba(34,197,94,0.45), transparent 70%)", animation: "rchGlow 2.8s ease-in-out infinite" }} />
    {/* Reflet qui balaie */}
    <div className="absolute inset-y-0 left-0 w-1/4 pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)", animation: "rchSweep 7s ease-in-out infinite" }} />
    {/* Titre */}
    <div className="relative z-10 h-full flex flex-col justify-end p-5">
      <div className="flex items-center gap-2 text-[#22C55E] text-xs font-medium"><BatteryCharging size={16} /> Charge en cours</div>
      <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ textShadow: "0 1px 12px rgba(0,0,0,0.6)" }}>Recharge EV</h1>
    </div>
  </div>
);

// Upload d'un justificatif (reçu / capture / photo de la borne).
const Justificatif: React.FC<{ mediaId: string; onUploaded: (id: string) => void; notify: (t: ToastState) => void }> = ({ mediaId, onUploaded, notify }) => {
  const [busy, setBusy] = useState(false);
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true);
    try { const m = await uploadMedia(file); onUploaded(m.id); } catch (err) { notify({ message: errMsg(err), kind: "err" }); } finally { setBusy(false); }
  };
  return (
    <label className="flex flex-col gap-1.5 cursor-pointer">
      <span className="text-xs text-[#8A8A8A]">Justificatif (reçu / photo de la borne){mediaId ? " ✓" : " *"}</span>
      <div className={`h-11 rounded-xl border px-3 flex items-center text-sm ${mediaId ? "border-[#22C55E] text-[#22C55E]" : "border-dashed border-[#33363F] text-[#8A8A8A]"} bg-[#0F0F11]`}>
        {busy ? "Envoi…" : mediaId ? "Justificatif ajouté" : "Choisir un fichier"}
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
  );
};

// Surface « verre dépoli » : translucide + flou, laisse voir le fond image.
const GLASS = "bg-[#0B0B0D]/65 border border-white/10 rounded-2xl";
const Glass: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) => (
  <div className={`${GLASS} ${className}`}>{children}</div>
);

// ------------------------------ Enregistrement par le Superviseur / équipe (choix du véhicule) ------------------------------
const SupervisorRechargeForm: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [bornes, setBornes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ vehicleId: "", typeCharge: "DOMESTIQUE", borneId: "", kwh: "", cout: "", socDebut: "", socFin: "", justificatifMediaId: "" });
  const set = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  useEffect(() => {
    (async () => {
      try {
        setVehicles((await api.get<{ vehicles: any[] }>("/api/fleet/vehicles?pageSize=100")).vehicles);
        setBornes((await api.get<{ bornes: any[] }>("/api/fleet/bornes")).bornes);
      } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
    })();
  }, []);

  const bornesFiltrees = bornes.filter((b) => b.type === form.typeCharge);
  const complet = form.vehicleId && form.borneId && form.kwh !== "" && form.cout !== "" && form.socDebut !== "" && form.socFin !== "" && form.justificatifMediaId;

  const submit = async () => {
    setSaving(true);
    try {
      await api.post("/api/fleet/recharges", {
        vehicleId: form.vehicleId, typeCharge: form.typeCharge, borneId: form.borneId,
        kwh: Number(form.kwh), cout: Number(form.cout), socDebut: Number(form.socDebut), socFin: Number(form.socFin),
        justificatifMediaId: form.justificatifMediaId,
      });
      notify({ message: "Recharge enregistrée", kind: "ok" });
      setForm({ vehicleId: "", typeCharge: "DOMESTIQUE", borneId: "", kwh: "", cout: "", socDebut: "", socFin: "", justificatifMediaId: "" });
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <Glass className="p-5 space-y-4 max-w-2xl">
      <div className="flex items-center gap-2 text-[#EDEDED]"><BatteryCharging size={18} className="text-[#22C55E]" /><h2 className="font-semibold">Enregistrer une recharge (équipe)</h2></div>
      <Field label="Véhicule *"><Select value={form.vehicleId} onChange={(e) => set({ vehicleId: e.target.value })}><option value="">— choisir un véhicule —</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.immatriculation} · {v.marque} {v.modele}</option>)}</Select></Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Type de charge"><Select value={form.typeCharge} onChange={(e) => set({ typeCharge: e.target.value, borneId: "" })}><option value="DOMESTIQUE">Réseau SAVER</option><option value="PARTENAIRE">Partenaire</option></Select></Field>
        <Field label="Borne *"><Select value={form.borneId} onChange={(e) => set({ borneId: e.target.value })}><option value="">— choisir une borne —</option>{bornesFiltrees.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}</Select></Field>
        <Field label="Électricité (kWh)"><Input type="number" value={form.kwh} onChange={(e) => set({ kwh: e.target.value })} placeholder="ex. 24" /></Field>
        <Field label="Coût (FCFA)"><Input type="number" value={form.cout} onChange={(e) => set({ cout: e.target.value })} placeholder="ex. 2400" /></Field>
        <Field label="% batterie début"><Input type="number" value={form.socDebut} onChange={(e) => set({ socDebut: e.target.value })} placeholder="0–100" /></Field>
        <Field label="% batterie fin"><Input type="number" value={form.socFin} onChange={(e) => set({ socFin: e.target.value })} placeholder="0–100" /></Field>
      </div>
      <Justificatif mediaId={form.justificatifMediaId} onUploaded={(id) => set({ justificatifMediaId: id })} notify={notify} />
      <Btn onClick={submit} disabled={!complet || saving} className="w-full">Valider la recharge</Btn>
    </Glass>
  );
};

// ------------------------------ Dashboard supervision (Superviseur Logistique) ------------------------------
const RechargesDashboard: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (date) p.set("date", date);
      if (anomaliesOnly) p.set("anomalies", "1");
      const q = p.toString() ? `?${p}` : "";
      setData(await api.get<any>(`/api/fleet/recharges${q}`));
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [date, anomaliesOnly]);

  const resume = data?.resume;
  const cards = useMemo(() => ([
    { label: "Recharges", value: resume?.total ?? 0 },
    { label: "Électricité", value: `${(resume?.totalKwh ?? 0).toLocaleString("fr-FR")} kWh` },
    { label: "Coût total", value: fcfa(resume?.totalCout ?? 0) },
    { label: "Anomalies", value: resume?.anomalies ?? 0, alerte: (resume?.anomalies ?? 0) > 0 },
  ]), [resume]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <button onClick={() => setAnomaliesOnly((v) => !v)} className={`h-11 px-3 rounded-xl border text-sm ${anomaliesOnly ? "border-[#EF4444] text-[#EF4444]" : "border-[#232327] text-[#8A8A8A]"}`}>Anomalies seulement</button>
        {date && <button onClick={() => setDate("")} className="h-11 px-2 text-xs text-[#8A8A8A] hover:underline">Tout</button>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Glass key={c.label} className="p-4">
            <div className="text-xs text-[#8A8A8A]">{c.label}</div>
            <div className={`text-xl font-bold mt-1 ${c.alerte ? "text-[#EF4444]" : "text-[#EDEDED]"}`}>{c.value}</div>
          </Glass>
        ))}
      </div>

      {loading ? <Spinner /> : !data?.recharges?.length ? <EmptyState>Aucune recharge pour ce filtre.</EmptyState> : (
        <div className="overflow-x-auto bg-[#0B0B0D]/65 border border-white/10 rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-[#8A8A8A]"><tr>
              <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Véhicule</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">kWh</th><th className="text-left px-4 py-3">Coût</th><th className="text-left px-4 py-3">Batterie</th><th className="text-left px-4 py-3">Contrôle</th>
            </tr></thead>
            <tbody>
              {data.recharges.map((r: any) => {
                const anomalie = r.anomalieCoherence;
                return (
                  <tr key={r.id} onClick={() => setDetail(r)} className={`border-t border-[#232327] cursor-pointer hover:bg-white/[0.04] ${anomalie ? "border-l-2 border-[#EF4444]" : ""}`}>
                    <td className="px-4 py-3 text-[#8A8A8A]">{new Date(r.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-[#EDEDED]">{r.vehicule ?? "—"}</td>
                    <td className="px-4 py-3 text-[#8A8A8A]">{TYPE_LABEL[r.typeCharge]}</td>
                    <td className="px-4 py-3 text-[#EDEDED]">{r.kwh ?? "—"}</td>
                    <td className="px-4 py-3 text-[#8A8A8A]">{fcfa(r.cout)}</td>
                    <td className="px-4 py-3 text-[#8A8A8A]">{r.socDebut}% → {r.socFin}%</td>
                    <td className="px-4 py-3">
                      {anomalie
                        ? <span className="inline-flex items-center gap-1 text-xs text-[#EF4444]"><AlertTriangle size={13} />kWh incohérents</span>
                        : <span className="text-xs text-[#22C55E]">OK</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <Modal title="Détail de la recharge" onClose={() => setDetail(null)}>
          <div className="space-y-4 text-sm">
            <div className="text-[#8A8A8A]">{detail.vehicule ?? "—"} · {new Date(detail.date).toLocaleString("fr-FR")}</div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <span className="text-[#8A8A8A]">Enregistré par</span>
              <span className="text-[#EDEDED] text-right">{detail.enregistreParNom ?? "—"} <span className="text-[#8A8A8A]">({detail.parChauffeur ? "Chauffeur" : "Équipe"})</span></span>
              {detail.parChauffeur && <><span className="text-[#8A8A8A]">Chauffeur</span><span className="text-[#EDEDED] text-right">{detail.chauffeurNom ?? "—"}</span></>}
              <span className="text-[#8A8A8A]">Type de charge</span><span className="text-[#EDEDED] text-right">{TYPE_LABEL[detail.typeCharge]}</span>
              <span className="text-[#8A8A8A]">Borne</span><span className="text-[#EDEDED] text-right">{detail.lieu ?? "—"}</span>
              <span className="text-[#8A8A8A]">Électricité</span><span className="text-[#EDEDED] text-right">{detail.kwh != null ? `${detail.kwh} kWh` : "—"}</span>
              {detail.demandeId && <><span className="text-[#8A8A8A]">Origine</span><span className="text-[#EDEDED] text-right">Demande payée par le Superviseur</span></>}
              <span className="text-[#8A8A8A]">Coût</span><span className="text-[#EDEDED] text-right">{fcfa(detail.cout)}</span>
              <span className="text-[#8A8A8A]">Batterie</span><span className="text-[#EDEDED] text-right">{detail.socDebut}% → {detail.socFin}%</span>
              {detail.kmAuMoment != null && <><span className="text-[#8A8A8A]">Km du véhicule</span><span className="text-[#EDEDED] text-right">{detail.kmAuMoment.toLocaleString("fr-FR")} km</span></>}
              <span className="text-[#8A8A8A]">Contrôle</span><span className="text-right" style={{ color: detail.anomalieCoherence ? "#EF4444" : "#22C55E" }}>{detail.anomalieCoherence ? "kWh incohérents" : "OK"}</span>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[#8A8A8A] mb-2">{detail.demandeId ? "Tableau de bord à la fin" : "Justificatif"}</div>
              {detail.justificatifMediaId
                ? <AuthImage mediaId={detail.justificatifMediaId} className="w-full max-h-80 rounded-xl" zoomable />
                : <div className="text-sm text-[#8A8A8A]">Aucun justificatif.</div>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ------------------------------ Gestion des bornes (Superviseur Logistique) ------------------------------
const emptyBorne = { nom: "", type: "DOMESTIQUE", operateur: "", siteId: "", gpsLat: "", gpsLng: "", prixKwh: "" };
const BornesManager: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const { ctx } = useRbac();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState<any>(emptyBorne);
  const [saving, setSaving] = useState(false);
  const set = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  const [props, setProps] = useState<any[]>([]);
  const load = async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([
        api.get<{ bornes: any[] }>("/api/fleet/bornes?all=1"),
        api.get<{ propositions: any[] }>("/api/fleet/bornes/propositions?statut=TOUTES"),
      ]);
      setList(b.bornes);
      setProps(p.propositions.filter((x) => x.proposeParId === ctx?.userId).slice(0, 8));
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useRealtime("borne:proposition", () => load());

  const ouvrirNouveau = () => { setForm(emptyBorne); setModal({}); };
  const ouvrirEdition = (b: any) => { setForm({ nom: b.nom, type: b.type, operateur: b.operateur ?? "", siteId: b.siteId ?? "", gpsLat: b.gpsLat ?? "", gpsLng: b.gpsLng ?? "", prixKwh: b.prixKwh ?? "" }); setModal({ id: b.id }); };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        nom: form.nom, type: form.type, operateur: form.operateur || null, siteId: form.siteId || null,
        gpsLat: form.gpsLat === "" ? null : Number(form.gpsLat), gpsLng: form.gpsLng === "" ? null : Number(form.gpsLng),
        prixKwh: form.prixKwh === "" ? null : Number(form.prixKwh),
      };
      if (modal?.id) await api.patch(`/api/fleet/bornes/${modal.id}`, payload);
      else await api.post("/api/fleet/bornes", payload);
      notify({ message: "Proposition envoyée : appliquée après validation par l'Admin ou la Finance", kind: "ok" });
      setModal(null); load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };

  const toggle = async (b: any) => {
    try {
      await api.patch(`/api/fleet/bornes/${b.id}`, { active: !b.active });
      notify({ message: b.active ? "Borne désactivée" : "Réactivation envoyée pour validation (Admin ou Finance)", kind: "ok" });
      load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  const siteNom = (id: string | null) => ctx?.sites.find((s) => s.id === id)?.nom ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#8A8A8A] max-w-xl">Toute nouvelle borne, tout changement de prix du kWh et toute réactivation s'appliquent après validation par l'Admin ou la Finance. La désactivation est immédiate.</p>
        <Btn onClick={ouvrirNouveau}>Proposer une borne</Btn>
      </div>
      {!!props.length && (
        <div className="bg-[#141416] border border-[#232327] rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wide text-[#8A8A8A] mb-2">Mes propositions</div>
          <div className="space-y-1.5">
            {props.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-[#EDEDED]">{p.type === "CREATION" ? "Nouvelle borne" : "Modification"} · {p.borneNom ?? "—"}</span>
                <span className="text-xs font-medium" style={{ color: p.statut === "VALIDEE" ? "#22C55E" : p.statut === "REFUSEE" ? "#EF4444" : "#F59E0B" }}>
                  {p.statut === "VALIDEE" ? `Validée par ${p.traiteParNom ?? "—"}` : p.statut === "REFUSEE" ? `Refusée : ${p.motifRefus}` : "En attente de validation"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading ? <Spinner /> : !list.length ? <EmptyState>Aucune borne enregistrée. Ajoutez-en une pour alimenter la liste autorisée.</EmptyState> : (
        <div className="overflow-x-auto bg-[#0B0B0D]/65 border border-white/10 rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-[#8A8A8A]"><tr>
              <th className="text-left px-4 py-3">Nom</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Opérateur</th><th className="text-left px-4 py-3">Prix kWh</th><th className="text-left px-4 py-3">Site</th><th className="text-left px-4 py-3">Statut</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id} className="border-t border-[#232327]">
                  <td className="px-4 py-3 text-[#EDEDED]">{b.nom}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{TYPE_LABEL[b.type]}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{b.operateur ?? "—"}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{b.prixKwh != null ? `${b.prixKwh} F` : "—"}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{siteNom(b.siteId)}</td>
                  <td className="px-4 py-3"><span className="text-xs font-medium" style={{ color: b.active ? "#22C55E" : "#8A8A8A" }}>{b.active ? "Active" : "Inactive"}</span></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button className="text-xs text-[#22C55E] hover:underline mr-3" onClick={() => ouvrirEdition(b)}>Modifier</button>
                    <button className="text-xs text-[#8A8A8A] hover:underline" onClick={() => toggle(b)}>{b.active ? "Désactiver" : "Activer"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? "Proposer une modification" : "Proposer une borne"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Nom *"><Input value={form.nom} onChange={(e) => set({ nom: e.target.value })} placeholder="ex. Hub SAVER Cocody" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type *"><Select value={form.type} onChange={(e) => set({ type: e.target.value })}><option value="DOMESTIQUE">Réseau SAVER</option><option value="PARTENAIRE">Partenaire</option></Select></Field>
              <Field label="Opérateur"><Input value={form.operateur} onChange={(e) => set({ operateur: e.target.value })} placeholder="SAVER / Arnio…" /></Field>
            </div>
            <Field label="Prix du kWh (FCFA)" hint="Sert à proposer le montant à payer lors d'une demande de recharge."><Input type="number" value={form.prixKwh} onChange={(e) => set({ prixKwh: e.target.value })} placeholder="ex. 150" /></Field>
            <Field label="Site (optionnel)"><Select value={form.siteId} onChange={(e) => set({ siteId: e.target.value })}><option value="">— aucun —</option>{(ctx?.sites || []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="GPS latitude"><Input type="number" value={form.gpsLat} onChange={(e) => set({ gpsLat: e.target.value })} placeholder="5.36" /></Field>
              <Field label="GPS longitude"><Input type="number" value={form.gpsLng} onChange={(e) => set({ gpsLng: e.target.value })} placeholder="-4.00" /></Field>
            </div>
            <Btn onClick={submit} disabled={!form.nom || saving} className="w-full">Envoyer pour validation</Btn>
            <p className="text-xs text-[#8A8A8A]">La proposition sera appliquée après validation par l'Admin ou la Finance.</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ------------------------------ Validation des bornes (Admin ou Finance) ------------------------------
const CHAMP_LABEL: Record<string, string> = { nom: "Nom", type: "Type", operateur: "Opérateur", siteId: "Site", gpsLat: "Latitude", gpsLng: "Longitude", prixKwh: "Prix du kWh", active: "Active" };

export function usePropositionsEnAttente(actif: boolean): number {
  const [n, setN] = useState(0);
  const load = async () => {
    if (!actif) return;
    try { setN((await api.get<{ propositions: any[] }>("/api/fleet/bornes/propositions")).propositions.length); } catch { /* silencieux */ }
  };
  useEffect(() => { load(); if (!actif) return; const t = setInterval(load, 30000); return () => clearInterval(t); }, [actif]);
  useRealtime("borne:proposition", () => load(), actif);
  return n;
}

const ValidationsBornes: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const { ctx } = useRbac();
  const [enAttente, setEnAttente] = useState<any[]>([]);
  const [traitees, setTraitees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refus, setRefus] = useState<{ id: string; motif: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [a, t] = await Promise.all([
        api.get<{ propositions: any[] }>("/api/fleet/bornes/propositions"),
        api.get<{ propositions: any[] }>("/api/fleet/bornes/propositions?statut=TOUTES"),
      ]);
      setEnAttente(a.propositions);
      setTraitees(t.propositions.filter((p) => p.statut !== "EN_ATTENTE").slice(0, 15));
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useRealtime("borne:proposition", () => load());

  const fmt = (k: string, v: any) => {
    if (v === null || v === undefined || v === "") return "—";
    if (k === "prixKwh") return `${v} F`;
    if (k === "type") return TYPE_LABEL[v] ?? v;
    if (k === "siteId") return ctx?.sites.find((s) => s.id === v)?.nom ?? v;
    if (k === "active") return v ? "Oui" : "Non";
    return String(v);
  };
  const act = async (id: string, action: "valider" | "refuser", body?: any) => {
    setBusy(true);
    try {
      await api.post(`/api/fleet/bornes/propositions/${id}/${action}`, body ?? {});
      notify({ message: action === "valider" ? "Proposition validée et appliquée" : "Proposition refusée", kind: "ok" });
      setRefus(null); load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-5 max-w-3xl">
      {!enAttente.length ? <div className="bg-[#141416] border border-[#232327] rounded-2xl"><EmptyState>Aucune proposition en attente.</EmptyState></div> : enAttente.map((p) => {
        const d = p.donnees || {};
        const mienne = p.proposeParId === ctx?.userId;
        return (
          <div key={p.id} className="bg-[#141416] border border-[#232327] border-l-2 border-l-[#F59E0B] rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-xs text-[#F59E0B] font-medium">{p.type === "CREATION" ? "Nouvelle borne" : "Modification de borne"}</div>
                <div className="text-lg font-semibold text-[#EDEDED]">{p.borneNom ?? d.nom ?? "—"}</div>
                <div className="text-xs text-[#8A8A8A]">Proposée par {p.proposeParNom ?? "—"} · {new Date(p.createdAt).toLocaleString("fr-FR")}</div>
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {Object.keys(d).map((k) => (
                <React.Fragment key={k}>
                  <span className="text-[#8A8A8A]">{CHAMP_LABEL[k] ?? k}</span>
                  <span className="text-[#EDEDED]">
                    {p.type === "MODIFICATION" && p.avant ? <><span className="text-[#8A8A8A]">{fmt(k, p.avant[k])}</span> → </> : null}
                    <b>{fmt(k, d[k])}</b>
                  </span>
                </React.Fragment>
              ))}
            </div>
            {mienne ? (
              <p className="text-xs text-[#8A8A8A]">C'est votre proposition : un autre valideur (Admin ou Finance) doit la traiter.</p>
            ) : refus?.id === p.id ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={refus.motif} onChange={(e) => setRefus({ id: p.id, motif: e.target.value })} placeholder="Motif du refus" className="flex-1" />
                <Btn variant="secondary" onClick={() => setRefus(null)} disabled={busy}>Retour</Btn>
                <Btn variant="danger" onClick={() => act(p.id, "refuser", { motif: refus.motif })} disabled={busy || !refus.motif.trim()}>Refuser</Btn>
              </div>
            ) : (
              <div className="flex gap-2">
                <Btn onClick={() => act(p.id, "valider")} disabled={busy}>Valider</Btn>
                <Btn variant="secondary" onClick={() => setRefus({ id: p.id, motif: "" })} disabled={busy}>Refuser</Btn>
              </div>
            )}
          </div>
        );
      })}
      {!!traitees.length && (
        <div className="bg-[#141416] border border-[#232327] rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wide text-[#8A8A8A] mb-2">Dernières décisions</div>
          <div className="space-y-1.5">
            {traitees.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-[#EDEDED]">{p.type === "CREATION" ? "Nouvelle borne" : "Modification"} · {p.borneNom ?? "—"} <span className="text-[#8A8A8A]">· par {p.proposeParNom ?? "—"}</span></span>
                <span className="text-xs font-medium" style={{ color: p.statut === "VALIDEE" ? "#22C55E" : "#EF4444" }}>
                  {p.statut === "VALIDEE" ? "Validée" : "Refusée"} par {p.traiteParNom ?? "—"}{p.motifRefus ? ` : ${p.motifRefus}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const FleetRecharges: React.FC = () => {
  const { can } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const estSuperviseur = can("recharge.superviser");
  const peutEnregistrer = can("recharge.enregistrer");
  const peutGererBornes = can("borne.gerer");
  const peutControler = can("recharge.controler");
  const peutValider = can("borne.valider");
  const aTraiter = useDemandesATraiter(estSuperviseur);
  const aControler = useRechargesAControler(peutControler);
  const aValider = usePropositionsEnAttente(peutValider);

  type Tab = "demandes" | "suivi" | "enregistrer" | "bornes" | "controle" | "validations";
  const tabs: { key: Tab; label: string; n?: number; show: boolean }[] = [
    { key: "demandes", label: "Demandes", n: aTraiter, show: estSuperviseur },
    { key: "controle", label: "À contrôler", n: aControler, show: peutControler },
    { key: "validations", label: "Validations bornes", n: aValider, show: peutValider },
    { key: "suivi", label: "Suivi", show: estSuperviseur },
    { key: "enregistrer", label: "Enregistrer", show: estSuperviseur },
    { key: "bornes", label: "Bornes", show: estSuperviseur && peutGererBornes },
  ];
  const visibles = tabs.filter((t) => t.show);
  const [tab, setTab] = useState<Tab | null>(null);
  const courant: Tab | null = tab && visibles.some((t) => t.key === tab) ? tab : visibles[0]?.key ?? null;
  const tabCls = (active: boolean) => `px-4 py-2.5 text-sm border-b-2 transition ${active ? "border-[#22C55E] text-[#22C55E]" : "border-transparent text-[#8A8A8A] hover:text-[#EDEDED]"}`;

  return (
    <div className="relative min-h-[80vh]">
      {/* Fond : base sombre (se fond avec l'app) + logo de l'entreprise en grand (filigrane) */}
      <div className="absolute inset-0 bg-[#0A0A0B]" />
      <div className="absolute inset-0 bg-no-repeat bg-center" style={{ backgroundImage: `url(${easyLogo})`, backgroundSize: "min(70%, 700px)", opacity: 0.16 }} />
      <div className="relative z-10">
      <RechargeHero />
      {visibles.length ? (
        <>
          <div className="flex gap-1 border-b border-[#232327] mb-6 overflow-x-auto">
            {visibles.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`${tabCls(courant === t.key)} whitespace-nowrap`}>
                {t.label}{!!t.n && <span className="ml-1.5 font-semibold text-[#F59E0B]">{t.n}</span>}
              </button>
            ))}
          </div>
          <Reveal key={courant ?? ""}>
            {courant === "demandes" ? <SuperviseurBoite notify={notify} />
              : courant === "controle" ? <ControleRecharges notify={notify} />
              : courant === "validations" ? <ValidationsBornes notify={notify} />
              : courant === "enregistrer" ? <SupervisorRechargeForm notify={notify} />
              : courant === "bornes" ? <BornesManager notify={notify} />
              : <RechargesDashboard notify={notify} />}
          </Reveal>
        </>
      ) : peutEnregistrer ? (
        <Reveal>
          <ChauffeurRecharge notify={notify} />
        </Reveal>
      ) : <EmptyState>Accès non autorisé.</EmptyState>}
      {toast && <Toast message={toast.message} kind={toast.kind} />}
      </div>
    </div>
  );
};
