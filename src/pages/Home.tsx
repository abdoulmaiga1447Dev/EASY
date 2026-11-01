/**
 * Page d'accueil (vitrine) — refonte UI/UX 2026.
 * Direction : épuré & premium (Uber/Nissan) + chaleureux (Yango), charte vert/blanc,
 * vraies photos de la flotte SAVER. Thème clair.
 */
import React from "react";
import { motion } from "motion/react";
import { Zap, BatteryCharging, MapPin, Leaf, ArrowRight, ShieldCheck, Gauge, PhoneCall, Star, Car, Users } from "lucide-react";
import heroImg from "../assets/saver/hero.png";
import hubImg from "../assets/saver/fleet-09.jpg";
import closeupImg from "../assets/saver/fleet-12.jpg";
import rideImg from "../assets/saver/fleet-13.jpg";
import rentImg from "../assets/saver/fleet-11.jpg";
import entreprisesImg from "../assets/saver/bento-entreprises.png";
import hotelsImg from "../assets/saver/bento-hotels.png";
import flotteImg from "../assets/saver/bento-flotte.png";
import rechargeImg from "../assets/saver/bento-recharge.png";
import mascotImg from "../assets/saver/impact-mascot.png";

// Charte
const GREEN = "#00C853";
const GREEN_DARK = "#00A846";
const ORANGE = "#FF7A1A";
const INK = "#0B1F14";

interface HomeProps { setCurrentPage: (page: string) => void; id?: string; }

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

