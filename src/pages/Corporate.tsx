import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { 
  Building2, 
  Calendar, 
  FileText, 
  Download, 
  PlusCircle, 
  CheckCircle2, 
  Eye, 
  ChevronRight, 
  Activity, 
  Coins,
  ShieldCheck,
  MailWarning,
  Info,
  DollarSign,
  Users,
  UserCheck,
  Briefcase,
  History,
  Sparkles,
  MapPin,
  Clock,
  User,
  Settings
} from "lucide-react";

interface CorporateProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

export const Corporate: React.FC<CorporateProps> = ({ setCurrentPage, id }) => {
  const { user, accessToken } = useAuth();
  
  // Tab Management (6 tabs: Accueil / Nouvelle réservation / Historique / Factures / Employés / Mon profil)
  const [activeTab, setActiveTab] = useState<"dashboard" | "new_booking" | "history" | "invoices" | "employees" | "profile">("dashboard");
  
  // API and UI states
  const [loading, setLoading] = useState(true);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [corpData, setCorpData] = useState<any>(null);
  
  // Choose currency configuration (Task 5)
  const [currency, setCurrency] = useState<"FCFA" | "EUR" | "USD">("FCFA");

  // Booking Form State
  const [formVehicle, setFormVehicle] = useState("v_berline_n1");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formPickup, setFormPickup] = useState("");
  const [formDestination, setFormDestination] = useState("");
  const [formFormula, setFormFormula] = useState<"hourly" | "halfday" | "fullday">("hourly");
  const [passengerName, setPassengerName] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  // Employees list state
  const [employees, setEmployees] = useState<any[]>(() => {
    const saved = localStorage.getItem("ev_corp_employees");
    if (saved) return JSON.parse(saved);
    return [
      { id: "emp_1", name: "M. Bakary Koné", role: "Directeur Technique", email: "b.kone@orange.ci", status: "Actif", trips: 14 },
      { id: "emp_2", name: "Mme. Aminata Diallo", role: "Responsable Marketing", email: "a.diallo@orange.ci", status: "Actif", trips: 8 },
      { id: "emp_3", name: "M. Stéphane Kassi", role: "Auditeur Interne", email: "s.kassi@orange.ci", status: "Actif", trips: 5 },
      { id: "emp_4", name: "M. Jean-Philippe Yao", role: "Directeur Général Adjoint", email: "jp.yao@orange.ci", status: "Actif", trips: 22 }
    ];
  });

  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [showAddEmp, setShowAddEmp] = useState(false);

  // Save employees whenever modified
  useEffect(() => {
    localStorage.setItem("ev_corp_employees", JSON.stringify(employees));
  }, [employees]);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpEmail) return;
    const newEmp = {
      id: "emp_" + Date.now(),
      name: newEmpName,
      role: newEmpRole || "Collaborateur",
      email: newEmpEmail,
      status: "Actif",
      trips: 0
    };
    setEmployees([...employees, newEmp]);
    setNewEmpName("");
    setNewEmpRole("");
    setNewEmpEmail("");
    setShowAddEmp(false);
  };
  
  // Custom feedback banner
  const [successBanner, setSuccessBanner] = useState<{message: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Corporate Dashboard
  const loadCorporateDashboard = async () => {
    setLoading(true);
    setErrorLocal(null);
    try {
      const response = await fetch("/api/corporate/dashboard", {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error("Impossible de charger l'espace Corporate.");
      }
      const data = await response.json();
      setCorpData(data);
    } catch (e: any) {
      setErrorLocal(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadCorporateDashboard();
    }
  }, [accessToken]);

  const handleOptionToggle = (opt: string) => {
    if (selectedOptions.includes(opt)) {
      setSelectedOptions(selectedOptions.filter(o => o !== opt));
    } else {
      setSelectedOptions([...selectedOptions, opt]);
    }
  };

  // Convert prices based on currency selection (EUR / USD / FCFA)
  const handlePriceFormat = (priceNum: number) => {
    if (currency === "EUR") {
      const converted = Math.round(priceNum / 655.957);
      return "EUR " + converted.toLocaleString("en-US");
    } else if (currency === "USD") {
      const converted = Math.round(priceNum / 600);
      return "USD " + converted.toLocaleString("en-US");
    } else {
      return priceNum.toLocaleString("fr-FR") + " FCFA";
    }
  };

  // Submit Corporate reservation
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessBanner(null);
    setErrorLocal(null);

    if (!formDate || !formTime || !formPickup || !formDestination) {
      setErrorLocal("Veuillez remplir tous les champs obligatoires (*) pour continuer.");
      return;
    }

    let computedTotal = 0;
    if (!(formVehicle.includes("n3") || formVehicle.includes("prestige"))) {
      if (formFormula === "hourly") {
        computedTotal = 20000;
      } else if (formFormula === "halfday") {
        computedTotal = 110000;
      } else if (formFormula === "fullday") {
        computedTotal = 200000;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/corporate/reservations", {
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
          destination: formDestination,
          formula: formFormula,
          options: selectedOptions,
          totalPrice: computedTotal,
          clientName: passengerName || user?.name,
          specialInstructions,
          currency // saves current chosen default currency format
        })
      });

      if (!response.ok) {
        throw new Error("Échec d'enregistrement de votre transfert Corporate.");
      }

      setSuccessBanner({
        message: "Course Corporate planifiée et rattachée à votre compte différé de facturation fin de mois."
      });

      setFormDate("");
      setFormTime("");
      setFormPickup("");
      setFormDestination("");
      setPassengerName("");
      setSpecialInstructions("");
      setSelectedOptions([]);
      
      loadCorporateDashboard();
      
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

  // Test payment simulator helper
  const handleSimulatePayment = async (invoiceId: string) => {
    try {
      await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      loadCorporateDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center pt-24">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-mono text-muted-premium mt-4">Ouverture sécurisée du guichet Corporate...</p>
      </div>
    );
  }

  const kpis = corpData?.kpis || { bookingCount: 0, totalSpent: 0, pendingInvoices: 0 };
  const reservations = corpData?.reservations || [];
  const invoices = corpData?.invoices || [];

  return (
    <div id={id} className="min-h-screen bg-dark py-12 px-4 md:px-8 text-white-premium">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#11111A] p-6 rounded-xl border border-gold/15">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="text-gold" size={20} />
              <span className="text-[10px] font-mono tracking-wider uppercase text-gold-light bg-transparent border border-gold/30 px-2.5 py-0.5 rounded-full">Partenaire Corporate Grand Compte</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-sans font-bold tracking-tight mt-1.5">{user?.name}</h1>
            <p className="text-xs text-[#8A8A9A] mt-1">Espace de pilotage des courses de vos collaborateurs et de vos invités de marque.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Currency configuration selector (Task 5) */}
            <div className="bg-[#181824] p-1.5 px-3 rounded border border-white-premium/10 flex items-center gap-2">
              <Coins size={14} className="text-gold" />
              <span className="text-xs font-mono text-[#A9A9B2]">Devise d'affichage :</span>
              <div className="flex gap-1.5">
                {(["FCFA", "EUR", "USD"] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setCurrency(curr)}
                    className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                      currency === curr ? "bg-gold text-dark" : "text-[#A9A9B2] hover:text-white"
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            <Button
              id="request_corp_booking_btn"
              variant="primary"
              onClick={() => { setActiveTab("new_booking"); setSuccessBanner(null); }}
              className="flex items-center gap-1.5 font-semibold text-xs"
            >
              <PlusCircle size={15} /> Réserver Transfert
            </Button>
          </div>
        </div>

        {/* Scorecard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card id="corp_kpi_volume" className="p-5 bg-[#12121D] border-white-premium/5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#A9A9B2]">Volume de courses</p>
                <h3 className="text-2xl font-bold mt-2">{kpis.bookingCount}</h3>
              </div>
              <Activity className="text-gold" size={20} />
            </div>
            <span className="text-[10px] text-muted-premium block mt-4">Cumulé de la période</span>
          </Card>

          <Card id="corp_kpi_spent" className="p-5 bg-[#12121D] border-white-premium/5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#A9A9B2]">Total Dépenses</p>
                <h3 className="text-2xl font-bold mt-2 text-gold-light">{handlePriceFormat(kpis.totalSpent)}</h3>
              </div>
              <Coins className="text-gold-light" size={20} />
            </div>
            <span className="text-[10px] text-emerald-400 block mt-4">Facturables au prix Corporate</span>
          </Card>

          <Card id="corp_kpi_invoice" className="p-5 bg-[#12121D] border-white-premium/5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#A9A9B2]">Factures Fin de mois</p>
                <h3 className="text-2xl font-bold mt-2 text-amber-500">{kpis.pendingInvoices}</h3>
              </div>
              <FileText className="text-amber-500" size={20} />
            </div>
            <span className="text-[10px] text-[#A9A9B2] block mt-4">Débit différé consolidé</span>
          </Card>
        </div>

        {/* Tabs navigation */}
        <div className="border-b border-white-premium/5 flex flex-wrap gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`py-3 px-4 transition-all text-xs font-mono uppercase tracking-wider border-b-2 font-medium cursor-pointer ${
              activeTab === "dashboard" ? "border-gold text-gold" : "border-transparent text-[#8A8A9A] hover:text-white"
            }`}
          >
            Accueil
          </button>
          <button
            onClick={() => { setActiveTab("new_booking"); setSuccessBanner(null); }}
            className={`py-3 px-4 transition-all text-xs font-mono uppercase tracking-wider border-b-2 font-medium cursor-pointer ${
              activeTab === "new_booking" ? "border-gold text-gold" : "border-transparent text-[#8A8A9A] hover:text-white"
            }`}
          >
            Nouvelle réservation
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 transition-all text-xs font-mono uppercase tracking-wider border-b-2 font-medium cursor-pointer ${
              activeTab === "history" ? "border-gold text-gold" : "border-transparent text-[#8A8A9A] hover:text-white"
            }`}
          >
            Historique
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`py-3 px-4 transition-all text-xs font-mono uppercase tracking-wider border-b-2 font-medium cursor-pointer ${
              activeTab === "invoices" ? "border-gold text-gold" : "border-transparent text-[#8A8A9A] hover:text-white"
            }`}
          >
            Factures ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-4 transition-all text-xs font-mono uppercase tracking-wider border-b-2 font-medium cursor-pointer ${
              activeTab === "profile" ? "border-gold text-gold" : "border-transparent text-[#8A8A9A] hover:text-white"
            }`}
          >
            Mon profil
          </button>
        </div>

        {/* Viewport */}
        <div className="min-h-[400px]">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Educational Highlight: Understanding Corporate Account */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <Card id="corp_explain_1" className="p-6 bg-gradient-to-br from-[#12121E] to-[#161626] border border-white-premium/5 space-y-4">
                  <div className="w-10 h-10 bg-transparent border border-white/10 text-gold rounded-full flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-sans">Pas de Paiement Immédiat</h4>
                    <p className="text-xs text-[#8A8A9A] mt-2 leading-relaxed">
                      Vos collaborateurs et invités de marque montent à bord sans jamais débourser de frais ou de carte bancaire. La course est directement affectée à votre compte d'imputation différée.
                    </p>
                  </div>
                </Card>

                <Card id="corp_explain_2" className="p-6 bg-gradient-to-br from-[#12121E] to-[#161626] border border-white-premium/5 space-y-4">
                  <div className="w-10 h-10 bg-transparent border border-white/10 text-gold rounded-full flex items-center justify-center">
                    <Coins size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-sans">Forfaits Cléments et Prévisibles</h4>
                    <p className="text-xs text-[#8A8A9A] mt-2 leading-relaxed">
                      Chaque catégorie dispose d'un forfait fixe de base de mise à disposition comprenant <strong className="text-white">200 km inclus</strong>. Les kilomètres supplémentaires ne sont appliqués qu'au-dessus de cette limite à 1 500 FCFA/km.
                    </p>
                  </div>
                </Card>

                <Card id="corp_explain_3" className="p-6 bg-gradient-to-br from-[#12121E] to-[#161626] border border-white-premium/5 space-y-4">
                  <div className="w-10 h-10 bg-transparent border border-white/10 text-gold rounded-full flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-sans">Facture Mensuelle Consolidée</h4>
                    <p className="text-xs text-[#8A8A9A] mt-2 leading-relaxed">
                      Plus besoin de gérer des dizaines de notes de frais éparpillées. À la fin du mois, EV Premium vous édite une facture de service civil unique payable sous 15 jours.
                    </p>
                  </div>
                </Card>

              </div>

              {/* Quick Summary of pricing rules */}
              <div className="bg-[#11111A] p-5 rounded-lg border border-gold/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="text-xs font-mono uppercase text-gold">Grille Tarifaire Grand Compte</h4>
                  <div className="grid grid-cols-3 gap-6 mt-3">
                    <div>
                      <span className="text-[10px] text-[#8A8A9A] block">À l'heure</span>
                      <span className="text-sm font-bold text-white">20 000 FCFA/h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A8A9A] block">Demi-journée (8h)</span>
                      <span className="text-sm font-bold text-white">110 000 FCFA</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A8A9A] block">Journée (16h)</span>
                      <span className="text-sm font-bold text-white">200 000 FCFA</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white-premium/[0.03] p-3 rounded text-[11px] text-[#A9A9B2] max-w-md font-sans border border-white-premium/5 leading-relaxed">
                  💡 <strong className="text-white">Règle d'or :</strong> Pour le <strong className="text-white">SUV Prestige (Niveau 3)</strong>, la tarification s'effectue uniquement <strong className="text-emerald-400">Sur Devis</strong>. Pour les autres catégories, les 200 premiers km sont inclus d'office et le dépassement est de 1 500 FCFA / km.
                </div>
              </div>

              {/* Recent upcoming bookings */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#A9A9B2]">Derniers Trajets Planifiés</h3>
                  <button onClick={() => setActiveTab("history")} className="text-xs text-gold-light hover:underline flex items-center gap-1 cursor-pointer">
                    Voir tout l'Historique <ChevronRight size={12} />
                  </button>
                </div>

                <div className="bg-[#12121C] rounded-lg border border-white-premium/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#161625] border-b border-white-premium/10 text-xs font-mono text-[#8A8A9A]">
                          <th className="p-4">Numéro de Course</th>
                          <th className="p-4">Désignation Passager</th>
                          <th className="p-4">Date et Heure</th>
                          <th className="p-4">Itinéraire Électrique</th>
                          <th className="p-4">Véhicule Alloué</th>
                          <th className="p-4">Coût Forfaitaire</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white-premium/5 text-xs text-[#E1E1E6]">
                        {reservations.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-premium font-mono">
                              Aucune course corporate planifiée pour l'instant.
                            </td>
                          </tr>
                        ) : (
                          reservations.slice(0, 3).map((r: any) => (
                            <tr key={r.id} className="hover:bg-white-premium/[0.02]">
                              <td className="p-4 font-mono text-gold-light select-all">{r.id}</td>
                              <td className="p-4 font-semibold text-white">{r.clientName}</td>
                              <td className="p-4">
                                {r.departureDate} à {r.departureTime}
                              </td>
                              <td className="p-4">
                                <div className="font-medium">{r.pickup.split(',')[0]} ➜ {r.destination.split(',')[0]}</div>
                              </td>
                              <td className="p-4">
                                <span className="px-2 py-0.5 rounded bg-white-premium/5 font-semibold text-[11px] text-gold-light/90">
                                  {r.vehicleId.toLowerCase().includes("berline") ? "Berline" : r.vehicleId.toLowerCase().includes("n3") || r.vehicleId.toLowerCase().includes("prestige") ? "SUV Prestige" : "SUV Executive"}
                                </span>
                              </td>
                              <td className="p-4 font-semibold text-gold-light">
                                {handlePriceFormat(r.totalPrice)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: REQUEST FORM (Nouvelle réservation) */}
          {activeTab === "new_booking" && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="bg-[#11111A] p-5 rounded-lg border border-gold/10">
                <h3 className="text-lg font-sans font-bold text-gold">Planifier un transfert Corporate</h3>
                <p className="text-xs text-muted-premium mt-1">
                  Les réservations effectuées depuis ce guichet seront automatiquement rattachées au compte de facturation d'entreprise <strong className="text-white">{user?.name}</strong>. L'imputation comptable s'effectue automatiquement en fin de mois.
                </p>
              </div>

              {successBanner && (
                <div className="bg-transparent border border-emerald-500/30 rounded-lg p-4 text-xs font-medium text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  <span>{successBanner.message}</span>
                </div>
              )}

              <form onSubmit={handleCreateBooking} className="bg-[#12121C] p-6 rounded-lg border border-white-premium/5 space-y-5" noValidate>
                
                {errorLocal && (
                  <div className="bg-transparent border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
                    {errorLocal}
                  </div>
                )}



                {/* Vehicle and Formula */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase text-[#A9A9B2]">Type de Véhicule d'Exception *</label>
                    <select
                      value={formVehicle}
                      onChange={(e) => setFormVehicle(e.target.value)}
                      className="w-full bg-[#0D0D15] border border-white-premium/10 rounded-md p-2.5 text-sm text-white outline-none cursor-pointer"
                    >
                      <option value="v_berline_n1">Sedan Premium (Berline)</option>
                      <option value="v_suv_n2_a">SUV Executive Space</option>
                      <option value="v_suv_n3_a">SUV Prestige Sovereign</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase text-[#A9A9B2]">Durée de mise à disposition disponible *</label>
                    <select
                      value={formFormula}
                      onChange={(e: any) => setFormFormula(e.target.value)}
                      className="w-full bg-[#0D0D15] border border-white-premium/10 rounded-md p-2.5 text-sm text-white outline-none cursor-pointer"
                    >
                      <option value="hourly">À l'heure (1 heure)</option>
                      <option value="halfday">Demi-journée (8 heures)</option>
                      <option value="fullday">Journée (16 heures)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase text-[#A9A9B2]">Date de Prise en charge *</label>
                    <input 
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-[#0E0E15] border border-white-premium/10 rounded-md p-2.5 text-sm text-white outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase text-[#A9A9B2]">Heure exacte *</label>
                    <input 
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full bg-[#0E0E15] border border-white-premium/10 rounded-md p-2.5 text-sm text-white outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase text-[#A9A9B2]">Départ *</label>
                    <input 
                      type="text"
                      value={formPickup}
                      onChange={(e) => setFormPickup(e.target.value)}
                      placeholder="Ex : Bureau Plateau / Siège Orange Boulevard de la République"
                      className="w-full bg-[#0E0E15] border border-white-premium/10 rounded-md p-2.5 text-sm text-white outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase text-[#A9A9B2]">Destination *</label>
                    <input 
                      type="text"
                      value={formDestination}
                      onChange={(e) => setFormDestination(e.target.value)}
                      placeholder="Ex : Aéroport International Félix Houphouët-Boigny"
                      className="w-full bg-[#0E0E15] border border-white-premium/10 rounded-md p-2.5 text-sm text-white outline-none"
                      required
                    />
                  </div>

                </div>

                {/* Free Services panel */}
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase text-[#A9A9B2]">Services embarqués (Inclus d'office pour {user?.name})</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    <button
                      type="button"
                      onClick={() => handleOptionToggle("wifi")}
                      className={`p-3 rounded border text-left flex items-center justify-between transition-all cursor-pointer ${
                        selectedOptions.includes("wifi") ? "bg-transparent border-gold text-white" : "bg-[#0E0E15] border-white-premium/5 text-muted-premium"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Connexion Wi-Fi Très Haut Débit</span>
                        <span className="text-[10px] text-emerald-400">Inclus dans votre contrat</span>
                      </div>
                      <input type="checkbox" checked={selectedOptions.includes("wifi")} readOnly className="accent-gold" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOptionToggle("refreshments")}
                      className={`p-3 rounded border text-left flex items-center justify-between transition-all cursor-pointer ${
                        selectedOptions.includes("refreshments") ? "bg-transparent border-gold text-white" : "bg-[#0E0E15] border-white-premium/5 text-muted-premium"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Rafraîchissements d'Accueil VIP</span>
                        <span className="text-[10px] text-emerald-400">Inclus dans votre contrat</span>
                      </div>
                      <input type="checkbox" checked={selectedOptions.includes("refreshments")} readOnly className="accent-gold" />
                    </button>

                  </div>
                </div>

                {/* Final Estimated Cost and Validation */}
                <div className="pt-4 border-t border-white-premium/10 flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#8A8A9A] uppercase block">Coût Estimé pour le Forfait Établi</span>
                    <span className="text-lg font-bold text-gold-light">
                      {(() => {
                        if (formVehicle.includes("n3") || formVehicle.includes("prestige")) {
                          return "Sur devis";
                        }

                        let computedTotal = 20000;
                        if (formFormula === "halfday") {
                          computedTotal = 110000;
                        } else if (formFormula === "fullday") {
                          computedTotal = 200000;
                        }

                        return handlePriceFormat(computedTotal);
                      })()}
                    </span>
                    <span className="text-[10px] text-cyan-400 block mt-0.5">200 km inclus - Imputation différée fin de mois</span>
                  </div>
                  <Button
                    id="submit_corp_ride_btn"
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting}
                    className="font-bold shrink-0 text-black bg-gold hover:bg-gold-light px-6 py-3 text-sm rounded-lg"
                  >
                    {isSubmitting ? "Planification en cours..." : "Valider la réservation ✦"}
                  </Button>
                </div>

              </form>

            </div>
          )}

          {/* TAB 3: HISTORIQUE DETALLÉ */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="bg-[#12121C] p-5 rounded-lg border border-white-premium/5">
                <h3 className="font-sans font-bold text-base text-white">Registre complet de vos courses d'entreprise</h3>
                <p className="text-xs text-[#8A8A9A] mt-1">Consultez l'historique complet, les chauffeurs rattachés, ainsi que le statut en temps réel de chaque mission de vos collaborateurs.</p>
              </div>

              <Card id="corp_history_table_wrapper" className="bg-[#12121D] border-white-premium/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#161625] border-b border-white-premium/10 text-xs font-mono text-[#8A8A9A]">
                        <th className="p-4">Numéro de Course</th>
                        <th className="p-4">Désignation Passager</th>
                        <th className="p-4">Itinéraire Électrique</th>
                        <th className="p-4">Véhicule Alloué</th>
                        <th className="p-4">Coût Forfaitaire</th>
                        <th className="p-4">Statut Course</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white-premium/5 text-xs text-[#E1E1E6]">
                      {reservations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-premium font-mono">
                            Aucune course corporate planifiée pour l'instant.
                          </td>
                        </tr>
                      ) : (
                        reservations.map((r: any) => (
                          <tr key={r.id} className="hover:bg-white-premium/[0.02]">
                            <td className="p-4 font-mono text-gold-light select-all">{r.id}</td>
                            <td className="p-4 font-semibold text-white">{r.clientName}</td>
                            <td className="p-4">
                              <div className="font-medium">{r.pickup} ➜ {r.destination}</div>
                              <div className="text-[10px] text-[#8A8A9A] mt-0.5">{r.departureDate} &agrave; {r.departureTime}</div>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-white-premium/5 font-semibold text-[11px] text-gold-light/90">
                                {r.vehicleId.toLowerCase().includes("berline") ? "Berline" : r.vehicleId.toLowerCase().includes("n3") || r.vehicleId.toLowerCase().includes("prestige") ? "SUV Prestige" : "SUV Executive"}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-gold-light">
                              {handlePriceFormat(r.totalPrice)}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono leading-none border ${
                                r.status === "completed" || r.status === "Payée" ? "bg-transparent text-emerald-400 border-emerald-500/30" : "bg-transparent text-cyan-400 border border-cyan-500/30"
                              }`}>
                                {r.status === "pending_assignment" ? "En attente Chauffeur" : 
                                 r.status === "completed" || r.status === "Payée" ? "Mission Clôturée" : "Chauffeur Assigné"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: FACTURES MENSUELLS */}
          {activeTab === "invoices" && (
            <div className="space-y-6">
              
              <div className="bg-[#12121C] p-5 rounded-lg border border-white-premium/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-sm">Contrôle de Facturation Mensuelle Différée</h4>
                  <p className="text-xs text-[#8A8A9A] mt-1">Toutes vos navettes d'entreprise sont regroupées au terme de chaque mois de service civil sous forme d'une facture à acquitter par virement sous 15 jours.</p>
                </div>
                <div className="bg-transparent border border-gold/30 p-2.5 px-4 rounded-lg">
                  <span className="text-[10px] font-mono text-[#8A8A9A] block uppercase">Paiement consolidé</span>
                  <span className="text-base font-bold text-gold">Fin de mois</span>
                </div>
              </div>

              {/* Grid showing invoices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoices.map((inv: any) => (
                  <Card key={inv.id} id={`corp_inv_${inv.id}`} className="bg-[#12121C] border-white-premium/5 p-5 flex flex-col justify-between min-h-[160px]">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-muted-premium font-mono">Facturation : {String(inv.month).padStart(2, '0')}/{inv.year}</p>
                          <h4 className="font-sans font-bold text-white mt-1 select-all">{inv.id}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                          inv.status === "Réglée" ? "bg-transparent text-emerald-400 border border-emerald-500/30" : "bg-transparent text-amber-400 border border-amber-500/30"
                        }`}>
                          {inv.status}
                        </span>
                      </div>

                      <div className="mt-4">
                        <span className="text-[10px] text-muted-premium uppercase block font-mono">Consolidé dû :</span>
                        <h4 className="text-xl font-bold font-sans text-gold-light mt-0.5">{handlePriceFormat(inv.totalAmount)}</h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white-premium/5 mt-4 pt-4">
                      <span className="text-[10px] text-muted-premium font-mono">Échéance : 15/{String(inv.month + 1).padStart(2, '0')}/2026</span>
                      
                      <div className="flex gap-2">
                        {inv.status !== "Réglée" && (
                          <button
                             onClick={() => handleSimulatePayment(inv.id)}
                             className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded border border-gold-light/25 text-gold-light hover:bg-white/5 transition-all cursor-pointer"
                          >
                            Simuler le Règlement
                          </button>
                        )}
                        <a 
                          href={inv.pdfUrl + `?currency=${currency}`}
                          download
                          className="flex items-center gap-1.5 text-xs text-white bg-transparent hover:bg-white/5 border border-gold/40 px-3 py-1 rounded font-semibold cursor-pointer"
                        >
                          <Download size={13} /> PDF
                        </a>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Guidelines panel */}
              <div className="bg-[#11111A] p-5 rounded-lg border border-gold/10 flex items-start gap-3">
                <Info size={18} className="text-gold shrink-0 mt-0.5" />
                <div className="text-xs space-y-1 text-muted-premium">
                  <p className="font-semibold text-white">Instructions administratives :</p>
                  <p>Vos factures d'entreprise sont consolidées au format de la devise choisie ({currency}).</p>
                  <p>En cas de déplacement inter-services non alloué, veuillez transmettre un email de réajustement à : <span className="text-gold-light font-mono">coporate-accounting@easy.ci</span></p>
                </div>
              </div>

            </div>
          )}



          {/* TAB 6: MON PROFIL ENTERPRISE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              
              <div className="bg-[#12121C] p-6 rounded-lg border border-white-premium/5 space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-white-premium/10">
                  <div className="w-16 h-16 bg-transparent text-gold rounded-xl flex items-center justify-center font-sans font-black text-2xl border border-gold/30">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "OR"}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold font-sans text-white">{user?.name || "Orange Côte d'Ivoire"}</h4>
                    <p className="text-xs text-gold-light mt-0.5">Partenaire Premium - Grand Compte Intégré</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold font-mono text-gold uppercase tracking-wider">Identifiants de l'Entreprise</h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between p-2 bg-[#0E0E15] rounded">
                        <span className="text-[#8A8A9A]">Raison Sociale</span>
                        <span className="font-semibold">{user?.name} S.A</span>
                      </div>
                      <div className="flex justify-between p-2 bg-[#0E0E15] rounded text-xs">
                        <span className="text-[#8A8A9A]">Immatriculation (N° RCCM)</span>
                        <span className="font-semibold font-mono">CI-ABJ-03-2019-B12-09312</span>
                      </div>
                      <div className="flex justify-between p-2 bg-[#0E0E15] rounded text-xs">
                        <span className="text-[#8A8A9A]">Compte Contrat d'origine</span>
                        <span className="font-semibold font-mono text-gold-light">EV-PREM-OR-8822</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold font-mono text-gold uppercase tracking-wider">Paramètres de Facturation & Remise</h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between p-2 bg-[#0E0E15] rounded">
                        <span className="text-[#8A8A9A]">Cycle d'imputation comptable</span>
                        <span className="font-semibold">Mensuel (Fin de mois)</span>
                      </div>
                      <div className="flex justify-between p-2 bg-[#0E0E15] rounded">
                        <span className="text-[#8A8A9A]">Taux de Remise Grand Compte</span>
                        <span className="font-semibold text-emerald-400">10% d'office exclusif</span>
                      </div>
                      <div className="flex justify-between p-2 bg-[#0E0E15] rounded">
                        <span className="text-[#8A8A9A]">Mode de règlement conventionné</span>
                        <span className="font-semibold">Prélèvement ou Virement bancaire</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="pt-4 border-t border-white-premium/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-premium">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Contrat validé & actif pour l'exercice fiscal {new Date().getFullYear()}.</span>
                  </div>
                  <span className="text-[10px] text-[#8A8A9A]">Dernière révision: Mai 2026</span>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
