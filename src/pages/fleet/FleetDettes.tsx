/**
 * Dettes chauffeur (Flux 2) — consultation avec détail au clic.
 * `scope="me"` : le chauffeur voit ses propres dettes. `scope="all"` : Finance /
 * Responsable terrain voient celles de leurs sites. (Remboursement en paie, Partie D.)
 */
import React, { useEffect, useState, useMemo } from "react";
import { api, type ApiError } from "../../api/fleet";
import { Spinner, EmptyState, Modal, Toast } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const fcfa = (n: number) => (n ?? 0).toLocaleString("fr-FR") + " F";
const STATUT: Record<string, { label: string; color: string }> = {
  EN_COURS: { label: "En cours", color: "#F59E0B" },
  REMBOURSEE: { label: "Remboursée", color: "#22C55E" },
};

export const FleetDettes: React.FC<{ scope: "me" | "all" }> = ({ scope }) => {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const [dettes, setDettes] = useState<any[]>([]);
  const [reste, setReste] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      if (scope === "me") { const d = await api.get<{ dettes: any[]; resteTotal: number }>("/api/fleet/me/dettes"); setDettes(d.dettes); setReste(d.resteTotal); }
      else { const d = await api.get<{ dettes: any[] }>("/api/fleet/dettes"); setDettes(d.dettes); }
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [scope]);

  const open = async (id: string) => { try { setDetail(await api.get<any>(`/api/fleet/dettes/${id}`)); } catch (e) { notify({ message: errMsg(e), kind: "err" }); } };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-3">
      {scope === "me" && reste != null && dettes.length > 0 && (
        <div className="text-sm text-[#8A8A8A]">Reste à rembourser : <span className="text-[#EF4444] font-semibold">{fcfa(reste)}</span></div>
      )}
      <div className="overflow-x-auto border border-[#232327] rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-[#0F0F11] text-[#8A8A8A]"><tr>
            {scope === "all" && <th className="text-left px-4 py-3">Chauffeur</th>}
            <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Montant</th><th className="text-left px-4 py-3">Restant</th><th className="text-left px-4 py-3">Motif</th><th className="text-left px-4 py-3">Statut</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {dettes.map((d) => (
              <tr key={d.id} className="border-t border-[#232327] hover:bg-white/5 cursor-pointer" onClick={() => open(d.id)}>
                {scope === "all" && <td className="px-4 py-3 text-[#EDEDED]">{d.driverNom || d.driverId}</td>}
                <td className="px-4 py-3 text-[#8A8A8A]">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3 text-[#EDEDED]">{fcfa(d.montant)}</td>
                <td className="px-4 py-3 text-[#EF4444]">{fcfa(d.montant - d.montantRembourse)}</td>
                <td className="px-4 py-3 text-[#8A8A8A]">{d.motif || "—"}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs" style={{ color: STATUT[d.statut]?.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUT[d.statut]?.color }} />{STATUT[d.statut]?.label || d.statut}</span></td>
                <td className="px-4 py-3 text-right text-[#22C55E] text-xs">Détails</td>
              </tr>
            ))}
          </tbody>
        </table>
        {dettes.length === 0 && <EmptyState>Aucune dette.</EmptyState>}
      </div>

      {detail && (
        <Modal title="Détail de la dette" onClose={() => setDetail(null)}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-y-1 gap-x-4">
              {scope === "all" && (<><span className="text-[#8A8A8A]">Chauffeur</span><span className="text-[#EDEDED] text-right">{detail.driverNom}</span></>)}
              <span className="text-[#8A8A8A]">Montant</span><span className="text-[#EDEDED] text-right">{fcfa(detail.montant)}</span>
              <span className="text-[#8A8A8A]">Déjà remboursé</span><span className="text-[#EDEDED] text-right">{fcfa(detail.montantRembourse)}</span>
              <span className="text-[#8A8A8A]">Restant dû</span><span className="text-right text-[#EF4444]">{fcfa(detail.montant - detail.montantRembourse)}</span>
              <span className="text-[#8A8A8A]">Statut</span><span className="text-right" style={{ color: STATUT[detail.statut]?.color }}>{STATUT[detail.statut]?.label || detail.statut}</span>
              <span className="text-[#8A8A8A]">Créée le</span><span className="text-[#EDEDED] text-right">{new Date(detail.createdAt).toLocaleDateString("fr-FR")}</span>
            </div>
            <div className="text-[#8A8A8A]">Motif : <span className="text-[#EDEDED]">{detail.motif || "—"}</span></div>
            {detail.source?.type === "reversement" && (
              <div className="border-t border-[#232327] pt-3">
                <div className="text-xs uppercase tracking-wide text-[#8A8A8A] mb-2">Origine : reversement</div>
                <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                  <span className="text-[#8A8A8A]">Date · shift</span><span className="text-[#EDEDED] text-right">{new Date(detail.source.date).toLocaleDateString("fr-FR")} · {detail.source.shift}</span>
                  <span className="text-[#8A8A8A]">Véhicule</span><span className="text-[#EDEDED] text-right">{detail.source.vehicule || "—"}</span>
                  <span className="text-[#8A8A8A]">Recette Yango</span><span className="text-[#EDEDED] text-right">{fcfa(detail.source.recetteYango)}</span>
                  <span className="text-[#8A8A8A]">Montant attendu</span><span className="text-[#EDEDED] text-right">{fcfa(detail.source.montantAttendu)}</span>
                  <span className="text-[#8A8A8A]">Montant reversé</span><span className="text-[#EDEDED] text-right">{fcfa(detail.source.montantReverse)}</span>
                  <span className="text-[#8A8A8A]">Écart (= dette)</span><span className="text-right text-[#EF4444]">{fcfa(detail.source.ecart)}</span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
};
