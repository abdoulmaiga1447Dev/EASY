import React, { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { 
  Calendar, Clock, MapPin, User, Phone, Trash2, Edit3, Save, X,
  Compass, AlertTriangle, Loader2, Check, ExternalLink, ArrowLeft, RefreshCw
} from "lucide-react";

interface CommandesProps {
  setCurrentPage: (page: string) => void;
  id?: string;
}

export const Commandes: React.FC<CommandesProps> = ({
  setCurrentPage,
}) => {
  const { translate } = useLanguage();
  const { accessToken, user, isAuthenticated } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // States for Cancel confirmation
  const [showConfirmCancelId, setShowConfirmCancelId] = useState<string | null>(null);
  
  // States for Delete confirmation
  const [showConfirmDeleteId, setShowConfirmDeleteId] = useState<string | null>(null);
  
  // States for Edit Mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPickup, setEditPickup] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchReservations = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const activeToken = accessToken || localStorage.getItem("ev_access_token");
      const res = await fetch("/api/reservations", {
        headers: {
          "Authorization": `Bearer ${activeToken || ""}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const valid = (data.reservations || []).filter((r: any) => r && typeof r === "object");
        // Sort reservations by date safely (newest first)
        const sorted = valid.sort((a: any, b: any) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        setReservations(sorted);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Erreur de récupération des commandes");
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setErrorMessage("Impossible de se connecter au serveur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [accessToken]);

  const handleCancelBooking = async (id: string) => {
    setActionLoadingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const activeToken = accessToken || localStorage.getItem("ev_access_token");
      const res = await fetch(`/api/reservations/${id}/cancel`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken || ""}`
        }
      });

      if (res.ok) {
        setReservations(prev => 
          prev.map(r => r.id === id ? { ...r, status: "cancelled" } : r)
        );
        setSuccessMessage("La commande a été annulée avec succès.");
        setShowConfirmCancelId(null);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Une erreur est survenue lors de l'annulation.");
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
      setErrorMessage("Une erreur réseau empêche l'annulation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    setActionLoadingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const activeToken = accessToken || localStorage.getItem("ev_access_token");
      const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${activeToken || ""}`
        }
      });

      if (res.ok) {
        setReservations(prev => prev.filter(r => r.id !== id));
        setSuccessMessage("La commande a été supprimée définitivement.");
        setShowConfirmDeleteId(null);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Une erreur est survenue lors de la suppression.");
      }
    } catch (err) {
      console.error("Error deleting booking:", err);
      setErrorMessage("Une erreur réseau empêche la suppression.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditPickup(item.pickup || "");
    setEditDestination(item.destination || "");
    setEditDate(item.departureDate || "");
    setEditTime(item.departureTime || "");
    setEditClientName(item.clientName || user?.name || "");
    setEditClientPhone(item.clientPhone || user?.phone || "");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editPickup.trim() || !editDestination.trim() || !editDate || !editTime) {
      setErrorMessage("Veuillez remplir tous les champs requis.");
      return;
    }

    setActionLoadingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const activeToken = accessToken || localStorage.getItem("ev_access_token");
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken || ""}`
        },
        body: JSON.stringify({
          pickup: editPickup,
          destination: editDestination,
          departureDate: editDate,
          departureTime: editTime,
          clientName: editClientName,
          clientPhone: editClientPhone,
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReservations(prev => 
          prev.map(r => r.id === id ? { 
            ...r, 
            pickup: editPickup, 
            destination: editDestination, 
            departureDate: editDate, 
            departureTime: editTime,
            clientName: editClientName,
            clientPhone: editClientPhone
          } : r)
        );
        setSuccessMessage("La réservation a été modifiée avec succès.");
        setEditingId(null);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Une erreur est survenue lors de la modification.");
      }
    } catch (err) {
      console.error("Error saving edit:", err);
      setErrorMessage("Une erreur de réseau empêche l'enregistrement des modifications.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status || "";
    switch (s) {
      case "pending_assignment":
        return {
          bg: "text-amber-500",
          fr: "En attente d'attribution de chauffeur",
          en: "Awaiting chauffeur assignment"
        };
      case "confirmed":
        return {
          bg: "text-emerald-400",
          fr: "Confirmée",
          en: "Confirmed"
        };
      case "assigned":
      case "en_route":
      case "arrived":
      case "in_progress":
        return {
          bg: "text-blue-400",
          fr: "Chauffeur assigné",
          en: "Chauffeur assigned"
        };
      case "completed":
        return {
          bg: "text-neutral-400",
          fr: "Terminée",
          en: "Completed"
        };
      case "cancelled":
        return {
          bg: "text-rose-400",
          fr: "Annulée",
          en: "Cancelled"
        };
      default:
        return {
          bg: "text-neutral-300",
          fr: s || "Statut inconnu",
          en: s || "Unknown status"
        };
    }
  };

  return (
    <div id="commandes_page_container" className="min-h-screen bg-white text-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Navigation Link */}
        <div className="mb-8 flex items-center justify-between">
          <button 
            onClick={() => {
              setCurrentPage("home");
              window.location.hash = "home";
            }}
            className="group flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-black transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            {translate({ fr: "RETOUR À L'ACCUEIL", en: "BACK TO HOME" })}
          </button>

          <button
            onClick={fetchReservations}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-mono text-[#C5A880] hover:text-[#B59870] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={`${loading ? "animate-spin" : ""}`} />
            {translate({ fr: "ACTUALISER ⟲", en: "REFRESH ⟲" })}
          </button>
        </div>

        {/* Title Block */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C5A880]/10 border border-[#C5A880]/20 rounded-full text-xs text-[#C5A880] font-mono mb-3">
            <Compass size={12} />
            <span>ESPACE DE SUIVI DES COMMANDES</span>
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight sm:text-4xl">
            {translate({ fr: "Mes Commandes & Réservations", en: "My Bookings & Orders" })}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {translate({ 
              fr: "Gérez vos trajets d'élite, modifiez vos demandes en attente et supprimez vos anciennes courses.", 
              en: "Manage your premium rides, modify pending bookings, and remove your completed orders." 
            })}
          </p>
        </div>

        {/* Success/Error Alerts */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-3">
            <AlertTriangle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-3">
            <Check size={16} className="shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Orders Listing */}
        <div className="space-y-8">
          {loading && reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-neutral-50 border border-neutral-200 rounded-2xl">
              <Loader2 className="animate-spin text-[#C5A880] mb-4" size={40} />
              <p className="text-sm text-neutral-500">
                {translate({ fr: "Récupération de vos commandes en cours...", en: "Loading your luxury orders..." })}
              </p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-20 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] mx-auto">
                <Calendar size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-neutral-900">
                  {translate({ fr: "Aucune commande enregistrée", en: "No orders registered" })}
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  {translate({ 
                    fr: "Vous n'avez pas encore planifié de trajet avec EASY BY SAVER. Utilisez notre outil d'estimation pour commander un chauffeur.", 
                    en: "You have not scheduled any rides with EASY BY SAVER yet. Book your first ride now." 
                  })}
                </p>
              </div>
              <button
                onClick={() => {
                  setCurrentPage("reservation");
                  window.location.hash = "reservation";
                }}
                className="px-6 py-3 bg-[#C5A880] hover:bg-[#B59870] text-black text-xs font-bold rounded-xl transition-all cursor-pointer font-mono"
              >
                {translate({ fr: "PLANIFIER UNE COURSE", en: "PLAN A RIDE NOW" })}
              </button>
            </div>
          ) : (
            reservations.map((item) => {
              const statusDetails = getStatusBadge(item.status);
              const isPending = item.status === "pending_assignment";
              const isEditable = item.status !== "cancelled" && item.status !== "completed";
              const isCancellable = isPending || item.status === "confirmed" || item.status === "assigned";
              const isOld = item.status === "cancelled" || item.status === "completed";
              const isEditing = editingId === item.id;

              const formulaLabel = item.formula === "hourly" 
                ? translate({ fr: "Horaire", en: "Hourly" }) 
                : item.formula === "halfday" 
                  ? translate({ fr: "Demi-journée", en: "Half-day" }) 
                  : translate({ fr: "Journée complète", en: "Full-day" });

              const vehicleLabel = item.vehicleId === "N1" 
                ? "Berline Premium" 
                : item.vehicleId === "N2" 
                  ? "Berline Prestige" 
                  : "Berline Executive";

              return (
                <div 
                  key={item.id}
                  className="flex justify-center w-full py-2"
                >
                  <div className="ticket-canvas select-none w-full max-w-[44rem]">
                    <div className="ticket-wrapper">
                      <div className="ticket">
                        <div className="t-main">
                          <div className="t-content">
                            {/* Header */}
                            <div className="t-header">
                              <div className="t-logo">
                                <svg viewBox="0 0 24 24">
                                  <path
                                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  ></path>
                                </svg>
                                EASY SAVER
                              </div>
                              <div className="t-type">{formulaLabel}</div>
                            </div>

                            {/* Title (Vehicle) & Status */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                              <div>
                                <div className="t-title">{vehicleLabel}</div>
                                <div className="text-[10px] text-neutral-400 font-mono tracking-wider mt-0.5">
                                  {translate({ fr: "PLANIFIÉ LE : ", en: "PLANNING DATE: " })}
                                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                  }) : "N/A"}
                                </div>
                              </div>
                              <div className="sm:text-right">
                                <span className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider ${statusDetails.bg}`}>
                                  {translate({ fr: statusDetails.fr, en: statusDetails.en })}
                                </span>
                              </div>
                            </div>

                            {isEditing ? (
                              /* Form de modification inline */
                              <div className="space-y-4 bg-black/40 p-4 rounded-2xl border border-[#C5A880]/15 my-2 animate-in fade-in duration-200">
                                <h4 className="text-xs font-mono text-[#C5A880] uppercase font-bold tracking-wider">
                                  {translate({ fr: "MODIFICATION DE LA RÉSERVATION", en: "MODIFY RESERVATION DETAILS" })}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[9px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                                      {translate({ fr: "NOM DU PASSAGER (BÉNÉFICIAIRE)", en: "PASSENGER NAME" })}
                                    </label>
                                    <input 
                                      type="text"
                                      value={editClientName}
                                      onChange={(e) => setEditClientName(e.target.value)}
                                      placeholder="Ex: Kheira Touré"
                                      className="w-full bg-[#1c1c24] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-lg p-2 text-xs text-white focus:outline-none transition-colors font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                                      {translate({ fr: "TÉLÉPHONE CONTACT", en: "CONTACT PHONE" })}
                                    </label>
                                    <input 
                                      type="text"
                                      value={editClientPhone}
                                      onChange={(e) => setEditClientPhone(e.target.value)}
                                      placeholder="Ex: 0798668682"
                                      className="w-full bg-[#1c1c24] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-lg p-2 text-xs text-white focus:outline-none transition-colors font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                                      {translate({ fr: "LIEU DE PRISE EN CHARGE *", en: "PICKUP LOCATION *" })}
                                    </label>
                                    <input 
                                      type="text"
                                      value={editPickup}
                                      onChange={(e) => setEditPickup(e.target.value)}
                                      className="w-full bg-[#1c1c24] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-lg p-2 text-xs text-white focus:outline-none transition-colors font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                                      {translate({ fr: "LIEU DE DESTINATION *", en: "DESTINATION *" })}
                                    </label>
                                    <input 
                                      type="text"
                                      value={editDestination}
                                      onChange={(e) => setEditDestination(e.target.value)}
                                      className="w-full bg-[#1c1c24] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-lg p-2 text-xs text-white focus:outline-none transition-colors font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                                      {translate({ fr: "DATE DE DÉPART *", en: "DEPARTURE DATE *" })}
                                    </label>
                                    <input 
                                      type="date"
                                      value={editDate}
                                      onChange={(e) => setEditDate(e.target.value)}
                                      className="w-full bg-[#1c1c24] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-lg p-2 text-xs text-white focus:outline-none transition-colors font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                                      {translate({ fr: "HEURE DE DÉPART *", en: "DEPARTURE TIME *" })}
                                    </label>
                                    <input 
                                      type="time"
                                      value={editTime}
                                      onChange={(e) => setEditTime(e.target.value)}
                                      className="w-full bg-[#1c1c24] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-lg p-2 text-xs text-white focus:outline-none transition-colors font-mono"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                  <button
                                    disabled={actionLoadingId === item.id}
                                    onClick={() => handleSaveEdit(item.id)}
                                    className="px-4 py-2 bg-[#C5A880] hover:bg-[#B59870] text-black font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-mono uppercase"
                                  >
                                    {actionLoadingId === item.id ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <>
                                        <Save size={12} />
                                        {translate({ fr: "Enregistrer", en: "Save" })}
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-mono"
                                  >
                                    <X size={12} />
                                    {translate({ fr: "Annuler", en: "Cancel" })}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Détails de la réservation */
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 text-xs mb-4">
                                <div className="space-y-4">
                                  <div className="t-detail-item">
                                    <span className="t-label">{translate({ fr: "Passager", en: "Passenger" })}</span>
                                    <span className="t-value flex items-center gap-2">
                                      <User size={13} className="text-[#C5A880]" />
                                      {item.clientName || user?.name || "Client Easy"}
                                    </span>
                                  </div>

                                  <div className="t-detail-item">
                                    <span className="t-label">{translate({ fr: "Départ", en: "Departure Date" })}</span>
                                    <span className="t-value flex items-center gap-2">
                                      <Calendar size={13} className="text-[#C5A880]" />
                                      Le {item.departureDate} à {item.departureTime}
                                    </span>
                                  </div>

                                  <div className="t-detail-item">
                                    <span className="t-label">{translate({ fr: "Options de Prestige", en: "Prestige Options" })}</span>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {Array.isArray(item.options) && item.options.length > 0 ? (
                                        item.options.map((opt: string, i: number) => (
                                          <span key={i} className="text-[10px] text-neutral-300 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-md font-mono">
                                            {opt}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-neutral-500 italic text-[11px]">{translate({ fr: "Aucune option", en: "No option selected" })}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="t-detail-item">
                                    <span className="t-label">{translate({ fr: "Itinéraire (Prise en charge & Arrivée)", en: "Itinerary" })}</span>
                                    <div className="mt-1 space-y-2 bg-white/5 p-3 rounded-2xl border border-white/5">
                                      <div className="flex items-start gap-2">
                                        <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span className="text-neutral-200">
                                          <strong className="text-neutral-400 font-medium">Départ :</strong> {item.pickup}
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2 border-t border-white/5 pt-2">
                                        <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                        <span className="text-neutral-200">
                                          <strong className="text-neutral-400 font-medium">Arrivée :</strong> {item.destination}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="t-detail-item">
                                    <span className="t-label">{translate({ fr: "Chauffeur Assigné", en: "Assigned Chauffeur" })}</span>
                                    {item.driverName ? (
                                      <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                                        <div className="flex items-center gap-2 text-white font-medium">
                                          <User size={13} className="text-[#C5A880]" />
                                          <span>{item.driverName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-neutral-400">
                                          <Phone size={13} className="text-[#C5A880]" />
                                          <a href={`tel:${item.driverPhone}`} className="hover:underline hover:text-[#C5A880] font-mono">
                                            {item.driverPhone}
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="italic text-neutral-500 text-[11px] leading-relaxed pl-1">
                                        {item.status === "cancelled" 
                                          ? translate({ fr: "Course annulée", en: "Ride cancelled" })
                                          : translate({ fr: "En attente d'affectation d'un chauffeur par l'administration...", en: "Awaiting chauffeur dispatch from administrator..." })
                                        }
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                          <div
                            className="t-perforation"
                            style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', transform: 'translateY(50%)' }}
                          >
                            <div className="t-perf-line"></div>
                          </div>
                        </div>

                        {/* Stub part with Actions & Barcode */}
                        <div className="t-stub flex flex-col gap-4">
                          {/* Price & Barcode Row */}
                          <div className="flex w-full flex-col sm:flex-row items-center sm:justify-between gap-4">
                            <div className="t-barcode-container flex flex-col items-center sm:items-start">
                              <div className="t-barcode"></div>
                              <div className="t-barcode-id">#{item.id.substring(0, 14).toUpperCase()}</div>
                            </div>
                            <div className="t-admit text-center sm:text-right">
                              <div className="t-admit-text">{translate({ fr: "MONTANT ESTIMÉ", en: "ESTIMATED PRICE" })}</div>
                              <div className="t-admit-num text-[#C5A880] font-mono" style={{ fontSize: '1.85em', textShadow: '0 0 10px rgba(197, 168, 128, 0.3)' }}>
                                {item.totalPrice?.toLocaleString('fr-FR')} FCFA
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          {!isEditing && (
                            <>
                              <div className="w-full border-t border-white/5 my-1"></div>
                              <div className="w-full flex flex-wrap items-center justify-center sm:justify-end gap-2 pt-1 z-10 relative">
                                
                                {showConfirmCancelId === item.id ? (
                                  <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 p-2 rounded-xl animate-in slide-in-from-right duration-200">
                                    <span className="text-[10px] text-rose-400 font-mono font-bold flex items-center gap-1 uppercase">
                                      <AlertTriangle size={12} />
                                      {translate({ fr: "CONFIRMER L'ANNULATION ?", en: "CONFIRM CANCEL?" })}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        disabled={actionLoadingId === item.id}
                                        onClick={() => handleCancelBooking(item.id)}
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer uppercase transition-colors"
                                      >
                                        {actionLoadingId === item.id ? (
                                          <Loader2 size={11} className="animate-spin" />
                                        ) : (
                                          translate({ fr: "Oui, annuler", en: "Yes, cancel" })
                                        )}
                                      </button>
                                      <button
                                        onClick={() => setShowConfirmCancelId(null)}
                                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] px-3 py-1.5 rounded-lg cursor-pointer uppercase font-bold transition-colors"
                                      >
                                        {translate({ fr: "Non", en: "No" })}
                                      </button>
                                    </div>
                                  </div>
                                ) : showConfirmDeleteId === item.id ? (
                                  <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 p-2 rounded-xl animate-in slide-in-from-right duration-200">
                                    <span className="text-[10px] text-rose-400 font-mono font-bold flex items-center gap-1 uppercase">
                                      <AlertTriangle size={12} />
                                      {translate({ fr: "SUPPRIMER DÉFINITIVEMENT ?", en: "DELETE FOREVER?" })}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        disabled={actionLoadingId === item.id}
                                        onClick={() => handleDeleteBooking(item.id)}
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer uppercase font-bold transition-colors"
                                      >
                                        {actionLoadingId === item.id ? (
                                          <Loader2 size={11} className="animate-spin" />
                                        ) : (
                                          translate({ fr: "Supprimer", en: "Delete" })
                                        )}
                                      </button>
                                      <button
                                        onClick={() => setShowConfirmDeleteId(null)}
                                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] px-3 py-1.5 rounded-lg cursor-pointer uppercase font-bold transition-colors"
                                      >
                                        {translate({ fr: "Non", en: "No" })}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {isPending && (
                                      <button
                                        onClick={() => startEdit(item)}
                                        className="text-[#C5A880] hover:text-black hover:bg-[#C5A880] transition-all font-bold flex items-center gap-1 px-4 py-2 rounded-xl border border-[#C5A880]/30 text-xs cursor-pointer font-mono uppercase"
                                      >
                                        <Edit3 size={12} />
                                        {translate({ fr: "Modifier", en: "Modify" })}
                                      </button>
                                    )}

                                    {isCancellable && (
                                      <button
                                        onClick={() => setShowConfirmCancelId(item.id)}
                                        className="text-neutral-400 hover:text-rose-400 transition-colors font-medium flex items-center gap-1 px-4 py-2 rounded-xl border border-white/5 hover:border-rose-500/25 hover:bg-rose-500/10 text-xs cursor-pointer uppercase"
                                      >
                                        <Trash2 size={12} />
                                        {translate({ fr: "Annuler", en: "Cancel" })}
                                      </button>
                                    )}

                                    {isOld && (
                                      <button
                                        onClick={() => setShowConfirmDeleteId(item.id)}
                                        className="text-neutral-400 hover:text-rose-400 transition-colors font-medium flex items-center gap-1 px-4 py-2 rounded-xl border border-white/5 hover:border-rose-500/25 hover:bg-rose-500/10 text-xs cursor-pointer uppercase"
                                      >
                                        <Trash2 size={12} />
                                        {translate({ fr: "Supprimer", en: "Delete" })}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
