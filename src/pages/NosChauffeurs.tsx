/**
 * Page « Nos chauffeurs » — refonte UI/UX 2026.
 * Thème clair aligné sur l'accueil (charte vert/blanc), premium & moderne.
 * Hero en illustration plate (flat design, pas de photo de personnes).
 * Vrais portraits de l'équipe (badges SAVER) ; aucune donnée inventée.
 */
import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { ShieldCheck, Gauge, UserCheck, BadgeCheck, MapPin, ArrowRight, PhoneCall, Leaf } from "lucide-react";
import { motion } from "motion/react";

import showcaseImg from "../assets/saver/fleet-13.jpg";
import jacquesImg from "../assets/saver/chauffeur-jacques.jpg";
import yeoImg from "../assets/saver/chauffeur-yeo.jpg";
import traoreImg from "../assets/saver/chauffeur-traore.jpg";

const GREEN = "#00C853";
const INK = "#0B1F14";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6 },
};

// Illustration plate (flat design) : berline électrique sur la route, charte verte.
const HeroArt: React.FC = () => (
  <svg viewBox="0 0 440 400" className="w-full h-auto" role="img" aria-label="Mobilité électrique">
    <defs>
      <clipPath id="nc-panel"><rect x="0" y="0" width="440" height="400" rx="28" /></clipPath>
    </defs>
    <g clipPath="url(#nc-panel)">
      {/* ciel */}
      <rect width="440" height="400" fill="#EAF9F1" />
      {/* soleil / halo */}
      <g className="nc-pulse">
        <circle cx="350" cy="80" r="46" fill="#00C853" opacity="0.16" />
        <circle cx="350" cy="80" r="26" fill="#00C853" opacity="0.22" />
      </g>
      {/* immeubles */}
      <g fill="#0B1F14" opacity="0.07">
        <rect x="30" y="150" width="46" height="110" rx="5" />
        <rect x="84" y="118" width="34" height="142" rx="5" />
        <rect x="300" y="138" width="40" height="122" rx="5" />
        <rect x="348" y="166" width="30" height="94" rx="5" />
      </g>
      {/* sol */}
      <rect x="0" y="250" width="440" height="150" fill="#D7F2E3" />
      {/* route */}
      <path d="M150 250 L290 250 L400 400 L40 400 Z" fill="#0B1F14" />
      <path d="M150 250 L140 250 L20 400 L40 400 Z" fill="#00C853" opacity="0.85" />
      <path d="M290 250 L300 250 L420 400 L400 400 Z" fill="#00C853" opacity="0.85" />
      {/* pointillés */}
      <g fill="#ffffff" opacity="0.85">
        <rect x="216" y="258" width="8" height="16" rx="4" />
        <rect x="214" y="286" width="12" height="20" rx="5" />
        <rect x="211" y="322" width="18" height="26" rx="6" />
        <rect x="206" y="364" width="28" height="30" rx="8" />
      </g>
      {/* voiture (vue arrière) */}
      <g className="nc-bob">
        <ellipse cx="220" cy="332" rx="92" ry="16" fill="#06140D" opacity="0.22" />
        <path d="M146 326 L146 292 C146 270 160 256 182 252 L258 252 C280 256 294 270 294 292 L294 326 C294 332 289 336 283 336 L157 336 C151 336 146 332 146 326 Z" fill="#ffffff" />
        <path d="M176 256 C182 240 192 232 208 232 L232 232 C248 232 258 240 264 256 Z" fill="#ffffff" />
        <path d="M186 254 C190 242 198 237 210 237 L230 237 C242 237 250 242 254 254 Z" fill="#0B1F14" opacity="0.85" />
        <path d="M196 252 C199 244 205 241 212 241 L228 241 C235 241 241 244 244 252 Z" fill="#2b5d47" opacity="0.5" />
        <rect x="150" y="300" width="140" height="3" rx="1.5" fill="#E3E8E5" />
        <rect x="152" y="292" width="26" height="12" rx="6" fill="#00C853" />
        <rect x="262" y="292" width="26" height="12" rx="6" fill="#FF7A1A" />
        <rect x="150" y="318" width="140" height="14" rx="7" fill="#EDF1EE" />
        <rect x="198" y="319" width="44" height="12" rx="2" fill="#ffffff" stroke="#00C853" strokeWidth="1.5" />
        <rect x="160" y="332" width="26" height="10" rx="5" fill="#0B1F14" />
        <rect x="254" y="332" width="26" height="10" rx="5" fill="#0B1F14" />
      </g>
      {/* badge éclair recharge */}
      <g className="nc-pulse" transform="translate(96 98)">
        <circle r="22" fill="#ffffff" />
        <circle r="22" fill="none" stroke="#00C853" strokeWidth="3" />
        <path d="M2 -11 L-7 2 L-1 2 L-3 11 L7 -3 L1 -3 Z" fill="#00C853" />
      </g>
      {/* feuille */}
      <g transform="translate(372 304)">
        <path d="M0 0 C18 -22 44 -20 54 -4 C40 14 14 14 0 0 Z" fill="#00C853" opacity="0.28" />
      </g>
    </g>
  </svg>
);

