import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Leaf, Zap, Globe, TrendingUp, ChevronLeft, Calendar, Award, Sparkles, ShieldCheck } from "lucide-react";
import DotField from "../components/DotField";

interface RapportEcologiqueProps {
  setCurrentPage: (page: string) => void;
  id?: string;
}

export const RapportEcologique: React.FC<RapportEcologiqueProps> = ({ setCurrentPage, id = "page_rapport_ecologique_component" }) => {
  const { language, translate } = useLanguage();
  const [ecoReport, setEcoReport] = useState<{
    kmElectrique: number;
    co2NonEmis: number;
    co2EviteTonnes: number;
    updatedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/eco-report")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setEcoReport(data);
        }
      })
      .catch((err) => console.error("Error loading eco report page:", err))
      .finally(() => setLoading(false));
  }, []);

  // Compute nice carbon equivalences
  const co2NonEmisKg = ecoReport ? ecoReport.co2NonEmis : 1850;
  const treesCount = Math.round(co2NonEmisKg / 22); // Avg mature tree absorbs 22kg CO2/year
  const flightsSaved = (co2NonEmisKg / 200).toFixed(1); // Avg short flight emits ~200kg CO2 per passenger
  const smartphoneCharges = Math.round(co2NonEmisKg * 120); // 1kg CO2 ~ 120 smartphone charges

  return (
    <div id={id} className="min-h-screen bg-black py-16 md:py-24 px-4 relative overflow-hidden">
      {/* Background Interactive DotField pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          bulgeStrength={65}
          glowRadius={180}
          sparkle={false}
          waveAmplitude={0}
          cursorRadius={500}
          cursorForce={0.1}
          bulgeOnly
          gradientFrom="#10B981"
          gradientTo="#F59E0B"
          glowColor="#08070A"
        />
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Back Button */}
        <div className="mb-8">
          <Button
            id="back_to_home_eco"
            variant="outline"
            onClick={() => setCurrentPage("home")}
            className="border-white/10 text-neutral-400 hover:text-white-premium hover:border-emerald-500/50 flex items-center gap-2"
          >
            <ChevronLeft size={16} />
            {translate({ fr: "Retour à l'accueil", en: "Back to Home" })}
          </Button>
        </div>

        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-emerald-400 font-bold flex items-center justify-center gap-2">
            <Leaf size={14} className="animate-pulse" />
            {translate({ fr: "IMPACT ENVIRONNEMENTAL DE NOS FLOTTES", en: "ENVIRONMENTAL IMPACT OF OUR FLEETS" })}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-black text-white-premium tracking-tight mt-3">
            {translate({ fr: "Rapport Écologique Quotidien", en: "Daily Ecological Report" })}
          </h1>
          <p className="text-sm md:text-base text-neutral-400 mt-4 leading-relaxed max-w-2xl mx-auto">
            {translate({
              fr: "Parce que le luxe d'aujourd'hui ne doit pas compromettre l'air de demain. Suivez en direct les gains environnementaux réels et certifiés de notre service de transport décarboné.",
              en: "Because today's luxury must not compromise tomorrow's air. Follow in real-time the real, certified environmental savings of our decarbonized transport service."
            })}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mb-4"></div>
            <p className="text-sm font-mono text-neutral-400">
              {translate({ fr: "Chargement du rapport écologique...", en: "Loading ecological report..." })}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Key Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Metric 1 */}
              <Card
                id="eco_page_km_card"
                className="bg-[#0D0D12] border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl p-6 md:p-8 relative overflow-hidden transition-all duration-300 group shadow-lg shadow-emerald-950/10"
                glow={true}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Zap size={24} />
                </div>
                <span className="text-xs font-mono uppercase text-neutral-400 tracking-wider">
                  {translate({ fr: "Distance Propre", en: "Clean Distance" })}
                </span>
                <div className="text-3xl md:text-4xl lg:text-5xl font-mono font-black text-white-premium mt-2 group-hover:text-emerald-400 transition-colors">
                  {ecoReport ? ecoReport.kmElectrique.toLocaleString() : "12,450"}{" "}
                  <span className="text-sm md:text-lg text-neutral-400 font-sans font-semibold">km</span>
                </div>
                <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                  {translate({
                    fr: "Kilomètres totaux parcourus par nos berlines et vans 100% électriques sans aucune émission directe de gaz à effet de serre.",
                    en: "Total kilometers driven by our 100% electric sedans and vans with zero tailpipe greenhouse gas emissions."
                  })}
                </p>
              </Card>

              {/* Metric 2 */}
              <Card
                id="eco_page_co2_card"
                className="bg-[#0D0D12] border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl p-6 md:p-8 relative overflow-hidden transition-all duration-300 group shadow-lg shadow-emerald-950/10"
                glow={true}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Globe size={24} />
                </div>
                <span className="text-xs font-mono uppercase text-neutral-400 tracking-wider">
                  {translate({ fr: "Masse CO₂ Évitée", en: "CO₂ Mass Saved" })}
                </span>
                <div className="text-3xl md:text-4xl lg:text-5xl font-mono font-black text-white-premium mt-2 group-hover:text-emerald-400 transition-colors">
                  {ecoReport ? ecoReport.co2NonEmis.toLocaleString() : "1,850"}{" "}
                  <span className="text-sm md:text-lg text-neutral-400 font-sans font-semibold">kg</span>
                </div>
                <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                  {translate({
                    fr: "Quantité de dioxyde de carbone qui aurait été rejetée dans l'atmosphère par des véhicules thermiques de prestige équivalents.",
                    en: "Amount of carbon dioxide that would have been released into the atmosphere by equivalent premium combustion engine vehicles."
                  })}
                </p>
              </Card>

              {/* Metric 3 */}
              <Card
                id="eco_page_tonnes_card"
                className="bg-[#0D0D12] border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl p-6 md:p-8 relative overflow-hidden transition-all duration-300 group shadow-lg shadow-emerald-950/10"
                glow={true}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp size={24} />
                </div>
                <span className="text-xs font-mono uppercase text-neutral-400 tracking-wider">
                  {translate({ fr: "Bilan global évité", en: "Overall Avoided Balance" })}
                </span>
                <div className="text-3xl md:text-4xl lg:text-5xl font-mono font-black text-white-premium mt-2 group-hover:text-emerald-400 transition-colors">
                  {ecoReport ? ecoReport.co2EviteTonnes.toLocaleString() : "1.85"}{" "}
                  <span className="text-sm md:text-lg text-neutral-400 font-sans font-semibold">tonnes</span>
                </div>
                <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                  {translate({
                    fr: "Équivalent en tonnes de carbone nettes totalement évitées, validé par nos relevés kilométriques certifiés par notre direction.",
                    en: "Equivalent in net carbon metric tons fully avoided, validated by our official telematics mileage logs."
                  })}
                </p>
              </Card>

            </div>

            {/* Impact Equivalence Cards (Bento style) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-[#0A0A0F] border border-white-premium/5 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/5 flex items-center justify-center text-emerald-400 mb-4 border border-emerald-500/10">
                    <Leaf size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    {translate({ fr: "Absorption Forestière", en: "Forest Absorption" })}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                    {translate({
                      fr: `La quantité de CO₂ évitée équivaut au travail annuel d'assimilation du carbone par environ ${treesCount} arbres matures plantés en zone urbaine.`,
                      en: `The amount of CO₂ saved is equivalent to the annual carbon assimilation process of approximately ${treesCount} mature trees in urban environments.`
                    })}
                  </p>
                </div>
                <div className="text-3xl font-mono font-black text-emerald-400 mt-4">
                  ~ {treesCount} <span className="text-xs text-neutral-500 font-sans font-bold">{translate({ fr: "Arbres", en: "Trees" })}</span>
                </div>
              </div>

              <div className="bg-[#0A0A0F] border border-white-premium/5 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/5 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/10">
                    <Globe size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    {translate({ fr: "Vols aériens équivalents", en: "Equivalent Flights" })}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                    {translate({
                      fr: `Cela représente la même empreinte carbone que ${flightsSaved} vols aller-retour d'un seul passager pour un trajet court-courrier régional.`,
                      en: `This represents the same carbon footprint as ${flightsSaved} regional short-haul flight round trips for a single passenger.`
                    })}
                  </p>
                </div>
                <div className="text-3xl font-mono font-black text-blue-400 mt-4">
                  ~ {flightsSaved} <span className="text-xs text-neutral-500 font-sans font-bold">{translate({ fr: "Vols", en: "Flights" })}</span>
                </div>
              </div>

              <div className="bg-[#0A0A0F] border border-white-premium/5 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/5 flex items-center justify-center text-amber-400 mb-4 border border-amber-500/10">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    {translate({ fr: "Recharges de Smartphone", en: "Smartphone Charges" })}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                    {translate({
                      fr: `Équivaut à la consommation électrique requise pour recharger complètement un smartphone plus de ${smartphoneCharges.toLocaleString()} fois de suite.`,
                      en: `Equivalent to the total electrical consumption required to fully recharge a smartphone over ${smartphoneCharges.toLocaleString()} times in a row.`
                    })}
                  </p>
                </div>
                <div className="text-3xl font-mono font-black text-amber-400 mt-4">
                  ~ {smartphoneCharges.toLocaleString()} <span className="text-xs text-neutral-500 font-sans font-bold">{translate({ fr: "Recharges", en: "Charges" })}</span>
                </div>
              </div>

            </div>

            {/* Quality Commitment Section */}
            <div className="bg-gradient-to-r from-emerald-950/20 to-neutral-900/50 border border-emerald-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                <ShieldCheck size={32} />
              </div>
              <div className="space-y-1 text-center md:text-left">
                <h4 className="text-base font-semibold text-white-premium">
                  {translate({ fr: "Transparence & Rigueur Méthodologique", en: "Transparency & Methodological Rigor" })}
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {translate({
                    fr: "Les calculs écologiques sont effectués à partir d'un facteur d'émission de référence moyen de 150g de CO₂/km pour un véhicule thermique haut de gamme standard. Chaque kilomètre électrique retranché permet une déduction nette, mise à jour directement par notre direction d'exploitation sur la base de la télématique embarquée de nos véhicules.",
                    en: "Ecological calculations are based on a reference standard emission factor of 150g of CO₂/km for an equivalent luxury combustion engine. Each electric kilometer driven leads to a direct subtraction, updated transparently by our fleet management operators based on actual onboard telematics data."
                  })}
                </p>
              </div>
            </div>

            {/* Bottom Disclaimer */}
            <div className="text-center pt-8 border-t border-white-premium/5 text-[11px] text-neutral-500 space-y-1">
              <p>
                {translate({
                  fr: "Rapport actualisé quotidiennement par l'administrateur d'EASY CO₂ SAVINGS.",
                  en: "Report updated daily by the EASY CO₂ SAVINGS administrator."
                })}
              </p>
              {ecoReport?.updatedAt && (
                <div className="font-mono text-[10px] text-neutral-600">
                  {translate({ fr: "Dernière mise à jour : ", en: "Last updated: " })}
                  {new Date(ecoReport.updatedAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
