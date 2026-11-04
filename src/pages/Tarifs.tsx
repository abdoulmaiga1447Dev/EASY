/**
 * Page « Tarifs » — refonte UI/UX 2026.
 * Thème clair (charte vert/blanc), bandeau en haut, formules en cartes.
 * Tous les montants et textes FR/EN sont conservés à l'identique.
 */
import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import {
  Plane, ShoppingBag, Briefcase, Compass, Gem,
  Check, ArrowRight, ShieldCheck, Moon, CalendarCheck,
  MapPin, ChevronDown, ChevronUp, PhoneCall, Clock, HelpCircle, Star, Sparkles, Zap,
} from "lucide-react";

// Prix animé : « compteur » qui monte, + fondu au changement.
const AnimatedPrice: React.FC<{ value: string }> = ({ value }) => {
  const m = value.match(/^([\d.,\s ]+)(.*)$/);
  const hasNum = !!m && /\d/.test(m[1]);
  const target = hasNum ? parseInt(m![1].replace(/[^\d]/g, ""), 10) : 0;
  const suffix = hasNum ? m![2].trim() : value;
  const sep = value.includes(",") ? "," : " ";
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    if (!hasNum) return;
    let raf = 0;
    const dur = 650;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisp(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, hasNum]);
  const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (
    <motion.span key={value} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="inline-block">
      {hasNum ? `${fmt(disp)} ${suffix}` : value}
    </motion.span>
  );
};
import { motion } from "motion/react";
import heroImg from "../assets/saver/tarifs-hero.jpg";

const GREEN = "#00C853";
const INK = "#0B1F14";
const ORANGE = "#FF7A1A";

// Couleur d'accent par formule (cohérent avec le bento de l'accueil).
const ACCENTS: Record<string, string> = {
  flash_premium: "#00C853",
  courses_vip: "#FF7A1A",
  rdv_image: "#00C853",
  grande_journee: "#0EA5A5",
  evenement: "#2563EB",
};

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6 },
};

interface RatesProps {
  id: string;
  setCurrentPage?: (page: string) => void;
}

