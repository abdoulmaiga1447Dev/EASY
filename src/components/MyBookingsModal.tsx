import React, { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { 
  X, Calendar, Clock, MapPin, User, Phone, Trash2, Edit3, Save,
  Compass, AlertTriangle, Loader2, Check, ExternalLink 
} from "lucide-react";

interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setCurrentPage: (page: string) => void;
}

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  isOpen,
  onClose,
  setCurrentPage,
}) => {
  const { translate } = useLanguage();
  const { accessToken } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showConfirmCancelId, setShowConfirmCancelId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<any | null>(null);

  // States for Editing Reservation
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPickup, setEditPickup] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Helper to safely format error messages that may be string or localizable object
  const getErrorMessageString = (err: any): string => {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (typeof err === "object") {
      if (err.fr || err.en) {
        return translate({ fr: err.fr, en: err.en });
      }
      return JSON.stringify(err);
    }
    return String(err);
  };

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
        // Sort reservations by date safely (newest first, fallback to 0 for invalid dates)
        const valid = (data.reservations || []).filter((r: any) => r && typeof r === 'object');
        const sorted = valid.sort((a: any, b: any) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const tA = isNaN(timeA) ? 0 : timeA;
          const tB = isNaN(timeB) ? 0 : timeB;
          return tB - tA;
        });
        setReservations(sorted);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Erreur de récupération des réservations");
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setErrorMessage("Impossible de se connecter au serveur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReservations();
    }
  }, [isOpen]);

  const handleCancelBooking = async (id: string) => {
    setCancellingId(id);
    setErrorMessage(null);
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
        // Update local state smoothly
        setReservations(prev => 
          prev.map(r => r.id === id ? { ...r, status: "cancelled" } : r)
        );
        setShowConfirmCancelId(null);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Une erreur est survenue lors de l'annulation.");
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
      setErrorMessage("Une erreur réseau empêche l'annulation.");
    } finally {
      setCancellingId(null);
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditPickup(item.pickup || "");
    setEditDestination(item.destination || "");
    setEditDate(item.departureDate || "");
    setEditTime(item.departureTime || "");
    setEditClientName(item.clientName || "");
    setEditClientPhone(item.clientPhone || "");
    setErrorMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editPickup.trim() || !editDestination.trim() || !editDate || !editTime) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }

    setSavingId(id);
    setErrorMessage(null);

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
        setReservations(prev =>
          prev.map(r => r.id === id ? {
            ...r,
            pickup: editPickup,
            destination: editDestination,
            departureDate: editDate,
            departureTime: editTime,
            clientName: editClientName,
            clientPhone: editClientPhone,
          } : r)
        );
        setEditingId(null);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Erreur lors de la modification de la réservation.");
      }
    } catch (err) {
      console.error("Error saving edit:", err);
      setErrorMessage("Erreur de connexion au serveur.");
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    const s = status || "";
    switch (s) {
      case "pending_assignment":
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          fr: "En attente de validation",
          en: "Pending confirmation"
        };
      case "confirmed":
        return {
          bg: "bg-[#00C853]/10 text-[#00C853] border-[#00C853]/20",
          fr: "Confirmé par l'admin",
          en: "Confirmed by admin"
        };
      case "assigned":
      case "en_route":
      case "arrived":
      case "in_progress":
        return {
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          fr: "Chauffeur assigné",
          en: "Chauffeur assigned"
        };
      case "completed":
        return {
          bg: "bg-neutral-800 text-neutral-400 border-neutral-700",
          fr: "Terminé",
          en: "Completed"
        };
      case "cancelled":
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          fr: "Annulé",
          en: "Cancelled"
        };
      default:
        return {
          bg: "bg-neutral-800 text-neutral-300 border-neutral-700",
          fr: s || "Statut inconnu",
          en: s || "Unknown status"
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0E0E14] border border-white-premium/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-white-premium/5 flex items-center justify-between bg-[#12121A]">
          <div>
            <h3 className="text-lg font-bold text-white-premium flex items-center gap-2">
              <Compass size={18} className="text-[#00C853]" />
              {translate({ fr: "Mes Réservations Privées", en: "My Luxury Bookings" })}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              {translate({ 
                fr: "Consultez l'état de vos courses de prestige et modifiez ou gérez vos trajets.", 
                en: "View current status of your rides and edit or manage requests." 
              })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white-premium/5 text-neutral-400 hover:text-white hover:bg-white-premium/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="m-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{getErrorMessageString(errorMessage)}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="animate-spin text-[#00C853]" size={32} />
              <p className="text-xs text-neutral-400">
                {translate({ fr: "Chargement de vos courses...", en: "Loading your rides..." })}
              </p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-white-premium/5 flex items-center justify-center text-neutral-500">
                <Calendar size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {translate({ fr: "Aucune réservation trouvée", en: "No bookings found" })}
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm mt-1">
                  {translate({ 
                    fr: "Vous n'avez pas encore planifié de trajet. Utilisez le formulaire pour commander un chauffeur d'élite.", 
                    en: "You have not scheduled any rides yet. Use the form to book an elite chauffeur." 
                  })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-[#00C853] hover:bg-[#00ab47] text-black text-xs font-bold rounded-lg transition-colors"
              >
                {translate({ fr: "Réserver un trajet", en: "Book a Ride Now" })}
              </button>
            </div>
          ) : (
            reservations.map((item) => {
              const statusDetails = getStatusBadge(item.status);
              const isCancellable = item.status === "pending_assignment" || item.status === "confirmed" || item.status === "assigned";
              const isEditable = item.status !== "cancelled" && item.status !== "completed";
              const isEditing = editingId === item.id;

              return (
                <div 
                  key={item.id}
                  className="bg-[#12121A] border border-white-premium/5 rounded-xl p-4 space-y-3 relative overflow-hidden transition-all hover:border-white-premium/10"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-white-premium/5 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white-premium">
                          #{item.id}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${statusDetails.bg}`}>
                          {translate({ fr: statusDetails.fr, en: statusDetails.en })}
                        </span>
                      </div>
                       <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                        {translate({ fr: "Créé le : ", en: "Created on: " })}
                        {(() => {
                          if (!item.createdAt) return "N/A";
                          try {
                            const d = new Date(item.createdAt);
                            if (isNaN(d.getTime())) return "N/A";
                            return d.toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } catch (e) {
                            return "N/A";
                          }
                        })()}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xs font-mono text-[#00C853] font-bold block">
                        {item.totalPrice?.toLocaleString()} FCFA
                      </span>
                      <span className="text-[10px] text-neutral-400 capitalize block">
                        {item.formula === "hourly" ? translate({ fr: "À l'heure", en: "Hourly" }) : item.formula === "halfday" ? translate({ fr: "Demi-journée", en: "Half-day" }) : translate({ fr: "Journée", en: "Full day" })}
                      </span>
                    </div>
                  </div>

                  {isEditing ? (
                    /* Inline Editing Form */
                    <div className="space-y-3 bg-[#0a0a10] p-3 rounded-xl border border-[#00C853]/30 animate-in fade-in duration-200 text-xs">
                      <div className="flex items-center justify-between pb-1 border-b border-white/5">
                        <span className="font-mono font-bold text-[#00C853] uppercase text-[11px]">
                          {translate({ fr: "Modification de la réservation", en: "Modify Reservation" })}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                            {translate({ fr: "Nom du Passager", en: "Passenger Name" })}
                          </label>
                          <input 
                            type="text"
                            value={editClientName}
                            onChange={(e) => setEditClientName(e.target.value)}
                            className="w-full bg-[#161622] border border-white/10 focus:border-[#00C853] rounded-lg p-2 text-xs text-white focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                            {translate({ fr: "Téléphone Contact", en: "Contact Phone" })}
                          </label>
                          <input 
                            type="text"
                            value={editClientPhone}
                            onChange={(e) => setEditClientPhone(e.target.value)}
                            className="w-full bg-[#161622] border border-white/10 focus:border-[#00C853] rounded-lg p-2 text-xs text-white focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                            {translate({ fr: "Lieu de départ *", en: "Pickup Location *" })}
                          </label>
                          <input 
                            type="text"
                            value={editPickup}
                            onChange={(e) => setEditPickup(e.target.value)}
                            className="w-full bg-[#161622] border border-white/10 focus:border-[#00C853] rounded-lg p-2 text-xs text-white focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                            {translate({ fr: "Destination *", en: "Destination *" })}
                          </label>
                          <input 
                            type="text"
                            value={editDestination}
                            onChange={(e) => setEditDestination(e.target.value)}
                            className="w-full bg-[#161622] border border-white/10 focus:border-[#00C853] rounded-lg p-2 text-xs text-white focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                            {translate({ fr: "Date de départ *", en: "Departure Date *" })}
                          </label>
                          <input 
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full bg-[#161622] border border-white/10 focus:border-[#00C853] rounded-lg p-2 text-xs text-white focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                            {translate({ fr: "Heure de départ *", en: "Departure Time *" })}
                          </label>
                          <input 
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-full bg-[#161622] border border-white/10 focus:border-[#00C853] rounded-lg p-2 text-xs text-white focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          disabled={savingId === item.id}
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-3 py-1.5 bg-[#00C853] hover:bg-[#00ab47] text-black font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer uppercase"
                        >
                          {savingId === item.id ? (
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
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <X size={12} />
                          {translate({ fr: "Annuler", en: "Cancel" })}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Card Details */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1.5">
                        {item.clientName && (
                          <div className="flex items-center gap-1.5 text-neutral-300">
                            <User size={12} className="text-[#00C853]" />
                            <span><strong>Passager :</strong> {item.clientName} {item.clientPhone ? `(${item.clientPhone})` : ''}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-neutral-400">
                          <Calendar size={12} className="text-[#00C853]" />
                          <span>Le {item.departureDate} à {item.departureTime}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-neutral-300">
                          <MapPin size={12} className="text-[#00C853] shrink-0 mt-0.5" />
                          <span className="truncate" title={item.pickup}>
                            <strong>Départ :</strong> {item.pickup}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-neutral-300">
                          <MapPin size={12} className="text-rose-500 shrink-0 mt-0.5" />
                          <span className="truncate" title={item.destination}>
                            <strong>Arrivée :</strong> {item.destination}
                          </span>
                        </div>
                      </div>

                      {/* Assigned Chauffeur details */}
                      <div className="space-y-1.5 md:border-l md:border-white-premium/5 md:pl-4">
                        <span className="text-[10px] uppercase font-mono text-neutral-500 block">
                          {translate({ fr: "Chauffeur Privé :", en: "Assigned Chauffeur:" })}
                        </span>
                        {item.driverName ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-white font-medium">
                              <User size={12} className="text-[#00C853]" />
                              <span>{item.driverName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-neutral-400">
                              <Phone size={12} />
                              <a href={`tel:${item.driverPhone}`} className="hover:underline hover:text-[#00C853]">
                                {item.driverPhone}
                              </a>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs italic text-neutral-500">
                            {item.status === "cancelled" 
                              ? translate({ fr: "Course annulée", en: "Ride cancelled" })
                              : translate({ fr: "En attente d'attribution par l'admin...", en: "Awaiting dispatch..." })
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Options List */}
                  {!isEditing && Array.isArray(item.options) && item.options.length > 0 && (
                    <div className="text-[10px] bg-[#0c0c12] p-2 rounded-lg flex flex-wrap gap-1.5">
                      <span className="text-neutral-500 font-mono">Options :</span>
                      {item.options.map((opt: string, i: number) => (
                        <span key={i} className="text-neutral-300 bg-white-premium/5 px-2 py-0.5 rounded border border-white-premium/5">
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions Bar */}
                  {!isEditing && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white-premium/5">
                      {/* Inline Confirmation block */}
                      {showConfirmCancelId === item.id ? (
                        <div className="flex items-center gap-2 bg-[#1c0e12] border border-rose-500/20 p-2 rounded-lg w-full justify-between animate-in slide-in-from-right duration-200">
                          <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                            <AlertTriangle size={12} />
                            {translate({ fr: "Confirmer l'annulation ?", en: "Confirm Cancellation?" })}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={cancellingId === item.id}
                              onClick={() => handleCancelBooking(item.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer"
                            >
                              {cancellingId === item.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                translate({ fr: "Oui", en: "Yes" })
                              )}
                            </button>
                            <button
                              onClick={() => setShowConfirmCancelId(null)}
                              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] px-2.5 py-1 rounded cursor-pointer"
                            >
                              {translate({ fr: "Non", en: "No" })}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isEditable && (
                            <button
                              onClick={() => startEdit(item)}
                              className="text-[#00C853] hover:bg-[#00C853]/10 transition-colors font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#00C853]/20 text-xs cursor-pointer"
                            >
                              <Edit3 size={12} />
                              {translate({ fr: "Modifier", en: "Modify" })}
                            </button>
                          )}
                          {isCancellable && (
                            <button
                              onClick={() => setShowConfirmCancelId(item.id)}
                              className="text-neutral-500 hover:text-rose-400 transition-colors font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-500/20 hover:bg-rose-500/5 text-xs cursor-pointer"
                            >
                              <Trash2 size={12} />
                              {translate({ fr: "Annuler", en: "Cancel" })}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#12121A] border-t border-white-premium/5 flex items-center justify-between text-xs font-mono text-neutral-500">
          <span>Easy by saver v2.0</span>
          <button 
            onClick={fetchReservations}
            disabled={loading}
            className="text-[#00C853] hover:underline disabled:opacity-50 cursor-pointer"
          >
            {translate({ fr: "Actualiser ⟲", en: "Refresh ⟲" })}
          </button>
        </div>

      </div>
    </div>
  );
};

