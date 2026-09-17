/**
 * Exceptions cash (Flux 2, Bloc B3) — le Responsable terrain déclare un paiement en
 * espèces exceptionnel (motif obligatoire) ; suivi de la régularisation.
 */
import React, { useEffect, useState, useMemo } from "react";
import { useRbac } from "../../context/RbacContext";
import { api, type ApiError } from "../../api/fleet";
import { Btn, Field, Input, Select, Spinner, EmptyState, Modal, Toast } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const fcfa = (n: number) => (n ?? 0).toLocaleString("fr-FR") + " F";

export const FleetExceptionsCash: React.FC = () => {
  const { can } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ driverId: "", montant: "", motif: "" });

  const load = async () => {
    setLoading(true);
    try { setItems((await api.get<{ items: any[] }>("/api/fleet/exceptions-cash")).items); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!can("incident.gerer")) return;
    api.get<{ users: any[] }>("/api/users").then((d) => setDrivers(d.users.filter((u) => u.roleCode === "chauffeur").map((u) => ({ id: u.id, name: u.name })))).catch(() => {});
  }, [can]);

  const declarer = async () => {
    if (!form.driverId || !form.montant || !form.motif.trim()) return notify({ message: "Chauffeur, montant et motif obligatoires", kind: "err" });
    try { await api.post("/api/fleet/exceptions-cash", { driverId: form.driverId, montant: Number(form.montant), motif: form.motif.trim() }); notify({ message: "Exception cash enregistrée", kind: "ok" }); setForm({ driverId: "", montant: "", motif: "" }); setShowForm(false); load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };
  const regulariser = async (id: string) => {
    try { await api.post(`/api/fleet/exceptions-cash/${id}/regulariser`, {}); notify({ message: "Régularisé", kind: "ok" }); load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-[#8A8A8A]">Paiements en espèces exceptionnels</span>
        {can("incident.gerer") && <Btn onClick={() => setShowForm(true)}>+ Déclarer une exception cash</Btn>}
      </div>
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto border border-[#232327] rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-[#0F0F11] text-[#8A8A8A]"><tr>
              <th className="text-left px-4 py-3">Chauffeur</th><th className="text-left px-4 py-3">Montant</th><th className="text-left px-4 py-3">Motif</th><th className="text-left px-4 py-3">Déclaré par</th><th className="text-left px-4 py-3">Statut</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-[#232327]">
                  <td className="px-4 py-3 text-[#EDEDED]">{c.driverNom || c.driverId}</td>
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
            <Field label="Chauffeur"><Select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}><option value="">— Choisir —</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Field label="Montant reçu en espèces (FCFA)"><Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} /></Field>
            <Field label="Motif (obligatoire)"><Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} placeholder="Ex. TPE en panne, client sans mobile money" /></Field>
            <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={() => setShowForm(false)}>Annuler</Btn><Btn onClick={declarer}>Enregistrer</Btn></div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
};
