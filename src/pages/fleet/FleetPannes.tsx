/**
 * Supervision des pannes (Flux 4, Bloc C2a) — Responsable terrain / Maintenance.
 * Liste des pannes, détail (photos), et qualification Critique / Non critique (terrain).
 * (Les actions de réparation Maintenance arriveront au Bloc C2b.)
 */
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useRbac } from "../../context/RbacContext";
import { api, uploadMedia, type ApiError } from "../../api/fleet";
import { Btn, Field, Input, Select, Spinner, EmptyState, Modal, Toast, AuthImage } from "./ui";

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
const REP_STATUT: Record<string, { label: string; color: string }> = {
  PLANIFIE: { label: "Planifiée", color: "#F59E0B" },
  EN_COURS: { label: "En cours", color: "#3B82F6" },
  TERMINE: { label: "Terminée", color: "#22C55E" },
  ANNULE: { label: "Annulée", color: "#8A8A8A" },
};
const fcfa = (n: number) => (n ?? 0).toLocaleString("fr-FR") + " F";

// Prise en charge Maintenance (Bloc C2b) : planifier → en cours (devis) → terminé (facture).
// À la clôture, le véhicule est réactivé automatiquement.
const ReparationBloc: React.FC<{ detail: any; notify: (t: ToastState) => void; onChanged: () => void }> = ({ detail, notify, onChanged }) => {
  const rep = detail.reparation;
  const [garages, setGarages] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ garageId: "", datePrevueDebut: "", datePrevueFin: "", coutEstime: "" });
  const [devisId, setDevisId] = useState("");
  const [fact, setFact] = useState<any>({ montant: "", statut: "EN_ATTENTE" });
  const [motif, setMotif] = useState("");
  const [showAnnuler, setShowAnnuler] = useState(false);

  useEffect(() => { api.get<{ garages: any[] }>("/api/fleet/garages").then((d) => setGarages(d.garages)).catch(() => {}); }, []);

  const plan = async () => {
    setSaving(true);
    try {
      await api.post(`/api/fleet/pannes/${detail.id}/reparation`, { garageId: form.garageId, datePrevueDebut: form.datePrevueDebut || null, datePrevueFin: form.datePrevueFin || null, coutEstime: form.coutEstime ? Number(form.coutEstime) : null });
      notify({ message: "Réparation planifiée", kind: "ok" }); onChanged();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };
  const patch = async (payload: any, okMsg: string) => {
    setSaving(true);
    try { await api.patch(`/api/fleet/reparations/${rep.id}`, payload); notify({ message: okMsg, kind: "ok" }); onChanged(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };
  const uploadDevis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const m = await uploadMedia(f); setDevisId(m.id); notify({ message: "Devis ajouté", kind: "ok" }); } catch (err) { notify({ message: errMsg(err), kind: "err" }); }
  };

  const Annuler = () => (
    <div className="pt-2 mt-1 border-t border-[#232327]">
      {!showAnnuler ? (
        <button onClick={() => setShowAnnuler(true)} className="text-xs text-[#8A8A8A] hover:text-[#EF4444]">Annuler la réparation…</button>
      ) : (
        <div className="space-y-1.5 pt-1">
          <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif d'annulation" className="w-full rounded-lg border border-[#33363F] bg-[#0F0F11] text-[#EDEDED] text-xs px-2 py-1.5 outline-none" />
          <div className="flex gap-3">
            <button onClick={() => patch({ action: "annuler", motif }, "Réparation annulée")} disabled={!motif.trim() || saving} className="text-xs text-[#EF4444] hover:underline disabled:opacity-40">Confirmer l'annulation</button>
            <button onClick={() => { setShowAnnuler(false); setMotif(""); }} className="text-xs text-[#8A8A8A] hover:underline">Retour</button>
          </div>
        </div>
      )}
    </div>
  );

  // Pas de réparation en cours → planification (si la panne est qualifiée).
  if (!rep) {
    if (detail.statut !== "QUALIFIEE") return null;
    return (
      <div className="border-t border-[#232327] pt-3 space-y-2">
        <div className="text-xs uppercase tracking-wide text-[#8A8A8A]">Prise en charge (Maintenance)</div>
        <Field label="Garage *"><Select value={form.garageId} onChange={(e) => setForm({ ...form, garageId: e.target.value })}><option value="">— choisir un garage —</option>{garages.map((g) => <option key={g.id} value={g.id}>{g.nom}{g.ville ? ` · ${g.ville}` : ""}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Début prévu"><Input type="date" value={form.datePrevueDebut} onChange={(e) => setForm({ ...form, datePrevueDebut: e.target.value })} /></Field>
          <Field label="Fin prévue"><Input type="date" value={form.datePrevueFin} onChange={(e) => setForm({ ...form, datePrevueFin: e.target.value })} /></Field>
        </div>
        <Field label="Coût estimé (FCFA)"><Input type="number" value={form.coutEstime} onChange={(e) => setForm({ ...form, coutEstime: e.target.value })} placeholder="optionnel" /></Field>
        <Btn onClick={plan} disabled={!form.garageId || saving} className="w-full">Planifier la réparation</Btn>
      </div>
    );
  }

  return (
    <div className="border-t border-[#232327] pt-3 space-y-2 text-sm">
      <div className="text-xs uppercase tracking-wide text-[#8A8A8A]">Réparation (Maintenance)</div>
      <div className="flex justify-between"><span className="text-[#8A8A8A]">Statut</span><span className="font-medium" style={{ color: REP_STATUT[rep.statut]?.color }}>{REP_STATUT[rep.statut]?.label}</span></div>
      <div className="flex justify-between"><span className="text-[#8A8A8A]">Garage</span><span className="text-[#EDEDED]">{rep.garageNom ?? "—"}</span></div>
      {rep.coutEstime != null && <div className="flex justify-between"><span className="text-[#8A8A8A]">Coût estimé</span><span className="text-[#EDEDED]">{fcfa(rep.coutEstime)}</span></div>}

      {rep.statut === "PLANIFIE" && (
        <div className="pt-2 space-y-2 border-t border-[#232327] mt-1">
          <p className="text-xs text-[#EDEDED]"><span className="text-[#22C55E] font-medium">Étape 1</span> — Joignez le <b>devis du garage</b>, puis démarrez la réparation.</p>
          <label className="h-11 rounded-xl border border-dashed border-[#33363F] bg-[#0F0F11] flex items-center justify-center text-sm cursor-pointer gap-2" style={{ color: devisId ? "#22C55E" : "#8A8A8A" }}>
            {devisId ? "✓ Devis ajouté — remplacer" : "📎 Choisir le devis (image ou PDF)"}
            <input type="file" accept="image/*,application/pdf" onChange={uploadDevis} className="hidden" />
          </label>
          <Btn onClick={() => patch({ action: "en_cours", devisMediaId: devisId }, "Réparation démarrée")} disabled={!devisId || saving} className="w-full">Démarrer la réparation</Btn>
          {!devisId && <p className="text-[11px] text-[#8A8A8A] text-center">Ajoutez d'abord le devis pour activer le bouton.</p>}
          <Annuler />
        </div>
      )}

      {rep.statut === "EN_COURS" && (
        <div className="pt-2 space-y-2 border-t border-[#232327] mt-1">
          <p className="text-xs text-[#EDEDED]"><span className="text-[#22C55E] font-medium">Étape 2</span> — À la fin des travaux, saisissez la <b>facture</b> pour clôturer. Le véhicule sera alors <b>réactivé automatiquement</b>.</p>
          {rep.devisMediaId && (
            <div><div className="text-xs text-[#8A8A8A] mb-1">Devis joint :</div><AuthImage mediaId={rep.devisMediaId} className="w-full max-h-40 rounded-lg" zoomable /></div>
          )}
          <Field label="Montant facturé (FCFA) *"><Input type="number" value={fact.montant} onChange={(e) => setFact({ ...fact, montant: e.target.value })} placeholder="ex. 48000" /></Field>
          <Field label="Facture"><Select value={fact.statut} onChange={(e) => setFact({ ...fact, statut: e.target.value })}><option value="EN_ATTENTE">En attente de paiement</option><option value="PAYEE">Payée</option></Select></Field>
          <Btn onClick={() => patch({ action: "termine", montantFacture: Number(fact.montant), statutFacture: fact.statut }, "Réparation terminée — véhicule réactivé")} disabled={fact.montant === "" || saving} className="w-full !bg-[#22C55E] !text-[#0A0A0B]">Clôturer et réactiver le véhicule</Btn>
          <Annuler />
        </div>
      )}

      {rep.statut === "TERMINE" && (
        <div className="pt-2 space-y-1 border-t border-[#232327] mt-1">
          <div className="flex justify-between"><span className="text-[#8A8A8A]">Montant facturé</span><span className="text-[#EDEDED]">{fcfa(rep.montantFacture)}</span></div>
          <div className="flex justify-between"><span className="text-[#8A8A8A]">Facture</span><span className="text-[#EDEDED]">{rep.statutFacture === "PAYEE" ? "Payée" : "En attente de paiement"}</span></div>
          <div className="text-xs text-[#22C55E] pt-1">✓ Réparation terminée — véhicule réactivé.</div>
        </div>
      )}
    </div>
  );
};

// ------------------------------ Gestion des garages (Maintenance) ------------------------------
const emptyGarage = { nom: "", ville: "", telephone: "" };
const GaragesManager: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState<any>(emptyGarage);
  const [saving, setSaving] = useState(false);
  const set = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  const load = async () => {
    setLoading(true);
    try { setList((await api.get<{ garages: any[] }>("/api/fleet/garages?all=1")).garages); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true);
    try {
      const payload = { nom: form.nom, ville: form.ville || null, telephone: form.telephone || null };
      if (modal?.id) await api.patch(`/api/fleet/garages/${modal.id}`, payload);
      else await api.post("/api/fleet/garages", payload);
      notify({ message: modal?.id ? "Garage modifié" : "Garage ajouté", kind: "ok" });
      setModal(null); load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };
  const toggle = async (g: any) => { try { await api.patch(`/api/fleet/garages/${g.id}`, { active: !g.active }); load(); } catch (e) { notify({ message: errMsg(e), kind: "err" }); } };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Btn onClick={() => { setForm(emptyGarage); setModal({}); }}>Ajouter un garage</Btn></div>
      {loading ? <Spinner /> : !list.length ? <EmptyState>Aucun garage enregistré.</EmptyState> : (
        <div className="overflow-x-auto border border-[#232327] rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-[#0F0F11] text-[#8A8A8A]"><tr>
              <th className="text-left px-4 py-3">Nom</th><th className="text-left px-4 py-3">Ville</th><th className="text-left px-4 py-3">Téléphone</th><th className="text-left px-4 py-3">Statut</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.id} className="border-t border-[#232327]">
                  <td className="px-4 py-3 text-[#EDEDED]">{g.nom}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{g.ville ?? "—"}</td>
                  <td className="px-4 py-3 text-[#8A8A8A]">{g.telephone ?? "—"}</td>
                  <td className="px-4 py-3"><span className="text-xs font-medium" style={{ color: g.active ? "#22C55E" : "#8A8A8A" }}>{g.active ? "Actif" : "Inactif"}</span></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button className="text-xs text-[#22C55E] hover:underline mr-3" onClick={() => { setForm({ nom: g.nom, ville: g.ville ?? "", telephone: g.telephone ?? "" }); setModal({ id: g.id }); }}>Modifier</button>
                    <button className="text-xs text-[#8A8A8A] hover:underline" onClick={() => toggle(g)}>{g.active ? "Désactiver" : "Activer"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={modal.id ? "Modifier le garage" : "Ajouter un garage"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Nom *"><Input value={form.nom} onChange={(e) => set({ nom: e.target.value })} placeholder="ex. Garage Auto Cocody" /></Field>
            <Field label="Ville"><Input value={form.ville} onChange={(e) => set({ ville: e.target.value })} /></Field>
            <Field label="Téléphone"><Input value={form.telephone} onChange={(e) => set({ telephone: e.target.value })} /></Field>
            <Btn onClick={submit} disabled={!form.nom || saving} className="w-full">{modal.id ? "Enregistrer" : "Ajouter"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export const FleetPannes: React.FC = () => {
  const { can } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const [tab, setTab] = useState<"pannes" | "garages">("pannes");
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

  const peutGererGarages = can("maintenance.gerer");
  const tabCls = (active: boolean) => `px-4 py-2.5 text-sm border-b-2 transition ${active ? "border-[#22C55E] text-[#22C55E]" : "border-transparent text-[#8A8A8A] hover:text-[#EDEDED]"}`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#EDEDED] mb-4">Pannes</h1>

      {peutGererGarages && (
        <div className="flex gap-1 border-b border-[#232327] mb-6">
          <button onClick={() => setTab("pannes")} className={tabCls(tab === "pannes")}>Pannes</button>
          <button onClick={() => setTab("garages")} className={tabCls(tab === "garages")}>Garages</button>
        </div>
      )}

      {tab === "garages" && peutGererGarages ? <GaragesManager notify={notify} /> : (<>
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
      </>)}

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

            {can("maintenance.gerer") && detail.statut !== "DECLAREE" && (
              <ReparationBloc detail={detail} notify={notify} onChanged={() => { openDetail(detail.id); load(); }} />
            )}
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
};
