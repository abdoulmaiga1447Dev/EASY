/**
 * Page « Réservation » — refonte UI/UX 2026.
 * Tunnel en PAGE UNIQUE (scroll) : sections claires empilées + résumé/prix collant,
 * et récapitulatif/confirmation sur fond sombre.
 * Toute la logique (prix en direct, autocomplétion, API, succès) est conservée.
 */
import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import {
  Calendar, Clock, MapPin, Car, ArrowRight, X, Check, UserCheck, Globe, Map,
  Compass, Phone, HelpCircle, MessageCircle, AlertCircle, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MapSelectorModal } from "../components/MapSelectorModal";
import { MyBookingsModal } from "../components/MyBookingsModal";
import reservationIllu from "../assets/saver/reservation-illustration.jpg";

const GREEN = "#00C853";
const INK = "#0B1F14";

interface ReservationProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

const ABIDJAN_LOCATIONS = [
  { name: "Adjamé Liberté, Abidjan" }, { name: "Adjamé Forum des Marchés, Abidjan" }, { name: "Adjamé 220 Logements, Abidjan" },
  { name: "Mairie d'Adjamé, Abidjan" }, { name: "Gare Routière d'Adjamé, Abidjan" }, { name: "Adjamé Mirador, Abidjan" }, { name: "Adjamé Paillet, Abidjan" },
  { name: "Cocody Centre, Abidjan" }, { name: "Cocody Deux Plateaux, Abidjan" }, { name: "Cocody Deux Plateaux Vallon, Abidjan" },
  { name: "Cocody Angré (Nouveau CHU), Abidjan" }, { name: "Cocody Angré Djibi, Abidjan" }, { name: "Cocody Angré Nouveau Horizon, Abidjan" },
  { name: "Cocody Riviera 1, Abidjan" }, { name: "Cocody Riviera 2, Abidjan" }, { name: "Cocody Riviera 3 (Lycée Américain), Abidjan" },
  { name: "Cocody Riviera 4 (M'Pouto), Abidjan" }, { name: "Cocody Riviera Palmeraie, Abidjan" }, { name: "Cocody Riviera Bonoumin, Abidjan" },
  { name: "Cocody Riviera Golf, Abidjan" }, { name: "Cocody Riviera Faya, Abidjan" }, { name: "Cocody Saint-Jean, Abidjan" },
  { name: "Université Félix Houphouët-Boigny, Cocody" }, { name: "CHU de Cocody, Abidjan" }, { name: "Ambassade de France, Cocody" }, { name: "Ambassade des Etats-Unis, Cocody" },
  { name: "Plateau, Abidjan (Quartier des Affaires)" }, { name: "Boulevard de la République, Plateau, Abidjan" }, { name: "Avenue Chardy, Plateau, Abidjan" },
  { name: "Cathédrale Saint-Paul, Plateau, Abidjan" }, { name: "Hôtel Tiama, Plateau, Abidjan" }, { name: "Hôtel Pullman, Plateau, Abidjan" }, { name: "Hôtel Noom, Plateau, Abidjan" },
  { name: "Stade Félix Houphouët-Boigny (Félicia), Plateau" }, { name: "Mairie du Plateau, Abidjan" }, { name: "Immeuble CCIA, Plateau, Abidjan" }, { name: "Immeuble Postel 2001, Plateau, Abidjan" },
  { name: "Marcory Zone 4 (Rue Pierre & Marie Curie), Abidjan" }, { name: "Marcory Zone 4 (Rue Paul Langevin), Abidjan" }, { name: "Marcory Zone 4 (Rue du Canal), Abidjan" },
  { name: "Marcory Résidentiel, Abidjan" }, { name: "Marcory Centre, Abidjan" }, { name: "Boulevard de Marseille, Marcory, Abidjan" }, { name: "Boulevard de Lorraine, Marcory, Abidjan" },
  { name: "Marcory GFCI, Abidjan" }, { name: "Marcory Aliodan / Résidences, Abidjan" }, { name: "Cap Sud, Marcory, Abidjan" }, { name: "Prima Center, Marcory, Abidjan" },
  { name: "Playce Marcory, Abidjan" }, { name: "Hôtel Azalaï, Marcory, Abidjan" }, { name: "Biétry, Marcory, Abidjan" },
  { name: "Treichville, Boulevard de Marseille, Abidjan" }, { name: "Treichville Avenue 16 / Avenue 21, Abidjan" }, { name: "Treichville Boulevard Valéry Giscard d'Estaing (VGE)" },
  { name: "Gare de Bassam, Treichville, Abidjan" }, { name: "CHU de Treichville, Abidjan" }, { name: "Palais des Sports de Treichville, Abidjan" }, { name: "Port Autonome d'Abidjan, Treichville" },
  { name: "Koumassi Centre, Abidjan" }, { name: "Koumassi Zone Industrielle, Abidjan" }, { name: "Koumassi Soweto, Abidjan" }, { name: "Koumassi Grand Carrefour, Abidjan" }, { name: "Koumassi Remblais, Abidjan" },
  { name: "Aéroport International Félix Houphouët-Boigny, Port-Bouët" }, { name: "Port-Bouët Centre, Abidjan" }, { name: "Port-Bouët Vridi (Zone Industrielle), Abidjan" },
  { name: "Port-Bouët Vridi Canal, Abidjan" }, { name: "Quartier Phare, Port-Bouët, Abidjan" },
  { name: "Yopougon Siporex, Abidjan" }, { name: "Yopougon Maroc, Abidjan" }, { name: "Yopougon Niangon, Abidjan" }, { name: "Yopougon Toits Rouges, Abidjan" },
  { name: "Yopougon Sogefiha, Abidjan" }, { name: "Yopougon Bel Air, Abidjan" }, { name: "Yopougon Académie, Abidjan" }, { name: "Yopougon Zone Industrielle, Abidjan" },
  { name: "Yopougon Selmer, Abidjan" }, { name: "Cosmos Yopougon, Abidjan" }, { name: "CHU de Yopougon, Abidjan" },
  { name: "Abobo Gare, Abidjan" }, { name: "Abobo Baoulé, Abidjan" }, { name: "Abobo Samaké, Abidjan" }, { name: "Abobo Avocatier, Abidjan" }, { name: "Abobo Dokui, Abidjan" }, { name: "Abobo Té, Abidjan" }, { name: "Mairie d'Abobo, Abidjan" },
  { name: "Bingerville Centre, Abidjan" }, { name: "Bingerville Fehi Kessé, Abidjan" }, { name: "Bingerville Ecole Militaire (EMPT), Abidjan" }, { name: "Bingerville Jardin Botanique, Abidjan" },
  { name: "Grand-Bassam, Zone Balnéaire" }, { name: "Grand-Bassam Quartier France" }, { name: "Assinie-Mafia, Club Méditerranée" }, { name: "Assinie Terminal, Zone Touristique" },
];

