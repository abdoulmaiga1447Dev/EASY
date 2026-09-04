import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useSegment } from "../context/SegmentContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import ElectricBorder from "../components/ElectricBorder";
import { 
  ShieldCheck, 
  Zap, 
  Award, 
  Star, 
  ArrowUpRight, 
  ArrowDown,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Leaf,
  Globe,
  TrendingUp,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// @ts-ignore
import heroCarImg from "../assets/images/hero_car.png";
// @ts-ignore
import hotelImg from "../assets/images/hotel.png";
// @ts-ignore
import corporateImg from "../assets/images/corporate.jpeg";
// @ts-ignore
import vehicleN1 from "../assets/images/berline-premium/WhatsApp_Image_2026-06-20_at_15.41.22.jpeg_202606241515.jpeg";
// @ts-ignore
import vehicleN2 from "../assets/images/vehicle_n2.png";
// @ts-ignore
import vehicleN3 from "../assets/images/vehicle_n3.png";

interface HomeProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

export const Home: React.FC<HomeProps> = ({
  setCurrentPage,
  id
}) => {
  const { t, translate, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { setSegment } = useSegment();
  const [activeCarIndex, setActiveCarIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);

  const serviceCards = [
    {
      title: { fr: "HEURE", en: "BY THE HOUR" },
      text: {
        fr: "Rendez-vous avancé, voiture en panne, pas le temps de chercher un taxi ? Un chauffeur + véhicule électrique à l’heure, et vous êtes à l’heure.",
        en: "Advanced appointment, car broke down, no time to look for a taxi? A chauffeur + electric vehicle by the hour, and you're on time."
      }
    },
    {
      title: { fr: "DEMI-JOURNÉE (8H)", en: "HALF-DAY (8H)" },
      text: {
        fr: "Aéroport, réunions en cascade, pas une minute à perdre au volant ? 8h de chauffeur privé électrique : vous gérez vos dossiers, on gère la route.",
        en: "Airport, consecutive meetings, not a minute to waste driving? 8h of premium electric chauffeur: you manage your business, we manage the road."
      }
    },
    {
      title: { fr: "JOURNÉE (16H)", en: "FULL DAY (16H)" },
      text: {
        fr: "Mariage, séminaire, visite protocolaire avec plusieurs arrêts ? Une journée complète (16h) de chauffeur + véhicule électrique, sans pause essence.",
        en: "Wedding, seminar, protocol visit with multiple stops? A full day (16h) of chauffeur + electric vehicle, without fuel stops."
      }
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveServiceIndex((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const showcaseVehicles = [
    {
      id: "v_berline_n1",
      name: "Berline Premium N1",
      brand: "EASY SEDAN",
      tagline: {
        fr: "La quintessence de l'élégance urbaine",
        en: "The ultimate expression of urban elegance"
      },
      description: {
        fr: "Conçue pour redéfinir la mobilité urbaine haut de gamme à Abidjan. Son habitacle spacieux et insonorisé offre un sanctuaire de sérénité pour vos trajets privés.",
        en: "Designed to redefine premium urban mobility in Abidjan. Its spacious, soundproof cabin offers a sanctuary of serenity for your private journeys."
      },
      image: vehicleN1,
      presentation: {
        fr: "Berline de luxe raffinée avec intérieur en cuir premium, climatisation tri-zone optimisée, vitres teintées de sécurité pour une confidentialité totale, prises de recharge et connectivité embarquée pour travailler en toute sérénité. Elle offre 4 places spacieuses et un grand coffre pour bagages.",
        en: "Refined luxury sedan with premium leather interior, optimized tri-zone climate control, tinted privacy glass for total confidentiality, power outlets, and onboard connectivity to work in peace. It offers 4 spacious seats and a large luggage compartment."
      },
      price: {
        fr: "10 000 FCFA / heure",
        en: "10,000 FCFA / hour"
      }
    },
    {
      id: "v_suv_n2",
      name: "SUV Executive N2",
      brand: "EASY COMFORT",
      tagline: {
        fr: "Le confort souverain sur tous les terrains",
        en: "Sovereign comfort across any landscape"
      },
      description: {
        fr: "Idéal pour les délégations, leaders d'opinion et déplacements familiaux. Une assise surélevée avec de grands volumes et une transmission intégrale intelligente (AWD).",
        en: "Ideal for delegations, key opinion leaders, and executive family travels. High seating status with large volume configurations and smart All-Wheel Drive (AWD)."
      },
      image: vehicleN2,
      presentation: {
        fr: "SUV routier d'exception de haute stature, combinant confort princier et grande habitabilité. Équipé de sièges en cuir ventilés et chauffants, d'un espace de chargement de valises monumental et d'une insonorisation de pointe, parfait pour 6 passagers.",
        en: "Outstanding high-stature SUV combining princely comfort with extreme spaciousness. Features ventilated heated leather seats, massive luggage capacity, and state-of-the-art soundproofing, perfectly accommodating up to 6 passengers."
      },
      price: {
        fr: "15 000 FCFA / heure",
        en: "15,000 FCFA / hour"
      }
    },
    {
      id: "v_suv_n3",
      name: "SUV Prestige N3",
      brand: "EASY PRESIDENTIAL",
      tagline: {
        fr: "L'excellence absolue du luxe protocolaire",
        en: "The absolute zenith of diplomatic standard luxury"
      },
      description: {
        fr: "Le sommet mondial du luxe et de la technologie. Réservé aux personnalités d'État, officiels, diplomates de haut rang et voyages d'affaires de prestige à Abidjan.",
        en: "The international summit of automotive luxury and technology. Reserved for state leaders, high-ranking delegates, and highly prestigious business operations."
      },
      image: vehicleN3,
      presentation: {
        fr: "Le joyau suprême du luxe automobile et diplomatique. Habitacle ultra-privatif première classe en cuir nappa, suspension pneumatique lissante active, finitions artisanales exclusives et vitrages de protection renforcés. Idéal pour cortèges, VIP et officiels.",
        en: "The crowning jewel of automotive luxury and diplomatic prestige. Ultra-private first-class nappa leather cabin, active smoothing air suspension, exclusive hand-crafted finishes, and reinforced safety windows. Perfect for motorcades, VIPs, and officials."
      },
      price: {
        fr: "Sur devis",
        en: "Upon Request"
      }
    }
  ];

  useEffect(() => {
    if (!isAutoPlay) return;
    const interval = setInterval(() => {
      setActiveCarIndex((prev) => (prev + 1) % showcaseVehicles.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isAutoPlay, showcaseVehicles.length]);

  const handleNavigate = (pageId: string) => {
    setCurrentPage(pageId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div id={id} className="min-h-screen bg-dark">
      {/* 1. HERO SECTION (Full viewport with background) */}
      <section
        id="hero_section"
        className="relative min-h-[calc(100vh-69px)] lg:min-h-[calc(100vh-81px)] py-12 md:py-20 w-full flex items-center justify-center bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url(${heroCarImg})` }}
      >
        {/* Dark overlay with 65% opacity */}
        <div id="hero_overlay" className="absolute inset-0 bg-[#0A0A0F]/65 z-10"></div>

        {/* Ambient glow in the background */}
        <div className="absolute top-1/4 left-1/4 w-[30vw] h-[30vw] rounded-full bg-gold/5 blur-[120px] pointer-events-none z-10"></div>

        <div id="hero_content" className="relative z-20 text-center max-w-4xl px-4 flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-4xl md:text-6xl font-sans font-bold tracking-tight text-white-premium leading-tight md:leading-[1.1] whitespace-pre-line"
          >
            {t("heroTitle")}
          </motion.h1>

          {/* Service Rotation Cards/Rectangles */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-2xl mt-8 rounded-xl border border-gold/15 bg-black/50 backdrop-blur-md p-6 md:p-8 relative overflow-hidden"
          >
            {/* Tab Titles Header */}
            <div className="flex justify-around items-center border-b border-white-premium/5 pb-4 mb-6 overflow-x-auto gap-2 scrollbar-none">
              {serviceCards.map((card, idx) => {
                const isActive = idx === activeServiceIndex;
                return (
                  <button
                    key={idx}
                    id={`service_tab_${idx}`}
                    onClick={() => setActiveServiceIndex(idx)}
                    className="relative pb-2 px-3 focus:outline-none whitespace-nowrap transition-colors duration-300 cursor-pointer"
                  >
                    <span className={`text-[10px] md:text-xs font-mono uppercase tracking-widest font-bold transition-all duration-300 ${
                      isActive ? "text-gold drop-shadow-[0_0_8px_rgba(230,190,130,0.5)]" : "text-muted-premium hover:text-white"
                    }`}>
                      {translate(card.title)}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeServiceTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Card Content Container with clean height */}
            <div className="min-h-[110px] sm:min-h-[90px] md:min-h-[80px] flex items-center justify-center text-center px-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeServiceIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="w-full"
                >
                  <p className="text-sm md:text-base text-white-premium font-sans leading-relaxed tracking-wide italic">
                    "{translate(serviceCards[activeServiceIndex].text)}"
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination Indicators / Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {serviceCards.map((_, idx) => (
                <button
                  key={idx}
                  id={`service_dot_${idx}`}
                  onClick={() => setActiveServiceIndex(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === activeServiceIndex ? "bg-gold w-4" : "bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </motion.div>

          {/* Luminous Pulsing Arrow indicating the Reservation button */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{ 
              opacity: { duration: 0.8, delay: 0.4 },
              y: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } 
            }}
            className="flex flex-col items-center mt-8 mb-2 z-20"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-gold-light animate-pulse mb-1.5 font-semibold">
              {translate({ fr: "Réserver ci-dessous", en: "Book Instantly Below" })}
            </span>
            <ArrowDown className="text-gold w-6 h-6 drop-shadow-[0_0_10px_rgba(230,190,130,0.9)] filter" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto"
          >
            <Button
              id="hero_cta_booking"
              variant="primary"
              onClick={() => handleNavigate(isAuthenticated ? "reservation" : "connexion")}
              className="px-8 py-4 text-base"
            >
              <Zap size={18} />
              {t("heroCTA")}
            </Button>
            <Button
              id="hero_cta_fleet"
              variant="outline"
              onClick={() => handleNavigate("vehicules")}
              className="px-8 py-4 text-base"
            >
              {translate({ fr: "Découvrir la Flotte", en: "Explore Fleet" })}
            </Button>
            <Button
              id="hero_cta_eco"
              variant="outline"
              onClick={() => handleNavigate("rapport-ecologique")}
              className="px-8 py-4 text-base border-emerald-500/20 hover:border-emerald-500/80 text-emerald-400 hover:bg-emerald-500/10 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Leaf size={18} className="text-emerald-400 animate-pulse" />
              {translate({ fr: "Rapport Écologique", en: "Eco Report" })}
            </Button>
          </motion.div>
        </div>

        {/* Elegant downward indicator */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
          <span className="text-[10px] uppercase tracking-widest text-gold font-mono">EASY CO₂ SAVINGS</span>
        </div>
      </section>

      {/* 2. CHIEF STATS SECTION */}
      <section id="stats_section" className="relative bg-white py-16 px-4 border-y border-neutral-200">
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.2,
              }
            }
          }}
          className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
        >
          {/* Stat 1 */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
            className="w-full"
          >
            <ElectricBorder
              color="#92e90e"
              speed={0.6}
              chaos={0.13}
              thickness={2}
              borderRadius={16}
              style={{ borderRadius: 16 }}
              className="w-full"
            >
              <div className="flex flex-col items-center p-6 rounded-[16px] bg-neutral-50 border border-neutral-200/80 hover:border-gold/40 transition-all duration-300 min-h-[220px] justify-center">
                <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-4 text-gold">
                  <Award size={22} />
                </div>
                <span className="text-3xl font-mono font-bold text-gold mb-1">3</span>
                <h3 className="text-sm font-sans font-bold text-neutral-900">
                  {t("statVehiclesTitle")}
                </h3>
                <p className="text-xs text-neutral-600 mt-1 max-w-xs leading-relaxed font-medium">
                  {t("statVehiclesDesc")}
                </p>
              </div>
            </ElectricBorder>
          </motion.div>

          {/* Stat 2 */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
            className="w-full"
          >
            <ElectricBorder
              color="#92e90e"
              speed={0.6}
              chaos={0.13}
              thickness={2}
              borderRadius={16}
              style={{ borderRadius: 16 }}
              className="w-full"
            >
              <div className="flex flex-col items-center p-6 rounded-[16px] bg-neutral-50 border border-neutral-200/80 hover:border-gold/40 transition-all duration-300 min-h-[220px] justify-center">
                <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-4 text-gold">
                  <Zap size={22} className="animate-pulse" />
                </div>
                <span className="text-3xl font-mono font-bold text-gold mb-1">100%</span>
                <h3 className="text-sm font-sans font-bold text-neutral-900">
                  {t("statEcoTitle")}
                </h3>
                <p className="text-xs text-neutral-600 mt-1 max-w-xs leading-relaxed font-medium">
                  {t("statEcoDesc")}
                </p>
              </div>
            </ElectricBorder>
          </motion.div>

          {/* Stat 3 */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
            className="w-full"
          >
            <ElectricBorder
              color="#92e90e"
              speed={0.6}
              chaos={0.13}
              thickness={2}
              borderRadius={16}
              style={{ borderRadius: 16 }}
              className="w-full"
            >
              <div className="flex flex-col items-center p-6 rounded-[16px] bg-neutral-50 border border-neutral-200/80 hover:border-gold/40 transition-all duration-300 min-h-[220px] justify-center">
                <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-4 text-gold">
                  <ShieldCheck size={22} />
                </div>
                <span className="text-3xl font-mono font-bold text-gold mb-1">24h / 7j</span>
                <h3 className="text-sm font-sans font-bold text-neutral-900">
                  {t("statHoursTitle")}
                </h3>
                <p className="text-xs text-neutral-600 mt-1 max-w-xs leading-relaxed font-medium">
                  {t("statHoursDesc")}
                </p>
              </div>
            </ElectricBorder>
          </motion.div>
        </motion.div>
      </section>

      {/* 2.5 MERCEDES-BENZ STYLE LUXURY VEHICLE SHOWCASE */}
      <section
        id="mercedes_showcase_section"
        className="relative bg-black py-24 px-4 overflow-hidden border-t border-neutral-900"
        onMouseEnter={() => setIsAutoPlay(false)}
        onMouseLeave={() => setIsAutoPlay(true)}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,20,30,0.45)_0%,rgba(0,0,0,1)_80%)] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* Section Headings */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 bg-neutral-900 border border-neutral-800 rounded-full mb-4"
            >
              <Sparkles size={12} className="text-gold" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold-light">
                {translate({ fr: "EXPÉRIENCE CHAUFFEUR UNIQUE", en: "SUBLIME CHAUFFEUR SENSATION" })}
              </span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-5xl font-sans font-light text-white-premium tracking-tight"
            >
              {translate({ fr: "L'Art de Voyager", en: "The Pure Art of Travel" })}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm text-muted-premium mt-3 max-w-lg mx-auto"
            >
              {translate({ 
                fr: "Explorez notre triptyque de véhicules exclusifs, alliant un design athlétique raffiné à un silence de fonctionnement absolu.",
                en: "Explore our trilogy of elite electric flagships, blending athletic luxury with absolute mechanical silence."
              })}
            </motion.p>
          </div>

          {/* Mercedes-style selector tabs */}
          <div className="flex justify-center border-b border-neutral-900 mb-16 overflow-x-auto scrollbar-none pb-px">
            <div className="flex gap-4 md:gap-8 whitespace-nowrap min-w-max px-4">
              {showcaseVehicles.map((car, idx) => {
                const isActive = idx === activeCarIndex;
                return (
                  <button
                    key={car.id}
                    onClick={() => {
                      setActiveCarIndex(idx);
                      setIsAutoPlay(false); // Pause-on-click
                    }}
                    className="relative pb-4 text-xs md:text-sm font-sans tracking-widest uppercase transition-colors duration-300 cursor-pointer"
                    style={{ color: isActive ? "#F4F2EE" : "#8A8A9A" }}
                  >
                    <span>{car.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeShowcaseLine"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold"
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Product Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-5 flex flex-col justify-center text-left order-2 lg:order-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCarIndex}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <div>
                    <span className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase block mb-1">
                      {showcaseVehicles[activeCarIndex].brand}
                    </span>
                    <h3 className="text-3xl font-sans font-light tracking-tight text-white-premium">
                      {showcaseVehicles[activeCarIndex].name}
                    </h3>
                    <p className="text-xs font-sans text-gold-light tracking-wide mt-2 italic font-light">
                      "{translate(showcaseVehicles[activeCarIndex].tagline)}"
                    </p>
                  </div>

                  <p className="text-xs text-muted-premium leading-relaxed font-light">
                    {translate(showcaseVehicles[activeCarIndex].description)}
                  </p>

                  {/* Presentation Text */}
                  <div className="border-y border-neutral-900 py-5 my-5 font-sans">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#8A8A9A] block mb-2">
                      {translate({ fr: "SERVICES & CARACTÉRISTIQUES", en: "SERVICES & KEY CHARACTERISTICS" })}
                    </span>
                    <p className="text-xs text-white-premium leading-relaxed font-light">
                      {translate(showcaseVehicles[activeCarIndex].presentation)}
                    </p>
                  </div>

                  {/* Pricing Callout and CTAs */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-premium block">
                        {translate({ fr: "TARIFICATION COMMERCIALE", en: "COMMERCIAL PRICING" })}
                      </span>
                      <span className="text-xl font-sans font-bold text-white-premium mt-0.5 block">
                        {translate(showcaseVehicles[activeCarIndex].price)}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      {showcaseVehicles[activeCarIndex].id.includes("suv") ? (
                        <Button
                          id={`showcase_cta_book_${showcaseVehicles[activeCarIndex].id}`}
                          variant="outline"
                          disabled
                          className="px-6 py-3 text-xs uppercase tracking-wider bg-neutral-900 border-neutral-800 text-neutral-500 cursor-not-allowed"
                        >
                          {translate({ fr: "Disponible bientôt", en: "Available soon" })}
                        </Button>
                      ) : (
                        <Button
                          id={`showcase_cta_book_${showcaseVehicles[activeCarIndex].id}`}
                          variant="primary"
                          onClick={() => {
                            localStorage.setItem("ev_selected_vehicle_id", showcaseVehicles[activeCarIndex].id);
                            handleNavigate(isAuthenticated ? "reservation" : "connexion");
                          }}
                          className="px-6 py-3 text-xs uppercase tracking-wider bg-gold hover:bg-gold-light border-none text-dark"
                        >
                          {translate({ fr: "Réserver", en: "Book Now" })}
                        </Button>
                      )}
                      <Button
                        id={`showcase_cta_fleet_${showcaseVehicles[activeCarIndex].id}`}
                        variant="outline"
                        onClick={() => handleNavigate("vehicules")}
                        className="px-6 py-3 text-xs uppercase tracking-wider border-neutral-800 text-white-premium hover:bg-neutral-900"
                      >
                        {translate({ fr: "Flotte", en: "Fleet" })}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right Asset Showcase Column (Mercedes Showroom Stage) */}
            <div className="lg:col-span-7 relative flex flex-col items-center justify-center order-1 lg:order-2">
              
              {/* Mercedes Ambient Platform Stage */}
              <div className="absolute w-[80%] h-[40%] bg-gold/5 rounded-full filter blur-[80px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none"></div>

              {/* Slider Image Viewer */}
              <div className="relative w-full h-[260px] md:h-[360px] flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCarIndex}
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 flex items-center justify-center p-4"
                  >
                    {/* The raw unmodified high-res image exactly matching the requirements */}
                    <div className="relative flex items-center justify-center w-full h-full">
                      <img
                        src={showcaseVehicles[activeCarIndex].image}
                        alt={showcaseVehicles[activeCarIndex].name}
                        referrerPolicy="no-referrer"
                        className={`max-w-full max-h-full object-contain pointer-events-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-all duration-300 ${
                          showcaseVehicles[activeCarIndex].id.includes("suv") ? "opacity-30 grayscale" : ""
                        }`}
                      />
                      {showcaseVehicles[activeCarIndex].id.includes("suv") && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="bg-red-950/80 border border-red-800 text-red-500 font-sans text-xs md:text-sm uppercase tracking-widest px-4 py-2 rounded-lg font-bold shadow-2xl backdrop-blur-xs">
                            {translate({ fr: "Indisponible - Bientôt disponible", en: "Unavailable - Coming soon" })}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Circular Slide Controls (Chevron style) */}
              <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 flex justify-between z-20 pointer-events-none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAutoPlay(false);
                    setActiveCarIndex((prev) => (prev - 1 + showcaseVehicles.length) % showcaseVehicles.length);
                  }}
                  className="w-10 h-10 rounded-full border border-neutral-800 hover:border-gold bg-black/80 hover:bg-black text-white hover:text-gold flex items-center justify-center transition-all duration-300 pointer-events-auto cursor-pointer"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAutoPlay(false);
                    setActiveCarIndex((prev) => (prev + 1) % showcaseVehicles.length);
                  }}
                  className="w-10 h-10 rounded-full border border-neutral-800 hover:border-gold bg-black/80 hover:bg-black text-white hover:text-gold flex items-center justify-center transition-all duration-300 pointer-events-auto cursor-pointer"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Auto play status progress dots */}
              <div className="flex gap-2.5 mt-4 z-20">
                {showcaseVehicles.map((_, idx) => {
                  const isActive = idx === activeCarIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveCarIndex(idx);
                        setIsAutoPlay(false);
                      }}
                      className="relative h-1 transition-all duration-500 rounded-full cursor-pointer"
                      style={{ 
                        width: isActive ? "32px" : "8px", 
                        backgroundColor: isActive ? "var(--color-gold)" : "#262626" 
                      }}
                    >
                      {isActive && isAutoPlay && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 8, ease: "linear" }}
                          className="absolute inset-0 bg-white rounded-full opacity-60"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

            </div>

          </div>

          {/* Tiny disclaimer to blend into Mercedes look */}
          <div className="mt-16 text-center text-[9px] font-mono uppercase tracking-[0.15em] text-neutral-600">
            {translate({ 
              fr: "• DESIGN PREMIUM SANS COMPROMIS • MODÈLES SUJETS À DISPONIBILITÉ GÉOGRAPHIQUE •", 
              en: "• COMPROMISELESS LUXURY • VEHICLES SUBJECT TO OPERATIONAL AVAILABILITY •" 
            })}
          </div>

        </div>
      </section>

      {/* 3. EXPERIENCE & THREE COHORT SEGMENTS */}
      <section id="segments_section" className="bg-white py-24 border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-gold font-semibold">
              SEGMENTS EXCLUSIFS
            </span>
            <h2 className="text-2xl md:text-4xl font-sans font-bold text-neutral-900 tracking-tight mt-3">
              {t("segmentTitle")}
            </h2>
            <p className="text-sm text-neutral-600 mt-4 font-medium">
              {t("segmentSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Segment 1: Hospi */}
            <Card id="segment_card_hospi" className="relative overflow-hidden flex flex-col justify-between" glow={true}>
              {/* Background Image with Hover Zoom */}
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 hover:scale-105 pointer-events-none"
                style={{ 
                  backgroundImage: `url(${hotelImg})`,
                }} 
              />
              
              {/* Uniform dark semi-transparent overlay covering 100% of the card area for perfect legibility and a completely uniform look */}
              <div className="absolute inset-0 bg-black/65 z-10 pointer-events-none" />
              
              {/* Content sitting cleanly on top of the overlay, respecting parent's layout and padding */}
              <div className="relative z-20 flex flex-col justify-between h-full">
                <div>
                  <div className="text-gold text-lg font-bold font-sans border-b border-gold/20 pb-3 mb-4">
                    {t("segment1Name")}
                  </div>
                  <p className="text-xs text-white/95 leading-relaxed mb-6 font-medium">
                    {t("segment1Desc")}
                  </p>
                  <ul className="space-y-2.5 text-xs text-white mb-6">
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle size={14} className="text-gold shrink-0" />
                      <span>{translate({ fr: "Des conditions commerciales taillées pour votre établissement", en: "Tailored commercial conditions for your establishment" })}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle size={14} className="text-gold shrink-0" />
                      <span>{translate({ fr: "Facturation simplifiée, sans gestion administrative", en: "Simplified invoicing, zero administrative hassle" })}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle size={14} className="text-gold shrink-0" />
                      <span>{translate({ fr: "Suivi en temps réel de chaque prise en charge", en: "Real-time tracking for every pickup" })}</span>
                    </li>
                  </ul>
                </div>
                <Button
                  id="segment_cta_hospi"
                  variant="outline"
                  onClick={() => {
                    setSegment("premium");
                    handleNavigate("contact");
                  }}
                  className="w-full text-xs bg-black/60 hover:bg-gold/20 border-gold/40 text-gold hover:text-white-premium transition-all"
                >
                  {translate({ fr: "Partenariat Hôtelier", en: "Hotel Partnership" })} <ArrowUpRight size={14} />
                </Button>
              </div>
            </Card>

            {/* Segment 2: Corp */}
            <Card id="segment_card_corp" className="relative overflow-hidden flex flex-col justify-between" glow={true}>
              {/* Background Image with Hover Zoom */}
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 hover:scale-105 pointer-events-none"
                style={{ 
                  backgroundImage: `url(${corporateImg})`,
                }} 
              />
              
              {/* Uniform dark semi-transparent overlay covering 100% of the card area for perfect legibility and a completely uniform look */}
              <div className="absolute inset-0 bg-black/65 z-10 pointer-events-none" />
              
              {/* Content sitting cleanly on top of the overlay, respecting parent's layout and padding */}
              <div className="relative z-20 flex flex-col justify-between h-full">
                <div>
                  <div className="text-gold text-lg font-bold font-sans border-b border-gold/20 pb-3 mb-4">
                    {t("segment2Name")}
                  </div>
                  <p className="text-xs text-white/95 leading-relaxed mb-6 font-medium">
                    {t("segment2Desc")}
                  </p>
                  <ul className="space-y-2.5 text-xs text-white mb-6">
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle size={14} className="text-gold shrink-0" />
                      <span>{translate({ fr: "Règlement flexible selon vos devises de référence", en: "Flexible settlement in your preferred currencies" })}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle size={14} className="text-gold shrink-0" />
                      <span>{translate({ fr: "Chauffeurs protocolaires bilingues", en: "Bilingual protocol chaperones" })}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle size={14} className="text-gold shrink-0" />
                      <span>{translate({ fr: "Assistance dédiée, disponible à toute heure", en: "Dedicated assistance, available at any hour" })}</span>
                    </li>
                  </ul>
                </div>
                <Button
                  id="segment_cta_corp"
                  variant="outline"
                  onClick={() => {
                    setSegment("premium");
                    handleNavigate("contact");
                  }}
                  className="w-full text-xs bg-black/60 hover:bg-gold/20 border-gold/40 text-gold hover:text-white-premium transition-all"
                >
                  {translate({ fr: "Espace Entreprise", en: "Corporate Area" })} <ArrowUpRight size={14} />
                </Button>
              </div>
            </Card>

            {/* Segment 3: Campus */}
            <Card id="segment_card_campus" className="bg-neutral-900 border-neutral-800/80 flex flex-col justify-between" glow={true}>
              <div>
                <div className="text-gold text-lg font-bold font-sans border-b border-gold/20 pb-3 mb-4">
                  {t("segment3Name")}
                </div>
                <p className="text-xs text-white/95 leading-relaxed mb-6 font-medium">
                  {t("segment3Desc")}
                </p>
                <ul className="space-y-2.5 text-xs text-white mb-6">
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle size={14} className="text-gold shrink-0" />
                    <span>{translate({ fr: "Paiement via vos solutions Mobile Money habituelles", en: "Payment via your usual Mobile Money solutions" })}</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle size={14} className="text-gold shrink-0" />
                    <span>{translate({ fr: "Suivi des trajets partagé en temps réel", en: "Real-time shared route tracking" })}</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle size={14} className="text-gold shrink-0" />
                    <span>{translate({ fr: "Conducteurs de confiance, formés à la sécurité", en: "Trusted, safety-trained drivers" })}</span>
                  </li>
                </ul>
              </div>
              <Button
                id="segment_cta_campus"
                variant="outline"
                onClick={() => {
                  setSegment("public");
                  handleNavigate("contact");
                }}
                className="w-full text-xs bg-black/60 hover:bg-gold/20 border-gold/40 text-gold hover:text-white-premium transition-all"
              >
                {translate({ fr: "S'inscrire à la navette", en: "Register for Shuttles" })} <ArrowUpRight size={14} />
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION WITH BACKGROUND SECTION */}
      <section
        id="cta_section"
        className="relative py-28 px-4 text-center bg-cover bg-center overflow-hidden border-t border-gold/10"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920')` }}
      >
        <div className="absolute inset-0 bg-dark/85 z-10"></div>
        
        <div className="relative z-20 max-w-3xl mx-auto flex flex-col items-center">
          <Star className="text-gold mb-4 fill-gold animate-pulse text-lg" size={26} />
          
          <h2 className="text-2xl md:text-4xl font-sans font-bold text-white-premium leading-tight tracking-tight mb-4">
            {translate({ fr: "Embarquez Pour L'Expérience Zéro Émission d'Exception", en: "Embark on an Exceptional Zero-Emission Experience" })}
          </h2>
          
          <p className="text-sm text-muted-premium mb-8 max-w-xl">
            {translate({
              fr: "Que vous soyez une ambassade à la recherche d'un protocole d'exception, un hôtel de luxe désireux de fidéliser sa clientèle, ou un parent privilégiant la sécurité absolue, nous avons la réponse.",
              en: "Whether you are an embassy looking for high-end protocol, a luxury hotel seeking guests retention, or a parent prioritizing supreme safety, we have the answer."
            })}
          </p>
          
          <Button
            id="footer_cta_reserve"
            variant="primary"
            onClick={() => handleNavigate("contact")}
            className="px-8 py-3.5"
          >
            {translate({ fr: "Contacter Notre Desk Central", en: "Contact Our Dispatch Center" })}
          </Button>
        </div>
      </section>
    </div>
  );
};
