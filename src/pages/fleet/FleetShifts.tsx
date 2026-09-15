/**
 * Supervision terrain (Flux 1) — Responsable terrain / Admin.
 * Vue des shifts du jour (état check-in/out) et consultation des preuves.
 */
import React, { useEffect, useState, useMemo } from "react";
import { useRbac } from "../../context/RbacContext";
import { api, type ApiError } from "../../api/fleet";
import { Field, Input, Select, Spinner, EmptyState, Modal, Toast, AuthImage } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const STATUT_LABEL: Record<string, string> = { EN_ATTENTE: "En attente", EN_COURS: "En cours", TERMINE: "Terminé" };
const STATUT_COLOR: Record<string, string> = { EN_ATTENTE: "#8A8A8A", EN_COURS: "#22C55E", TERMINE: "#3B82F6" };

export const FleetShifts: React.FC = () => {
  const { ctx } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const [siteId, setSiteId] = useState(ctx?.sites[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);

  const load = async () => {
    if (!siteId) { setLoading(false); return; }
    setLoading(true);
    try { setShifts((await api.get<{ shifts: any[] }>(`/api/fleet/shifts?siteId=${siteId}&date=${date}`)).shifts); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [siteId, date]);

  const openDetail = async (recordId: string) => {
    try { setDetail(await api.get<any>(`/api/fleet/shifts/${recordId}`)); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        {(ctx?.sites.length ?? 0) > 1 && (
          <Field label="Site"><Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>{(ctx?.sites || []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></Field>
        )}
      </div>

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto border border-[#232327] rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-[#0F0F11] text-[#8A8A8A]">
              <tr><th className="text-left px-4 py-3">Shift</th><th className="text-left px-4 py-3">Chauffeur</th><th className="text-left px-4 py-3">Véhicule</th><th className="text-left px-4 py-3">Statut</th><th className="text-left px-4 py-3">Check-in</th><th className="text-left px-4 py-3">Check-out</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.assignmentId} className="border-t border-[#232327]">
                  <td className="px-4 py-3 text-[#EDEDED]">{s.shift}</td>
                  <td className="px-4 py-3 text-[#EDEDED]">{s.chauffeur}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{s.vehicule}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs"><span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUT_COLOR[s.statut] }} />{STATUT_LABEL[s.statut] || s.statut}</span></td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{s.checkinAt ? new Date(s.checkinAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{s.checkoutAt ? new Date(s.checkoutAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="px-4 py-3 text-right">{s.recordId && s.statut !== "EN_ATTENTE" && <button className="text-xs text-[#22C55E] hover:underline" onClick={() => openDetail(s.recordId)}>Voir les preuves</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shifts.length === 0 && <EmptyState>Aucun shift attribué pour cette date.</EmptyState>}
        </div>
      )}

      {detail && (
        <Modal title={`Preuves — Shift ${detail.shift}`} onClose={() => setDetail(null)}>
          <div className="space-y-4">
            <div className="text-sm text-[#8A8A8A]">
              Check-in : {detail.checkinAt ? new Date(detail.checkinAt).toLocaleString("fr-FR") : "—"}
              {detail.kmDebut != null && ` · ${detail.kmDebut} km`}
              {detail.gpsLat != null && ` · GPS ${detail.gpsLat.toFixed(4)}, ${detail.gpsLng.toFixed(4)}`}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[#8A8A8A] mb-2">Prise de poste</div>
              <div className="grid grid-cols-4 gap-2">
                {[["Compteur", detail.photoCompteur], ["Véhicule", detail.photoVehicule], ["Permis", detail.photoPermis], ["Selfie", detail.selfieKyc]].map(([l, m]) => (
                  <div key={l as string}><AuthImage mediaId={m as string} className="w-full h-20 rounded-lg" /><div className="text-[10px] text-[#8A8A8A] mt-1">{l as string}</div></div>
                ))}
              </div>
            </div>
            {detail.statut === "TERMINE" && (
              <div>
                <div className="text-xs uppercase tracking-wide text-[#8A8A8A] mb-2">Fin de poste{detail.kmParcourus != null ? ` · ${detail.kmParcourus} km` : ""}</div>
                <div className="grid grid-cols-4 gap-2">
                  {[["Avant", detail.photoAvant], ["Arrière", detail.photoArriere], ["Gauche", detail.photoGauche], ["Droite", detail.photoDroite]].map(([l, m]) => (
                    <div key={l as string}><AuthImage mediaId={m as string} className="w-full h-20 rounded-lg" /><div className="text-[10px] text-[#8A8A8A] mt-1">{l as string}</div></div>
                  ))}
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
