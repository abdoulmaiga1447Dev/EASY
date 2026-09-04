import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useSegment } from "../context/SegmentContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { 
  Calendar, Clock, MapPin, Car, ArrowRight, ArrowLeft, Check, 
  UserCheck, Shield, HelpCircle, Sparkles, Globe, AlertCircle, HeartHandshake, Map, Compass,
  Zap, ShoppingBag, Briefcase, Users, Phone
} from "lucide-react";
import { MapSelectorModal } from "../components/MapSelectorModal";
import { MyBookingsModal } from "../components/MyBookingsModal";

interface ReservationProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

// Popular locations in Abidjan with coordinates for our mini-map simulation
const ABIDJAN_LOCATIONS = [
  // Adjamé
  { name: "Adjamé Liberté, Abidjan" },
  { name: "Adjamé Forum des Marchés, Abidjan" },
  { name: "Adjamé 220 Logements, Abidjan" },
  { name: "Mairie d'Adjamé, Abidjan" },
  { name: "Gare Routière d'Adjamé, Abidjan" },
  { name: "Adjamé Mirador, Abidjan" },
  { name: "Adjamé Paillet, Abidjan" },

  // Cocody
  { name: "Cocody Centre, Abidjan" },
  { name: "Cocody Deux Plateaux, Abidjan" },
  { name: "Cocody Deux Plateaux Vallon, Abidjan" },
  { name: "Cocody Angré (Nouveau CHU), Abidjan" },
  { name: "Cocody Angré Djibi, Abidjan" },
  { name: "Cocody Angré Nouveau Horizon, Abidjan" },
  { name: "Cocody Riviera 1, Abidjan" },
  { name: "Cocody Riviera 2, Abidjan" },
  { name: "Cocody Riviera 3 (Lycée Américain), Abidjan" },
  { name: "Cocody Riviera 4 (M'Pouto), Abidjan" },
  { name: "Cocody Riviera Palmeraie, Abidjan" },
  { name: "Cocody Riviera Bonoumin, Abidjan" },
  { name: "Cocody Riviera Golf, Abidjan" },
  { name: "Cocody Riviera Faya, Abidjan" },
  { name: "Cocody Saint-Jean, Abidjan" },
  { name: "Université Félix Houphouët-Boigny, Cocody" },
  { name: "CHU de Cocody, Abidjan" },
  { name: "Ambassade de France, Cocody" },
  { name: "Ambassade des Etats-Unis, Cocody" },

  // Plateau
  { name: "Plateau, Abidjan (Quartier des Affaires)" },
  { name: "Boulevard de la République, Plateau, Abidjan" },
  { name: "Avenue Chardy, Plateau, Abidjan" },
  { name: "Cathédrale Saint-Paul, Plateau, Abidjan" },
  { name: "Hôtel Tiama, Plateau, Abidjan" },
  { name: "Hôtel Pullman, Plateau, Abidjan" },
  { name: "Hôtel Noom, Plateau, Abidjan" },
  { name: "Stade Félix Houphouët-Boigny (Félicia), Plateau" },
  { name: "Mairie du Plateau, Abidjan" },
  { name: "Immeuble CCIA, Plateau, Abidjan" },
  { name: "Immeuble Postel 2001, Plateau, Abidjan" },

  // Marcory
  { name: "Marcory Zone 4 (Rue Pierre & Marie Curie), Abidjan" },
  { name: "Marcory Zone 4 (Rue Paul Langevin), Abidjan" },
  { name: "Marcory Zone 4 (Rue du Canal), Abidjan" },
  { name: "Marcory Résidentiel, Abidjan" },
  { name: "Marcory Centre, Abidjan" },
  { name: "Boulevard de Marseille, Marcory, Abidjan" },
  { name: "Boulevard de Lorraine, Marcory, Abidjan" },
  { name: "Marcory GFCI, Abidjan" },
  { name: "Marcory Aliodan / Résidences, Abidjan" },
  { name: "Cap Sud, Marcory, Abidjan" },
  { name: "Prima Center, Marcory, Abidjan" },
  { name: "Playce Marcory, Abidjan" },
  { name: "Hôtel Azalaï, Marcory, Abidjan" },
  { name: "Biétry, Marcory, Abidjan" },

  // Treichville
  { name: "Treichville, Boulevard de Marseille, Abidjan" },
  { name: "Treichville Avenue 16 / Avenue 21, Abidjan" },
  { name: "Treichville Boulevard Valéry Giscard d'Estaing (VGE)" },
  { name: "Gare de Bassam, Treichville, Abidjan" },
  { name: "CHU de Treichville, Abidjan" },
  { name: "Palais des Sports de Treichville, Abidjan" },
  { name: "Port Autonome d'Abidjan, Treichville" },

  // Koumassi
  { name: "Koumassi Centre, Abidjan" },
  { name: "Koumassi Zone Industrielle, Abidjan" },
  { name: "Koumassi Soweto, Abidjan" },
  { name: "Koumassi Grand Carrefour, Abidjan" },
  { name: "Koumassi Remblais, Abidjan" },

  // Port-Bouët
  { name: "Aéroport International Félix Houphouët-Boigny, Port-Bouët" },
  { name: "Port-Bouët Centre, Abidjan" },
  { name: "Port-Bouët Vridi (Zone Industrielle), Abidjan" },
  { name: "Port-Bouët Vridi Canal, Abidjan" },
  { name: "Quartier Phare, Port-Bouët, Abidjan" },

  // Yopougon
  { name: "Yopougon Siporex, Abidjan" },
  { name: "Yopougon Maroc, Abidjan" },
  { name: "Yopougon Niangon, Abidjan" },
  { name: "Yopougon Toits Rouges, Abidjan" },
  { name: "Yopougon Sogefiha, Abidjan" },
  { name: "Yopougon Bel Air, Abidjan" },
  { name: "Yopougon Académie, Abidjan" },
  { name: "Yopougon Zone Industrielle, Abidjan" },
  { name: "Yopougon Selmer, Abidjan" },
  { name: "Cosmos Yopougon, Abidjan" },
  { name: "CHU de Yopougon, Abidjan" },

  // Abobo
  { name: "Abobo Gare, Abidjan" },
  { name: "Abobo Baoulé, Abidjan" },
  { name: "Abobo Samaké, Abidjan" },
  { name: "Abobo Avocatier, Abidjan" },
  { name: "Abobo Dokui, Abidjan" },
  { name: "Abobo Té, Abidjan" },
  { name: "Mairie d'Abobo, Abidjan" },

  // Bingerville
  { name: "Bingerville Centre, Abidjan" },
  { name: "Bingerville Fehi Kessé, Abidjan" },
  { name: "Bingerville Ecole Militaire (EMPT), Abidjan" },
  { name: "Bingerville Jardin Botanique, Abidjan" },

  // Out of city / Resorts
  { name: "Grand-Bassam, Zone Balnéaire" },
  { name: "Grand-Bassam Quartier France" },
  { name: "Assinie-Mafia, Club Méditerranée" },
  { name: "Assinie Terminal, Zone Touristique" }
];

