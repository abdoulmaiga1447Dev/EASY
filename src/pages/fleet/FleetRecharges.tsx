/**
 * Recharge EV (Flux 3, Bloc C1).
 * - Chauffeur / équipe (recharge.enregistrer) : enregistre une recharge + voit ses recharges.
 * - Superviseur Logistique (recharge.superviser) : dashboard consommation / coûts / anomalies.
 */
import React, { useEffect, useMemo, useState } from "react";
import { BatteryCharging, AlertTriangle } from "lucide-react";
import { useRbac } from "../../context/RbacContext";
import { api, uploadMedia, type ApiError } from "../../api/fleet";
import { Btn, Panel, Reveal, Field, Input, Select, Spinner, EmptyState, Toast, Modal } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const fcfa = (n: number) => (n ?? 0).toLocaleString("fr-FR") + " F";
const TYPE_LABEL: Record<string, string> = { DOMESTIQUE: "Réseau SAVER", PARTENAIRE: "Partenaire" };

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

// ------------------------------ Formulaire d'enregistrement (chauffeur / équipe) ------------------------------
const RechargeForm: React.FC<{ notify: (t: ToastState) => void; onDone: () => void }> = ({ notify, onDone }) => {
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bornes, setBornes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ typeCharge: "DOMESTIQUE", borneId: "", kwh: "", cout: "", socDebut: "", socFin: "", justificatifMediaId: "" });
  const set = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  useEffect(() => {
    (async () => {
      try {
        const s = await api.get<any>("/api/fleet/me/shift");
        setShift(s);
        setBornes((await api.get<{ bornes: any[] }>("/api/fleet/bornes")).bornes);
      } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
    })();
  }, []);

  const vehicule = shift?.assignment?.vehicle;
  const vehicleId = shift?.assignment?.vehicleId;
  const bornesFiltrees = bornes.filter((b) => b.type === form.typeCharge);
  const complet = vehicleId && form.borneId && form.kwh !== "" && form.cout !== "" && form.socDebut !== "" && form.socFin !== "" && form.justificatifMediaId;

  const submit = async () => {
    setSaving(true);
    try {
      await api.post("/api/fleet/recharges", {
        vehicleId, typeCharge: form.typeCharge, borneId: form.borneId, shift: shift?.assignment?.shift,
        kwh: Number(form.kwh), cout: Number(form.cout), socDebut: Number(form.socDebut), socFin: Number(form.socFin),
        justificatifMediaId: form.justificatifMediaId,
      });
      notify({ message: "Recharge enregistrée", kind: "ok" });
      setForm({ typeCharge: "DOMESTIQUE", borneId: "", kwh: "", cout: "", socDebut: "", socFin: "", justificatifMediaId: "" });
      onDone();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  if (!vehicleId) return <EmptyState>Aucun véhicule attribué aujourd'hui : impossible d'enregistrer une recharge.</EmptyState>;

  return (
    <Panel className="p-5 space-y-4">
      <div className="flex items-center gap-2 text-[#EDEDED]"><BatteryCharging size={18} className="text-[#22C55E]" /><h2 className="font-semibold">Enregistrer une recharge</h2></div>
      <div className="text-sm text-[#8A8A8A]">Véhicule : <span className="text-[#EDEDED]">{vehicule?.immatriculation ?? vehicleId}</span></div>
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
      <p className="text-xs text-[#8A8A8A]">La borne est obligatoire et doit faire partie de la liste autorisée. Les kWh doivent rester cohérents : toute incohérence est signalée au Superviseur Logistique.</p>
    </Panel>
  );
};

// ------------------------------ Mes recharges (chauffeur / équipe) ------------------------------
const MesRecharges: React.FC<{ refresh: number }> = ({ refresh }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { setList((await api.get<{ recharges: any[] }>("/api/fleet/me/recharges")).recharges); } catch { /* silencieux */ } finally { setLoading(false); } })(); }, [refresh]);
  if (loading) return <Spinner />;
  if (!list.length) return null;
  return (
    <Panel className="p-5">
      <h3 className="font-semibold text-[#EDEDED] mb-3">Mes dernières recharges</h3>
      <div className="space-y-2">
        {list.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm border-t border-[#232327] pt-2 first:border-0 first:pt-0">
            <span className="text-[#8A8A8A]">{new Date(r.date).toLocaleDateString("fr-FR")} · {TYPE_LABEL[r.typeCharge]}</span>
            <span className="text-[#EDEDED]">{r.kwh} kWh · {fcfa(r.cout)}</span>
            {r.anomalieCoherence ? <span className="text-xs text-[#EF4444]">Anomalie</span> : <span className="text-xs text-[#22C55E]">OK</span>}
          </div>
        ))}
      </div>
    </Panel>
  );
};

