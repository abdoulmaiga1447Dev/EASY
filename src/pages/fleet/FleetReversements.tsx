/**
 * Supervision des reversements (Flux 2) — Finance / Responsable terrain.
 * Liste filtrable, consultation des preuves, double validation du rapprochement.
 */
import React, { useEffect, useState, useMemo } from "react";
import { useRbac } from "../../context/RbacContext";
import { api, type ApiError } from "../../api/fleet";
import { Btn, Field, Input, Select, Spinner, EmptyState, Modal, Toast, AuthImage } from "./ui";
import { FleetExceptionsCash } from "./FleetExceptionsCash";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const STATUT: Record<string, { label: string; color: string }> = {
  ACCEPTE: { label: "Accepté", color: "#22C55E" },
  ECART_A_VALIDER: { label: "Écart à valider", color: "#F59E0B" },
  RAPPROCHE: { label: "Rapproché", color: "#3B82F6" },
};
const fcfa = (n: number) => (n ?? 0).toLocaleString("fr-FR") + " F";

const ReversementsList: React.FC = () => {
  const { can } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("");
  const [detail, setDetail] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try { const q = filtre ? `?statut=${filtre}` : ""; setList((await api.get<{ reversements: any[] }>(`/api/fleet/reversements${q}`)).reversements); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filtre]);

  const openDetail = async (id: string) => { try { setDetail(await api.get<any>(`/api/fleet/reversements/${id}`)); } catch (e) { notify({ message: errMsg(e), kind: "err" }); } };

  const valider = async (id: string) => {
    try { await api.post(`/api/fleet/reversements/${id}/valider`, {}); notify({ message: "Validation enregistrée", kind: "ok" }); setDetail(null); load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  const drv = (r: any) => r.shiftRecord?.assignment?.driver?.name ?? "—";
  const veh = (r: any) => r.shiftRecord?.assignment?.vehicle?.immatriculation ?? "—";

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Field label="Statut"><Select value={filtre} onChange={(e) => setFiltre(e.target.value)}><option value="">Tous</option><option value="ECART_A_VALIDER">Écart à valider</option><option value="ACCEPTE">Accepté</option><option value="RAPPROCHE">Rapproché</option></Select></Field>
      </div>

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto border border-[#232327] rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-[#0F0F11] text-[#8A8A8A]"><tr>
              <th className="text-left px-4 py-3">Chauffeur</th><th className="text-left px-4 py-3">Véhicule</th><th className="text-left px-4 py-3">Recette</th><th className="text-left px-4 py-3">Reversé</th><th className="text-left px-4 py-3">Écart</th><th className="text-left px-4 py-3">Statut</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-[#232327]">
                  <td className="px-4 py-3 text-[#EDEDED]">{drv(r)}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{veh(r)}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{fcfa(r.recetteYango)}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{fcfa(r.montantReverse)}</td>
                  <td className="px-4 py-3" style={{ color: r.ecart > 0 ? "#EF4444" : "#8A8A8A" }}>{fcfa(r.ecart)}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs" style={{ color: STATUT[r.statut]?.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUT[r.statut]?.color }} />{STATUT[r.statut]?.label || r.statut}</span></td>
                  <td className="px-4 py-3 text-right"><button className="text-xs text-[#22C55E] hover:underline" onClick={() => openDetail(r.id)}>Détails</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <EmptyState>Aucun reversement.</EmptyState>}
        </div>
      )}

      {detail && (
        <Modal title="Reversement" onClose={() => setDetail(null)}>
          <div className="space-y-4 text-sm">
            <div className="text-[#8A8A8A]">{drv(detail)} · {veh(detail)} · {new Date(detail.date).toLocaleDateString("fr-FR")} · Shift {detail.shift}</div>
            <div className="grid grid-cols-2 gap-y-1 gap-x-4">
              <span className="text-[#8A8A8A]">Recette Yango</span><span className="text-[#EDEDED] text-right">{fcfa(detail.recetteYango)}</span>
              <span className="text-[#8A8A8A]">Dépenses</span><span className="text-[#EDEDED] text-right">{fcfa(detail.totalDepenses)}</span>
              <span className="text-[#8A8A8A]">Frais (~1 %)</span><span className="text-[#EDEDED] text-right">{fcfa(detail.frais)}</span>
              <span className="text-[#8A8A8A]">Montant attendu</span><span className="text-[#EDEDED] text-right">{fcfa(detail.montantAttendu)}</span>
              <span className="text-[#8A8A8A]">Montant reversé</span><span className="text-[#EDEDED] text-right">{fcfa(detail.montantReverse)}</span>
              <span className="text-[#8A8A8A]">Écart</span><span className="text-right" style={{ color: detail.ecart > 0 ? "#EF4444" : "#22C55E" }}>{fcfa(detail.ecart)}</span>
            </div>
            <div className="flex gap-3">
              {detail.preuveReversementMediaId && <div><AuthImage mediaId={detail.preuveReversementMediaId} className="w-24 h-24 rounded-lg" /><div className="text-[10px] text-[#8A8A8A] mt-1">Virement</div></div>}
              {detail.preuveYangoMediaId && <div><AuthImage mediaId={detail.preuveYangoMediaId} className="w-24 h-24 rounded-lg" /><div className="text-[10px] text-[#8A8A8A] mt-1">Relevé Yango</div></div>}
            </div>
            {detail.statut === "ECART_A_VALIDER" && (
              <div className="border-t border-[#232327] pt-3">
                <div className="text-xs text-[#8A8A8A] mb-2">Double validation : Finance {detail.valideFinanceById ? "✓" : "—"} · Terrain {detail.valideTerrainById ? "✓" : "—"}</div>
                {can("reversement.rapprocher") && <Btn onClick={() => valider(detail.id)} className="w-full">Valider le rapprochement</Btn>}
              </div>
            )}
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
};

// Conteneur : onglets Reversements / Exceptions cash.
export const FleetReversements: React.FC = () => {
  const [tab, setTab] = useState<"rev" | "cash">("rev");
  const tabCls = (active: boolean) => `px-4 py-2.5 text-sm border-b-2 transition ${active ? "border-[#22C55E] text-[#22C55E]" : "border-transparent text-[#8A8A8A] hover:text-[#EDEDED]"}`;
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#EDEDED] mb-4">Reversements</h1>
      <div className="flex gap-1 border-b border-[#232327] mb-6">
        <button onClick={() => setTab("rev")} className={tabCls(tab === "rev")}>Reversements</button>
        <button onClick={() => setTab("cash")} className={tabCls(tab === "cash")}>Exceptions cash</button>
      </div>
      {tab === "rev" ? <ReversementsList /> : <FleetExceptionsCash />}
    </div>
  );
};