// Motifs décoratifs animés (orange + vert) pour l'arrière-plan du hero.
const HeroMotifs: React.FC = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="nc-float absolute top-28 left-[40%] h-16 w-16 rounded-full border-[6px]" style={{ borderColor: "rgba(255,122,26,0.22)" }} />
    <div className="nc-floatx absolute top-44 left-[7%] h-4 w-4 rounded-full" style={{ background: "rgba(0,200,83,0.35)" }} />
    <div className="nc-float absolute bottom-28 left-[44%] h-5 w-5 rotate-12 rounded-md" style={{ background: "rgba(255,122,26,0.22)" }} />
    <svg className="nc-floatx absolute top-24 right-[3%]" width="88" height="90">
      <g fill="#FF7A1A" opacity="0.4">
        {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => <circle key={`${r}-${c}`} cx={6 + c * 20} cy={6 + r * 20} r="3" />))}
      </g>
    </svg>
    <svg className="nc-float absolute bottom-16 right-[40%]" width="120" height="24" fill="none">
      <path d="M2 12 C20 2 30 22 48 12 C66 2 76 22 94 12 C104 7 112 10 118 12" stroke="#00C853" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
    </svg>
    <svg className="nc-floatx absolute bottom-40 left-[12%]" width="22" height="22" stroke="#FF7A1A" strokeWidth="3" strokeLinecap="round" opacity="0.4">
      <path d="M11 3 V19 M3 11 H19" />
    </svg>
  </div>
);

interface Driver {
  id: string;
  name: string;
  photo: string;
}

