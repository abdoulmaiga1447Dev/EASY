/**
 * Espace chauffeur (Flux 1, Bloc B1) — mon shift du jour : prise de poste (check-in
 * avec 5 preuves), service en cours, fin de poste (check-out avec 4 photos).
 */
import React, { useEffect, useState, useMemo } from "react";
import { MapPin, Camera, Check, HelpCircle, Car } from "lucide-react";
import { useRbac } from "../../context/RbacContext";
import { api, uploadMedia, type ApiError } from "../../api/fleet";
import { Btn, Panel, Reveal, Field, Input, Spinner, EmptyState, Toast } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";

// Uploader photo (aperçu local immédiat, upload en tâche de fond).
const PhotoCapture: React.FC<{ label: string; mediaId: string | null; onUploaded: (id: string) => void; notify: (t: ToastState) => void }> = ({ label, mediaId, onUploaded, notify }) => {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setPreview(URL.createObjectURL(file));
    try { const m = await uploadMedia(file); onUploaded(m.id); }
    catch (err) { notify({ message: errMsg(err), kind: "err" }); setPreview(null); }
    finally { setBusy(false); }
  };
  return (
    <label className="flex flex-col gap-1.5 cursor-pointer">
      <span className="text-xs text-[#8A8A8A]">{label}{mediaId ? " ✓" : " *"}</span>
      <div className={`h-28 rounded-xl border overflow-hidden flex items-center justify-center ${mediaId ? "border-[#22C55E]" : "border-dashed border-[#33363F]"} bg-[#0F0F11]`}>
        {preview ? <img src={preview} className="w-full h-full object-cover" alt={label} />
          : busy ? <span className="text-xs text-[#8A8A8A]">…</span>
          : <Camera size={20} className="text-[#8A8A8A]" />}
      </div>
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
    </label>
  );
};

