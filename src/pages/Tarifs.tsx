import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { 
  ShieldCheck, 
  Moon, 
  CalendarCheck, 
  HelpCircle, 
  FileSpreadsheet, 
  Star,
  Zap, 
  ShoppingBag, 
  Briefcase, 
  Users, 
  Compass, 
  Sparkles,
  ArrowRight,
  Check,
  Car,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import Plasma from "../components/Plasma";

interface RatesProps {
  id: string;
  setCurrentPage?: (page: string) => void;
}

export const Tarifs: React.FC<RatesProps> = ({ id, setCurrentPage }) => {
  const { t, translate, language } = useLanguage();
  const [activeVehicle, setActiveVehicle] = useState<"n1" | "n2" | "n3">("n1");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: { fr: "Et s'il pleut ?", en: "What if it rains?" },
      answer: {
        fr: "Rien ne change. Chez Easy, pas de majoration météo. Votre tarif 1h, 8h ou 16h reste le même.",
        en: "Nothing changes. At Easy, there is no weather-based surge pricing. Your 1h, 8h or 16h rate remains exactly the same."
      }
    },
    {
      question: { fr: "Et s'il y a un gros embouteillage ?", en: "What if there is heavy traffic?" },
      answer: {
        fr: "Le compteur ne tourne pas. Vous avez loué votre chauffeur + véhicule pour une durée. Bouchons ou pas, vous payez le forfait. Pas la minute en plus.",
        en: "The meter doesn't tick. You've rented your chauffeur + vehicle for a set duration. Traffic jams or not, you pay the flat rate. Not a single extra minute."
      }
    }
  ];

  const formulas = [
    {
      id: "flash_premium",
      duration: "1h",
      icon: <Zap className="text-gold-light" size={22} />,
      name: { fr: "Le Flash Premium", en: "Le Flash Premium" },
      desc: { 
        fr: "Aéroport, restaurant, hôtel — 1 seul trajet. Jusqu'à 3 personnes", 
        en: "Airport, restaurant, hotel — 1 single journey. Up to 3 passengers" 
      },
      prices: {
        n1: { fr: "10 000 FCFA", en: "10,000 FCFA" },
        n2: { fr: "15 000 FCFA", en: "15,000 FCFA" },
        n3: { fr: "Sur devis", en: "Upon Request" }
      },
      features: {
        fr: ["Idéal transfert rapide", "1 bagage standard", "Accueil personnalisé"],
        en: ["Ideal for fast transfers", "1 standard baggage", "Personalized greeting"]
      }
    },
    {
      id: "courses_vip",
      duration: "2h",
      icon: <ShoppingBag className="text-gold-light" size={22} />,
      name: { fr: "Les Courses VIP", en: "VIP Errands" },
      desc: { 
        fr: "Pharmacie, shopping, 2-3 arrêts en ville", 
        en: "Pharmacy, shopping, 2-3 quick stops around Abidjan" 
      },
      prices: {
        n1: { fr: "18 000 FCFA", en: "18,000 FCFA" },
        n2: { fr: "28 000 FCFA", en: "28,000 FCFA" },
        n3: { fr: "Sur devis", en: "Upon Request" }
      },
      features: {
        fr: ["Attente active incluse", "Prise en charge courses", "Multi-arrêts flexibles"],
        en: ["Active wait time included", "Packages assistance", "Flexible multi-stops"]
      }
    },
    {
      id: "rdv_image",
      duration: "3h",
      icon: <Briefcase className="text-gold-light" size={22} />,
      name: { fr: "Le RDV d'Image", en: "The Image Meeting" },
      desc: { 
        fr: "Meeting, hôtel 5★, cabinet d'avocats, banque", 
        en: "Meeting, 5★ hotel, law firm, private banking" 
      },
      prices: {
        n1: { fr: "21 000 FCFA*", en: "21,000 FCFA*" },
        n2: { fr: "39 000 FCFA", en: "39,000 FCFA" },
        n3: { fr: "Sur devis", en: "Upon Request" }
      },
      features: {
        fr: ["Prestance protocolaire", "Discrétion absolue", "Idéal rendez-vous d'affaires"],
        en: ["Protocol-level presence", "Absolute privacy", "Ideal for business meetings"]
      }
    },
    {
      id: "grande_journee",
      duration: "8h",
      icon: <Compass className="text-gold-light" size={22} />,
      name: { fr: "La Grande Journée", en: "The Full Day" },
      desc: { 
        fr: "Bassam, Dabou, Anyama — itinéraire libre", 
        en: "Grand-Bassam, Dabou, Anyama — custom unlimited route" 
      },
      prices: {
        n1: { fr: "45 000 FCFA", en: "45,000 FCFA" },
        n2: { fr: "60 000 FCFA*", en: "60,000 FCFA*" },
        n3: { fr: "Sur devis", en: "Upon Request" }
      },
      features: {
        fr: ["Distance 200 km incluse", "Prise en charge totale", "Déplacements régionaux"],
        en: ["200 km mileage included", "Full chauffeur assistance", "Regional travel ready"]
      }
    },
    {
      id: "evenement",
      duration: "16h",
      icon: <Sparkles className="text-gold-light" size={22} />,
      name: { fr: "L'Événement", en: "The Signature Event" },
      desc: { 
        fr: "Mariage, séminaire, journée VIP", 
        en: "Weddings, high-level seminars, private VIP days" 
      },
      prices: {
        n1: { fr: "85 000 FCFA", en: "85,000 FCFA" },
        n2: { fr: "110 000 FCFA", en: "110,000 FCFA" },
        n3: { fr: "Sur devis", en: "Upon Request" }
      },
      features: {
        fr: ["Véhicule d'apparat décoré", "Disponibilité jour & nuit", "Service VIP premium"],
        en: ["Decorated ceremonial car", "Day & night availability", "Premium VIP experience"]
      }
    }
  ];

  const adjustments = [
    {
      icon: <Moon className="text-gold-light" size={20} />,
      title: t("ratesAdjustmentNight"),
      desc: t("ratesAdjustmentNightDesc")
    },
    {
      icon: <CalendarCheck className="text-gold-light" size={20} />,
      title: t("ratesAdjustmentWeekend"),
      desc: t("ratesAdjustmentWeekendDesc")
    },
    {
      icon: <ShieldCheck className="text-gold-light" size={20} />,
      title: t("ratesAdjustmentBilingual"),
      desc: t("ratesAdjustmentBilingualDesc")
    }
  ];

  const handleBook = (formulaId: string) => {
    localStorage.setItem("ev_selected_formula", formulaId);
    localStorage.setItem("ev_selected_vehicle_category", activeVehicle.toUpperCase());
    if (setCurrentPage) {
      setCurrentPage("reservation");
    } else {
      window.location.hash = "reservation";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuote = () => {
    if (setCurrentPage) {
      setCurrentPage("devis");
    } else {
      window.location.hash = "devis";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div id={id} className="min-h-screen bg-black py-20 px-4 relative overflow-hidden">
      
      {/* Premium dark, high-contrast background to maximize readability */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-radial-from-t bg-[#050505]" />
        
        {/* A very subtle, static warm-gray radial glow that is 100% readable and performant */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(226,196,122,0.03)_0%,rgba(0,0,0,0)_70%)]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Grid */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-gold-light text-center">
            {translate({ fr: "FORMULES SUR MESURE", en: "TAILORED FORMULAS" })}
          </span>
          <h1 className="text-3xl md:text-5xl font-sans font-light text-white tracking-tight mt-3">
            {translate({ fr: "Nos Forfaits Storytellés", en: "Our Story-styled Packages" })}
          </h1>
          <p className="text-sm text-neutral-300 mt-4 max-w-2xl mx-auto">
            {translate({ 
              fr: "Découvrez notre nouvelle structure de forfaits conçue pour répondre à chacun de vos besoins avec élégance, transparence et prestige.", 
              en: "Discover our new package structure designed to meet your every logistical need with elegance, absolute transparency, and prestige." 
            })}
          </p>
        </div>

        {/* NEW OFFICIAL GRILLE TARIFAIRE ACCORDING TO IMAGE */}
        <div className="w-full bg-white/5 backdrop-blur-xl border border-gold-light/15 rounded-2xl p-6 md:p-8 mb-16 shadow-2xl overflow-hidden">
          <div className="border-b border-white/10 pb-6 mb-8 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-sans font-semibold text-white tracking-tight flex items-center justify-center md:justify-start gap-3">
              <span className="w-2.5 h-6 bg-gold rounded-full" />
              {translate({ fr: "Grille tarifaire · Base Easy by SAVER", en: "Pricing Grid · Base Easy by SAVER" })}
            </h2>
            <p className="text-xs text-gold-light font-mono mt-2 uppercase tracking-wider">
              {translate({
                fr: "Tarifs Berline (Niveau 1) — Niveau 2 SUV ×1,25 — Niveau 3 Prestige sur devis",
                en: "Berline Rates (Level 1) — Level 2 SUV ×1.25 — Level 3 Prestige upon Request"
              })}
            </p>
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-white-premium/10 bg-black/40">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#0B3C2A] text-white font-sans text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 border-b border-white-premium/10 rounded-tl-xl">{translate({ fr: "Formule", en: "Formula" })}</th>
                  <th className="py-4 px-6 border-b border-white-premium/10">{translate({ fr: "Durée", en: "Duration" })}</th>
                  <th className="py-4 px-6 border-b border-white-premium/10">{translate({ fr: "Km inclus", en: "Km included" })}</th>
                  <th className="py-4 px-6 border-b border-white-premium/10">{translate({ fr: "Berline (N1)", en: "Berline (N1)" })}</th>
                  <th className="py-4 px-6 border-b border-white-premium/10 rounded-tr-xl">{translate({ fr: "SUV Executive (N2)", en: "SUV Executive (N2)" })}</th>
                </tr>
              </thead>
              <tbody className="text-sm font-sans text-neutral-200">
                <tr className="border-b border-white-premium/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-semibold text-white text-base" rowSpan={3}>
                    {translate({ fr: "À l'heure", en: "By the hour" })}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs">1H</td>
                  <td className="py-4 px-6 font-mono text-xs text-neutral-500">—</td>
                  <td className="py-4 px-6 font-mono font-bold text-gold-light text-base">10 000 FCFA</td>
                  <td className="py-4 px-6 font-mono text-neutral-300">15 000 FCFA/h</td>
                </tr>
                <tr className="border-b border-white-premium/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-mono text-xs">2H</td>
                  <td className="py-4 px-6 font-mono text-xs text-neutral-500">—</td>
                  <td className="py-4 px-6 font-mono font-bold text-gold-light text-base">18 000 FCFA</td>
                  <td className="py-4 px-6 font-mono text-neutral-300">28 000 FCFA/h</td>
                </tr>
                <tr className="border-b border-white-premium/10 bg-gold/5 hover:bg-gold/10 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs">3H</td>
                  <td className="py-4 px-6 font-mono text-xs text-neutral-500">—</td>
                  <td className="py-4 px-6 font-mono font-bold text-gold-light text-base flex items-center gap-2">
                    <span>21 000 FCFA*</span>
                    <span className="text-[9px] font-sans font-bold bg-[#0B3C2A] text-white uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                      {translate({ fr: "Recommandé", en: "Recommended" })}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-neutral-300">39 000 FCFA/h</td>
                </tr>

                <tr className="border-b border-white-premium/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-5 px-6 font-semibold text-white text-base">
                    {translate({ fr: "Demi-journée", en: "Half-day" })}
                  </td>
                  <td className="py-5 px-6 font-mono text-xs">8 heures</td>
                  <td className="py-5 px-6 font-mono text-xs text-neutral-500">—</td>
                  <td className="py-5 px-6 font-mono font-bold text-gold-light text-base">45 000 FCFA</td>
                  <td className="py-5 px-6 bg-emerald-950/35 border-l border-emerald-500/20">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-emerald-400 text-base">60 000 FCFA</span>
                      <span className="text-[9px] font-sans font-bold bg-[#0B3C2A] text-white uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                        {translate({ fr: "Recommandé", en: "Recommended" })}
                      </span>
                    </div>
                  </td>
                </tr>

                <tr className="border-b border-white-premium/10 hover:bg-white/[0.02] transition-colors">
                  <td className="py-5 px-6 font-semibold text-white text-base">
                    {translate({ fr: "Journée complète", en: "Full day" })}
                  </td>
                  <td className="py-5 px-6 font-mono text-xs">16 heures</td>
                  <td className="py-5 px-6 font-mono text-xs text-neutral-500">—</td>
                  <td className="py-5 px-6 font-mono font-bold text-gold-light text-base">85 000 FCFA</td>
                  <td className="py-5 px-6 font-mono font-bold text-neutral-200 text-base">110 000 FCFA</td>
                </tr>

                <tr className="bg-[#051B13] text-white font-sans text-xs">
                  <td className="py-4 px-6 font-medium rounded-bl-xl" colSpan={3}>
                    {translate({ fr: "Toutes formules", en: "All formulas" })}
                  </td>
                  <td className="py-4 px-6 font-bold text-emerald-400 uppercase tracking-wider">
                    SUV Prestige (N3)
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-neutral-300 rounded-br-xl italic">
                    {translate({ fr: "Sur devis", en: "Upon request" })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="block md:hidden space-y-6">
            {/* À l'heure */}
            <div className="bg-black/30 border border-white-premium/10 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-[#0B3C2A] px-4 py-3 text-white font-sans text-xs font-bold uppercase tracking-wider">
                {translate({ fr: "À l'heure", en: "By the hour" })}
              </div>
              <div className="p-4 space-y-4 divide-y divide-white/5">
                {/* 1H */}
                <div className="pt-2 first:pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-gold-light font-bold">1 HEURE (1H)</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{translate({ fr: "Km inclus: —", en: "Km inc: —" })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                      <span className="block text-[10px] text-neutral-400 uppercase font-sans tracking-wide">Berline (N1)</span>
                      <span className="block text-xs font-mono font-bold text-gold-light mt-0.5">10 000 FCFA</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                      <span className="block text-[10px] text-neutral-400 uppercase font-sans tracking-wide">SUV Exec (N2)</span>
                      <span className="block text-xs font-mono font-bold text-neutral-300 mt-0.5">15 000 FCFA/h</span>
                    </div>
                  </div>
                </div>

                {/* 2H */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-gold-light font-bold">2 HEURES (2H)</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{translate({ fr: "Km inclus: —", en: "Km inc: —" })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                      <span className="block text-[10px] text-neutral-400 uppercase font-sans tracking-wide">Berline (N1)</span>
                      <span className="block text-xs font-mono font-bold text-gold-light mt-0.5">18 000 FCFA</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                      <span className="block text-[10px] text-neutral-400 uppercase font-sans tracking-wide">SUV Exec (N2)</span>
                      <span className="block text-xs font-mono font-bold text-neutral-300 mt-0.5">28 000 FCFA/h</span>
                    </div>
                  </div>
                </div>

                {/* 3H */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-gold-light font-bold">3 HEURES (3H)</span>
                      <span className="text-[8px] font-sans font-bold bg-[#0B3C2A] text-white uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                        {translate({ fr: "Recommandé", en: "Recommended" })}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">{translate({ fr: "Km inclus: —", en: "Km inc: —" })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gold/5 border border-gold/20 rounded-lg p-2.5">
                      <span className="block text-[10px] text-gold-light uppercase font-sans tracking-wide font-medium">Berline (N1)</span>
                      <span className="block text-xs font-mono font-bold text-gold-light mt-0.5">21 000 FCFA*</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                      <span className="block text-[10px] text-neutral-400 uppercase font-sans tracking-wide">SUV Exec (N2)</span>
                      <span className="block text-xs font-mono font-bold text-neutral-300 mt-0.5">39 000 FCFA/h</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Demi-journée */}
            <div className="bg-black/30 border border-white-premium/10 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-[#0B3C2A] px-4 py-3 text-white font-sans text-xs font-bold uppercase tracking-wider">
                {translate({ fr: "Demi-journée", en: "Half-day" })}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-gold-light font-bold">8 HEURES (8H)</span>
                  <span className="text-[10px] text-neutral-500 font-mono">{translate({ fr: "Km inclus: —", en: "Km inc: —" })}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                    <span className="block text-[10px] text-neutral-400 uppercase font-sans tracking-wide">Berline (N1)</span>
                    <span className="block text-xs font-mono font-bold text-gold-light mt-0.5">45 000 FCFA</span>
                  </div>
                  <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-emerald-400 uppercase font-sans tracking-wide font-bold">SUV Exec (N2)</span>
                      <span className="text-[7px] font-sans font-bold bg-[#0B3C2A] text-white uppercase tracking-wider px-1 rounded shrink-0">
                        {translate({ fr: "Top", en: "Top" })}
                      </span>
                    </div>
                    <span className="block text-xs font-mono font-bold text-emerald-400 mt-0.5">60 000 FCFA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Journée complète */}
            <div className="bg-black/30 border border-white-premium/10 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-[#0B3C2A] px-4 py-3 text-white font-sans text-xs font-bold uppercase tracking-wider">
                {translate({ fr: "Journée complète", en: "Full day" })}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-gold-light font-bold">16 HEURES (16H)</span>
                  <span className="text-[10px] text-neutral-500 font-mono">{translate({ fr: "Km inclus: —", en: "Km inc: —" })}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                    <span className="block text-[10px] text-neutral-400 uppercase font-sans tracking-wide">Berline (N1)</span>
                    <span className="block text-xs font-mono font-bold text-gold-light mt-0.5">85 000 FCFA</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                    <span className="block text-[10px] text-neutral-400 uppercase font-sans tracking-wide">SUV Exec (N2)</span>
                    <span className="block text-xs font-mono font-bold text-neutral-300 mt-0.5">110 000 FCFA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Toutes formules (N3) */}
            <div className="bg-[#051B13] border border-white-premium/10 rounded-xl p-4 flex items-center justify-between shadow-lg">
              <div>
                <span className="block text-[10px] text-emerald-400 uppercase font-sans tracking-wider font-bold">SUV Prestige (N3)</span>
                <span className="block text-xs text-neutral-400 font-sans mt-0.5">{translate({ fr: "Toutes formules", en: "All formulas" })}</span>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-200 italic">{translate({ fr: "Sur devis", en: "Upon request" })}</span>
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-lg font-sans font-semibold text-white tracking-tight mb-6 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
              {translate({ fr: "Majorations applicables à tous les niveaux", en: "Surcharges applicable to all levels" })}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-black/40 border border-white-premium/10 rounded-xl p-4 hover:border-gold-light/20 transition-all">
                  <div className="flex items-center gap-3">
                    <Check className="text-emerald-400 shrink-0" size={16} />
                    <span className="text-xs font-medium text-neutral-200">{translate({ fr: "Service de nuit (22H–6H)", en: "Night service (22H–6H)" })}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">+20%</span>
                </div>
                <div className="flex items-center justify-between bg-black/40 border border-white-premium/10 rounded-xl p-4 hover:border-gold-light/20 transition-all">
                  <div className="flex items-center gap-3">
                    <Check className="text-emerald-400 shrink-0" size={16} />
                    <span className="text-xs font-medium text-neutral-200">{translate({ fr: "Week-end & jours fériés", en: "Weekend & public holidays" })}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">+20%</span>
                </div>
                <div className="flex items-center justify-between bg-black/40 border border-white-premium/10 rounded-xl p-4 hover:border-gold-light/20 transition-all">
                  <div className="flex items-center gap-3">
                    <Check className="text-emerald-400 shrink-0" size={16} />
                    <span className="text-xs font-medium text-neutral-200">{translate({ fr: "Chauffeur bilingue", en: "Bilingual chauffeur" })}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">+15%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-black/40 border border-white-premium/10 rounded-xl p-4 hover:border-gold-light/20 transition-all">
                  <div className="flex items-center gap-3">
                    <Check className="text-emerald-400 shrink-0" size={16} />
                    <span className="text-xs font-medium text-neutral-200">{translate({ fr: "Accueil pancarte aéroport", en: "Airport meet & greet with sign" })}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">5 000 FCFA</span>
                </div>
                <div className="flex items-center justify-between bg-black/40 border border-white-premium/10 rounded-xl p-4 hover:border-gold-light/20 transition-all">
                  <div className="flex items-center gap-3">
                    <Check className="text-emerald-400 shrink-0" size={16} />
                    <span className="text-xs font-medium text-neutral-200">{translate({ fr: "Km supplémentaire", en: "Extra kilometer" })}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">2000–3500 FCFA/km</span>
                </div>
                <div className="flex items-center justify-between bg-black/40 border border-white-premium/10 rounded-xl p-4 hover:border-gold-light/20 transition-all">
                  <div className="flex items-center gap-3">
                    <Check className="text-emerald-400 shrink-0" size={16} />
                    <span className="text-xs font-medium text-neutral-200">{translate({ fr: "Annulation > 1H", en: "Cancellation > 1H" })}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">{translate({ fr: "Gratuite", en: "Free" })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mention tarifaire hors zone */}
        <div id="hors_zone_km_mention" className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-10 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold-light/20 flex items-center justify-center shrink-0">
              <Compass className="text-gold-light" size={18} />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-sans">
                {translate({ fr: "Trajets hors zone", en: "Trips outside area" })}
              </p>
              <h4 className="text-sm font-sans font-semibold text-white tracking-tight">
                {translate({ 
                  fr: "Tarif km hors zone = 1 500 FCFA/km", 
                  en: "Out of zone km rate = 1,500 FCFA/km" 
                })}
              </h4>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#00C853]/15 border border-[#00C853]/20 text-[#00C853] text-[10px] font-mono font-bold uppercase tracking-wider">
            ⚡ {translate({ fr: "Énergie toujours incluse", en: "Energy always included" })}
          </span>
        </div>

        {/* Prix Stables Highlighted Banner */}
        <div id="stable_pricing_banner" className="bg-gradient-to-r from-gold/20 via-gold/5 to-transparent border border-gold-light/30 rounded-2xl p-6 mb-16 flex flex-col md:flex-row items-center gap-6 backdrop-blur-xl">
          <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold-light/25 flex items-center justify-center shrink-0">
            <ShieldCheck className="text-gold-light" size={28} />
          </div>
          <div>
            <h4 className="text-lg font-sans font-semibold text-white tracking-tight">
              {translate({ fr: "Avantage Easy : Prix stables 24h/24, 7j/7", en: "Easy Advantage: Stable pricing 24/7" })}
            </h4>
            <p className="text-sm text-neutral-300 mt-1 leading-relaxed font-light">
              {translate({ 
                fr: "Pluie, embouteillage, nuit... votre budget est protégé.", 
                en: "Rain, traffic jams, night... your budget is protected." 
              })}
            </p>
          </div>
        </div>

        {/* 2. SPECIFIC SURCHARGES SECTION */}
        <h2 className="text-xl md:text-2xl font-sans font-light text-white tracking-tight mb-8">
          {t("ratesPremiumAdjustments")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {adjustments.map((adj, i) => (
            <Card 
              key={i} 
              id={`adjustment_card_${i}`} 
              className="flex flex-col gap-4 bg-white/5 backdrop-blur-lg border border-gold-light/15 p-6 rounded-2xl hover:border-gold-light/30 transition-all duration-350"
            >
              <div className="w-10 h-10 rounded-full bg-transparent border border-white/10 flex items-center justify-center shrink-0">
                {adj.icon}
              </div>
              <div>
                <h3 className="text-sm font-sans font-semibold text-white">
                  {adj.title}
                </h3>
                <p className="text-xs text-neutral-300 mt-2 leading-relaxed font-light">
                  {adj.desc}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div id="faq_accordion_section" className="mb-16">
          <h2 className="text-xl md:text-2xl font-sans font-light text-white tracking-tight mb-8">
            {translate({ fr: "Questions Fréquentes (FAQ)", en: "Frequently Asked Questions (FAQ)" })}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  id={`faq_item_${index}`}
                  className="bg-white/5 border border-gold-light/10 rounded-xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left text-white hover:bg-white/5 transition-colors duration-200"
                  >
                    <span className="text-sm font-sans font-medium">
                      {translate(faq.question)}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="text-gold-light" size={18} />
                    ) : (
                      <ChevronDown className="text-neutral-400" size={18} />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 border-t border-white/5 text-xs text-neutral-300 leading-relaxed font-light">
                      {translate(faq.answer)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. BUSINESS RULES FAQs PANEL */}
        <div id="faq_rates_container" className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-gold-light/20 shadow-xl">
          <h4 className="text-sm font-sans font-bold text-white flex items-center gap-2 mb-3">
            <HelpCircle size={16} className="text-gold-light" />
            {translate({ fr: "Conditions contractuelles simplifiées", en: "Simplified Contractual Terms" })}
          </h4>
          <p className="text-xs text-neutral-300 leading-relaxed font-light">
            {translate({
              fr: "* L'ensemble des prestations intègre l'assurance tous risques voyageurs, la climatisation de prestige, les bouteilles d'eau rafraîchissantes et l'accès Wi-Fi au sein du véhicule. La tarification débute au départ de notre agence ou de l'adresse de prise en charge valide fournie lors du contrat. Tout dépassement au-delà de 15 minutes est facturé au prorata de l'heure entamée. Pour toute demande de facturation mensuelle groupée ou contrat cadre Corporate, veuillez directement contacter notre Bureau Plateau.",
              en: "* All services include fully comprehensive passenger insurance, upscale climate comfort, complimentary chilled mineral water, and high-speed onboard Wi-Fi. Billing commences upon vehicle departure from our office or your designated pickup address. Grace period for wait times is 15 minutes, after which overtime is billed pro-rata. For consolidated recurring monthly invoicing or tailored Corporate Framework Agreements, please contact our Plateau Desk directly."
            })}
          </p>
        </div>

      </div>
    </div>
  );
};
