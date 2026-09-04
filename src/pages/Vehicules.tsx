import React, { useState, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import TextPressure from "../components/TextPressure";
import Antigravity from "../components/Antigravity";
import { 
  Zap, 
  Users, 
  Gauge, 
  Plug, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  ChevronRight, 
  ChevronDown,
  Briefcase,
  Flame,
  Award,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// @ts-ignore
import vehicle1_all from "../assets/images/all/pexels-cruz-in-portugal-36855175.jpg";
// @ts-ignore
import vehicle2_all from "../assets/images/all/pexels-eddievaldes155-16288341.jpg";
// @ts-ignore
import vehicle3_all from "../assets/images/all/pexels-giantasparagus-37576187.jpg";
// @ts-ignore
import vehicle4_all from "../assets/images/all/pexels-holyson-h-2154634702-35336611.jpg";

// @ts-ignore
import sedan1 from "../assets/images/berline-premium/WhatsApp_Image_2026-06-20_at_15.41.22.jpeg_202606241515.jpeg";
// @ts-ignore
import sedan2 from "../assets/images/berline-premium/Gemini_Generated_Image_t3ajr4t3ajr4t3aj.png";
// @ts-ignore
import sedan3 from "../assets/images/berline-premium/Gemini_Generated_Image_tqkztxtqkztxtqkz.png";
// @ts-ignore
import sedan_extra1 from "../assets/images/berline-premium/Gemini_Generated_Image_1zsh7n1zsh7n1zsh.png";
// @ts-ignore
import sedan_extra2 from "../assets/images/berline-premium/Gemini_Generated_Image_v70l4sv70l4sv70l.png";
// @ts-ignore
import sedan_extra3 from "../assets/images/berline-premium/Gemini_Generated_Image_wuffsawuffsawuff.png";

// @ts-ignore
import suv_exec1 from "../assets/images/suv-executive/pexels-vadutskevich-17000848.jpg";
// @ts-ignore
import suv_exec2 from "../assets/images/suv-executive/pexels-zion-10029774.jpg";
// @ts-ignore
import suv_exec3 from "../assets/images/suv-executive/pexels-cruz-in-portugal-36855175.jpg";

// @ts-ignore
import suv_pres1 from "../assets/images/suv-prestige/pexels-eddievaldes155-16288341.jpg";
// @ts-ignore
import suv_pres2 from "../assets/images/suv-prestige/pexels-giantasparagus-37576187.jpg";
// @ts-ignore
import suv_pres3 from "../assets/images/suv-prestige/pexels-holyson-h-2154634702-35336611.jpg";

const categoryMetadata: Record<string, { frTitle: string, enTitle: string, frSub: string, enSub: string, representativeId: string, priceFr: string, priceEn: string }> = {
  "berline-premium": {
    frTitle: "Berline Premium",
    enTitle: "Premium Sedan",
    frSub: "La quintessence de l'élégance urbaine. Conçues pour redéfinir la mobilité haut de gamme à Abidjan avec un habitacle insonorisé offrant un véritable sanctuaire de sérénité.",
    enSub: "The epitome of urban elegance. Designed to redefine premium mobility in Abidjan with a soundproof cabin offering a true sanctuary of serenity.",
    representativeId: "v_berline_n1",
    priceFr: "À partir de 10 000 FCFA / heure",
    priceEn: "From 10,000 FCFA / hour"
  },
  "suv-executive": {
    frTitle: "SUV Executive",
    enTitle: "Executive SUV",
    frSub: "Le confort souverain et la puissance sur tous les terrains. Idéal pour les délégations de cadres, les VIP et les besoins spacieux à Abidjan.",
    enSub: "Sovereign comfort and high capability across terrains. Perfect for corporate delegations, VIP guests, and high-capacity needs in Abidjan.",
    representativeId: "v_suv_n2_a",
    priceFr: "À partir de 15 000 FCFA / heure",
    priceEn: "From 15,000 FCFA / hour"
  },
  "suv-prestige": {
    frTitle: "SUV Prestige",
    enTitle: "Prestige SUV",
    frSub: "L'excellence absolue et l'autorité du luxe protocolaire. Équipés de dispositifs de sécurité d'élite pour les personnalités de premier plan.",
    enSub: "The absolute zenith of protocol luxury and state presence. Fully optimized with elite security arrangements for VIP state dignitaries.",
    representativeId: "v_suv_n3_a",
    priceFr: "Sur devis",
    priceEn: "Upon Request"
  }
};

const InteractiveVehicleCard: React.FC<{
  vehicle: any;
  translate: (val: any) => string;
}> = ({ vehicle, translate }) => {
  const images = vehicle.images || [vehicle.image];
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="w-full sm:w-[500px] shrink-0 snap-start snap-always">
      <motion.div
        id={`card_vehicle_showroom_${vehicle.id}`}
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="group relative w-full aspect-[16/10] border border-neutral-800/10 bg-neutral-900 hover:border-gold/65 rounded-2xl overflow-hidden shadow-xl transition-all duration-300"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`${vehicle.name} - Slide ${currentIndex + 1}`}
            referrerPolicy="no-referrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Navigation arrows (only visible if multiple images exist) */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Small slide indicator dots */}
        {images.length > 1 && (
          <div className="absolute top-4 right-4 z-20 flex gap-1 bg-black/40 px-2 py-1 rounded-full backdrop-blur-xs">
            {images.map((_: any, idx: number) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "bg-gold w-3" : "bg-white/45"
                }`}
              />
            ))}
          </div>
        )}

        {/* Gradient shadow for text contrast */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none z-10" />

        {/* Vehicle Text details - Clean absolute layer overlay */}
        <div className="absolute bottom-0 inset-x-0 p-5 z-10">
          <h3 className="text-sm md:text-base font-sans font-semibold text-white tracking-tight">
            {vehicle.brand} • {vehicle.name}
          </h3>
          <p className="text-xs text-neutral-300 mt-1 italic font-light truncate max-w-full font-sans">
            {translate(vehicle.tagline)}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const CategoryCarousel: React.FC<{
  category: { id: string; name: { fr: string; en: string } };
  vehicles: any[];
  t: (key: string) => string;
  translate: (val: any) => string;
  handleBook: (vehicleId: string) => void;
  toggleDetails: (id: string) => void;
  expandedVehicles: Record<string, boolean>;
}> = ({
  category,
  vehicles,
  t,
  translate,
  handleBook,
  toggleDetails,
  expandedVehicles
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const metadata = categoryMetadata[category.id] || {
    frTitle: translate(category.name),
    enTitle: translate(category.name),
    frSub: "",
    enSub: "",
    representativeId: vehicles[0]?.id || "",
    priceFr: "À partir de ...",
    priceEn: "Starting from ..."
  };

  const isSuv = category.id.includes("suv");

  return (
    <div id={`sec_${category.id}`} className="space-y-6 scroll-mt-24 pb-12 border-b border-neutral-900 last:border-b-0">
      {/* Category Header with Booking and price info adapted to our palette */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-900 pb-6">
        <div className="space-y-3 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-white-premium font-display text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 bg-neutral-900 rounded border border-neutral-800">
              {translate({ fr: "Type de Véhicule", en: "Vehicle Type" })}
            </span>
            <span className="text-[12px] font-display font-medium text-white tracking-wide uppercase px-3 py-1.5 bg-transparent rounded border border-gold/30">
              {translate({ fr: metadata.priceFr, en: metadata.priceEn })}
            </span>
            {isSuv && (
              <span className="text-[10px] font-sans font-bold tracking-widest text-red-500 bg-transparent border border-red-500/30 px-3 py-1 rounded">
                {translate({ fr: "PAS ENCORE DISPONIBLE", en: "NOT YET AVAILABLE" })}
              </span>
            )}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white-premium tracking-wide uppercase flex items-center gap-3">
            {translate({ fr: metadata.frTitle, en: metadata.enTitle }).toUpperCase()}
          </h2>
          <p className="text-xs text-muted-premium leading-relaxed font-light font-sans">
            {translate({ fr: metadata.frSub, en: metadata.enSub })}
          </p>
        </div>

        {/* Carousel actions and booking button */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-end font-sans">
          <Button
            id={`book_btn_category_${category.id}`}
            variant={isSuv ? "outline" : "primary"}
            onClick={isSuv ? undefined : () => handleBook(metadata.representativeId)}
            disabled={isSuv}
            className={`px-6 py-3 text-[10px] uppercase tracking-wider ${
              isSuv 
                ? "bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-50" 
                : "bg-gold hover:bg-gold-light text-dark font-display font-bold border-none shadow-lg transition-all duration-200"
            }`}
          >
            {isSuv 
              ? translate({ fr: "Pas encore disponible", en: "Not yet available" }) 
              : translate({ fr: "Réserver ce type", en: "Book this type" })}
          </Button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 hover:border-gold/50 text-neutral-400 hover:text-gold flex items-center justify-center transition-all cursor-pointer shadow-md"
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 hover:border-gold/50 text-neutral-400 hover:text-gold flex items-center justify-center transition-all cursor-pointer shadow-md"
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* The Horizontal Rolling Line Container */}
      <div className="relative">
        <div
          ref={scrollRef}
          className={`flex gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-4 scroll-smooth ${isSuv ? "opacity-35 grayscale pointer-events-none select-none" : ""}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {vehicles.map((vehicle) => (
            <InteractiveVehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              translate={translate}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface FleetProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

export const Vehicules: React.FC<FleetProps> = ({
  setCurrentPage,
  id
}) => {
  const { t, translate } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("berline-premium");
  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});
  const [vehiclesDb, setVehiclesDb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch("/api/vehicles")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.vehicles) {
          setVehiclesDb(data.vehicles);
        }
      })
      .catch((err) => console.error("Error loading vehicles", err))
      .finally(() => setLoading(false));
  }, []);

  const toggleDetails = (vehicleId: string) => {
    setExpandedVehicles((prev) => ({ ...prev, [vehicleId]: !prev[vehicleId] }));
  };

  const handleBook = (vehicleId: string) => {
    localStorage.setItem("ev_selected_vehicle_id", vehicleId);
    setCurrentPage("reservation");
    window.location.hash = "reservation";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const categories = useMemo(() => [
    {
      id: "berline-premium",
      name: { fr: "Berline Premium", en: "Premium Sedan" }
    },
    {
      id: "suv-executive",
      name: { fr: "SUV Executive", en: "Executive SUV" }
    },
    {
      id: "suv-prestige",
      name: { fr: "SUV Prestige", en: "Prestige SUV" }
    }
  ], []);
  // Master vehicles list with separate designs per category, correctly routing to their corresponding subfolder assets.
  const vehiclesList = useMemo(() => [
    // 1. BERLINE PREMIUM CATEGORY
    {
      id: "v_berline_n1",
      category: "berline-premium",
      categoryName: { fr: "Berline Premium", en: "Premium Sedan" },
      name: "Berline Premium N1",
      brand: "EASY SEDAN",
      tagline: {
        fr: "La quintessence de l'élégance urbaine silencieuse",
        en: "The ultimate expression of silent urban elegance"
      },
      description: {
        fr: "Conçue pour redéfinir la mobilité urbaine haut de gamme à Abidjan. Son habitacle spacieux et insonorisé offre un véritable sanctuaire de sérénité pour vos trajets privés ou corporate.",
        en: "Designed to redefine premium urban mobility in Abidjan. Its spacious, soundproof cabin offers a true sanctuary of serenity for your private or corporate journeys."
      },
      image: sedan1,
      images: [sedan1, sedan_extra1],
      specs: {
        capacity: "4",
        luggage: "3",
        autonomy: "480 KM",
        power: "280 CH",
        chargeSpeed: "25 MIN"
      },
      amenities: [
        { fr: "Wi-Fi haut débit illimité à bord", en: "Unlimited high-speed onboard Wi-Fi" },
        { fr: "Insonorisation acoustique renforcée", en: "Reinforced acoustic soundproofing" },
        { fr: "Bouteilles d'eau de prestige rafraîchies", en: "Chilled premium mineral botanical waters" },
        { fr: "Chargeurs sans fil rapides avant/arrière", en: "Front and rear fast wireless chargers" },
        { fr: "Chauffeur bilingue et certifié d'élite", en: "Bilingual and certified elite chauffeur" }
      ],
      price: {
        fr: "10 000 FCFA / heure",
        en: "10,000 FCFA / hour"
      },
      minTime: {
        fr: "Réservation minimale : 1 heure",
        en: "Minimum booking: 1 hour"
      },
      badgeText: { fr: "Business & Corporate", en: "Business & Corporate" }
    },
    {
      id: "v_berline_n2",
      category: "berline-premium",
      categoryName: { fr: "Berline Premium", en: "Premium Sedan" },
      name: "Berline Prestige N2",
      brand: "EASY LIMO",
      tagline: {
        fr: "Le confort d'affaires absolu avec espace de travail",
        en: "The absolute corporate comfort with integrated workspace"
      },
      description: {
        fr: "Un habitacle raffiné optimisé pour le travail ou le repos en ville. Une suspension adaptative filtre chaque aspérité pour une sensation de tapis volant continue.",
        en: "A refined cabin layout optimized for city commutes, working journeys, or relaxation. Dynamic air suspension filters every single road imperfection seamlessly."
      },
      image: sedan2,
      images: [sedan2, sedan_extra2],
      specs: {
        capacity: "4",
        luggage: "2",
        autonomy: "460 KM",
        power: "260 CH",
        chargeSpeed: "28 MIN"
      },
      amenities: [
        { fr: "Tablette de travail intégrée", en: "Integrated leather workspace desk" },
        { fr: "Ports de charge USB-C rapides 65W", en: "High-power 65W USB-C charge ports" },
        { fr: "Assises en cuir pleine fleur massantes", en: "Full-grain massaging leather seating" },
        { fr: "Éclairage ambiant LED configurable", en: "Configurable premium LED mood cabin lights" }
      ],
      price: {
        fr: "17 500 FCFA / heure",
        en: "17,500 FCFA / hour"
      },
      minTime: {
        fr: "Réservation minimale : 2 heures",
        en: "Minimum booking: 2 hours"
      },
      badgeText: { fr: "Luxe & Sérénité", en: "Luxury & Serenity" }
    },
    {
      id: "v_berline_n3",
      category: "berline-premium",
      categoryName: { fr: "Berline Premium", en: "Premium Sedan" },
      name: "Berline Executive N3",
      brand: "EASY CHIC",
      tagline: {
        fr: "La signature du style et de la sobriété mécanique",
        en: "The signature of style and ultimate driving refinement"
      },
      description: {
        fr: "L'harmonie parfaite entre dynamisme athlétique et posture impériale. Conçue pour accorder aux cadres supérieurs un niveau d'excellence ultime à Abidjan.",
        en: "The perfect harmony between athletic dynamics and imperial posture. Formulated to offer senior staff the ultimate standard of excellence in Abidjan."
      },
      image: sedan3,
      images: [sedan3, sedan_extra3],
      specs: {
        capacity: "4",
        luggage: "3",
        autonomy: "510 KM",
        power: "320 CH",
        chargeSpeed: "22 MIN"
      },
      amenities: [
        { fr: "Vitrage insonorisé double épaisseur", en: "Double-thick acoustic security glass" },
        { fr: "Système de purification d'air HEPA", en: "Medical-grade HEPA cabin air filter" },
        { fr: "Dernière presse internationale disponible", en: "Latest international press publications" }
      ],
      price: {
        fr: "19 000 FCFA / heure",
        en: "19,000 FCFA / hour"
      },
      minTime: {
        fr: "Réservation minimale : 2 heures",
        en: "Minimum booking: 2 hours"
      },
      badgeText: { fr: "Style & Distinction", en: "Style & Distinction" }
    },

    // 2. SUV EXECUTIVE CATEGORY
    {
      id: "v_suv_n2_a",
      category: "suv-executive",
      categoryName: { fr: "SUV Executive", en: "Executive SUV" },
      name: "SUV Executive N2",
      brand: "EASY COMFORT",
      tagline: {
        fr: "Le confort souverain et la puissance sur tous les terrains",
        en: "Sovereign comfort and high capability across terrains"
      },
      description: {
        fr: "Idéal pour les délégations, VIP et déplacements familiaux d'affaires à Abidjan. Conçu avec une assise surélevée offrant de grands volumes et équipé d'une transmission intégrale intelligente (AWD).",
        en: "Perfect for delegations, VIP passengers, and executive family rides in Abidjan. Engineered with elevated seating status, expansive cabin volumes, and smart All-Wheel Drive (AWD)."
      },
      image: suv_exec1,
      specs: {
        capacity: "6",
        luggage: "5",
        autonomy: "520 KM",
        power: "400 CH",
        chargeSpeed: "30 MIN"
      },
      amenities: [
        { fr: "Grande soute à bagages optimisée", en: "Expansive maximized baggage compartment" },
        { fr: "Climatisation tri-zone adaptative", en: "Adaptive tri-zone climate control desk" },
        { fr: "Suspension active ultra douce (confort de salon)", en: "Ultra-smooth active pneumatic air ride" },
        { fr: "Lectures locales et internationales à disposition", en: "Local & international news press publications" },
        { fr: "Suivi de vol en temps réel (accueil aéroport)", en: "Real-time landing tracking (gate welcome banner)" }
      ],
      price: {
        fr: "19 000 FCFA / heure",
        en: "19,000 FCFA / hour"
      },
      minTime: {
        fr: "Réservation minimale : 2 heures",
        en: "Minimum booking: 2 hours"
      },
      badgeText: { fr: "Espace & Commutation", en: "Space & Commutation" }
    },
    {
      id: "v_suv_n2_b",
      category: "suv-executive",
      categoryName: { fr: "SUV Executive", en: "Executive SUV" },
      name: "SUV Executive Space N2-B",
      brand: "EASY SPACE",
      tagline: {
        fr: "Le salon d'affaires mobile par excellence à Abidjan",
        en: "The spacious multi-seat mobile business board office"
      },
      description: {
        fr: "Grands volumes, configuration modulable des sièges et connectivité totale. Conçu pour le transport de délégations exigeant une flexibilité irréprochable et un confort suprême.",
        en: "Generous cabin proportions, highly modular seating layouts, and absolute digital connectivity. Built for high-level business teams requiring peerless flexibility."
      },
      image: suv_exec2,
      specs: {
        capacity: "6",
        luggage: "4",
        autonomy: "510 KM",
        power: "400 CH",
        chargeSpeed: "30 MIN"
      },
      amenities: [
        { fr: "Captain Chairs pivotants en rangée centrale", en: "Bespoke swivel captain chairs in VIP row" },
        { fr: "Tablette de réunion en bois verni rabattable", en: "Foldable polished executive wood table" },
        { fr: "Contrôle du confort arrière autonome", en: "State of charge and rear comfort control panel" }
      ],
      price: {
        fr: "21 500 FCFA / heure",
        en: "21,500 FCFA / hour"
      },
      minTime: {
        fr: "Réservation minimale : 2 heures",
        en: "Minimum booking: 2 hours"
      },
      badgeText: { fr: "Grand Volume Premium", en: "Grand Volume Premium" }
    },
    {
      id: "v_suv_n2_c",
      category: "suv-executive",
      categoryName: { fr: "SUV Executive", en: "Executive SUV" },
      name: "SUV Executive Cargo N2-C",
      brand: "EASY SHUTTLE",
      tagline: {
        fr: "Capacité de bagages inégalée et accueil d'aéroport d'élite",
        en: "Unparalleled layout volume and elite airport greeting"
      },
      description: {
        fr: "Idéal pour les transferts d'aéroport nécessitant un volume important pour des bagages volumineux de luxe, assurant un trajet retour fluide, reposant et d'une sécurité totale.",
        en: "Specially configured back-row layouts for multi-bag pick-ups, with state-trained support ensuring a smooth, safe, and elite transition from the arrival terminal."
      },
      image: suv_exec3,
      specs: {
        capacity: "6",
        luggage: "6",
        autonomy: "490 KM",
        power: "380 CH",
        chargeSpeed: "34 MIN"
      },
      amenities: [
        { fr: "Assises arrière rabattables électriquement", en: "Electrically folding modular back seats" },
        { fr: "Suivi de vol en direct et greeter dédié", en: "Live status airport flight tracking & private greeter" }
      ],
      price: {
        fr: "20 000 FCFA / heure",
        en: "20,000 FCFA / hour"
      },
      minTime: {
        fr: "Réservation minimale : 2 heures",
        en: "Minimum booking: 2 hours"
      },
      badgeText: { fr: "Shuttle & Aéroport", en: "Shuttle & Airport" }
    },

    // 3. SUV PRESTIGE CATEGORY
    {
      id: "v_suv_n3_a",
      category: "suv-prestige",
      categoryName: { fr: "SUV Prestige", en: "Prestige SUV" },
      name: "SUV Prestige N3",
      brand: "EASY PRESIDENTIAL",
      tagline: {
        fr: "L'excellence absolue et l'autorité du luxe protocolaire",
        en: "The absolute zenith of diplomatic and protocol luxury"
      },
      description: {
        fr: "Le sommet du prestige et de la technologie. Réservé aux personnalités d'État, diplomates de haut rang, officiels engagés et voyages d'affaires à haute responsabilité protocolaire.",
        en: "The pinnacle of executive prestige and advanced engineering. Specifically designated for state dignitaries, diplomats, and high-responsibility corporate missions."
      },
      image: suv_pres1,
      specs: {
        capacity: "7",
        luggage: "6",
        autonomy: "610 KM",
        power: "540 CH",
        chargeSpeed: "20 MIN (800V)"
      },
      amenities: [
        { fr: "Chauffeur officier de sécurité d'élite certifié", en: "Certified elite protective marshall officer" },
        { fr: "Dispositif protocolaire (supports de drapeaux)", en: "Diplomatic protocol support (flagpoles fitted)" },
        { fr: "Écrans arrières UHD multimedia individuels", en: "Individual rear UHD entertainment setups" },
        { fr: "Insonorisation balistique et acoustique ultime", en: "Ultimate acoustics and structural comfort seals" },
        { fr: "Bar de courtoisie avec boissons rafraîchissantes", en: "Cooler bar with chilled premium soft drinks" }
      ],
      price: {
        fr: "Sur devis",
        en: "Upon Request"
      },
      minTime: {
        fr: "Réservation requise sous 24h",
        en: "24-hour advance schedule required"
      },
      badgeText: { fr: "Protocole & Souveraineté", en: "Protocol & Sovereignty" }
    },
    {
      id: "v_suv_n3_b",
      category: "suv-prestige",
      categoryName: { fr: "SUV Prestige", en: "Prestige SUV" },
      name: "SUV Prestige Ambassador N3-B",
      brand: "EASY AMBASSADOR",
      tagline: {
        fr: "L'élégance suprême réservée aux diplomates et délégations",
        en: "The supreme elegance designed for diplomats & delegations"
      },
      description: {
        fr: "Allie espace grandiose, motorisation souveraine et équipements exclusifs d'insonorisation passive. Garantit une discrétion totale lors de déplacements de la plus haute importance.",
        en: "Melds grandiose interior layouts with sovereign multi-motor performance, ensuring ultimate passive sound insulation and security for highly confident movements."
      },
      image: suv_pres2,
      specs: {
        capacity: "7",
        luggage: "5",
        autonomy: "600 KM",
        power: "520 CH",
        chargeSpeed: "22 MIN"
      },
      amenities: [
        { fr: "Drapeaux officiels interchangeables", en: "Interchangeable protocol flags available" },
        { fr: "Séparation d'habitacle et lunette blindée", en: "Acoustic cabin separator with reinforced glass" },
        { fr: "Réfrigérateur VIP avec boissons", en: "Built-in cooled drawer with prestige mocktails" }
      ],
      price: {
        fr: "Sur devis",
        en: "Upon Request"
      },
      minTime: {
        fr: "Réservation requise sous 24h",
        en: "24-hour advance schedule required"
      },
      badgeText: { fr: "Dignitaire & Élite", en: "Dignitary & Elite" }
    },
    {
      id: "v_suv_n3_c",
      category: "suv-prestige",
      categoryName: { fr: "SUV Prestige", en: "Prestige SUV" },
      name: "SUV Prestige Sovereign N3-C",
      brand: "EASY PROTOCOL",
      tagline: {
        fr: "Le sanctuaire de l'autorité suprême à Cocody & Abidjan",
        en: "The sanctuary of supreme authority in Abidjan & Cocody"
      },
      description: {
        fr: "Présence routière charismatique et majestueuse. Un déploiement de technologies embarquées au service exclusif de la sécurité et du bien-être souverain.",
        en: "Charismatic and majestic presence on the road. A heavy deployment of technological systems oriented around unmatched security and sovereign protection."
      },
      image: suv_pres3,
      specs: {
        capacity: "7",
        luggage: "6",
        autonomy: "590 KM",
        power: "500 CH",
        chargeSpeed: "24 MIN"
      },
      amenities: [
        { fr: "Système audio Premium Spatial à 28 haut-parleurs", en: "Spatial 28-speaker High-End active sound layout" },
        { fr: "Chauffage et ventilation de tous les sièges", en: "Chilled and heated seating arrays on row 1, 2, and 3" }
      ],
      price: {
        fr: "Sur devis",
        en: "Upon Request"
      },
      minTime: {
        fr: "Réservation requise sous 24h",
        en: "24-hour advance schedule required"
      },
      badgeText: { fr: "Prestige & Protection", en: "Prestige & Protection" }
    }
  ], []);

  // Map all vehicles with available ones from DB (with immatriculation and battery info)
  const allVehiclesMapped = useMemo(() => {
    return vehiclesList.map((v) => {
      const dbV = vehiclesDb.find((dbV) => dbV.id === v.id);
      return {
        ...v,
        immatriculation: dbV?.immatriculation || "CI-01-XXXX-XX",
        batteryLevel: dbV?.batteryLevel ?? 88,
        status: dbV?.status || "Disponible"
      };
    });
  }, [vehiclesList, vehiclesDb]);

  return (
    <div id={id} className="min-h-screen bg-black py-20 px-4 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,20,30,0.5)_0%,rgba(0,0,0,1)_70%)] pointer-events-none"></div>

      {/* Main page background Antigravity design covering the full header section */}
      <div className="absolute top-0 left-0 w-full h-[550px] z-0 overflow-hidden pointer-events-none">
        <Antigravity
          count={300}
          magnetRadius={6}
          ringRadius={7}
          waveSpeed={0.4}
          waveAmplitude={1}
          particleSize={1.5}
          lerpSpeed={0.05}
          color="var(--color-gold-light)"
          autoAnimate
          particleVariance={1}
          rotationSpeed={0}
          depthFactor={1}
          pulseSpeed={3}
          particleShape="capsule"
          fieldStrength={10}
        />
        {/* Soft bottom fade to blend with black background */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Transparent Header block */}
        <div className="relative w-full py-16 mb-8 flex flex-col items-center justify-center text-center">
          {/* Content on top */}
          <div className="relative z-10 w-full text-center flex flex-col items-center px-6 md:px-12 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 bg-neutral-900/80 border border-neutral-800 rounded-full mb-6"
            >
              <Sparkles size={12} className="text-gold" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold-light">
                {translate({ fr: "FLEURON DU LUXE ÉLECTRIQUE", en: "CROWN OF ELECTRIC LUXURY" })}
              </span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative w-full h-[60px] sm:h-[100px] md:h-[140px] mb-6 flex items-center justify-center overflow-hidden"
            >
              <TextPressure
                text={t("fleetTitle").toUpperCase()}
                flex={true}
                alpha={false}
                stroke={false}
                width={true}
                weight={true}
                italic={false}
                textColor="var(--color-gold-light)"
                minFontSize={20}
              />
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xs md:text-sm text-neutral-400 max-w-2xl mx-auto font-light leading-relaxed"
            >
              {t("fleetSubtitle")} – {translate({
                fr: "Chaque véhicule de notre flotte incarne une perfection absolue. Une esthétique athlétique associée au silence mécanique total, conduite par nos chauffeurs d'élite certifiés.",
                en: "Each flagship vehicle in our fleet represents engineering perfection. Sleek athletic proportions combined with absolute mechanical silence, guided by our state-certified drivers."
              })}
            </motion.p>
          </div>
        </div>

        {/* Categories Tab Selector with Smooth Scroll capability */}
        <div className="flex justify-center border-b border-neutral-900 mb-16 overflow-x-auto scrollbar-none pb-px">
          <div className="flex gap-4 md:gap-8 whitespace-nowrap min-w-max px-4">
            {categories.map((category) => {
              const isActive = category.id === selectedCategory;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    const element = document.getElementById(`sec_${category.id}`);
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className="relative pb-4 text-sm md:text-base font-display tracking-wider uppercase transition-colors duration-300 cursor-pointer text-left"
                  style={{ color: isActive ? "#F4F2EE" : "#8A8A9A" }}
                >
                  <span>{translate(category.name)}</span>
                  {isActive && (
                    <motion.div
                      layoutId="fleetActiveTabLine"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold"
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vehicle Carousel Lines (Une ligne défilante par type de véhicule) */}
        <div className="space-y-24">
          {categories.map((category) => {
            const categoryVehicles = allVehiclesMapped.filter((v) => v.category === category.id);
            return (
              <CategoryCarousel
                key={category.id}
                category={category}
                vehicles={categoryVehicles}
                t={t}
                translate={translate}
                handleBook={handleBook}
                toggleDetails={toggleDetails}
                expandedVehicles={expandedVehicles}
              />
            );
          })}
        </div>

        {/* Operational Trust Section Map Indicator */}
        <motion.div 
          layout
          id="operational_precision_card"
          className="mt-28 bg-[#111116] p-8 rounded-2xl border border-neutral-900 flex flex-col lg:flex-row items-center justify-between gap-8 text-left"
        >
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-full bg-transparent flex items-center justify-center text-gold shrink-0 border border-gold/30">
              <Zap size={22} className="text-gold" />
            </div>
            <div>
              <h4 className="text-base font-display font-semibold text-white-premium">
                {translate({
                  fr: "Supervision en temps réel et réserve d'autonomie à Abidjan",
                  en: "Real-time Supervision & Battery Guarantee in Abidjan"
                })}
              </h4>
              <p className="text-xs text-muted-premium mt-1.5 max-w-2xl leading-relaxed font-light font-sans">
                {translate({
                  fr: "L'autonomie de notre flotte électrique est scrupuleusement suivie en temps réel par notre régie technique de Cocody. Nous garantissons de livrer chaque véhicule à l'adresse indiquée avec un niveau de charge de batterie d'au moins 80%, vous assurant une totale liberté de mouvement.",
                  en: "Our dispatch center monitors live battery metrics for the whole fleet. We guarantee your vehicle departs custom Cocody hubs carrying at least 80% State of Charge (SOC) before picking you up."
                })}
              </p>
            </div>
          </div>
          
          <div className="text-[11px] font-display uppercase tracking-widest text-gold bg-transparent p-3 px-5 rounded border border-gold/30 whitespace-nowrap flex items-center gap-2">
            <ShieldCheck size={15} className="text-gold animate-pulse" />
            {translate({ fr: "100% OPÉRATIONNEL À ABIDJAN", en: "100% OPERATIONAL AT ABIDJAN" })}
          </div>
        </motion.div>

        {/* Mercedes design footline disclaimer */}
        <div className="mt-20 text-center text-[10px] font-display uppercase tracking-[0.2em] text-neutral-600 font-normal">
          {translate({ 
            fr: "• MATÉRIELS ET CONFIGURATIONS D'EXCEPTION • NORMES SOCIO-ENVIRONNEMENTALES ABSOLUES •", 
            en: "• UNCOMPROMISING STATE STANDARDS • HIGHEST SOCIO-ENVIRONMENTAL PROTOCOL CODES •" 
          })}
        </div>

      </div>
    </div>
  );
};
