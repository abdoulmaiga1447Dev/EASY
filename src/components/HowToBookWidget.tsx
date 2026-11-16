/**
 * Tutoriel animé « Comment réserver ? » — motion design codé (pas une vidéo).
 *
 * Un bouton flottant (coin bas-gauche) ouvre un lecteur. La scène est un canevas
 * fixe de 720×720 px mis à l'échelle ; chaque scène est calculée à partir du temps
 * courant (rejouable, déplaçable sur la barre de progression).
 *
 * Son : bruitages + nappe musicale générés en direct (Web Audio), sans fichier.
 * Voix off : placer un mp3 (ex. ElevenLabs, voix féminine FR) dans public/audio/
 * et renseigner VOICE_SRC — il sera synchronisé automatiquement avec l'animation.
 * Le texte à faire lire est dans SUBTITLES (il sert aussi de sous-titres).
 *
 * Données fictives uniquement (aucun vrai client, numéro masqué). Les seuls
 * numéros réels affichés sont les deux numéros officiels du site.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, X, Lock, ChevronLeft, ChevronRight,
  Check, ChevronDown, CalendarDays, Clock, MapPin, Phone, User, Mail, KeyRound,
  Globe, UserCheck, MessageCircle, PhoneCall, ArrowRight,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import hero from "../assets/saver/hero.png";

/* ------------------------------------------------------------------ */
/*  Réglages                                                            */
/* ------------------------------------------------------------------ */

/** Chemin du mp3 de voix off (ex. "/audio/tutoriel-fr.mp3"), null tant qu'il n'existe pas. */
const VOICE_SRC: { fr: string | null; en: string | null } = { fr: null, en: null };

const GREEN = "#00C853";
const INK = "#0B1F14";
const ORANGE = "#FF7A1A";
const YELLOW = "#F5A200";
const MUTED = "#5B6B62";
const LINE = "#DCE5DF";
const LIGHT = "#F4F8F5";
const LOGO = "/images/easy-logo-green.png";
const STAGE = 720;

type Tr = (k: { fr: string; en: string }) => string;
type SfxKind = "click" | "pop" | "whoosh" | "chime" | "tick";
type KF = { t: number; x: number; y: number; click?: boolean };
interface SceneProps { t: number; tr: Tr }
interface SceneDef {
  id: string;
  dur: number;
  chapter: { fr: string; en: string };
  cursor?: KF[];
  typing?: [number, number][];
  sfx?: [number, SfxKind][];
  Comp: React.FC<SceneProps>;
}

/* ------------------------------------------------------------------ */
/*  Outils d'animation (tout est fonction du temps local t, en s)       */
/* ------------------------------------------------------------------ */

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eout = (x: number) => 1 - Math.pow(1 - x, 3);
const back = (x: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const typed = (s: string, t: number, a: number, b: number) => s.slice(0, Math.round(seg(t, a, b) * s.length));
const fmt = (n: number) => String(Math.round(n / 50) * 50).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const count = (from: number, to: number, t: number, a: number, b: number) => from + (to - from) * eout(seg(t, a, b));
const between = (t: number, a: number, b: number) => t >= a && t < b;

/** Apparition glissée vers le haut. */
const show = (t: number, a: number, d = 0.4, dy = 12): React.CSSProperties => {
  const k = eout(seg(t, a, a + d));
  return { opacity: k, transform: `translateY(${(1 - k) * dy}px)` };
};
/** Apparition « ressort » (léger dépassement). */
const pop = (t: number, a: number, d = 0.45): React.CSSProperties => {
  const x = seg(t, a, a + d);
  return { opacity: clamp(x * 3), transform: `scale(${0.6 + 0.4 * back(x)})` };
};
/** Disparition. */
const hide = (t: number, a: number, d = 0.3) => 1 - seg(t, a, a + d);
const blink = (t: number) => (Math.floor(t * 2.4) % 2 === 0 ? 1 : 0);
const pressed = (t: number, at: number) => between(t, at - 0.04, at + 0.16);

function cursorPos(kf: KF[], t: number) {
  if (t <= kf[0].t) return kf[0];
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (t < b.t) {
      const mv = Math.min(0.75, b.t - a.t);
      const k = eio(seg(t, b.t - mv, b.t));
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
  }
  return kf[kf.length - 1];
}

/* ------------------------------------------------------------------ */
/*  Son : bruitages + nappe musicale (Web Audio, aucun fichier)         */
/* ------------------------------------------------------------------ */

const CHORDS = [
  [130.81, 164.81, 196.0, 246.94], // Cmaj7
  [110.0, 130.81, 164.81, 196.0], // Am7
  [87.31, 130.81, 174.61, 220.0], // Fmaj7
  [98.0, 146.83, 196.0, 246.94], // G
];

class SoundKit {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private fx: GainNode | null = null;
  private music: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private nextChord = 0;
  private chordIdx = 0;
  private musicOn = false;
  private muted = false;

  init() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(ctx.destination);
      this.fx = ctx.createGain();
      this.fx.gain.value = 0.55;
      this.fx.connect(this.master);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1500;
      this.music = ctx.createGain();
      this.music.gain.value = 0.05;
      this.music.connect(lp);
      lp.connect(this.master);
      const len = ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    this.resume();
  }
  resume() { if (this.ctx?.state === "suspended") void this.ctx.resume(); }
  suspend() { if (this.ctx?.state === "running") void this.ctx.suspend(); }
  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.04);
  }
  /** Baisse la musique quand une voix off est présente. */
  setMusicLevel(v: number) {
    if (this.ctx && this.music) this.music.gain.setTargetAtTime(v, this.ctx.currentTime, 0.2);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, glideTo?: number) {
    const ctx = this.ctx;
    if (!ctx || !this.fx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.fx);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  play(kind: SfxKind) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.fx) return;
    switch (kind) {
      case "click":
        this.tone(1500, 0.035, "square", 0.04);
        this.tone(620, 0.07, "sine", 0.18);
        break;
      case "tick":
        this.tone(2600 + Math.random() * 900, 0.018, "square", 0.016);
        break;
      case "pop":
        this.tone(440, 0.16, "sine", 0.2, 0, 880);
        break;
      case "chime":
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.75, "sine", 0.11, i * 0.08));
        break;
      case "whoosh": {
        if (!this.noise) return;
        const t0 = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 0.9;
        bp.frequency.setValueAtTime(300, t0);
        bp.frequency.exponentialRampToValueAtTime(2600, t0 + 0.4);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.16);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        src.connect(bp);
        bp.connect(g);
        g.connect(this.fx);
        src.start(t0);
        src.stop(t0 + 0.55);
        break;
      }
    }
  }

  startMusic() {
    if (!this.ctx) return;
    this.musicOn = true;
    if (this.nextChord < this.ctx.currentTime) this.nextChord = this.ctx.currentTime + 0.05;
  }
  stopMusic() { this.musicOn = false; }

  /** À appeler à chaque image : programme les accords à venir. */
  pump() {
    const ctx = this.ctx;
    if (!ctx || !this.music || !this.musicOn || ctx.state !== "running") return;
    while (this.nextChord < ctx.currentTime + 0.4) {
      this.chord(this.nextChord, CHORDS[this.chordIdx]);
      this.nextChord += 4;
      this.chordIdx = (this.chordIdx + 1) % CHORDS.length;
    }
  }

  private chord(at: number, notes: number[]) {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    notes.forEach((f) => {
      [0, -7].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = f;
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(0.22, at + 1.2);
        g.gain.setValueAtTime(0.22, at + 3.2);
        g.gain.linearRampToValueAtTime(0.0001, at + 4.5);
        o.connect(g);
        g.connect(this.music!);
        o.start(at);
        o.stop(at + 4.6);
      });
    });
    // petite note cristalline en début d'accord
    const delay = Math.max(0, at - ctx.currentTime);
    this.tone(notes[3] * 4, 0.9, "sine", 0.025, delay);
  }
}

/* ------------------------------------------------------------------ */
/*  Primitives visuelles (reprennent le style du site)                  */
/* ------------------------------------------------------------------ */

