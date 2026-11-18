/**
 * Appel audio intégré (WebRTC) entre chauffeur et Superviseur, depuis une demande de recharge.
 * - CallProvider : monté une fois dans l'espace fleet → un appel entrant sonne sur n'importe quel écran.
 * - useAppel().appeler(demandeId, nom) : lance l'appel.
 * - La signalisation passe par Socket.IO (serveur : server/partA/appel.ts) ; l'audio circule en
 *   direct entre les deux téléphones, ou via le serveur relais TURN si le réseau l'exige.
 * - PushBanner : invite à activer les notifications pour sonner même application fermée.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Bell, X } from "lucide-react";
import { api } from "../../api/fleet";
import { useRealtime, emitRealtime, sendRealtime, annoncer } from "../../api/realtime";
import { pushSupporte, iosSansInstallation, activerNotifications, resynchroniserNotifications } from "../../api/push";

type Phase = "idle" | "sortant" | "entrant" | "connexion" | "en_cours";
interface EtatAppel { phase: Phase; callId: string | null; demandeId: string | null; nom: string; vehicule: string | null; debut: number | null }
const REPOS: EtatAppel = { phase: "idle", callId: null, demandeId: null, nom: "", vehicule: null, debut: null };

interface Ctx { phase: Phase; demandeId: string | null; appeler: (demandeId: string, nom: string, vehicule?: string | null) => void }
const AppelContext = createContext<Ctx>({ phase: "idle", demandeId: null, appeler: () => undefined });
export const useAppel = () => useContext(AppelContext);

const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/** Sonnerie / tonalité générée (aucun fichier) : entrant = deux notes, sortant = bip long. */
function useTonalite() {
  const ctxRef = useRef<AudioContext | null>(null);
  const timer = useRef<number | null>(null);
  const stop = useCallback(() => { if (timer.current) { clearInterval(timer.current); timer.current = null; } }, []);
  const jouer = useCallback((mode: "entrant" | "sortant") => {
    stop();
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctxRef.current ??= new AC();
      const ctx = ctxRef.current;
      void ctx.resume();
      const note = (f: number, t: number, d: number) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.type = "sine";
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(mode === "entrant" ? 0.25 : 0.08, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + d);
        o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + d + 0.05);
      };
      const cycle = () => {
        if (mode === "entrant") { note(880, 0, 0.35); note(660, 0.4, 0.35); if (navigator.vibrate) navigator.vibrate([400, 200, 400]); }
        else note(440, 0, 1.0);
      };
      cycle();
      timer.current = window.setInterval(cycle, mode === "entrant" ? 1800 : 3000);
    } catch { /* son indisponible */ }
  }, [stop]);
  useEffect(() => () => stop(), [stop]);
  return { jouer, stop };
}

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [etat, setEtat] = useState<EtatAppel>(REPOS);
  const [muet, setMuet] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const etatRef = useRef(etat); etatRef.current = etat;
  const pc = useRef<RTCPeerConnection | null>(null);
  const micro = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const enAttente = useRef<RTCIceCandidateInit[]>([]);
  const ice = useRef<RTCIceServer[] | null>(null);
  const { jouer, stop } = useTonalite();

  const afficher = (t: string) => { setInfo(t); window.setTimeout(() => setInfo(null), 4000); };

  // Chronomètre de l'appel.
  useEffect(() => {
    if (etat.phase !== "en_cours") return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [etat.phase]);

  const nettoyer = useCallback(() => {
    stop();
    pc.current?.close(); pc.current = null;
    micro.current?.getTracks().forEach((t) => t.stop()); micro.current = null;
    enAttente.current = [];
    if (audio.current) audio.current.srcObject = null;
    setMuet(false);
    setEtat(REPOS);
  }, [stop]);

  const prendreMicro = async (): Promise<boolean> => {
    try {
      micro.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      return true;
    } catch {
      afficher("Micro inaccessible : autorisez le micro pour EASY dans votre navigateur.");
      return false;
    }
  };
  const serveursIce = async () => {
    if (!ice.current) {
      try { ice.current = (await api.get<{ iceServers: RTCIceServer[] }>("/api/fleet/appels/config")).iceServers; }
      catch { ice.current = [{ urls: "stun:stun.l.google.com:19302" }]; }
    }
    return ice.current;
  };

  const creerConnexion = async (callId: string) => {
    const c = new RTCPeerConnection({ iceServers: await serveursIce() });
    pc.current = c;
    micro.current?.getTracks().forEach((t) => c.addTrack(t, micro.current!));
    c.onicecandidate = (e) => { if (e.candidate) sendRealtime("call:signal", { callId, data: { candidate: e.candidate.toJSON() } }); };
    c.ontrack = (e) => { if (audio.current) { audio.current.srcObject = e.streams[0]; void audio.current.play().catch(() => undefined); } };
    c.onconnectionstatechange = () => {
      if (c.connectionState === "connected") setEtat((s) => (s.phase === "connexion" ? { ...s, phase: "en_cours", debut: Date.now() } : s));
      if (c.connectionState === "failed") {
        afficher("Connexion audio impossible (réseau). Réessayez ou utilisez le téléphone.");
        sendRealtime("call:hangup", { callId });
        nettoyer();
      }
    };
    return c;
  };
  const viderCandidats = async () => {
    const c = pc.current; if (!c) return;
    for (const cand of enAttente.current) await c.addIceCandidate(cand).catch(() => undefined);
    enAttente.current = [];
  };

  // ---------------- Actions ----------------
  const appeler = useCallback(async (demandeId: string, nom: string, vehicule: string | null = null) => {
    if (etatRef.current.phase !== "idle") return;
    if (!(await prendreMicro())) return;
    setEtat({ phase: "sortant", callId: null, demandeId, nom, vehicule, debut: null });
    const r = await emitRealtime<{ ok: boolean; callId?: string; error?: string }>("call:invite", { demandeId });
    if (!r?.ok) { afficher(r?.error || "Appel impossible"); nettoyer(); return; }
    setEtat((s) => ({ ...s, callId: r.callId! }));
    jouer("sortant");
  }, [jouer, nettoyer]);

  const repondre = async () => {
    const s = etatRef.current;
    if (s.phase !== "entrant" || !s.callId) return;
    stop();
    if (!(await prendreMicro())) { sendRealtime("call:reject", { callId: s.callId }); nettoyer(); return; }
    const r = await emitRealtime<{ ok: boolean; error?: string }>("call:accept", { callId: s.callId });
    if (!r?.ok) { afficher(r?.error || "Cet appel n'est plus disponible"); nettoyer(); return; }
    setEtat((e) => ({ ...e, phase: "connexion" }));
    await creerConnexion(s.callId); // attend l'offre de l'appelant
  };
  const refuser = () => { const s = etatRef.current; if (s.callId) sendRealtime("call:reject", { callId: s.callId }); nettoyer(); };
  const raccrocher = () => {
    const s = etatRef.current;
    if (s.callId) sendRealtime(s.phase === "sortant" ? "call:cancel" : "call:hangup", { callId: s.callId });
    nettoyer();
  };
  const basculerMuet = () => {
    const piste = micro.current?.getAudioTracks()[0];
    if (!piste) return;
    piste.enabled = muet; // muet → on réactive
    setMuet(!muet);
  };

  // ---------------- Événements serveur ----------------
  useRealtime<any>("call:incoming", (p) => {
    if (etatRef.current.phase !== "idle") { if (etatRef.current.callId !== p.callId) sendRealtime("call:reject", { callId: p.callId }); return; }
    setEtat({ phase: "entrant", callId: p.callId, demandeId: p.demandeId, nom: p.appelantNom, vehicule: p.vehicule, debut: null });
    jouer("entrant");
  });
  useRealtime<any>("call:accepted", async (p) => {
    const s = etatRef.current;
    if (p.callId !== s.callId || s.phase !== "sortant") return;
    stop();
    setEtat((e) => ({ ...e, phase: "connexion" }));
    const c = await creerConnexion(p.callId);
    const offre = await c.createOffer();
    await c.setLocalDescription(offre);
    sendRealtime("call:signal", { callId: p.callId, data: { type: "offer", sdp: offre.sdp } });
  });
  useRealtime<any>("call:signal", async (p) => {
    const c = pc.current;
    if (!c || p.callId !== etatRef.current.callId) return;
    const d = p.data || {};
    if (d.type === "offer") {
      await c.setRemoteDescription({ type: "offer", sdp: d.sdp });
      await viderCandidats();
      const rep = await c.createAnswer();
      await c.setLocalDescription(rep);
      sendRealtime("call:signal", { callId: p.callId, data: { type: "answer", sdp: rep.sdp } });
    } else if (d.type === "answer") {
      await c.setRemoteDescription({ type: "answer", sdp: d.sdp });
      await viderCandidats();
    } else if (d.candidate) {
      if (c.remoteDescription) await c.addIceCandidate(d.candidate).catch(() => undefined);
      else enAttente.current.push(d.candidate);
    }
  });
  useRealtime<any>("call:taken", (p) => {
    if (p.callId === etatRef.current.callId && etatRef.current.phase === "entrant") { afficher("Appel pris par un collègue"); nettoyer(); }
  });
  useRealtime<any>("call:ended", (p) => {
    if (p.callId !== etatRef.current.callId) return;
    const phase = etatRef.current.phase;
    if (p.etat === "MANQUE") {
      afficher(phase === "sortant" ? "Pas de réponse" : "Appel manqué");
      if (phase === "entrant") { stop(); annoncer("appel-manque"); }
    }
    else if (p.etat === "REFUSE" && phase === "sortant") afficher("Appel refusé");
    else if (phase === "en_cours" || phase === "connexion") afficher("Appel terminé");
    nettoyer();
  });

  // ---------------- Interface ----------------
  const s = etat;
  const statut = s.phase === "entrant" ? "Appel entrant"
    : s.phase === "sortant" ? "Appel en cours… ça sonne"
    : s.phase === "connexion" ? "Connexion…"
    : s.phase === "en_cours" && s.debut ? mmss(Date.now() - s.debut) : "";

  return (
    <AppelContext.Provider value={{ phase: s.phase, demandeId: s.demandeId, appeler }}>
      {children}
      <audio ref={audio} autoPlay playsInline />
      {s.phase !== "idle" && (
        <div className="fixed z-[90] inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-80 bg-[#141416] border border-[#232327] rounded-2xl shadow-2xl shadow-black/60 p-5"
          style={{ borderLeft: `2px solid ${s.phase === "entrant" ? "#F59E0B" : "#22C55E"}` }} role="dialog" aria-label="Appel">
          <div className="text-xs font-medium" style={{ color: s.phase === "entrant" ? "#F59E0B" : "#22C55E" }}>{s.phase === "entrant" ? "Appel entrant" : "Appel EASY"}</div>
          <div className="text-lg font-semibold text-[#EDEDED] mt-0.5 truncate">{s.nom || "—"}</div>
          <div className="text-sm text-[#8A8A8A]">{s.vehicule ? `Recharge · ${s.vehicule} · ` : ""}{s.phase === "entrant" ? "vous appelle" : statut}</div>
          <div className="mt-4 flex items-center justify-center gap-6">
            {s.phase === "entrant" ? (
              <>
                <button onClick={refuser} aria-label="Refuser" className="h-14 w-14 rounded-full bg-[#EF4444] text-white flex items-center justify-center active:scale-95"><PhoneOff size={22} /></button>
                <button onClick={repondre} aria-label="Répondre" className="h-14 w-14 rounded-full bg-[#22C55E] text-black flex items-center justify-center active:scale-95"><Phone size={22} /></button>
              </>
            ) : (
              <>
                {(s.phase === "en_cours" || s.phase === "connexion") && (
                  <button onClick={basculerMuet} aria-label={muet ? "Réactiver le micro" : "Couper le micro"}
                    className={`h-12 w-12 rounded-full border flex items-center justify-center ${muet ? "border-[#F59E0B] text-[#F59E0B]" : "border-[#33363F] text-[#EDEDED]"}`}>
                    {muet ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                )}
                <button onClick={raccrocher} aria-label="Raccrocher" className="h-14 w-14 rounded-full bg-[#EF4444] text-white flex items-center justify-center active:scale-95"><PhoneOff size={22} /></button>
              </>
            )}
          </div>
        </div>
      )}
      {info && (
        <div className="fixed z-[91] left-1/2 -translate-x-1/2 bottom-24 sm:bottom-8 bg-[#1C1C20] border border-[#2A2A30] text-[#EDEDED] text-sm rounded-xl px-4 py-2.5 shadow-xl">{info}</div>
      )}
    </AppelContext.Provider>
  );
};

/** Bandeau : activer les notifications (appels et demandes même quand EASY est fermé). */
export const PushBanner: React.FC<{ actif: boolean }> = ({ actif }) => {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!actif) return;
    let masque = false;
    try { masque = sessionStorage.getItem("easy_push_plus_tard") === "1"; } catch { /* stockage indisponible */ }
    if (masque) return;
    if (iosSansInstallation()) { setIos(true); setVisible(true); return; }
    if (!pushSupporte()) return;
    if (Notification.permission === "granted") { void resynchroniserNotifications(); return; }
    if (Notification.permission === "denied") return;
    api.get<{ cle: string | null }>("/api/fleet/push/cle").then((r) => { if (r.cle) setVisible(true); }).catch(() => undefined);
  }, [actif]);

  const plusTard = () => { try { sessionStorage.setItem("easy_push_plus_tard", "1"); } catch { /* ignoré */ } setVisible(false); };
  const activer = async () => {
    setBusy(true);
    try {
      const r = await activerNotifications();
      if (r === "ok") { setVisible(false); return; }
      setMsg(r === "refuse" ? "Notifications refusées : vous pouvez les autoriser dans les réglages du navigateur." : "Notifications indisponibles sur cet appareil.");
    } catch { setMsg("Activation impossible pour le moment."); } finally { setBusy(false); }
  };

  if (!visible) return null;
  return (
    <div className="mb-5 border border-[#232327] border-l-2 border-l-[#22C55E] bg-[#141416] rounded-r-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <Bell size={18} className="text-[#22C55E] shrink-0" />
      <div className="text-sm text-[#EDEDED] flex-1">
        {ios
          ? <>Pour recevoir les appels quand EASY est fermé sur iPhone : touchez <b>Partager</b> puis <b>« Sur l'écran d'accueil »</b>, et ouvrez EASY depuis l'icône.</>
          : <>Activez les notifications pour que votre téléphone <b>sonne lors d'un appel</b> et vous prévienne des demandes, même quand EASY est fermé.</>}
        {msg && <div className="text-xs text-[#F59E0B] mt-1">{msg}</div>}
      </div>
      <div className="flex gap-2 shrink-0">
        {!ios && <button onClick={activer} disabled={busy} className="rounded-xl bg-[#22C55E] text-black text-sm font-semibold px-4 py-2">Activer</button>}
        <button onClick={plusTard} aria-label="Plus tard" className="rounded-xl text-[#8A8A8A] hover:text-[#EDEDED] px-2"><X size={18} /></button>
      </div>
    </div>
  );
};