// Tuiles du bento « TOUT EASY »
const BentoTile: React.FC<{ label: string; desc?: string; grad: string; icon: React.ReactNode; dark?: boolean; onClick?: () => void }> = ({ label, desc, grad, icon, dark, onClick }) => (
  <button onClick={onClick} className="relative rounded-3xl overflow-hidden text-left p-4 flex flex-col justify-between transition-transform active:scale-[0.98] hover:brightness-[1.06]" style={{ background: grad }}>
    <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${dark ? "bg-black/15" : "bg-white/20"}`}>{icon}</span>
    <span>
      <span className="block text-sm font-bold text-white leading-tight">{label}</span>
      {desc && <span className="block text-xs text-white/80 mt-0.5">{desc}</span>}
    </span>
  </button>
);

// Tuile « cartes décalées » : carte de couleur derrière (décalée bas-droite) +
// carte image au-dessus (décalée haut-gauche).
const BentoImageTile: React.FC<{ label: string; desc?: string; img: string; color: string; onClick?: () => void }> = ({ label, desc, img, color, onClick }) => (
  <button onClick={onClick} className="relative text-left group">
    <div className="absolute top-3 left-3 right-0 bottom-0 rounded-3xl" style={{ backgroundColor: color }} />
    <div className="absolute top-0 left-0 right-3 bottom-3 rounded-3xl overflow-hidden shadow-[0_12px_26px_rgba(0,0,0,0.45)] ring-1 ring-black/10">
      <img src={img} alt={label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,20,13,0.85), transparent 60%)" }} />
      <div className="absolute left-3 bottom-3">
        <div className="text-sm font-bold text-white">{label}</div>
        {desc && <div className="text-xs text-white/85">{desc}</div>}
      </div>
    </div>
  </button>
);

// Fond décoratif abstrait (style memphis) aux couleurs de la charte :
// formes organiques vert/orange + textures. `k` règle l'intensité,
// `id` isole les motifs quand plusieurs instances cohabitent sur la page.
const BentoBackdrop: React.FC<{ k?: number; id?: string }> = ({ k = 1, id = "eb" }) => (
  <svg aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
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

    {/* Blob vert + texture rayée */}
    <path d="M150 300 C120 180 250 90 420 110 C600 130 650 60 820 120 C980 175 1000 330 880 420 C760 510 560 470 400 500 C230 530 170 430 150 300 Z" fill="#00C853" opacity={0.11 * k} />
    <g clipPath={`url(#${id}-blob)`} opacity={0.1 * k}>
      <rect x="150" y="60" width="760" height="320" fill={`url(#${id}-hatch)`} />
    </g>

    {/* Blob orange */}
    <path d="M820 380 C900 320 1050 330 1080 420 C1110 510 1000 560 900 540 C800 520 760 440 820 380 Z" fill="#FF7A1A" opacity={0.13 * k} />

    {/* Amas de points */}
    <rect x="985" y="55" width="170" height="120" fill={`url(#${id}-dots)`} opacity={0.45 * k} />

    {/* Ondulations orange */}
    <path d="M60 470 C140 450 200 500 280 480 C360 460 420 510 500 490" fill="none" stroke="#FF7A1A" strokeWidth="2.5" opacity={0.32 * k} />
    <path d="M60 500 C140 480 200 530 280 510 C360 490 420 540 500 520" fill="none" stroke="#FF7A1A" strokeWidth="2.5" opacity={0.22 * k} />

    {/* Faisceau de lignes */}
    <g stroke="#0B1F14" strokeWidth="2" opacity={0.13 * k}>
      <line x1="40" y1="90" x2="130" y2="60" />
      <line x1="45" y1="110" x2="135" y2="80" />
      <line x1="50" y1="130" x2="140" y2="100" />
      <line x1="55" y1="150" x2="145" y2="120" />
    </g>

    {/* Squiggle pointillé */}
    <path d="M560 150 C600 120 620 180 660 150 C700 120 720 180 760 150" fill="none" stroke="#0B1F14" strokeWidth="2" strokeDasharray="5 6" opacity={0.16 * k} />
  </svg>
);

// Doodles décoratifs (style dessiné main) pour la bande « Notre impact » :
// couche posée AU-DESSUS du fond et SOUS le contenu (texte + photo).
// Trait vert menthe pour rester lisible sur le vert foncé.
const ImpactDoodles: React.FC = () => (
  <svg aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice"
       fill="none" stroke="#3DDC97" strokeLinecap="round" strokeLinejoin="round">
    {/* Feuille (haut gauche) */}
    <g transform="translate(70 60) rotate(-12)" opacity="0.55">
      <path d="M0 0 C22 -34 64 -34 86 -12 C64 20 22 20 0 0 Z" fill="#00C853" fillOpacity="0.14" strokeWidth="2.5" />
      <path d="M10 2 C32 -10 58 -14 76 -12" strokeWidth="2" />
    </g>

    {/* Petite voiture électrique + lignes de mouvement (gauche) */}
    <g transform="translate(70 210)" opacity="0.5" strokeWidth="2.5">
      <path d="M-18 26 h18 M-24 34 h22 M-18 42 h18" strokeWidth="2" />
      <path d="M8 42 L124 42" />
      <path d="M14 42 C14 24 24 21 40 20 C50 10 78 10 90 20 C108 21 120 26 124 42" />
      <circle cx="40" cy="44" r="9" />
      <circle cx="104" cy="44" r="9" />
    </g>

    {/* Pousse / plante (bas gauche) */}
    <g transform="translate(150 320)" opacity="0.5" strokeWidth="2.5">
      <path d="M0 40 C0 22 0 10 0 -2" />
      <path d="M0 10 C-20 4 -24 -10 -8 -14 C-4 0 -1 6 0 12 Z" fill="#00C853" fillOpacity="0.12" />
      <path d="M0 2 C20 -4 24 -18 8 -22 C4 -8 1 -2 0 4 Z" fill="#00C853" fillOpacity="0.12" />
    </g>

    {/* Étincelles / marques d'impact */}
    <g fill="#3DDC97" stroke="none">
      <path d="M360 70 C361.5 79 364 81.5 373 83 C364 84.5 361.5 87 360 96 C358.5 87 356 84.5 347 83 C356 81.5 358.5 79 360 70 Z" opacity="0.5" />
      <path d="M250 300 C251 306 253 308 259 309 C253 310 251 312 250 318 C249 312 247 310 241 309 C247 308 249 306 250 300 Z" opacity="0.45" />
      <path d="M520 110 C520.8 115 522 116.2 527 117 C522 117.8 520.8 119 520 124 C519.2 119 518 117.8 513 117 C518 116.2 519.2 115 520 110 Z" opacity="0.45" />
    </g>

    {/* Nuage barré (zéro émission) haut-centre */}
    <g transform="translate(440 70)" opacity="0.4" strokeWidth="2.5">
      <path d="M0 24 C-8 24 -12 16 -4 12 C-4 2 10 2 12 10 C22 6 30 14 24 22 C24 24 20 24 18 24 Z" />
      <path d="M-10 32 L30 -2" strokeWidth="2.5" />
    </g>
  </svg>
);

export const Home: React.FC<HomeProps> = ({ setCurrentPage, id }) => {
  const go = (p: string) => setCurrentPage(p);

  return (
    <div id={id} className="bg-white text-[#0B1F14] font-sans -mt-[69px] lg:-mt-[81px]">
      {/* ====================== HERO ====================== */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <motion.div
          initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }}
        />
        {/* Voile pour la lisibilité */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(5,20,12,0.82) 0%, rgba(5,20,12,0.55) 45%, rgba(5,20,12,0.15) 100%)" }} />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 lg:px-8 py-24">
          <motion.span
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-xl backdrop-saturate-150 px-4 py-1.5 text-xs font-semibold tracking-wide text-white ring-1 ring-white/25"
          >
            100 % ÉLECTRIQUE · ABIDJAN
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.6 }}
            className="mt-5 max-w-3xl text-white font-extrabold tracking-tight leading-[1.05] text-4xl sm:text-5xl lg:text-6xl"
          >
            La flotte électrique qui fait avancer <span style={{ color: GREEN }}>Abidjan</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.6 }}
            className="mt-5 max-w-xl text-base sm:text-lg text-white/85 leading-relaxed"
          >
            Transport premium, propre et fiable. Une flotte de véhicules 100 % électriques, des chauffeurs dédiés et un suivi en temps réel.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.6 }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <button onClick={() => go("contact")} className="group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-[#06140D] shadow-lg transition-transform active:scale-[0.98]" style={{ background: GREEN }}>
              Nous contacter <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <button onClick={() => go("vehicules")} className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/10 transition-colors">
              Découvrir la flotte
            </button>
          </motion.div>
        </div>
      </section>

      {/* ====================== STATS ====================== */}
      <section style={{ background: INK }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-y-8 md:divide-x md:divide-white/10">
          {[
            { v: "50+", l: "Véhicules électriques", icon: <Car size={24} />, c: GREEN },
            { v: "100", l: "Chauffeurs dédiés", icon: <Users size={24} />, c: ORANGE },
            { v: "Abidjan", l: "Zone de service", icon: <MapPin size={24} />, c: GREEN },
            { v: "0", l: "Émission à l'usage", icon: <Leaf size={24} />, c: ORANGE },
          ].map((s) => (
            <div key={s.l} className="flex flex-col items-center text-center md:px-4">
              <div className="mb-3" style={{ color: s.c }}>{s.icon}</div>
              <div className="text-2xl sm:text-3xl font-extrabold leading-none" style={{ color: s.c }}>{s.v}</div>
              <div className="mt-2 text-xs sm:text-sm text-white/65">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================== FEATURES ====================== */}
      <section className="relative overflow-hidden bg-[#F4F8F5]">
        <BentoBackdrop id="eb-feat" k={1.8} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fade} className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Une mobilité pensée pour la ville.</h2>
            <p className="mt-3 text-[#5B6B62] text-lg">Silencieuse, économique et sans compromis sur le confort.</p>
          </motion.div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {[
              { icon: <Zap size={22} />, t: "Électrique & silencieux", d: "Des trajets doux et sans bruit, zéro émission à l'usage pour une ville plus respirable." },
              { icon: <BatteryCharging size={22} />, t: "Recharge maîtrisée", d: "Un réseau de bornes et une gestion de l'énergie pour une flotte toujours prête à rouler." },
              { icon: <Gauge size={22} />, t: "Suivi en temps réel", d: "Chaque course, chaque véhicule et chaque recharge suivis de bout en bout." },
            ].map((f, i) => (
              <motion.div key={f.t} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }}
                className="rounded-2xl bg-white p-6 ring-1 ring-[#E6EBE8] shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:shadow-lg transition-shadow">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[#06140D]" style={{ background: GREEN }}>{f.icon}</div>
                <h3 className="mt-4 text-lg font-bold">{f.t}</h3>
                <p className="mt-2 text-sm text-[#5B6B62] leading-relaxed">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== BENTO « TOUT EASY » ====================== */}
      <section className="relative overflow-hidden" style={{ background: "#F4F8F5" }}>
        <BentoBackdrop id="eb-bento" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <motion.h2 {...fade} className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B1F14]">
            TOUT <span className="text-[#0B1F14]/30">EASY</span>
          </motion.h2>
          <motion.p {...fade} className="text-center mt-2 text-[#5B6B62]">Une seule marque, tous vos besoins de mobilité.</motion.p>

          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 auto-rows-[150px] gap-3.5">
            {/* Flagship — Courses VTC (cartes décalées) */}
            <button onClick={() => go("vehicules")} className="relative col-span-2 row-span-2 text-left group">
              <div className="absolute top-4 left-4 right-0 bottom-0 rounded-3xl" style={{ backgroundColor: "#00C853" }} />
              <div className="absolute top-0 left-0 right-4 bottom-4 rounded-3xl overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.45)] ring-1 ring-black/10">
                <img src={rideImg} alt="Courses VTC" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,20,13,0.9) 0%, transparent 60%)" }} />
                <span className="absolute top-4 right-4 rounded-lg bg-black/25 backdrop-blur px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">EASY</span>
                <div className="absolute left-5 bottom-5">
                  <div className="text-2xl font-extrabold text-white">Courses VTC</div>
                  <div className="text-sm text-white/85 mt-1">Réservez un véhicule électrique avec chauffeur, à la demande.</div>
                </div>
              </div>
            </button>

            <BentoImageTile label="Entreprises" desc="Transport corporate" img={entreprisesImg} color="#2563EB" onClick={() => go("corporate")} />
            <BentoImageTile label="Hôtels & partenaires" desc="Navettes, conciergerie" img={hotelsImg} color="#FF7A1A" onClick={() => go("partenaire")} />
            <BentoImageTile label="Location" desc="Longue durée" img={rentImg} color="#0EA5A5" onClick={() => go("vehicules")} />
            <BentoImageTile label="Flotte 100% électrique" img={flotteImg} color="#16A34A" onClick={() => go("vehicules")} />

            {/* Bande large — Recharge (cartes décalées) */}
            <button onClick={() => go("vehicules")} className="relative col-span-2 text-left group">
              <div className="absolute top-3 left-3 right-0 bottom-0 rounded-3xl" style={{ backgroundColor: "#047857" }} />
              <div className="absolute top-0 left-0 right-3 bottom-3 rounded-3xl overflow-hidden shadow-[0_12px_26px_rgba(0,0,0,0.45)] ring-1 ring-black/10">
                <img src={rechargeImg} alt="Recharge & énergie" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,20,13,0.9), transparent 70%)" }} />
                <div className="absolute left-5 bottom-4">
                  <div className="text-lg font-bold text-white">Recharge & énergie</div>
                  <div className="text-sm text-white/85">Un réseau de bornes pour une flotte toujours prête.</div>
                </div>
              </div>
            </button>

            <BentoTile label="Événements & VIP" grad="linear-gradient(135deg,#F59E0B,#B45309)" icon={<Star size={20} />} onClick={() => go("contact")} />
            <BentoTile label="Suivi temps réel" grad="linear-gradient(135deg,#2563EB,#1E3A8A)" icon={<Gauge size={20} />} onClick={() => go("connexion")} />
          </div>
        </div>
      </section>

      {/* ====================== SHOWCASE (photo + texte) ====================== */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div {...fade} className="relative">
            <img src={hubImg} alt="Flotte SAVER au hub d'Abidjan" className="rounded-3xl w-full object-cover aspect-[4/3] shadow-xl" />
            <div className="absolute -bottom-5 -left-3 sm:left-6 rounded-2xl bg-white px-5 py-4 ring-1 ring-[#E6EBE8] shadow-lg">
              <div className="text-2xl font-extrabold" style={{ color: GREEN }}>100 %</div>
              <div className="text-xs text-[#5B6B62]">électrique</div>
            </div>
          </motion.div>

          <motion.div {...fade}>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Une flotte entretenue, prête chaque jour.</h2>
            <p className="mt-4 text-[#5B6B62] text-lg leading-relaxed">
              Attribution quotidienne, contrôles à la prise et à la fin de service, maintenance préventive : nos véhicules sont suivis au kilomètre près pour une disponibilité maximale.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                { icon: <ShieldCheck size={18} />, t: "Contrôles quotidiens (prise et fin de service)" },
                { icon: <MapPin size={18} />, t: "Suivi GPS et disponibilité en temps réel" },
                { icon: <Leaf size={18} />, t: "Empreinte carbone réduite à chaque trajet" },
              ].map((x) => (
                <li key={x.t} className="flex items-center gap-3 text-[#0B1F14]">
                  <span className="shrink-0" style={{ color: GREEN_DARK }}>{x.icon}</span>
                  <span className="text-sm">{x.t}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ====================== IMPACT (bande verte) ====================== */}
      <section className="relative overflow-hidden" style={{ background: INK }}>
        <ImpactDoodles />
        {/* Mascotte : au-dessus du fond, sous le contenu (coin bas-gauche) */}
        <img src={mascotImg} alt="" aria-hidden className="pointer-events-none select-none absolute bottom-0 left-0 sm:left-4 w-40 sm:w-52 lg:w-60 drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div {...fade}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: GREEN }}>
              <Leaf size={14} /> NOTRE IMPACT
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Moins d'émissions, plus de ville.</h2>
            <p className="mt-4 text-white/70 text-lg leading-relaxed">
              Chaque course en électrique, c'est du bruit et du CO₂ en moins pour Abidjan. Une mobilité qui profite aussi à ceux qui ne montent jamais à bord.
            </p>
          </motion.div>
          <motion.div {...fade}>
            <img src={closeupImg} alt="Véhicule électrique SAVER" className="rounded-3xl w-full object-cover aspect-[16/10] shadow-2xl ring-1 ring-white/10" />
          </motion.div>
        </div>
      </section>

      {/* ====================== CTA ====================== */}
      <section className="bg-[#F4F8F5]">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-20 text-center">
          <motion.h2 {...fade} className="text-3xl sm:text-4xl font-extrabold tracking-tight">Prêt à rouler avec SAVER ?</motion.h2>
          <motion.p {...fade} className="mt-3 text-[#5B6B62] text-lg">Parlons de vos besoins de transport — entreprise, hôtel ou particulier.</motion.p>
          <motion.div {...fade} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => go("contact")} className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-[#06140D] shadow-lg transition-transform active:scale-[0.98]" style={{ background: GREEN }}>
              <PhoneCall size={18} /> Nous contacter
            </button>
            <button onClick={() => go("connexion")} className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-[#0B1F14] ring-1 ring-[#D7E0DA] hover:bg-white transition-colors">
              Espace membre
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
