/**
 * Page « Nos chauffeurs » — refonte UI/UX 2026.
 * Thème clair aligné sur l'accueil (charte vert/blanc), premium & moderne.
 * Hero en illustration plate (flat design, pas de photo de personnes).
 * Vrais portraits de l'équipe (badges SAVER) ; aucune donnée inventée.
 */
import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { ShieldCheck, Gauge, UserCheck, BadgeCheck, MapPin, ArrowRight, PhoneCall, Leaf, GraduationCap, Cpu, BookOpen, BatteryCharging } from "lucide-react";
import { motion } from "motion/react";

import showcaseImg from "../assets/saver/showcase-illustration.jpg";
import jacquesImg from "../assets/saver/chauffeur-jacques.jpg";
import yeoImg from "../assets/saver/chauffeur-yeo.jpg";
import traoreImg from "../assets/saver/chauffeur-traore.jpg";
import heroIllu from "../assets/saver/chauffeur-illustration.png";
import fComposants from "../assets/saver/formation-composants.jpg";
import fHistoire from "../assets/saver/formation-histoire.jpg";
import fMoteur from "../assets/saver/formation-moteur.jpg";
import fConduite from "../assets/saver/formation-conduite.jpg";

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
        {/* toit */}
        <path d="M170 254 C176 230 190 222 208 222 L232 222 C250 222 264 230 270 254 Z" fill="#ffffff" />
        {/* vitre arrière (claire) */}
        <path d="M182 252 C187 234 198 228 210 228 L230 228 C242 228 253 234 258 252 Z" fill="#D7E8EA" />
        {/* appuis-tête */}
        <rect x="193" y="236" width="14" height="18" rx="6" fill="#0B1F14" opacity="0.85" />
        <rect x="233" y="236" width="14" height="18" rx="6" fill="#0B1F14" opacity="0.85" />
        {/* chauffeur noir (vu de dos) */}
        <path d="M202 252 C204 243 211 239 220 239 C229 239 236 243 238 252 Z" fill="#0B1F14" />
        <circle cx="220" cy="240" r="9" fill="#5A3B23" />
        <path d="M211 240 C211 232 229 232 229 240 C229 235 225 233 220 233 C215 233 211 235 211 240 Z" fill="#141414" />
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

// Motifs décoratifs (orange + vert), statiques, en arrière-plan du hero.
const HeroMotifs: React.FC = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute top-28 left-[40%] h-16 w-16 rounded-full border-[6px]" style={{ borderColor: "rgba(255,122,26,0.35)" }} />
    <div className="absolute top-44 left-[7%] h-4 w-4 rounded-full" style={{ background: "rgba(0,200,83,0.45)" }} />
    <div className="absolute bottom-28 left-[44%] h-5 w-5 rotate-12 rounded-md" style={{ background: "rgba(255,122,26,0.35)" }} />
    <svg className="absolute top-24 right-[3%]" width="88" height="90">
      <g fill="#FF7A1A" opacity="0.5">
        {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => <circle key={`${r}-${c}`} cx={6 + c * 20} cy={6 + r * 20} r="3" />))}
      </g>
    </svg>
    <svg className="absolute bottom-16 right-[40%]" width="120" height="24" fill="none">
      <path d="M2 12 C20 2 30 22 48 12 C66 2 76 22 94 12 C104 7 112 10 118 12" stroke="#00C853" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
    </svg>
    <svg className="absolute bottom-40 left-[12%]" width="22" height="22" stroke="#FF7A1A" strokeWidth="3" strokeLinecap="round" opacity="0.5">
      <path d="M11 3 V19 M3 11 H19" />
    </svg>
  </div>
);

