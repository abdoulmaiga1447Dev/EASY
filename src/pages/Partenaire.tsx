import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { 
  TrendingUp, 
  Calendar, 
  FileText, 
  Download, 
  ShieldCheck, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  ChevronRight, 
  Activity, 
  UserPlus, 
  MailWarning, 
  Info,
  DollarSign,
  Briefcase,
  ArrowUpDown,
  User,
  MapPin,
  Car,
  Sparkles,
  RefreshCw,
  X,
  ChevronDown,
  Check,
  AlertTriangle,
  Phone
} from "lucide-react";

const ABIDJAN_LOCATIONS = [
  { name: "Aéroport International Félix Houphouët-Boigny, Port-Bouët" },
  { name: "Sofitel Abidjan Hôtel Ivoire, Cocody" },
  { name: "Plateau, Abidjan (Quartier des Affaires)" },
  { name: "Marcory Zone 4 (Rue Pierre & Marie Curie), Abidjan" },
  { name: "Cocody Deux Plateaux Vallon, Abidjan" },
  { name: "Noom Hotel Abidjan Plateau" },
  { name: "Mövenpick Hotel Abidjan, Plateau" },
  { name: "Radisson Blu Hotel Abidjan Airport" },
  { name: "Cocody Riviera Golf, Abidjan" }
];

interface PartenaireProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