const Browser: React.FC<{ url: string; children: React.ReactNode }> = ({ url, children }) => (
  <div className="absolute inset-0" style={{ background: "#E9F0EB" }}>
    <div
      className="absolute rounded-[22px] bg-white overflow-hidden"
      style={{ left: 28, top: 28, width: 664, height: 664, boxShadow: "0 30px 60px -24px rgba(11,31,20,.35), 0 0 0 1px rgba(11,31,20,.07)" }}
    >
      <div className="h-10 flex items-center gap-2 px-4 border-b" style={{ background: "#F1F5F2", borderColor: LINE }}>
        <ChevronLeft size={15} color="#9AA8A0" />
        <ChevronRight size={15} color="#C4CEC7" />
        <div className="ml-2 flex-1 h-6 rounded-md bg-white flex items-center gap-1.5 px-3 text-[11px]" style={{ color: MUTED }}>
          <Lock size={10} /> {url}
        </div>
      </div>
      <div className="relative overflow-hidden" style={{ width: 664, height: 624, background: LIGHT }}>{children}</div>
    </div>
  </div>
);

const MiniNav: React.FC<{ tr: Tr; active?: string; user?: number; t?: number }> = ({ tr, active, user, t = 0 }) => {
  const links = [
    { k: "home", l: tr({ fr: "Accueil", en: "Home" }) },
    { k: "veh", l: tr({ fr: "Véhicules", en: "Vehicles" }) },
    { k: "tarifs", l: tr({ fr: "Tarifs", en: "Rates" }) },
    { k: "resa", l: tr({ fr: "Réserver", en: "Book" }) },
  ];
  const logged = user !== undefined && t >= user;
  return (
    <div className="absolute top-0 inset-x-0 h-11 bg-white border-b flex items-center px-5 gap-5 z-20" style={{ borderColor: LINE }}>
      <img src={LOGO} alt="" className="h-[18px] w-auto" />
      <div className="flex items-center gap-4 text-[11px] font-semibold ml-3">
        {links.map((x) => (
          <span key={x.k} style={{ color: active === x.k ? GREEN : MUTED }}>{x.l}</span>
        ))}
      </div>
      <div className="ml-auto">
        {logged ? (
          <div style={user !== undefined && user > 0 ? pop(t, user) : undefined} className="flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: INK }}>Awa K.</span>
            <span className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: INK }}>AK</span>
          </div>
        ) : (
          <span className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: INK }}>
            {tr({ fr: "Connexion", en: "Sign in" })}
          </span>
        )}
      </div>
    </div>
  );
};

const Field: React.FC<{
  x: number; y: number; w: number; t: number; label: string; value: string; placeholder?: string;
  active?: boolean; icon?: React.ReactNode; flash?: number;
}> = ({ x, y, w, t, label, value, placeholder, active, icon, flash }) => {
  const fl = flash !== undefined ? 1 - seg(t, flash, flash + 0.6) : 0;
  const lit = flash !== undefined && t >= flash && fl > 0;
  return (
    <div className="absolute" style={{ left: x, top: y, width: w }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 h-[14px]" style={{ color: MUTED }}>{label}</div>
      <div
        className="h-10 rounded-xl border px-3 flex items-center text-[14px]"
        style={{
          color: INK,
          background: lit ? `rgba(0,200,83,${0.12 * fl})` : "#fff",
          borderColor: active || lit ? GREEN : LINE,
          boxShadow: active ? "0 0 0 4px rgba(0,200,83,.15)" : "none",
        }}
      >
        {icon && <span className="mr-2 flex" style={{ color: active ? GREEN : "#9AA8A0" }}>{icon}</span>}
        {value ? <span className="truncate">{value}</span> : <span className="truncate" style={{ color: "#9AA8A0" }}>{placeholder}</span>}
        {active && <span className="inline-block w-[1.5px] h-4 ml-0.5" style={{ background: INK, opacity: blink(t) }} />}
      </div>
    </div>
  );
};

const Spinner: React.FC<{ t: number; size?: number; color?: string; track?: string }> = ({ t, size = 18, color = "#06140D", track = "rgba(6,20,13,.2)" }) => (
  <span
    className="inline-block rounded-full"
    style={{ width: size, height: size, border: `2.5px solid ${track}`, borderTopColor: color, transform: `rotate(${t * 720}deg)` }}
  />
);

const Cursor: React.FC<{ kf: KF[]; t: number; fadeAt?: number }> = ({ kf, t, fadeAt }) => {
  const p = cursorPos(kf, t);
  const ripple = kf.filter((k) => k.click && t >= k.t && t < k.t + 0.55).pop();
  const press = kf.some((k) => k.click && pressed(t, k.t));
  const op = seg(t, 0, 0.3) * (fadeAt !== undefined ? hide(t, fadeAt) : 1);
  return (
    <>
      {ripple && (
        <div
          className="absolute rounded-full pointer-events-none z-40"
          style={{
            left: ripple.x - 20, top: ripple.y - 20, width: 40, height: 40,
            border: `2px solid ${GREEN}`,
            opacity: (1 - seg(t, ripple.t, ripple.t + 0.55)) * op,
            transform: `scale(${0.3 + seg(t, ripple.t, ripple.t + 0.55) * 1.3})`,
          }}
        />
      )}
      <svg
        className="absolute pointer-events-none z-50"
        width="22" height="26" viewBox="0 0 22 26"
        style={{
          left: p.x - 3, top: p.y - 2, opacity: op,
          transform: `scale(${press ? 0.84 : 1})`, transformOrigin: "3px 2px",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,.3))",
        }}
      >
        <path d="M3 2 L3 21 L8 16.5 L11.5 24 L14.8 22.5 L11.4 15.2 L18 15 Z" fill={INK} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </>
  );
};

const Card: React.FC<{ x: number; y: number; w: number; h: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w, h, children, style }) => (
  <div className="absolute rounded-2xl bg-white border" style={{ left: x, top: y, width: w, height: h, borderColor: LINE, ...style }}>{children}</div>
);

