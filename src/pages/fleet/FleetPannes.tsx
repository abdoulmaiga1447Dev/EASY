/**
 * Supervision des pannes (Flux 4, Bloc C2a) — Responsable terrain / Maintenance.
 * Liste des pannes, détail (photos), et qualification Critique / Non critique (terrain).
 * (Les actions de réparation Maintenance arriveront au Bloc C2b.)
 */
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useRbac } from "../../context/RbacContext";
import { api, type ApiError } from "../../api/fleet";
import { Btn, Field, Select, Spinner, EmptyState, Modal, Toast, AuthImage } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const STATUT: Record<string, { label: string; color: string }> = {
  DECLAREE: { label: "Déclarée", color: "#F59E0B" },
  QUALIFIEE: { label: "Qualifiée", color: "#3B82F6" },
  EN_REPARATION: { label: "En réparation", color: "#8A8A8A" },
  RESOLUE: { label: "Résolue", color: "#22C55E" },
  ANNULEE: { label: "Annulée", color: "#8A8A8A" },
};
const GRAVITE: Record<string, string> = { CRITIQUE: "Critique", NON_CRITIQUE: "Non critique" };

export const FleetPannes: React.FC = () => {
  const { can } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const q = filtre ? `?statut=${filtre}` : ""; setList((await api.get<{ pannes: any[] }>(`/api/fleet/pannes${q}`)).pannes); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filtre]);

  const openDetail = async (id: string) => { try { setDetail(await api.get<any>(`/api/fleet/pannes/${id}`)); } catch (e) { notify({ message: errMsg(e), kind: "err" }); } };

  const qualifier = async (gravite: "CRITIQUE" | "NON_CRITIQUE") => {
    if (!detail) return;
    setSaving(true);
    try {
      await api.post(`/api/fleet/pannes/${detail.id}/qualifier`, { gravite });
      notify({ message: gravite === "CRITIQUE" ? "Panne critique : véhicule immobilisé" : "Panne qualifiée", kind: "ok" });
      setDetail(null); load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#EDEDED] mb-4">Pannes</h1>
      <div className="flex justify-end mb-4">
        <Field label="Statut"><Select value={filtre} onChange={(e) => setFiltre(e.target.value)}><option value="">Toutes</option><option value="DECLAREE">Déclarées</option><option value="QUALIFIEE">Qualifiées</option><option value="EN_REPARATION">En réparation</option><option value="RESOLUE">Résolues</option></Select></Field>
      </div>

      {loading ? <Spinner /> : !list.length ? <EmptyState>Aucune panne.</EmptyState> : (
        <div className="overflow-x-auto border border-[#232327] rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-[#0F0F11] text-[#8A8A8A]"><tr>
              <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Véhicule</th><th className="text-left px-4 py-3">Chauffeur</th><th className="text-left px-4 py-3">Gravité</th><th className="text-left px-4 py-3">Statut</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className={`border-t border-[#232327] ${p.immobilise ? "border-l-2 border-[#EF4444]" : ""}`}>
                  <td className="px-4 py-3 text-[#8A8A8A]">{new Date(p.declareeAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-[#EDEDED]">{p.vehicule ?? "—"}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{p.chauffeurNom ?? "—"}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{p.gravite ? GRAVITE[p.gravite] : "—"}</td>
                  <td className="px-4 py-3"><span className="text-xs font-medium" style={{ color: STATUT[p.statut]?.color }}>{STATUT[p.statut]?.label || p.statut}</span></td>
                  <td className="px-4 py-3 text-right"><button className="text-xs text-[#22C55E] hover:underline" onClick={() => openDetail(p.id)}>Détails</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <Modal title="Détail de la panne" onClose={() => setDetail(null)}>
          <div className="space-y-4 text-sm">
            <div className="text-[#8A8A8A]">{detail.vehicule ?? "—"} · déclarée par {detail.chauffeurNom ?? "—"} · {new Date(detail.declareeAt).toLocaleString("fr-FR")}</div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <span className="text-[#8A8A8A]">Statut</span><span className="text-right" style={{ color: STATUT[detail.statut]?.color }}>{STATUT[detail.statut]?.label}</span>
              <span className="text-[#8A8A8A]">Gravité</span><span className="text-[#EDEDED] text-right">{detail.gravite ? GRAVITE[detail.gravite] : "— (à qualifier)"}</span>
              {detail.immobilise && <><span className="text-[#8A8A8A]">Véhicule</span><span className="text-right text-[#EF4444]">Immobilisé</span></>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[#8A8A8A] mb-1">Description</div>
              <p className="text-[#EDEDED] whitespace-pre-wrap">{detail.description}</p>
            </div>
            {Array.isArray(detail.photos) && detail.photos.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-[#8A8A8A] mb-2">Photos</div>
                <div className="grid grid-cols-3 gap-2">
                  {detail.photos.map((m: string) => <AuthImage key={m} mediaId={m} className="w-full h-24 rounded-lg" zoomable />)}
                </div>
              </div>
            )}
            {can("panne.qualifier") && detail.statut === "DECLAREE" && (
              <div className="border-t border-[#232327] pt-3 space-y-2">
                <div className="text-xs text-[#8A8A8A]">Qualifier la panne :</div>
                <div className="flex gap-2">
                  <Btn variant="secondary" onClick={() => qualifier("NON_CRITIQUE")} disabled={saving} className="flex-1">Non critique</Btn>
                  <Btn onClick={() => qualifier("CRITIQUE")} disabled={saving} className="flex-1 !bg-[#EF4444] !text-white"><AlertTriangle size={15} /> Critique (immobiliser)</Btn>
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