const FORMULAS = [
  {
    id: "flash_premium",
    duration: "1h",
    name: { fr: "Le Flash Premium", en: "Le Flash Premium" },
    desc: { 
      fr: "Aéroport, restaurant, hôtel — 1 seul trajet. Jusqu'à 3 personnes", 
      en: "Airport, restaurant, hotel — 1 single journey. Up to 3 passengers" 
    },
    formula: "hourly" as const,
    durationHours: 1,
    icon: "Zap",
  },
  {
    id: "courses_vip",
    duration: "2h",
    name: { fr: "Les Courses VIP", en: "VIP Errands" },
    desc: { 
      fr: "Pharmacie, shopping, 2-3 arrêts en ville", 
      en: "Pharmacy, shopping, 2-3 quick stops around Abidjan" 
    },
    formula: "hourly" as const,
    durationHours: 2,
    icon: "ShoppingBag",
  },
  {
    id: "rdv_image",
    duration: "3h",
    name: { fr: "Le RDV d'Image", en: "The Image Meeting" },
    desc: { 
      fr: "Meeting, hôtel 5★, cabinet d'avocats, banque", 
      en: "Meeting, 5★ hotel, law firm, private banking" 
    },
    formula: "hourly" as const,
    durationHours: 3,
    icon: "Briefcase",
  },
  {
    id: "grande_journee",
    duration: "8h",
    name: { fr: "La Grande Journée", en: "The Full Day" },
    desc: { 
      fr: "Bassam, Dabou, Anyama — itinéraire libre", 
      en: "Grand-Bassam, Dabou, Anyama — custom unlimited route" 
    },
    formula: "halfday" as const,
    durationHours: 8,
    icon: "Compass",
  },
  {
    id: "evenement",
    duration: "16h",
    name: { fr: "L'Événement", en: "The Signature Event" },
    desc: { 
      fr: "Mariage, séminaire, journée VIP", 
      en: "Weddings, high-level seminars, private VIP days" 
    },
    formula: "fullday" as const,
    durationHours: 16,
    icon: "Sparkles",
  }
];

const renderFormulaIcon = (iconName: string) => {
  switch (iconName) {
    case "Zap": return <Zap className="text-[#00C853]" size={20} />;
    case "ShoppingBag": return <ShoppingBag className="text-[#00C853]" size={20} />;
    case "Briefcase": return <Briefcase className="text-[#00C853]" size={20} />;
    case "Users": return <Users className="text-[#00C853]" size={20} />;
    case "Compass": return <Compass className="text-[#00C853]" size={20} />;
    case "Sparkles": return <Sparkles className="text-[#00C853]" size={20} />;
    default: return <Clock className="text-[#00C853]" size={20} />;
  }
};