const FORMULAS = [
  { id: "flash_premium", duration: "1h", name: { fr: "Le Flash Premium", en: "Le Flash Premium" }, desc: { fr: "Aéroport, restaurant, hôtel — 1 seul trajet. Jusqu'à 3 personnes", en: "Airport, restaurant, hotel — 1 single journey. Up to 3 passengers" }, formula: "hourly" as const, durationHours: 1 },
  { id: "courses_vip", duration: "2h", name: { fr: "Les Courses VIP", en: "VIP Errands" }, desc: { fr: "Pharmacie, shopping, 2-3 arrêts en ville", en: "Pharmacy, shopping, 2-3 quick stops around Abidjan" }, formula: "hourly" as const, durationHours: 2 },
  { id: "rdv_image", duration: "3h", name: { fr: "Le RDV d'Image", en: "The Image Meeting" }, desc: { fr: "Meeting, hôtel 5★, cabinet d'avocats, banque", en: "Meeting, 5★ hotel, law firm, private banking" }, formula: "hourly" as const, durationHours: 3 },
  { id: "grande_journee", duration: "8h", name: { fr: "La Grande Journée", en: "The Full Day" }, desc: { fr: "Bassam, Dabou, Anyama — itinéraire libre", en: "Grand-Bassam, Dabou, Anyama — custom unlimited route" }, formula: "halfday" as const, durationHours: 8 },
  { id: "evenement", duration: "16h", name: { fr: "L'Événement", en: "The Signature Event" }, desc: { fr: "Mariage, séminaire, journée VIP", en: "Weddings, high-level seminars, private VIP days" }, formula: "fullday" as const, durationHours: 16 },
];

const PRICE_MAP: Record<string, { N1: string; N2: string }> = {
  flash_premium: { N1: "10 000 FCFA", N2: "15 000 FCFA" },
  courses_vip: { N1: "18 000 FCFA", N2: "28 000 FCFA" },
  rdv_image: { N1: "21 000 FCFA", N2: "39 000 FCFA" },
  grande_journee: { N1: "45 000 FCFA", N2: "60 000 FCFA" },
  evenement: { N1: "85 000 FCFA", N2: "110 000 FCFA" },
};

