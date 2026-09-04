import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { 
  User, 
  MapPin, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  ChevronRight, 
  Star, 
  Phone, 
  Car, 
  RefreshCw,
  Sliders,
  ShieldCheck,
  CheckCircle,
  FileText,
  BatteryCharging,
  Camera,
  Activity,
  LogOut,
  Eye,
  EyeOff
} from "lucide-react";

interface ChauffeurProps {
  setCurrentPage: (page: string) => void;
  activeSubTab?: "dashboard" | "missions" | "planning";
  id?: string;
}

export const Chauffeur: React.FC<ChauffeurProps> = ({
  setCurrentPage,
  activeSubTab = "dashboard",
  id = "page_chauffeur_component"
}) => {
  const { isAuthenticated, user, login, logout } = useAuth();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"dashboard" | "missions" | "planning" | "shifts_history">(activeSubTab);
  
  // Chauffeur States
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [missionLoading, setMissionLoading] = useState<boolean>(false);

  // Shifts state
  const [activeShift, setActiveShift] = useState<any | null>(null);

  // Form states - Prise de service
  const [startKm, setStartKm] = useState<string>("12450");
  const [startCleanliness, setStartCleanliness] = useState<string>("Excellent");
  const [startBattery, setStartBattery] = useState<string>("94");
  const [startDepartureTime, setStartDepartureTime] = useState<string>("07:30");
  const [startRechargeChecked, setStartRechargeChecked] = useState<boolean>(true);
  const [startInternetChecked, setStartInternetChecked] = useState<boolean>(true);
  const [startPapersChecked, setStartPapersChecked] = useState<boolean>(true);
  const [photosUploaded, setPhotosUploaded] = useState<boolean>(false);
  const [photosLoading, setPhotosLoading] = useState<boolean>(false);

  // Form states - Fin de service
  const [endKm, setEndKm] = useState<string>("12680");
  const [endReport, setEndReport] = useState<string>("");
  const [endRechargeProof, setEndRechargeProof] = useState<boolean>(true);
  const [endPassationConfirmed, setEndPassationConfirmed] = useState<boolean>(true);
  const [closingShift, setClosingShift] = useState<boolean>(false);

  // Quick demo switcher credentials
  const [emailInput, setEmailInput] = useState("jean.koffi@easy.ci");
  const [passwordInput, setPasswordInput] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Load driver statistics, shifts logs, & missions assignations
  const loadDriverData = async () => {
    const token = localStorage.getItem("ev_access_token");
    if (!token) return;

    try {
      setLoading(true);
      
      // Fetch profile
      const profRes = await fetch("/api/drivers/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (profRes.ok) {
        const profData = await profRes.json();
        setDriverProfile(profData.driver);
      }

      // Fetch missions
      const mishRes = await fetch("/api/drivers/me/missions", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (mishRes.ok) {
        const mishData = await mishRes.json();
        setMissions(mishData.missions || []);
      }

      // Fetch shifts history
      const shiftRes = await fetch("/api/drivers/me/shifts", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (shiftRes.ok) {
        const shiftData = await shiftRes.json();
        const allShifts = shiftData.shifts || [];
        setShifts(allShifts);
        
        // Check if there is an open, uncompleted shift
        const activeOne = allShifts.find((s: any) => s.startConfirmed && !s.endConfirmed);
        setActiveShift(activeOne || null);
      }
    } catch (e) {
      console.error("Error loading driver cockpit telemetry:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "chauffeur") {
      loadDriverData();
    }
  }, [isAuthenticated, user]);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setLoginError("Veuillez remplir tous les champs.");
      return;
    }
    try {
      setLoginLoading(true);
      setLoginError("");
      const result = await login(emailInput, passwordInput);
      if (!result || !result.success) {
        setLoginError(result?.error || "Identifiants incorrects ou rôle non configuré.");
      }
    } catch (e) {
      setLoginError("Erreur d'accréditation au serveur.");
    } finally {
      setLoginLoading(false);
    }
  };

  const updateChauffeurStatus = async (newStatus: string) => {
    const token = localStorage.getItem("ev_access_token");
    if (!token) return;

    try {
      setProfileLoading(true);
      const res = await fetch("/api/drivers/me/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        const data = await res.json();
        setDriverProfile(data.driver);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateMissionStatus = async (missionId: string, nextStatus: string) => {
    const token = localStorage.getItem("ev_access_token");
    if (!token) return;

    try {
      setMissionLoading(true);
      const res = await fetch(`/api/reservations/${missionId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        loadDriverData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMissionLoading(false);
    }
  };

  // Submit Prise de service (Start shift)
  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("ev_access_token");
    if (!token) return;

    if (!photosUploaded) {
      alert("Veuillez d'abord prendre et uploader les photos sous les 4 angles pour attester de l'état du véhicule.");
      return;
    }

    try {
      setProfileLoading(true);
      const res = await fetch("/api/drivers/me/shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          startConfirmed: true,
          startKm: parseInt(startKm) || 12450,
          startDepartureTime,
          startRechargeChecked,
          startInternetChecked,
          startPapersChecked,
          cleanliness: startCleanliness,
          batteryLevel: parseInt(startBattery) || 94
        })
      });

      if (res.ok) {
        await loadDriverData();
        setActiveTab("dashboard");
      } else {
        alert("Une erreur est survenue lors de l'enregistrement de votre prise de service.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  };

  // Submit Fin de service (End Shift)
  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("ev_access_token");
    if (!token || !activeShift) return;

    if (parseInt(endKm) <= (activeShift.startKm || 0)) {
      alert(`Le kilométrage de fin de service (${endKm}) doit être supérieur au kilométrage initial (${activeShift.startKm || 0}).`);
      return;
    }

    try {
      setProfileLoading(true);
      const res = await fetch("/api/drivers/me/shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          shiftId: activeShift.id,
          endConfirmed: true,
          endKm: parseInt(endKm),
          endDailyReport: endReport || "Aucun problème relevé.",
          endRechargeProofPhoto: "https://images.unsplash.com/photo-1549399542-7eed3a85d611?q=80&w=256",
          endPassationConfirmed: true
        })
      });

      if (res.ok) {
        setClosingShift(false);
        setPhotosUploaded(false);
        setEndReport("");
        await loadDriverData();
        setActiveTab("shifts_history");
      } else {
        alert("Une erreur s'est produite lors de la fermeture de votre service.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  };

  // Simulate vehicle 4 angles photo shooting
  const triggerSimulatedPhotoCapture = () => {
    setPhotosLoading(true);
    setTimeout(() => {
      setPhotosUploaded(true);
      setPhotosLoading(false);
    }, 1800);
  };

  const getMissionBadge = (status: string, idSuffix: string = "mish") => {
    switch (status) {
      case "Payée": return <Badge id={`badge_${idSuffix}_paye`} variant="green" className="bg-transparent text-emerald-400 border border-emerald-500/30">PAYÉE (À ASSIGNER)</Badge>;
      case "assigned":
      case "en_route":
      case "arrived":
      case "in_progress": return <Badge id={`badge_${idSuffix}_assigned`} variant="outline" className="bg-transparent text-blue-400 border border-blue-500/30 font-sans">ASSIGNÉE</Badge>;
      case "completed": return <Badge id={`badge_${idSuffix}_completed`} variant="green" className="bg-transparent text-green-300 border border-green-500/30">COMPLÉTÉE</Badge>;
      default: return <Badge id={`badge_${idSuffix}_other`} variant="slate" className="bg-neutral-800 text-neutral-400">{status.toUpperCase()}</Badge>;
    }
  };

  // Active ongoing mission tracker helper
  const activeMission = missions.find(m => 
    ["assigned", "en_route", "arrived", "in_progress"].includes(m.status)
  );

  // Planning calendar data
  const mockPlanningDays = [
    { day: "Lundi", date: "Actuel", missionsCount: 2, busy: true },
    { day: "Mardi", date: "Demain", missionsCount: 1, busy: true },
    { day: "Mercredi", date: "+2 Jours", missionsCount: 3, busy: true },
    { day: "Jeudi", date: "+3 Jours", missionsCount: 0, busy: false },
    { day: "Vendredi", date: "+4 Jours", missionsCount: 2, busy: true },
    { day: "Samedi", date: "Week-End", missionsCount: 1, busy: true },
    { day: "Dimanche", date: "Week-End", missionsCount: 0, busy: false }
  ];

  // If not authenticated, show login
  if (!isAuthenticated || user?.role !== "chauffeur") {
    return (
      <div id={id} className="min-h-screen bg-dark py-12 px-4 flex items-center justify-center">
        <Card id="card_driver_auth_splash" className="w-full max-w-md p-8 border border-gold/10 bg-[#0E0E14] relative rounded-2xl shadow-xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gold" />
          
          <div className="text-center mb-8">
            <span className="text-[10px] font-mono tracking-widest text-gold uppercase font-bold block mb-2">
              SECTEUR CHAUFFEURS DE PROTOCOLE
            </span>
            <h2 className="text-2xl font-bold text-white-premium font-sans">
              Espace Chauffeur VIP
            </h2>
            <p className="text-xs text-neutral-400 mt-2 font-light">
              Saisissez vos identifiants d'accréditation d'élite pour gérer vos transferts présidentiels.
            </p>
          </div>

          <form onSubmit={handleQuickLogin} className="space-y-4" noValidate>
            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5">
                EMAIL DRIVER ACCRÉDITÉ
              </label>
              <input
                id="driver_login_email"
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="w-full bg-[#14141C] border border-white-premium/10 rounded-lg p-2.5 text-xs text-white-premium font-sans focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5">
                MOT DE PASSE PROFESSIONNEL
              </label>
              <div className="relative">
                <input
                  id="driver_login_password"
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full bg-[#14141C] border border-white-premium/10 rounded-lg p-2.5 pr-10 text-xs text-white-premium font-sans focus:outline-none focus:border-gold"
                  required
                />
                <button
                  type="button"
                  id="toggle_driver_pwd_visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-400/5 border border-red-400/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{loginError}</span>
              </div>
            )}

            <Button
              id="driver_login_submit"
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gold hover:bg-gold-light text-black font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {loginLoading ? "Signature d'alliance..." : "S'authentifier au Terminal Chauffeur"}
              <ChevronRight size={14} />
            </Button>
          </form>

          {/* Seed accounts list */}
          <div className="mt-8 pt-4 border-t border-white-premium/5 text-center">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block mb-2">COMPTES DE DÉMONSTRATION</span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setEmailInput("jean.koffi@easy.ci");
                  setPasswordInput("password");
                }}
                className="w-full bg-[#121218] hover:bg-[#161622] transition-colors p-2.5 rounded-lg border border-gold/5 text-left text-[11px] font-mono text-neutral-300 flex justify-between items-center cursor-pointer"
              >
                <div>
                  <span className="text-gold block font-sans font-bold">Jean Koffi</span>
                  <span className="text-neutral-500">jean.koffi@easy.ci</span>
                </div>
                <span className="text-neutral-500 border border-neutral-700 rounded px-1.5 py-0.5 text-[9px]">password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailInput("ibrahim.c@easy.ci");
                  setPasswordInput("password");
                }}
                className="w-full bg-[#121218] hover:bg-[#161622] transition-colors p-2.5 rounded-lg border border-gold/5 text-left text-[11px] font-mono text-neutral-300 flex justify-between items-center cursor-pointer"
              >
                <div>
                  <span className="text-gold block font-sans font-bold">Ibrahim Coulibaly</span>
                  <span className="text-neutral-500">ibrahim.c@easy.ci</span>
                </div>
                <span className="text-neutral-500 border border-neutral-700 rounded px-1.5 py-0.5 text-[9px]">password</span>
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div id={id} className="min-h-screen bg-dark py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Elite Driver Profile Header panel */}
        <Card id="card_driver_profile_header" className="p-6 border border-white-premium/5 bg-gradient-to-r from-[#0E0E14] via-[#111119] to-[#0E0E14] rounded-2xl relative shadow-md overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-[60px]" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            {/* Left: Driver profile credentials */}
            <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-left">
              <img
                src={driverProfile?.photo || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256"}
                alt="Chauffeur d'élite"
                className="w-16 h-16 rounded-full border-2 border-gold/30 object-cover shadow-inner shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-[10px] items-center gap-1 inline-flex font-mono tracking-widest text-gold uppercase font-extrabold mb-1">
                  CHAUFFEUR PARTENAIRE VIP ✦ {driverProfile?.shift ? `${driverProfile.shift.toUpperCase()} SHIFT` : ""}
                </span>
                <h2 className="text-xl font-bold text-white-premium">{driverProfile?.name || user?.name}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1.5 text-xs text-neutral-400 font-sans">
                  <span>{driverProfile?.phone || user?.phone}</span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-gold font-mono flex items-center gap-1">
                    <Car size={13} /> {driverProfile?.vehicleBrand ? `${driverProfile.vehicleBrand} (${driverProfile.vehicleImmatriculation})` : "Véhicule attitré"}
                  </span>
                </div>
              </div>
            </div>

            {/* Shift controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {activeShift ? (
                <div className="flex items-center gap-3">
                  <Badge id="badge_chauffeur_active_status" variant="green" className="bg-transparent text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    SERVICE ACTIF
                  </Badge>
                  <Button 
                    id="btn_open_end_shift_flow"
                    onClick={() => setClosingShift(true)}
                    className="bg-transparent hover:bg-white/5 text-red-400 border border-red-500/30 text-xs px-4 py-2"
                  >
                    <LogOut size={13} className="mr-1 inline" /> Terminer mon service
                  </Button>
                </div>
              ) : (
                <Badge id="badge_chauffeur_no_active_status" variant="slate" className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-3 py-1.5 text-xs">
                  Aucun service en cours
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* COMPULSORY GATE: IF NO ACTIVE SHIFT IS CONFIRMED, MUST SUBMIT PRISE DE SERVICE REPORT FIRST */}
        {!activeShift && !loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Prise de service form */}
            <div className="lg:col-span-8 space-y-6">
              <Card id="card_gate_prise_de_service" className="p-6 md:p-8 border border-gold/20 bg-[#0E0E14] rounded-2xl relative shadow-lg">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-gold via-yellow-500 to-gold" />
                
                <div className="border-b border-white-premium/5 pb-4 mb-6">
                  <span className="text-[10px] font-mono text-gold uppercase tracking-[0.2em] block mb-1">EMBARQUEMENT / PROTOCOLE LOGISTIQUE</span>
                  <h3 className="text-xl font-bold text-white">Formulaire de Prise de Service Obligatoire</h3>
                  <p className="text-xs text-neutral-400 font-light mt-1.5">
                    Conformément aux instructions de sécurité EASY, vous devez obligatoirement remplir et valider votre carnet d'I-Logistique numérique avant d'accéder à vos missions.
                  </p>
                </div>

                <form onSubmit={handleStartShift} className="space-y-6 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Kilometer count input */}
                    <div>
                      <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2 font-bold">
                        KILOMÉTRAGE INITIAL DU VÉHICULE (KM) *
                      </label>
                      <input 
                        type="number"
                        value={startKm}
                        onChange={e => setStartKm(e.target.value)}
                        className="w-full bg-[#13131B] border border-white-premium/10 rounded-lg p-3 text-xs text-white font-mono focus:border-gold focus:outline-none"
                        required
                      />
                    </div>

                    {/* Battery level level */}
                    <div>
                      <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2 font-bold">
                        NIVEAU DE BATTERIE ACTUEL (%) *
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          min="1"
                          max="100"
                          value={startBattery}
                          onChange={e => setStartBattery(e.target.value)}
                          className="w-full bg-[#13131B] border border-white-premium/10 rounded-lg p-3 pr-10 text-xs text-white font-mono focus:border-gold focus:outline-none"
                          required
                        />
                        <BatteryCharging size={16} className="absolute right-3 top-3.5 text-neutral-500" />
                      </div>
                    </div>

                    {/* Cleanliness selection */}
                    <div>
                      <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2 font-bold">
                        ÉTAT DE PROPRETÉ EXTÉRIEUR & INTÉRIEUR *
                      </label>
                      <select
                        value={startCleanliness}
                        onChange={e => setStartCleanliness(e.target.value)}
                        className="w-full bg-[#13131B] border border-white-premium/10 rounded-lg p-3 text-xs text-white font-sans focus:border-gold focus:outline-none"
                      >
                        <option value="Excellent">Excellent (Propreté VIP irréprochable)</option>
                        <option value="Correct">Correct (Présentable mais léger grain)</option>
                        <option value="Nécessite nettoyage">Nécessite nettoyage (Besoin de lavage immédiat)</option>
                      </select>
                    </div>

                    {/* Time of departure */}
                    <div>
                      <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2 font-bold">
                        HEURE DE DÉBUT DE SERVICE PRÉVUE *
                      </label>
                      <input 
                        type="text"
                        value={startDepartureTime}
                        onChange={e => setStartDepartureTime(e.target.value)}
                        className="w-full bg-[#13131B] border border-white-premium/10 rounded-lg p-3 text-xs text-white font-mono focus:border-gold focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Mandatories safety checkboxes checklist */}
                  <div className="bg-[#12121A] border border-white-premium/5 rounded-xl p-4 space-y-3">
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
                      LISTE DE VÉRIFICATION PROTOCOLE INTÉGRITÉ
                    </span>
                    
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={startRechargeChecked} 
                        onChange={e => setStartRechargeChecked(e.target.checked)}
                        className="mt-0.5 rounded border-neutral-700 bg-neutral-900 text-gold focus:ring-gold"
                      />
                      <span className="text-neutral-300 text-[11px]">Câble de recharge rapide type 2 et adaptateurs présents dans le coffre.</span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={startInternetChecked} 
                        onChange={e => setStartInternetChecked(e.target.checked)}
                        className="mt-0.5 rounded border-neutral-700 bg-neutral-900 text-gold focus:ring-gold"
                      />
                      <span className="text-neutral-300 text-[11px]">Réseau WIFI hotspot actif à bord de la berline (Routeur 5G ok).</span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={startPapersChecked} 
                        onChange={e => setStartPapersChecked(e.target.checked)}
                        className="mt-0.5 rounded border-neutral-700 bg-neutral-900 text-gold focus:ring-gold"
                      />
                      <span className="text-neutral-300 text-[11px]">Accréditation physique et documents officiels du véhicule présents à bord.</span>
                    </label>
                  </div>

                  {/* MANDATORY PHOTO UPLOAD UNDER 4 ANGLES */}
                  <div className="p-5 border border-dashed border-white-premium/10 bg-[#111119] rounded-xl text-center space-y-3">
                    <Camera size={26} className="mx-auto text-neutral-500" />
                    <div>
                      <h4 className="font-semibold text-white">Photos de contrôle du véhicule</h4>
                      <p className="text-[10px] text-neutral-400 mt-1">Vous devez uploader une photo capturant le véhicule sous 4 angles précis.</p>
                    </div>

                    <div className="flex gap-2 justify-center py-2 flex-wrap">
                      <span className={`text-[9px] font-mono px-2 py-1 rounded border ${photosUploaded ? 'bg-transparent text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>Face Avant</span>
                      <span className={`text-[9px] font-mono px-2 py-1 rounded border ${photosUploaded ? 'bg-transparent text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>Profil Gauche</span>
                      <span className={`text-[9px] font-mono px-2 py-1 rounded border ${photosUploaded ? 'bg-transparent text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>Profil Droit</span>
                      <span className={`text-[9px] font-mono px-2 py-1 rounded border ${photosUploaded ? 'bg-transparent text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>Face Arrière</span>
                    </div>

                    <div>
                      <Button
                        id="btn_trigger_sim_photos_upload"
                        type="button"
                        variant="outline"
                        onClick={triggerSimulatedPhotoCapture}
                        disabled={photosLoading}
                        className="bg-[#191924] text-xs px-5 py-2 hover:bg-[#222232] cursor-pointer"
                      >
                        {photosLoading ? "Prise des photos & Simulation d'upload..." : (photosUploaded ? "✓ Photos sauvegardées" : "Prendre et uploader les photos (4 angles)")}
                      </Button>
                    </div>
                  </div>

                  {/* Actions buttons start service */}
                  <div className="pt-3">
                    <Button 
                      id="btn_submit_start_service"
                      type="submit"
                      disabled={profileLoading}
                      className="w-full bg-gold hover:bg-gold-light text-black font-extrabold text-sm py-3.5 rounded-xl cursor-pointer shadow-md"
                    >
                      {profileLoading ? "Initialisation et accréditation..." : "✓ ENREGISTRER MA PRISE DE SERVICE"}
                    </Button>
                  </div>
                </form>

              </Card>
            </div>

            {/* Sidebar info */}
            <div className="lg:col-span-4 space-y-6">
              <Card id="card_chauffeur_service_considerations" className="p-5 border border-white-premium/5 bg-[#0E0E14] rounded-2xl relative">
                <span className="text-[9px] font-mono text-gold uppercase tracking-[0.14em] block mb-3 pb-1 border-b border-neutral-900">CONSIDÉRATIONS DE SERVICE</span>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  Votre shift actuel s'effectue sur le véhicule lié de manière permanente :
                </p>
                <div className="bg-[#12121A] p-3 rounded-lg border border-white-premium/5 text-xs text-neutral-300 font-sans mt-3 space-y-2">
                  <p><b className="text-white">Véhicule :</b> {driverProfile?.vehicleBrand || "EASY SEDAN VIP"}</p>
                  <p><b className="text-white">Catégorie :</b> Berline Premium (N1) - Éligible</p>
                  <p><b className="text-white">Shift affecté :</b> {driverProfile?.shift === "matin" ? "Matinée (06h00 - 14h00)" : "Après-Midi (14h00 - 22h00)"}</p>
                </div>
              </Card>

              <Card id="card_chauffeur_tactile_locker_note" className="p-5 border border-white-premium/5 bg-[#0E0E14] rounded-2xl text-center">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle size={18} />
                </div>
                <h4 className="text-xs font-bold text-white">Locker Tactile Activé</h4>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  L'accès aux courses des clients VIP, aux plannings et historiques est temporairement verrouillé pour garantir un audit des véhicules impeccable.
                </p>
              </Card>
            </div>
          </div>
        ) : (
          /* REGULAR MAIN SHIFT INTERFACE - SHOW ONGOING MISSION & ACCREDITED TABS */
          <div className="space-y-8 animate-fade-in">
            {/* Dashboard SubTabs Switcher bar */}
            <div className="flex flex-wrap border-b border-white-premium/10 gap-6 font-mono text-xs">
              <button
                id="tab_driver_dash"
                onClick={() => { setActiveTab("dashboard"); setClosingShift(false); }}
                className={`pb-3 font-semibold tracking-wider uppercase transition-colors relative cursor-pointer ${
                  activeTab === "dashboard" && !closingShift ? "text-gold after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-gold" : "text-neutral-400 hover:text-white"
                }`}
              >
                Mission Actrice
              </button>
              <button
                id="tab_driver_missions"
                onClick={() => { setActiveTab("missions"); setClosingShift(false); }}
                className={`pb-3 font-semibold tracking-wider uppercase transition-colors relative cursor-pointer ${
                  activeTab === "missions" ? "text-gold after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-gold" : "text-neutral-400 hover:text-white"
                }`}
              >
                Missions Assignées ({missions.length})
              </button>
              <button
                id="tab_driver_planning"
                onClick={() => { setActiveTab("planning"); setClosingShift(false); }}
                className={`pb-3 font-semibold tracking-wider uppercase transition-colors relative cursor-pointer ${
                  activeTab === "planning" ? "text-gold after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-gold" : "text-neutral-400 hover:text-white"
                }`}
              >
                Mon Planning Hebdo
              </button>
              <button
                id="tab_driver_shifts"
                onClick={() => { setActiveTab("shifts_history"); setClosingShift(false); }}
                className={`pb-3 font-semibold tracking-wider uppercase transition-colors relative cursor-pointer ${
                  activeTab === "shifts_history" ? "text-gold after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-gold" : "text-neutral-400 hover:text-white"
                }`}
              >
                Historique de Service
              </button>
            </div>

            {/* TAB VIEWPORTS */}
            {closingShift ? (
              /* COMPULSORY GATE 2: IF CHOPPING SERVICE - FIN DE SERVICE FORM REPORT */
              <div className="max-w-3xl mx-auto space-y-6">
                <Card id="card_chauffeur_end_shift_report" className="p-6 md:p-8 border border-red-500/10 bg-[#0E0E14] rounded-2xl relative shadow-lg">
                  <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-red-500 via-rose-600 to-red-500" />
                  
                  <div className="border-b border-light-gray/10 pb-4 mb-6">
                    <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest block mb-1">
                      RAPPORT DE DÉPARQUEMENT VIP
                    </span>
                    <h3 className="text-xl font-bold text-white">Rapport de Fin de Service obligatoire</h3>
                    <p className="text-xs text-neutral-400 font-light mt-1.5">
                      Veuillez saisir votre kilométrage final de dépôt de véhicule et vos observations éventuelles avant d'éteindre le terminal.
                    </p>
                  </div>

                  <form onSubmit={handleEndShift} className="space-y-6 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#14141C] p-4 rounded-xl border border-white-premium/5 mb-2">
                      <p className="text-neutral-400">Kilométrage initial : <b className="text-white font-mono">{activeShift?.startKm || 0} KM</b></p>
                      <p className="text-neutral-400">Heure de prise service : <b className="text-white font-mono">{new Date(activeShift?.startTime || Date.now()).toLocaleTimeString()}</b></p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2 font-bold">
                          KILOMÉTRAGE DE FIN DE SERVICE (KM) *
                        </label>
                        <input 
                          type="number"
                          value={endKm}
                          onChange={e => setEndKm(e.target.value)}
                          className="w-full bg-[#13131B] border border-white-premium/10 rounded-lg p-3 text-xs text-white font-mono focus:border-red-500 focus:outline-none"
                          required
                        />
                        <span className="text-[9px] text-neutral-500 mt-1 block">Assurez-vous qu'il correspond au cadran de bord du véhicule attitré.</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2 font-bold">
                          PREUVE DE RECHARGE EFFECTUÉE *
                        </label>
                        <select
                          value={endRechargeProof ? "Oui" : "Non"}
                          onChange={e => setEndRechargeProof(e.target.value === "Oui")}
                          className="w-full bg-[#13131B] border border-white-premium/10 rounded-lg p-3 text-xs text-white focus:border-red-500 focus:outline-none"
                        >
                          <option value="Oui">Oui, le véhicule a été remis en charge (Min 80%) [Simulé]</option>
                          <option value="Non">Non (Dérogation d'urgence logistique)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2 font-bold">
                        OBSERVATIONS ÉCRITES DU CHAUFFEUR *
                      </label>
                      <textarea
                        rows={3}
                        value={endReport}
                        onChange={e => setEndReport(e.target.value)}
                        placeholder="Signalez tout incident, bruit suspect, état de carrosserie ou besoin d'entretien..."
                        className="w-full bg-[#13131B] border border-white-premium/10 rounded-lg p-3 text-xs text-white focus:border-red-500 focus:outline-none"
                        required
                      />
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer bg-[#13131B] p-3 rounded-lg border border-white-premium/5">
                      <input 
                        type="checkbox"
                        checked={endPassationConfirmed}
                        onChange={e => setEndPassationConfirmed(e.target.checked)}
                        className="mt-0.5 rounded text-red-500 focus:ring-red-500"
                        required
                      />
                      <span className="text-neutral-300 text-[11px] leading-snug">
                        Je confirme avoir verrouillé le véhicule, déposé les clés du protocole à l'emplacement règlementaire, et nettoyé l'habitacle pour mon remplaçant.
                      </span>
                    </label>

                    <div className="flex gap-3 pt-2">
                      <Button
                        id="btn_cancel_close_shift"
                        type="button"
                        variant="outline"
                        onClick={() => setClosingShift(false)}
                        className="w-1/2 bg-[#191924] text-neutral-300 hover:bg-[#20202F] text-xs py-3"
                      >
                        Retour
                      </Button>
                      <Button
                        id="btn_submit_end_shift"
                        type="submit"
                        disabled={profileLoading}
                        className="w-1/2 bg-red-500 hover:bg-rose-600 text-white font-extrabold text-xs py-3 rounded-xl cursor-pointer"
                      >
                        {profileLoading ? "Enregistrement en cours..." : "TERMINER SERVICE & SIGNOFF"}
                      </Button>
                    </div>

                  </form>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* ACTIVE TAB IS DASHBOARD ( ongoing / active mission details ) */}
                {activeTab === "dashboard" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Active Mission Details (8 Cols) */}
                    <div className="lg:col-span-8 space-y-6">
                      {activeMission ? (
                        <Card id="card_active_mission" className="p-6 border border-gold/15 bg-[#0E0E14] rounded-2xl relative shadow-md">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 border-b border-light-gray/10 pb-4">
                            <div>
                              <span className="text-[10px] font-mono text-gold uppercase tracking-wider block mb-1">VIP MISSION RETRAITE EN EXÉCUTION</span>
                              <h3 className="text-lg font-bold text-white font-sans">
                                Transfert N° {activeMission.id}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              {getMissionBadge(activeMission.status, "active_mish")}
                              <Button
                                id="btn_refresh_missions"
                                variant="ghost"
                                onClick={loadDriverData}
                                className="p-1 h-7 text-neutral-400 hover:text-gold"
                                title="Recharger la mission"
                              >
                                <RefreshCw size={14} />
                              </Button>
                            </div>
                          </div>

                          {/* Client segment info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#13131B] border border-white-premium/5 rounded-xl p-5 mb-6 text-xs text-neutral-300">
                            <div className="space-y-3">
                              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">PASSAGER VIP</span>
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 bg-transparent border border-white/10 text-gold flex items-center justify-center rounded-full">
                                  <User size={16} />
                                </div>
                                <div>
                                  <p className="font-bold text-white">{activeMission.clientName}</p>
                                  <p className="text-neutral-400 font-mono text-[10px] flex items-center gap-1 mt-0.5">
                                    <Phone size={10} /> {activeMission.clientPhone || "+225 0707 07 07 07"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3 border-t md:border-t-0 pt-3 md:pt-0">
                              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">VÉHICULE PROTOCOLAIRE LIÉ</span>
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 bg-transparent border border-white/10 text-[#00C853] flex items-center justify-center rounded-full">
                                  <Car size={16} />
                                </div>
                                <div>
                                  <p className="font-bold text-white">
                                    {driverProfile?.vehicleBrand || "EASY BERLINE VIP"}
                                  </p>
                                  <p className="text-[#00C853] font-mono text-[10px] mt-0.5 font-bold">
                                    IMM Matricule : {driverProfile?.vehicleImmatriculation || "CI-01-EASY-01"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Route directions itinerary check */}
                          <div className="space-y-4 mb-6 text-xs">
                            <div className="flex gap-3 text-xs">
                              <div className="w-5 h-5 rounded bg-transparent border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">A</div>
                              <div>
                                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-tight">POINT DE PRISE EN CHARGE (DÉPART A)</span>
                                <p className="font-medium mt-0.5 text-white">{activeMission.pickup}</p>
                              </div>
                            </div>

                            <div className="flex gap-3 text-xs">
                              <div className="w-5 h-5 rounded bg-transparent border border-gold/30 text-gold flex items-center justify-center font-bold">B</div>
                              <div>
                                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-tight">POINT DE DÉPÔT FINAL (ARRIVÉE B)</span>
                                <p className="font-medium mt-0.5 text-white">{activeMission.destination}</p>
                              </div>
                            </div>
                          </div>

                          {/* Progression Command button panel */}
                          <div className="bg-[#12121A] border border-white-premium/5 p-4 rounded-xl space-y-3">
                            <span className="text-[10px] font-mono text-neutral-400 tracking-wider block uppercase font-bold">TERMINAISON DE LA MISSION :</span>
                            <div className="flex flex-wrap gap-3">
                              {["assigned", "en_route", "arrived", "in_progress"].includes(activeMission.status) && (
                                <Button 
                                  id="btn_driver_complete_ride"
                                  onClick={() => handleUpdateMissionStatus(activeMission.id, "completed")}
                                  disabled={missionLoading}
                                  className="bg-green-500 hover:bg-green-600 text-black font-extrabold text-xs px-5 py-2.5 rounded-lg cursor-pointer flex items-center gap-1.5"
                                >
                                  ✓ Marquer la course comme Terminée
                                </Button>
                              )}
                            </div>
                            <span className="text-[9px] text-neutral-500 block leading-relaxed mt-1 font-sans">
                              * Une fois la course terminée, la facture finale est émise au client d'EASY et le transfert est archivé.
                            </span>
                          </div>

                        </Card>
                      ) : (
                        <Card id="card_no_active_mission" className="p-12 border border-white-premium/5 bg-[#0E0E14] text-center rounded-2xl flex flex-col items-center justify-center space-y-4">
                          <div className="w-14 h-14 bg-[#12121A] text-neutral-500 rounded-full flex items-center justify-center border border-white-premium/5">
                            <Activity size={24} className="text-gold" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white-premium">Aucune mission actrice active</h4>
                            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto font-light leading-relaxed">
                              Vous n'êtes engagé sur aucune mission en ce moment de la journée. Accédez à l'onglet <strong className="text-gold cursor-pointer" onClick={() => setActiveTab("missions")}>Missions Assignées</strong> pour réviser et commencer vos trajets protocolaires.
                            </p>
                          </div>
                        </Card>
                      )}
                    </div>

                    {/* Right side logistics block details (4 Cols) */}
                    <div className="lg:col-span-4 space-y-6 text-xs">
                      <Card id="card_chauffeur_guarantee_quality" className="p-5 border border-white-premium/5 bg-[#0e0e14] rounded-2xl space-y-4">
                        <span className="text-[9px] font-mono text-gold uppercase tracking-[0.14em] block border-b border-neutral-900 pb-1.5 flex items-center gap-1">
                          <ShieldCheck size={11} /> GARANTIE QUALITÉ ET ASSISTANCE
                        </span>
                        
                        <div className="space-y-3 font-light text-neutral-300">
                          <p className="leading-snug">
                            En cas d'urgence sur la chaussée, de panne, de retard majeur de liaison ou de problème de sécurité avec le passager :
                          </p>
                          <div className="bg-[#12121A] p-3 rounded-lg border border-white-premium/5 space-y-2">
                            <p className="font-bold text-white">Centre de Dispatching :</p>
                            <p className="font-mono text-gold font-bold">+225 21 00 22 22</p>
                            <p className="text-[10px] text-neutral-500">N° d'assistance interne 24h/7 exclusif.</p>
                          </div>
                        </div>
                      </Card>

                      <Card id="card_chauffeur_flow_control" className="p-5 border border-white-premium/5 bg-[#0e0e14] rounded-2xl">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase block tracking-widest mb-3">CONTRÔLE DE FLUX EN DIRECT</span>
                        <div className="space-y-2">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="text-neutral-500">Batterie Véhicule :</span>
                            <span className="text-[#00C853] font-bold">⚡ {activeShift?.batteryLevel || 94}%</span>
                          </div>
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="text-neutral-500">Odomètre :</span>
                            <span className="text-white font-bold">{activeShift?.startKm} KM</span>
                          </div>
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="text-neutral-500">Propreté :</span>
                            <span className="text-white">{activeShift?.cleanliness || "Excellent"}</span>
                          </div>
                        </div>
                      </Card>
                    </div>

                  </div>
                )}

                {/* TAB 2: ALL ASSIGNED PROTOCOL MISSIONS */}
                {activeTab === "missions" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-[#131119] border border-white-premium/5 rounded-xl p-4">
                      <h3 className="text-sm font-sans font-bold text-white">
                        VOS MISSIONS DE TRANSPORT ATTRIBUÉES ({missions.length})
                      </h3>
                      <Button
                        id="btn_refresh_missions_list"
                        onClick={loadDriverData}
                        variant="outline"
                        className="text-xs h-8 border-gold/20 hover:bg-gold/10 text-gold"
                      >
                        Actualiser
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {missions.length > 0 ? (
                        missions.map(m => (
                          <Card key={m.id} id={`card_mission_item_${m.id}`} className="p-5 border border-white-premium/5 bg-[#0E0E14] rounded-xl relative space-y-4 shadow-sm hover:border-gold/20 transition-all text-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block mb-0.5">TRANSFERT MAJESTIQUE</span>
                                <h4 className="font-bold text-white-premium font-sans text-sm">Réf #{m.id}</h4>
                              </div>
                              {getMissionBadge(m.status, `mish_${m.id}`)}
                            </div>

                            <div className="divide-y divide-white-premium/5 border-t border-b border-neutral-900 py-2 space-y-2 text-xs">
                              <p className="flex justify-between py-1 text-neutral-400">
                                <span>Passager d'honneur :</span>
                                <span className="text-white-premium font-sans font-semibold">{m.clientName}</span>
                              </p>
                              <p className="flex justify-between py-1 text-neutral-400">
                                <span>Prise en charge A :</span>
                                <span className="text-white text-right max-w-[200px] truncate">{m.pickup}</span>
                              </p>
                              <p className="flex justify-between py-1 text-neutral-400">
                                <span>Dépôt final B :</span>
                                <span className="text-white text-right max-w-[200px] truncate">{m.destination}</span>
                              </p>
                              <p className="flex justify-between py-1 text-neutral-400">
                                <span>Programmation :</span>
                                <span className="text-white font-mono">{m.departureDate} à {m.departureTime}</span>
                              </p>
                              <p className="flex justify-between py-1 text-[#00C853] font-bold">
                                <span>Facture réglée :</span>
                                <span>{m.totalPrice?.toLocaleString()} FCFA</span>
                              </p>
                            </div>

                            {/* Accept/Refuse trigger */}
                            {["Payée", "pending_assignment", "confirmed"].includes(m.status) && (
                              <div className="flex gap-2 pt-2">
                                <Button
                                  id={`btn_accept_mish_${m.id}`}
                                  onClick={() => handleUpdateMissionStatus(m.id, "assigned")}
                                  className="w-full bg-gold hover:bg-gold-light text-black font-extrabold cursor-pointer border-none text-[11px] py-2"
                                >
                                  Accepter la mission ✦
                                </Button>
                              </div>
                            )}

                            {["assigned", "en_route", "arrived", "in_progress"].includes(m.status) && (
                              <Button
                                id={`btn_goto_dash_mish_${m.id}`}
                                onClick={() => setActiveTab("dashboard")}
                                variant="outline"
                                className="w-full text-gold bg-transparent border border-gold/30 hover:bg-white/5 cursor-pointer text-[11px] py-2 flex items-center justify-center gap-1"
                              >
                                Ouvrir dans le Terminal Actrice
                              </Button>
                            )}
                          </Card>
                        ))
                      ) : (
                        <div className="md:col-span-2 py-16 text-center text-xs font-mono text-neutral-500">
                          Aucun transfert assigné pour aujourd'hui. Profitez de ce temps libre entre les protocoles.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: WEEKLY PLANNING */}
                {activeTab === "planning" && (
                  <Card id="card_planning_calendar" className="p-6 border border-white-premium/5 bg-[#0E0E14] rounded-2xl relative shadow-md">
                    <div className="border-b border-neutral-900 pb-4 mb-6">
                      <h3 className="text-sm font-sans font-bold text-white-premium">
                        Planning Hebdomadaire Chauffeur
                      </h3>
                      <p className="text-[10px] text-neutral-400 font-sans mt-1">
                        Consultez vos tours de garde programmés pour les prochains jours de la semaine courante.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 text-xs">
                      {mockPlanningDays.map((d, index) => (
                        <div 
                          key={index} 
                          className={`p-4 rounded-xl border flex flex-col justify-between min-h-[140px] transition-all ${
                            d.busy 
                              ? "bg-gold/5 border-gold/15 hover:border-gold/30" 
                              : "bg-[#131119] border-white-premium/5"
                          }`}
                        >
                          <div>
                            <span className="text-[10px] font-mono text-neutral-500 uppercase block">{d.day}</span>
                            <span className="text-xs font-bold text-white-premium block mt-0.5">{d.date}</span>
                          </div>

                          <div className="mt-4 pt-2 border-t border-neutral-900">
                            {d.busy ? (
                              <div className="space-y-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block animate-pulse mr-1" />
                                <span className="text-[10px] font-mono text-gold font-bold uppercase">{d.missionsCount} SERVICE()</span>
                                <p className="text-[9px] text-neutral-400 mt-1 truncate">
                                  {index === 0 && activeMission ? activeMission.destination : "Liaison d'élite EASY"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-neutral-500 font-mono uppercase">LIBRE</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* TAB 4: SHIFTS HISTORY LOG LIST LIST */}
                {activeTab === "shifts_history" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center bg-[#13131B] border border-white-premium/5 rounded-xl p-4">
                      <h3 className="text-sm font-sans font-bold text-white">
                        VOTRE HISTORIQUE DE SERVICE ET D'AUDIT DU VÉHICULE
                      </h3>
                      <Button
                        id="btn_refresh_shifts"
                        onClick={loadDriverData}
                        variant="outline"
                        className="text-xs h-8 border-white-premium/15 hover:bg-white-premium/5 text-neutral-300"
                      >
                        Recharger historique
                      </Button>
                    </div>

                    <Card id="card_chauffeur_shifts_table_container" className="p-6 border border-white-premium/5 bg-[#0e0e14] rounded-2xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs text-neutral-300">
                          <thead>
                            <tr className="border-b border-neutral-900 text-[10px] font-mono uppercase text-neutral-500">
                              <th className="py-3 px-2">Date du Service</th>
                              <th className="py-3 px-2">Index initial (KM) / Batt %</th>
                              <th className="py-3 px-2">Dépôt final (KM)</th>
                              <th className="py-3 px-2">État Véhicule</th>
                              <th className="py-3 px-2">Statut du Rapport</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-900">
                            {shifts.length > 0 ? (
                              shifts.map(sh => (
                                <tr key={sh.id} className="hover:bg-[#12121A]/40">
                                  <td className="py-3.5 px-2">
                                    <div className="font-semibold text-white">{sh.date}</div>
                                    <div className="text-[9px] text-neutral-500 font-mono">Démarré à {new Date(sh.startTime).toLocaleTimeString()}</div>
                                  </td>
                                  <td className="py-3.5 px-2 font-mono">
                                    {sh.startKm} KM <span className="text-[#00C853] text-[10px] font-bold">({sh.batteryLevel || 94}%)</span>
                                  </td>
                                  <td className="py-3.5 px-2 font-mono">
                                    {sh.endConfirmed ? `${sh.endKm} KM` : <span className="text-gold font-sans text-[10px]">Service en cours</span>}
                                  </td>
                                  <td className="py-3.5 px-2">
                                    <Badge id={`badge_cleanliness_level_${sh.id}`} variant="slate" className="bg-[#12121A] text-neutral-300 border border-white-premium/5 py-0.5">
                                      {sh.cleanliness || "Excellent"}
                                    </Badge>
                                  </td>
                                  <td className="py-3.5 px-2">
                                    {sh.endConfirmed ? (
                                      <Badge id={`badge_status_cloture_${sh.id}`} variant="green" className="bg-transparent text-emerald-400 border border-emerald-500/30">
                                        ✓ Service Clôturé
                                      </Badge>
                                    ) : (
                                      <Badge id={`badge_status_en_cours_${sh.id}`} variant="gold" className="bg-transparent text-gold border border-gold/30 animate-pulse">
                                        ✦ Service Actif
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-neutral-500 font-mono">
                                  Aucun shift de service archivé à ce jour dans votre I-Logistique EASY.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
