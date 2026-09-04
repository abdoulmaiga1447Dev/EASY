import React, { useState, useEffect } from "react";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { 
  MapPin, 
  Car, 
  User, 
  Clock, 
  Calendar, 
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  PhoneCall
} from "lucide-react";

interface SuiviProps {
  setCurrentPage: (page: string) => void;
  reservationId: string;
  id: string;
}

export const Suivi: React.FC<SuiviProps> = ({ setCurrentPage, reservationId, id }) => {
  const [resId, setResId] = useState<string>(reservationId);
  const [reservation, setReservation] = useState<any | null>(null);
  const [driver, setDriver] = useState<any | null>(null);
  const [vehicle, setVehicle] = useState<any | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchReservationDetails = async (targetId: string) => {
    if (!targetId) {
      setLoading(false);
      setErrorText("Identifiant de suivi de réservation manquant.");
      return;
    }

    const token = localStorage.getItem("ev_access_token");
    try {
      if (!isRefreshing) setLoading(true);
      setErrorText("");
      
      const res = await fetch(`/api/reservations/${targetId}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setReservation(data.reservation);
        setDriver(data.driver);
        setVehicle(data.vehicle);
        setStatus(data.reservation.status);
      } else {
        const errData = await res.json();
        setErrorText(errData.error?.fr || errData.error || "Une erreur s'est produite lors de la connexion.");
      }
    } catch (e) {
      console.error(e);
      setErrorText("Impossible d'établir une connexion avec le centre de routage d'EASY.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("suivi/")) {
      const idFromHash = hash.split("suivi/")[1] || "";
      setResId(idFromHash);
    }
  }, []);

  useEffect(() => {
    if (resId) {
      fetchReservationDetails(resId);
    }
  }, [resId]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (resId) {
      fetchReservationDetails(resId);
    }
  };

  const getStatusTextFr = () => {
    switch(status) {
      case "Payée": return "Payée (Attribution Chauffeur...)";
      case "assigned":
      case "en_route":
      case "arrived":
      case "in_progress": return "Navette Confirmée (Chauffeur assigné)";
      case "completed": return "Course Terminée avec Succès";
      default: return status ? status.toUpperCase() : "Traitement...";
    }
  };

  const getStepProgressIndex = () => {
    switch(status) {
      case "Payée": return 1;
      case "assigned":
      case "en_route":
      case "arrived":
      case "in_progress": return 2;
      case "completed": return 3;
      default: return 1;
    }
  };

  const stepsList = [
    {
      step: 1,
      title: "Paiement & Validation",
      desc: "Votre réservation a été validée et enregistrée avec succès dans le carnet d'I-Logistique d'EASY.",
      statusKey: "Payée"
    },
    {
      step: 2,
      title: "Attribution du Chauffeur d'Élite",
      desc: driver 
        ? `${driver.name} est désigné pour mener à bien votre protocole d'acheminement.` 
        : "Recherche et accréditation en cours de votre chauffeur exécutif.",
      statusKey: "assigned"
    },
    {
      step: 3,
      title: "Protocole Terminé",
      desc: "Vous êtes arrivé à bon port. Nos équipes d'EASY restent mobilisées pour vos futurs déplacements.",
      statusKey: "completed"
    }
  ];

  const currentStepIndex = getStepProgressIndex();

  if (loading && !isRefreshing) {
    return (
      <div id={id} className="min-h-screen bg-dark py-12 px-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-neutral-400">Chargement de votre plan de route d'élite...</p>
        </div>
      </div>
    );
  }

  if (errorText || !resId) {
    return (
      <div id={id} className="min-h-screen bg-dark py-12 px-4 flex items-center justify-center">
        <Card id="card_suivi_failed" className="w-full max-w-md p-8 border border-white-premium/5 bg-[#0E0E14] text-center rounded-xl space-y-4 shadow-lg">
          <div className="w-14 h-14 bg-transparent border border-white/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white-premium">Suivi introuvable</h3>
            <p className="text-xs text-neutral-400 mt-2">
              {errorText || "Veuillez vous assurer d'avoir une réservation active et d'être connecté à votre espace client."}
            </p>
          </div>
          <Button 
            id="btn_suivi_failed_home"
            variant="outline"
            onClick={() => setCurrentPage("home")}
            className="w-full"
          >
            Retourner à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div id={id} className="min-h-screen bg-dark py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation row */}
        <div className="flex items-center justify-between">
          <button 
            id="btn_suivi_back"
            onClick={() => {
              setCurrentPage("home");
              window.location.hash = "home";
            }}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-premium hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Retour à l'accueil
          </button>
          
          <div className="flex items-center gap-3">
            <Button
              id="btn_manual_refresh"
              variant="outline"
              onClick={handleManualRefresh}
              className="px-3.5 py-1.5 text-xs border-white-premium/10 flex items-center gap-1.5 text-neutral-300"
              disabled={isRefreshing}
            >
              <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Synchronisation en cours..." : "Actualiser"}
            </Button>
            <Badge id="badge_suivi_active_live" variant="gold" className="bg-transparent text-gold border border-gold/30">
              SUIVI DE VOL SÉCURISÉ ✦
            </Badge>
          </div>
        </div>

        {/* Master details columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Timeline and textual log (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card id="card_suivi_timeline_panel" className="p-6 md:p-8 border border-white-premium/5 bg-[#0E0E14] rounded-2xl relative shadow-md">
              <div className="border-b border-white-premium/5 pb-4 mb-6">
                <span className="text-[9px] font-mono text-[#00C853] uppercase tracking-widest block mb-1">
                  Feuille de Route Digitale
                </span>
                <h2 className="text-xl font-bold text-white-premium">Évolution de votre Transfert</h2>
              </div>

              {/* Graphical timeline */}
              <div className="relative pl-8 space-y-8">
                {/* Visual timeline central bar */}
                <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-neutral-900" />
                <div 
                  className="absolute left-3.5 top-2 w-0.5 bg-[#00C853] transition-all duration-700 ease-out" 
                  style={{ height: `${((currentStepIndex - 1) / 2) * 100}%` }}
                />

                {stepsList.map((st) => {
                  const isDone = currentStepIndex >= st.step;
                  const isCurrent = currentStepIndex === st.step;
                  
                  return (
                    <div 
                      key={st.step} 
                      className={`relative transition-all duration-300 ${
                        isCurrent 
                          ? "opacity-100" 
                          : isDone 
                            ? "opacity-75" 
                            : "opacity-40"
                      }`}
                    >
                      {/* Circle Indicator pin */}
                      <span className={`absolute -left-7.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-colors flex items-center justify-center ${
                        isCurrent 
                          ? "bg-black border-gold shadow-[0_0_12px_#D4AF37]" 
                          : isDone 
                            ? "bg-[#00C853] border-[#00C853]" 
                            : "bg-[#0A0A0F] border-neutral-800"
                      }`}>
                        {isDone && !isCurrent && (
                          <span className="w-1 h-1 rounded-full bg-black block" />
                        )}
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-ping block" />
                        )}
                      </span>

                      {/* Content block */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={`text-sm font-sans font-semibold ${
                            isCurrent 
                              ? "text-gold" 
                              : "text-white-premium"
                          }`}>
                            {st.title}
                          </h4>
                          {isCurrent && (
                            <Badge id="badge_suivi_step_live" variant="gold" className="bg-transparent text-gold border border-gold/30 text-[8px] font-mono tracking-widest font-bold">
                              ACTIF EN DIRECT
                            </Badge>
                          )}
                          {!isCurrent && isDone && (
                            <CheckCircle2 size={11} className="text-[#00C853]" />
                          )}
                        </div>

                        <p className="text-xs text-neutral-400 font-light leading-relaxed">
                          {st.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </Card>
          </div>

          {/* Sidebars (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Realtime Status Callout */}
            <Card id="card_suivi_status_info" className="p-5 border border-white-premium/5 bg-[#12121A] rounded-2xl">
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">Statut Actuel</span>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00C853] animate-ping shrink-0" />
                <span className="text-base font-mono font-bold text-white-premium capitalize">
                  {getStatusTextFr()}
                </span>
              </div>
            </Card>

            {/* Chauffeur info card */}
            {driver ? (
              <Card id="card_suivi_driver_profile" className="p-5 border border-white-premium/5 bg-[#0E0E14] rounded-2xl relative shadow-sm">
                <span className="text-[9px] font-mono text-gold uppercase tracking-[0.15em] block mb-3 border-b border-white-premium/5 pb-1">
                  VOTRE CHAUFFEUR ACCRÉDITÉ
                </span>

                <div className="flex items-center gap-4">
                  <img
                    src={driver.photo || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256"}
                    alt="Profil driver VIP"
                    className="w-12 h-12 rounded-full border border-gold/20 object-cover shadow-inner"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-white-premium font-sans text-sm">{driver.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-neutral-400 font-mono text-xs">{driver.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white-premium/5 flex items-center justify-between gap-2">
                  <a 
                    href={`tel:${driver.phone}`}
                    className="w-full bg-[#00C853]/10 hover:bg-[#00C853]/20 border border-[#00C853]/20 py-2.5 px-4 rounded-xl text-[#00C853] text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <PhoneCall size={13} />
                    Appeler mon chauffeur
                  </a>
                </div>
              </Card>
            ) : (
              <Card id="card_suivi_driver_none" className="p-5 border border-white-premium/5 bg-[#0E0E14] rounded-2xl text-center">
                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block mb-4">CHAUFFEUR</span>
                <div className="w-10 h-10 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto mb-3">
                  <User size={18} />
                </div>
                <h4 className="text-xs font-bold text-white-premium">Recherche d'un chauffeur...</h4>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Nos équipes affectent un de nos pilotes prestige à votre navette protocole.
                </p>
              </Card>
            )}

            {/* Ride details invoice specs */}
            <Card id="card_suivi_specs_details" className="p-5 border border-white-premium/5 bg-[#0E0E14] rounded-2xl space-y-4 shadow-sm text-xs">
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block border-b border-neutral-900 pb-2">
                DÉTAILS DES PRESTATIONS
              </span>

              <div className="space-y-3 font-sans text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Prise en charge :</span>
                  <span className="text-white-premium font-medium text-right max-w-[200px] truncate">
                    {reservation?.pickup}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Destination :</span>
                  <span className="text-white-premium font-medium text-right max-w-[200px] truncate w-64 block">
                    {reservation?.destination}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Véhicule :</span>
                  <span className="text-white-premium font-medium">
                    {vehicle ? `${vehicle.brand} ${vehicle.name}` : "Berline Premium d'Elite (N1)"}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Immatriculation :</span>
                  <span className="text-white-premium font-mono font-medium">
                    {vehicle ? vehicle.immatriculation : "CI-01-EASY-01"}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Départ le :</span>
                  <span className="text-white-premium">
                    {reservation?.departureDate} à {reservation?.departureTime}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Formule :</span>
                  <Badge id="badge_suivi_formula_duration" variant="slate" className="bg-[#00C853]/10 text-[#00C853] border-none text-[9px] font-mono font-bold">
                    {reservation?.formula === "hourly" ? "À L'HEURE" : (reservation?.formula === "halfday" ? "DEMI-JOURNÉE" : "JOURNÉE REINE")}
                  </Badge>
                </div>
                
                <div className="pt-3 border-t border-white-premium/5 flex justify-between items-center font-sans">
                  <span className="text-neutral-400 font-bold">Total réglé :</span>
                  <span className="text-[#00C853] text-sm font-extrabold font-mono">
                    {reservation?.totalPrice?.toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
};
