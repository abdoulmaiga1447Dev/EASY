/**
 * Exceptions cash (Flux 2, Bloc B3) — le Responsable terrain déclare un paiement en
 * espèces exceptionnel, rattaché à un shift précis (attribution) du chauffeur.
 * Règles : le chauffeur doit avoir été programmé, et un shift a soit un reversement
 * soit une exception cash, jamais les deux.
 */
import React, { useEffect, useState, useMemo } from "react";
import { useRbac } from "../../context/RbacContext";
import { api, type ApiError } from "../../api/fleet";
import { Btn, Field, Input, Select, Spinner, EmptyState, Modal, Toast } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const fcfa = (n: number) => (n ?? 0).toLocaleString("fr-FR") + " F";
const todayISO = () => new Date().toISOString().slice(0, 10);

export const FleetExceptionsCash: React.FC = () => {
  const { can, ctx } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [siteId, setSiteId] = useState(ctx?.sites[0]?.id || "");
  const [date, setDate] = useState(todayISO());
  const [attributions, setAttributions] = useState<{ id: string; label: string }[]>([]);
  const [form, setForm] = useState({ assignmentId: "", montant: "", motif: "" });

  const load = async () => {
    setLoading(true);
    try { setItems((await api.get<{ items: any[] }>("/api/fleet/exceptions-cash")).items); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Charge les shifts (attributions) du jour choisi pour les proposer à la déclaration.
  useEffect(() => {
    if (!showForm || !siteId) return;
    api.get<{ shifts: { A: any[]; B: any[] } }>(`/api/fleet/assignments?siteId=${siteId}&date=${date}`)
      .then((d) => {
        const all = [...d.shifts.A, ...d.shifts.B].map((a) => ({ id: a.id, label: `Shift ${a.shift} — ${a.driver?.name} (${a.vehicle?.immatriculation})` }));
        setAttributions(all);
      })
      .catch(() => setAttributions([]));
  }, [showForm, siteId, date]);

  const declarer = async () => {
    if (!form.assignmentId || !form.montant || !form.motif.trim()) return notify({ message: "Shift, montant et motif obligatoires", kind: "err" });
    try { await api.post("/api/fleet/exceptions-cash", { assignmentId: form.assignmentId, montant: Number(form.montant), motif: form.motif.trim() }); notify({ message: "Exception cash enregistrée", kind: "ok" }); setForm({ assignmentId: "", montant: "", motif: "" }); setShowForm(false); load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };
  const regulariser = async (id: string) => {
    try { await api.post(`/api/fleet/exceptions-cash/${id}/regulariser`, {}); notify({ message: "Régularisé", kind: "ok" }); load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-[#8A8A8A]">Paiements en espèces exceptionnels (rattachés à un shift)</span>
        {can("incident.gerer") && <Btn onClick={() => setShowForm(true)}>+ Déclarer une exception cash</Btn>}
      </div>
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto border border-[#232327] rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-[#0F0F11] text-[#8A8A8A]"><tr>
              <th className="text-left px-4 py-3">Chauffeur</th><th className="text-left px-4 py-3">Jour · shift</th><th className="text-left px-4 py-3">Montant</th><th className="text-left px-4 py-3">Motif</th><th className="text-left px-4 py-3">Déclaré par</th><th className="text-left px-4 py-3">Statut</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-[#232327]">
                  <td className="px-4 py-3 text-[#EDEDED]">{c.driverNom || c.driverId}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{c.date ? new Date(c.date).toLocaleDateString("fr-FR") : "—"}{c.shift ? ` · ${c.shift}` : ""}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{fcfa(c.montant)}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{c.motif}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{c.declareParNom || "—"}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs" style={{ color: c.statut === "REGULARISE" ? "#22C55E" : "#F59E0B" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: c.statut === "REGULARISE" ? "#22C55E" : "#F59E0B" }} />{c.statut === "REGULARISE" ? "Régularisé" : "À régulariser"}</span></td>
                  <td className="px-4 py-3 text-right">{c.statut !== "REGULARISE" && (can("incident.gerer") || can("reversement.rapprocher")) && <button className="text-xs text-[#22C55E] hover:underline" onClick={() => regulariser(c.id)}>Régulariser</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <EmptyState>Aucune exception cash.</EmptyState>}
        </div>
      )}

      {showForm && (
        <Modal title="Déclarer une exception cash" onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jour"><Input type="date" value={date} onChange={(e) => { setForm({ ...form, assignmentId: "" }); setDate(e.target.value); }} /></Field>
              {(ctx?.sites.length ?? 0) > 1 && <Field label="Site"><Select value={siteId} onChange={(e) => { setForm({ ...form, assignmentId: "" }); setSiteId(e.target.value); }}>{(ctx?.sites || []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></Field>}
            </div>
            <Field label="Shift concerné (chauffeur programmé)">
              <Select value={form.assignmentId} onChange={(e) => setForm({ ...form, assignmentId: e.target.value })}>
                <option value="">— Choisir un shift —</option>
                {attributions.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </Select>
            </Field>
            {attributions.length === 0 && <p className="text-xs text-[#8A8A8A]">Aucun chauffeur programmé ce jour-là sur ce site.</p>}
            <Field label="Montant reçu en espèces (FCFA)"><Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} /></Field>
            <Field label="Motif (obligatoire)"><Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} placeholder="Ex. TPE en panne, client sans mobile money" /></Field>
            <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={() => setShowForm(false)}>Annuler</Btn><Btn onClick={declarer} disabled={!form.assignmentId}>Enregistrer</Btn></div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
};