export const FleetChauffeur: React.FC = () => {
  const { ctx } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [ci, setCi] = useState<any>({ gpsLat: null, gpsLng: null, kmDebut: "", photoCompteur: "", photoVehicule: "", photoPermis: "", selfieKyc: "" });
  const [co, setCo] = useState<any>({ kmFin: "", photoAvant: "", photoArriere: "", photoGauche: "", photoDroite: "" });

  const load = async () => { setLoading(true); try { setData(await api.get<any>("/api/fleet/me/shift")); } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const activerGps = () => {
    if (!navigator.geolocation) return notify({ message: "GPS non disponible sur cet appareil", kind: "err" });
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCi((c: any) => ({ ...c, gpsLat: pos.coords.latitude, gpsLng: pos.coords.longitude })); notify({ message: "Position GPS enregistrée", kind: "ok" }); },
      () => notify({ message: "Autorisez la localisation pour continuer", kind: "err" })
    );
  };

  const ciComplet = ci.gpsLat != null && ci.gpsLng != null && ci.kmDebut !== "" && ci.photoCompteur && ci.photoVehicule && ci.photoPermis && ci.selfieKyc;
  const coComplet = co.kmFin !== "" && co.photoAvant && co.photoArriere && co.photoGauche && co.photoDroite;

  const doCheckin = async () => {
    if (!data?.assignment) return;
    setSaving(true);
    try { await api.post(`/api/fleet/shifts/${data.assignment.id}/checkin`, { ...ci, kmDebut: Number(ci.kmDebut) }); notify({ message: "Check-in validé, bon service !", kind: "ok" }); load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };
  const doCheckout = async () => {
    if (!data?.assignment) return;
    setSaving(true);
    try { await api.post(`/api/fleet/shifts/${data.assignment.id}/checkout`, { ...co, kmFin: Number(co.kmFin) }); notify({ message: "Shift terminé. Merci !", kind: "ok" }); load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  const a = data?.assignment;
  const rec = a?.shiftRecord;
  const statut = rec?.statut ?? "EN_ATTENTE";

  return (
    <div className="max-w-2xl space-y-6">
      <Reveal>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#EDEDED]">Mon service</h1>
            <p className="text-[#8A8A8A] mt-1 capitalize">{new Date(data.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <Btn variant="secondary" size="sm" onClick={() => notify({ message: "Contactez votre Responsable terrain.", kind: "ok" })}><HelpCircle size={16} /> Besoin d'aide</Btn>
        </div>
      </Reveal>

      {!a && <EmptyState>Aucune attribution pour aujourd'hui. Rapprochez-vous du Dispatcher.</EmptyState>}

      {a && (
        <Reveal delay={0.05}>
          <Panel className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#1C1C20] flex items-center justify-center"><Car size={20} className="text-[#8A8A8A]" /></div>
              <div>
                <div className="font-semibold text-[#EDEDED]">{a.vehicle?.marque} {a.vehicle?.modele} — {a.vehicle?.immatriculation}</div>
                <div className="text-sm text-[#8A8A8A]">Shift {a.shift} · {a.site?.nom}{a.lieu ? ` · ${a.lieu}` : ""}</div>
              </div>
            </div>
          </Panel>
        </Reveal>
      )}

      {a && !data.permisValide && (
        <Panel className="p-4"><p className="text-sm text-[#EF4444]">Permis expiré. Contactez votre Responsable terrain pour pouvoir prendre votre service.</p></Panel>
      )}

      {/* Check-in */}
      {a && data.permisValide && statut === "EN_ATTENTE" && (
        <Reveal delay={0.1}>
          <Panel className="p-5 space-y-4">
            <h2 className="font-semibold text-[#EDEDED]">Prise de poste (check-in)</h2>
            <div className="flex items-center gap-3">
              <Btn variant={ci.gpsLat != null ? "secondary" : "primary"} onClick={activerGps}><MapPin size={16} /> {ci.gpsLat != null ? "Position enregistrée" : "Activer le GPS"}</Btn>
              {ci.gpsLat != null && <Check size={18} className="text-[#22C55E]" />}
            </div>
            <Field label="Kilométrage au compteur"><Input type="number" value={ci.kmDebut} onChange={(e) => setCi({ ...ci, kmDebut: e.target.value })} placeholder="ex. 12000" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <PhotoCapture label="Photo compteur" mediaId={ci.photoCompteur} onUploaded={(id) => setCi({ ...ci, photoCompteur: id })} notify={notify} />
              <PhotoCapture label="Photo véhicule" mediaId={ci.photoVehicule} onUploaded={(id) => setCi({ ...ci, photoVehicule: id })} notify={notify} />
              <PhotoCapture label="Photo permis" mediaId={ci.photoPermis} onUploaded={(id) => setCi({ ...ci, photoPermis: id })} notify={notify} />
              <PhotoCapture label="Selfie au volant" mediaId={ci.selfieKyc} onUploaded={(id) => setCi({ ...ci, selfieKyc: id })} notify={notify} />
            </div>
            <Btn onClick={doCheckin} disabled={!ciComplet || saving} className="w-full">Valider le check-in</Btn>
            {!ciComplet && <p className="text-xs text-[#8A8A8A] text-center">Activez le GPS, saisissez le kilométrage et ajoutez les 4 photos.</p>}
          </Panel>
        </Reveal>
      )}

      {/* En cours → check-out */}
      {a && statut === "EN_COURS" && (
        <Reveal delay={0.1}>
          <Panel className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-[#22C55E] text-sm font-medium"><span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" /> Service en cours depuis {rec.checkinAt ? new Date(rec.checkinAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
            <h2 className="font-semibold text-[#EDEDED]">Fin de poste (check-out)</h2>
            <Field label="Kilométrage au compteur (fin)"><Input type="number" value={co.kmFin} onChange={(e) => setCo({ ...co, kmFin: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <PhotoCapture label="Avant" mediaId={co.photoAvant} onUploaded={(id) => setCo({ ...co, photoAvant: id })} notify={notify} />
              <PhotoCapture label="Arrière" mediaId={co.photoArriere} onUploaded={(id) => setCo({ ...co, photoArriere: id })} notify={notify} />
              <PhotoCapture label="Gauche" mediaId={co.photoGauche} onUploaded={(id) => setCo({ ...co, photoGauche: id })} notify={notify} />
              <PhotoCapture label="Droite" mediaId={co.photoDroite} onUploaded={(id) => setCo({ ...co, photoDroite: id })} notify={notify} />
            </div>
            <Btn onClick={doCheckout} disabled={!coComplet || saving} className="w-full">Terminer le shift</Btn>
          </Panel>
        </Reveal>
      )}

      {/* Terminé */}
      {a && statut === "TERMINE" && (
        <Reveal delay={0.1}>
          <Panel className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#0F2A1A] text-[#22C55E] flex items-center justify-center mx-auto mb-3"><Check size={24} /></div>
            <h2 className="font-semibold text-[#EDEDED]">Shift terminé</h2>
            <p className="text-sm text-[#8A8A8A] mt-1">{rec.kmParcourus != null ? `${rec.kmParcourus} km parcourus` : ""}{rec.dureeMinutes != null ? ` · ${Math.floor(rec.dureeMinutes / 60)}h${String(rec.dureeMinutes % 60).padStart(2, "0")}` : ""}</p>
            <p className="text-xs text-[#8A8A8A] mt-3">Le reversement des recettes arrive à la prochaine étape (Partie B — Flux 2).</p>
          </Panel>
        </Reveal>
      )}

      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
};