export const NosChauffeurs: React.FC<{ id: string }> = ({ id }) => {
  const { translate } = useLanguage();

  const drivers: Driver[] = [
    { id: "drv_jacques", name: "Gbemonto Jacques", photo: jacquesImg },
    { id: "drv_yeo", name: "Yeo Navigue Abou", photo: yeoImg },
    { id: "drv_traore", name: "Traore Abdoul", photo: traoreImg },
  ];

  const values = [
    {
      icon: <UserCheck size={22} />,
      t: translate({ fr: "Chauffeurs vérifiés", en: "Verified chauffeurs" }),
      d: translate({
        fr: "Chaque chauffeur EASY est formé, identifié et porteur d'un badge officiel SAVER.",
        en: "Every EASY chauffeur is trained, identified and carries an official SAVER badge.",
      }),
    },
    {
      icon: <Gauge size={22} />,
      t: translate({ fr: "Suivi en temps réel", en: "Real-time tracking" }),
      d: translate({
        fr: "Position du chauffeur et état de la course suivis en direct, pour une sérénité totale.",
        en: "Driver location and ride status tracked live, for total peace of mind.",
      }),
    },
    {
      icon: <ShieldCheck size={22} />,
      t: translate({ fr: "Sécurité & discrétion", en: "Safety & discretion" }),
      d: translate({
        fr: "Conduite défensive, ponctualité et confidentialité à chaque trajet.",
        en: "Defensive driving, punctuality and confidentiality on every trip.",
      }),
    },
  ];

  return (
    <div id={id} className="bg-white text-[#0B1F14] font-sans -mt-[69px] lg:-mt-[81px]">
      <style>{`
        @keyframes nc-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes nc-pulse { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes nc-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes nc-floatx { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
        .nc-bob{animation:nc-bob 3.4s ease-in-out infinite}
        .nc-pulse{animation:nc-pulse 2.8s ease-in-out infinite}
        .nc-float{animation:nc-float 7s ease-in-out infinite}
        .nc-floatx{animation:nc-floatx 9s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){ .nc-bob,.nc-pulse,.nc-float,.nc-floatx{animation:none!important} }
      `}</style>
      {/* ====================== HERO (flat design) ====================== */}
      <section className="relative overflow-hidden bg-[#F4F8F5] lg:min-h-[88vh]">
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(0,200,83,0.16), transparent)" }} />
        <div className="pointer-events-none absolute -bottom-28 -left-24 w-96 h-96 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(255,122,26,0.14), transparent)" }} />
        <HeroMotifs />

        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 pt-28 lg:pt-36 pb-16 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Texte */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 ring-1 ring-[#E6EBE8] shadow-sm"
            >
              <ShieldCheck size={14} style={{ color: GREEN }} />
              <span className="text-[11px] font-semibold tracking-[0.15em] text-[#0B1F14] uppercase">
                {translate({ fr: "Une équipe, pas des inconnus", en: "A team, not strangers" })}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]"
            >
              {translate({ fr: "Nos chauffeurs", en: "Our chauffeurs" })}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-4 max-w-xl text-base sm:text-lg text-[#5B6B62] leading-relaxed"
            >
              {translate({
                fr: "Des professionnels formés et identifiés, au volant d'une flotte 100 % électrique. Ponctualité, sécurité et discrétion à chaque trajet dans Abidjan.",
                en: "Trained, identified professionals driving a 100% electric fleet. Punctuality, safety and discretion on every trip across Abidjan.",
              })}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-7 flex flex-col sm:flex-row gap-3"
            >
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-[#06140D] shadow-lg transition-transform active:scale-[0.98]"
                style={{ background: GREEN }}
              >
                <PhoneCall size={18} /> {translate({ fr: "Nous contacter", en: "Contact us" })}
              </a>
              <a
                href="#reservation"
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-[#0B1F14] ring-1 ring-[#D7E0DA] hover:bg-white transition-colors"
              >
                {translate({ fr: "Réserver une course", en: "Book a ride" })} <ArrowRight size={16} />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-8 flex flex-wrap gap-2.5"
            >
              {[
                translate({ fr: "100 % électrique", en: "100% electric" }),
                translate({ fr: "Chauffeurs badgés", en: "Badged chauffeurs" }),
                translate({ fr: "Service à Abidjan", en: "Service in Abidjan" }),
              ].map((c) => (
                <span key={c} className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0B1F14] ring-1 ring-[#E6EBE8]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
                  {c}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative mx-auto w-full max-w-md"
          >
            <HeroArt />
          </motion.div>
        </div>
      </section>

      {/* ====================== VALEURS ====================== */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fade} className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {translate({ fr: "Une conduite à la hauteur de la marque.", en: "Driving worthy of the brand." })}
            </h2>
            <p className="mt-3 text-[#5B6B62] text-lg">
              {translate({ fr: "Formés, identifiés et suivis — pour que chaque course inspire confiance.", en: "Trained, identified and monitored — so every ride inspires trust." })}
            </p>
          </motion.div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {values.map((v, i) => (
              <motion.div
                key={v.t}
                {...fade}
                transition={{ ...fade.transition, delay: i * 0.08 }}
                className="rounded-2xl bg-[#F4F8F5] p-6 ring-1 ring-[#E6EBE8] hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[#06140D]" style={{ background: GREEN }}>
                  {v.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold">{v.t}</h3>
                <p className="mt-2 text-sm text-[#5B6B62] leading-relaxed">{v.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== L'ÉQUIPE ====================== */}
      <section className="bg-[#F4F8F5]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fade} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: GREEN }}>
              <Leaf size={14} /> {translate({ fr: "L'ÉQUIPE EASY", en: "THE EASY TEAM" })}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              {translate({ fr: "Les visages au volant", en: "The faces behind the wheel" })}
            </h2>
            <p className="mt-3 text-[#5B6B62]">
              {translate({ fr: "Des chauffeurs de confiance, identifiés par un badge officiel SAVER.", en: "Trusted chauffeurs, identified by an official SAVER badge." })}
            </p>
          </motion.div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((d, i) => (
              <motion.div
                key={d.id}
                {...fade}
                transition={{ ...fade.transition, delay: i * 0.08 }}
                className="group relative aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-black/5 shadow-md hover:shadow-2xl transition-all duration-300"
              >
                <img
                  src={d.photo}
                  alt={d.name}
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,20,13,0.92) 0%, rgba(6,20,13,0.25) 45%, transparent 72%)" }} />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-[#06140D] ring-1 ring-black/5">
                  <BadgeCheck size={13} style={{ color: GREEN }} /> {translate({ fr: "Vérifié", en: "Verified" })}
                </span>
                <span className="absolute top-3 right-4 text-sm font-extrabold text-white/55">0{i + 1}</span>
                <div className="absolute left-5 right-5 bottom-5">
                  <div className="h-1 w-10 rounded-full mb-3 transition-all duration-300 group-hover:w-16" style={{ background: GREEN }} />
                  <h3 className="text-xl font-extrabold text-white leading-tight">{d.name}</h3>
                  <div className="mt-1.5 flex items-center gap-2 text-sm text-white/80">
                    <span>{translate({ fr: "Chauffeur", en: "Chauffeur" })}</span>
                    <span className="opacity-40">•</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={13} style={{ color: GREEN }} /> Abidjan</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== SHOWCASE (sécurité / confort) ====================== */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div {...fade} className="relative order-2 lg:order-1">
            <img src={showcaseImg} alt="" className="rounded-3xl w-full object-cover aspect-[4/3] shadow-xl" />
          </motion.div>
          <motion.div {...fade} className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: GREEN }}>
              <ShieldCheck size={14} /> {translate({ fr: "SÉRÉNITÉ GARANTIE", en: "GUARANTEED SERENITY" })}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              {translate({ fr: "Des trajets sûrs, silencieux et ponctuels.", en: "Safe, silent and punctual rides." })}
            </h2>
            <p className="mt-4 text-[#5B6B62] text-lg leading-relaxed">
              {translate({
                fr: "Nos chauffeurs maîtrisent les voies d'Abidjan et la conduite défensive. Au volant de véhicules 100 % électriques, ils vous offrent un confort absolu, sans bruit ni émission.",
                en: "Our chauffeurs master Abidjan's roads and defensive driving. Behind the wheel of 100% electric vehicles, they deliver absolute comfort, with no noise or emissions.",
              })}
            </p>
            <ul className="mt-6 space-y-3">
              {[
                translate({ fr: "Chauffeurs identifiés par badge officiel", en: "Chauffeurs identified by official badge" }),
                translate({ fr: "Suivi GPS et statut de course en direct", en: "Live GPS tracking and ride status" }),
                translate({ fr: "Discrétion et courtoisie garanties", en: "Guaranteed discretion and courtesy" }),
              ].map((x) => (
                <li key={x} className="flex items-center gap-3 text-[#0B1F14]">
                  <BadgeCheck size={18} style={{ color: GREEN }} className="shrink-0" />
                  <span className="text-sm">{x}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ====================== CTA ====================== */}
      <section style={{ background: INK }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-20 text-center">
          <motion.h2 {...fade} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {translate({ fr: "Besoin d'un chauffeur de confiance ?", en: "Need a trusted chauffeur?" })}
          </motion.h2>
          <motion.p {...fade} className="mt-3 text-white/70 text-lg">
            {translate({ fr: "Réservez votre course ou parlez-nous de vos besoins.", en: "Book your ride or tell us about your needs." })}
          </motion.p>
          <motion.div {...fade} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#reservation"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-[#06140D] shadow-lg transition-transform active:scale-[0.98]"
              style={{ background: GREEN }}
            >
              {translate({ fr: "Réserver une course", en: "Book a ride" })} <ArrowRight size={16} />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/10 transition-colors"
            >
              <PhoneCall size={18} /> {translate({ fr: "Nous contacter", en: "Contact us" })}
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