export const Reservation: React.FC<ReservationProps> = ({ setCurrentPage, id }) => {
  const { translate } = useLanguage();
  const { isAuthenticated } = useAuth();

  // --- État (identique au tunnel précédent) ---
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("10:00");
  const [pickup, setPickup] = useState("");
  const [destination] = useState("Mise à disposition");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [showPickupList, setShowPickupList] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<"N1" | "N2" | "N3" | null>("N1");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleDetail, setSelectedVehicleDetail] = useState<any | null>(null);

  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(null);
  const [formula, setFormula] = useState<"hourly" | "halfday" | "fullday" | null>(null);
  const [durationHours, setDurationHours] = useState(3);

  const [isBilingual, setIsBilingual] = useState(false);
  const [isAirportGreeting, setIsAirportGreeting] = useState(false);

  const [calcLoading, setCalcLoading] = useState(false);
  const [priceResult, setPriceResult] = useState<any>(null);

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [finalBookingData, setFinalBookingData] = useState<any>(null);
  const [showRecap, setShowRecap] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Charge les véhicules + pré-sélection éventuelle
  useEffect(() => {
    fetch("/api/vehicles")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.vehicles) {
          setVehicles(data.vehicles);
          const savedId = localStorage.getItem("ev_selected_vehicle_id");
          if (savedId) {
            const match = data.vehicles.find((v: any) => v.id === savedId);
            if (match) setSelectedVehicleDetail(match);
          }
        }
      })
      .catch((err) => console.error("Error loading vehicles in reservation", err));
  }, []);

  useEffect(() => {
    const savedFormula = localStorage.getItem("ev_selected_formula");
    if (savedFormula) {
      const matched = FORMULAS.find((f) => f.id === savedFormula);
      if (matched) {
        setSelectedFormulaId(matched.id);
        setFormula(matched.formula);
        setDurationHours(matched.durationHours);
      }
      localStorage.removeItem("ev_selected_formula");
    }
    // Un seul véhicule disponible (Berline N1) → sélection automatique.
    localStorage.removeItem("ev_selected_vehicle_category");
  }, [vehicles]);

  // Date par défaut : demain
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDepartureDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // Autocomplétion
  useEffect(() => {
    if (!showPickupList) { setPickupSuggestions([]); return; }
    if (!pickup.trim()) {
      setPickupSuggestions([
        { name: "Aéroport International Félix Houphouët-Boigny, Port-Bouët" },
        { name: "Plateau, Abidjan (Quartier des Affaires)" },
        { name: "Marcory Zone 4 (Rue Pierre & Marie Curie), Abidjan" },
        { name: "Cocody Deux Plateaux, Abidjan" },
        { name: "Adjamé Liberté, Abidjan" },
        { name: "Yopougon Maroc, Abidjan" },
      ]);
      return;
    }
    const delay = setTimeout(() => {
      fetch(`/api/autocomplete?input=${encodeURIComponent(pickup)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.predictions) && data.predictions.length > 0) setPickupSuggestions(data.predictions);
          else setPickupSuggestions(ABIDJAN_LOCATIONS.filter((loc) => loc.name.toLowerCase().includes(pickup.toLowerCase())));
        })
        .catch(() => setPickupSuggestions(ABIDJAN_LOCATIONS.filter((loc) => loc.name.toLowerCase().includes(pickup.toLowerCase()))));
    }, 300);
    return () => clearTimeout(delay);
  }, [pickup, showPickupList]);

  // Calcul du prix en direct
  useEffect(() => {
    if (!departureDate || !departureTime || !selectedVehicle || !formula) { setPriceResult(null); return; }
    const run = async () => {
      setCalcLoading(true);
      try {
        const body = {
          vehicleClass: selectedVehicle, formula,
          durationHours: formula === "hourly" ? durationHours : formula === "halfday" ? 8 : 16,
          departureDate, departureTime,
          options: { bilingual: isBilingual, airportGreeting: isAirportGreeting },
        };
        const res = await fetch("/api/reservations/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (res.ok) setPriceResult(await res.json());
      } catch (e) { console.error("Calculation pricing error:", e); } finally { setCalcLoading(false); }
    };
    const timer = setTimeout(run, 300);
    return () => clearTimeout(timer);
  }, [selectedVehicle, formula, durationHours, departureDate, departureTime, isBilingual, isAirportGreeting]);

  const handlePickupSelect = (loc: any) => { setPickup(loc.name); setShowPickupList(false); };

  const handleConfirmReservation = async () => {
    if (!isAuthenticated) { setCurrentPage("connexion"); return; }
    const activeToken = localStorage.getItem("ev_access_token");
    if (!activeToken) { alert("Session expirée. Veuillez vous reconnecter."); setCurrentPage("connexion"); return; }
    setIsConfirming(true);
    const started = Date.now();
    try {
      const body = {
        vehicleId: selectedVehicleDetail ? selectedVehicleDetail.id : selectedVehicle === "N1" ? "v_berline_n1" : "v_suv_n2_a",
        departureDate, departureTime, pickup, destination, formula,
        durationHours: formula === "hourly" ? durationHours : formula === "halfday" ? 8 : 16,
        options: [...(isBilingual ? ["bilingual"] : []), ...(isAirportGreeting ? ["airportGreeting"] : [])],
        totalPrice: priceResult?.totalPrice || 0, segment: "public", status: "pending_assignment", phone: phoneNumber,
      };
      const res = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        const wait = Math.max(0, 900 - (Date.now() - started)); // laisse voir l'animation
        setTimeout(() => { setFinalBookingData(data); setBookingSuccess(true); setIsConfirming(false); }, wait);
      } else {
        const errData = await res.json(); setIsConfirming(false); alert(errData.error?.fr || "Erreur de réservation.");
      }
    } catch (e) { console.error(e); setIsConfirming(false); alert("Une erreur technique s'est produite lors de la réservation."); }
  };

  const canConfirm = !!(phoneNumber.trim() && destination && departureDate && departureTime && selectedVehicle && formula);
  const inputCls = "w-full rounded-xl bg-[#F4F8F5] border border-[#E6EBE8] focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/20 p-3 text-sm text-[#0B1F14] placeholder-[#9BA8A0] outline-none transition-colors";
  const sectionCls = "rounded-3xl bg-white ring-1 ring-[#E6EBE8] shadow-[0_1px_0_rgba(0,0,0,0.02)] p-6 sm:p-7";
  const goToRecap = () => { if (canConfirm) { setShowRecap(true); window.scrollTo({ top: 0, behavior: "smooth" }); } };

  // ---------- Panneau résumé / prix (réutilisé) ----------
  const SummaryPanel = (
    <div className="rounded-3xl bg-white ring-1 ring-[#E6EBE8] shadow-sm p-6">
      <h3 className="text-sm font-bold uppercase tracking-wide text-[#0B1F14]">{translate({ fr: "Votre résumé", en: "Your summary" })}</h3>
      <p className="text-xs text-[#5B6B62] mt-0.5">{translate({ fr: "Estimation en direct", en: "Live estimate" })}</p>

      {calcLoading ? (
        <div className="py-10 text-center text-xs text-[#5B6B62] animate-pulse">{translate({ fr: "Calcul du tarif…", en: "Calculating…" })}</div>
      ) : !selectedVehicle || !selectedFormulaId || !priceResult ? (
        <div className="mt-4 rounded-2xl bg-[#F4F8F5] p-4 text-center text-xs text-[#5B6B62]">
          {!selectedVehicle ? translate({ fr: "Choisissez un véhicule, puis une formule.", en: "Choose a vehicle, then a package." }) : translate({ fr: "Choisissez une formule.", en: "Choose a package." })}
        </div>
      ) : (
        <div className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between"><span className="text-[#5B6B62]">{translate({ fr: "Véhicule", en: "Vehicle" })}</span><span className="font-semibold">{selectedVehicle === "N1" ? "Berline (N1)" : selectedVehicle === "N2" ? "SUV Exec (N2)" : "Prestige (N3)"}</span></div>
          {selectedVehicle !== "N3" && priceResult.basePrice != null && (
            <div className="flex justify-between"><span className="text-[#5B6B62]">{translate({ fr: "Tarif de base", en: "Base rate" })}</span><span className="font-semibold">{priceResult.basePrice.toLocaleString()} FCFA</span></div>
          )}
          {priceResult.isNight && <div className="flex justify-between text-[#C85A00]"><span>{translate({ fr: "Majoration nuit", en: "Night surcharge" })}</span><span className="font-semibold">+20%</span></div>}
          {priceResult.isWeekend && <div className="flex justify-between text-[#C85A00]"><span>{translate({ fr: "Week-end / férié", en: "Weekend / holiday" })}</span><span className="font-semibold">+20%</span></div>}
          {isBilingual && <div className="flex justify-between text-[#5B6B62]"><span>{translate({ fr: "Chauffeur bilingue", en: "Bilingual chauffeur" })}</span><span className="font-semibold">+15%</span></div>}
          {isAirportGreeting && <div className="flex justify-between text-[#5B6B62]"><span>{translate({ fr: "Accueil aéroport", en: "Airport greeting" })}</span><span className="font-semibold">+5 000 FCFA</span></div>}

          <div className="mt-3 rounded-2xl p-4 text-center" style={{ background: "#F4F8F5" }}>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#5B6B62] block mb-1">{translate({ fr: "Total estimé (XOF)", en: "Estimated total (XOF)" })}</span>
            {selectedVehicle === "N3" ? (
              <span className="text-xl font-extrabold" style={{ color: GREEN }}>{translate({ fr: "Sur devis", en: "On quote" })}</span>
            ) : (
              <span className="text-3xl font-extrabold tracking-tight">{priceResult.totalPrice?.toLocaleString()}<span className="text-sm ml-1">FCFA</span></span>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl bg-[#F4F8F5] p-4 text-xs text-[#5B6B62] space-y-1.5">
        <span className="text-[10px] font-bold uppercase block" style={{ color: GREEN }}>{translate({ fr: "Garanties EASY", en: "EASY guarantees" })}</span>
        <p>✔ {translate({ fr: "Annulation gratuite jusqu'à 1h avant.", en: "Free cancellation up to 1h before." })}</p>
        <p>✔ {translate({ fr: "Flotte 100 % électrique.", en: "100% electric fleet." })}</p>
        <p>✔ {translate({ fr: "Facturation par e-mail.", en: "Instant email invoice." })}</p>
      </div>
    </div>
  );

  return (
    <div id={id} className="relative bg-white text-[#0B1F14] font-sans">
      {/* Illustration en arrière-plan sur mobile */}
      <div aria-hidden className="lg:hidden pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-50" style={{ backgroundImage: `url(${reservationIllu})`, backgroundSize: "cover", backgroundPosition: "center top" }} />
      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 pt-12 lg:pt-16 pb-28 lg:pb-16 grid lg:grid-cols-12 gap-8 items-start">
        {/* ===================== ILLUSTRATION (gauche) ===================== */}
        <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24">
          <div className="rounded-3xl overflow-hidden ring-1 ring-[#E6EBE8] bg-[#F4F8F5] shadow-sm">
            <img src={reservationIllu} alt="Réservez votre course EASY" className="w-full h-auto object-cover" />
          </div>
          <div className="mt-4 rounded-2xl bg-[#F4F8F5] ring-1 ring-[#E6EBE8] p-4 text-xs text-[#5B6B62] space-y-1.5">
            <span className="text-[10px] font-bold uppercase block" style={{ color: GREEN }}>{translate({ fr: "Garanties EASY", en: "EASY guarantees" })}</span>
            <p>✔ {translate({ fr: "Annulation gratuite jusqu'à 1h avant.", en: "Free cancellation up to 1h before." })}</p>
            <p>✔ {translate({ fr: "Flotte 100 % électrique.", en: "100% electric fleet." })}</p>
            <p>✔ {translate({ fr: "Facturation par e-mail.", en: "Instant email invoice." })}</p>
          </div>
        </div>

        {/* ===================== FLUX (droite) ===================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* En-tête */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold tracking-wide" style={{ color: GREEN }}>{translate({ fr: "RÉSERVATION", en: "BOOKING" })}</span>
              <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">{translate({ fr: "Planifier votre trajet", en: "Plan your ride" })}</h1>
              <p className="mt-1 text-[#5B6B62]">{translate({ fr: "Simple et rapide — remplissez, le prix s'affiche en direct.", en: "Simple and fast — fill in, the price updates live." })}</p>
            </div>
            <button
              onClick={() => { if (isAuthenticated) { setCurrentPage("commandes"); window.location.hash = "commandes"; } else { setCurrentPage("connexion"); window.location.hash = "connexion"; } }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[#0B1F14] ring-1 ring-[#D7E0DA] hover:bg-[#F4F8F5] transition-colors self-start"
            >
              <Compass size={15} style={{ color: GREEN }} /> {translate({ fr: "Mes réservations", en: "My bookings" })}
            </button>
          </div>

          {/* 1 · Trajet */}
          <section className={sectionCls}>
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[#06140D]" style={{ background: GREEN }}>1</span>
              <h2 className="text-lg font-bold">{translate({ fr: "Votre trajet", en: "Your ride" })}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5B6B62] uppercase tracking-wide">{translate({ fr: "Date de départ", en: "Departure date" })}</label>
                <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5B6B62] uppercase tracking-wide">{translate({ fr: "Heure de départ", en: "Departure time" })}</label>
                <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="mt-4 space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#5B6B62] uppercase tracking-wide flex items-center gap-1.5"><MapPin size={13} style={{ color: GREEN }} /> {translate({ fr: "Lieu de prise en charge (facultatif)", en: "Pickup point (optional)" })}</label>
                <button type="button" onClick={() => setShowMapModal(true)} className="text-xs font-semibold inline-flex items-center gap-1 hover:underline" style={{ color: GREEN }}><Map size={12} /> {translate({ fr: "Carte", en: "Map" })}</button>
              </div>
              <input type="text" value={pickup}
                onFocus={() => setShowPickupList(true)} onBlur={() => setTimeout(() => setShowPickupList(false), 250)}
                onChange={(e) => { setPickup(e.target.value); setShowPickupList(true); }}
                placeholder={translate({ fr: "Ex : Plateau, Aéroport, Cocody…", en: "e.g., Plateau, Airport, Cocody…" })} className={inputCls} />
              {showPickupList && pickupSuggestions.length > 0 && (
                <div className="absolute z-30 w-full bg-white border border-[#E6EBE8] rounded-xl mt-1 max-h-52 overflow-y-auto shadow-xl divide-y divide-[#F0F3F1]">
                  {pickupSuggestions.map((loc) => (
                    <div key={loc.name} onClick={() => handlePickupSelect(loc)} className="p-3 text-sm text-[#0B1F14] hover:bg-[#F4F8F5] cursor-pointer flex items-center gap-2"><MapPin size={12} style={{ color: GREEN }} /><span>{loc.name}</span></div>
                  ))}
                </div>
              )}
              <MapSelectorModal isOpen={showMapModal} onClose={() => setShowMapModal(false)} onSelectAddress={(address) => setPickup(address)} />
            </div>

            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-semibold text-[#5B6B62] uppercase tracking-wide"><span style={{ color: GREEN }}>*</span> {translate({ fr: "Numéro de téléphone (obligatoire)", en: "Phone number (required)" })}</label>
              <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder={translate({ fr: "Ex : 01 70 08 36 81", en: "e.g., 01 70 08 36 81" })} className={inputCls} />
            </div>
          </section>

          {/* 2 · Formule & options */}
          <section className={sectionCls}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[#06140D]" style={{ background: GREEN }}>2</span>
              <h2 className="text-lg font-bold">{translate({ fr: "Véhicule & formule", en: "Vehicle & package" })}</h2>
            </div>

            {/* Choix du véhicule (compact) */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-[#5B6B62] uppercase tracking-wide mb-2 block">{translate({ fr: "Véhicule", en: "Vehicle" })}</label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {([
                  { tag: "N1", name: { fr: "Berline", en: "Sedan" }, price: "dès 10 000 FCFA", bg: "#00C853" },
                  { tag: "N2", name: { fr: "SUV Executive", en: "Executive SUV" }, price: "dès 15 000 FCFA", bg: "#FF7A1A" },
                  { tag: "N3", name: { fr: "Prestige", en: "Prestige" }, price: translate({ fr: "Sur devis", en: "On quote" }), bg: "#F5A200" },
                ] as const).map((v) => {
                  const active = selectedVehicle === v.tag;
                  return (
                    <button key={v.tag} type="button" onClick={() => setSelectedVehicle(v.tag)}
                      className={`relative rounded-2xl p-3 text-center transition-all ${active ? "ring-4 shadow-md -translate-y-0.5" : "ring-1 ring-black/5 hover:-translate-y-0.5"}`}
                      style={{ background: v.bg, color: "#06140D", ...(active ? { ["--tw-ring-color" as any]: "#0B1F14" } : {}) }}>
                      <Car size={20} className="mx-auto" />
                      <div className="mt-1.5 text-sm font-extrabold leading-tight">{translate(v.name)}</div>
                      <div className="text-[11px] font-semibold" style={{ opacity: 0.65 }}>{v.tag}</div>
                      <div className="mt-1 text-xs font-bold" style={{ opacity: 0.9 }}>{v.price}</div>
                      {active && <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white"><Check size={12} className="text-[#0B1F14]" /></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formule : menu déroulant */}
            <label className="text-xs font-semibold text-[#5B6B62] uppercase tracking-wide mb-2 block">{translate({ fr: "Formule", en: "Package" })}</label>
            <div className="relative">
              <select
                value={selectedFormulaId ?? ""}
                onChange={(e) => { const f = FORMULAS.find((x) => x.id === e.target.value); if (f) { setSelectedFormulaId(f.id); setFormula(f.formula); setDurationHours(f.durationHours); } }}
                className={`${inputCls} appearance-none pr-10 cursor-pointer`}
              >
                <option value="" disabled>{translate({ fr: "Choisissez une formule…", en: "Choose a package…" })}</option>
                {FORMULAS.map((f) => {
                  const price = selectedVehicle === "N3" ? translate({ fr: "Sur devis", en: "On quote" }) : PRICE_MAP[f.id]?.[selectedVehicle as "N1" | "N2"] || "";
                  return <option key={f.id} value={f.id}>{f.duration}{price ? ` — ${price}` : ""}</option>;
                })}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6B62]" />
            </div>

            {/* Détail de la formule choisie */}
            {selectedFormulaId && (() => {
              const f = FORMULAS.find((x) => x.id === selectedFormulaId);
              if (!f) return null;
              const price = selectedVehicle === "N3" ? translate({ fr: "Sur devis", en: "On quote" }) : PRICE_MAP[f.id]?.[selectedVehicle as "N1" | "N2"] || "—";
              return (
                <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-[#F4F8F5] ring-1 ring-[#E6EBE8] p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white ring-1 ring-[#E6EBE8] px-3 py-1 text-sm font-bold"><Clock size={14} style={{ color: GREEN }} /> {f.duration}</span>
                  <div className="text-2xl font-extrabold shrink-0">{price}</div>
                </div>
              );
            })()}

            {/* Options (facultatif) */}
            <div className="mt-6 pt-5 border-t border-[#EEF2EF]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">{translate({ fr: "Options", en: "Options" })}</h3>
                <span className="text-xs text-[#5B6B62]">{translate({ fr: "facultatif", en: "optional" })}</span>
              </div>

              {(priceResult?.isNight || priceResult?.isWeekend) && (
                <div className="space-y-2 mb-3">
                  {priceResult?.isNight && <div className="rounded-xl bg-[rgba(255,122,26,0.08)] ring-1 ring-[rgba(255,122,26,0.2)] p-3 text-xs text-[#0B1F14] flex items-center gap-2"><Clock size={14} className="text-[#C85A00]" /> {translate({ fr: `Service de nuit détecté (${departureTime}) — +20%`, en: `Night service detected (${departureTime}) — +20%` })}</div>}
                  {priceResult?.isWeekend && <div className="rounded-xl bg-[rgba(255,122,26,0.08)] ring-1 ring-[rgba(255,122,26,0.2)] p-3 text-xs text-[#0B1F14] flex items-center gap-2"><Calendar size={14} className="text-[#C85A00]" /> {translate({ fr: "Week-end / jour férié détecté — +20%", en: "Weekend / holiday detected — +20%" })}</div>}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setIsBilingual(!isBilingual)}
                  className={`text-left rounded-2xl p-4 ring-1 transition-all flex items-start justify-between gap-3 ${isBilingual ? "ring-2 bg-[#F4F8F5]" : "ring-[#E6EBE8] hover:ring-[#C9D6CE]"}`}
                  style={isBilingual ? { ["--tw-ring-color" as any]: GREEN } : undefined}>
                  <div><h4 className="font-bold text-sm flex items-center gap-2"><Globe size={15} style={{ color: GREEN }} /> {translate({ fr: "Chauffeur bilingue (+15%)", en: "Bilingual chauffeur (+15%)" })}</h4><p className="text-xs text-[#5B6B62] mt-1.5">{translate({ fr: "Français & anglais des affaires.", en: "Business French & English." })}</p></div>
                  <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${isBilingual ? "border-transparent text-[#06140D]" : "border-[#C9D6CE]"}`} style={isBilingual ? { background: GREEN } : undefined}>{isBilingual && <Check size={12} />}</span>
                </button>
                <button type="button" onClick={() => setIsAirportGreeting(!isAirportGreeting)}
                  className={`text-left rounded-2xl p-4 ring-1 transition-all flex items-start justify-between gap-3 ${isAirportGreeting ? "ring-2 bg-[#F4F8F5]" : "ring-[#E6EBE8] hover:ring-[#C9D6CE]"}`}
                  style={isAirportGreeting ? { ["--tw-ring-color" as any]: GREEN } : undefined}>
                  <div><h4 className="font-bold text-sm flex items-center gap-2"><UserCheck size={15} style={{ color: GREEN }} /> {translate({ fr: "Accueil aéroport (+5 000 FCFA)", en: "Airport greeting (+5,000 FCFA)" })}</h4><p className="text-xs text-[#5B6B62] mt-1.5">{translate({ fr: "Accueil avec pancarte à votre nom.", en: "Meet & greet with a name sign." })}</p></div>
                  <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${isAirportGreeting ? "border-transparent text-[#06140D]" : "border-[#C9D6CE]"}`} style={isAirportGreeting ? { background: GREEN } : undefined}>{isAirportGreeting && <Check size={12} />}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Total + Terminer → écran de confirmation */}
          <div className="space-y-3">
            {priceResult && selectedVehicle && selectedFormulaId && (
              <div className="flex items-center justify-between rounded-2xl bg-[#F4F8F5] ring-1 ring-[#E6EBE8] px-5 py-3">
                <span className="text-sm font-semibold text-[#5B6B62]">{translate({ fr: "Total estimé", en: "Estimated total" })}</span>
                <span className="text-xl font-extrabold">{selectedVehicle === "N3" ? translate({ fr: "Sur devis", en: "On quote" }) : priceResult.totalPrice ? `${priceResult.totalPrice.toLocaleString()} FCFA` : "—"}</span>
              </div>
            )}
            <button onClick={goToRecap} disabled={!canConfirm}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-extrabold text-[#06140D] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
              style={{ background: GREEN }}>
              {translate({ fr: "Terminer", en: "Finish" })} <ArrowRight size={16} />
            </button>
            {!canConfirm && <p className="text-center text-xs text-[#5B6B62]">{translate({ fr: "Complétez le trajet, le véhicule et la formule pour continuer.", en: "Complete the ride, vehicle and package to continue." })}</p>}
          </div>

          {/* Support */}
          <div className="rounded-3xl bg-white ring-1 ring-[#E6EBE8] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(0,200,83,0.12)", color: GREEN }}><HelpCircle size={16} /></span><h4 className="text-sm font-bold">{translate({ fr: "Besoin d'aide ?", en: "Need help?" })}</h4></div>
            <p className="text-xs text-[#5B6B62] mb-4">{translate({ fr: "Notre équipe peut enregistrer votre réservation ou répondre à vos questions.", en: "Our team can register your booking or answer your questions." })}</p>
            <div className="space-y-2.5">
              <a href="https://wa.me/2250797139787?text=Bonjour,%20j'ai%20besoin%20d'aide%20pour%20ma%20r%C3%A9servation%20sur%20Easy" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl bg-[#00C853]/10 ring-1 ring-[#00C853]/25 p-3 text-sm hover:bg-[#00C853]/15 transition-colors">
                <span className="font-bold inline-flex items-center gap-2"><MessageCircle size={14} style={{ color: GREEN }} /> 07 97 13 97 87</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-[#06140D]" style={{ background: GREEN }}>WhatsApp</span>
              </a>
              <a href="tel:+2250170083681" className="flex items-center justify-between rounded-xl bg-[#F4F8F5] ring-1 ring-[#E6EBE8] p-3 text-sm hover:bg-[#EEF4F0] transition-colors">
                <span className="font-bold inline-flex items-center gap-2"><Phone size={14} style={{ color: GREEN }} /> 01 70 08 36 81</span>
                <span className="rounded-full bg-[#E6EBE8] px-2 py-0.5 text-[10px] font-extrabold text-[#5B6B62]">{translate({ fr: "Appel", en: "Call" })}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== BARRE RÉSUMÉ COLLANTE (mobile) ===================== */}
      {priceResult && selectedVehicle && selectedFormulaId && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E6EBE8] px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#5B6B62]">{translate({ fr: "Total estimé", en: "Estimated total" })}</div>
            <div className="text-lg font-extrabold">{selectedVehicle === "N3" ? translate({ fr: "Sur devis", en: "On quote" }) : priceResult.totalPrice ? `${priceResult.totalPrice.toLocaleString()} FCFA` : "—"}</div>
          </div>
          <button onClick={goToRecap} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-[#06140D]" style={{ background: GREEN }}>
            {translate({ fr: "Terminer", en: "Finish" })} <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ===================== MODALE RÉCAP (animée) ===================== */}
      <AnimatePresence>
        {showRecap && (
          <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="absolute inset-0 bg-[#0B1F14]/30 backdrop-blur-md" onClick={() => { if (!isConfirming) setShowRecap(false); }} />
            <motion.div
              className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 text-[#0B1F14] ring-1 ring-white/60 shadow-2xl max-h-[92vh] overflow-y-auto bg-white/75 backdrop-blur-2xl backdrop-saturate-150"
              initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <AnimatePresence mode="wait">
                {bookingSuccess ? (
                  <motion.div key="success" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }} className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5" style={{ background: GREEN }}>
                      <Check size={32} className="text-[#06140D]" />
                    </motion.div>
                    <span className="text-[11px] font-semibold tracking-widest uppercase block mb-2" style={{ color: GREEN }}>{translate({ fr: "DEMANDE ENREGISTRÉE", en: "REQUEST SAVED" })}</span>
                    <h3 className="text-2xl font-extrabold tracking-tight mb-4">{translate({ fr: "Vérifiez vos e-mails", en: "Check your email" })}</h3>
                    <div className="rounded-2xl bg-white/50 ring-1 ring-black/5 p-5 text-sm text-[#5B6B62] leading-relaxed">
                      {translate({ fr: "Un e-mail de confirmation avec le récapitulatif complet, l'estimation tarifaire et les prochaines étapes vient de vous être envoyé.", en: "A confirmation email with the full summary, price estimate and next steps has just been sent to you." })}
                      {finalBookingData?.reservation?.id && <div className="text-xs text-[#9BA8A0] mt-3 font-semibold">{translate({ fr: "Réf. : ", en: "Ref: " })}{finalBookingData.reservation.id}</div>}
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button onClick={() => { setCurrentPage("commandes"); window.location.hash = "commandes"; }} className="w-full rounded-full px-5 py-3.5 text-sm font-bold text-[#06140D]" style={{ background: GREEN }}>{translate({ fr: "Voir mes commandes", en: "View my orders" })}</button>
                      <button onClick={() => { setShowRecap(false); setBookingSuccess(false); setFinalBookingData(null); setPickup(""); }} className="w-full rounded-full px-5 py-3.5 text-sm font-semibold text-[#0B1F14] ring-1 ring-[#D7E0DA] bg-white/50 hover:bg-white transition-colors">{translate({ fr: "Nouvelle réservation", en: "New booking" })}</button>
                    </div>
                  </motion.div>
                ) : isConfirming ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center">
                    <div className="mx-auto mb-5 h-14 w-14 rounded-full border-4 border-[#00C853]/20 border-t-[#00C853] animate-spin" />
                    <h3 className="text-lg font-bold">{translate({ fr: "Confirmation en cours…", en: "Confirming…" })}</h3>
                    <p className="text-sm text-[#5B6B62] mt-1">{translate({ fr: "Nous enregistrons votre réservation.", en: "We're saving your booking." })}</p>
                  </motion.div>
                ) : (
                  <motion.div key="recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="text-xs font-semibold tracking-wide" style={{ color: GREEN }}>{translate({ fr: "DERNIÈRE ÉTAPE", en: "LAST STEP" })}</span>
                        <h3 className="text-xl font-extrabold tracking-tight">{translate({ fr: "Confirmez votre réservation", en: "Confirm your booking" })}</h3>
                      </div>
                      <button onClick={() => setShowRecap(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors"><X size={18} className="text-[#0B1F14]" /></button>
                    </div>

                    <div className="rounded-2xl bg-white/50 ring-1 ring-black/5 divide-y divide-black/5 text-sm">
                      <div className="flex items-center gap-3 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 ring-1 ring-black/5" style={{ color: GREEN }}><MapPin size={15} /></span><div><div className="text-[11px] uppercase tracking-wider text-[#5B6B62]">{translate({ fr: "Trajet", en: "Route" })}</div><div className="font-semibold">{pickup || translate({ fr: "Prise en charge à préciser", en: "Pickup to confirm" })} → {destination}</div></div></div>
                      <div className="flex items-center gap-3 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 ring-1 ring-black/5" style={{ color: GREEN }}><Calendar size={15} /></span><div><div className="text-[11px] uppercase tracking-wider text-[#5B6B62]">{translate({ fr: "Départ", en: "Departure" })}</div><div className="font-semibold">{departureDate} · {departureTime}</div></div></div>
                      <div className="flex items-center gap-3 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 ring-1 ring-black/5" style={{ color: GREEN }}><Car size={15} /></span><div><div className="text-[11px] uppercase tracking-wider text-[#5B6B62]">{translate({ fr: "Véhicule & formule", en: "Vehicle & package" })}</div><div className="font-semibold">{selectedVehicle ? (selectedVehicle === "N1" ? "Berline (N1)" : selectedVehicle === "N2" ? "SUV Exec (N2)" : "Prestige (N3)") : "—"}{selectedFormulaId ? ` · ${translate(FORMULAS.find((f) => f.id === selectedFormulaId)!.name)}` : ""}</div></div></div>
                      <div className="flex items-center gap-3 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 ring-1 ring-black/5" style={{ color: GREEN }}><Phone size={15} /></span><div><div className="text-[11px] uppercase tracking-wider text-[#5B6B62]">{translate({ fr: "Téléphone", en: "Phone" })}</div><div className="font-semibold">{phoneNumber}</div></div></div>
                      <div className="flex items-center justify-between p-4"><span className="text-[11px] uppercase tracking-wider text-[#5B6B62]">{translate({ fr: "Total estimé", en: "Estimated total" })}</span><span className="text-2xl font-extrabold">{selectedVehicle === "N3" ? translate({ fr: "Sur devis", en: "On quote" }) : priceResult?.totalPrice ? `${priceResult.totalPrice.toLocaleString()} FCFA` : "—"}</span></div>
                    </div>

                    {(isBilingual || isAirportGreeting) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {isBilingual && <span className="rounded-full bg-black/[0.06] ring-1 ring-black/5 px-3 py-1 text-xs font-medium">{translate({ fr: "Chauffeur bilingue", en: "Bilingual chauffeur" })}</span>}
                        {isAirportGreeting && <span className="rounded-full bg-black/[0.06] ring-1 ring-black/5 px-3 py-1 text-xs font-medium">{translate({ fr: "Accueil aéroport", en: "Airport greeting" })}</span>}
                      </div>
                    )}

                    {!isAuthenticated && (
                      <div onClick={() => setCurrentPage("connexion")} className="mt-4 rounded-xl ring-1 ring-red-200 bg-red-50 p-3 flex items-center gap-2 cursor-pointer">
                        <AlertCircle size={16} className="text-red-500 shrink-0" />
                        <p className="text-xs text-red-600">{translate({ fr: "Connectez-vous à votre espace pour confirmer votre réservation.", en: "Log in to your account to confirm your booking." })}</p>
                      </div>
                    )}

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button onClick={() => setShowRecap(false)} className="w-full sm:w-auto rounded-full px-6 py-3.5 text-sm font-semibold text-[#0B1F14] ring-1 ring-[#D7E0DA] bg-white/50 hover:bg-white transition-colors">
                        {translate({ fr: "Modifier", en: "Edit" })}
                      </button>
                      <button onClick={handleConfirmReservation} disabled={calcLoading || !canConfirm}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-extrabold text-[#06140D] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
                        style={{ background: GREEN }}>
                        {isAuthenticated ? translate({ fr: "Confirmer", en: "Confirm" }) : translate({ fr: "Se connecter", en: "Log in" })}
                        <Check size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MyBookingsModal isOpen={showBookingsModal} onClose={() => setShowBookingsModal(false)} setCurrentPage={setCurrentPage} />
    </div>
  );
};