const SectionTitle: React.FC<{ n: string; label: string }> = ({ n, label }) => (
  <div className="flex items-center gap-2.5">
    <span className="h-6 w-6 rounded-lg flex items-center justify-center text-[12px] font-bold text-white" style={{ background: INK }}>{n}</span>
    <span className="font-display text-[17px]" style={{ color: INK }}>{label}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Scènes                                                              */
/* ------------------------------------------------------------------ */

const DATE = { fr: "Jeu. 19 nov. 2026", en: "Thu, Nov 19, 2026" };
const MASKED_PHONE = "+225 07 •• •• •• ••";

/* 1 — Introduction */
const SIntro: React.FC<SceneProps> = ({ t, tr }) => {
  const steps = [
    tr({ fr: "Compte", en: "Account" }),
    tr({ fr: "Trajet", en: "Ride" }),
    tr({ fr: "Véhicule", en: "Vehicle" }),
    tr({ fr: "Confirmation", en: "Confirmation" }),
  ];
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: INK }}>
      <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ transform: `scale(${1.14 - 0.1 * seg(t, 0, 5)})`, opacity: 0.42 }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-14">
        <div style={pop(t, 0.5)} className="rounded-2xl bg-white px-6 py-4 shadow-2xl">
          <img src={LOGO} alt="EASY" className="h-11 w-auto" />
        </div>
        <div style={show(t, 1.1, 0.6, 26)} className="font-display mt-9 text-white text-[56px] leading-[1.02]">
          {tr({ fr: "Réserver un trajet", en: "Book a ride" })}
        </div>
        <div style={{ ...show(t, 1.45, 0.6, 26), color: GREEN }} className="font-display text-[56px] leading-[1.02]">
          {tr({ fr: "en une minute", en: "in one minute" })}
        </div>
        <div className="mt-9 flex items-center gap-2.5">
          {steps.map((s, i) => (
            <div key={s} style={pop(t, 2.2 + i * 0.22)} className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[14px] font-semibold" >
              <span className="h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: GREEN }}>{i + 1}</span>
              <span style={{ color: INK }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* 2 — Création de compte */
const CUR_SIGNUP: KF[] = [
  { t: 0, x: 560, y: 560 }, { t: 0.8, x: 300, y: 170, click: true }, { t: 2.5, x: 300, y: 242, click: true },
  { t: 4.3, x: 300, y: 314, click: true }, { t: 5.8, x: 300, y: 386, click: true }, { t: 7.3, x: 332, y: 449, click: true },
  { t: 8.6, x: 440, y: 540 },
];
const SSignup: React.FC<SceneProps> = ({ t, tr }) => {
  const act = between(t, 0.8, 2.5) ? 0 : between(t, 2.5, 4.3) ? 1 : between(t, 4.3, 5.8) ? 2 : between(t, 5.8, 7.3) ? 3 : -1;
  const loading = between(t, 7.35, 8.0);
  const done = t >= 8.0;
  return (
    <Browser url="easybysaver.com/#inscription">
      <MiniNav tr={tr} />
      <Card x={122} y={56} w={420} h={440} />
      <div className="absolute" style={{ left: 142, top: 66, ...show(t, 0.1) }}>
        <div className="font-display text-[24px]" style={{ color: INK }}>{tr({ fr: "Créer un compte", en: "Create an account" })}</div>
        <div className="text-[13px] mt-0.5" style={{ color: MUTED }}>{tr({ fr: "Quelques secondes suffisent.", en: "It only takes a few seconds." })}</div>
      </div>
      <Field x={142} y={130} w={380} t={t} active={act === 0} icon={<User size={15} />} label={tr({ fr: "Nom complet", en: "Full name" })} placeholder="Ex : Jean Koffi" value={typed("Awa Koné", t, 1.0, 2.2)} />
      <Field x={142} y={202} w={380} t={t} active={act === 1} icon={<Mail size={15} />} label={tr({ fr: "E-mail", en: "Email" })} placeholder="nom@email.com" value={typed("awa.kone@email.com", t, 2.7, 4.0)} />
      <Field x={142} y={274} w={380} t={t} active={act === 2} icon={<Phone size={15} />} label={tr({ fr: "Téléphone", en: "Phone" })} placeholder="+225" value={typed(MASKED_PHONE, t, 4.5, 5.5)} />
      <Field x={142} y={346} w={380} t={t} active={act === 3} icon={<KeyRound size={15} />} label={tr({ fr: "Mot de passe", en: "Password" })} placeholder="••••••••" value={typed("••••••••••", t, 6.0, 6.8)} />
      <div
        className="absolute rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold"
        style={{ left: 142, top: 426, width: 380, height: 46, background: done ? INK : GREEN, color: done ? "#fff" : "#06140D", transform: `scale(${pressed(t, 7.3) ? 0.96 : 1})` }}
      >
        {loading ? <Spinner t={t} /> : done ? (
          <span style={pop(t, 8.0)} className="flex items-center gap-2"><Check size={16} color={GREEN} strokeWidth={3} /> {tr({ fr: "Compte créé", en: "Account created" })}</span>
        ) : tr({ fr: "Créer mon compte", en: "Create my account" })}
      </div>
      <div className="absolute text-[12px] text-center" style={{ left: 122, top: 512, width: 420, color: MUTED }}>
        {tr({ fr: "Déjà inscrit ?", en: "Already registered?" })} <span className="font-semibold" style={{ color: INK }}>{tr({ fr: "Se connecter", en: "Sign in" })}</span>
      </div>
      <Cursor kf={CUR_SIGNUP} t={t} />
    </Browser>
  );
};

/* 3 — Connexion */
const CUR_LOGIN: KF[] = [
  { t: 0, x: 440, y: 540 }, { t: 0.4, x: 300, y: 200, click: true }, { t: 1.5, x: 300, y: 272, click: true },
  { t: 2.8, x: 332, y: 339, click: true }, { t: 4.4, x: 500, y: 480 },
];
const SLogin: React.FC<SceneProps> = ({ t, tr }) => {
  const act = between(t, 0.4, 1.5) ? 0 : between(t, 1.5, 2.8) ? 1 : -1;
  const loading = between(t, 2.85, 3.5);
  const done = t >= 3.5;
  return (
    <Browser url={done ? "easybysaver.com/#accueil" : "easybysaver.com/#connexion"}>
      <MiniNav tr={tr} user={3.5} t={t} />
      <Card x={122} y={76} w={420} h={330} />
      <div className="absolute" style={{ left: 142, top: 96 }}>
        <div className="font-display text-[24px]" style={{ color: INK }}>{tr({ fr: "Connexion", en: "Sign in" })}</div>
        <div className="text-[13px] mt-0.5" style={{ color: MUTED }}>{tr({ fr: "Heureux de vous revoir.", en: "Good to see you again." })}</div>
      </div>
      <Field x={142} y={160} w={380} t={t} active={act === 0} icon={<Mail size={15} />} label={tr({ fr: "E-mail", en: "Email" })} placeholder="nom@email.com" value={typed("awa.kone@email.com", t, 0.55, 1.3)} />
      <Field x={142} y={232} w={380} t={t} active={act === 1} icon={<KeyRound size={15} />} label={tr({ fr: "Mot de passe", en: "Password" })} placeholder="••••••••" value={typed("••••••••••", t, 1.65, 2.3)} />
      <div
        className="absolute rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold"
        style={{ left: 142, top: 316, width: 380, height: 46, background: GREEN, color: "#06140D", transform: `scale(${pressed(t, 2.8) ? 0.96 : 1})` }}
      >
        {loading ? <Spinner t={t} /> : tr({ fr: "Se connecter", en: "Sign in" })}
      </div>
      {t >= 3.6 && (
        <div className="absolute z-30 flex items-center gap-2.5 rounded-xl bg-white px-4 py-3 shadow-xl border" style={{ left: 192, top: 430, width: 280, borderColor: LINE, ...show(t, 3.6, 0.45, 20) }}>
          <Check size={18} color={GREEN} strokeWidth={3} />
          <div>
            <div className="text-[13px] font-semibold" style={{ color: INK }}>{tr({ fr: "Bon retour, Awa !", en: "Welcome back, Awa!" })}</div>
            <div className="text-[11px]" style={{ color: MUTED }}>{tr({ fr: "Vous êtes connectée.", en: "You are signed in." })}</div>
          </div>
        </div>
      )}
      <Cursor kf={CUR_LOGIN} t={t} />
    </Browser>
  );
};

/* En-tête commun de la page Réservation */
const ResaHeader: React.FC<{ tr: Tr }> = ({ tr }) => (
  <div className="absolute" style={{ left: 32, top: 60 }}>
    <div className="text-[11px] font-semibold tracking-wide" style={{ color: GREEN }}>{tr({ fr: "RÉSERVATION", en: "BOOKING" })}</div>
    <div className="font-display text-[26px] leading-tight" style={{ color: INK }}>{tr({ fr: "Réserver un trajet", en: "Book a ride" })}</div>
  </div>
);

/* 4 — Trajet */
const CUR_TRIP: KF[] = [
  { t: 0, x: 560, y: 580 }, { t: 0.7, x: 190, y: 236, click: true }, { t: 1.8, x: 474, y: 236, click: true },
  { t: 2.7, x: 332, y: 316, click: true }, { t: 4.5, x: 300, y: 397, click: true }, { t: 5.5, x: 332, y: 412, click: true },
  { t: 8.4, x: 520, y: 545 },
];
const STrip: React.FC<SceneProps> = ({ t, tr }) => {
  const dropdown = between(t, 3.6, 4.6);
  const sugg = ["Cocody Centre, Abidjan", "Cocody Deux Plateaux, Abidjan", "Cocody Riviera 2, Abidjan"];
  const address = t >= 4.6 ? sugg[1] : typed("Coco", t, 2.9, 3.5);
  return (
    <Browser url="easybysaver.com/#reservation">
      <MiniNav tr={tr} active="resa" user={0} t={t} />
      <ResaHeader tr={tr} />
      <Card x={32} y={130} w={600} h={440} />
      <div className="absolute" style={{ left: 56, top: 150 }}><SectionTitle n="1" label={tr({ fr: "Votre trajet", en: "Your ride" })} /></div>
      <Field x={56} y={196} w={268} t={t} active={between(t, 0.7, 1.1)} flash={0.9} icon={<CalendarDays size={15} />} label={tr({ fr: "Date", en: "Date" })} placeholder={tr({ fr: "Choisir", en: "Select" })} value={t >= 0.9 ? tr(DATE) : ""} />
      <Field x={340} y={196} w={268} t={t} active={between(t, 1.8, 2.2)} flash={2.0} icon={<Clock size={15} />} label={tr({ fr: "Heure", en: "Time" })} placeholder="--:--" value={t >= 2.0 ? "09:30" : ""} />
      <Field x={56} y={276} w={552} t={t} active={between(t, 2.7, 4.6)} flash={4.6} icon={<MapPin size={15} />} label={tr({ fr: "Adresse de prise en charge", en: "Pickup address" })} placeholder={tr({ fr: "Quartier, hôtel, aéroport…", en: "District, hotel, airport…" })} value={address} />
      <Field x={56} y={356} w={552} t={t} active={between(t, 5.5, 7.2)} icon={<Phone size={15} />} label={tr({ fr: "Téléphone", en: "Phone" })} placeholder="+225" value={typed(MASKED_PHONE, t, 5.7, 6.9)} />
      {dropdown && (
        <div className="absolute z-30 rounded-xl bg-white border shadow-xl overflow-hidden" style={{ left: 56, top: 340, width: 552, borderColor: LINE, transformOrigin: "top", ...pop(t, 3.6, 0.35) }}>
          {sugg.map((s, i) => (
            <div key={s} className="h-[38px] flex items-center gap-2 px-3 text-[13px]" style={{ color: INK, background: i === 1 && t >= 4.0 ? "rgba(0,200,83,.1)" : "#fff" }}>
              <MapPin size={13} color={i === 1 && t >= 4.0 ? GREEN : "#9AA8A0"} />
              <span><b>Coco</b>{s.slice(4)}</span>
            </div>
          ))}
        </div>
      )}
      {t >= 7.5 && (
        <div className="absolute flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold text-white" style={{ left: 56, top: 470, background: GREEN, ...pop(t, 7.5) }}>
          <Check size={15} strokeWidth={3} /> {tr({ fr: "Trajet renseigné", en: "Ride details done" })}
        </div>
      )}
      <Cursor kf={CUR_TRIP} t={t} />
    </Browser>
  );
};

/* 5 — Véhicule & formule */
const FORMULAS = [
  { d: "1h", fr: "Le Flash Premium", en: "Le Flash Premium", p: 10000 },
  { d: "2h", fr: "Les Courses VIP", en: "VIP Errands", p: 18000 },
  { d: "3h", fr: "Le RDV d'Image", en: "The Image Meeting", p: 21000 },
  { d: "8h", fr: "La Grande Journée", en: "The Full Day", p: 45000 },
  { d: "16h", fr: "L'Événement", en: "The Signature Event", p: 85000 },
];
const CUR_VEH: KF[] = [
  { t: 0, x: 560, y: 580 }, { t: 0.9, x: 332, y: 176 }, { t: 1.5, x: 140, y: 176, click: true },
  { t: 2.6, x: 332, y: 304, click: true }, { t: 4.0, x: 300, y: 432, click: true }, { t: 7.4, x: 560, y: 560 },
];
const SVehicle: React.FC<SceneProps> = ({ t, tr }) => {
  const tiles = [
    { tag: "N1", name: tr({ fr: "Berline", en: "Sedan" }), price: tr({ fr: "dès 10 000 FCFA", en: "from 10,000 FCFA" }), bg: GREEN, fg: "#fff" },
    { tag: "N2", name: tr({ fr: "SUV Executive", en: "Executive SUV" }), price: tr({ fr: "dès 15 000 FCFA", en: "from 15,000 FCFA" }), bg: ORANGE, fg: "#fff" },
    { tag: "N3", name: "Prestige", price: tr({ fr: "Sur devis", en: "On quote" }), bg: YELLOW, fg: INK },
  ];
  const selected = t >= 1.55;
  const open = between(t, 2.7, 4.1);
  const chosen = t >= 4.05;
  return (
    <Browser url="easybysaver.com/#reservation">
      <MiniNav tr={tr} active="resa" user={0} t={t} />
      <Card x={32} y={60} w={600} h={540} />
      <div className="absolute" style={{ left: 50, top: 78 }}><SectionTitle n="2" label={tr({ fr: "Véhicule & formule", en: "Vehicle & package" })} /></div>
      {tiles.map((v, i) => {
        const isSel = i === 0 && selected;
        const hover = i === 1 && between(t, 0.6, 1.25);
        return (
          <div
            key={v.tag}
            className="absolute rounded-2xl p-4 flex flex-col justify-between"
            style={{
              left: 50 + i * 192, top: 116, width: 180, height: 120, background: v.bg, color: v.fg,
              boxShadow: isSel ? `0 0 0 4px ${INK}` : "none",
              transform: `translateY(${hover ? -4 : 0}px) scale(${i === 0 && pressed(t, 1.5) ? 0.96 : 1})`,
              transition: "transform .2s",
            }}
          >
            <div className="flex items-start justify-between">
              <span className="text-[12px] font-bold opacity-90">{v.tag}</span>
              {isSel && (
                <span style={pop(t, 1.55)} className="h-6 w-6 rounded-full bg-white flex items-center justify-center"><Check size={14} color={INK} strokeWidth={3} /></span>
              )}
            </div>
            <div>
              <div className="font-display text-[18px] leading-tight">{v.name}</div>
              <div className="text-[12px] font-semibold opacity-90">{v.price}</div>
            </div>
          </div>
        );
      })}
      <div className="absolute text-[11px] font-semibold uppercase tracking-wide" style={{ left: 50, top: 262, color: MUTED }}>{tr({ fr: "Formule", en: "Package" })}</div>
      <div
        className="absolute h-11 rounded-xl border bg-white px-3 flex items-center justify-between text-[14px]"
        style={{ left: 50, top: 282, width: 564, borderColor: open ? GREEN : LINE, boxShadow: open ? "0 0 0 4px rgba(0,200,83,.15)" : "none", color: INK }}
      >
        <span style={{ color: chosen ? INK : "#9AA8A0" }} className={chosen ? "font-semibold" : ""}>
          {chosen ? `3h — 21 000 FCFA` : tr({ fr: "Choisir une formule", en: "Choose a package" })}
        </span>
        <ChevronDown size={16} color={MUTED} style={{ transform: `rotate(${open ? 180 : 0}deg)` }} />
      </div>
      {open && (
        <div className="absolute z-30 rounded-xl bg-white border shadow-xl overflow-hidden" style={{ left: 50, top: 332, width: 564, borderColor: LINE, transformOrigin: "top", ...pop(t, 2.7, 0.35) }}>
          {FORMULAS.map((f, i) => (
            <div key={f.d} className="h-10 flex items-center justify-between px-3 text-[13px]" style={{ color: INK, background: i === 2 && t >= 3.5 ? "rgba(0,200,83,.1)" : "#fff" }}>
              <span><b>{f.d}</b> — {tr({ fr: f.fr, en: f.en })}</span>
              <span className="font-semibold">{fmt(f.p)} FCFA</span>
            </div>
          ))}
        </div>
      )}
      {t >= 4.2 && (
        <div className="absolute rounded-2xl border p-5 flex items-center justify-between" style={{ left: 50, top: 346, width: 564, height: 130, borderColor: LINE, background: LIGHT, ...show(t, 4.2, 0.45) }}>
          <div>
            <span className="inline-block rounded-full px-3 py-1 text-[12px] font-bold text-white" style={{ background: INK }}>3h</span>
            <div className="font-display text-[20px] mt-2" style={{ color: INK }}>{tr({ fr: "Le RDV d'Image", en: "The Image Meeting" })}</div>
            <div className="text-[12px]" style={{ color: MUTED }}>{tr({ fr: "Meeting, hôtel 5★, cabinet d'avocats, banque", en: "Meeting, 5★ hotel, law firm, private banking" })}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase" style={{ color: MUTED }}>{tr({ fr: "Prix", en: "Price" })}</div>
            <div className="font-display text-[30px]" style={{ color: GREEN }}>{fmt(count(0, 21000, t, 4.3, 5.4))}</div>
            <div className="text-[12px] font-semibold" style={{ color: INK }}>FCFA</div>
          </div>
        </div>
      )}
      <div className="absolute text-[12px]" style={{ left: 50, top: 500, color: MUTED, ...show(t, 5.6) }}>
        {tr({ fr: "Prestige (N3) : tarif sur devis, notre équipe vous recontacte.", en: "Prestige (N3): on quote, our team will get back to you." })}
      </div>
      <Cursor kf={CUR_VEH} t={t} />
    </Browser>
  );
};

/* 6 — Options & Terminer */
const CUR_OPT: KF[] = [
  { t: 0, x: 500, y: 580 }, { t: 1.0, x: 566, y: 152, click: true }, { t: 3.6, x: 332, y: 458, click: true }, { t: 4.8, x: 430, y: 560 },
];
const Toggle: React.FC<{ on: number; t: number }> = ({ on, t }) => {
  const k = eout(seg(t, on, on + 0.25));
  return (
    <span className="relative inline-block h-6 w-11 rounded-full" style={{ background: k > 0.5 ? GREEN : "#CBD5CE" }}>
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow" style={{ left: 2 + k * 20 }} />
    </span>
  );
};
const SOptions: React.FC<SceneProps> = ({ t, tr }) => {
  const on = t >= 1.05;
  const rows = [
    { y: 116, icon: <Globe size={16} color={GREEN} />, title: tr({ fr: "Chauffeur bilingue (+15%)", en: "Bilingual chauffeur (+15%)" }), desc: tr({ fr: "Français & anglais des affaires.", en: "Business French & English." }), active: on },
    { y: 200, icon: <UserCheck size={16} color={GREEN} />, title: tr({ fr: "Accueil aéroport (+5 000 FCFA)", en: "Airport greeting (+5,000 FCFA)" }), desc: tr({ fr: "Accueil avec pancarte à votre nom.", en: "Meet & greet with a name sign." }), active: false },
  ];
  return (
    <Browser url="easybysaver.com/#reservation">
      <MiniNav tr={tr} active="resa" user={0} t={t} />
      <Card x={32} y={60} w={600} h={540} />
      <div className="absolute" style={{ left: 50, top: 78 }}><SectionTitle n="3" label={tr({ fr: "Options & total", en: "Extras & total" })} /></div>
      {rows.map((r, i) => (
        <div key={i} className="absolute rounded-xl border px-4 flex items-center justify-between" style={{ left: 50, top: r.y, width: 564, height: 72, borderColor: r.active ? GREEN : LINE, background: r.active ? "rgba(0,200,83,.06)" : "#fff" }}>
          <div>
            <div className="text-[14px] font-bold flex items-center gap-2" style={{ color: INK }}>{r.icon} {r.title}</div>
            <div className="text-[12px] mt-1" style={{ color: MUTED }}>{r.desc}</div>
          </div>
          <Toggle on={i === 0 ? 1.05 : 999} t={t} />
        </div>
      ))}
      <div className="absolute rounded-2xl px-5 flex items-center justify-between" style={{ left: 50, top: 300, width: 564, height: 80, background: INK }}>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{tr({ fr: "Total estimé", en: "Estimated total" })}</div>
          <div className="text-[12px] text-white/80">{tr({ fr: "Berline · 3h · bilingue", en: "Sedan · 3h · bilingual" })}</div>
        </div>
        <div className="font-display text-[32px] text-white">
          {fmt(count(21000, 24150, t, 1.3, 2.2))} <span className="text-[16px]" style={{ color: GREEN }}>FCFA</span>
        </div>
      </div>
      <div className="absolute text-[12px]" style={{ left: 50, top: 394, width: 564, color: MUTED }}>
        {tr({ fr: "Nuit et week-end : la majoration s'ajoute automatiquement au total.", en: "Night and weekend: the surcharge is added to the total automatically." })}
      </div>
      <div
        className="absolute rounded-xl flex items-center justify-center gap-2 text-[16px] font-semibold"
        style={{ left: 50, top: 430, width: 564, height: 56, background: GREEN, color: "#06140D", transform: `scale(${pressed(t, 3.6) ? 0.96 : 1})`, boxShadow: t > 2.6 && t < 3.6 ? `0 0 0 ${4 + 3 * Math.sin(t * 9)}px rgba(0,200,83,.25)` : "none" }}
      >
        {tr({ fr: "Terminer", en: "Finish" })} <ArrowRight size={18} />
      </div>
      <Cursor kf={CUR_OPT} t={t} />
    </Browser>
  );
};

/* 7 — Récapitulatif & confirmation */
const CUR_CONF: KF[] = [{ t: 0, x: 520, y: 600 }, { t: 2.2, x: 332, y: 477, click: true }, { t: 3.0, x: 340, y: 490 }];
const SConfirm: React.FC<SceneProps> = ({ t, tr }) => {
  const enter = back(seg(t, 0.1, 0.7));
  const loading = between(t, 2.3, 3.7);
  const success = t >= 3.7;
  const recapOp = hide(t, 2.3, 0.25);
  const rows = [
    [tr({ fr: "Date", en: "Date" }), `${tr(DATE)} · 09:30`],
    [tr({ fr: "Départ", en: "Pickup" }), "Cocody Deux Plateaux"],
    [tr({ fr: "Véhicule", en: "Vehicle" }), tr({ fr: "Berline (N1)", en: "Sedan (N1)" })],
    [tr({ fr: "Formule", en: "Package" }), tr({ fr: "3h — Le RDV d'Image", en: "3h — The Image Meeting" })],
    [tr({ fr: "Option", en: "Extra" }), tr({ fr: "Chauffeur bilingue +15%", en: "Bilingual chauffeur +15%" })],
  ];
  return (
    <Browser url="easybysaver.com/#reservation">
      <MiniNav tr={tr} active="resa" user={0} t={t} />
      {/* page en arrière-plan */}
      <Card x={32} y={60} w={600} h={540} />
      <div className="absolute rounded-2xl" style={{ left: 50, top: 300, width: 564, height: 80, background: INK }} />
      <div className="absolute rounded-xl" style={{ left: 50, top: 430, width: 564, height: 56, background: GREEN }} />
      <div className="absolute inset-0 z-10" style={{ background: `rgba(11,31,20,${0.32 * seg(t, 0, 0.4)})`, backdropFilter: `blur(${4 * seg(t, 0, 0.4)}px)` }} />
      {/* modale verre */}
      <div
        className="absolute z-20 rounded-[26px] overflow-hidden"
        style={{
          left: 92, top: 70, width: 480, height: 470,
          background: "rgba(255,255,255,.8)", backdropFilter: "blur(24px) saturate(1.5)",
          border: "1px solid rgba(255,255,255,.7)", boxShadow: "0 40px 80px -30px rgba(11,31,20,.55)",
          opacity: clamp(seg(t, 0.1, 0.4)), transform: `translateY(${(1 - enter) * 80}px)`,
        }}
      >
        {recapOp > 0 && (
          <div className="absolute inset-0 p-6" style={{ opacity: recapOp }}>
            <div className="font-display text-[22px]" style={{ color: INK }}>{tr({ fr: "Récapitulatif", en: "Summary" })}</div>
            <div className="text-[12px]" style={{ color: MUTED }}>{tr({ fr: "Vérifiez avant de confirmer.", en: "Check before confirming." })}</div>
            <div className="mt-4 space-y-2.5">
              {rows.map(([a, b], i) => (
                <div key={a} className="flex justify-between text-[13px] border-b pb-2.5" style={{ borderColor: "rgba(11,31,20,.08)", ...show(t, 0.5 + i * 0.12, 0.35, 8) }}>
                  <span style={{ color: MUTED }}>{a}</span><span className="font-semibold" style={{ color: INK }}>{b}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-baseline justify-between" style={show(t, 1.2)}>
              <span className="text-[13px] font-semibold" style={{ color: MUTED }}>Total</span>
              <span className="font-display text-[28px]" style={{ color: INK }}>24 150 <span className="text-[15px]" style={{ color: GREEN }}>FCFA</span></span>
            </div>
            <div
              className="absolute rounded-xl flex items-center justify-center text-[15px] font-semibold"
              style={{ left: 24, top: 382, width: 432, height: 50, background: GREEN, color: "#06140D", transform: `scale(${pressed(t, 2.2) ? 0.96 : 1})` }}
            >
              {tr({ fr: "Confirmer la réservation", en: "Confirm booking" })}
            </div>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ opacity: seg(t, 2.35, 2.6) * hide(t, 3.55, 0.15) }}>
            <Spinner t={t} size={46} color={GREEN} track="rgba(0,200,83,.18)" />
            <div className="text-[14px] font-semibold" style={{ color: INK }}>{tr({ fr: "Confirmation en cours…", en: "Confirming…" })}</div>
          </div>
        )}
        {success && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <div className="relative">
              <span className="absolute inset-0 rounded-full" style={{ border: `2px solid ${GREEN}`, opacity: 1 - seg(t, 3.8, 4.8), transform: `scale(${1 + seg(t, 3.8, 4.8) * 0.8})` }} />
              <span className="h-[88px] w-[88px] rounded-full flex items-center justify-center" style={{ background: GREEN, ...pop(t, 3.7, 0.55) }}>
                <Check size={44} color="#fff" strokeWidth={3} />
              </span>
            </div>
            <div className="font-display text-[26px] mt-5" style={{ color: INK, ...show(t, 4.0) }}>{tr({ fr: "Demande enregistrée", en: "Request received" })}</div>
            <div className="text-[13px] mt-1" style={{ color: MUTED, ...show(t, 4.15) }}>{tr({ fr: "Un e-mail de confirmation vient de vous être envoyé.", en: "A confirmation email is on its way." })}</div>
            <div className="mt-4 rounded-full px-3.5 py-1.5 text-[12px] font-bold" style={{ background: "rgba(11,31,20,.06)", color: INK, ...show(t, 4.3) }}>{tr({ fr: "Réf.", en: "Ref." })} EZ-4821</div>
            <div className="mt-6 flex gap-2.5" style={show(t, 4.5)}>
              <span className="rounded-xl px-4 py-2.5 text-[13px] font-semibold" style={{ background: GREEN, color: "#06140D" }}>{tr({ fr: "Voir mes commandes", en: "My bookings" })}</span>
              <span className="rounded-xl px-4 py-2.5 text-[13px] font-semibold border" style={{ borderColor: LINE, color: INK, background: "#fff" }}>{tr({ fr: "Nouvelle réservation", en: "New booking" })}</span>
            </div>
          </div>
        )}
      </div>
      <div className="absolute inset-0 z-30 pointer-events-none">
        <Cursor kf={CUR_CONF} t={t} fadeAt={2.7} />
      </div>
    </Browser>
  );
};

/* 8 — E-mail & suivi dans « Mes commandes » */
const CUR_FOLLOW: KF[] = [{ t: 0, x: 520, y: 580 }, { t: 2.6, x: 560, y: 162, click: true }, { t: 5.6, x: 520, y: 520 }];
const SFollow: React.FC<SceneProps> = ({ t, tr }) => {
  const exp = eout(seg(t, 2.7, 3.2));
  const confirmed = t >= 4.2;
  const others = [
    { tag: "N2", bg: ORANGE, name: tr({ fr: "SUV Executive", en: "Executive SUV" }), ref: "EZ-4710", date: tr({ fr: "Sam. 7 nov. · 14:00", en: "Sat, Nov 7 · 14:00" }), amount: "39 000" },
    { tag: "N1", bg: GREEN, name: tr({ fr: "Berline", en: "Sedan" }), ref: "EZ-4655", date: tr({ fr: "Lun. 2 nov. · 08:15", en: "Mon, Nov 2 · 08:15" }), amount: "10 000" },
  ];
  const detail = [
    [tr({ fr: "Départ", en: "Pickup" }), "Cocody Deux Plateaux"],
    [tr({ fr: "Date", en: "Date" }), `${tr(DATE)} · 09:30`],
    [tr({ fr: "Formule", en: "Package" }), tr({ fr: "3h — Le RDV d'Image", en: "3h — The Image Meeting" })],
    [tr({ fr: "Option", en: "Extra" }), tr({ fr: "Chauffeur bilingue", en: "Bilingual chauffeur" })],
    [tr({ fr: "Chauffeur", en: "Chauffeur" }), tr({ fr: "Attribué avant le départ", en: "Assigned before pickup" })],
    ["Total", "24 150 FCFA"],
  ];
  return (
    <Browser url="easybysaver.com/#commandes">
      <MiniNav tr={tr} user={0} t={t} />
      <div className="absolute" style={{ left: 32, top: 60 }}>
        <div className="text-[11px] font-semibold tracking-wide" style={{ color: GREEN }}>{tr({ fr: "MON ESPACE", en: "MY ACCOUNT" })}</div>
        <div className="font-display text-[26px] leading-tight" style={{ color: INK }}>{tr({ fr: "Mes commandes", en: "My bookings" })}</div>
      </div>
      <div className="absolute flex flex-col gap-2.5" style={{ left: 32, top: 130, width: 600 }}>
        <div className="rounded-2xl bg-white border overflow-hidden" style={{ borderColor: exp > 0 ? GREEN : LINE }}>
          <div className="h-16 px-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl flex items-center justify-center text-[12px] font-bold text-white" style={{ background: GREEN }}>N1</span>
            <div className="flex-1">
              <div className="text-[14px] font-bold" style={{ color: INK }}>{tr({ fr: "Berline", en: "Sedan" })} · #EZ-4821</div>
              <div className="text-[12px]" style={{ color: MUTED }}>{tr(DATE)} · 09:30</div>
            </div>
            <span
              key={confirmed ? "ok" : "wait"}
              className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
              style={{ background: confirmed ? GREEN : ORANGE, ...(confirmed ? pop(t, 4.2) : {}) }}
            >
              {confirmed ? tr({ fr: "Confirmée", en: "Confirmed" }) : tr({ fr: "En attente", en: "Pending" })}
            </span>
            <span className="text-[14px] font-bold w-[92px] text-right" style={{ color: INK }}>24 150 F</span>
            <ChevronDown size={16} color={MUTED} style={{ transform: `rotate(${exp * 180}deg)` }} />
          </div>
          <div style={{ height: 176 * exp, opacity: exp }} className="overflow-hidden">
            <div className="mx-4 mb-4 rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-2.5" style={{ background: LIGHT }}>
              {detail.map(([a, b]) => (
                <div key={a} className="text-[12px]">
                  <div style={{ color: MUTED }}>{a}</div>
                  <div className="font-semibold" style={{ color: INK }}>{b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {others.map((o) => (
          <div key={o.ref} className="rounded-2xl bg-white border h-16 px-4 flex items-center gap-3" style={{ borderColor: LINE }}>
            <span className="h-10 w-10 rounded-xl flex items-center justify-center text-[12px] font-bold text-white" style={{ background: o.bg }}>{o.tag}</span>
            <div className="flex-1">
              <div className="text-[14px] font-bold" style={{ color: INK }}>{o.name} · #{o.ref}</div>
              <div className="text-[12px]" style={{ color: MUTED }}>{o.date}</div>
            </div>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "#E6EBE8", color: MUTED }}>{tr({ fr: "Terminée", en: "Completed" })}</span>
            <span className="text-[14px] font-bold w-[92px] text-right" style={{ color: INK }}>{o.amount} F</span>
            <ChevronDown size={16} color={MUTED} />
          </div>
        ))}
      </div>
      {/* notification e-mail */}
      {between(t, 0.3, 2.6) && (
        <div
          className="absolute z-30 rounded-2xl bg-white border shadow-2xl p-4 flex gap-3"
          style={{ left: 318, top: 54, width: 320, borderColor: LINE, opacity: seg(t, 0.3, 0.6) * hide(t, 2.2), transform: `translateX(${(1 - eout(seg(t, 0.3, 0.75))) * 120}px)` }}
        >
          <Mail size={20} color={GREEN} className="mt-0.5 shrink-0" />
          <div>
            <div className="text-[12px] font-bold" style={{ color: INK }}>EASY · {tr({ fr: "Réservation enregistrée", en: "Booking received" })}</div>
            <div className="text-[11px] mt-0.5" style={{ color: MUTED }}>{tr({ fr: "Réf. EZ-4821 · Jeu. 19 nov. à 09:30", en: "Ref. EZ-4821 · Thu, Nov 19 at 09:30" })}</div>
          </div>
        </div>
      )}
      <Cursor kf={CUR_FOLLOW} t={t} />
    </Browser>
  );
};

/* 9 — Fin & contact */
const SOutro: React.FC<SceneProps> = ({ t, tr }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-14" style={{ background: INK }}>
    <div style={pop(t, 0.3)} className="rounded-2xl bg-white px-6 py-4">
      <img src={LOGO} alt="EASY" className="h-11 w-auto" />
    </div>
    <div style={show(t, 0.8, 0.6, 24)} className="font-display mt-8 text-[50px] leading-[1.04] text-white">
      {tr({ fr: "Bon trajet", en: "Enjoy your ride" })}
    </div>
    <div style={{ ...show(t, 1.05, 0.6, 24), color: GREEN }} className="font-display text-[50px] leading-[1.04]">
      {tr({ fr: "avec EASY", en: "with EASY" })}
    </div>
    <div style={show(t, 1.5)} className="mt-5 text-[16px] text-white/75">
      {tr({ fr: "Une question ? Nous répondons 7j/7.", en: "A question? We answer 7 days a week." })}
    </div>
    <div className="mt-7 flex gap-3">
      <span style={{ ...pop(t, 1.9), background: GREEN, color: "#06140D" }} className="flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold">
        <MessageCircle size={18} /> WhatsApp · 07 97 13 97 87
      </span>
      <span style={pop(t, 2.15)} className="flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold text-white ring-1 ring-white/30">
        <PhoneCall size={18} color={GREEN} /> 01 70 08 36 81
      </span>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Timeline                                                            */
/* ------------------------------------------------------------------ */

const SCENES: SceneDef[] = [
  { id: "intro", dur: 5, chapter: { fr: "Introduction", en: "Intro" }, sfx: [[0.5, "pop"], [2.2, "tick"], [2.42, "tick"], [2.64, "tick"], [2.86, "tick"]], Comp: SIntro },
  { id: "signup", dur: 9, chapter: { fr: "Créer un compte", en: "Create an account" }, cursor: CUR_SIGNUP, typing: [[1.0, 2.2], [2.7, 4.0], [4.5, 5.5], [6.0, 6.8]], sfx: [[8.0, "pop"]], Comp: SSignup },
  { id: "login", dur: 5, chapter: { fr: "Se connecter", en: "Sign in" }, cursor: CUR_LOGIN, typing: [[0.55, 1.3], [1.65, 2.3]], sfx: [[3.5, "pop"]], Comp: SLogin },
  { id: "trip", dur: 9, chapter: { fr: "Votre trajet", en: "Your ride" }, cursor: CUR_TRIP, typing: [[2.9, 3.5], [5.7, 6.9]], sfx: [[0.9, "pop"], [2.0, "pop"], [3.6, "pop"], [7.5, "pop"]], Comp: STrip },
  { id: "vehicle", dur: 8, chapter: { fr: "Véhicule & formule", en: "Vehicle & package" }, cursor: CUR_VEH, sfx: [[2.7, "pop"], [5.4, "pop"]], Comp: SVehicle },
  { id: "options", dur: 6, chapter: { fr: "Options & Terminer", en: "Extras & finish" }, cursor: CUR_OPT, Comp: SOptions },
  { id: "confirm", dur: 7, chapter: { fr: "Confirmation", en: "Confirmation" }, cursor: CUR_CONF, sfx: [[3.7, "chime"]], Comp: SConfirm },
  { id: "follow", dur: 6, chapter: { fr: "Suivi", en: "Tracking" }, cursor: CUR_FOLLOW, sfx: [[0.35, "pop"], [4.2, "pop"]], Comp: SFollow },
  { id: "outro", dur: 5, chapter: { fr: "Contact", en: "Contact" }, sfx: [[0.3, "chime"]], Comp: SOutro },
];

const STARTS: number[] = SCENES.reduce<number[]>((acc, _s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].dur);
  return acc;
}, []);
const TOTAL = STARTS[STARTS.length - 1] + SCENES[SCENES.length - 1].dur;

const CUES: { t: number; k: SfxKind }[] = SCENES.flatMap((s, i) => [
  ...(i > 0 ? [{ t: STARTS[i] + 0.02, k: "whoosh" as SfxKind }] : []),
  ...(s.cursor ?? []).filter((k) => k.click).map((k) => ({ t: STARTS[i] + k.t, k: "click" as SfxKind })),
  ...(s.sfx ?? []).map(([t, k]) => ({ t: STARTS[i] + t, k })),
]).sort((a, b) => a.t - b.t);

const TYPING: [number, number][] = SCENES.flatMap((s, i) => (s.typing ?? []).map(([a, b]) => [STARTS[i] + a, STARTS[i] + b] as [number, number]));

/** Texte de la voix off (et sous-titres). Temps en secondes, sur la durée totale. */
export const SUBTITLES: { a: number; b: number; fr: string; en: string }[] = [
  { a: 0.3, b: 4.9, fr: "Bienvenue chez EASY. Voici comment réserver votre trajet électrique, en une minute.", en: "Welcome to EASY. Here's how to book your electric ride, in one minute." },
  { a: 5.2, b: 9.6, fr: "Commencez par créer votre compte : votre nom, votre e-mail et votre téléphone.", en: "Start by creating your account: your name, email and phone number." },
  { a: 9.8, b: 13.9, fr: "Choisissez un mot de passe et validez. Votre compte est prêt.", en: "Choose a password and confirm. Your account is ready." },
  { a: 14.2, b: 18.9, fr: "Connectez-vous ensuite avec votre e-mail et votre mot de passe.", en: "Then sign in with your email and password." },
  { a: 19.2, b: 23.4, fr: "Dans « Réserver », indiquez la date et l'heure de prise en charge.", en: "In “Book”, pick the date and time of your pickup." },
  { a: 23.6, b: 27.9, fr: "Saisissez votre adresse, choisissez-la dans la liste, puis ajoutez votre numéro.", en: "Type your address, select it from the list, then add your number." },
  { a: 28.2, b: 31.9, fr: "Choisissez ensuite votre véhicule : Berline, SUV Executive ou Prestige.", en: "Next, choose your vehicle: Sedan, Executive SUV or Prestige." },
  { a: 32.1, b: 35.9, fr: "Puis la formule qui vous convient. Le prix s'affiche aussitôt.", en: "Then the package that suits you. The price appears instantly." },
  { a: 36.2, b: 41.9, fr: "Ajoutez une option si besoin, vérifiez le total, et appuyez sur « Terminer ».", en: "Add an extra if needed, check the total, and tap “Finish”." },
  { a: 42.2, b: 48.9, fr: "Un récapitulatif s'affiche. Confirmez : votre demande est enregistrée.", en: "A summary appears. Confirm: your request is saved." },
  { a: 49.2, b: 54.9, fr: "Vous recevez un e-mail de confirmation, et vous suivez tout dans « Mes commandes ».", en: "You receive a confirmation email, and track everything in “My bookings”." },
  { a: 55.2, b: 59.8, fr: "Une question ? Écrivez-nous sur WhatsApp. Bon trajet avec EASY !", en: "Any question? Message us on WhatsApp. Enjoy your ride with EASY!" },
];

const sceneIndexAt = (t: number) => {
  let i = 0;
  for (let k = 0; k < STARTS.length; k++) if (t >= STARTS[k]) i = k;
  return i;
};
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/* ------------------------------------------------------------------ */
/*  Lecteur                                                             */
/* ------------------------------------------------------------------ */

interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const HowToBookWidget: React.FC<Props> = ({ currentPage, onNavigate }) => {
  const { translate, language } = useLanguage();
  const tr: Tr = translate;
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [t, setT] = useState(0);
  const [stageW, setStageW] = useState(560);

  const tRef = useRef(0);
  const lastTick = useRef(-1);
  const sound = useMemo(() => new SoundKit(), []);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const voiceSrc = language === "en" ? VOICE_SRC.en : VOICE_SRC.fr;

  // Voix off (si un fichier est fourni)
  useEffect(() => {
    if (!voiceSrc) { voiceRef.current = null; return; }
    const a = new Audio(voiceSrc);
    a.preload = "auto";
    voiceRef.current = a;
    return () => { a.pause(); voiceRef.current = null; };
  }, [voiceSrc]);

  // Mise à l'échelle du canevas 720×720
  useEffect(() => {
    if (!open || !stageRef.current) return;
    const el = stageRef.current;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    setStageW(el.clientWidth);
    return () => ro.disconnect();
  }, [open]);

  // Boucle d'animation
  useEffect(() => {
    if (!open || !playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const prev = tRef.current;
      const next = Math.min(TOTAL, prev + dt);
      for (const c of CUES) if (c.t > prev && c.t <= next) sound.play(c.k);
      if (TYPING.some(([a, b]) => next >= a && next < b) && next - lastTick.current > 0.075) {
        lastTick.current = next;
        sound.play("tick");
      }
      sound.pump();
      const v = voiceRef.current;
      if (v && Math.abs(v.currentTime - next) > 0.35) v.currentTime = next;
      tRef.current = next;
      setT(next);
      if (next >= TOTAL) {
        setPlaying(false);
        setEnded(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open, playing, sound]);

  // Lecture / pause du son
  useEffect(() => {
    const v = voiceRef.current;
    if (playing) {
      sound.resume();
      sound.startMusic();
      sound.setMusicLevel(v ? 0.025 : 0.05);
      if (v) { v.currentTime = tRef.current; void v.play().catch(() => undefined); }
    } else {
      sound.suspend();
      v?.pause();
    }
  }, [playing, sound]);

  useEffect(() => {
    sound.setMuted(muted);
    if (voiceRef.current) voiceRef.current.muted = muted;
  }, [muted, sound]);

  const seek = useCallback((x: number) => {
    const nt = clamp(x, 0, TOTAL);
    tRef.current = nt;
    lastTick.current = nt;
    setT(nt);
    setEnded(nt >= TOTAL);
    if (voiceRef.current) voiceRef.current.currentTime = nt;
  }, []);

  const openPlayer = () => {
    sound.init(); // geste utilisateur : autorise l'audio
    seek(0);
    setOpen(true);
    setPlaying(true);
  };
  const closePlayer = useCallback(() => {
    setPlaying(false);
    sound.stopMusic();
    sound.suspend();
    setOpen(false);
  }, [sound]);
  const togglePlay = useCallback(() => {
    if (tRef.current >= TOTAL) { seek(0); setPlaying(true); return; }
    setPlaying((p) => !p);
  }, [seek]);
  const restart = () => { seek(0); setPlaying(true); };

  // Clavier + blocage du défilement de la page
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePlayer();
      if (e.key === " " || e.code === "Space") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closePlayer, togglePlay]);

  const seekFromPointer = (clientX: number) => {
    const el = barRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    seek(((clientX - r.left) / r.width) * TOTAL);
  };

  const idx = sceneIndexAt(Math.min(t, TOTAL - 0.001));
  const scene = SCENES[idx];
  const local = t - STARTS[idx];
  const sub = SUBTITLES.find((s) => t >= s.a && t < s.b);
  const Comp = scene.Comp;

  if (["admin", "partenaire", "corporate"].includes(currentPage)) return null;

  return (
    <>
      {/* Bouton flottant */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={openPlayer}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.4 }}
            className={`fixed left-4 sm:left-6 z-40 flex items-center gap-3 rounded-full pl-2 pr-5 py-2 text-left text-white shadow-[0_12px_30px_-8px_rgba(11,31,20,.6)] hover:-translate-y-0.5 transition-transform normal-case ${currentPage === "reservation" ? "bottom-24 lg:bottom-6" : "bottom-4 sm:bottom-6"}`}
            style={{ background: INK, fontFamily: "inherit", textTransform: "none" }}
            aria-label={tr({ fr: "Voir le tutoriel : comment réserver", en: "Watch the tutorial: how to book" })}
          >
            <span className="relative flex h-10 w-10 items-center justify-center">
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${GREEN}` }}
                animate={{ scale: [1, 1.45], opacity: [0.9, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full" style={{ background: GREEN }}>
                <Play size={17} fill="#06140D" color="#06140D" className="ml-0.5" />
              </span>
            </span>
            <span className="leading-tight">
              <span className="font-display block text-[15px] tracking-wide">{tr({ fr: "Comment réserver ?", en: "How to book?" })}</span>
              <span className="block text-[11px] text-white/65">{tr({ fr: "Tutoriel animé · 1 min", en: "Animated guide · 1 min" })}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Lecteur */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(11,31,20,.72)" }} onClick={closePlayer} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={tr({ fr: "Tutoriel : comment réserver", en: "Tutorial: how to book" })}
              className="relative rounded-3xl bg-white overflow-hidden shadow-2xl"
              style={{ width: "min(560px, calc(100vw - 32px), calc(100vh - 170px))" }}
              initial={{ opacity: 0, y: 40, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
            >
              {/* En-tête */}
              <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "#E6EBE8" }}>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[15px] leading-tight" style={{ color: INK }}>{tr({ fr: "Comment réserver sur EASY", en: "How to book with EASY" })}</div>
                  <div className="text-[12px] truncate" style={{ color: MUTED }}>
                    {tr({ fr: "Étape", en: "Step" })} {idx + 1}/{SCENES.length} · {tr(scene.chapter)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePlayer}
                  className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center hover:bg-[#F1F5F2] transition-colors"
                  aria-label={tr({ fr: "Fermer", en: "Close" })}
                >
                  <X size={18} color={INK} />
                </button>
              </div>

              {/* Scène */}
              <div ref={stageRef} className="relative w-full aspect-square overflow-hidden select-none" style={{ background: LIGHT }} onClick={togglePlay}>
                <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE, height: STAGE, transform: `scale(${stageW / STAGE})` }}>
                  <AnimatePresence initial={false}>
                    <motion.div
                      key={scene.id}
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <Comp t={local} tr={tr} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Sous-titres (hors échelle pour rester lisibles) */}
                <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
                  <AnimatePresence mode="wait">
                    {sub && !ended && (
                      <motion.span
                        key={sub.a}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25 }}
                        className="max-w-[92%] rounded-xl px-3.5 py-2 text-center text-[13px] sm:text-[15px] leading-snug text-white"
                        style={{ background: "rgba(11,31,20,.88)" }}
                      >
                        {tr(sub)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Écran de fin */}
                <AnimatePresence>
                  {ended && (
                    <motion.div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
                      style={{ background: "rgba(11,31,20,.86)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="font-display text-white text-[22px] sm:text-[28px]">{tr({ fr: "À vous de jouer !", en: "Your turn!" })}</div>
                      <div className="flex flex-wrap justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => { closePlayer(); onNavigate("reservation"); }}
                          className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                          style={{ background: GREEN, color: "#06140D" }}
                        >
                          {tr({ fr: "Réserver maintenant", en: "Book now" })} <ArrowRight size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={restart}
                          className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/10"
                        >
                          <RotateCcw size={16} /> {tr({ fr: "Revoir", en: "Replay" })}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Contrôles */}
              <div className="px-4 pt-3 pb-4">
                <div
                  ref={barRef}
                  className="relative h-5 cursor-pointer touch-none"
                  onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); seekFromPointer(e.clientX); }}
                  onPointerMove={(e) => { if (dragging.current) seekFromPointer(e.clientX); }}
                  onPointerUp={() => { dragging.current = false; }}
                  role="slider"
                  aria-label={tr({ fr: "Progression", en: "Progress" })}
                  aria-valuemin={0}
                  aria-valuemax={Math.round(TOTAL)}
                  aria-valuenow={Math.round(t)}
                >
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full" style={{ background: "#E6EBE8" }} />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full" style={{ width: `${(t / TOTAL) * 100}%`, background: GREEN }} />
                  {STARTS.slice(1).map((s) => (
                    <span key={s} className="absolute top-1/2 -translate-y-1/2 h-1.5 w-[2px] bg-white" style={{ left: `${(s / TOTAL) * 100}%` }} />
                  ))}
                  <span
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
                    style={{ left: `${(t / TOTAL) * 100}%`, border: `2px solid ${GREEN}` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ background: INK }}
                    aria-label={playing ? tr({ fr: "Pause", en: "Pause" }) : tr({ fr: "Lecture", en: "Play" })}
                  >
                    {playing ? <Pause size={17} color="#fff" fill="#fff" /> : <Play size={17} color="#fff" fill="#fff" className="ml-0.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={restart}
                    className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-[#F1F5F2]"
                    aria-label={tr({ fr: "Recommencer", en: "Restart" })}
                  >
                    <RotateCcw size={17} color={INK} />
                  </button>
                  <span className="text-[12px] tabular-nums" style={{ color: MUTED }}>{mmss(t)} / {mmss(TOTAL)}</span>
                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    className="ml-auto h-10 w-10 rounded-full flex items-center justify-center hover:bg-[#F1F5F2]"
                    aria-label={muted ? tr({ fr: "Activer le son", en: "Unmute" }) : tr({ fr: "Couper le son", en: "Mute" })}
                  >
                    {muted ? <VolumeX size={18} color={INK} /> : <Volume2 size={18} color={INK} />}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