// ------------------------------ Dashboard supervision (Superviseur Logistique) ------------------------------
const RechargesDashboard: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);

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
          <Panel key={c.label} className="p-4">
            <div className="text-xs text-[#8A8A8A]">{c.label}</div>
            <div className={`text-xl font-bold mt-1 ${c.alerte ? "text-[#EF4444]" : "text-[#EDEDED]"}`}>{c.value}</div>
          </Panel>
        ))}
      </div>

      {loading ? <Spinner /> : !data?.recharges?.length ? <EmptyState>Aucune recharge pour ce filtre.</EmptyState> : (
        <div className="overflow-x-auto border border-[#232327] rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-[#0F0F11] text-[#8A8A8A]"><tr>
              <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Véhicule</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">kWh</th><th className="text-left px-4 py-3">Coût</th><th className="text-left px-4 py-3">Batterie</th><th className="text-left px-4 py-3">Contrôle</th>
            </tr></thead>
            <tbody>
              {data.recharges.map((r: any) => {
                const anomalie = r.anomalieCoherence;
                return (
                  <tr key={r.id} className={`border-t border-[#232327] ${anomalie ? "border-l-2 border-[#EF4444]" : ""}`}>
                    <td className="px-4 py-3 text-[#8A8A8A]">{new Date(r.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-[#EDEDED]">{r.vehicule ?? "—"}</td>
                    <td className="px-4 py-3 text-[#8A8A8A]">{TYPE_LABEL[r.typeCharge]}</td>
                    <td className="px-4 py-3 text-[#EDEDED]">{r.kwh}</td>
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
    </div>
  );
};

// ------------------------------ Gestion des bornes (Superviseur Logistique) ------------------------------
const emptyBorne = { nom: "", type: "DOMESTIQUE", operateur: "", siteId: "", gpsLat: "", gpsLng: "" };
const BornesManager: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const { ctx } = useRbac();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState<any>(emptyBorne);
  const [saving, setSaving] = useState(false);
  const set = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  const load = async () => {
    setLoading(true);
    try { setList((await api.get<{ bornes: any[] }>("/api/fleet/bornes?all=1")).bornes); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const ouvrirNouveau = () => { setForm(emptyBorne); setModal({}); };
  const ouvrirEdition = (b: any) => { setForm({ nom: b.nom, type: b.type, operateur: b.operateur ?? "", siteId: b.siteId ?? "", gpsLat: b.gpsLat ?? "", gpsLng: b.gpsLng ?? "" }); setModal({ id: b.id }); };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        nom: form.nom, type: form.type, operateur: form.operateur || null, siteId: form.siteId || null,
        gpsLat: form.gpsLat === "" ? null : Number(form.gpsLat), gpsLng: form.gpsLng === "" ? null : Number(form.gpsLng),
      };
      if (modal?.id) await api.patch(`/api/fleet/bornes/${modal.id}`, payload);
      else await api.post("/api/fleet/bornes", payload);
      notify({ message: modal?.id ? "Borne modifiée" : "Borne ajoutée", kind: "ok" });
      setModal(null); load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };

  const toggle = async (b: any) => {
    try { await api.patch(`/api/fleet/bornes/${b.id}`, { active: !b.active }); load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  const siteNom = (id: string | null) => ctx?.sites.find((s) => s.id === id)?.nom ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Btn onClick={ouvrirNouveau}>Ajouter une borne</Btn></div>
      {loading ? <Spinner /> : !list.length ? <EmptyState>Aucune borne enregistrée. Ajoutez-en une pour alimenter la liste autorisée.</EmptyState> : (
        <div className="overflow-x-auto border border-[#232327] rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-[#0F0F11] text-[#8A8A8A]"><tr>
              <th className="text-left px-4 py-3">Nom</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Opérateur</th><th className="text-left px-4 py-3">Site</th><th className="text-left px-4 py-3">Statut</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id} className="border-t border-[#232327]">
                  <td className="px-4 py-3 text-[#EDEDED]">{b.nom}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{TYPE_LABEL[b.type]}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{b.operateur ?? "—"}</td>
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
        <Modal title={modal.id ? "Modifier la borne" : "Ajouter une borne"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Nom *"><Input value={form.nom} onChange={(e) => set({ nom: e.target.value })} placeholder="ex. Hub SAVER Cocody" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type *"><Select value={form.type} onChange={(e) => set({ type: e.target.value })}><option value="DOMESTIQUE">Réseau SAVER</option><option value="PARTENAIRE">Partenaire</option></Select></Field>
              <Field label="Opérateur"><Input value={form.operateur} onChange={(e) => set({ operateur: e.target.value })} placeholder="SAVER / Arnio…" /></Field>
            </div>
            <Field label="Site (optionnel)"><Select value={form.siteId} onChange={(e) => set({ siteId: e.target.value })}><option value="">— aucun —</option>{(ctx?.sites || []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="GPS latitude"><Input type="number" value={form.gpsLat} onChange={(e) => set({ gpsLat: e.target.value })} placeholder="5.36" /></Field>
              <Field label="GPS longitude"><Input type="number" value={form.gpsLng} onChange={(e) => set({ gpsLng: e.target.value })} placeholder="-4.00" /></Field>
            </div>
            <Btn onClick={submit} disabled={!form.nom || saving} className="w-full">{modal.id ? "Enregistrer" : "Ajouter la borne"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export const FleetRecharges: React.FC = () => {
  const { can } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<"suivi" | "bornes">("suivi");

  const estSuperviseur = can("recharge.superviser");
  const peutEnregistrer = can("recharge.enregistrer");
  const peutGererBornes = can("borne.gerer");
  const tabCls = (active: boolean) => `px-4 py-2.5 text-sm border-b-2 transition ${active ? "border-[#22C55E] text-[#22C55E]" : "border-transparent text-[#8A8A8A] hover:text-[#EDEDED]"}`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#EDEDED] mb-4">Recharge EV</h1>
      {estSuperviseur ? (
        <>
          {peutGererBornes && (
            <div className="flex gap-1 border-b border-[#232327] mb-6">
              <button onClick={() => setTab("suivi")} className={tabCls(tab === "suivi")}>Suivi</button>
              <button onClick={() => setTab("bornes")} className={tabCls(tab === "bornes")}>Bornes</button>
            </div>
          )}
          <Reveal>{tab === "bornes" && peutGererBornes ? <BornesManager notify={notify} /> : <RechargesDashboard notify={notify} />}</Reveal>
        </>
      ) : peutEnregistrer ? (
        <Reveal>
          <div className="space-y-5 max-w-2xl">
            <RechargeForm notify={notify} onDone={() => setRefresh((n) => n + 1)} />
            <MesRecharges refresh={refresh} />
          </div>
        </Reveal>
      ) : <EmptyState>Accès non autorisé.</EmptyState>}
      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
};