export const Tarifs: React.FC<RatesProps> = ({ id, setCurrentPage }) => {
  const { t, translate } = useLanguage();
  const [activeVehicle, setActiveVehicle] = useState<"n1" | "n2" | "n3">("n1");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const vehicleLevels = [
    { id: "n1" as const, label: translate({ fr: "Berline", en: "Sedan" }), tag: "N1" },
    { id: "n2" as const, label: translate({ fr: "SUV Executive", en: "Executive SUV" }), tag: "N2" },
    { id: "n3" as const, label: translate({ fr: "Prestige", en: "Prestige" }), tag: "N3" },
  ];

  const formulas = [
    {
      id: "flash_premium",
      duration: "1h",
      icon: <Plane size={20} />,
      recommended: false,
      name: { fr: "Le Flash Premium", en: "Le Flash Premium" },
      desc: { fr: "Aéroport, restaurant, hôtel — 1 seul trajet. Jusqu'à 3 personnes", en: "Airport, restaurant, hotel — 1 single journey. Up to 3 passengers" },
      prices: { n1: { fr: "10 000 FCFA", en: "10,000 FCFA" }, n2: { fr: "15 000 FCFA", en: "15,000 FCFA" }, n3: { fr: "Sur devis", en: "Upon Request" } },
      features: { fr: ["Idéal transfert rapide", "1 bagage standard", "Accueil personnalisé"], en: ["Ideal for fast transfers", "1 standard baggage", "Personalized greeting"] },
    },
    {
      id: "courses_vip",
      duration: "2h",
      icon: <ShoppingBag size={20} />,
      recommended: false,
      name: { fr: "Les Courses VIP", en: "VIP Errands" },
      desc: { fr: "Pharmacie, shopping, 2-3 arrêts en ville", en: "Pharmacy, shopping, 2-3 quick stops around Abidjan" },
      prices: { n1: { fr: "18 000 FCFA", en: "18,000 FCFA" }, n2: { fr: "28 000 FCFA", en: "28,000 FCFA" }, n3: { fr: "Sur devis", en: "Upon Request" } },
      features: { fr: ["Attente active incluse", "Prise en charge courses", "Multi-arrêts flexibles"], en: ["Active wait time included", "Packages assistance", "Flexible multi-stops"] },
    },
    {
      id: "rdv_image",
      duration: "3h",
      icon: <Briefcase size={20} />,
      recommended: true,
      name: { fr: "Le RDV d'Image", en: "The Image Meeting" },
      desc: { fr: "Meeting, hôtel 5★, cabinet d'avocats, banque", en: "Meeting, 5★ hotel, law firm, private banking" },
      prices: { n1: { fr: "21 000 FCFA*", en: "21,000 FCFA*" }, n2: { fr: "39 000 FCFA", en: "39,000 FCFA" }, n3: { fr: "Sur devis", en: "Upon Request" } },
      features: { fr: ["Prestance protocolaire", "Discrétion absolue", "Idéal rendez-vous d'affaires"], en: ["Protocol-level presence", "Absolute privacy", "Ideal for business meetings"] },
    },
    {
      id: "grande_journee",
      duration: "8h",
      icon: <Compass size={20} />,
      recommended: false,
      name: { fr: "La Grande Journée", en: "The Full Day" },
      desc: { fr: "Bassam, Dabou, Anyama — itinéraire libre", en: "Grand-Bassam, Dabou, Anyama — custom unlimited route" },
      prices: { n1: { fr: "45 000 FCFA", en: "45,000 FCFA" }, n2: { fr: "60 000 FCFA*", en: "60,000 FCFA*" }, n3: { fr: "Sur devis", en: "Upon Request" } },
      features: { fr: ["Distance 200 km incluse", "Prise en charge totale", "Déplacements régionaux"], en: ["200 km mileage included", "Full chauffeur assistance", "Regional travel ready"] },
    },
    {
      id: "evenement",
      duration: "16h",
      icon: <Gem size={20} />,
      recommended: false,
      name: { fr: "L'Événement", en: "The Signature Event" },
      desc: { fr: "Mariage, séminaire, journée VIP", en: "Weddings, high-level seminars, private VIP days" },
      prices: { n1: { fr: "85 000 FCFA", en: "85,000 FCFA" }, n2: { fr: "110 000 FCFA", en: "110,000 FCFA" }, n3: { fr: "Sur devis", en: "Upon Request" } },
      features: { fr: ["Véhicule d'apparat décoré", "Disponibilité jour & nuit", "Service VIP premium"], en: ["Decorated ceremonial car", "Day & night availability", "Premium VIP experience"] },
    },
  ];

  const adjustments = [
    { icon: <Moon size={20} />, value: "+20%", title: t("ratesAdjustmentNight"), desc: t("ratesAdjustmentNightDesc") },
    { icon: <CalendarCheck size={20} />, value: "+20%", title: t("ratesAdjustmentWeekend"), desc: t("ratesAdjustmentWeekendDesc") },
    { icon: <ShieldCheck size={20} />, value: "+15%", title: t("ratesAdjustmentBilingual"), desc: t("ratesAdjustmentBilingualDesc") },
  ];

  const supplements = [
    { t: translate({ fr: "Accueil pancarte aéroport", en: "Airport meet & greet with sign" }), v: "5 000 FCFA" },
    { t: translate({ fr: "Km supplémentaire", en: "Extra kilometer" }), v: "2000–3500 FCFA/km" },
    { t: translate({ fr: "Km hors zone", en: "Out-of-zone km" }), v: "1 500 FCFA/km" },
    { t: translate({ fr: "Annulation > 1H", en: "Cancellation > 1H" }), v: translate({ fr: "Gratuite", en: "Free" }) },
  ];

  const faqs = [
    {
      question: { fr: "Et s'il pleut ?", en: "What if it rains?" },
      answer: { fr: "Rien ne change. Chez Easy, pas de majoration météo. Votre tarif 1h, 8h ou 16h reste le même.", en: "Nothing changes. At Easy, there is no weather-based surge pricing. Your 1h, 8h or 16h rate remains exactly the same." },
    },
    {
      question: { fr: "Et s'il y a un gros embouteillage ?", en: "What if there is heavy traffic?" },
      answer: { fr: "Le compteur ne tourne pas. Vous avez loué votre chauffeur + véhicule pour une durée. Bouchons ou pas, vous payez le forfait. Pas la minute en plus.", en: "The meter doesn't tick. You've rented your chauffeur + vehicle for a set duration. Traffic jams or not, you pay the flat rate. Not a single extra minute." },
    },
  ];

  const nav = (page: string) => {
    if (setCurrentPage) setCurrentPage(page);
    else window.location.hash = page;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBook = (formulaId: string) => {
    localStorage.setItem("ev_selected_formula", formulaId);
    localStorage.setItem("ev_selected_vehicle_category", activeVehicle.toUpperCase());
    nav("reservation");
  };

  return (
    <div id={id} className="bg-white text-[#0B1F14] font-sans -mt-[69px] lg:-mt-[81px]">
      {/* ====================== BANDEAU ====================== */}
      <section className="relative overflow-hidden min-h-[46vh] flex items-center">
        <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(5,20,12,0.9) 0%, rgba(5,20,12,0.6) 55%, rgba(5,20,12,0.35) 100%)" }} />
        <div className="relative z-10 max-w-6xl mx-auto w-full px-6 lg:px-8 pt-32 lg:pt-40 pb-14 text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-xl px-4 py-1.5 ring-1 ring-white/20 text-[11px] font-semibold tracking-[0.15em] text-white uppercase"
          >
            <Zap size={13} style={{ color: GREEN }} /> {translate({ fr: "Tarifs transparents · Abidjan", en: "Transparent pricing · Abidjan" })}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white"
          >
            {translate({ fr: "Nos tarifs", en: "Our pricing" })}
          </motion.h1>
          <motion.nav
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 flex items-center justify-center gap-2 text-sm text-white/80"
          >
            <button onClick={() => nav("home")} className="hover:text-white transition-colors">{translate({ fr: "Accueil", en: "Home" })}</button>
            <span className="text-white/40">/</span>
            <span className="font-semibold text-white">{translate({ fr: "Tarifs", en: "Pricing" })}</span>
          </motion.nav>
        </div>
      </section>

      {/* ====================== FORMULES ====================== */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg,#0B1F14 0%,#06120C 100%)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 45% at 50% -5%, rgba(0,200,83,0.12), transparent)" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fade} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: GREEN }}>
              <Sparkles size={14} /> {translate({ fr: "FORMULES SUR MESURE", en: "TAILORED FORMULAS" })}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {translate({ fr: "Des forfaits clairs, sans surprise.", en: "Clear packages, no surprises." })}
            </h2>
            <p className="mt-3 text-white/65 text-lg">
              {translate({ fr: "Un chauffeur et un véhicule 100 % électrique pour une durée fixe. Pluie, embouteillage ou nuit : le prix ne bouge pas.", en: "A chauffeur and a 100% electric vehicle for a fixed duration. Rain, traffic or night: the price doesn't move." })}
            </p>
          </motion.div>

          {/* Sélecteur de niveau de véhicule */}
          <motion.div {...fade} className="mt-8 flex flex-col items-center gap-2">
            <div className="inline-flex rounded-full bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
              {vehicleLevels.map((lv) => {
                const active = activeVehicle === lv.id;
                return (
                  <button
                    key={lv.id}
                    onClick={() => setActiveVehicle(lv.id)}
                    className={`px-4 sm:px-5 py-2 rounded-full text-sm font-semibold transition-colors ${active ? "text-[#06140D]" : "text-white/70 hover:text-white"}`}
                    style={active ? { background: GREEN } : undefined}
                  >
                    {lv.label} <span className="opacity-60 text-xs">{lv.tag}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-white/45">
              {translate({ fr: "Berline (N1) — SUV Executive (N2) ×1,25 — Prestige (N3) sur devis", en: "Sedan (N1) — Executive SUV (N2) ×1.25 — Prestige (N3) upon request" })}
            </p>
          </motion.div>

          {/* Cartes formules */}
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {formulas.map((f, i) => {
              const priceStr = translate(f.prices[activeVehicle]);
              const isQuote = activeVehicle === "n3" || /devis|request/i.test(priceStr);
              const accent = ACCENTS[f.id] || GREEN;
              const reco = f.recommended;
              const offset = reco ? "lg:mt-0" : i % 2 === 0 ? "lg:mt-10" : "lg:mt-20";
              return (
                <motion.div
                  key={f.id}
                  {...fade}
                  transition={{ ...fade.transition, delay: i * 0.07 }}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 ${offset} ${reco ? "bg-white/[0.08] ring-1 lg:-translate-y-4" : "bg-white/[0.04] ring-1 ring-white/10 hover:ring-white/20"}`}
                  style={reco ? { ["--tw-ring-color" as any]: accent, boxShadow: `0 24px 60px ${accent}2b` } : undefined}
                >
                  {/* halo d'accent */}
                  <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full" style={{ background: `radial-gradient(closest-side, ${accent}2e, transparent)` }} />

                  {reco && (
                    <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20">
                      <Star size={11} style={{ color: accent }} /> {translate({ fr: "Populaire", en: "Popular" })}
                    </span>
                  )}

                  <h3 className="relative text-lg font-bold text-white pr-20">{translate(f.name)}</h3>
                  <div className="relative mt-2 flex items-end gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-white"><AnimatedPrice value={priceStr} /></span>
                    <span className="mb-1 text-xs text-white/50">/ {f.duration}</span>
                  </div>
                  <div className="relative text-xs text-white/45">{translate({ fr: "à partir de · énergie incluse", en: "starting from · energy included" })}</div>
                  <p className="relative mt-3 text-sm text-white/65 leading-relaxed">{translate(f.desc)}</p>

                  <button
                    onClick={() => (isQuote ? nav("devis") : handleBook(f.id))}
                    className={`relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors active:scale-[0.98] ${reco ? "bg-white text-[#06140D] hover:bg-white/90" : "bg-white/[0.06] text-white ring-1 ring-white/15 hover:bg-white/10"}`}
                  >
                    {isQuote ? translate({ fr: "Demander un devis", en: "Request a quote" }) : translate({ fr: "Réserver", en: "Book" })}
                    <ArrowRight size={16} />
                  </button>

                  <div className="relative mt-6 flex items-center gap-3">
                    <span className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{translate({ fr: "Prestations incluses", en: "Included features" })}</span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>

                  <ul className="relative mt-4 space-y-3 flex-1">
                    {f.features.fr.map((_, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-sm text-white/75">
                        <Check size={15} style={{ color: accent }} className="shrink-0" />
                        <span>{translate({ fr: f.features.fr[idx], en: f.features.en[idx] })}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================== AVANTAGE PRIX STABLES ====================== */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-14">
          <motion.div {...fade} className="rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden ring-1 ring-white/10" style={{ background: INK }}>
            <div className="relative grid sm:grid-cols-[auto_1fr] items-center gap-8 sm:gap-12 text-center sm:text-left">
              {/* Stat phare */}
              <div className="sm:border-r sm:border-white/10 sm:pr-12">
                <div className="text-6xl sm:text-7xl font-extrabold leading-none tracking-tight" style={{ color: GREEN }}>24/7</div>
                <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                  {translate({ fr: "Prix stables", en: "Stable pricing" })}
                </div>
              </div>
              {/* Texte */}
              <div>
                <span className="text-xs font-semibold tracking-wide" style={{ color: GREEN }}>
                  {translate({ fr: "AVANTAGE EASY", en: "EASY ADVANTAGE" })}
                </span>
                <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {translate({ fr: "Un budget protégé, à toute heure.", en: "A protected budget, at any hour." })}
                </h3>
                <p className="mt-2 text-white/70 leading-relaxed">
                  {translate({ fr: "Pluie, embouteillage, nuit… pas de majoration météo, pas de compteur qui s'emballe. Vous payez le forfait, rien de plus.", en: "Rain, traffic, night… no weather surge, no runaway meter. You pay the flat rate, nothing more." })}
                </p>
                <div className="mt-5 flex flex-wrap justify-center sm:justify-start gap-2">
                  {[
                    translate({ fr: "Pas de majoration météo", en: "No weather surge" }),
                    translate({ fr: "Pas de compteur", en: "No meter" }),
                    translate({ fr: "Énergie incluse", en: "Energy included" }),
                  ].map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/85 ring-1 ring-white/15">
                      <Check size={13} style={{ color: GREEN }} /> {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====================== AJUSTEMENTS & SUPPLÉMENTS ====================== */}
      <section className="relative overflow-hidden bg-[#F4F8F5]">
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-96 w-96 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(255,122,26,0.10), transparent)" }} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fade} className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t("ratesPremiumAdjustments")}</h2>
            <p className="mt-3 text-[#5B6B62] text-lg">
              {translate({ fr: "Des majorations claires, appliquées à tous les niveaux de véhicule.", en: "Clear surcharges, applied to all vehicle levels." })}
            </p>
          </motion.div>

          {/* Majorations en % */}
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {adjustments.map((adj, i) => (
              <motion.div
                key={i}
                {...fade}
                transition={{ ...fade.transition, delay: i * 0.08 }}
                className="rounded-2xl bg-white p-6 ring-1 ring-[#E6EBE8] hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[#06140D]" style={{ background: GREEN }}>{adj.icon}</div>
                  <span className="rounded-full px-3 py-1 text-sm font-extrabold" style={{ background: "rgba(255,122,26,0.12)", color: "#C85A00" }}>{adj.value}</span>
                </div>
                <h3 className="mt-4 text-base font-bold">{adj.title}</h3>
                <p className="mt-2 text-sm text-[#5B6B62] leading-relaxed">{adj.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Suppléments fixes */}
          <motion.div {...fade} className="mt-6 rounded-2xl bg-white ring-1 ring-[#E6EBE8] divide-y divide-[#EEF2EF]">
            {supplements.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Check size={16} style={{ color: GREEN }} className="shrink-0" />
                  <span className="text-sm font-medium text-[#0B1F14]">{s.t}</span>
                </div>
                <span className="text-sm font-bold text-[#0B1F14]">{s.v}</span>
              </div>
            ))}
          </motion.div>

          {/* Énergie incluse */}
          <motion.div {...fade} className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white ring-1 ring-[#E6EBE8] px-6 py-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,200,83,0.12)" }}>
                <MapPin size={18} style={{ color: GREEN }} />
              </div>
              <div>
                <p className="text-xs text-[#5B6B62]">{translate({ fr: "Trajets hors zone", en: "Trips outside area" })}</p>
                <h4 className="text-sm font-bold">{translate({ fr: "Tarif km hors zone = 1 500 FCFA/km", en: "Out of zone km rate = 1,500 FCFA/km" })}</h4>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ background: "rgba(0,200,83,0.12)", color: GREEN }}>
              <Zap size={12} /> {translate({ fr: "Énergie toujours incluse", en: "Energy always included" })}
            </span>
          </motion.div>
        </div>
      </section>

      {/* ====================== FAQ ====================== */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-20">
          <motion.h2 {...fade} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center">
            {translate({ fr: "Questions fréquentes", en: "Frequently asked questions" })}
          </motion.h2>
          <div className="mt-10 space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <motion.div {...fade} transition={{ ...fade.transition, delay: index * 0.06 }} key={index} className="rounded-2xl bg-[#F4F8F5] ring-1 ring-[#E6EBE8] overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-[#EEF4F0] transition-colors"
                  >
                    <span className="text-base font-semibold">{translate(faq.question)}</span>
                    {isOpen ? <ChevronUp size={18} style={{ color: GREEN }} /> : <ChevronDown size={18} className="text-[#5B6B62]" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-[#5B6B62] leading-relaxed">{translate(faq.answer)}</div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Conditions */}
          <motion.div {...fade} className="mt-8 rounded-2xl bg-[#F4F8F5] ring-1 ring-[#E6EBE8] p-6">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <HelpCircle size={16} style={{ color: GREEN }} />
              {translate({ fr: "Conditions contractuelles simplifiées", en: "Simplified contractual terms" })}
            </h4>
            <p className="mt-3 text-xs text-[#5B6B62] leading-relaxed">
              {translate({
                fr: "* L'ensemble des prestations intègre l'assurance tous risques voyageurs, la climatisation de prestige, les bouteilles d'eau rafraîchissantes et l'accès Wi-Fi au sein du véhicule. La tarification débute au départ de notre agence ou de l'adresse de prise en charge valide fournie lors du contrat. Tout dépassement au-delà de 15 minutes est facturé au prorata de l'heure entamée. Pour toute demande de facturation mensuelle groupée ou contrat cadre Corporate, veuillez directement contacter notre Bureau Plateau.",
                en: "* All services include fully comprehensive passenger insurance, upscale climate comfort, complimentary chilled mineral water, and high-speed onboard Wi-Fi. Billing commences upon vehicle departure from our office or your designated pickup address. Grace period for wait times is 15 minutes, after which overtime is billed pro-rata. For consolidated recurring monthly invoicing or tailored Corporate Framework Agreements, please contact our Plateau Desk directly.",
              })}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ====================== CTA ====================== */}
      <section style={{ background: INK }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-20 text-center">
          <motion.h2 {...fade} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {translate({ fr: "Un besoin sur mesure ?", en: "A tailored need?" })}
          </motion.h2>
          <motion.p {...fade} className="mt-3 text-white/70 text-lg">
            {translate({ fr: "Réservez une formule ou demandez un devis personnalisé.", en: "Book a package or request a custom quote." })}
          </motion.p>
          <motion.div {...fade} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => nav("reservation")} className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-[#06140D] shadow-lg transition-transform active:scale-[0.98]" style={{ background: GREEN }}>
              {translate({ fr: "Réserver une course", en: "Book a ride" })} <ArrowRight size={16} />
            </button>
            <button onClick={() => nav("devis")} className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/10 transition-colors">
              <PhoneCall size={18} /> {translate({ fr: "Demander un devis", en: "Request a quote" })}
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
