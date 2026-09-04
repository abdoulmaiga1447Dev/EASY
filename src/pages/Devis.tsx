import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useSegment } from "../context/SegmentContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { 
  FileText, Calendar, Clock, MapPin, User, Users, Sparkles, 
  Check, X, FilePlus, ShieldAlert, ChevronRight, UserCheck, Phone, RefreshCw, Layers
} from "lucide-react";

const getVehicleLabel = (id: string) => {
  const normalized = id.toLowerCase();
  if (normalized.includes("berline")) return "Berline";
  if (normalized.includes("n3") || normalized.includes("prestige")) return "SUV Prestige";
  if (normalized.includes("n2") || normalized.includes("executive")) return "SUV Executive";
  return "Berline";
};

interface DevisProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

export const Devis: React.FC<DevisProps> = ({ setCurrentPage, id }) => {
  const { t, translate } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { segment } = useSegment();

  // Selected view level: 'create' | 'list' | 'detail' | 'admin'
  const [activeTab, setActiveTab] = useState<"create" | "list" | "admin">("create");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  // Devis form details
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("09:00");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [durationHours, setDurationHours] = useState("4");
  const [guests, setGuests] = useState("2");
  const [specificNeeds, setSpecificNeeds] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dynamic lists from database
  const [quotesList, setQuotesList] = useState<any[]>([]);
  const [reservationsList, setReservationsList] = useState<any[]>([]);
  const [driversList, setDriversList] = useState<any[]>([]);
  const [activeQuoteDetail, setActiveQuoteDetail] = useState<any | null>(null);
  
  // Admin form state for inputting price
  const [adminPriceInput, setAdminPriceInput] = useState<string>("");
  const [adminPriceLoad, setAdminPriceLoad] = useState(false);

  // Manual Driver assignment form state
  const [selectedDrivers, setSelectedDrivers] = useState<{ [resId: string]: string }>({});

  // Refresh lists
  const refreshDatabase = async () => {
    const token = localStorage.getItem("ev_access_token");
    if (!token) return;

    try {
      // Get Quotes
      const qRes = await fetch("/api/quotes", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuotesList(qData.quotes || []);
      }

      // If Admin, load all reservations & drivers
      if (user?.role === "admin") {
        const rRes = await fetch("/api/reservations", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (rRes.ok) {
          const rData = await rRes.json();
          setReservationsList(rData.reservations || []);
        }

        const dRes = await fetch("/api/drivers", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (dRes.ok) {
          const dData = await dRes.json();
          setDriversList(dData.drivers || []);
        }
      }
    } catch (e) {
      console.error("Failed to load backend DB tables:", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshDatabase();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDepartureDate(tomorrow.toISOString().split("T")[0]);
    }
  }, [isAuthenticated, user]);

  // Load single quote details dynamically if selected
  useEffect(() => {
    if (!selectedQuoteId) {
      setActiveQuoteDetail(null);
      return;
    }
    const token = localStorage.getItem("ev_access_token");
    if (!token) return;

    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/quotes/${selectedQuoteId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setActiveQuoteDetail(data.quote);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchDetail();
  }, [selectedQuoteId]);

  // Handle quote request submission
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setCurrentPage("connexion");
      return;
    }

    if (!departureDate || !departureTime || !pickup || !destination) {
      setFeedbackMsg({ type: "error", text: "Veuillez remplir les adresses et horaires de départ." });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const token = localStorage.getItem("ev_access_token");
      const savedVehicleId = localStorage.getItem("ev_selected_vehicle_id");
      const chosenVehicle = savedVehicleId && savedVehicleId.includes("n3") ? savedVehicleId : "v_suv_n3_a";

      const body = {
        vehicleId: chosenVehicle, // Pre-selected premium vehicle ID
        details: {
          departureDate,
          departureTime,
          pickup,
          destination,
          durationHours,
          guests,
          specificNeeds
        }
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        setFeedbackMsg({
          type: "success",
          text: data.message?.fr || "Votre demande de devis prestige a bien été transmise à notre cellule d'analyse."
        });
        // Clear Form fields
        setPickup("");
        setDestination("");
        setSpecificNeeds("");
        // Refresh database and redirect tab
        refreshDatabase();
        setTimeout(() => {
          setActiveTab("list");
          setFeedbackMsg(null);
        }, 3000);
      } else {
        const errData = await res.json();
        setFeedbackMsg({ type: "error", text: errData.error || "Une erreur est survenue." });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: "Échec de connexion avec les services d'Abidjan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client actions: Accept Devis
  const handleAcceptQuote = async (quoteId: string) => {
    const token = localStorage.getItem("ev_access_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Devis accepté ! Une réservation de prestige a de suite été créée pour vous.");
        setSelectedQuoteId(null);
        refreshDatabase();
      } else {
        const data = await res.json();
        alert(data.error || "Impossible d'accepter le devis.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Client actions: Refuse Devis
  const handleRefuseQuote = async (quoteId: string) => {
    const token = localStorage.getItem("ev_access_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/quotes/${quoteId}/refuse`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Le devis a été décliné.");
        setSelectedQuoteId(null);
        refreshDatabase();
      } else {
        const data = await res.json();
        alert(data.error || "Impossible d'annuler le devis.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin actions: Input Price for Quote
  const handleAdminSubmitPrice = async (quoteId: string) => {
    const token = localStorage.getItem("ev_access_token");
    if (!token || !adminPriceInput) return;

    setAdminPriceLoad(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/price`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ adminPrice: parseFloat(adminPriceInput) })
      });

      if (res.ok) {
        alert("Tarification envoyée au client d'Abidjan ! Status mis à jour.");
        setAdminPriceInput("");
        setSelectedQuoteId(null);
        refreshDatabase();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur de transmission d'offre tarifaire.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdminPriceLoad(false);
    }
  };

  // Admin actions: Dispatch Driver (Task 4 Manual Assignment)
  const handleAdminAssignDriver = async (resId: string) => {
    const token = localStorage.getItem("ev_access_token");
    const driverId = selectedDrivers[resId];
    if (!token || !driverId) {
      alert("Veuillez sélectionner un chauffeur.");
      return;
    }

    try {
      const res = await fetch(`/api/reservations/${resId}/assign-driver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ driverId })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Succès d'affectation : ${data.driverName} est désormais affecté à cette course !`);
        refreshDatabase();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur d'affectation manuelle de chauffeur.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id={id} className="min-h-screen bg-dark py-12 px-4 md:px-8">
      
      {/* Page Title Header banner */}
      <div className="max-w-6xl mx-auto mb-10 text-center space-y-3">
        <span className="text-[10px] font-mono tracking-widest text-[#00C853] uppercase font-bold bg-[#00C853]/10 px-3 py-1.5 rounded-full border border-[#00C853]/20">
          STUDIO DEVIS PRESTIGE SUV N3
        </span>
        <h1 className="text-3xl md:text-5xl font-sans font-bold text-white-premium tracking-tight">
          {translate({ fr: "Service Sur-Mesure Diplomatique", en: "Bespoke Diplomatic Logistics Council" })}
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl mx-auto font-sans">
          {translate({ 
            fr: "Formulez vos demandes d'itinéraire officiel et bénéficiez d'une étude d'élite sous protocole sécurisé complet sous 15 minutes.",
            en: "Request custom travel schemes for VIP delegates, featuring HEPA vehicle protections and real time escort tracking."
          })}
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        
        {/* Navigation Tabs bar inside Devis */}
        {isAuthenticated && (
          <div className="flex flex-wrap gap-2 mb-8 bg-[#0E0E14] p-2 rounded-xl border border-white-premium/5 inline-flex">
            <button
              onClick={() => { setActiveTab("create"); setSelectedQuoteId(null); }}
              className={`px-4 py-2 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "create" && !selectedQuoteId ? "bg-dark text-[#00C853] border border-[#00C853]/25 font-bold" : "text-neutral-400 hover:text-white-premium"
              }`}
            >
              <FilePlus size={14} />
              Demander un Devis
            </button>
            <button
              onClick={() => { setActiveTab("list"); setSelectedQuoteId(null); }}
              className={`px-4 py-2 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 relative ${
                activeTab === "list" && !selectedQuoteId ? "bg-dark text-[#00C853] border border-[#00C853]/25 font-bold" : "text-neutral-400 hover:text-white-premium"
              }`}
            >
              <FileText size={14} />
              Mes Demandes ({quotesList.length})
            </button>
            
            {/* Secret Back-office switch if admin */}
            {user?.role === "admin" && (
              <button
                onClick={() => { setActiveTab("admin"); setSelectedQuoteId(null); }}
                className={`px-4 py-2 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 border border-red-500/30 bg-transparent ${
                  activeTab === "admin" ? "text-red-400 border-red-500/50 font-bold" : "text-red-300 hover:text-white-premium"
                }`}
              >
                <Layers size={14} />
                ADMIN BACK-OFFICE
              </button>
            )}
          </div>
        )}

        {/* Content switch */}

        {/* 1. NOT AUTHENTICATED FALLBACK */}
        {!isAuthenticated && (
          <div className="max-w-md mx-auto">
            <Card id="devis_unauth_premium_card" className="p-8 border border-white-premium/5 bg-[#0E0E14] text-center space-y-6">
              <div className="w-16 h-16 bg-transparent border border-white/10 text-gold rounded-full mx-auto flex items-center justify-center">
                <ShieldAlert size={30} />
              </div>
              <h3 className="text-lg font-bold text-white-premium">Espace Protocole Sécurisé</h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                {translate({ 
                  fr: "L'accès au formulaire de devis pour la flotte N3 requiert une authentification préalable de votre entreprise pour garantir un suivi d'élite.",
                  en: "Access to N3 class vehicles is restricted. Please sign in to verify your diplomatic or corporate account."
                })}
              </p>
              <Button 
                id="unauth_devis_login_btn"
                className="w-full bg-[#00C853] hover:bg-[#00ab47] text-black font-extrabold"
                onClick={() => setCurrentPage("connexion")}
              >
                {translate({ fr: "Se Connecter", en: "Log In to Account" })}
              </Button>
            </Card>
          </div>
        )}

        {/* 2. MAIN FORM: Create Devis */}
        {isAuthenticated && activeTab === "create" && !selectedQuoteId && (
          user?.role === "corporate" ? (
            <div className="max-w-xl mx-auto w-full">
              <Card id="devis_corp_redirect_card" className="p-8 border border-gold/20 bg-[#0E0E14] text-center space-y-6">
                <div className="w-16 h-16 bg-transparent border border-white/10 text-gold rounded-full mx-auto flex items-center justify-center">
                  <Sparkles size={30} className="text-gold" />
                </div>
                <h3 className="text-xl font-bold text-white-premium font-sans">Espace Privilège Corporate Actif</h3>
                <p className="text-sm text-neutral-400 font-sans leading-relaxed">
                  {translate({ 
                    fr: "En tant que compte Professionnel / Corporate, vous bénéficiez de votre propre espace privilégié 'Espace Corporate' pour toutes vos réservations de notre flotte complète (Berline, SUV Executive, SUV Prestige) avec tarifs professionnels et facturation mensuelle différée. Veuillez utiliser l'Espace Corporate pour effectuer vos réservations ou devis.",
                    en: "As a Corporate partner, you have access to your own private Corporate Space for booking all categories of vehicles (Berline, SUV Executive, SUV Prestige) with deferred monthly billing."
                  })}
                </p>
                <div className="pt-2">
                  <Button 
                    id="corp_redirect_devis_btn"
                    className="bg-gold hover:bg-gold-light text-black font-extrabold px-6 animate-pulse"
                    onClick={() => setCurrentPage("corporate")}
                  >
                    {translate({ fr: "Accéder à l'Espace Corporate ✦", en: "Go to Corporate Space ✦" })}
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <div>
              {/* Alert message for SUV unavailability */}
              <div className="mb-8 p-6 bg-transparent border border-red-900/50 rounded-2xl text-center max-w-4xl mx-auto">
                <p className="text-sm font-semibold text-red-500 uppercase tracking-widest flex items-center justify-center gap-2">
                  ⚠️ {translate({ fr: "Service SUV Prestige Indisponible actuellement", en: "SUV Prestige Service Currently Unavailable" })}
                </p>
                <p className="text-xs text-neutral-400 mt-2">
                  {translate({ 
                    fr: "La gamme SUV n'est pas encore disponible à la réservation à Abidjan. Par conséquent, les demandes de devis sur-mesure pour SUV Prestige N3 sont temporairement suspendues. Veuillez utiliser notre flotte de Berlines Premium.", 
                    en: "The SUV fleet is not yet available for reservation in Abidjan. Therefore, bespoke quote requests for SUV Prestige N3 are temporarily suspended. Please utilize our Premium Sedans." 
                  })}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start opacity-35 grayscale pointer-events-none select-none">
              
                {/* Core Form card */}
                <div className="lg:col-span-8">
                  <Card id="devis_new_request_form_card" className="p-6 md:p-8 border border-white-premium/5 bg-[#0E0E14]">
                    <h3 className="text-lg font-bold text-white-premium pb-4 border-b border-white-premium/5 mb-6 flex items-center gap-2">
                      <Sparkles className="text-gold" size={18} />
                      {translate({ fr: "Formulaire Devis SUV Prestige N3", en: "SUV Prestige N3 Bespoke Request Form" })}
                    </h3>

                    {feedbackMsg && (
                      <div className={`p-4 rounded-xl mb-6 text-xs text-center border ${
                        feedbackMsg.type === "success" 
                          ? "bg-transparent border-emerald-500/30 text-emerald-400" 
                          : "bg-transparent border-red-500/30 text-red-400"
                      }`}>
                        {feedbackMsg.text}
                      </div>
                    )}

                    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                      
                      {/* Step 1 Date Time */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Date de départ</label>
                          <input 
                            type="date" 
                            value={departureDate}
                            onChange={(e) => setDepartureDate(e.target.value)}
                            className="w-full bg-dark border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium font-mono"
                            required
                            disabled
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Heure de départ</label>
                          <input 
                            type="time" 
                            value={departureTime}
                            onChange={(e) => setDepartureTime(e.target.value)}
                            className="w-full bg-dark border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium font-mono"
                            required
                            disabled
                          />
                        </div>
                      </div>

                      {/* Locations */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Adresse exacte de départ (Abidjan)</label>
                          <input 
                            type="text" 
                            value={pickup}
                            onChange={(e) => setPickup(e.target.value)}
                            placeholder="Ex: Ambassade de France, Plateau"
                            className="w-full bg-dark border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium"
                            required
                            disabled
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Adresse exacte de destination</label>
                          <input 
                            type="text" 
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="Ex: Sofitel Hôtel Ivoire, Cocody"
                            className="w-full bg-dark border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium"
                            required
                            disabled
                          />
                        </div>
                      </div>

                      {/* Duration & Guests */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Durée estimée de mise à disposition (Heures)</label>
                          <select 
                            value={durationHours}
                            onChange={(e) => setDurationHours(e.target.value)}
                            className="w-full bg-dark border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium font-mono"
                            disabled
                          >
                            <option value="4">4 Heures</option>
                            <option value="8">Demi-journée (8h)</option>
                            <option value="12">12 Heures</option>
                            <option value="16">Journée complète (16h)</option>
                            <option value="24">24 Heures</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Nombre de passagers</label>
                          <select 
                            value={guests}
                            onChange={(e) => setGuests(e.target.value)}
                            className="w-full bg-dark border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium font-mono"
                            disabled
                          >
                            <option value="1">1 Personne</option>
                            <option value="2">2 Personnes</option>
                            <option value="3">3 Personnes</option>
                            <option value="4">4 Personnes (Max)</option>
                          </select>
                        </div>
                      </div>

                      {/* Specific Needs text */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Besoins spécifiques & Services protocolaires</label>
                        <textarea 
                          value={specificNeeds}
                          onChange={(e) => setSpecificNeeds(e.target.value)}
                          placeholder="Indiquez vos exigences (Wi-Fi crypté, accueil VIP tapis rouge, Chauffeur d'élite bilingue, boissons d'exception...)"
                          rows={4}
                          className="w-full bg-dark border border-white-premium/10 rounded-lg p-3 text-sm text-white-premium focus:outline-none"
                          disabled
                        />
                      </div>

                      {/* Submission Button */}
                      <Button 
                        id="submit_devis_form_btn"
                        type="button" 
                        disabled={true}
                        className="w-full bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700 flex items-center justify-center gap-2"
                      >
                        {translate({ fr: "Indisponible actuellement", en: "Currently Unavailable" })}
                      </Button>

                    </form>
                  </Card>
                </div>

                {/* Right details explanation sidebar */}
                <div className="lg:col-span-4 space-y-6">
                  <Card id="devis_details_sidebar_card" className="p-6 border border-white-premium/5 bg-[#12121A] rounded-xl text-xs space-y-4">
                    <span className="text-[9px] tracking-widest text-red-500 font-mono uppercase block font-bold">NON DISPONIBLE</span>
                    <h4 className="text-sm font-bold text-white-premium font-sans">Pourquoi un devis pour la SUV Prestige N3 ?</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      Le SUV Prestige N3 est un véhicule d'exception. Afin de garantir un confort absolu et une discrétion absolue, nos chargés de dispatch étudient minutieusement votre plan d'itinéraire pour formuler un plan tarifaire d'élite sur-mesure.
                    </p>
                    <div className="border-t border-white-premium/5 pt-4 space-y-2 mt-2 font-mono text-[10px] text-neutral-400">
                      <p>🔹 Service d'étude : Gratuit.</p>
                      <p>🔹 Temps de réponse moyen : 15 min.</p>
                      <p>🔹 Validation réglementaire instantanée.</p>
                    </div>
                  </Card>
                </div>

              </div>
            </div>
          )
        )}

        {/* 3. CLIENT LIST OF QUOTES */}
        {isAuthenticated && activeTab === "list" && !selectedQuoteId && (
          <div className="space-y-6">
            <Card id="devis_client_list_card" className="p-6 border border-white-premium/5 bg-[#0E0E14]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white-premium font-sans">Suivi de vos demandes d'étude</h3>
                  <p className="text-xs text-neutral-400 mt-1">Consultez et validez en temps réel vos devis prestige.</p>
                </div>
                <button 
                  onClick={refreshDatabase} 
                  className="p-2 border border-white-premium/10 rounded-lg text-neutral-400 hover:text-white-premium transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {quotesList.length === 0 ? (
                <div className="text-center py-16 text-neutral-500 font-mono text-xs">
                  Aucune demande de devis en cours d'étude pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white-premium/5 text-neutral-500 font-mono uppercase text-[9px] tracking-wider">
                        <th className="py-4 px-2">ID</th>
                        <th className="py-4">Départ</th>
                        <th className="py-4">Destination</th>
                        <th className="py-4">Date de départ</th>
                        <th className="py-4 text-center">Status</th>
                        <th className="py-4 text-right">Tarif (CFA)</th>
                        <th className="py-4 text-right px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white-premium/5">
                      {quotesList.map((q) => (
                        <tr key={q.id} className="hover:bg-white-premium/[1%]">
                          <td className="py-4 px-2 font-mono text-neutral-400">{q.id}</td>
                          <td className="py-4 font-bold text-white-premium">{q.details?.pickup?.substring(0, 20)}...</td>
                          <td className="py-4 text-neutral-300">{q.details?.destination?.substring(0, 20)}...</td>
                          <td className="py-4 font-mono text-neutral-400">{q.details?.departureDate} à {q.details?.departureTime}</td>
                          <td className="py-4 text-center">
                            {q.status === "pending" && <Badge id={`badge_status_pending_${q.id}`} className="bg-transparent text-orange-400 border border-orange-500/30 text-[9px]">EN ÉTUDE</Badge>}
                            {q.status === "sent" && <Badge id={`badge_status_sent_${q.id}`} className="bg-transparent text-emerald-400 border border-emerald-500/30 text-[9px]">OFFRE ENVOYÉE</Badge>}
                            {q.status === "accepted" && <Badge id={`badge_status_accepted_${q.id}`} className="bg-transparent text-emerald-400 border border-emerald-500/30 text-[9px]">ACCEPTÉ</Badge>}
                            {q.status === "refused" && <Badge id={`badge_status_refused_${q.id}`} className="bg-transparent text-red-400 border border-red-500/30 text-[9px]">DÉCLINÉ</Badge>}
                          </td>
                          <td className="py-4 text-right font-mono font-bold text-white-premium">
                            {q.adminPrice ? `${q.adminPrice?.toLocaleString()} CFA` : "Non fixé"}
                          </td>
                          <td className="py-4 text-right px-2">
                            <button
                              id={`view_quote_details_btn_${q.id}`}
                              onClick={() => setSelectedQuoteId(q.id)}
                              className="px-3 py-1 bg-dark hover:bg-neutral-800 border border-white-premium/10 text-neutral-300 hover:text-white-premium text-[11px] rounded transition-colors flex items-center justify-center gap-1 ml-auto"
                            >
                              Détails
                              <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* 4. DETAIL VIEW / DEVIS/[ID] SIMULATOR */}
        {isAuthenticated && selectedQuoteId && activeQuoteDetail && (
          <div className="max-w-xl mx-auto space-y-6">
            <Card id={`devis_detail_view_card_${activeQuoteDetail.id}`} className="p-6 md:p-8 border border-white-premium/5 bg-[#0E0E14] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#00C853]" />

              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">DESSIN D'ÉTAPE DIGITALE</span>
                  <h3 className="text-lg font-bold text-white-premium font-sans">Récapitulatif Devis {activeQuoteDetail.id}</h3>
                </div>
                <button 
                  onClick={() => setSelectedQuoteId(null)}
                  className="p-1 border border-white-premium/15 rounded-lg text-neutral-400 hover:text-white-premium text-xs"
                >
                  Retour
                </button>
              </div>

              <div className="bg-dark/60 rounded-xl p-5 border border-white-premium/5 space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-white-premium/5 pb-2">
                  <span className="text-neutral-500">DE RETOUR LE :</span>
                  <span className="text-white-premium font-bold">{activeQuoteDetail.details?.departureDate}</span>
                </div>
                <div className="flex justify-between border-b border-white-premium/5 pb-2">
                  <span className="text-neutral-500">HEURE PRÉVUE :</span>
                  <span className="text-white-premium">{activeQuoteDetail.details?.departureTime}</span>
                </div>
                <div className="flex justify-between border-b border-white-premium/5 pb-2">
                  <span className="text-neutral-500">ADRESSE DE DÉPART :</span>
                  <span className="text-white-premium text-right">{activeQuoteDetail.details?.pickup}</span>
                </div>
                <div className="flex justify-between border-b border-white-premium/5 pb-2">
                  <span className="text-neutral-500">DESINTATION FINALE :</span>
                  <span className="text-white-premium text-right">{activeQuoteDetail.details?.destination}</span>
                </div>
                <div className="flex justify-between border-b border-white-premium/5 pb-2">
                  <span className="text-neutral-500">DURÉE ESTIMÉE :</span>
                  <span className="text-white-premium">{activeQuoteDetail.details?.durationHours} Heures</span>
                </div>
                <div className="flex justify-between border-b border-white-premium/5 pb-2">
                  <span className="text-neutral-500">NOMBRE DE GUESTS :</span>
                  <span className="text-white-premium">{activeQuoteDetail.details?.guests} passager(s)</span>
                </div>
                {activeQuoteDetail.details?.specificNeeds && (
                  <div className="border-b border-white-premium/5 pb-2 text-left">
                    <span className="text-neutral-500 block mb-1">PROTOCOLE PROTOCOLAIRE :</span>
                    <p className="text-neutral-300 font-sans text-xs italic">{activeQuoteDetail.details.specificNeeds}</p>
                  </div>
                )}
              </div>

              {/* Offer price block & Clients buttons */}
              <div className="mt-8 pt-6 border-t border-white-premium/5 text-center">
                
                {activeQuoteDetail.status === "pending" && (
                  <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                    <span className="text-xs font-mono text-orange-400 block font-bold uppercase">ANALYSE LOGISTIQUE EN COURS</span>
                    <p className="text-[11px] text-neutral-400 mt-2">
                      Nos équipes d'Abidjan évaluent l'itinéraire optimal. Vous recevrez une notification d'ici peu.
                    </p>
                  </div>
                )}

                {activeQuoteDetail.status === "sent" && (
                  <div className="space-y-6">
                    <div className="p-5 bg-[#00C853]/5 border border-[#00C853]/20 rounded-xl">
                      <span className="text-[10px] font-mono tracking-widest text-neutral-400 block mb-1 uppercase">OFFRE FINALE ESTIMÉE</span>
                      <span className="text-3xl font-extrabold text-[#00C853] font-mono">{activeQuoteDetail.adminPrice?.toLocaleString()}</span>
                      <span className="text-xs font-mono font-bold text-[#00C853] ml-1">FCFA</span>
                    </div>

                    <div className="flex gap-4">
                      <Button 
                        id="clt_decline_quote_btn"
                        variant="outline" 
                        onClick={() => handleRefuseQuote(activeQuoteDetail.id)}
                        className="w-full text-red-400 hover:text-red-500 border-red-500/20 hover:bg-red-500/5 font-bold"
                      >
                        Décliner l'offre
                      </Button>
                      <Button 
                        id="clt_accept_quote_btn"
                        onClick={() => handleAcceptQuote(activeQuoteDetail.id)}
                        className="w-full bg-[#00C853] hover:bg-[#00ab47] text-black font-extrabold"
                      >
                        Accepter & Confirmer
                      </Button>
                    </div>
                  </div>
                )}

                {activeQuoteDetail.status === "accepted" && (
                  <div className="p-4 bg-transparent border border-emerald-500/30 text-emerald-400 rounded-xl font-mono text-xs font-bold">
                    OFFRE CONFIRMÉE & VALIDÉE PAR LE CLIENT
                  </div>
                )}

                {activeQuoteDetail.status === "refused" && (
                  <div className="p-4 bg-transparent border border-red-500/30 text-red-400 rounded-xl font-mono text-xs font-bold">
                    DEMANDE D'ÉTUDE PROTOCOLAIRE REFUSÉE
                  </div>
                )}

              </div>
            </Card>
          </div>
        )}

        {/* 5. ADMIN MANAGEMENT INTERFACE (SECRET BACK-OFFICE FOR TASKS 3 & 4) */}
        {isAuthenticated && user?.role === "admin" && activeTab === "admin" && (
          <div className="space-y-8" id="admin_backoffice_workspace">
            
            {/* Banner info */}
            <Card id="devis_admin_sysadmin_console_card" className="p-6 border border-red-500/30 bg-transparent rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-red-400 font-bold block mb-1">
                  SYSADMIN CONSOLE
                </span>
                <h3 className="text-lg font-bold text-white-premium font-sans">
                  Abidjan Dispatch Core - Back-Office d'Affectation
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Assignez les tarifs négociés aux devis clients, et dispatchez manuellement les chauffeurs haut de gamme.
                </p>
              </div>
              <Badge id="badge_admin_decisionnel" className="bg-transparent text-red-400 border border-red-500/30 font-bold font-mono text-[10px]">
                ACCÈS DÉCISIONNEL
              </Badge>
            </Card>

            {/* Sub-grid 1: Devis à tarifer (Task 3 Pricing task) */}
            <Card id="devis_admin_quotes_pending_pricing_card" className="p-6 border border-white-premium/5 bg-[#0E0E14]">
              <h4 className="text-sm font-mono uppercase tracking-widest text-[#00C853] mb-4 font-bold">
                A. Gestion Tarifaire des Devis en Attente (Tâche 3)
              </h4>

              {quotesList.filter(q => q.status === "pending").length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs font-mono">
                  Aucun devis client en attente de tarification réglementaire.
                </div>
              ) : (
                <div className="space-y-4">
                  {quotesList.filter(q => q.status === "pending").map((q) => (
                    <div key={q.id} className="p-4 bg-[#14141C] border border-white-premium/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge id={`badge_pending_price_${q.id}`} className="bg-orange-500/15 text-orange-400 border border-orange-500/20 font-mono text-[9px]">PENDING PRICE</Badge>
                          <span className="font-mono text-neutral-400 font-bold">{q.id}</span>
                        </div>
                        <p className="text-white-premium font-bold font-sans">client: {q.clientName || "Client"} - {q.clientPhone}</p>
                        <p className="text-neutral-400 mt-1">{q.details?.pickup} → {q.details?.destination}</p>
                        <p className="text-neutral-500 text-[10px] font-mono mt-1">DÉPART LE : {q.details?.departureDate} à {q.details?.departureTime}</p>
                        {q.details?.specificNeeds && <p className="text-gold mt-1 italic text-[11px]">Besoins: {q.details.specificNeeds}</p>}
                      </div>
                      <div className="flex items-center gap-2 min-w-[200px] shrink-0">
                        <input 
                          type="number" 
                          placeholder="Tarif FCFA"
                          value={adminPriceInput}
                          onChange={(e) => setAdminPriceInput(e.target.value)}
                          className="w-28 bg-dark border border-white-premium/15 rounded px-3 py-1.5 text-xs text-white-premium font-mono focus:outline-none focus:border-[#00C853]"
                        />
                        <Button 
                          id={`admin_send_price_btn_${q.id}`}
                          onClick={() => handleAdminSubmitPrice(q.id)}
                          className="bg-[#00C853] hover:bg-[#00b04a] text-black px-3 py-1.5 font-bold text-[11px]"
                        >
                          Envoyer Tarif
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Sub-grid 2: Dispatch Chauffeurs (Task 4 dispatch task) */}
            <Card id="devis_admin_dispatch_drivers_assignment_card" className="p-6 border border-white-premium/5 bg-[#0E0E14]">
              <h4 className="text-sm font-mono uppercase tracking-widest text-[#00C853] mb-4 font-bold">
                B. Dispatch & Affectation des Chauffeurs (Tâche 4)
              </h4>

              <div className="bg-[#14141C] border border-white-premium/5 rounded-xl p-4 mb-6 text-xs text-neutral-400 space-y-1">
                <p className="font-bold text-white-premium mb-1">📋 Rappel des règles d'assignation d'Abidjan :</p>
                <p>• <b>Grand Public (N1/N2)</b> : Affectation automatique instantanée au chauffeur disponible avec le moins de missions.</p>
                <p>• <b>Diplomatie / Prestige / Hôtels (N2/N3 Premium)</b> : Affectation manuelle requise depuis cette console d'élite.</p>
              </div>

              {reservationsList.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs font-mono">
                  Aucune réservation enregistrée dans le système de logistique d'Abidjan.
                </div>
              ) : (
                <div className="space-y-4">
                  {reservationsList.map((r) => (
                    <div key={r.id} className="p-4 bg-[#14141C] border border-white-premium/5 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-neutral-400 font-bold">{r.id}</span>
                          <Badge id={`badge_assign_status_${r.id}`} className={`border text-[9px] font-mono ${
                            r.status === "confirmed" 
                              ? "bg-[#00C853]/10 text-[#00C853] border-[#00C853]/20" 
                              : "bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse"
                          }`}>
                            {r.status === "confirmed" ? "CONFIRMÉ" : "ATTENTE CHAUFFEUR"}
                          </Badge>
                          <span className="text-[10px] text-neutral-500 font-mono">Segment: {r.segment || "public"}</span>
                        </div>
                        <p className="text-white-premium font-sans font-bold">Client: {r.clientName} ({r.clientPhone})</p>
                        <p className="text-neutral-300 mt-1">{r.pickup} → {r.destination}</p>
                        <p className="text-neutral-500 text-[10px] font-mono mt-0.5">Le {r.departureDate} à {r.departureTime} | Véhicule : {getVehicleLabel(r.vehicleId)} | Prix: {r.totalPrice?.toLocaleString()} CFA</p>
                        
                        {r.driverId && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#00C853] font-mono">
                            <UserCheck size={12} />
                            <span>Chauffeur affecté : <b>{r.driverName}</b> ({r.driverPhone})</span>
                          </div>
                        )}
                      </div>

                      {/* Manual Dispatch dropdown picker */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select 
                          value={selectedDrivers[r.id] || ""}
                          onChange={(e) => setSelectedDrivers({ ...selectedDrivers, [r.id]: e.target.value })}
                          className="bg-dark border border-white-premium/15 rounded p-2 text-xs text-white-premium font-mono font-bold"
                        >
                          <option value="">Sélectionner Chauffeur</option>
                          {driversList.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.status === "disponible" ? "Dispo" : "Mission"})
                            </option>
                          ))}
                        </select>
                        <Button 
                          id={`dispatch_assign_driver_btn_${r.id}`}
                          onClick={() => handleAdminAssignDriver(r.id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-[11px] font-extrabold px-3 py-2"
                        >
                          Affecter
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* List Chauffeurs system details */}
            <Card id="devis_admin_list_chauffeurs_card" className="p-6 border border-white-premium/5 bg-[#0E0E14] text-xs">
              <h4 className="text-sm font-mono uppercase tracking-widest text-[#00C853] mb-4 font-bold flex items-center gap-2">
                <UserCheck size={16} />
                C. Statut Réglementaire de la Brigade Chauffeurs d'Abidjan
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {driversList.map((d) => (
                  <div key={d.id} className="p-4 bg-dark/50 border border-white-premium/5 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white-premium">{d.name}</span>
                      <Badge id={`badge_driver_status_${d.id}`} className={d.status === "disponible" ? "bg-[#00C853]/10 text-[#00C853] border-none text-[8px]" : "bg-orange-500/10 text-orange-400 border-none text-[8px]"}>
                        {d.status === "disponible" ? "DISPONIBLE" : "MISSION"}
                      </Badge>
                    </div>
                    <p className="text-neutral-400 text-[10px] font-mono">{d.email}</p>
                    <div className="flex items-center gap-1.5 text-neutral-500 text-[10px]">
                      <Phone size={10} />
                      <span>{d.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        )}

      </div>
    </div>
  );
};