export const Partenaire: React.FC<PartenaireProps> = ({ setCurrentPage, id }) => {
  const { user, accessToken } = useAuth();
  
  // Tab Management
  const [activeTab, setActiveTab] = useState<"dashboard" | "new_booking" | "history" | "invoices">("dashboard");
  
  // API States
  const [loading, setLoading] = useState(true);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [partnerData, setPartnerData] = useState<any>(null);

  // Filters for tables
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");

  // Booking Form State
  const [formVehicle, setFormVehicle] = useState("v_berline_n1");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formPickup, setFormPickup] = useState("");
  const [formDestination, setFormDestination] = useState("");
  const [formFormula, setFormFormula] = useState<"hourly" | "halfday" | "fullday">("hourly");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  // Autocomplete suggestions
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [showPickupList, setShowPickupList] = useState(false);
  
  // Custom feedback banner after booking
  const [successBanner, setSuccessBanner] = useState<{message: string; emailSimulated: boolean} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dismissed_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const dismissNotification = (id: string) => {
    const updated = [...dismissedNotifIds, id];
    setDismissedNotifIds(updated);
    try {
      localStorage.setItem("dismissed_notifications", JSON.stringify(updated));
    } catch (e) {}
  };

  // Autocomplete for Partenaire Booking
  useEffect(() => {
    if (!showPickupList) {
      setPickupSuggestions([]);
      return;
    }

    if (!formPickup.trim()) {
      setPickupSuggestions(ABIDJAN_LOCATIONS);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/autocomplete?input=${encodeURIComponent(formPickup)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.predictions) && data.predictions.length > 0) {
            setPickupSuggestions(data.predictions);
          } else {
            const filtered = ABIDJAN_LOCATIONS.filter(loc =>
              loc.name.toLowerCase().includes(formPickup.toLowerCase())
            );
            setPickupSuggestions(filtered);
          }
        })
        .catch((err) => {
          console.error("Autocomplete fetch error, falling back", err);
          const filtered = ABIDJAN_LOCATIONS.filter(loc =>
            loc.name.toLowerCase().includes(formPickup.toLowerCase())
          );
          setPickupSuggestions(filtered);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [formPickup, showPickupList]);

  // Load Dashboard Data
  const loadDashboard = async () => {
    setLoading(true);
    setErrorLocal(null);
    try {
      const response = await fetch("/api/partner/dashboard", {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error("Impossible de charger les données partenaires.");
      }
      const data = await response.json();
      setPartnerData(data);
    } catch (e: any) {
      setErrorLocal(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadDashboard();
    }
  }, [accessToken]);

  // Handle option toggles
  const handleOptionToggle = (opt: string) => {
    if (selectedOptions.includes(opt)) {
      setSelectedOptions(selectedOptions.filter(o => o !== opt));
    } else {
      setSelectedOptions([...selectedOptions, opt]);
    }
  };

  // Submit new booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessBanner(null);
    setErrorLocal(null);

    if (!formDate || !formTime || !formPickup || !clientName || !clientPhone) {
      setErrorLocal("Veuillez remplir tous les champs obligatoires (*) pour continuer.");
      return;
    }

    // Determine booking price based on formulas
    // Berline N1: 25000, SUV N2: 45000, SUV N3: 75000
    let basePrice = 25000;
    if (formVehicle.includes("n2")) basePrice = 45000;
    if (formVehicle.includes("n3")) basePrice = 75000;

    let formulaMultiplier = 1;
    if (formFormula === "halfday") formulaMultiplier = 4;
    if (formFormula === "fullday") formulaMultiplier = 8;

    let optionsPrice = selectedOptions.length * 15000;
    const computedTotal = (basePrice * formulaMultiplier) + optionsPrice;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/partner/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          vehicleId: formVehicle,
          departureDate: formDate,
          departureTime: formTime,
          pickup: formPickup,
          destination: formDestination || "Mise à disposition",
          formula: formFormula,
          options: selectedOptions,
          totalPrice: computedTotal,
          clientName,
          clientPhone,
          specialInstructions
        })
      });

      if (!response.ok) {
        let errorMsg = "Échec de la création de la réservation.";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            if (typeof errData.error === "string") {
              errorMsg = errData.error;
            } else if (errData.error.fr) {
              errorMsg = errData.error.fr;
            } else if (errData.error.message) {
              errorMsg = errData.error.message;
            }
          }
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const resJson = await response.json();
      setSuccessBanner({
        message: "Course créée avec succès ! Un chauffeur a été assigné et un email de confirmation a été transmis à votre service de régie.",
        emailSimulated: resJson.emailSimulated
      });

      // Clear fields
      setFormDate("");
      setFormTime("");
      setFormPickup("");
      setFormDestination("");
      setClientName("");
      setClientPhone("");
      setSpecialInstructions("");
      setSelectedOptions([]);
      
      // Reload back office numbers
      loadDashboard();
      
      // Auto transition back after 3 seconds
      setTimeout(() => {
        setActiveTab("dashboard");
        setSuccessBanner(null);
      }, 4000);

    } catch (e: any) {
      setErrorLocal(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper payment trigger for testing invoice PDF status transitions
  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        loadDashboard();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const executeCancel = async (resId: string) => {
    try {
      setErrorLocal(null);
      const response = await fetch(`/api/reservations/${resId}/cancel`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Échec de l'annulation.");
      }
      loadDashboard();
    } catch (err: any) {
      setErrorLocal(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center pt-24">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-mono text-muted-premium mt-4">Initialisation de votre passerelle partenaire...</p>
      </div>
    );
  }

  // Calculated values
  const kpis = partnerData?.kpis || { bookingCount: 0, totalRevenue: 0, commissionAmount: 0, pendingInvoices: 0 };
  const currentMonthReservations = partnerData?.currentMonthReservations || [];
  const allReservations = partnerData?.allReservations || [];
  const invoices = partnerData?.invoices || [];
  const partnerProfile = partnerData?.partner || { companyName: "", commissionRate: 12 };

  // Filters math
  const filteredCurrentRides = allReservations.filter((r: any) => {
    // Only pending/active ones, i.e. not confirmed (dispositionConfirmed) and not cancelled
    if (r.dispositionConfirmed === true || r.status === "cancelled") return false;
    if (statusFilter === "all") return true;
    return r.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const filteredHistoryRides = allReservations.filter((r: any) => {
    // Only confirmed (dispositionConfirmed) or cancelled ones
    if (r.dispositionConfirmed !== true && r.status !== "cancelled") return false;
    if (monthFilter !== "all") {
      const m = new Date(r.departureDate).getMonth() + 1;
      if (parseInt(monthFilter) !== m) return false;
    }
    if (vehicleFilter !== "all" && !r.vehicleId.includes(vehicleFilter)) return false;
    if (statusFilter !== "all" && r.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    return true;
  });

  // Computed price helper for real-time display in the transaction card
  const getComputedPrice = () => {
    let basePrice = 25000;
    if (formVehicle.includes("n2")) basePrice = 45000;
    if (formVehicle.includes("n3")) basePrice = 75000;

    let formulaMultiplier = 1;
    if (formFormula === "halfday") formulaMultiplier = 4;
    if (formFormula === "fullday") formulaMultiplier = 8;

    let optionsPrice = selectedOptions.length * 15000;
    return (basePrice * formulaMultiplier) + optionsPrice;
  };

  return (
    <div id={id} className="min-h-screen bg-[#07070A] text-[#F3F4F6] py-10 px-4 lg:px-8 font-sans relative overflow-hidden">
      
      {/* Immersive radial glows */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-amber-500/5 blur-[130px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Top Header Panel (matching "hyloSOL - 14 Apr 2026" header structure) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/[0.04]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600/20 via-[#C5A880]/15 to-transparent border border-white/[0.08] flex items-center justify-center shadow-[0_0_20px_rgba(197,168,128,0.05)] mt-1 shrink-0">
              <ShieldCheck className="text-[#C5A880]" size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">{partnerProfile.companyName}</h1>
                <span className="text-[10px] font-mono tracking-widest uppercase bg-white/[0.04] text-[#C5A880] border border-[#C5A880]/30 px-2.5 py-0.5 rounded">
                  PT-{partnerProfile.companyName?.toUpperCase().replace(/\s+/g, '')}-2026
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono tracking-wider text-emerald-400 bg-transparent px-2.5 py-0.5 rounded border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Partenaire Agréé
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                01 Espace Régie — Suivi des transferts officiels, commissions en temps réel à un taux contractuel de <strong className="text-white">{partnerProfile.commissionRate}%</strong> et facturation différée simplifiée.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={loadDashboard}
              className="p-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl text-neutral-400 hover:text-white transition-all hover:bg-white/[0.06] cursor-pointer"
              title="Rafraîchir les statistiques"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-mono uppercase text-neutral-500">Service de Régie</p>
              <p className="text-xs text-neutral-300 font-medium font-mono">regie-compta@easy.ci</p>
            </div>
          </div>
        </div>

        {/* Split Screen Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: Dashboards, KPIs, Tables & Lists */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Segmented Tab Bar Selector */}
            <div className="flex bg-[#0B0C12]/80 p-1.5 rounded-xl border border-white/[0.04] w-fit">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-5 py-2 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-white/[0.06] border border-white/[0.08] text-white shadow-xl shadow-black/40"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Aperçu Général
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-5 py-2 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-white/[0.06] border border-white/[0.08] text-white shadow-xl shadow-black/40"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Détails & Commissions
              </button>
              <button
                onClick={() => setActiveTab("invoices")}
                className={`px-5 py-2 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                  activeTab === "invoices"
                    ? "bg-white/[0.06] border border-white/[0.08] text-white shadow-xl shadow-black/40"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Factures Mensuelles ({invoices.length})
              </button>
            </div>

            {/* TAB 1: OVERVIEW DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">

                {/* NOTIFICATIONS SECTION */}
                {(() => {
                  const notifiedReservations = allReservations.filter(
                    r => (r.status === "confirmed" || r.status === "cancelled") && !dismissedNotifIds.includes(r.id)
                  );
                  if (notifiedReservations.length === 0) return null;
                  
                  // Show the most recent 3 notifications
                  const recentNotifs = [...notifiedReservations]
                    .sort((a, b) => new Date(b.createdAt || b.departureDate).getTime() - new Date(a.createdAt || a.departureDate).getTime())
                    .slice(0, 3);
                    
                  return (
                    <div className="bg-[#0B0C12]/95 border border-white/[0.05] rounded-2xl p-4 space-y-3 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#C5A880]/30 to-transparent" />
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">
                        <span className="w-2 h-2 rounded-full bg-[#C5A880] animate-ping" />
                        <span>Notifications de la Régie Easy</span>
                      </div>
                      <div className="space-y-2">
                        {recentNotifs.map((r) => (
                          <div 
                            key={`notif_${r.id}`}
                            className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                              r.status === "confirmed"
                                ? "bg-transparent border-emerald-500/10 text-emerald-400/90"
                                : "bg-transparent border-red-500/10 text-red-400/90"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${r.status === "confirmed" ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                              <span className="font-sans leading-relaxed">
                                {r.status === "confirmed" ? (
                                  <>La commande de transfert VIP pour <strong>{r.clientName}</strong> prévue le {r.departureDate} à {r.departureTime} a été <strong>validée</strong>. Commission créditée : <strong>+{(r.totalPrice * (partnerProfile.commissionRate / 100)).toLocaleString("fr-FR")} F</strong></>
                                ) : (
                                  <>La commande de transfert VIP pour <strong>{r.clientName}</strong> prévue le {r.departureDate} à {r.departureTime} a été <strong>rejetée</strong> par la régie d'Abidjan.</>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <span className="text-[9px] font-mono text-neutral-500 whitespace-nowrap">
                                ID: {r.id.toUpperCase().substring(0, 8)}
                              </span>
                              <button
                                onClick={() => dismissNotification(r.id)}
                                className="p-1 hover:bg-white/10 rounded-full text-neutral-500 hover:text-white transition-colors cursor-pointer"
                                title="Fermer la notification"
                              >
                                <X size={12} className="stroke-[2.5px]" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                {/* 4 Glowing KPI Metric Cards (Inspired by top metric blocks) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  <div className="bg-[#0D0E15]/90 border border-white/[0.04] rounded-xl p-4 relative overflow-hidden group hover:border-white/[0.08] transition-all">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
                    <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Courses Totales</p>
                    <div className="flex justify-between items-baseline mt-2">
                      <span className="text-2xl font-bold text-white tracking-tight">{kpis.bookingCount}</span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-transparent px-1.5 py-0.5 rounded border border-emerald-500/20">actif</span>
                    </div>
                    <div className="h-[2px] w-full bg-white/[0.03] rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-purple-500/40 rounded-full transition-all duration-500" style={{ width: `${kpis.bookingCount > 0 ? Math.min(100, (kpis.bookingCount / 20) * 100) : 0}%` }} />
                    </div>
                  </div>

                  <div className="bg-[#0D0E15]/90 border border-white/[0.04] rounded-xl p-4 relative overflow-hidden group hover:border-white/[0.08] transition-all">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                    <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Volume d'Affaire</p>
                    <div className="flex justify-between items-baseline mt-2">
                      <span className="text-lg font-bold text-white tracking-tight font-mono">
                        {kpis.totalRevenue.toLocaleString("fr-FR")}
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400">CFA</span>
                    </div>
                    <div className="h-[2px] w-full bg-white/[0.03] rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-amber-500/40 rounded-full transition-all duration-500" style={{ width: `${kpis.totalRevenue > 0 ? Math.min(100, (kpis.totalRevenue / 1000000) * 100) : 0}%` }} />
                    </div>
                  </div>

                  <div className="bg-[#0D0E15]/90 border border-white/[0.04] rounded-xl p-4 relative overflow-hidden group hover:border-white/[0.08] transition-all">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#34D399]">Commissions</p>
                    <div className="flex justify-between items-baseline mt-2">
                      <span className="text-lg font-bold text-emerald-400 tracking-tight font-mono">
                        {kpis.commissionAmount.toLocaleString("fr-FR")}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400">CFA</span>
                    </div>
                    <div className="h-[2px] w-full bg-white/[0.03] rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-emerald-400/40 rounded-full transition-all duration-500" style={{ width: `${kpis.commissionAmount > 0 ? Math.min(100, (kpis.commissionAmount / 120000) * 100) : 0}%` }} />
                    </div>
                  </div>

                  <div className="bg-[#0D0E15]/90 border border-white/[0.04] rounded-xl p-4 relative overflow-hidden group hover:border-white/[0.08] transition-all">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
                    <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Factures En Attente</p>
                    <div className="flex justify-between items-baseline mt-2">
                      <span className="text-2xl font-bold text-amber-400 tracking-tight">{kpis.pendingInvoices}</span>
                      <span className="text-[9px] font-mono text-amber-400 bg-transparent px-1.5 py-0.5 rounded border border-amber-500/20">à régler</span>
                    </div>
                    <div className="h-[2px] w-full bg-white/[0.03] rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-rose-500/40 rounded-full transition-all duration-500" style={{ width: `${kpis.pendingInvoices > 0 ? Math.min(100, (kpis.pendingInvoices / 5) * 100) : 0}%` }} />
                    </div>
                  </div>

                </div>

                {/* Main Table Panel: Recent Rides */}
                <div className="bg-[#0B0C12]/90 border border-white/[0.04] rounded-2xl overflow-hidden shadow-2xl relative">
                  
                  <div className="p-5 border-b border-white/[0.04] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <h3 className="font-bold text-white text-sm">Courses Récentes du Mois</h3>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">Aperçu en temps réel des courses et demandes de conciergerie différées</p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-neutral-400 shrink-0">Statut :</span>
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-[#12131C] border border-white/[0.06] text-xs p-2 text-white rounded-xl outline-none cursor-pointer focus:border-[#C5A880]/40 transition-all font-mono"
                      >
                        <option value="all">Tous</option>
                        <option value="À facturer">À facturer</option>
                        <option value="Payée">Réglée</option>
                        <option value="pending_assignment">En attente</option>
                        <option value="completed">Terminée</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.01] border-b border-white/[0.04] text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                          <th className="p-4">Référence</th>
                          <th className="p-4">Client Final</th>
                          <th className="p-4">Trajet / Détail</th>
                          <th className="p-4">Catégorie</th>
                          <th className="p-4 text-right">Tarif HT</th>
                          <th className="p-4 text-center">Statut</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03] text-xs text-neutral-300">
                        {filteredCurrentRides.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-12 text-center text-neutral-500 font-mono">
                              Aucun transfert enregistré pour ce mois.
                            </td>
                          </tr>
                        ) : (
                          filteredCurrentRides.map((r: any) => (
                            <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 font-mono">
                                <div className="text-white font-medium select-all">{r.id}</div>
                                <div className="text-[9px] text-neutral-500 mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</div>
                              </td>
                              <td className="p-4">
                                <div className="font-semibold text-white">{r.clientName || "Non spécifié"}</div>
                                <div className="text-[9px] text-neutral-500 font-mono mt-0.5">Régie Partenaire</div>
                              </td>
                              <td className="p-4">
                                <div className="font-medium text-white truncate max-w-[180px]">{r.pickup?.split(',')[0]} ➜ {r.destination?.split(',')[0]}</div>
                                <div className="text-[9px] text-neutral-500 uppercase font-mono mt-0.5">Formule : {r.formula === "hourly" ? "Horaire" : r.formula === "halfday" ? "Demi-journée" : "Journée"}</div>
                              </td>
                              <td className="p-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
                                  {r.vehicleId?.toLowerCase().includes("berline") ? "Berline" : r.vehicleId?.toLowerCase().includes("n3") || r.vehicleId?.toLowerCase().includes("prestige") ? "SUV Prestige" : "SUV Executive"}
                                </span>
                              </td>
                              <td className="p-4 text-right font-semibold text-[#C5A880] font-mono">
                                {r.totalPrice?.toLocaleString("fr-FR")} F
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${
                                  r.status === "À facturer" ? "bg-transparent text-cyan-400 border-cyan-500/20" :
                                  r.status === "Payée" ? "bg-transparent text-emerald-400 border-emerald-500/20" :
                                  r.status === "completed" ? "bg-transparent text-emerald-400 border-emerald-500/20" :
                                  r.status === "confirmed" ? "bg-transparent text-emerald-400 border-emerald-500/25" :
                                  r.status === "cancelled" ? "bg-transparent text-red-400 border-red-500/20" :
                                  "bg-transparent text-amber-400 border-amber-500/20"
                                }`}>
                                  {r.status === "À facturer" ? "À facturer" : r.status === "Payée" || r.status === "completed" ? "Solder" : r.status === "confirmed" ? "Validée" : r.status === "cancelled" ? "Rejetée" : "En cours"}
                                </span>
                              </td>
                              <td className="p-4 text-center font-mono">
                                {r.status !== "cancelled" && r.status !== "completed" && r.status !== "Payée" ? (
                                  confirmingCancelId === r.id ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        id={`confirm_yes_${r.id}`}
                                        onClick={() => {
                                          executeCancel(r.id);
                                          setConfirmingCancelId(null);
                                        }}
                                        className="bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-1 text-[9px] rounded transition-all cursor-pointer"
                                      >
                                        Oui
                                      </button>
                                      <button
                                        id={`confirm_no_${r.id}`}
                                        onClick={() => setConfirmingCancelId(null)}
                                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 text-[9px] rounded transition-all cursor-pointer"
                                      >
                                        Non
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      id={`cancel_btn_${r.id}`}
                                      onClick={() => setConfirmingCancelId(r.id)}
                                      className="bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 text-[10px] rounded font-medium transition-all cursor-pointer hover:border-red-500/40"
                                    >
                                      Annuler
                                    </button>
                                  )
                                ) : (
                                  <span className="text-neutral-600 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: DETAILS & RETROCESSION HISTORIQUE */}
            {activeTab === "history" && (
              <div className="space-y-6">
                
                {/* Projections & Trend Box */}
                <div className="bg-[#0B0C12]/90 border border-white/[0.04] rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-[-50%] right-[-10%] w-72 h-72 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                  
                  <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 bg-transparent px-2 py-1 rounded border border-emerald-500/20 inline-block">
                    PROJECTION DES RÉTROCESSIONS DE COMMISSIONS
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
                      <p className="text-xs text-neutral-400">Mois Précédent (Mai 2026)</p>
                      <p className="text-xl font-bold text-white mt-1.5 font-mono">480 000 FCFA</p>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-mono">
                        <TrendingUp size={12} />
                        <span>Rétrocession ({partnerProfile.commissionRate}%) : {(480000 * (partnerProfile.commissionRate/100)).toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
                      <p className="text-xs text-neutral-400">Mois en cours (Juin 2026 - En cours)</p>
                      <p className="text-xl font-bold text-white mt-1.5 font-mono">
                        {allReservations.filter((r: any) => new Date(r.departureDate).getMonth() + 1 === 6).reduce((sum: number, r: any) => sum + r.totalPrice, 0).toLocaleString("fr-FR")} FCFA
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-amber-500 mt-2 font-mono">
                        <Clock size={12} />
                        <span>Provision ({partnerProfile.commissionRate}%) : {Math.round(allReservations.filter((r: any) => new Date(r.departureDate).getMonth() + 1 === 6).reduce((sum: number, r: any) => sum + r.totalPrice, 0) * (partnerProfile.commissionRate/100)).toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* History list filters */}
                <div className="bg-[#0B0C12]/90 border border-white/[0.04] p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-white text-sm">Registre d'Historique des Rétrocessions</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">Filtrez et exportez vos relevés pour les réconciliations de trésorerie.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select 
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="bg-[#12131C] border border-white/[0.06] text-xs p-2.5 rounded-xl text-white outline-none cursor-pointer font-mono"
                    >
                      <option value="all">Tous les mois</option>
                      <option value="5">Mai 2026</option>
                      <option value="6">Juin 2026</option>
                    </select>

                    <select 
                      value={vehicleFilter}
                      onChange={(e) => setVehicleFilter(e.target.value)}
                      className="bg-[#12131C] border border-white/[0.06] text-xs p-2.5 rounded-xl text-white outline-none cursor-pointer font-mono"
                    >
                      <option value="all">Tous les modèles</option>
                      <option value="berline">Berlines uniquement</option>
                      <option value="suv">SUV uniquement</option>
                    </select>
                  </div>
                </div>

                {/* Historical rides table */}
                <div className="bg-[#0B0C12]/90 border border-white/[0.04] rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.01] border-b border-white/[0.04] text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                          <th className="p-4">Référence</th>
                          <th className="p-4">Passager</th>
                          <th className="p-4">Planning</th>
                          <th className="p-4 text-right">Montant Global</th>
                          <th className="p-4 text-right">Retro ({partnerProfile.commissionRate}%)</th>
                          <th className="p-4 text-center">Règlement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03] text-xs text-neutral-300">
                        {filteredHistoryRides.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-neutral-500 font-mono">
                              Aucune course correspondante dans l'historique.
                            </td>
                          </tr>
                        ) : (
                          filteredHistoryRides.map((r: any) => (
                            <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 font-mono font-medium text-white">{r.id}</td>
                              <td className="p-4 font-semibold text-white">{r.clientName || "Non spécifié"}</td>
                              <td className="p-4 font-mono">{r.departureDate} @ {r.departureTime}</td>
                              <td className="p-4 text-right font-semibold font-mono">{r.totalPrice?.toLocaleString("fr-FR")} F</td>
                              <td className="p-4 text-right font-semibold text-emerald-400 font-mono">+{Math.round(r.totalPrice * (partnerProfile.commissionRate / 100)).toLocaleString("fr-FR")} F</td>
                              <td className="p-4 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase border ${
                                  r.status === "cancelled" ? "bg-transparent text-red-400 border-red-500/20" :
                                  r.status === "confirmed" ? "bg-transparent text-emerald-400 border-emerald-500/25" :
                                  r.status === "À facturer" ? "bg-transparent text-amber-400 border-amber-500/20" : "bg-transparent text-emerald-400 border-emerald-500/20"
                                }`}>
                                  {r.status === "cancelled" ? "Rejetée" : r.status === "confirmed" ? "Validée" : r.status === "À facturer" ? "En attente" : "Réglée"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: INVOICES (FACTURATION MENSUELLE) */}
            {activeTab === "invoices" && (
              <div className="space-y-6">
                
                {/* Intro Invoices Info Card */}
                <div className="bg-[#0B0C12]/90 border border-white/[0.04] p-5 rounded-2xl">
                  <h4 className="font-bold text-white text-sm">Passerelle de Télépaiement & Facturation Mensuelle</h4>
                  <p className="text-xs text-neutral-400 mt-1">Consultez, réglez vos relevés mensuels par prélèvements et téléchargez vos documents comptables certifiés.</p>
                </div>

                {/* Invoices grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {invoices.map((inv: any) => (
                    <div key={inv.id} className="bg-[#0B0C12]/90 border border-white/[0.04] rounded-2xl p-5 relative flex flex-col justify-between hover:border-white/[0.08] transition-all min-h-[190px]">
                      
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C5A880]/20 to-transparent" />
                      
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Relevé de Période : {String(inv.month).padStart(2, '0')}/{inv.year}</p>
                            <h4 className="text-sm font-mono font-bold text-white mt-1.5 select-all">{inv.id}</h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${
                            inv.status === "Réglée" ? "bg-transparent text-emerald-400 border-emerald-500/25" : "bg-transparent text-amber-400 border-amber-500/25 animate-pulse"
                          }`}>
                            {inv.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-5 text-xs font-mono">
                          <div>
                            <p className="text-neutral-500 text-[10px]">Volume d'Affaire :</p>
                            <p className="text-white mt-1 font-sans font-semibold text-sm">{inv.totalAmount.toLocaleString("fr-FR")} F</p>
                          </div>
                          <div>
                            <p className="text-neutral-500 text-[10px]">Retro ({partnerProfile.commissionRate}%) :</p>
                            <p className="text-emerald-400 mt-1 font-sans font-semibold text-sm">-{inv.commissionAmount.toLocaleString("fr-FR")} F</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/[0.04] mt-5 flex items-center justify-between">
                        <div>
                          <p className="text-neutral-500 text-[9px]">Solde Net à Régler :</p>
                          <p className="text-sm font-bold text-[#C5A880] mt-0.5 font-mono">{(inv.totalAmount - inv.commissionAmount).toLocaleString("fr-FR")} FCFA</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {inv.status !== "Réglée" && (
                            <button
                              onClick={() => handleMarkAsPaid(inv.id)}
                              className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-xl border border-[#C5A880]/30 bg-transparent hover:bg-white/[0.04] text-[#C5A880] transition-all cursor-pointer font-bold uppercase"
                              title="Indiquer l'encaissement de la facture pour cette démo"
                            >
                              Solder
                            </button>
                          )}
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            download
                            className="flex items-center gap-1.5 text-[11px] text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer"
                            title="Télécharger le fichier PDF officiel"
                          >
                            <Download size={12} /> PDF
                          </a>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Directives */}
                <div className="bg-[#0B0C12]/90 border border-white/[0.04] p-5 rounded-2xl flex items-start gap-3">
                  <Info size={16} className="text-[#C5A880] shrink-0 mt-0.5" />
                  <div className="text-xs text-neutral-400 space-y-1">
                    <p className="font-semibold text-white">Directives Administratives de Raccordement :</p>
                    <p>Les virements de rétrocession des commissions partenaires sont ordonnées par EV Premium Abidjan le 5 de chaque mois échu.</p>
                    <p>En cas d'anomalie sur un relevé kilométrique, veuillez contacter la compta par email: <span className="text-[#C5A880] font-mono">regie-compta@easy.ci</span></p>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* RIGHT SIDE: Dedicated Transaction Card (Formulaire de Réservation - Inspired by Buy/Sell card) */}
          <div className="lg:col-span-4 bg-[#0B0C12]/95 border border-white/[0.06] rounded-2xl p-5 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C5A880]/40 to-transparent" />
            
            {/* Header: Buy / Sell style tab switcher */}
            <div className="grid grid-cols-2 bg-white/[0.02] p-1 rounded-xl border border-white/[0.04] mb-5">
              <button
                type="button"
                onClick={() => setFormFormula("hourly")}
                className={`py-2 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                  formFormula === "hourly"
                    ? "bg-[#181924] border border-white/[0.06] text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Forfait Horaire (1h)
              </button>
              <button
                type="button"
                onClick={() => setFormFormula("halfday")}
                className={`py-2 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                  formFormula === "halfday" || formFormula === "fullday"
                    ? "bg-[#181924] border border-white/[0.06] text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Mise à Disposition
              </button>
            </div>

            {/* Secondary formula selection dropdown (only if mise à disposition is chosen) */}
            {(formFormula === "halfday" || formFormula === "fullday") && (
              <div className="mb-4">
                <select
                  value={formFormula}
                  onChange={(e: any) => setFormFormula(e.target.value)}
                  className="w-full bg-[#141520] border border-white/[0.06] text-xs p-2.5 rounded-xl text-neutral-300 outline-none cursor-pointer focus:border-[#C5A880]/40 transition-all font-sans font-semibold"
                >
                  <option value="halfday">Demi-Journée (Mise à Disposition 4 Heures)</option>
                  <option value="fullday">Journée Complète (Mise à Disposition 8 Heures)</option>
                </select>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateBooking} className="space-y-4" noValidate>
              
              {/* Success Notification */}
              {successBanner && (
                <div className="bg-transparent border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-xs flex gap-2.5">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">Course planifiée !</h5>
                    <p className="mt-1 leading-relaxed text-emerald-400/80">{successBanner.message}</p>
                  </div>
                </div>
              )}

              {/* Error Alert Box (resembles "Insufficient balance" alert bar) */}
              {errorLocal && (
                <div className="bg-transparent border border-red-500/20 rounded-xl p-3.5 text-xs text-red-400 flex items-start gap-2.5">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-mono">{errorLocal}</p>
                </div>
              )}

              {/* INPUT CONTAINER 1: Client VIP (equivalent to "You Invest" block) */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-neutral-500">NOM DU PASSAGER VIP</span>
                  <span className="text-[#C5A880] uppercase tracking-wider font-semibold bg-transparent px-2 py-0.5 rounded border border-[#C5A880]/15">
                    Régie Différée
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/[0.03] border border-white/[0.05] rounded-xl shrink-0">
                    <User size={16} className="text-[#C5A880]" />
                  </div>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="M. Jean-Louis Dupont (Ministère)"
                    className="w-full bg-transparent text-sm text-white placeholder-neutral-600 outline-none focus:placeholder-neutral-500 font-medium"
                  />
                </div>

                <div className="pt-2 border-t border-white/[0.02] flex justify-between items-center text-[10px] text-neutral-500">
                  <span>Code Client : AUTOMATIQUE</span>
                  <span className="font-mono">Plafond Actif</span>
                </div>
              </div>

              {/* INPUT CONTAINER 1.5: Numéro de téléphone du passager VIP */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-neutral-500">TÉLÉPHONE DU PASSAGER VIP *</span>
                  <span className="text-[#C5A880] uppercase tracking-wider font-semibold">
                    Contact Chauffeur
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/[0.03] border border-white/[0.05] rounded-xl shrink-0">
                    <Phone size={16} className="text-[#C5A880]" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Ex: +225 07 08 09 10 11"
                    className="w-full bg-transparent text-sm text-white placeholder-neutral-600 outline-none focus:placeholder-neutral-500 font-medium"
                  />
                </div>
              </div>

              {/* INPUT CONTAINER 2: Vehicle Choice */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-neutral-500">GAMME DU VÉHICULE VIP</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Disponible
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/[0.03] border border-white/[0.05] rounded-xl shrink-0">
                    <Car size={16} className="text-white" />
                  </div>
                  <select
                    value={formVehicle}
                    onChange={(e) => setFormVehicle(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none cursor-pointer font-semibold"
                  >
                    <option value="v_berline_n1" className="bg-[#141520] text-white">Berline Premium (Berline d'Exception)</option>
                    <option value="v_suv_n2" disabled className="bg-[#141520] text-neutral-500 cursor-not-allowed">SUV Executive (Indisponible pour ce service)</option>
                    <option value="v_suv_n3" disabled className="bg-[#141520] text-neutral-500 cursor-not-allowed">SUV Prestige (Indisponible pour ce service)</option>
                  </select>
                </div>
              </div>

              {/* INPUT CONTAINER 3: Trajets & Itinéraire (Mise à disposition) */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3 relative z-30">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-neutral-500">LIEU DE PRISE EN CHARGE (MISE À DISPOSITION)</span>
                  <span className="text-neutral-400">Abidjan, CI</span>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <MapPin size={14} className="text-[#C5A880] shrink-0" />
                    <input
                      type="text"
                      required
                      value={formPickup}
                      onFocus={() => setShowPickupList(true)}
                      onBlur={() => setTimeout(() => setShowPickupList(false), 250)}
                      onChange={(e) => {
                        setFormPickup(e.target.value);
                        setShowPickupList(true);
                      }}
                      placeholder="Départ (ex: Aéroport Abidjan VIP, Hôtel, Bureau...)"
                      className="w-full bg-transparent text-xs text-white placeholder-neutral-600 outline-none font-medium"
                    />
                  </div>

                  {showPickupList && pickupSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-[#111119] border border-white/[0.08] rounded-lg max-h-48 overflow-y-auto shadow-2xl divide-y divide-white/[0.03]">
                      {pickupSuggestions.map((loc, idx) => (
                        <div
                          key={`${loc.name}-${idx}`}
                          onClick={() => {
                            setFormPickup(loc.name);
                            setShowPickupList(false);
                          }}
                          className="p-3 text-xs text-neutral-300 hover:text-white hover:bg-[#C5A880]/10 cursor-pointer transition-colors flex items-center gap-2"
                        >
                          <MapPin size={11} className="text-[#C5A880]" />
                          <span>{loc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* INPUT CONTAINER 4: Planning (Date & Time) */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-neutral-500 uppercase block">Date de Prise en Charge</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-white/[0.02] border border-white/[0.05] rounded-lg p-2 text-xs text-white outline-none focus:border-[#C5A880]/30 font-mono"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-neutral-500 uppercase block">Heure Exacte</label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/[0.05] rounded-lg p-2 text-xs text-white outline-none focus:border-[#C5A880]/30 font-mono"
                  />
                </div>
              </div>

              {/* Special Instructions (Welcome Signs etc) */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3">
                <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-1">Instructions Conciergerie VIP</label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Ex: Accueil pancarte nominative pavillon d'honneur"
                  className="w-full bg-transparent text-xs text-white placeholder-neutral-600 outline-none"
                />
              </div>

              {/* Net Fixed APY box (Real-time partner rebate projection!) */}
              <div className="bg-transparent border border-emerald-500/15 rounded-xl p-3.5 flex justify-between items-center text-xs">
                <span className="text-neutral-400 font-mono">Commission Estimée ({partnerProfile.commissionRate}%) :</span>
                <span className="text-emerald-400 font-bold font-mono">
                  + {Math.round(getComputedPrice() * (partnerProfile.commissionRate / 100)).toLocaleString("fr-FR")} FCFA
                </span>
              </div>

              {/* Total Price Statement */}
              <div className="pt-2 flex justify-between items-baseline">
                <span className="text-xs text-neutral-400">Tarif Consolide Forfait :</span>
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-[#C5A880]">
                  {getComputedPrice().toLocaleString("fr-FR")} FCFA
                </span>
              </div>

              {/* Big CTA Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#C5A880] to-[#E5C8A0] text-black font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer text-center block"
              >
                {isSubmitting ? "Enregistrement en cours..." : "Confirmer le transfert VIP"}
              </button>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