export const Reservation: React.FC<ReservationProps> = ({ setCurrentPage, id }) => {
  const { t, translate } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { segment } = useSegment();

  // Step 1 - 5 State
  const [step, setStep] = useState(1);

  // Form selections State
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("10:00");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("Mise à disposition");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(user.phone);
    }
  }, [user]);
  
  // Autocomplete dropdown suggestions state
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [showPickupList, setShowPickupList] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);

  // Step 2 - Vehicle State
  const [selectedVehicle, setSelectedVehicle] = useState<"N1" | "N2" | "N3" | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleDetail, setSelectedVehicleDetail] = useState<any | null>(null);

  // Load and match selected vehicle from database
  useEffect(() => {
    fetch("/api/vehicles")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.vehicles) {
          setVehicles(data.vehicles);
          const savedId = localStorage.getItem("ev_selected_vehicle_id");
          if (savedId) {
            const match = data.vehicles.find((v: any) => v.id === savedId);
            if (match) {
              setSelectedVehicleDetail(match);
              if (match.category === "berline-premium") {
                setSelectedVehicle("N1");
              } else if (match.category === "suv-executive") {
                setSelectedVehicle("N2");
              } else if (match.category === "suv-prestige") {
                setSelectedVehicle("N3");
              }
            }
          }
        }
      })
      .catch((err) => console.error("Error loading vehicles in reservation", err));
  }, []);

  // Step 3 - Formula State
  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(null);
  const [formula, setFormula] = useState<"hourly" | "halfday" | "fullday" | null>(null);
  const [durationHours, setDurationHours] = useState(3);

  // Check for pre-selected vehicle & formula from localStorage
  useEffect(() => {
    const savedFormula = localStorage.getItem("ev_selected_formula");
    const savedVehicleCategory = localStorage.getItem("ev_selected_vehicle_category");
    
    if (savedFormula) {
      const matched = FORMULAS.find(f => f.id === savedFormula);
      if (matched) {
        setSelectedFormulaId(savedFormula);
        setFormula(matched.formula);
        setDurationHours(matched.durationHours);
      }
      localStorage.removeItem("ev_selected_formula");
    }
    
    if (savedVehicleCategory && (savedVehicleCategory === "N1" || savedVehicleCategory === "N2" || savedVehicleCategory === "N3")) {
      setSelectedVehicle(savedVehicleCategory as "N1" | "N2" | "N3");
      localStorage.removeItem("ev_selected_vehicle_category");
    }
  }, [vehicles]);

  // Step 4 - Options State
  const [isBilingual, setIsBilingual] = useState(false);
  const [isAirportGreeting, setIsAirportGreeting] = useState(false);

  // Real-time calculated price
  const [calcLoading, setCalcLoading] = useState(false);
  const [priceResult, setPriceResult] = useState<{
    basePrice: number;
    multiplier: number;
    isNight: boolean;
    isWeekend: boolean;
    totalPrice: number | null;
    isQuote?: boolean;
  } | null>(null);

  // Booking result success screen details
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [finalBookingData, setFinalBookingData] = useState<any>(null);

  // Set default tomorrow date on load
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDepartureDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // Filter autocomplete suggestions for Pickup
  useEffect(() => {
    if (!showPickupList) {
      setPickupSuggestions([]);
      return;
    }

    if (!pickup.trim()) {
      // Show default popular choices when input is empty but active
      const defaults = [
        { name: "Aéroport International Félix Houphouët-Boigny, Port-Bouët" },
        { name: "Plateau, Abidjan (Quartier des Affaires)" },
        { name: "Marcory Zone 4 (Rue Pierre & Marie Curie), Abidjan" },
        { name: "Cocody Deux Plateaux, Abidjan" },
        { name: "Adjamé Liberté, Abidjan" },
        { name: "Yopougon Maroc, Abidjan" }
      ];
      setPickupSuggestions(defaults);
      return;
    }
    
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/autocomplete?input=${encodeURIComponent(pickup)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.predictions) && data.predictions.length > 0) {
            setPickupSuggestions(data.predictions);
          } else {
            // Fallback to local filtering
            const filtered = ABIDJAN_LOCATIONS.filter(loc => 
              loc.name.toLowerCase().includes(pickup.toLowerCase())
            );
            setPickupSuggestions(filtered);
          }
        })
        .catch((err) => {
          console.error("Autocomplete fetch error, falling back", err);
          const filtered = ABIDJAN_LOCATIONS.filter(loc => 
            loc.name.toLowerCase().includes(pickup.toLowerCase())
          );
          setPickupSuggestions(filtered);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [pickup, showPickupList]);

  // Fetch / Calculate price in real-time
  useEffect(() => {
    if (!departureDate || !departureTime || !selectedVehicle || !formula) {
      setPriceResult(null);
      return;
    }

    const requestCalcul = async () => {
      setCalcLoading(true);
      try {
        const body = {
          vehicleClass: selectedVehicle,
          formula,
          durationHours: formula === "hourly" ? durationHours : (formula === "halfday" ? 8 : 16),
          departureDate,
          departureTime,
          options: {
            bilingual: isBilingual,
            airportGreeting: isAirportGreeting
          }
        };

        const res = await fetch("/api/reservations/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const data = await res.json();
          setPriceResult(data);
        }
      } catch (e) {
        console.error("Calculation pricing error:", e);
      } finally {
        setCalcLoading(false);
      }
    };

    // Debounce the calculation request slightly
    const timer = setTimeout(requestCalcul, 300);
    return () => clearTimeout(timer);

  }, [selectedVehicle, formula, durationHours, departureDate, departureTime, isBilingual, isAirportGreeting]);

  const handlePickupSelect = (loc: any) => {
    setPickup(loc.name);
    setShowPickupList(false);
  };

  // Process Booking Complete (Sprint 3 Hook) / Final Submission
  const handleConfirmReservation = async () => {
    if (!isAuthenticated) {
      setCurrentPage("connexion");
      return;
    }

    try {
      const activeToken = localStorage.getItem("ev_access_token");
      if (!activeToken) {
        alert("Session expirée. Veuillez vous reconnecter.");
        setCurrentPage("connexion");
        return;
      }

      const body = {
        vehicleId: selectedVehicleDetail ? selectedVehicleDetail.id : (selectedVehicle === "N1" ? "v_berline_n1" : "v_suv_n2_a"),
        departureDate,
        departureTime,
        pickup,
        destination,
        formula,
        durationHours: formula === "hourly" ? durationHours : (formula === "halfday" ? 8 : 16),
        options: [
          ...(isBilingual ? ["bilingual"] : []),
          ...(isAirportGreeting ? ["airportGreeting"] : [])
        ],
        totalPrice: priceResult?.totalPrice || 0,
        segment: "public", // Default to grand public segment
        status: "pending_assignment",
        phone: phoneNumber
      };

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        setFinalBookingData(data);
        setBookingSuccess(true);
      } else {
        const errData = await res.json();
        alert(errData.error?.fr || "Erreur de réservation.");
      }
    } catch (e) {
      console.error(e);
      alert("Une erreur technique s'est produite lors de la réservation.");
    }
  };

  // Navigation conditions
  const canGoNextStep1 = phoneNumber.trim() !== "" && destination && departureDate && departureTime;
  const canGoNextStep2 = selectedVehicle !== null;
  const canGoNextStep3 = formula !== null;

  // Render Content
  if (bookingSuccess && finalBookingData) {
    const resId = finalBookingData.reservation?.id;

    return (
      <div id="booking_success_container" className="min-h-screen bg-dark py-16 px-4 flex items-center justify-center">
        <Card id="res_success_receipt_card" className="w-full max-w-lg p-10 border border-white-premium/10 bg-[#0E0E14] relative overflow-hidden text-center shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-white-premium" />
          
          <div className="w-16 h-16 bg-white-premium/5 border border-white-premium/10 text-white-premium rounded-full mx-auto flex items-center justify-center mb-6">
            <Check size={32} />
          </div>

          <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase font-bold block mb-2">
            {translate({ fr: "DEMANDE ENREGISTRÉE AVEC SUCCÈS", en: "REQUEST SUCCESSFULLY SAVED" })}
          </span>
          <h2 className="text-2xl font-bold text-white-premium font-sans tracking-tight mb-4">
            {translate({ fr: "Veuillez consulter vos e-mails", en: "Please check your email" })}
          </h2>
          
          <div className="my-6 py-6 px-4 bg-dark/40 border border-white-premium/5 rounded-xl text-center">
            <p className="text-sm text-neutral-300 font-sans leading-relaxed">
              {translate({ 
                fr: "Un e-mail de confirmation contenant le récapitulatif complet de votre demande de réservation, l'estimation tarifaire ainsi que les prochaines étapes de validation vient de vous être envoyé.",
                en: "A confirmation email containing the complete summary of your reservation request, the estimated price, and the next validation steps has just been sent to you."
              })}
            </p>
            <p className="text-xs text-neutral-400 font-mono mt-4 font-bold">
              {translate({ fr: "Réf. Réservation : ", en: "Booking Ref: " })}{resId}
            </p>
          </div>

          <p className="text-xs text-neutral-400 font-sans leading-relaxed mb-8">
            {translate({
              fr: "Si vous ne trouvez pas notre e-mail d'ici quelques minutes, pensez à vérifier vos courriers indésirables (spams).",
              en: "If you do not receive our email within a few minutes, please check your spam folder."
            })}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              id="success_btn_commandes"
              className="w-full bg-[#C5A880] hover:bg-[#E5C8A0] text-black font-bold flex items-center justify-center gap-1.5 py-6 rounded-lg transition-all" 
              onClick={() => {
                setCurrentPage("commandes");
                window.location.hash = "commandes";
              }}
            >
              {translate({ fr: "Voir mes commandes", en: "View My Orders" })}
            </Button>
            <Button 
              id="success_btn_book_again"
              className="w-full bg-white-premium/5 border border-white-premium/10 hover:bg-white-premium/10 text-white-premium font-medium py-6 rounded-lg transition-all" 
              onClick={() => {
                setBookingSuccess(false);
                setFinalBookingData(null);
                setStep(1);
                setPickup("");
                setDestination("Mise à disposition");
              }}
            >
              {translate({ fr: "Nouvelle réservation", en: "New Booking" })}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div id={id} className="min-h-screen bg-dark py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Stepper Progress & Core Forms (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Title Banner */}
          <div className="bg-[#0E0E14] border border-white-premium/5 p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#00C853] font-bold block mb-1">
                {translate({ fr: "MODULE LOGISTIQUE ABIDJAN", en: "ABIDJAN LOGISTICS INTERACTION" })}
              </span>
              <h1 className="text-xl md:text-3xl font-sans font-bold text-white-premium tracking-tight">
                {translate({ fr: "Planifier Votre Trajet Électrique", en: "Order Silent Electric Chauffeur" })}
              </h1>
            </div>
            <Button
              id="btn_my_bookings"
              variant="outline"
              onClick={() => {
                if (isAuthenticated) {
                  setCurrentPage("commandes");
                  window.location.hash = "commandes";
                } else {
                  setCurrentPage("connexion");
                  window.location.hash = "connexion";
                }
              }}
              className="border-white-premium/10 text-white-premium hover:bg-white-premium/5 text-xs font-bold shrink-0 self-start md:self-auto flex items-center gap-1.5"
            >
              <Compass size={14} className="text-[#00C853]" />
              {translate({ fr: "Mes Réservations ✦", en: "My Bookings ✦" })}
            </Button>
          </div>

          {/* Stepper Status Indicators (Liquid-Group design from Uiverse.io) */}
          <div className="liquid-group w-full flex justify-between items-center relative overflow-hidden">
            {/* The sliding element indicator */}
            <div 
              className="liquid-slider"
              style={{
                position: "absolute",
                inset: "var(--gap)",
                width: "calc((100% - 24px) / 5)", // (100% - 4 * 6px gap) / 5
                transform: `translateX(calc(${(step - 1) * 100}% + ${(step - 1) * 6}px))`,
                transition: "transform var(--speed) var(--ease)",
              }}
            />

            {[1, 2, 3, 4, 5].map((s) => {
              const isCompleted = step > s;
              const isActive = step === s;
              // Enable navigation to steps that are already completed or to the next steps if they are filled
              const isAccessible = s < step || 
                (s === 2 && canGoNextStep1) || 
                (s === 3 && canGoNextStep1 && canGoNextStep2) || 
                (s === 4 && canGoNextStep1 && canGoNextStep2 && canGoNextStep3);

              return (
                <button
                  key={s}
                  type="button"
                  disabled={!isAccessible}
                  onClick={() => setStep(s)}
                  className={`relative z-10 flex-1 py-3 text-center text-[10px] md:text-[11px] font-semibold tracking-wider uppercase font-mono transition-all duration-300 flex items-center justify-center gap-1 md:gap-2 border-0 bg-transparent ${
                    isActive 
                      ? "text-white font-bold" 
                      : isAccessible 
                        ? "text-neutral-400 hover:text-neutral-200 cursor-pointer" 
                        : "text-neutral-600 cursor-not-allowed"
                  }`}
                >
                  <span className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[8px] md:text-[10px] border ${
                    isActive 
                      ? "bg-[#00C853] border-[#00C853] text-black" 
                      : isCompleted 
                        ? "bg-[#00C853]/20 border-[#00C853]/40 text-[#00C853]" 
                        : "bg-transparent border-neutral-700 text-neutral-500"
                  }`}>
                    {isCompleted ? <Check size={8} className="stroke-[3]" /> : s}
                  </span>
                  <span className="hidden md:inline">
                    {s === 1 && "Trajet"}
                    {s === 2 && "Véhicule"}
                    {s === 3 && "Formule"}
                    {s === 4 && "Options"}
                    {s === 5 && "Récapitulatif"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Render Active Step Box */}
          <Card id="res_main_active_step_card" className="p-6 md:p-8 border border-white-premium/5 bg-[#0E0E14] rounded-2xl relative">
            
            {/* Step 1: Destination and Route Addresses */}
            {step === 1 && (
              <div className="space-y-6" id="step_form_trajet">
                <h3 className="text-lg font-bold text-white-premium border-b border-white-premium/5 pb-3">
                  {translate({ fr: "Étape 1 — Adresse de départ & Heures", en: "Step 1 — Ride Addresses & Timing" })}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono block">
                      Date de départ
                    </label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        className="w-full bg-[#14141C] border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium focus:outline-none focus:border-[#00C853] font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono block">
                      Heure de départ
                    </label>
                    <input 
                      type="time" 
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full bg-[#14141C] border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium focus:outline-none focus:border-[#00C853] font-mono"
                    />
                  </div>
                </div>

                {/* Autocomplete Input: Departure */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
                      <MapPin size={12} className="text-[#00C853]" />
                      {translate({ fr: "Adresse de départ (Facultatif / Autocomplétion)", en: "Departure Point (Optional)" })}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMapModal(true)}
                      className="text-[11px] text-[#00C853] hover:text-[#00e35e] font-medium flex items-center gap-1 hover:underline transition-colors cursor-pointer bg-transparent border-0"
                    >
                      <Map size={11} />
                      {translate({ fr: "Choisir sur la carte", en: "Pick on Map" })}
                    </button>
                  </div>
                  <input 
                    type="text"
                    value={pickup}
                    onFocus={() => setShowPickupList(true)}
                    onBlur={() => setTimeout(() => setShowPickupList(false), 250)}
                    onChange={(e) => {
                      setPickup(e.target.value);
                      setShowPickupList(true);
                    }}
                    placeholder="Saisissez une zone (facultatif - ex: Plateau, Aéroport, Cocody...)"
                    className="w-full bg-[#14141C] border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium focus:outline-none focus:border-[#00C853]"
                  />
                  {showPickupList && pickupSuggestions.length > 0 && (
                    <div className="absolute z-30 w-full bg-[#14141C] border border-neutral-800 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-2xl divide-y divide-white-premium/5">
                      {pickupSuggestions.map((loc) => (
                        <div
                          key={loc.name}
                          onClick={() => handlePickupSelect(loc)}
                          className="p-3 text-xs text-white-premium hover:bg-[#00C853]/10 cursor-pointer transition-colors flex items-center gap-2"
                        >
                          <MapPin size={10} className="text-[#00C853]" />
                          <span>{loc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <MapSelectorModal
                    isOpen={showMapModal}
                    onClose={() => setShowMapModal(false)}
                    onSelectAddress={(address) => setPickup(address)}
                  />
                </div>

                {/* Mandatory Phone Number Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
                    <span className="text-[#00C853] font-bold">*</span>
                    {translate({ fr: "Numéro de téléphone (Obligatoire)", en: "Phone Number (Required)" })}
                  </label>
                  <input 
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ex: 01 70 08 36 81"
                    className="w-full bg-[#14141C] border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium focus:outline-none focus:border-[#00C853] font-mono"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Fleet Category Selector */}
            {step === 2 && (
              <div className="space-y-6" id="step_form_vehicule">
                <h3 className="text-lg font-bold text-white-premium border-b border-white-premium/5 pb-3">
                  {translate({ fr: "Étape 2 — Type de véhicule", en: "Step 2 — Vehicle Type" })}
                </h3>

                <p className="text-xs text-neutral-400">
                  {translate({
                    fr: "Sélectionnez votre type de véhicule pour votre trajet d'exception à Abidjan. Seules les Berlines Premium sont actuellement en service.",
                    en: "Select your vehicle type for your elite transport in Abidjan. Only Premium Sedans are currently in service."
                  })}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Category 1: Berline Premium */}
                  <div
                    onClick={() => setSelectedVehicle("N1")}
                    className={`border rounded-2xl p-6 cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                      selectedVehicle === "N1"
                        ? "border-white bg-[#1A1A24] shadow-[0_4px_20px_rgba(255,255,255,0.05)]"
                        : "border-white-premium/5 bg-[#12121A] hover:border-white-premium/15"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] font-mono tracking-widest px-2.5 py-1 rounded-full font-bold uppercase ${
                        selectedVehicle === "N1" 
                          ? "text-black bg-white" 
                          : "text-white bg-white/10"
                      }`}>
                        {translate({ fr: "Disponible", en: "Available" })}
                      </span>
                      <Car size={24} className={selectedVehicle === "N1" ? "text-white" : "text-neutral-500"} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white-premium font-sans mb-1">
                        {translate({ fr: "Berline Premium (N1)", en: "Premium Sedan (N1)" })}
                      </h4>
                      <p className="text-xs text-neutral-400 font-mono">
                        {translate({ fr: "Type : Berline Premium", en: "Type: Premium Sedan" })}
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white-premium/5 flex justify-between items-center text-xs font-mono">
                      <span className="text-neutral-500">{translate({ fr: "À partir de", en: "Starting from" })}</span>
                      <span className={`font-extrabold text-sm ${selectedVehicle === "N1" ? "text-white" : "text-neutral-400"}`}>10 000 FCFA</span>
                    </div>
                  </div>

                  {/* Category 2: SUV Executive */}
                  <div
                    className="border border-white-premium/5 bg-[#12121A]/40 rounded-2xl p-6 opacity-40 grayscale cursor-not-allowed select-none relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-mono tracking-widest text-red-500 bg-red-950/40 px-2.5 py-1 rounded-full font-bold uppercase">
                        {translate({ fr: "Bientôt disponible", en: "Coming soon" })}
                      </span>
                      <Car size={24} className="text-neutral-600" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-neutral-400 font-sans mb-1">
                        {translate({ fr: "SUV Executive (N2)", en: "Executive SUV (N2)" })}
                      </h4>
                      <p className="text-xs text-neutral-500 font-mono">
                        {translate({ fr: "Type : SUV Premium", en: "Type: Premium SUV" })}
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white-premium/5 flex justify-between items-center text-xs font-mono">
                      <span className="text-neutral-600">{translate({ fr: "À partir de", en: "Starting from" })}</span>
                      <span className="text-neutral-500 font-bold">15 000 FCFA</span>
                    </div>
                  </div>

                  {/* Category 3: SUV Prestige */}
                  <div
                    className="border border-white-premium/5 bg-[#12121A]/40 rounded-2xl p-6 opacity-40 grayscale cursor-not-allowed select-none relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-mono tracking-widest text-red-500 bg-transparent border border-red-500/30 px-2.5 py-1 rounded-full font-bold uppercase">
                        {translate({ fr: "Bientôt disponible", en: "Coming soon" })}
                      </span>
                      <Car size={24} className="text-neutral-600" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-neutral-400 font-sans mb-1">
                        {translate({ fr: "SUV Prestige (N3)", en: "Prestige SUV (N3)" })}
                      </h4>
                      <p className="text-xs text-neutral-500 font-mono">
                        {translate({ fr: "Type : Prestige SUV", en: "Type: Prestige SUV" })}
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white-premium/5 flex justify-between items-center text-xs font-mono">
                      <span className="text-neutral-600">{translate({ fr: "Prix", en: "Price" })}</span>
                      <span className="text-neutral-500 font-bold">{translate({ fr: "Sur Devis", en: "On Quote" })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Logistics Formulas selection */}
            {step === 3 && (
              <div className="space-y-6" id="step_form_formule">
                <h3 className="text-lg font-bold text-white-premium border-b border-white-premium/5 pb-3">
                  {translate({ fr: "Étape 3 — Durée & Prix", en: "Step 3 — Duration & Price" })}
                </h3>

                <div className="bg-[#00C853] text-black p-5 rounded-2xl mb-6 shadow-[0_4px_20px_rgba(0,200,83,0.15)] border border-[#00C853]/30">
                  <p className="text-base md:text-lg lg:text-xl font-black flex items-center gap-3 leading-relaxed">
                    <span className="w-3 h-3 rounded-full bg-black animate-pulse shrink-0"></span>
                    {translate({
                      fr: "Sélectionnez votre formule. Les prix affichés correspondent au type de véhicule sélectionné.",
                      en: "Select your formula. The prices shown correspond to your selected vehicle type."
                    })}
                  </p>
                </div>

                <div className="uiverse-wrapper">
                  {FORMULAS.map((f) => {
                    const isActive = selectedFormulaId === f.id;
                    const calculatedPrice = selectedVehicle === "N3" 
                      ? translate({ fr: "Sur Devis", en: "On Quote" })
                      : selectedVehicle === "N2" 
                        ? f.id === "flash_premium" ? "15 000 FCFA" : f.id === "courses_vip" ? "28 000 FCFA" : f.id === "rdv_image" ? "39 000 FCFA" : f.id === "grande_journee" ? "60 000 FCFA" : "110 000 FCFA"
                        : selectedVehicle === "N1"
                          ? f.id === "flash_premium" ? "10 000 FCFA" : f.id === "courses_vip" ? "18 000 FCFA" : f.id === "rdv_image" ? "21 000 FCFA" : f.id === "grande_journee" ? "45 000 FCFA" : "85 000 FCFA"
                          : "-";

                    const valueType = 
                      f.id === "flash_premium" || f.id === "courses_vip" 
                        ? "basic" 
                        : f.id === "rdv_image" 
                          ? "standart" 
                          : "premium";

                    return (
                      <div
                        key={f.id}
                        id={`formula_selection_${f.id}`}
                        onClick={() => {
                          setSelectedFormulaId(f.id);
                          setFormula(f.formula);
                          setDurationHours(f.durationHours);
                        }}
                        className="uiverse-card"
                      >
                        <input 
                          className="uiverse-input" 
                          type="radio" 
                          name="card" 
                          value={valueType} 
                          checked={isActive}
                          onChange={() => {}} // React controlled input
                        />
                        <span className="uiverse-check"></span>
                        <label className="uiverse-label">
                          <div className="uiverse-title">
                            <div className="font-extrabold text-[12px] text-white tracking-wider mb-0.5">{f.duration}</div>
                            <div>{translate(f.name)}</div>
                          </div>
                          <div className="uiverse-price">
                            {calculatedPrice}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Surcharges & Extra options */}
            {step === 4 && (
              <div className="space-y-6" id="step_form_options">
                <h3 className="text-lg font-bold text-white-premium border-b border-white-premium/5 pb-3">
                  {translate({ fr: "Étape 4 — Options Facultatives & Surcharges", en: "Step 4 — Addons & Special Surcharges" })}
                </h3>

                <p className="text-xs text-neutral-400">
                  {translate({ 
                    fr: "Personnalisez votre prise en charge au-delà du transport standard d'Abidjan.",
                    en: "Bespoke your travel services beyond standardized premium transportation."
                  })}
                </p>

                {/* Surcharges Detection banners (Auto-detection task requirement) */}
                <div className="space-y-3">
                  
                  {priceResult?.isNight && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                      <Clock className="text-white" size={18} />
                      <div>
                        <h4 className="text-xs font-bold text-white font-mono">SERVICE DE NUIT ACTIF (+20%)</h4>
                        <p className="text-[10px] text-neutral-300 font-sans mt-0.5">
                          Détecté automatiquement selon votre heure de départ ({departureTime}) entre 22h et 6h.
                        </p>
                      </div>
                    </div>
                  )}

                  {priceResult?.isWeekend && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                      <Calendar className="text-white" size={18} />
                      <div>
                        <h4 className="text-xs font-bold text-white font-mono">TARIF DE WEEK-END ACTIF (+20%)</h4>
                        <p className="text-[10px] text-neutral-300 font-sans mt-0.5">
                          Détecté automatiquement selon votre date de départ ({departureDate}) qui correspond à un samedi ou dimanche.
                        </p>
                      </div>
                    </div>
                  )}

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  
                  {/* Option: Bilingual driver */}
                  <div 
                    onClick={() => setIsBilingual(!isBilingual)}
                    className={`border rounded-2xl p-5 cursor-pointer transition-all duration-300 flex items-start gap-3 justify-between ${
                      isBilingual ? "border-white bg-[#1A1A24] shadow-[0_4px_20px_rgba(255,255,255,0.05)]" : "border-white-premium/5 bg-[#12121A] hover:border-white-premium/15"
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-xs text-white-premium flex items-center gap-2">
                        <Globe size={14} className={isBilingual ? "text-white" : "text-neutral-400"} />
                        Chauffeur d'élite bilingue (+15%)
                      </h4>
                      <p className="text-[10px] text-neutral-400 mt-2">
                        Chauffeur certifié maîtrisant parfaitement le français et l'anglais des affaires.
                      </p>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${isBilingual ? "border-white bg-white" : "border-neutral-700"}`}>
                      {isBilingual && <Check size={10} className="text-black stroke-[3px]" />}
                    </div>
                  </div>

                  {/* Option: Airport Greeting */}
                  <div 
                    onClick={() => setIsAirportGreeting(!isAirportGreeting)}
                    className={`border rounded-2xl p-5 cursor-pointer transition-all duration-300 flex items-start gap-3 justify-between ${
                      isAirportGreeting ? "border-white bg-[#1A1A24] shadow-[0_4px_20px_rgba(255,255,255,0.05)]" : "border-white-premium/5 bg-[#12121A] hover:border-white-premium/15"
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-xs text-white-premium flex items-center gap-2">
                        <UserCheck size={14} className={isAirportGreeting ? "text-white" : "text-neutral-400"} />
                        Accueil pancarte aéroport (+5 000 FCFA)
                      </h4>
                      <p className="text-[10px] text-neutral-400 mt-2">
                        Votre chauffeur vous attend dès la sortie des douanes avec une pancarte à votre nom.
                      </p>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${isAirportGreeting ? "border-white bg-white" : "border-neutral-700"}`}>
                      {isAirportGreeting && <Check size={10} className="text-black stroke-[3px]" />}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Step 5: Final recapitulation and review */}
            {step === 5 && (
              <div className="space-y-6" id="step_form_recap">
                <h3 className="text-lg font-bold text-white-premium border-b border-white-premium/5 pb-3">
                  {translate({ fr: "Étape 5 — Récapitulatif de Votre Réservation", en: "Step 5 — Booking Summary" })}
                </h3>

                <p className="text-xs text-neutral-400">
                  {translate({ 
                    fr: "Vérifiez les détails du protocole de transport électrique d'EASY avant confirmation.",
                    en: "Double check your route protocol details and finalize execution."
                  })}
                </p>

                <div className="divide-y divide-white-premium/5 bg-dark/40 border border-white-premium/5 rounded-2xl p-5 space-y-4 font-sans text-xs">
                  
                  {/* Route information */}
                  <div className="flex items-center gap-3 pb-3">
                    <div className="w-8 h-8 rounded bg-[#00C853]/10 text-[#00C853] flex items-center justify-center">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">TRAJET PRÉVU</span>
                      <p className="text-white-premium font-medium text-xs mt-0.5">{pickup} → {destination}</p>
                    </div>
                  </div>

                  {/* Timing information */}
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded bg-[#00C853]/10 text-[#00C853] flex items-center justify-center">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">PROGRAMME DE DÉPART</span>
                      <p className="text-white-premium font-medium">{departureDate} à {departureTime}</p>
                    </div>
                  </div>

                  {/* Vehicle selection */}
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded bg-transparent border border-white/10 text-gold flex items-center justify-center">
                      <Car size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">VÉHICULE SÉLECTIONNÉ</span>
                      <p className="text-white-premium font-bold font-sans">
                        {selectedVehicle === "N1" ? "Berline Premium (N1)" : selectedVehicle === "N2" ? "SUV Executive (N2)" : "SUV Prestige (N3)"}
                      </p>
                    </div>
                  </div>

                  {/* Formula details */}
                  <div className="flex justify-between items-center py-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">FORMULE RETENUE :</span>
                    <Badge id="badge_res_summary_formula" className="bg-transparent text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
                      {(() => {
                        const matched = FORMULAS.find(f => f.id === selectedFormulaId);
                        return matched ? `${translate(matched.name).toUpperCase()} (${matched.duration})` : (formula === "hourly" ? `À L'HEURE (${durationHours}h)` : (formula === "halfday" ? "DEMI-JOURNÉE (8h)" : "JOURNÉE REINE (16h)"));
                      })()}
                    </Badge>
                  </div>

                  {/* Options details */}
                  {(isBilingual || isAirportGreeting) && (
                    <div className="py-3">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 block mb-2">OPTIONS ACTIVÉES</span>
                      <div className="flex flex-wrap gap-2">
                        {isBilingual && <Badge id="badge_res_summary_opt_bilingual" className="bg-white-premium/5 text-neutral-300 border-none text-[9px]">Chauffeur bilingue</Badge>}
                        {isAirportGreeting && <Badge id="badge_res_summary_opt_airport" className="bg-white-premium/5 text-neutral-300 border-none text-[9px]">Accueil pancarte</Badge>}
                      </div>
                    </div>
                  )}

                </div>

                {!isAuthenticated && (
                  <div className="bg-transparent border border-red-500/30 p-4 rounded-xl flex items-center gap-3 hover:translate-y-[-1px] transition-all cursor-pointer" onClick={() => setCurrentPage("connexion")}>
                    <AlertCircle className="text-red-400 shrink-0" size={18} />
                    <p className="text-xs text-red-400 font-sans">
                      {translate({ 
                        fr: "Veuillez vous connecter à votre Espace Client pour confirmer votre réservation.",
                        en: "Please connect to your Member Portal to validate this ride request."
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Steps Controller Buttons (Stepper Navigation) */}
            <div className="border-t border-white-premium/5 pt-6 mt-8 flex justify-between gap-4">
              {step > 1 ? (
                <Button
                  id="stepper_btn_prev"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  {translate({ fr: "Précédent", en: "Back" })}
                </Button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <Button
                  id="stepper_btn_next"
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !canGoNextStep1) || 
                    (step === 2 && !canGoNextStep2) ||
                    (step === 3 && !canGoNextStep3)
                  }
                  className="bg-[#00C853] hover:bg-[#00b04a] text-black font-bold flex items-center gap-1.5"
                >
                  {translate({ fr: "Continuer", en: "Continue" })}
                  <ArrowRight size={14} />
                </Button>
              ) : (
                <Button
                  id="stepper_btn_confirm"
                  onClick={() => handleConfirmReservation()}
                  disabled={calcLoading}
                  className="bg-[#00C853] hover:bg-[#00b04a] text-black font-extrabold flex items-center gap-1.5 px-6"
                >
                  {isAuthenticated 
                    ? translate({ fr: "Confirmer ma réservation ✦", en: "Confirm My Booking ✦" })
                    : translate({ fr: "Se connecter pour réserver ✦", en: "Log in to Book ✦" })
                  }
                  <Check size={14} />
                </Button>
              )}
            </div>

          </Card>
        </div>

        {/* Right Side: Quick receipt / Realtime pricing calculations panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card id="res_price_calculator_panel_card" className="p-6 border border-white-premium/5 bg-[#12121A] rounded-2xl relative sticky top-24">
            <h3 className="text-sm font-mono uppercase tracking-[0.15em] text-neutral-400 mb-4 border-b border-white-premium/5 pb-2 font-bold">
              {translate({ fr: "Calculateur temps réel", en: "Real-Time Quote calculation" })}
            </h3>

            {calcLoading ? (
              <div className="py-12 text-center text-xs font-mono text-neutral-500 animate-pulse">
                Calcul des tarifs d'Abidjan...
              </div>
            ) : (!selectedVehicle || !selectedFormulaId || !priceResult) ? (
              <div className="py-12 text-center text-xs font-sans text-neutral-500 px-4 leading-relaxed">
                <p className="font-semibold text-neutral-400 mb-1">
                  {!selectedVehicle 
                    ? translate({ fr: "Aucun véhicule sélectionné", en: "No vehicle selected" })
                    : translate({ fr: "Aucune formule sélectionnée", en: "No package selected" })
                  }
                </p>
                <p className="text-[10px] text-neutral-500">
                  {!selectedVehicle 
                    ? translate({ fr: "Veuillez choisir un véhicule à l'Étape 2.", en: "Please choose a vehicle at Step 2." })
                    : translate({ fr: "Veuillez choisir une formule de durée à l'Étape 3.", en: "Please choose a duration package at Step 3." })
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Visual indicator of vehicle type */}
                <div className="flex justify-between text-xs pb-2 border-b border-white-premium/5">
                  <span className="text-neutral-500">Véhicule choisi :</span>
                  <span className="text-white font-bold font-mono text-right">
                    {selectedVehicle === "N1" ? "Berline Premium (N1)" : selectedVehicle === "N2" ? "SUV Executive (N2)" : "SUV Prestige (N3)"}
                  </span>
                </div>

                <div className="flex justify-between text-xs pb-2 border-b border-white-premium/5">
                  <span className="text-neutral-500">
                    {step < 3 
                      ? translate({ fr: "Prix minimum de location :", en: "Minimum rental price:" }) 
                      : translate({ fr: "Tarif de base :", en: "Base rate:" })}
                  </span>
                  <span className="text-white-premium font-mono">
                    {selectedVehicle === "N3" ? (
                      translate({ fr: "Sur devis", en: "On quote" })
                    ) : step < 3 ? (
                      selectedVehicle === "N2" ? "57 000 FCFA" : "45 000 FCFA"
                    ) : (
                      `${priceResult.basePrice?.toLocaleString()} FCFA`
                    )}
                  </span>
                </div>

                {/* Night surcharge info if exist */}
                {priceResult.isNight && (
                  <div className="flex justify-between text-xs text-white pb-2 border-b border-white-premium/5">
                    <span>Majoration Nuit (22h-6h) :</span>
                    <span className="font-mono font-bold">+15%</span>
                  </div>
                )}

                {/* Weekend surcharge info if exist */}
                {priceResult.isWeekend && (
                  <div className="flex justify-between text-xs text-white pb-2 border-b border-white-premium/5">
                    <span>Majoration Samedi / Dimanche :</span>
                    <span className="font-mono font-bold">+20%</span>
                  </div>
                )}

                {/* Surcharges list */}
                {isBilingual && (
                  <div className="flex justify-between text-xs text-neutral-300 pb-2 border-b border-white-premium/5">
                    <span>Chauffeur bilingue :</span>
                    <span className="font-mono">+15%</span>
                  </div>
                )}

                {isAirportGreeting && (
                  <div className="flex justify-between text-xs text-neutral-300 pb-2 border-b border-white-premium/5">
                    <span>Forfait Accueil Aéroport :</span>
                    <span className="font-mono">+5 000 FCFA</span>
                  </div>
                )}

                {/* Total price section */}
                <div className="pt-4 text-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block mb-1">
                    {step < 3 
                      ? translate({ fr: "ESTIMATION INITIALE", en: "INITIAL ESTIMATION" }) 
                      : translate({ fr: "TOTAL ESTIMÉ EN FRANCS CFA (XOF)", en: "ESTIMATED TOTAL IN FRANCS CFA (XOF)" })}
                  </span>
                  
                  {selectedVehicle === "N3" ? (
                    <div className="p-3 bg-transparent border border-red-500/30 rounded-lg">
                      <span className="text-lg font-bold text-red-400 font-sans block">SUR DEVIS</span>
                      <span className="text-[9px] text-neutral-400 font-sans uppercase">Étude de protocole requise</span>
                    </div>
                  ) : step < 3 ? (
                    <div className="p-4 bg-dark rounded-xl border border-white-premium/5">
                      <span className="text-[9px] font-mono uppercase text-emerald-500 font-bold block mb-1">
                        {translate({ fr: "À PARTIR DE", en: "STARTING FROM" })}
                      </span>
                      <span className="text-3xl font-extrabold text-white tracking-tighter font-mono">
                        {selectedVehicle === "N2" ? "57 000" : "45 000"}
                      </span>
                      <span className="text-xs font-mono font-bold text-white ml-1">FCFA</span>
                      <p className="text-[9px] text-neutral-400 font-sans mt-2 uppercase tracking-wide">
                        {translate({ 
                          fr: "Sélectionnez votre formule à l'étape 3", 
                          en: "Select your formula at step 3" 
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-dark rounded-xl border border-white-premium/5">
                      <span className="text-3xl font-extrabold text-white tracking-tighter font-mono">
                        {priceResult.totalPrice?.toLocaleString()}
                      </span>
                      <span className="text-xs font-mono font-bold text-white ml-1">FCFA</span>
                      <p className="text-[9px] text-neutral-500 font-mono mt-1">ARRONDI REGLEMENTAIRE (500 FCFA SUP.)</p>
                    </div>
                  )}

                </div>

              </div>
            )}

            <div className="bg-[#14141C] border border-white-premium/5 rounded-xl p-4 mt-6 text-[11px] text-neutral-400 space-y-2">
              <span className="text-[9px] font-mono uppercase font-bold text-[#00C853] block">GARANTIES EASY :</span>
              <p>✔ Annulation gratuite jusqu'à 1h avant le départ.</p>
              <p>✔ Flotte de prestige 100% électrique rutilante.</p>
              <p>✔ Facturation par email instantanée.</p>
            </div>
          </Card>

          {/* Elite Customer Support Help Card */}
          <Card id="res_support_help_card" className="p-6 border border-[#25D366]/20 bg-[#12121A] rounded-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[#25D366]" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
                <HelpCircle size={18} />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#25D366] font-bold block">
                  SUPPORT CLIENTS
                </span>
                <h4 className="text-xs font-bold text-white-premium font-sans">
                  Difficulté à réserver ?
                </h4>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mb-4">
              Notre équipe d'assistance est à votre entière disposition pour enregistrer directement votre réservation ou répondre à vos questions.
            </p>

            <div className="space-y-2.5">
              {/* WhatsApp Button */}
              <a 
                href="https://wa.me/2250170083681?text=Bonjour,%20j'ai%20besoin%20d'aide%20pour%20ma%20r%C3%A9servation%20sur%20Easy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all text-xs group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                  <span className="text-white-premium font-bold font-mono">01 70 08 36 81</span>
                </div>
                <span className="bg-[#25D366] text-black text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  WhatsApp & Appel
                </span>
              </a>

              {/* Phone call only */}
              <a 
                href="tel:+2250797139787"
                className="flex items-center justify-between p-3 rounded-xl bg-white-premium/5 border border-white-premium/10 hover:bg-white-premium/10 transition-all text-xs"
              >
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-neutral-400" />
                  <span className="text-white-premium font-bold font-mono">07 97 13 97 87</span>
                </div>
                <span className="bg-white-premium/10 text-neutral-300 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Appel uniquement
                </span>
              </a>
            </div>
          </Card>
        </div>

      </div>

      {/* Floating WhatsApp Help Button */}
      <a
        href="https://wa.me/2250170083681?text=Bonjour,%20j'ai%20besoin%20d'aide%20pour%20ma%20r%C3%A9servation%20sur%20Easy"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba56] text-white px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group font-sans"
        id="whatsapp_floating_help_btn"
      >
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-3 w-3 rounded-full bg-white opacity-75 animate-ping" />
          <Phone size={18} className="relative text-white fill-current" />
        </div>
        <span className="text-xs font-extrabold tracking-wide uppercase">
          Besoin d'aide ? WhatsApp
        </span>
      </a>

      <MyBookingsModal
        isOpen={showBookingsModal}
        onClose={() => setShowBookingsModal(false)}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
};
