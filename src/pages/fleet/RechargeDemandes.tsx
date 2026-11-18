/**
 * Recharge payée par le Superviseur — écrans.
 * - Chauffeur : « Demander une recharge », puis le fil de la demande (photos à la borne,
 *   notification de paiement, photo de fin).
 * - Superviseur Logistique : boîte des demandes (ordre d'arrivée) + fil de discussion,
 *   indication de la borne, paiement.
 * Mise à jour en temps réel (Socket.IO) avec une relecture périodique en secours.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BatteryCharging, MapPin, Phone, Send, ArrowLeft, AlertTriangle, CheckCircle2, QrCode, Gauge, Banknote, Upload, ShieldCheck } from "lucide-react";
import { api, uploadMedia, type ApiError } from "../../api/fleet";
import { useRealtime } from "../../api/realtime";
import { useRbac } from "../../context/RbacContext";
import { Btn, Panel, Field, Input, Select, Spinner, EmptyState, AuthImage } from "./ui";
import { CameraCapture } from "./CameraCapture";
import { useAppel } from "./Appel";

type ToastState = { message: string; kind: "ok" | "err" } | null;
type Notify = (t: ToastState) => void;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const fcfa = (n: number | null | undefined) => (n ?? 0).toLocaleString("fr-FR") + " F";
const heure = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const depuis = (d: string) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `il y a ${h} h ${String(min % 60).padStart(2, "0")}` : new Date(d).toLocaleDateString("fr-FR");
};

const GREEN = "#22C55E", RED = "#EF4444", AMBER = "#F59E0B", MUTED = "#8A8A8A";

export const STATUT: Record<string, { label: string; color: string }> = {
  DEMANDEE: { label: "Nouvelle demande", color: AMBER },
  PRISE_EN_CHARGE: { label: "Borne indiquée", color: "#EDEDED" },
  SUR_PLACE: { label: "À payer", color: AMBER },
  PAYEE: { label: "Payée · en charge", color: GREEN },
  TERMINEE: { label: "Terminée", color: MUTED },
  ANNULEE: { label: "Annulée", color: MUTED },
};
const OUVERTS = ["DEMANDEE", "PRISE_EN_CHARGE", "SUR_PLACE", "PAYEE"];
const ETAPES = [
  { key: "DEMANDEE", label: "Demande" },
  { key: "PRISE_EN_CHARGE", label: "Borne" },
  { key: "SUR_PLACE", label: "Sur place" },
  { key: "PAYEE", label: "Paiement" },
  { key: "TERMINEE", label: "Terminée" },
];

/** Étapes du parcours, en texte (pas de pastilles). */
const Etapes: React.FC<{ statut: string }> = ({ statut }) => {
  if (statut === "ANNULEE") return <div className="text-xs text-[#8A8A8A]">Demande annulée</div>;
  const idx = ETAPES.findIndex((e) => e.key === statut);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {ETAPES.map((e, i) => (
        <React.Fragment key={e.key}>
          {i > 0 && <span className="text-[#33363F]">—</span>}
          <span className={i === idx ? "font-semibold" : ""} style={{ color: i < idx ? "#EDEDED" : i === idx ? GREEN : "#55555C" }}>
            {i + 1}. {e.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

/** Bloc mis en avant : liseré de couleur + fond neutre plein. */
const Callout: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <div className="border-l-2 bg-[#141416] rounded-r-xl px-4 py-3 text-sm text-[#EDEDED]" style={{ borderColor: color }}>{children}</div>
);

// =====================================================================================
// Fil de discussion
// =====================================================================================

const Fil: React.FC<{ demande: any; moi: string; vueSuperviseur: boolean }> = ({ demande, moi, vueSuperviseur }) => {
  const bas = useRef<HTMLDivElement>(null);
  // Fait défiler la zone de discussion seulement (pas toute la page).
  useEffect(() => {
    const zone = bas.current?.closest(".overflow-y-auto") as HTMLElement | null;
    if (zone) zone.scrollTo({ top: zone.scrollHeight, behavior: "smooth" });
  }, [demande?.messages?.length]);

  return (
    <div className="space-y-3">
      {demande.messages.map((m: any) => {
        const mien = m.auteurId === moi;
        if (m.type === "APPEL") {
          const rate = m.meta?.etat && m.meta.etat !== "TERMINE";
          return (
            <div key={m.id} className="flex justify-center">
              <div className="text-xs px-3 py-1.5 flex items-center gap-1.5" style={{ color: rate ? "#EF4444" : "#8A8A8A" }}>
                <Phone size={12} /> {m.texte}{m.auteurNom ? ` · ${mien ? "vous" : m.auteurNom}` : ""} <span className="text-[#55555C] ml-1">{heure(m.createdAt)}</span>
              </div>
            </div>
          );
        }
        if (m.type === "SYSTEME" || m.type === "ANNULATION") {
          const anomalie = m.meta?.anomalie || /anomalie/i.test(m.texte || "");
          return (
            <div key={m.id} className="flex justify-center">
              <div className={`text-xs px-3 py-1.5 max-w-[90%] text-center ${anomalie ? "border-l-2 border-[#EF4444] bg-[#141416] rounded-r-lg text-[#EF4444]" : "text-[#8A8A8A]"}`}>
                {m.texte} <span className="text-[#55555C] ml-1">{heure(m.createdAt)}</span>
              </div>
            </div>
          );
        }
        return (
          <div key={m.id} className={`flex ${mien ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 border ${mien ? "bg-[#1C1C20] border-[#2A2A30]" : "bg-[#141416] border-[#232327]"}`}>
              <div className="text-[11px] text-[#8A8A8A] mb-1">{mien ? "Vous" : m.auteurNom ?? "—"} · {heure(m.createdAt)}</div>
              <Contenu m={m} vueSuperviseur={vueSuperviseur} />
            </div>
          </div>
        );
      })}
      <div ref={bas} />
    </div>
  );
};

const Contenu: React.FC<{ m: any; vueSuperviseur: boolean }> = ({ m, vueSuperviseur }) => {
  switch (m.type) {
    case "BORNE": {
      const g = m.meta;
      const lien = g?.gpsLat != null && g?.gpsLng != null ? `https://www.google.com/maps/dir/?api=1&destination=${g.gpsLat},${g.gpsLng}` : null;
      return (
        <div className="text-sm text-[#EDEDED]">
          <div className="flex items-center gap-1.5 font-medium"><MapPin size={14} className="text-[#22C55E]" /> {g?.nom ?? "Borne"}</div>
          <div className="text-[#8A8A8A] mt-0.5">{m.texte}</div>
          {lien && <a href={lien} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-xs text-[#22C55E] hover:underline">Ouvrir l'itinéraire</a>}
        </div>
      );
    }
    case "PHOTOS_ARRIVEE":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {m.mediaIds.map((id: string, i: number) => (
              <div key={id}>
                <div className="text-[10px] uppercase tracking-wide text-[#8A8A8A] mb-1">{i === 0 ? "QR code de la borne" : "Tableau de bord"}</div>
                <AuthImage mediaId={id} className="w-full h-32 sm:h-40 rounded-lg" zoomable />
              </div>
            ))}
          </div>
          <div className="text-sm text-[#EDEDED]">Batterie à l'arrivée : <b>{m.meta?.socDebut ?? "—"} %</b></div>
          {vueSuperviseur && m.meta?.kwhEstime != null && (
            <div className="text-xs text-[#8A8A8A]">
              Pour atteindre 80 % : ≈ {m.meta.kwhEstime} kWh{m.meta.montantSuggere != null ? <> · montant proposé <span className="text-[#EDEDED]">{fcfa(m.meta.montantSuggere)}</span></> : " (prix du kWh de la borne non renseigné)"}
            </div>
          )}
        </div>
      );
    case "PAIEMENT":
      return (
        <div className="text-sm">
          <div className="flex items-center gap-1.5 font-medium text-[#22C55E]"><CheckCircle2 size={15} /> Paiement effectué</div>
          <div className="text-[#EDEDED] mt-0.5">{fcfa(m.meta?.montant)} <span className="text-[#8A8A8A]">· n° {m.meta?.refTransaction}</span></div>
          <div className="text-[#8A8A8A] text-xs mt-0.5">Le véhicule peut être branché.</div>
        </div>
      );
    case "PHOTO_FIN":
      return (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-[#8A8A8A]">Tableau de bord à la fin</div>
          <AuthImage mediaId={m.mediaIds[0]} className="w-full h-40 rounded-lg" zoomable />
          <div className="text-sm text-[#EDEDED]">Batterie à la fin : <b>{m.meta?.socFin ?? "—"} %</b></div>
        </div>
      );
    default:
      return <div className="text-sm text-[#EDEDED] whitespace-pre-wrap break-words">{m.texte}</div>;
  }
};

/** Zone de saisie d'un message texte. */
const Composer: React.FC<{ demandeId: string; onSent: (d: any) => void; notify: Notify }> = ({ demandeId, onSent, notify }) => {
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);
  const envoyer = async () => {
    const t = texte.trim();
    if (!t) return;
    setBusy(true);
    try { onSent(await api.post<any>(`/api/fleet/recharge-demandes/${demandeId}/messages`, { texte: t })); setTexte(""); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setBusy(false); }
  };
  return (
    <div className="flex gap-2">
      <Input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Écrire un message…" className="flex-1"
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }} />
      <Btn onClick={envoyer} disabled={busy || !texte.trim()} aria-label="Envoyer"><Send size={16} /></Btn>
    </div>
  );
};

/** Capture d'écran de la confirmation de paiement (choisie dans la galerie : c'est une capture d'écran). */
const CapturePaiement: React.FC<{ mediaId: string | null; onUploaded: (id: string) => void; notify: Notify }> = ({ mediaId, onUploaded, notify }) => {
  const [busy, setBusy] = useState(false);
  const [apercu, setApercu] = useState<string | null>(null);
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const m = await uploadMedia(file); onUploaded(m.id); setApercu(URL.createObjectURL(file)); }
    catch (err) { notify({ message: errMsg(err), kind: "err" }); } finally { setBusy(false); e.target.value = ""; }
  };
  return (
    <label className="flex flex-col gap-1.5 cursor-pointer text-sm">
      <span className="text-[#8A8A8A] font-medium">Capture de la confirmation Wave *</span>
      <div className={`h-24 rounded-xl border overflow-hidden flex items-center justify-center bg-[#0F0F11] ${mediaId ? "border-[#22C55E]" : "border-dashed border-[#33363F]"}`}>
        {apercu ? <img src={apercu} alt="Capture du paiement" className="h-full w-full object-contain" />
          : <span className="flex items-center gap-2 text-[#8A8A8A]"><Upload size={16} /> {busy ? "Envoi…" : "Choisir la capture"}</span>}
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
  );
};

/** Bouton d'appel intégré (désactivé pendant un autre appel). */
const BoutonAppel: React.FC<{ demandeId: string; nom: string; vehicule?: string | null; libelle: string }> = ({ demandeId, nom, vehicule, libelle }) => {
  const { phase, appeler } = useAppel();
  return (
    <button onClick={() => appeler(demandeId, nom, vehicule ?? null)} disabled={phase !== "idle"}
      className="inline-flex items-center gap-2 rounded-xl bg-[#22C55E] text-black text-sm font-semibold px-4 py-2.5 hover:brightness-110 disabled:opacity-40">
      <Phone size={16} /> {phase !== "idle" ? "En appel…" : libelle}
    </button>
  );
};

// =====================================================================================
// Côté chauffeur
// =====================================================================================

export const ChauffeurRecharge: React.FC<{ notify: Notify }> = ({ notify }) => {
  const { ctx } = useRbac();
  const [data, setData] = useState<{ ouverte: any; historique: any[] } | null>(null);
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [etape, setEtape] = useState<null | "sur-place" | "terminer">(null);
  const [form, setForm] = useState<any>({ qr: null, tableau: null, soc: "" });
  const [cle, setCle] = useState(0); // remonte les captures après envoi

  const load = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([
        api.get<{ ouverte: any; historique: any[] }>("/api/fleet/me/recharge-demandes"),
        api.get<any>("/api/fleet/me/shift").catch(() => null),
      ]);
      setData(d);
      setShift(s);
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  }, [notify]);
  useEffect(() => { load(); }, [load]);

  // Temps réel + relecture de secours toutes les 20 s.
  useRealtime("recharge:update", () => load());
  useEffect(() => { const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const d = data?.ouverte;
  // Son à l'arrivée du paiement : annonce globale (FleetWorkspace).

  const reset = () => { setForm({ qr: null, tableau: null, soc: "" }); setEtape(null); setCle((k) => k + 1); };

  const demander = async () => {
    setBusy(true);
    try {
      await api.post("/api/fleet/recharge-demandes", { vehicleId: shift?.assignment?.vehicleId });
      notify({ message: "Demande envoyée au Superviseur", kind: "ok" });
      await load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setBusy(false); }
  };

  const envoyerSurPlace = async () => {
    setBusy(true);
    try {
      await api.post(`/api/fleet/recharge-demandes/${d.id}/sur-place`, { qrMediaId: form.qr, tableauMediaId: form.tableau, socDebut: Number(form.soc) });
      notify({ message: "Photos envoyées au Superviseur", kind: "ok" });
      reset(); await load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); reset(); } finally { setBusy(false); }
  };

  const terminer = async () => {
    setBusy(true);
    try {
      await api.post(`/api/fleet/recharge-demandes/${d.id}/terminer`, { tableauFinMediaId: form.tableau, socFin: Number(form.soc) });
      notify({ message: "Recharge terminée", kind: "ok" });
      reset(); await load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); reset(); } finally { setBusy(false); }
  };

  const annuler = async () => {
    if (!window.confirm("Annuler cette demande de recharge ?")) return;
    setBusy(true);
    try { await api.post(`/api/fleet/recharge-demandes/${d.id}/annuler`, {}); await load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  const vehicule = shift?.assignment?.vehicle;
  const socOk = form.soc !== "" && Number(form.soc) >= 0 && Number(form.soc) <= 100;

  // ---- Pas de demande en cours ----
  if (!d) {
    return (
      <div className="space-y-5 max-w-2xl">
        <Panel className="p-6">
          <div className="flex items-center gap-2 text-[#EDEDED]"><BatteryCharging size={18} className="text-[#22C55E]" /><h2 className="font-semibold">Besoin de recharger ?</h2></div>
          <p className="text-sm text-[#8A8A8A] mt-2">
            Envoyez une demande : le Superviseur vous indique la borne et paie la recharge. Vous n'avancez jamais d'argent.
          </p>
          {shift?.assignment?.vehicleId ? (
            <>
              <div className="text-sm text-[#8A8A8A] mt-4">Véhicule : <span className="text-[#EDEDED]">{vehicule?.immatriculation ?? shift.assignment.vehicleId}</span></div>
              <Btn onClick={demander} disabled={busy} size="lg" className="w-full mt-4">Demander une recharge</Btn>
            </>
          ) : (
            <div className="mt-4 text-sm text-[#8A8A8A]">Aucun véhicule ne vous est attribué aujourd'hui.</div>
          )}
        </Panel>
        {!!data?.historique?.length && (
          <Panel className="p-5">
            <h3 className="font-semibold text-[#EDEDED] mb-3">Mes dernières recharges</h3>
            <div className="space-y-2">
              {data.historique.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm border-t border-[#232327] pt-2 first:border-0 first:pt-0">
                  <span className="text-[#8A8A8A]">{new Date(h.createdAt).toLocaleDateString("fr-FR")}</span>
                  <span className="text-[#EDEDED]">{h.statut === "TERMINEE" ? `${h.socDebut ?? "—"} % → ${h.socFin ?? "—"} %` : "Annulée"}</span>
                  <span className="text-xs" style={{ color: h.anomalie ? RED : h.statut === "TERMINEE" ? GREEN : MUTED }}>{h.anomalie ? "Anomalie" : h.statut === "TERMINEE" ? "OK" : "—"}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    );
  }

  // ---- Demande en cours ----
  const st = STATUT[d.statut];
  return (
    <div className="space-y-4 max-w-2xl">
      <Panel className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-[#8A8A8A]">Demande de recharge · {d.vehicule?.immatriculation}</div>
            <div className="text-lg font-semibold mt-0.5" style={{ color: st.color }}>{st.label}</div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <BoutonAppel demandeId={d.id} nom="Superviseur Logistique" vehicule={d.vehicule?.immatriculation} libelle="Appeler" />
            {["DEMANDEE", "PRISE_EN_CHARGE", "SUR_PLACE"].includes(d.statut) && (
              <button onClick={annuler} disabled={busy} className="text-xs text-[#8A8A8A] hover:text-[#EF4444]">Annuler</button>
            )}
          </div>
        </div>
        <Etapes statut={d.statut} />
      </Panel>

      {/* Action attendue du chauffeur (au-dessus de la discussion : visible tout de suite sur téléphone) */}
      {(d.statut === "DEMANDEE" || d.statut === "PRISE_EN_CHARGE") && etape !== "sur-place" && (
        <div className="space-y-3">
          <Callout color={AMBER}>
            {d.statut === "DEMANDEE" ? "Le Superviseur a reçu votre demande. Il va vous indiquer la borne où aller." : "Rendez-vous à la borne indiquée. Une fois sur place, envoyez les photos."}
          </Callout>
          <Btn onClick={() => setEtape("sur-place")} className="w-full" size="lg">Je suis à la borne</Btn>
        </div>
      )}
      {d.statut === "SUR_PLACE" && etape !== "sur-place" && (
        <div className="space-y-2">
          <Callout color={AMBER}>Photos envoyées. Le Superviseur prépare le paiement : <b>ne branchez pas encore</b>.</Callout>
          <button onClick={() => setEtape("sur-place")} className="text-xs text-[#8A8A8A] hover:underline">Renvoyer les photos</button>
        </div>
      )}
      {etape === "sur-place" && (
        <Panel className="p-5 space-y-4" key={`sp-${cle}`}>
          <h3 className="font-semibold text-[#EDEDED]">À la borne</h3>
          <div className="grid grid-cols-2 gap-3">
            <CameraCapture label="QR code de la borne" mediaId={form.qr} onUploaded={(id) => setForm((f: any) => ({ ...f, qr: id }))} notify={notify} />
            <CameraCapture label="Tableau de bord" mediaId={form.tableau} onUploaded={(id) => setForm((f: any) => ({ ...f, tableau: id }))} notify={notify} />
          </div>
          <Field label="% de batterie affiché"><Input type="number" inputMode="numeric" min={0} max={100} value={form.soc} onChange={(e) => setForm((f: any) => ({ ...f, soc: e.target.value }))} placeholder="ex. 25" /></Field>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={reset} disabled={busy}>Retour</Btn>
            <Btn onClick={envoyerSurPlace} disabled={busy || !form.qr || !form.tableau || !socOk} className="flex-1">Envoyer au Superviseur</Btn>
          </div>
        </Panel>
      )}
      {d.statut === "PAYEE" && etape !== "terminer" && (
        <div className="space-y-3">
          <Callout color={GREEN}><b>Paiement effectué : branchez le véhicule.</b> Quand la recharge est finie, envoyez la photo du tableau de bord.</Callout>
          <Btn onClick={() => setEtape("terminer")} className="w-full" size="lg">Recharge terminée</Btn>
        </div>
      )}
      {etape === "terminer" && (
        <Panel className="p-5 space-y-4" key={`fin-${cle}`}>
          <h3 className="font-semibold text-[#EDEDED]">Fin de la recharge</h3>
          <CameraCapture label="Tableau de bord" mediaId={form.tableau} onUploaded={(id) => setForm((f: any) => ({ ...f, tableau: id }))} notify={notify} />
          <Field label="% de batterie affiché"><Input type="number" inputMode="numeric" min={0} max={100} value={form.soc} onChange={(e) => setForm((f: any) => ({ ...f, soc: e.target.value }))} placeholder="ex. 80" /></Field>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={reset} disabled={busy}>Retour</Btn>
            <Btn onClick={terminer} disabled={busy || !form.tableau || !socOk} className="flex-1">Envoyer</Btn>
          </div>
        </Panel>
      )}

      {/* Discussion avec le Superviseur */}
      <Panel className="p-4 max-h-[55vh] overflow-y-auto"><Fil demande={d} moi={ctx?.userId ?? ""} vueSuperviseur={false} /></Panel>
      {OUVERTS.includes(d.statut) && <Composer demandeId={d.id} onSent={() => load()} notify={notify} />}
    </div>
  );
};

// =====================================================================================
// Côté Superviseur Logistique
// =====================================================================================

export const SuperviseurBoite: React.FC<{ notify: Notify }> = ({ notify }) => {
  const { ctx } = useRbac();
  const [vue, setVue] = useState<"ouvertes" | "closes">("ouvertes");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [bornes, setBornes] = useState<any[]>([]);

  const loadList = useCallback(async () => {
    try { setList((await api.get<{ demandes: any[] }>(`/api/fleet/recharge-demandes?vue=${vue}`)).demandes); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  }, [vue, notify]);
  const loadDetail = useCallback(async (id: string) => {
    try { setDetail(await api.get<any>(`/api/fleet/recharge-demandes/${id}`)); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  }, [notify]);

  useEffect(() => { setLoading(true); loadList(); }, [loadList]);
  useEffect(() => { if (selId) loadDetail(selId); else setDetail(null); }, [selId, loadDetail]);
  useEffect(() => { api.get<{ bornes: any[] }>("/api/fleet/bornes").then((r) => setBornes(r.bornes)).catch(() => undefined); }, []);

  // Temps réel : liste + demande ouverte ; bip à chaque nouvelle demande.
  useRealtime<{ demandeId: string; type: string }>("recharge:update", (p) => {
    if (p.type === "nouvelle") notify({ message: "Nouvelle demande de recharge", kind: "ok" }); // son : annonce globale (FleetWorkspace)
    loadList();
    if (p.demandeId === selId) loadDetail(p.demandeId);
  });
  useEffect(() => {
    const t = setInterval(() => { loadList(); if (selId) loadDetail(selId); }, 20000);
    return () => clearInterval(t);
  }, [loadList, loadDetail, selId]);

  const maj = (d: any) => { setDetail(d); loadList(); };
  const tabCls = (a: boolean) => `px-3 py-2 text-sm border-b-2 ${a ? "border-[#22C55E] text-[#EDEDED]" : "border-transparent text-[#8A8A8A] hover:text-[#EDEDED]"}`;

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-4">
      {/* Liste des demandes */}
      <div className={`${selId ? "hidden lg:block" : ""}`}>
        <Panel className="overflow-hidden">
          <div className="flex gap-1 px-3 border-b border-[#232327]">
            <button className={tabCls(vue === "ouvertes")} onClick={() => { setVue("ouvertes"); setSelId(null); }}>En cours</button>
            <button className={tabCls(vue === "closes")} onClick={() => { setVue("closes"); setSelId(null); }}>Terminées</button>
          </div>
          {loading ? <Spinner /> : !list.length ? (
            <EmptyState>{vue === "ouvertes" ? "Aucune demande en cours." : "Aucune demande terminée."}</EmptyState>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {list.map((x) => {
                const st = STATUT[x.statut];
                const sel = x.id === selId;
                return (
                  <button key={x.id} onClick={() => setSelId(x.id)}
                    className={`w-full text-left px-4 py-3 border-t border-[#232327] first:border-t-0 border-l-2 transition-colors normal-case! font-sans! tracking-normal! ${sel ? "bg-[#1C1C20]" : "hover:bg-[#18181B]"}`}
                    style={{ borderLeftColor: x.actionRequise ? AMBER : x.anomalie ? RED : "transparent" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#EDEDED] truncate">{x.chauffeurNom ?? "—"}</span>
                      <span className="text-[11px] text-[#8A8A8A] shrink-0">{depuis(x.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-[#8A8A8A]">{x.vehicule ?? "—"}</span>
                      <span className="text-xs font-medium" style={{ color: x.anomalie ? RED : st.color }}>{x.anomalie ? "Anomalie" : st.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Demande sélectionnée */}
      <div className={`${selId ? "" : "hidden lg:block"}`}>
        {!detail ? (
          <Panel className="p-6"><EmptyState>Sélectionnez une demande pour ouvrir la discussion.</EmptyState></Panel>
        ) : (
          <DemandeSuperviseur d={detail} moi={ctx?.userId ?? ""} bornes={bornes} notify={notify} onMaj={maj} onRetour={() => setSelId(null)} />
        )}
      </div>
    </div>
  );
};

const DemandeSuperviseur: React.FC<{
  d: any; moi: string; bornes: any[]; notify: Notify; onMaj: (d: any) => void; onRetour: () => void;
}> = ({ d, moi, bornes, notify, onMaj, onRetour }) => {
  const [busy, setBusy] = useState(false);
  const [borneId, setBorneId] = useState("");
  const [montant, setMontant] = useState("");
  const [ref, setRef] = useState("");
  const [preuve, setPreuve] = useState<string | null>(null);
  const [cleCapture, setCleCapture] = useState(0);
  const [annulation, setAnnulation] = useState<string | null>(null);
  const st = STATUT[d.statut];

  // Montant pré-rempli avec la proposition, quand elle arrive.
  useEffect(() => { setMontant(d.montantSuggere != null ? String(d.montantSuggere) : ""); setRef(""); setPreuve(null); setCleCapture((k) => k + 1); setAnnulation(null); }, [d.id, d.montantSuggere]);
  const ecartPct = d.montantSuggere && Number(montant) > 0 ? Math.round(((Number(montant) - d.montantSuggere) / d.montantSuggere) * 100) : null;
  useEffect(() => { setBorneId(d.borneId ?? ""); }, [d.id, d.borneId]);

  const act = async (path: string, body: any, ok: string) => {
    setBusy(true);
    try { onMaj(await api.post<any>(`/api/fleet/recharge-demandes/${d.id}/${path}`, body)); notify({ message: ok, kind: "ok" }); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setBusy(false); }
  };
  const bornesTriees = useMemo(() => [...bornes].sort((a, b) => (a.type === b.type ? a.nom.localeCompare(b.nom) : a.type === "PARTENAIRE" ? -1 : 1)), [bornes]);
  const tel = d.chauffeur?.phone ? `tel:${String(d.chauffeur.phone).replace(/\s+/g, "")}` : null;

  return (
    <div className="space-y-4">
      <Panel className="p-5 space-y-3">
        <button onClick={onRetour} className="lg:hidden flex items-center gap-1 text-xs text-[#8A8A8A] mb-1"><ArrowLeft size={14} /> Demandes</button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-[#EDEDED] truncate">{d.chauffeur?.name ?? "—"}</div>
            <div className="text-sm text-[#8A8A8A]">{d.vehicule?.immatriculation} · {d.vehicule?.marque} {d.vehicule?.modele} · demandée à {heure(d.createdAt)}</div>
            <div className="text-sm font-medium mt-1" style={{ color: d.anomalie ? RED : st.color }}>{d.anomalie ? "Anomalie" : st.label}</div>
          </div>
          {OUVERTS.includes(d.statut) && (
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              <BoutonAppel demandeId={d.id} nom={d.chauffeur?.name ?? "Chauffeur"} vehicule={d.vehicule?.immatriculation} libelle="Appeler" />
              {tel && <a href={tel} className="text-[11px] text-[#8A8A8A] hover:text-[#EDEDED]">ou par téléphone</a>}
            </div>
          )}
        </div>
        <Etapes statut={d.statut} />
      </Panel>

      <Panel className="p-4 max-h-[50vh] overflow-y-auto"><Fil demande={d} moi={moi} vueSuperviseur /></Panel>

      {/* Action attendue du Superviseur */}
      {(d.statut === "DEMANDEE" || d.statut === "PRISE_EN_CHARGE") && (
        <Panel className="p-5 space-y-3">
          <h3 className="font-semibold text-[#EDEDED] flex items-center gap-2"><MapPin size={16} className="text-[#22C55E]" /> {d.statut === "DEMANDEE" ? "Indiquer la borne" : "Changer de borne"}</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={borneId} onChange={(e) => setBorneId(e.target.value)} className="flex-1">
              <option value="">— choisir une borne —</option>
              {bornesTriees.map((b) => <option key={b.id} value={b.id}>{b.nom}{b.operateur ? ` · ${b.operateur}` : ""}{b.prixKwh ? ` · ${b.prixKwh} F/kWh` : ""}</option>)}
            </Select>
            <Btn onClick={() => act("borne", { borneId }, "Borne envoyée au chauffeur")} disabled={busy || !borneId || borneId === d.borneId}>Envoyer</Btn>
          </div>
          <p className="text-xs text-[#8A8A8A]">Le chauffeur enverra ensuite le QR code de la borne et une photo du tableau de bord.</p>
        </Panel>
      )}
      {d.statut === "SUR_PLACE" && (
        <Panel className="p-5 space-y-4">
          <h3 className="font-semibold text-[#EDEDED] flex items-center gap-2"><Banknote size={16} className="text-[#22C55E]" /> Payer la recharge</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-[#EDEDED]"><QrCode size={15} className="text-[#8A8A8A]" /> Scannez le QR code ci-dessus avec votre téléphone, puis payez.</div>
            <div className="flex items-center gap-2 text-[#8A8A8A]"><Gauge size={15} /> Batterie à l'arrivée : <span className="text-[#EDEDED]">{d.socDebut} %</span>
              {d.kwhEstime != null && <> · ≈ {d.kwhEstime} kWh pour atteindre 80 %</>}</div>
            {d.montantSuggere != null
              ? <div className="text-[#8A8A8A]">Montant proposé : <span className="text-[#EDEDED] font-medium">{fcfa(d.montantSuggere)}</span></div>
              : <div className="text-xs text-[#8A8A8A]">Pas de montant proposé : renseignez le prix du kWh de cette borne (onglet Bornes).</div>}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Montant payé (FCFA)"><Input type="number" inputMode="numeric" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="ex. 4500" /></Field>
            <Field label="N° de transaction"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="ex. TX123456" /></Field>
          </div>
          <CapturePaiement key={cleCapture} mediaId={preuve} onUploaded={setPreuve} notify={notify} />
          {ecartPct != null && ecartPct > 20 && (
            <Callout color={AMBER}>Montant supérieur de {ecartPct} % au montant proposé : la Finance sera prévenue et contrôlera ce paiement.</Callout>
          )}
          <Btn onClick={() => act("paiement", { montant: Number(montant), refTransaction: ref, preuveMediaId: preuve }, "Paiement enregistré : le chauffeur est prévenu")}
            disabled={busy || !(Number(montant) > 0) || ref.trim().length < 4 || !preuve} className="w-full" size="lg">
            Paiement effectué
          </Btn>
          <p className="text-xs text-[#8A8A8A]">La Finance rapproche chaque paiement avec le relevé du compte Wave de l'entreprise.</p>
        </Panel>
      )}
      {d.statut === "PAYEE" && (
        <Callout color={GREEN}>Payé {fcfa(d.montantPaye)} (n° {d.refTransaction}). En attente de la photo du tableau de bord à la fin de la recharge.</Callout>
      )}
      {d.preuvePaiementMediaId && (
        <Panel className="p-4">
          <div className="text-xs uppercase tracking-wide text-[#8A8A8A] mb-2">Capture du paiement Wave</div>
          <AuthImage mediaId={d.preuvePaiementMediaId} className="w-full max-h-72 rounded-lg" zoomable />
        </Panel>
      )}
      {d.statut === "TERMINEE" && (
        <Callout color={d.anomalie ? RED : MUTED}>
          {d.anomalie && <div className="flex items-center gap-1.5 text-[#EF4444] font-medium mb-1"><AlertTriangle size={15} /> La batterie n'a pas monté : à vérifier.</div>}
          Recharge terminée · {fcfa(d.montantPaye)} · batterie {d.socDebut} % → {d.socFin} %.
        </Callout>
      )}

      {OUVERTS.includes(d.statut) && (
        <>
          <Composer demandeId={d.id} onSent={onMaj} notify={notify} />
          {annulation === null ? (
            <button onClick={() => setAnnulation("")} className="text-xs text-[#8A8A8A] hover:text-[#EF4444]">Annuler la demande</button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={annulation} onChange={(e) => setAnnulation(e.target.value)} placeholder="Motif de l'annulation" className="flex-1" />
              <Btn variant="secondary" onClick={() => setAnnulation(null)} disabled={busy}>Retour</Btn>
              <Btn variant="danger" onClick={() => act("annuler", { motif: annulation }, "Demande annulée")} disabled={busy || !annulation.trim()}>Confirmer l'annulation</Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/** Nombre de demandes qui attendent le Superviseur (badge de navigation). */
export function useDemandesATraiter(actif: boolean): number {
  const [n, setN] = useState(0);
  const load = useCallback(async () => {
    if (!actif) return;
    try { setN((await api.get<{ aTraiter: number }>("/api/fleet/recharge-demandes/compteur")).aTraiter); } catch { /* silencieux */ }
  }, [actif]);
  useEffect(() => { load(); if (!actif) return; const t = setInterval(load, 30000); return () => clearInterval(t); }, [load, actif]);
  useRealtime("recharge:update", () => load(), actif);
  return n;
}

// =====================================================================================
// Finance : contrôle des recharges payées (le payeur n'est pas le contrôleur)
// =====================================================================================

export const ControleRecharges: React.FC<{ notify: Notify }> = ({ notify }) => {
  const [vue, setVue] = useState<"a_controler" | "controlees">("a_controler");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    try { setList((await api.get<{ demandes: any[] }>(`/api/fleet/recharge-demandes/controle?vue=${vue}`)).demandes); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  }, [vue, notify]);
  useEffect(() => { setLoading(true); loadList(); }, [loadList]);
  useEffect(() => {
    setNote("");
    if (!selId) { setDetail(null); return; }
    api.get<any>(`/api/fleet/recharge-demandes/${selId}`).then(setDetail).catch((e) => notify({ message: errMsg(e), kind: "err" }));
  }, [selId, notify]);
  useRealtime("recharge:controle", () => loadList());

  const controler = async () => {
    setBusy(true);
    try {
      setDetail(await api.post<any>(`/api/fleet/recharge-demandes/${selId}/controle`, { note }));
      notify({ message: "Recharge marquée comme contrôlée", kind: "ok" });
      setNote(""); loadList();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setBusy(false); }
  };

  const motif = (x: any) => [x.ecartMontant ? `Payé ${fcfa(x.montantPaye)} pour ${fcfa(x.montantSuggere)} proposés (+${x.ecartPct} %)` : null, x.anomalie ? `Batterie ${x.socDebut ?? "—"} % → ${x.socFin ?? "—"} %` : null].filter(Boolean).join(" · ");
  const tabCls = (a: boolean) => `px-3 py-2 text-sm border-b-2 ${a ? "border-[#22C55E] text-[#EDEDED]" : "border-transparent text-[#8A8A8A] hover:text-[#EDEDED]"}`;

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-4">
      <div className={selId ? "hidden lg:block" : ""}>
        <Panel className="overflow-hidden">
          <div className="flex gap-1 px-3 border-b border-[#232327]">
            <button className={tabCls(vue === "a_controler")} onClick={() => { setVue("a_controler"); setSelId(null); }}>À contrôler</button>
            <button className={tabCls(vue === "controlees")} onClick={() => { setVue("controlees"); setSelId(null); }}>Contrôlées</button>
          </div>
          {loading ? <Spinner /> : !list.length ? (
            <EmptyState>{vue === "a_controler" ? "Aucune recharge à contrôler." : "Aucune recharge contrôlée."}</EmptyState>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {list.map((x) => (
                <button key={x.id} onClick={() => setSelId(x.id)}
                  className={`w-full text-left px-4 py-3 border-t border-[#232327] first:border-t-0 border-l-2 normal-case! font-sans! tracking-normal! ${x.id === selId ? "bg-[#1C1C20]" : "hover:bg-[#18181B]"}`}
                  style={{ borderLeftColor: vue === "a_controler" ? (x.anomalie ? RED : AMBER) : "transparent" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#EDEDED]">{x.vehicule ?? "—"} · {x.chauffeurNom ?? "—"}</span>
                    <span className="text-[11px] text-[#8A8A8A] shrink-0">{new Date(x.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: x.anomalie ? RED : AMBER }}>{motif(x)}</div>
                  <div className="text-[11px] text-[#8A8A8A] mt-0.5">Payé par {x.payeParNom ?? "—"}{x.refTransaction ? ` · n° ${x.refTransaction}` : ""}</div>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className={selId ? "" : "hidden lg:block"}>
        {!detail ? <Panel className="p-6"><EmptyState>Sélectionnez une recharge pour voir le détail.</EmptyState></Panel> : (
          <div className="space-y-4">
            <Panel className="p-5 space-y-2">
              <button onClick={() => setSelId(null)} className="lg:hidden flex items-center gap-1 text-xs text-[#8A8A8A] mb-1"><ArrowLeft size={14} /> Liste</button>
              <div className="text-lg font-semibold text-[#EDEDED]">{detail.vehicule?.immatriculation} · {detail.chauffeur?.name}</div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm pt-1">
                <div><div className="text-xs text-[#8A8A8A]">Montant proposé</div><div className="text-[#EDEDED]">{detail.montantSuggere != null ? fcfa(detail.montantSuggere) : "—"}</div></div>
                <div><div className="text-xs text-[#8A8A8A]">Montant payé</div><div style={{ color: detail.ecartMontant ? AMBER : "#EDEDED" }}>{fcfa(detail.montantPaye)}</div></div>
                <div><div className="text-xs text-[#8A8A8A]">Batterie</div><div style={{ color: detail.anomalie ? RED : "#EDEDED" }}>{detail.socDebut ?? "—"} % → {detail.socFin ?? "—"} %</div></div>
              </div>
              <div className="text-xs text-[#8A8A8A]">N° de transaction : <span className="text-[#EDEDED]">{detail.refTransaction ?? "—"}</span></div>
            </Panel>
            {detail.preuvePaiementMediaId && (
              <Panel className="p-4">
                <div className="text-xs uppercase tracking-wide text-[#8A8A8A] mb-2">Capture du paiement Wave</div>
                <AuthImage mediaId={detail.preuvePaiementMediaId} className="w-full max-h-72 rounded-lg" zoomable />
              </Panel>
            )}
            <Panel className="p-4 max-h-[50vh] overflow-y-auto"><Fil demande={detail} moi="" vueSuperviseur /></Panel>
            {detail.controleLe ? (
              <Callout color={GREEN}>
                <div className="flex items-center gap-1.5 font-medium text-[#22C55E] mb-1"><ShieldCheck size={15} /> Contrôlée le {new Date(detail.controleLe).toLocaleDateString("fr-FR")}</div>
                {detail.controleNote}
              </Callout>
            ) : (
              <Panel className="p-5 space-y-3">
                <Field label="Conclusion du contrôle"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. Conforme au relevé Wave / écart justifié / à sanctionner" /></Field>
                <Btn onClick={controler} disabled={busy || !note.trim()} className="w-full">Marquer comme contrôlée</Btn>
              </Panel>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/** Nombre de recharges à contrôler (Finance). */
export function useRechargesAControler(actif: boolean): number {
  const [n, setN] = useState(0);
  const load = useCallback(async () => {
    if (!actif) return;
    try { setN((await api.get<{ aControler: number }>("/api/fleet/recharge-demandes/controle/compteur")).aControler); } catch { /* silencieux */ }
  }, [actif]);
  useEffect(() => { load(); if (!actif) return; const t = setInterval(load, 30000); return () => clearInterval(t); }, [load, actif]);
  useRealtime("recharge:controle", () => load(), actif);
  return n;
}