// Décor d'arrière-plan « coloré » (style TOUT EASY) adapté au fond clair :
// blobs vert/orange, hachures, amas de points, ondulations, squiggle.
const SectionDecor: React.FC<{ id: string }> = ({ id }) => (
  <svg aria-hidden className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id={`${id}-hatch`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="14" stroke="#0B1F14" strokeWidth="1.5" />
      </pattern>
      <pattern id={`${id}-dots`} width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="3" fill="#00A846" />
      </pattern>
      <clipPath id={`${id}-blob`}>
        <path d="M150 300 C120 180 250 90 420 110 C600 130 650 60 820 120 C980 175 1000 330 880 420 C760 510 560 470 400 500 C230 530 170 430 150 300 Z" />
      </clipPath>
    </defs>

    {/* blob vert + hachures */}
    <path d="M150 300 C120 180 250 90 420 110 C600 130 650 60 820 120 C980 175 1000 330 880 420 C760 510 560 470 400 500 C230 530 170 430 150 300 Z" fill="#00C853" opacity="0.09" />
    <g clipPath={`url(#${id}-blob)`} opacity="0.07">
      <rect x="150" y="60" width="760" height="320" fill={`url(#${id}-hatch)`} />
    </g>

    {/* blob orange */}
    <path d="M820 380 C900 320 1050 330 1080 420 C1110 510 1000 560 900 540 C800 520 760 440 820 380 Z" fill="#FF7A1A" opacity="0.10" />

    {/* amas de points */}
    <rect x="985" y="55" width="170" height="120" fill={`url(#${id}-dots)`} opacity="0.4" />

    {/* ondulations orange */}
    <path d="M60 470 C140 450 200 500 280 480 C360 460 420 510 500 490" fill="none" stroke="#FF7A1A" strokeWidth="2.5" opacity="0.28" />
    <path d="M60 500 C140 480 200 530 280 510 C360 490 420 540 500 520" fill="none" stroke="#FF7A1A" strokeWidth="2.5" opacity="0.2" />

    {/* faisceau de lignes */}
    <g stroke="#0B1F14" strokeWidth="2" opacity="0.1">
      <line x1="40" y1="90" x2="130" y2="60" />
      <line x1="45" y1="110" x2="135" y2="80" />
      <line x1="50" y1="130" x2="140" y2="100" />
    </g>

    {/* squiggle pointillé */}
    <path d="M560 150 C600 120 620 180 660 150 C700 120 720 180 760 150" fill="none" stroke="#0B1F14" strokeWidth="2" strokeDasharray="5 6" opacity="0.14" />
  </svg>
);

// Grandes illustrations animées (trait blanc) pour les 3 tuiles de valeurs.
const AnimVerified: React.FC = () => (
  <svg viewBox="0 0 140 140" className="w-40 h-40" aria-hidden>
    <circle className="nc-ping" cx="70" cy="62" r="34" fill="none" stroke="#fff" strokeWidth="2" />
    {/* rubans */}
    <path d="M56 92 L50 126 L64 115 L70 130 L70 92 Z" fill="#fff" opacity="0.85" />
    <path d="M84 92 L90 126 L76 115 L70 130 L70 92 Z" fill="#fff" opacity="0.6" />
    {/* badge */}
    <circle cx="70" cy="62" r="34" fill="rgba(255,255,255,0.14)" stroke="#fff" strokeWidth="3" />
    <circle cx="70" cy="62" r="25" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
    <path className="nc-check" d="M57 63 L67 73 L85 50" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    {/* étincelle */}
    <g className="nc-twinkle"><path d="M110 34 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5 z" fill="#fff" /></g>
  </svg>
);

const AnimTracking: React.FC = () => (
  <svg viewBox="0 0 140 140" className="w-40 h-40" aria-hidden>
    <rect x="16" y="22" width="108" height="94" rx="14" fill="rgba(255,255,255,0.08)" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
    <path className="nc-route" d="M34 96 C54 60 86 104 110 50" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    <circle cx="34" cy="96" r="5" fill="#fff" />
    {/* pin arrivée */}
    <circle className="nc-ping" cx="110" cy="52" r="13" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M110 32 C103 32 97 38 97 45 C97 56 110 70 110 70 C110 70 123 56 123 45 C123 38 117 32 110 32 Z" fill="#fff" />
    <circle cx="110" cy="45" r="4.5" fill="#0B1F14" />
    {/* voiture qui avance */}
    <circle className="nc-move" cx="0" cy="0" r="6" fill="#00C853" stroke="#fff" strokeWidth="2.5" />
  </svg>
);

const AnimShield: React.FC = () => (
  <svg viewBox="0 0 150 168" className="w-44 h-44" aria-hidden>
    <defs>
      <clipPath id="nc-shieldclip"><path d="M75 46 L112 58 L112 94 C112 122 75 142 75 142 C75 142 38 122 38 94 L38 58 Z" /></clipPath>
    </defs>
    {/* anneaux d'ancrage fixes */}
    <circle cx="48" cy="14" r="5" fill="none" stroke="#fff" strokeWidth="3" />
    <circle cx="102" cy="14" r="5" fill="none" stroke="#fff" strokeWidth="3" />
    {/* ensemble suspendu qui se balance */}
    <g className="nc-swing">
      <g stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.9">
        <line x1="48" y1="19" x2="60" y2="50" />
        <line x1="102" y1="19" x2="90" y2="50" />
      </g>
      <g fill="#fff" opacity="0.85">
        <ellipse cx="51" cy="29" rx="3.2" ry="4.6" />
        <ellipse cx="55" cy="40" rx="3.2" ry="4.6" />
        <ellipse cx="99" cy="29" rx="3.2" ry="4.6" />
        <ellipse cx="95" cy="40" rx="3.2" ry="4.6" />
      </g>
      {/* bouclier */}
      <path d="M75 46 L112 58 L112 94 C112 122 75 142 75 142 C75 142 38 122 38 94 L38 58 Z" fill="#0B1F14" stroke="#fff" strokeWidth="3" />
      <path d="M75 54 L104 64 L104 92 C104 114 75 130 75 130 C75 130 46 114 46 92 L46 64 Z" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
      {/* rivets */}
      <circle cx="47" cy="63" r="2" fill="#fff" opacity="0.7" />
      <circle cx="103" cy="63" r="2" fill="#fff" opacity="0.7" />
      {/* reflet */}
      <g clipPath="url(#nc-shieldclip)"><g transform="skewX(-20)"><rect className="nc-shine" x="0" y="40" width="22" height="130" fill="#fff" opacity="0.22" /></g></g>
      {/* trou de serrure */}
      <g className="nc-glow" fill="#fff">
        <circle cx="75" cy="88" r="9" />
        <path d="M71.5 93 L78.5 93 L81 109 L69 109 Z" />
      </g>
    </g>
  </svg>
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
      art: <AnimVerified />,
      grad: "linear-gradient(135deg,#00C853,#00A846)",
      t: translate({ fr: "Chauffeurs vérifiés", en: "Verified chauffeurs" }),
      d: translate({
        fr: "Chaque chauffeur EASY est formé, identifié et porteur d'un badge officiel SAVER.",
        en: "Every EASY chauffeur is trained, identified and carries an official SAVER badge.",
      }),
    },
    {
      art: <AnimTracking />,
      grad: "linear-gradient(135deg,#0B1F14,#15402b)",
      t: translate({ fr: "Suivi en temps réel", en: "Real-time tracking" }),
      d: translate({
        fr: "Position du chauffeur et état de la course suivis en direct, pour une sérénité totale.",
        en: "Driver location and ride status tracked live, for total peace of mind.",
      }),
    },
    {
      art: <AnimShield />,
      grad: "linear-gradient(135deg,#FF7A1A,#E15A00)",
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
        @keyframes nc-check { 0%{stroke-dashoffset:70} 45%{stroke-dashoffset:0} 82%{stroke-dashoffset:0} 100%{stroke-dashoffset:70} }
        @keyframes nc-ping { 0%{transform:scale(.5);opacity:.7} 100%{transform:scale(2);opacity:0} }
        @keyframes nc-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes nc-route { 0%{stroke-dashoffset:200} 55%{stroke-dashoffset:0} 100%{stroke-dashoffset:0} }
        @keyframes nc-move { 0%{offset-distance:0%;opacity:0} 10%{opacity:1} 70%{offset-distance:100%;opacity:1} 100%{offset-distance:100%;opacity:0} }
        @keyframes nc-shine { 0%{transform:translateX(-20px)} 55%,100%{transform:translateX(150px)} }
        @keyframes nc-twinkle { 0%,100%{transform:scale(.6);opacity:.3} 50%{transform:scale(1);opacity:1} }
        @keyframes nc-swing { 0%,100%{transform:rotate(-3.5deg)} 50%{transform:rotate(3.5deg)} }
        @keyframes nc-glow { 0%,100%{opacity:.7} 50%{opacity:1} }
        .nc-check{stroke-dasharray:70;animation:nc-check 3.4s ease-in-out infinite}
        .nc-ping{transform-box:fill-box;transform-origin:center;animation:nc-ping 2.4s ease-out infinite}
        .nc-breathe{transform-box:fill-box;transform-origin:center;animation:nc-breathe 3s ease-in-out infinite}
        .nc-route{stroke-dasharray:200;animation:nc-route 3.4s ease-in-out infinite}
        .nc-move{offset-path:path("M34 96 C54 60 86 104 110 50");animation:nc-move 3.4s ease-in-out infinite}
        .nc-shine{animation:nc-shine 3.6s ease-in-out infinite}
        .nc-twinkle{transform-box:fill-box;transform-origin:center;animation:nc-twinkle 2.6s ease-in-out infinite}
        .nc-swing{transform-box:fill-box;transform-origin:center top;animation:nc-swing 3.4s ease-in-out infinite}
        .nc-glow{animation:nc-glow 2.2s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){ .nc-check,.nc-ping,.nc-breathe,.nc-route,.nc-move,.nc-shine,.nc-twinkle,.nc-swing,.nc-glow{animation:none!important} .nc-check,.nc-route{stroke-dashoffset:0} }
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
            <img src={heroIllu} alt="Chauffeur EASY et passagère dans un véhicule électrique" className="w-full h-auto drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)]" />
          </motion.div>
        </div>
      </section>

      {/* ====================== VALEURS ====================== */}
      <section className="relative overflow-hidden bg-[#F4F8F5]">
        <SectionDecor id="dec-valeurs" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fade} className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {translate({ fr: "Une conduite à la hauteur de la marque.", en: "Driving worthy of the brand." })}
            </h2>
            <p className="mt-3 text-[#5B6B62] text-lg">
              {translate({ fr: "Formés, identifiés et suivis — pour que chaque course inspire confiance.", en: "Trained, identified and monitored — so every ride inspires trust." })}
            </p>
          </motion.div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.t}
                {...fade}
                transition={{ ...fade.transition, delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-3xl p-8 text-white shadow-xl hover:-translate-y-1.5 transition-transform duration-300"
                style={{ background: v.grad }}
              >
                <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-white/[0.06]" />
                <div className="relative flex h-44 items-center justify-center">{v.art}</div>
                <h3 className="relative text-xl font-extrabold">{v.t}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-white/85">{v.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== L'ÉQUIPE ====================== */}
      <section className="relative overflow-hidden bg-[#F4F8F5]">
        <SectionDecor id="dec-equipe" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-20">
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

      {/* ====================== FORMATION ====================== */}
      <section className="relative overflow-hidden bg-[#F4F8F5]">
        <SectionDecor id="dec-formation" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fade} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: GREEN }}>
              <GraduationCap size={14} /> {translate({ fr: "FORMATION EASY", en: "EASY TRAINING" })}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              {translate({ fr: "Des chauffeurs qui connaissent leur véhicule.", en: "Chauffeurs who truly know their vehicle." })}
            </h2>
            <p className="mt-3 text-[#5B6B62] text-lg">
              {translate({
                fr: "Chez EASY, nos chauffeurs ne se contentent pas de conduire : ils sont formés à la compréhension complète des véhicules — composants, contexte historique, moteur électrique et bien plus.",
                en: "At EASY, our chauffeurs don't just drive: they are trained to fully understand the vehicles — components, historical context, electric motor and much more.",
              })}
            </p>
          </motion.div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                img: fComposants,
                t: translate({ fr: "Composants & mécanique", en: "Components & mechanics" }),
                d: translate({ fr: "Comprendre chaque pièce du véhicule, son rôle et son entretien.", en: "Understanding each part of the vehicle, its role and upkeep." }),
              },
              {
                img: fHistoire,
                t: translate({ fr: "Contexte & histoire", en: "Context & history" }),
                d: translate({ fr: "Connaître l'histoire et le contexte de chaque modèle de la flotte.", en: "Knowing the history and context of each model in the fleet." }),
              },
              {
                img: fMoteur,
                t: translate({ fr: "Moteur & batterie", en: "Motor & battery" }),
                d: translate({ fr: "Maîtriser le moteur électrique, la batterie et la recharge.", en: "Mastering the electric motor, the battery and charging." }),
              },
              {
                img: fConduite,
                t: translate({ fr: "Conduite & autonomie", en: "Driving & range" }),
                d: translate({ fr: "Éco-conduite et conduite défensive pour optimiser chaque trajet.", en: "Eco-driving and defensive driving to optimise every trip." }),
              },
            ].map((f, i) => (
              <motion.div
                key={f.t}
                {...fade}
                transition={{ ...fade.transition, delay: i * 0.08 }}
                className="group rounded-2xl bg-white ring-1 ring-[#E6EBE8] overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <img src={f.img} alt={f.t} className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                <div className="p-5">
                  <h3 className="text-base font-bold">{f.t}</h3>
                  <p className="mt-2 text-sm text-[#5B6B62] leading-relaxed">{f.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== SHOWCASE (sécurité / confort) ====================== */}
      <section className="relative overflow-hidden bg-[#F4F8F5]">
        <SectionDecor id="dec-showcase" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div {...fade} className="relative order-2 lg:order-1">
            <img src={showcaseImg} alt="Passager serein conduit par un chauffeur EASY dans Abidjan" className="rounded-3xl w-full h-auto shadow-xl ring-1 ring-black/5" />
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
