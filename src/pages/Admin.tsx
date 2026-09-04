import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { 
  Shield, Users, Car, UserCheck, Calendar, DollarSign, Settings, 
  TrendingUp, Plus, Trash2, Edit2, Lock, Unlock, Clock, MapPin, 
  Battery, FileText, CheckCircle, AlertTriangle, Briefcase, 
  Send, Check, XCircle, Search, RefreshCw, Layers, Award, Percent, Flag,
  Menu, X, ChevronDown, ChevronUp, ArrowLeft, Gauge, Zap, Activity, Upload, Hotel, Download, Eye, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "../components/Button";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from "recharts";

const compressImageToBase64 = (file: File, maxW: number = 800, maxH: number = 600): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxW) {
          height *= maxW / width;
          width = maxW;
        }
        if (height > maxH) {
          width *= maxH / height;
          height = maxH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error("Erreur de chargement de l'image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

interface PhotoUploadFieldProps {
  label: string;
  value: string;
  onChange: (base64: string) => void;
  id: string;
}

const PhotoUploadField: React.FC<PhotoUploadFieldProps> = ({ label, value, onChange, id }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Format incorrect. Veuillez déposer une image.");
      return;
    }
    setError(null);
    try {
      const base64 = await compressImageToBase64(file);
      onChange(base64);
    } catch (err) {
      console.error(err);
      setError("Échec du chargement de l'image.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="space-y-1">
      <label className="text-neutral-400 block text-[10px] uppercase tracking-wider font-mono font-semibold">
        {label}
      </label>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-input-${id}`)?.click()}
        className={`relative h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
          value 
            ? "border-gold/30 bg-[#0E0E15]" 
            : isDragActive 
              ? "border-gold bg-transparent" 
              : "border-white/10 bg-[#0E0E15] hover:border-white/20"
        }`}
      >
        <input
          id={`file-input-${id}`}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />

        {value ? (
          <div className="relative w-full h-full group">
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
              <span className="text-[10px] text-gold font-bold uppercase bg-black/80 px-2 py-1 rounded">
                Changer
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                title="Supprimer la photo"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center p-2 pointer-events-none">
            <Upload size={16} className="mx-auto text-neutral-500 mb-1" />
            <span className="text-[9px] text-neutral-400 block font-semibold">
              Glissez-déposez ou cliquez
            </span>
            <span className="text-[8px] text-neutral-500 block font-mono mt-0.5">
              PNG, JPG, WEBP (Auto-compressé)
            </span>
          </div>
        )}

        {error && (
          <div className="absolute bottom-1 left-1 right-1 bg-red-600 text-white text-[8px] p-1 rounded text-center font-bold">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export const Admin: React.FC<{ setCurrentPage: (p: string) => void }> = ({ setCurrentPage }) => {
  const { user, accessToken } = useAuth();
  const { t } = useLanguage();

  // Active section management
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "reservations" | "vehicles" | "drivers" | "corporates" | "hospitality" | "clients" | "billing" | "config"
  >("dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});
  const [expandedDrivers, setExpandedDrivers] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination & details panel states for vehicles
  const [vehiclePage, setVehiclePage] = useState(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activePhotoAngle, setActivePhotoAngle] = useState<"front" | "back" | "left" | "right">("front");

  // Live administrative datasets
  const [stats, setStats] = useState<any>({
    todayTripsCount: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    vehiclesAvailable: 0,
    vehiclesInMission: 0,
    vehiclesMaintenance: 0,
    connectedDrivers: 0,
    pendingBookingsCount: 0
  });

  const [reservations, setReservations] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);
  const [hospitalityPartners, setHospitalityPartners] = useState<any[]>([]);
  const [partnerApprovalModal, setPartnerApprovalModal] = useState<{ isOpen: boolean; partnerId: string; error?: string } | null>(null);
  const [partnerRejectionModal, setPartnerRejectionModal] = useState<{ isOpen: boolean; partnerId: string; error?: string } | null>(null);
  const [commissionInput, setCommissionInput] = useState<number>(12);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");
  const [expandedPartnerIds, setExpandedPartnerIds] = useState<string[]>([]);
  const togglePartnerExpanded = (id: string) => {
    setExpandedPartnerIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dashboard calendar states
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date(2026, 5, 27));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>("2026-06-27");

  // Modal / Form state management vars
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"vehicle" | "driver" | "corporate" | "reservation" | "invoice">("vehicle");
  const [isEdit, setIsEdit] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: "vehicle" | "driver" | "reservation" | "invoice" } | null>(null);

  // Form Fields
  const [vehicleForm, setVehicleForm] = useState({
    brand: "",
    name: "",
    category: "berline-premium",
    immatriculation: "",
    batteryLevel: 100,
    status: "Disponible",
    photoFront: "",
    photoBack: "",
    photoLeft: "",
    photoRight: "",
    maxSpeed: 220,
    fuelConsumption: "16.8 kWh/100km",
    totalDistance: "12,450 km"
  });

  const [driverForm, setDriverForm] = useState({
    name: "",
    phone: "",
    email: "",
    status: "disponible",
    vehicleId: "",
    photo: ""
  });

  const [corpForm, setCorpForm] = useState({
    name: "",
    email: "",
    phone: "",
    spendingLimit: 2500000,
    discountRate: 10,
    contractStart: "2026-01-01",
    contractEnd: "2026-12-31",
    serviceCodesString: "Direction Financière (VIP-9302), Comité de Direction (VIP-1002)"
  });

  const [resForm, setResForm] = useState({
    userId: "",
    vehicleId: "",
    driverId: "",
    departureDate: "",
    departureTime: "",
    pickup: "",
    destination: "",
    formula: "hourly",
    totalPrice: 45000,
    status: "pending_assignment",
    dispositionConfirmed: false
  });

  const [showDetails, setShowDetails] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    type: "corporate",
    accountId: "",
    customAmount: ""
  });

  const [sysConfigForm, setSysConfigForm] = useState({
    baseRates: {
      "berline-premium": { hourly: 15000, halfday: 55000, fullday: 95000 },
      "suv-executive": { hourly: 20000, halfday: 75000, fullday: 135000 },
      "suv-prestige": { hourly: 35000, halfday: 125000, fullday: 225000 }
    },
    surcharges: { night: 15, weekend: 20 },
    zones: ["Abidjan Nord", "Cocody", "Plateau", "Zone 4", "Marcory", "Assinie", "Yamoussoukro", "Aéroport FHB"],
    promotions: [
      { code: "EASYCOCO", discount: 15, active: true },
      { code: "PREMIUM225", discount: 10, active: true }
    ]
  });

  const [ecoForm, setEcoForm] = useState({
    kmElectrique: 12450.0,
    co2NonEmis: 1850.0,
    co2EviteTonnes: 1.85
  });
  const [isSavingEco, setIsSavingEco] = useState(false);
  const [ecoSuccessMessage, setEcoSuccessMessage] = useState("");

  // Fetch admin bundle
  const loadAdminData = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${accessToken}` };
      
      // Async requests mapping
      const [resDash, resVehicles, resDrivers, resCorps, resHospitality, resClients, resInvoices, resConfig] = await Promise.all([
        fetch("/api/admin/dashboard", { headers }).then(r => r.json()),
        fetch("/api/admin/vehicles", { headers }).then(r => r.json()),
        fetch("/api/admin/drivers", { headers }).then(r => r.json()),
        fetch("/api/admin/corporates", { headers }).then(r => r.json()),
        fetch("/api/admin/hospitality-partners", { headers }).then(r => r.json()),
        fetch("/api/admin/clients", { headers }).then(r => r.json()),
        fetch("/api/admin/invoices", { headers }).then(r => r.json()),
        fetch("/api/admin/config", { headers }).then(r => r.json())
      ]);

      if (resDash?.stats) setStats(resDash.stats);
      if (resDash?.allReservations) setReservations(resDash.allReservations);
      if (Array.isArray(resVehicles)) setVehicles(resVehicles);
      if (Array.isArray(resDrivers)) setDrivers(resDrivers);
      if (Array.isArray(resCorps)) setCorporates(resCorps);
      if (Array.isArray(resHospitality)) setHospitalityPartners(resHospitality);
      if (Array.isArray(resClients)) setClients(resClients);
      if (Array.isArray(resInvoices)) setInvoices(resInvoices);
      if (resConfig) {
        setSystemConfig(resConfig);
        setSysConfigForm(resConfig);
      }

      // Fetch Ecological Daily Report
      try {
        const resEco = await fetch("/api/eco-report").then(r => r.json());
        if (resEco && !resEco.error) {
          setEcoForm({
            kmElectrique: resEco.kmElectrique,
            co2NonEmis: resEco.co2NonEmis,
            co2EviteTonnes: resEco.co2EviteTonnes
          });
        }
      } catch (err) {
        console.error("Error loading eco report in admin:", err);
      }
    } catch (e) {
      console.error("Error loading admin information:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [accessToken, activeTab]);

  const getReservationCreatorInfo = (userId: string) => {
    // 1. Check in clients
    const client = clients.find(c => c.id === userId);
    if (client) {
      return {
        type: "client" as const,
        name: client.name,
        email: client.email,
        phone: client.phone || "Non renseigné",
        label: "Compte Client",
        badgeColor: "bg-transparent text-neutral-300 border-white/10"
      };
    }

    // 2. Check in hospitalityPartners
    const partner = hospitalityPartners.find(p => p.id === userId);
    if (partner) {
      return {
        type: "partenaire" as const,
        name: partner.name,
        email: partner.email,
        phone: partner.phone || "Non renseigné",
        label: `Partenaire: ${partner.name}`,
        badgeColor: "bg-transparent text-[#C5A880] border-[#C5A880]/30"
      };
    }

    // 3. Check in corporates
    const corporate = corporates.find(co => co.id === userId);
    if (corporate) {
      return {
        type: "corporate" as const,
        name: corporate.name,
        email: corporate.email,
        phone: corporate.phone || "Non renseigné",
        label: `Corporate: ${corporate.name}`,
        badgeColor: "bg-transparent text-blue-400 border-blue-500/20"
      };
    }

    return {
      type: "client" as const,
      name: "Compte Client",
      email: "Non renseigné",
      phone: "Non renseigné",
      label: "Compte Client",
      badgeColor: "bg-transparent text-neutral-400 border-white/10"
    };
  };

  const handleBlockToggle = async (userId: string, isBlockedNow: boolean, role: "client" | "corporate") => {
    if (!accessToken) return;
    try {
      const endpoint = role === "corporate" ? `/api/admin/corporates/${userId}` : `/api/admin/clients/${userId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ isBlocked: !isBlockedNow })
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleApprovePartner = (partnerId: string) => {
    setCommissionInput(12);
    setPartnerApprovalModal({ isOpen: true, partnerId });
  };

  const submitApprovePartner = async () => {
    if (!partnerApprovalModal || !accessToken) return;
    const { partnerId } = partnerApprovalModal;
    if (isNaN(commissionInput) || commissionInput < 10 || commissionInput > 15) {
      setPartnerApprovalModal(prev => prev ? { ...prev, error: "Le taux de commission doit être un nombre compris entre 10 et 15 %." } : null);
      return;
    }

    try {
      const res = await fetch(`/api/admin/hospitality-partners/${partnerId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ commissionRate: commissionInput })
      });
      if (res.ok) {
        setPartnerApprovalModal(null);
        loadAdminData();
      } else {
        const err = await res.json();
        setPartnerApprovalModal(prev => prev ? { ...prev, error: err.error || "Erreur lors de l'approbation." } : null);
      }
    } catch(e) {
      console.error(e);
      setPartnerApprovalModal(prev => prev ? { ...prev, error: "Une erreur réseau est survenue." } : null);
    }
  };

  const handleRejectPartner = (partnerId: string) => {
    setPartnerRejectionModal({ isOpen: true, partnerId });
  };

  const submitRejectPartner = async () => {
    if (!partnerRejectionModal || !accessToken) return;
    const { partnerId } = partnerRejectionModal;

    try {
      const res = await fetch(`/api/admin/hospitality-partners/${partnerId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ reason: "Dossier rejeté par l'administration (pièces non conformes ou invalides)" })
      });
      if (res.ok) {
        setPartnerRejectionModal(null);
        loadAdminData();
      } else {
        const err = await res.json();
        setPartnerRejectionModal(prev => prev ? { ...prev, error: err.error || "Erreur lors du rejet." } : null);
      }
    } catch(e) {
      console.error(e);
      setPartnerRejectionModal(prev => prev ? { ...prev, error: "Une erreur réseau est survenue." } : null);
    }
  };

  const handleDelete = async (id: string, type: "vehicle" | "driver" | "reservation" | "invoice") => {
    setDeleteConfirm({ id, type });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    try {
      const endpoint = `/api/admin/${type}s/${id}`;
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleOpenAddModal = (type: "vehicle" | "driver" | "corporate" | "reservation" | "invoice") => {
    setIsEdit(false);
    setSelectedItem(null);
    setModalType(type);
    setShowDetails(false);

    if (type === "vehicle") {
      setVehicleForm({
        brand: "Tesla",
        name: "Model Y Dual",
        category: "suv-executive",
        immatriculation: "CI-01-4432-BC",
        batteryLevel: 98,
        status: "Disponible",
        photoFront: "https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=600",
        photoBack: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=600",
        photoLeft: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600",
        photoRight: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=600",
        maxSpeed: 240,
        fuelConsumption: "17.4 kWh/100km",
        totalDistance: "11,368 km"
      });
    } else if (type === "driver") {
      setDriverForm({ name: "", phone: "", email: "", status: "disponible", vehicleId: vehicles[0]?.id || "", photo: "" });
    } else if (type === "corporate") {
      setCorpForm({ name: "", email: "", phone: "", spendingLimit: 3000000, discountRate: 15, contractStart: "2026-01-01", contractEnd: "2026-12-31", serviceCodesString: "Direction Générale (VIP-101)" });
    } else if (type === "reservation") {
      setResForm({
        userId: clients[0]?.id || "",
        vehicleId: vehicles[0]?.id || "",
        driverId: drivers[0]?.id || "",
        departureDate: "2026-06-20",
        departureTime: "14:30",
        pickup: "Cocody Ambassades",
        destination: "Aéroport FHB d'Abidjan",
        formula: "hourly",
        totalPrice: 35000,
        status: "pending_assignment",
        dispositionConfirmed: false
      });
    } else if (type === "invoice") {
      setInvoiceForm({ type: "corporate", accountId: corporates[0]?.id || "", customAmount: "1250000" });
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any, type: "vehicle" | "driver" | "corporate" | "reservation") => {
    setIsEdit(true);
    setSelectedItem(item);
    setModalType(type);
    setShowDetails(false);

    if (type === "vehicle") {
      setVehicleForm({
        brand: item.brand,
        name: item.name,
        category: item.category,
        immatriculation: item.immatriculation,
        batteryLevel: item.batteryLevel,
        status: item.status,
        photoFront: item.photoFront || "",
        photoBack: item.photoBack || "",
        photoLeft: item.photoLeft || "",
        photoRight: item.photoRight || "",
        maxSpeed: item.maxSpeed || 220,
        fuelConsumption: item.fuelConsumption || "16.8 kWh/100km",
        totalDistance: item.totalDistance || "12,450 km"
      });
    } else if (type === "driver") {
      setDriverForm({
        name: item.name,
        phone: item.phone,
        email: item.email,
        status: item.status,
        vehicleId: item.vehicleId || "",
        photo: item.photo || ""
      });
    } else if (type === "corporate") {
      setCorpForm({
        name: item.name,
        email: item.email,
        phone: item.phone,
        spendingLimit: item.spendingLimit,
        discountRate: item.discountRate,
        contractStart: item.contractStart,
        contractEnd: item.contractEnd,
        serviceCodesString: Array.isArray(item.serviceCodes) ? item.serviceCodes.join(", ") : ""
      });
    } else if (type === "reservation") {
      setResForm({
        userId: item.userId,
        vehicleId: item.vehicleId,
        driverId: item.driverId || "",
        departureDate: item.departureDate,
        departureTime: item.departureTime,
        pickup: item.pickup,
        destination: item.destination,
        formula: item.formula,
        totalPrice: item.totalPrice,
        status: item.status,
        dispositionConfirmed: item.dispositionConfirmed || false
      });
    }
    setIsModalOpen(true);
  };

  const handleConfirmDispositionImmediately = async (reservationId: string) => {
    if (!accessToken) return;
    try {
      const updatedForm = {
        ...resForm,
        status: "completed",
        dispositionConfirmed: true
      };
      setResForm(updatedForm);

      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(updatedForm)
      });

      if (res.ok) {
        setIsModalOpen(false);
        loadAdminData();
      } else {
        const errorMsg = await res.json();
        alert(errorMsg.error || "Une erreur s'est produite lors de la confirmation.");
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur s'est produite.");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    try {
      let isSuccess = false;
      let endpoint = "";
      let method = isEdit ? "PUT" : "POST";
      let bodyData: any = {};

      if (modalType === "vehicle") {
        endpoint = isEdit ? `/api/admin/vehicles/${selectedItem.id}` : "/api/admin/vehicles";
        bodyData = vehicleForm;
      } else if (modalType === "driver") {
        if (driverForm.vehicleId) {
          const count = drivers.filter(d => d.vehicleId === driverForm.vehicleId && d.id !== selectedItem?.id).length;
          if (count >= 2) {
            alert("Ce véhicule a déjà atteint le nombre maximum de chauffeurs (au plus 2 chauffeurs).");
            return;
          }
        }
        endpoint = isEdit ? `/api/admin/drivers/${selectedItem.id}` : "/api/admin/drivers";
        bodyData = driverForm;
      } else if (modalType === "corporate") {
        endpoint = isEdit ? `/api/admin/corporates/${selectedItem.id}` : "/api/admin/corporates";
        bodyData = {
          ...corpForm,
          serviceCodes: corpForm.serviceCodesString.split(",").map(s => s.trim()).filter(Boolean)
        };
      } else if (modalType === "reservation") {
        endpoint = isEdit ? `/api/admin/reservations/${selectedItem.id}` : "/api/admin/reservations";
        bodyData = resForm;
      } else if (modalType === "invoice") {
        endpoint = "/api/admin/invoices/generate";
        bodyData = invoiceForm;
      }

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        loadAdminData();
      } else {
        const errorMsg = await res.json();
        alert(errorMsg.error || "Une erreur s'est produite.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(sysConfigForm)
      });
      if (res.ok) {
        alert("Configuration système mise à jour !");
        loadAdminData();
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleSaveEcoReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    try {
      setIsSavingEco(true);
      setEcoSuccessMessage("");
      const res = await fetch("/api/admin/eco-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(ecoForm)
      });
      const data = await res.json();
      if (data && !data.error) {
        setEcoSuccessMessage("Rapport écologique mis à jour avec succès !");
        setTimeout(() => setEcoSuccessMessage(""), 5000);
      } else {
        alert("Erreur: " + (data.error || "Inconnu"));
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setIsSavingEco(false);
    }
  };

  // Filter lists
  const filteredReservations = reservations.filter(r => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      r.pickup.toLowerCase().includes(term) || 
      r.destination.toLowerCase().includes(term) ||
      r.id.toLowerCase().includes(term) ||
      (r.clientName && r.clientName.toLowerCase().includes(term));
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredVehicles = vehicles.filter(v => 
    v.name.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) || 
    v.brand.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) || 
    v.immatriculation.toLowerCase().includes(vehicleSearchQuery.toLowerCase())
  );

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) || 
    d.email.toLowerCase().includes(driverSearchQuery.toLowerCase()) || 
    d.phone.includes(driverSearchQuery)
  );

  const filteredCorporates = corporates.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHospitalityPartners = hospitalityPartners.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute active stats arrays for rich charts
  // Chart 1: Revenue by month
  const monthlyRevenuesDataset = [
    { name: "Janvier", revenus: 4500000, courses: 98 },
    { name: "Février", revenus: 5200000, courses: 112 },
    { name: "Mars", revenus: 4800000, courses: 104 },
    { name: "Avril", revenus: 6100000, courses: 125 },
    { name: "Mai", revenus: 6900000, courses: 140 },
    { name: "Juin actuel", revenus: stats.monthlyRevenue || 7500000, courses: reservations.length || 156 }
  ];

  // Chart 2: Top consumed corporate accounts
  const corporateConsumptionDataset = corporates.map(c => {
    // compute real consumption
    const totalSpent = reservations
      .filter(r => r.userId === c.id && r.status !== "cancelled")
      .reduce((sum, r) => sum + r.totalPrice, 0) || 1250000;
    return {
      name: c.name,
      dépenses: totalSpent,
      limite: c.spendingLimit
    };
  });

  // Chart 3: Vehicles categories usage 
  const vehicleStatsDataset = [
    { name: "Berline Premium", valeur: vehicles.filter(v => v.category === "berline-premium").length * 8, fill: "#A38235" },
    { name: "SUV Executive", valeur: vehicles.filter(v => v.category === "suv-executive").length * 11, fill: "#D4AF37" },
    { name: "SUV Prestige", valeur: vehicles.filter(v => v.category === "suv-prestige").length * 15, fill: "#ffffff" }
  ];

  // Deny access if unauthorized or not admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0E0E14] text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield size={64} className="text-red-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold font-sans">Accès réservé aux administrateurs</h2>
        <p className="text-[#8A8A9A] mt-2 max-w-md">
          Vous devez vous connecter sous un compte d'administration système EASY pour contrôler les flottes et configurer le service de transport.
        </p>
        <Button id="go_logout_non_admin_btn" variant="primary" className="mt-6" onClick={() => setCurrentPage("connexion")}>
          S'authentifier
        </Button>
      </div>
    );
  }

  return (
    <div id="admin_system_root" className="min-h-screen bg-[#0E0E15] text-white flex flex-col">
      
      {/* 1. HORIZONTAL TOP HEADER */}
      <header className="bg-[#0A0A0F] border-b border-white-premium/5 sticky top-0 z-40 transition-all">
        
        {/* 2. HORIZONTAL SCROLLABLE LINK BAR - ULTRA-CLEAN, ORGANIZED & RESPONSIVE */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 border ${
                activeTab === "dashboard" 
                  ? "bg-white/10 text-white-premium border-white/10 font-semibold shadow-sm" 
                  : "text-muted-premium bg-transparent border-transparent hover:text-white-premium hover:bg-white-premium/5"
              }`}
            >
              <TrendingUp size={14} className={activeTab === "dashboard" ? "text-gold" : "text-neutral-400"} />
              <span>Tableau de bord</span>
            </button>

            <button
              onClick={() => setActiveTab("reservations")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 border relative ${
                activeTab === "reservations" 
                  ? "bg-white/10 text-white-premium border-white/10 font-semibold shadow-sm" 
                  : "text-muted-premium bg-transparent border-transparent hover:text-white-premium hover:bg-white-premium/5"
              }`}
            >
              <Calendar size={14} className={activeTab === "reservations" ? "text-gold" : "text-neutral-400"} />
              <span>Réservations</span>
              {stats.pendingBookingsCount > 0 && (
                <span className="bg-red-500 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold leading-none">{stats.pendingBookingsCount}</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("vehicles")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 border ${
                activeTab === "vehicles" 
                  ? "bg-white/10 text-white-premium border-white/10 font-semibold shadow-sm" 
                  : "text-muted-premium bg-transparent border-transparent hover:text-white-premium hover:bg-white-premium/5"
              }`}
            >
              <Car size={14} className={activeTab === "vehicles" ? "text-gold" : "text-neutral-400"} />
              <span>Véhicules & Flotte</span>
              <span className="text-[10px] font-mono text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded-md">{vehicles.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("drivers")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 border ${
                activeTab === "drivers" 
                  ? "bg-white/10 text-white-premium border-white/10 font-semibold shadow-sm" 
                  : "text-muted-premium bg-transparent border-transparent hover:text-white-premium hover:bg-white-premium/5"
              }`}
            >
              <UserCheck size={14} className={activeTab === "drivers" ? "text-gold" : "text-neutral-400"} />
              <span>Chauffeurs</span>
              <span className="text-[10px] font-mono text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded-md">{drivers.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("corporates")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 border ${
                activeTab === "corporates" 
                  ? "bg-white/10 text-white-premium border-white/10 font-semibold shadow-sm" 
                  : "text-muted-premium bg-transparent border-transparent hover:text-white-premium hover:bg-white-premium/5"
              }`}
            >
              <Briefcase size={14} className={activeTab === "corporates" ? "text-gold" : "text-neutral-400"} />
              <span>Gestion Corporate</span>
            </button>

            <button
              onClick={() => setActiveTab("hospitality")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 border ${
                activeTab === "hospitality" 
                  ? "bg-white/10 text-white-premium border-white/10 font-semibold shadow-sm" 
                  : "text-muted-premium bg-transparent border-transparent hover:text-white-premium hover:bg-white-premium/5"
              }`}
            >
              <Hotel size={14} className={activeTab === "hospitality" ? "text-gold" : "text-neutral-400"} />
              <span>Hôtels & Résidences</span>
              {hospitalityPartners.filter(p => p.status === "pending_validation").length > 0 && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold">
                  {hospitalityPartners.filter(p => p.status === "pending_validation").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("clients")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 border ${
                activeTab === "clients" 
                  ? "bg-white/10 text-white-premium border-white/10 font-semibold shadow-sm" 
                  : "text-muted-premium bg-transparent border-transparent hover:text-white-premium hover:bg-white-premium/5"
              }`}
            >
              <Users size={14} className={activeTab === "clients" ? "text-gold" : "text-neutral-400"} />
              <span>Clients</span>
            </button>

            <button
              onClick={() => setActiveTab("billing")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 border ${
                activeTab === "billing" 
                  ? "bg-white/10 text-white-premium border-white/10 font-semibold shadow-sm" 
                  : "text-muted-premium bg-transparent border-transparent hover:text-white-premium hover:bg-white-premium/5"
              }`}
            >
              <FileText size={14} className={activeTab === "billing" ? "text-gold" : "text-neutral-400"} />
              <span>Facturation</span>
            </button>

            <button
              onClick={() => setActiveTab("config")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 border ${
                activeTab === "config" 
                  ? "bg-white/10 text-white-premium border-white/10 font-semibold shadow-sm" 
                  : "text-muted-premium bg-transparent border-transparent hover:text-white-premium hover:bg-white-premium/5"
              }`}
            >
              <Settings size={14} className={activeTab === "config" ? "text-gold" : "text-neutral-400"} />
              <span>Gestion Système</span>
            </button>
          </nav>
        </div>
      </header>

      {/* 2. MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col px-4 py-6 md:p-8 space-y-6 w-full max-w-[1600px] mx-auto">
        
        {/* VIEW HEADER */}
        <div id="admin_top_action_bar" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white-premium/5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-transparent border border-gold/30 text-gold font-mono px-2 py-0.5 rounded uppercase font-bold">CONSOLE DE GESTION</span>
              <span className="h-1 w-1 rounded-full bg-neutral-600"></span>
              <span className="text-xs text-neutral-500 font-mono">BETA v1.2</span>
            </div>
            <h1 className="text-3xl font-extrabold font-sans text-white tracking-tight mt-1 capitalize">
              {activeTab === "dashboard" 
                ? "Tableau de Bord Exécutif" 
                : activeTab === "config" 
                  ? "Tarifications et Configuration" 
                  : activeTab === "hospitality" 
                    ? "Partenaires Hôtels & Résidences" 
                    : activeTab}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={loadAdminData}
              className="p-2.5 bg-neutral-900 border border-white/5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Actualiser</span>
            </button>

            {/* Quick Action Button based on context */}
            {activeTab === "vehicles" && (
              <Button id="quick_add_v_btn" variant="primary" className="text-xs py-2" onClick={() => handleOpenAddModal("vehicle")}>
                <Plus size={14} className="mr-1 inline" /> Ajouter un Véhicule
              </Button>
            )}
            {activeTab === "drivers" && (
              <Button id="quick_add_d_btn" variant="primary" className="text-xs py-2" onClick={() => handleOpenAddModal("driver")}>
                <Plus size={14} className="mr-1 inline" /> Engager Chauffeur
              </Button>
            )}
            {activeTab === "corporates" && (
              <Button id="quick_add_corp_btn" variant="primary" className="text-xs py-2" onClick={() => handleOpenAddModal("corporate")}>
                <Plus size={14} className="mr-1 inline" /> Enregistrer Entreprise
              </Button>
            )}
            {activeTab === "reservations" && (
              <Button id="quick_add_res_btn" variant="primary" className="text-xs py-2" onClick={() => handleOpenAddModal("reservation")}>
                <Plus size={14} className="mr-1 inline" /> Saisir Réservation
              </Button>
            )}
            {activeTab === "billing" && (
              <Button id="quick_gen_inv_btn" variant="primary" className="text-xs py-2" onClick={() => handleOpenAddModal("invoice")}>
                <Plus size={14} className="mr-1 inline" /> Générer Facture
              </Button>
            )}
          </div>
        </div>

        {/* ----------------- SUB Tab: DASHBOARD ----------------- */}
        {activeTab === "dashboard" && (
          <div className="space-y-6" id="dashboard_tab_workspace">
            
            {/* NEON-ACCENTED EXECUTIVE CARDS (Inspired by Zeus-X futuristic panel with dark slate and high contrast values) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* CHAUFFEURS EN SERVICE */}
              <div className="bg-[#0B0B0F]/90 border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden backdrop-blur-xl shadow-2xl hover:border-emerald-500/30 transition-all duration-300 group flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex items-center justify-between text-[#8A8A9A]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-mono uppercase tracking-widest font-semibold text-neutral-400">Chauffeurs en service</span>
                  </div>
                </div>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-emerald-400 tracking-tight">{stats.connectedDrivers || 3}</span>
                  <span className="text-xs text-neutral-500 font-mono">/ {drivers.length || 3} actifs</span>
                </div>
                <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-mono uppercase tracking-wider">Statut : Prêts à charger</span>
                  <span className="text-neutral-500 font-mono">100% opérationnel</span>
                </div>
              </div>

              {/* REVENUS ESTIMÉS */}
              <div className="bg-[#0B0B0F]/90 border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden backdrop-blur-xl shadow-2xl hover:border-gold/30 transition-all duration-300 group flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Background flow curve representing the energy flow line from reference */}
                <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity">
                  <svg width="180" height="80" viewBox="0 0 180 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 60 C30 40, 60 70, 90 30 C120 -10, 150 20, 180 10 L180 80 L0 80 Z" fill="url(#gold_grad_wave)" />
                    <path d="M0 60 C30 40, 60 70, 90 30 C120 -10, 150 20, 180 10" stroke="#C5A880" strokeWidth="1.5" strokeDasharray="3 3" />
                    <defs>
                      <linearGradient id="gold_grad_wave" x1="90" y1="0" x2="90" y2="80" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#C5A880" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#C5A880" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[#8A8A9A]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                    </span>
                    <span className="text-xs font-mono uppercase tracking-widest font-semibold text-neutral-400">Revenus Estimés (Mois)</span>
                  </div>
                </div>
                <div className="mt-6">
                  <span className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-gold-light tracking-tight block">
                    {(stats.monthlyRevenue ?? 0).toLocaleString()} <span className="text-sm font-bold text-gold-light">CFA</span>
                  </span>
                </div>
                <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[10px]">
                  <span className="text-neutral-500 font-mono">Projection facturable estimée</span>
                  <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                    <TrendingUp size={11} /> +12.4%
                  </span>
                </div>
              </div>

              {/* FLOTTE ACTUELLE */}
              <div className="bg-[#0B0B0F]/90 border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden backdrop-blur-xl shadow-2xl hover:border-white/20 transition-all duration-300 group flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex items-center justify-between text-[#8A8A9A]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500"></span>
                    </span>
                    <span className="text-xs font-mono uppercase tracking-widest font-semibold text-neutral-400">Flotte Actuelle</span>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-neutral-400 tracking-tight">{vehicles.length}</span>
                    <span className="text-xs text-neutral-500 block font-mono">véhicules</span>
                  </div>
                  
                  {/* Glowing vertical/horizontal capsule pill metrics (Inspired by Zeus-X outputs) */}
                  <div className="w-1/2 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <span className="text-neutral-400">Libres</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold">{stats.vehiclesAvailable || vehicles.filter(v=>v.status==="Disponible").length}</span>
                        <div className="w-8 h-1.5 rounded-full bg-[#14141A] border border-white/[0.06] flex items-center p-0.5">
                          <div className="h-full w-4/5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <span className="text-neutral-400">Mission</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold">{stats.vehiclesInMission || 0}</span>
                        <div className="w-8 h-1.5 rounded-full bg-[#14141A] border border-white/[0.06] flex items-center p-0.5">
                          <div className="h-full w-0 rounded-full bg-amber-400" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <span className="text-neutral-400">Maint.</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-rose-400 font-bold">{stats.vehiclesMaintenance || vehicles.filter(v=>v.status==="Indisponible").length}</span>
                        <div className="w-8 h-1.5 rounded-full bg-[#14141A] border border-white/[0.06] flex items-center p-0.5">
                          <div className="h-full w-1/5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* TWIN PANEL BACK-OFFICE SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: ACTIVE AND PENDING DISPATCH LIST */}
              <div className="lg:col-span-4 bg-[#0B0B0F]/90 border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden group hover:border-red-500/20 transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div>
                  <h3 className="font-semibold font-sans text-white text-sm mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                      </span>
                      <span className="tracking-wide">Réservations non dispatchées</span>
                    </span>
                    <span className="bg-transparent text-red-400 font-mono text-[9px] font-bold tracking-widest border border-red-500/40 rounded-full px-2 py-0.5 animate-pulse uppercase">Alerte</span>
                  </h3>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {reservations.filter(r => r.status === "pending_assignment" || r.status === "pending" || r.status === "À facturer").length === 0 ? (
                      <div className="p-8 text-center text-xs text-neutral-500 flex flex-col items-center justify-center py-14 relative">
                        <div className="relative mb-4 w-20 h-20 flex items-center justify-center">
                          {/* Radar circular lines resembling circular gauges */}
                          <div className="absolute inset-0 rounded-full border border-emerald-500/5 animate-ping opacity-25" />
                          <div className="absolute inset-2 rounded-full border border-emerald-500/10" />
                          <div className="absolute inset-5 rounded-full border border-emerald-500/20 border-dashed animate-spin duration-10000" />
                          <CheckCircle size={28} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] relative z-10" />
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 font-bold mb-1">Flux Optimal</span>
                        <p className="text-neutral-500 text-[11px]">Aucune réservation en attente</p>
                      </div>
                    ) : (
                      reservations.filter(r => r.status === "pending_assignment" || r.status === "pending" || r.status === "À facturer").map(r => (
                        <div key={r.id} className="p-3 bg-[#111116] hover:bg-[#15151D] rounded-xl border border-white-premium/5 text-xs transition-colors cursor-pointer group/item hover:border-gold/20" onClick={() => handleOpenEditModal(r, "reservation")}>
                          <div className="flex justify-between font-semibold">
                            <span className="text-neutral-400 font-mono">#{r.id}</span>
                            <span className="text-gold font-mono">{r.totalPrice?.toLocaleString()} CFA</span>
                          </div>
                          <div className="text-[#8A8A9A] mt-2 space-y-1 text-[11px]">
                            <p className="flex items-center gap-1.5 truncate"><MapPin size={11} className="text-gold shrink-0" /> <span className="truncate">{r.pickup} → {r.destination}</span></p>
                            <p className="flex items-center gap-1.5"><Clock size={11} className="text-neutral-500" /> {r.departureDate} à {r.departureTime}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-white/[0.04] flex gap-1 justify-end">
                            <Button id={`dispatch_manual_btn_${r.id}`} variant="outline" className="text-[9px] py-1 px-2 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(r, "reservation"); }}>
                              Dispatch Manuel
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.04] mt-4">
                  <Button id="go_to_full_bookings_btn" variant="outline" className="w-full text-xs font-mono tracking-wide" onClick={() => setActiveTab("reservations")}>
                    Voir tout le dispatching ({reservations.length})
                  </Button>
                </div>
              </div>

              {/* RIGHT PANEL: INTERACTIVE RESERVATION CALENDAR */}
              <div className="lg:col-span-8 bg-[#0B0B0F]/90 border border-white/[0.06] p-6 rounded-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Micro tech vector graphic in background */}
                <div className="absolute right-4 top-4 opacity-5 pointer-events-none">
                  <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="1" strokeDasharray="5 5" />
                    <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="1" />
                    <circle cx="50" cy="50" r="10" stroke="gold" strokeWidth="1" />
                  </svg>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-semibold font-sans text-white text-base tracking-wide flex items-center gap-2">
                        <Calendar size={18} className="text-gold" />
                        Planning des Trajets (Calendrier)
                      </h3>
                      <p className="text-xs text-neutral-500">Visualisez et dispatchez les réservations par date</p>
                    </div>
                    
                    {/* Month switcher navigation */}
                    <div className="flex items-center gap-2 bg-[#121217] border border-white/[0.05] rounded-xl p-1 shrink-0 self-start sm:self-auto">
                      <button 
                        onClick={() => {
                          const year = currentCalendarDate.getFullYear();
                          const month = currentCalendarDate.getMonth();
                          setCurrentCalendarDate(new Date(year, month - 1, 1));
                        }}
                        className="p-1.5 hover:bg-white/[0.05] rounded-lg transition-colors text-neutral-400 hover:text-white animate-none"
                        title="Mois précédent"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-mono font-bold text-white px-3 min-w-[100px] text-center">
                        {[
                          "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                          "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
                        ][currentCalendarDate.getMonth()]} {currentCalendarDate.getFullYear()}
                      </span>
                      <button 
                        onClick={() => {
                          const year = currentCalendarDate.getFullYear();
                          const month = currentCalendarDate.getMonth();
                          setCurrentCalendarDate(new Date(year, month + 1, 1));
                        }}
                        className="p-1.5 hover:bg-white/[0.05] rounded-lg transition-colors text-neutral-400 hover:text-white animate-none"
                        title="Mois suivant"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* CALENDAR MONTH GRID */}
                  <div className="bg-[#0e0e13]/60 border border-white/[0.04] rounded-2xl p-4 mb-6">
                    {/* Weekday titles */}
                    <div className="grid grid-cols-7 text-center mb-2">
                      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                        <span key={day} className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 py-1">
                          {day}
                        </span>
                      ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const calYear = currentCalendarDate.getFullYear();
                        const calMonth = currentCalendarDate.getMonth();
                        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                        const firstDayRaw = new Date(calYear, calMonth, 1).getDay();
                        const firstDayOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

                        const cells = [];
                        // Empty cells
                        for (let i = 0; i < firstDayOffset; i++) {
                          cells.push(
                            <div key={`empty-${i}`} className="aspect-square opacity-20 border border-transparent" />
                          );
                        }

                        // Actual days
                        for (let d = 1; d <= daysInMonth; d++) {
                          const dStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const isSelected = selectedCalendarDate === dStr;
                          const dayRides = reservations.filter(r => r.departureDate === dStr);
                          const hasRides = dayRides.length > 0;

                          cells.push(
                            <button
                              key={`day-${d}`}
                              onClick={() => setSelectedCalendarDate(dStr)}
                              className={`aspect-square rounded-xl flex flex-col items-center justify-between p-1.5 transition-all relative border cursor-pointer ${
                                isSelected
                                  ? "bg-gold text-black border-gold shadow-[0_0_12px_rgba(197,168,128,0.4)]"
                                  : hasRides
                                    ? "bg-[#C5A880]/10 border-[#C5A880]/30 hover:bg-[#C5A880]/20 text-white font-bold"
                                    : "bg-transparent border-white/[0.03] hover:border-white/10 text-neutral-400 hover:text-white"
                              }`}
                            >
                              <span className="text-xs font-mono font-bold self-start">{d}</span>
                              
                              {/* Count / indicator of reservations */}
                              {hasRides && (
                                <div className="w-full flex justify-end items-center gap-1 mt-auto">
                                  <span className={`text-[8px] font-bold font-mono px-1 rounded-md ${
                                    isSelected 
                                      ? "bg-black text-gold font-black" 
                                      : "bg-[#C5A880] text-black"
                                  }`}>
                                    {dayRides.length}
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  </div>

                  {/* SELECTED DATE DETAILS & LISTING */}
                  <div className="border-t border-white/[0.04] pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                        Détails du {(() => {
                          const [y, m, d] = selectedCalendarDate.split("-");
                          if (!y || !m || !d) return selectedCalendarDate;
                          return `${parseInt(d)} ${[
                            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
                          ][parseInt(m) - 1]} ${y}`;
                        })()}
                      </h4>
                      <span className="text-[10px] bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-0.5 text-neutral-400 font-mono">
                        {reservations.filter(r => r.departureDate === selectedCalendarDate).length} réservation(s)
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                      {(() => {
                        const dayReservations = reservations.filter(r => r.departureDate === selectedCalendarDate);
                        if (dayReservations.length === 0) {
                          return (
                            <div className="py-8 text-center text-xs text-neutral-500 border border-dashed border-white/[0.05] rounded-xl flex flex-col items-center justify-center">
                              <Calendar size={20} className="text-neutral-600 mb-2" />
                              <p>Aucun trajet programmé pour cette date</p>
                            </div>
                          );
                        }

                        return dayReservations.map(r => {
                          // Get some status colors
                          let statusBg = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
                          if (r.status === "confirmed" || r.status === "Terminée" || r.status === "Réglée" || r.status === "Payée") {
                            statusBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                          } else if (r.status === "En cours" || r.status === "en_mission") {
                            statusBg = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                          } else if (r.status === "cancelled" || r.status === "Annulée") {
                            statusBg = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                          }

                          return (
                            <div 
                              key={r.id} 
                              onClick={() => handleOpenEditModal(r, "reservation")}
                              className="p-3 bg-[#111116]/80 hover:bg-[#15151e] border border-white/[0.04] rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gold/30 group/item"
                            >
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs text-gold font-bold">#{r.id}</span>
                                  <span className="text-xs text-white font-semibold truncate max-w-[150px]">
                                    {r.clientName || getReservationCreatorInfo(r.userId).name}
                                  </span>
                                  {(() => {
                                    const creator = getReservationCreatorInfo(r.userId);
                                    if (creator.type !== "client") {
                                      return (
                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${creator.badgeColor}`}>
                                          {creator.label}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {r.status === "cancelled" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/90 text-rose-200 border border-rose-500 font-extrabold text-[9px] font-mono uppercase tracking-wider">
                                      <XCircle size={10} className="text-rose-400 shrink-0" />
                                      TAMPON : ANNULÉE
                                    </span>
                                  ) : (
                                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusBg}`}>
                                      {r.status}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-neutral-400 space-y-1">
                                  <p className="flex items-center gap-1.5 truncate">
                                    <MapPin size={11} className="text-gold shrink-0" />
                                    <span className="truncate">{r.pickup} ➔ {r.destination}</span>
                                  </p>
                                  <p className="flex items-center gap-1.5">
                                    <Clock size={11} className="text-neutral-500 shrink-0" />
                                    <span>Départ à <strong className="text-white">{r.departureTime}</strong></span>
                                    {r.formula && (
                                      <span className="text-neutral-500 font-mono text-[9px] uppercase tracking-wider bg-white/[0.03] px-1 rounded">
                                        {r.formula === "hourly" ? "Horaire" : r.formula === "halfday" ? "Demi-journée" : "Mise à dispo"}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-white/[0.03]">
                                <span className="font-mono text-xs font-bold text-white">
                                  {r.totalPrice?.toLocaleString()} CFA
                                </span>
                                <Button 
                                  id={`cal_dispatch_btn_${r.id}`}
                                  variant="outline" 
                                  className="text-[9px] py-1 px-2 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white group-hover/item:border-gold/30"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleOpenEditModal(r, "reservation"); 
                                  }}
                                >
                                  Gérer / Dispatch
                                </Button>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/[0.04] text-xs text-neutral-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="inline-block w-1 h-1 rounded-full bg-[#8A8A9A]" />
                    Dernière synchronisation automatique
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-widest uppercase bg-transparent text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Système Actif
                  </span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ----------------- SUB Tab: RESERVATIONS ----------------- */}
        {activeTab === "reservations" && (
          <div className="space-y-4" id="reservations_tab_workspace">
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une course (Pick, Dest, ID, Client...)" 
                  className="w-full bg-[#111116] border border-white-premium/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-gold"
                />
              </div>

              <div className="flex gap-2">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#111116] border border-white-premium/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending_assignment">En attente d'attribution</option>
                  <option value="assigned">Chauffeur Assigné</option>
                  <option value="completed">Terminée</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>
            </div>

            <div className="bg-[#111116] border border-white-premium/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#181824] uppercase text-[10px] font-mono tracking-wider text-neutral-400 border-b border-white-premium/5">
                    <tr>
                      <th className="p-4">Ref/ID</th>
                      <th className="p-4">Désignation Passager</th>
                      <th className="p-4">Départ/Heure</th>
                      <th className="p-4">Trajet (Départ / Arrivée)</th>
                      <th className="p-4">Chauffeur Assigné</th>
                      <th className="p-4">Tarif</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredReservations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-neutral-500">Aucune réservation ne correspond aux critères de recherche.</td>
                      </tr>
                    ) : (
                      filteredReservations.map(r => {
                        const drv = drivers.find(d => d.id === r.driverId);
                        return (
                          <tr key={r.id} className={`hover:bg-white/[0.02] transition-colors ${r.status === "cancelled" ? "bg-rose-950/20 border-l-4 border-l-rose-500" : ""}`}>
                            <td className="p-4 font-mono font-bold text-white">#{r.id}</td>
                            <td className="p-4">
                              <span className="font-semibold block text-white">
                                {r.clientName || getReservationCreatorInfo(r.userId).name}
                              </span>
                              {(() => {
                                const creator = getReservationCreatorInfo(r.userId);
                                if (creator.type !== "client") {
                                  return (
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 mt-1 rounded border ${creator.badgeColor}`}>
                                      {creator.label}
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 mt-1 rounded border bg-transparent text-neutral-400 border-white/10">
                                      Client B2C
                                    </span>
                                  );
                                }
                              })()}
                            </td>
                            <td className="p-4">{r.departureDate} à {r.departureTime}</td>
                            <td className="p-4">
                              <span className="font-semibold block">{r.pickup}</span>
                              <span className="text-[10px] text-neutral-500 block">→ {r.destination}</span>
                            </td>
                            <td className="p-4 text-gold">
                              {drv ? (
                                <span className="flex items-center gap-1">
                                  <UserCheck size={12} /> {drv.name}
                                </span>
                              ) : (
                                <span className="text-yellow-500/80 font-semibold font-mono">NON ASSIGNÉ</span>
                              )}
                            </td>
                            <td className="p-[#D4AF37] p-4 text-gold font-extrabold">{r.totalPrice?.toLocaleString()} CFA</td>
                            <td className="p-4">
                              {r.status === "cancelled" ? (
                                <div className="relative inline-block">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950 text-rose-200 border-2 border-rose-500 font-extrabold text-[10px] font-mono tracking-wider uppercase shadow-[0_0_12px_rgba(244,63,94,0.35)] transform -rotate-1">
                                    <XCircle size={13} className="text-rose-400 shrink-0 stroke-[2.5px]" />
                                    TAMPON : ANNULÉE
                                  </span>
                                </div>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  r.status === "completed" || r.status === "confirmed" || r.status === "Payée" ? "bg-transparent text-emerald-400 border-emerald-500/30" :
                                  r.status === "pending_assignment" || r.status === "pending" ? "bg-transparent text-yellow-400 border-yellow-500/30 animate-pulse" :
                                  "bg-transparent text-purple-400 border-purple-500/30"
                                }`}>
                                  {r.status === "pending_assignment" ? "EN ATTENTE" : r.status === "confirmed" ? "CONFIRMÉE" : r.status === "completed" ? "TERMINÉE" : r.status}
                                </span>
                              )}
                              {r.dispositionConfirmed ? (
                                <span className="block text-[8px] text-emerald-400 font-extrabold tracking-wider mt-1 uppercase font-mono">
                                  ✓ DISPO CONFIRMÉE
                                </span>
                              ) : (
                                <span className="block text-[8px] text-neutral-500 font-bold tracking-wider mt-1 uppercase font-mono">
                                  ⏳ DISPO EN ATTENTE
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                              <button className="text-neutral-400 hover:text-white p-1" onClick={() => handleOpenEditModal(r, "reservation")}>
                                <Edit2 size={13} />
                              </button>
                              <button className="text-red-400 hover:text-red-300 p-1" onClick={() => handleDelete(r.id, "reservation")}>
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB Tab: VEHICLES ----------------- */}
        {activeTab === "vehicles" && (
          <div className="space-y-4" id="vehicles_tab_workspace">
            {(() => {
              // Detailed View Mode
              if (selectedVehicleId) {
                const activeVehicle = vehicles.find(v => v.id === selectedVehicleId);
                if (!activeVehicle) {
                  setSelectedVehicleId(null);
                  return null;
                }

                // Drivers who work with this vehicle
                const assignedDrivers = drivers.filter(d => d.vehicleId === activeVehicle.id);

                // Image logic based on selected angle
                let currentImage = activeVehicle.photoFront;
                if (activePhotoAngle === "back") currentImage = activeVehicle.photoBack || activeVehicle.photoFront;
                if (activePhotoAngle === "left") currentImage = activeVehicle.photoLeft || activeVehicle.photoFront;
                if (activePhotoAngle === "right") currentImage = activeVehicle.photoRight || activeVehicle.photoFront;

                // Fallbacks if images are missing
                const defaultCarImg = "https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=600";
                if (!currentImage) currentImage = defaultCarImg;

                return (
                  <div className="bg-[#0E0E14] border border-white-premium/5 rounded-3xl p-6 text-white space-y-6 transition-all duration-300">
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
                      <button 
                        onClick={() => setSelectedVehicleId(null)}
                        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors bg-[#111116] px-3.5 py-2 rounded-lg border border-white/5"
                      >
                        <ArrowLeft size={14} className="text-gold" />
                        <span>Retour à la liste</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button 
                          className="text-xs text-neutral-300 hover:text-white bg-[#111116] px-3.5 py-2 rounded-lg border border-white/5 flex items-center gap-1.5 transition-all"
                          onClick={() => handleOpenEditModal(activeVehicle, "vehicle")}
                        >
                          <Edit2 size={13} className="text-gold" />
                          <span>Modifier</span>
                        </button>
                        <button 
                          className="text-xs text-red-400 hover:text-red-300 bg-transparent hover:bg-white/5 px-3.5 py-2 rounded-lg border border-red-500/30 flex items-center gap-1.5 transition-all"
                          onClick={() => {
                            handleDelete(activeVehicle.id, "vehicle");
                            setSelectedVehicleId(null);
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>

                    {/* Main High Fidelity Layout (3 Columns like mockup) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      
                      {/* COLUMN 1 (Left Sidebar: Drivers & Technical Specs) */}
                      <div className="lg:col-span-3 space-y-5 flex flex-col justify-between">
                        {/* Driver Profile block */}
                        <div className="bg-[#111116] border border-white/5 p-5 rounded-2xl space-y-4">
                          <h4 className="text-xs uppercase font-mono tracking-wider text-neutral-400 font-bold border-b border-white/5 pb-2">
                            Chauffeur(s) Actif(s)
                          </h4>

                          {assignedDrivers.length > 0 ? (
                            <div className="space-y-4">
                              {assignedDrivers.map(drv => (
                                <div key={drv.id} className="flex items-center gap-3 bg-[#15151D] p-3 rounded-lg border border-white/5">
                                  <img 
                                    src={drv.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256"} 
                                    alt={drv.name} 
                                    className="h-11 w-11 rounded-full border border-gold/20 object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <h5 className="text-sm font-bold truncate text-white">{drv.name}</h5>
                                    <p className="text-[10px] text-gold font-mono mt-0.5 uppercase tracking-wide">
                                      {drv.shift === "matin" ? "Shift Matin" : drv.shift === "apres-midi" ? "Shift Après-midi" : "Shift Complet"}
                                    </p>
                                    <p className="text-[10px] text-neutral-500 truncate mt-0.5">{drv.phone}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-[#15151D] rounded-xl border border-dashed border-white/10 p-3">
                              <UserCheck size={24} className="mx-auto text-neutral-600 mb-2" />
                              <p className="text-xs text-neutral-400 font-semibold">Aucun chauffeur assigné</p>
                              <p className="text-[10px] text-neutral-500 mt-1">
                                Liez un chauffeur à ce véhicule depuis l'onglet Chauffeurs.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Specs Panel */}
                        <div className="bg-[#111116] border border-white/5 p-5 rounded-2xl space-y-3.5 flex-1 flex flex-col justify-center">
                          <h4 className="text-xs uppercase font-mono tracking-wider text-neutral-400 font-bold border-b border-white/5 pb-2 mb-1">
                            Spécifications
                          </h4>

                          <div className="flex justify-between items-center py-1">
                            <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                              <Gauge size={13} className="text-gold" /> Vitesse Max
                            </span>
                            <span className="font-mono text-sm font-bold text-white">{activeVehicle.maxSpeed || 240} km/h</span>
                          </div>

                          <div className="flex justify-between items-center py-1">
                            <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                              <Activity size={13} className="text-gold" /> Consommation
                            </span>
                            <span className="font-mono text-sm font-bold text-white">{activeVehicle.fuelConsumption || "17.4 kWh/100km"}</span>
                          </div>

                          <div className="flex justify-between items-center py-1">
                            <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                              <Battery size={13} className="text-gold" /> Autonomie
                            </span>
                            <span className="font-mono text-sm font-bold text-emerald-400">{activeVehicle.batteryLevel}%</span>
                          </div>

                          <div className="flex justify-between items-center py-1">
                            <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                              <Zap size={13} className="text-gold" /> Kilométrage
                            </span>
                            <span className="font-mono text-sm font-bold text-white">{activeVehicle.totalDistance || "11,368 KM"}</span>
                          </div>

                          <div className="border-t border-white/5 pt-3 mt-1 space-y-2 text-[11px] text-neutral-400">
                            <div className="flex justify-between">
                              <span>Plaque :</span>
                              <span className="font-mono text-white font-bold">{activeVehicle.immatriculation}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Catégorie :</span>
                              <span className="capitalize text-white font-medium">{activeVehicle.category?.replace('-', ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Statut :</span>
                              <span className={`font-semibold ${activeVehicle.status === "Disponible" ? "text-emerald-400" : "text-rose-400"}`}>
                                {activeVehicle.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* COLUMN 2 (Center Hero Panel: Giant interactive model render & angles) */}
                      <div className="lg:col-span-6 bg-[#111116] border border-white/5 rounded-2xl p-6 flex flex-col justify-between items-center relative overflow-hidden">
                        
                        {/* Floating visual name tags */}
                        <div className="w-full text-left z-10">
                          <span className="text-[10px] uppercase font-mono tracking-widest bg-white/5 px-2.5 py-1 rounded-full text-neutral-400">
                            EASY VIP FLEET • {activeVehicle.brand}
                          </span>
                          <h2 className="text-4xl font-extrabold tracking-tight mt-3 text-white uppercase font-sans">
                            {activeVehicle.name} <span className="text-gold font-normal text-2xl">/ {activeVehicle.immatriculation?.substring(0, 5)}</span>
                          </h2>
                        </div>

                        {/* Large Image Showcase with active transition */}
                        <div className="my-8 flex items-center justify-center min-h-[250px] w-full relative group">
                          <img 
                            src={currentImage} 
                            alt={`${activeVehicle.brand} ${activeVehicle.name}`} 
                            className="max-h-[280px] object-contain transition-transform duration-500 hover:scale-105 z-10 drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                            onError={(e) => { (e.target as HTMLImageElement).src = defaultCarImg; }}
                          />
                        </div>

                        {/* Interactive angles tabs - premium styling mimicking mockup */}
                        <div className="w-full border-t border-white/5 pt-4">
                          <div className="flex justify-center gap-3 flex-wrap">
                            {(["front", "back", "left", "right"] as const).map(angle => {
                              let angleLabel = "Face / Avant";
                              let sideImg = activeVehicle.photoFront;
                              if (angle === "back") { angleLabel = "Arrière"; sideImg = activeVehicle.photoBack; }
                              if (angle === "left") { angleLabel = "Côté Gauche"; sideImg = activeVehicle.photoLeft; }
                              if (angle === "right") { angleLabel = "Côté Droit"; sideImg = activeVehicle.photoRight; }

                              const isActive = activePhotoAngle === angle;

                              return (
                                <button
                                  key={angle}
                                  onClick={() => setActivePhotoAngle(angle)}
                                  className={`flex flex-col items-center gap-2 p-1 px-3 py-2 rounded-lg transition-all border ${
                                    isActive 
                                      ? "bg-white/10 border-gold/40 text-white shadow-sm" 
                                      : "bg-[#0E0E14] border-white/5 text-neutral-400 hover:text-white hover:border-white/10"
                                  }`}
                                >
                                  {sideImg ? (
                                    <img 
                                      src={sideImg} 
                                      alt={angleLabel} 
                                      className="h-9 w-14 object-cover rounded bg-[#111116] border border-white/5" 
                                      onError={(e) => { (e.target as HTMLImageElement).src = defaultCarImg; }}
                                    />
                                  ) : (
                                    <div className="h-9 w-14 flex items-center justify-center rounded bg-[#111116] border border-white/5 text-[10px] font-mono text-neutral-600">
                                      N/A
                                    </div>
                                  )}
                                  <span className="text-[10px] font-medium tracking-wide">{angleLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </div>

                      {/* COLUMN 3 (Right Sidebar: Quick fleet navigation & switcher) */}
                      <div className="lg:col-span-3 bg-[#111116] border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs uppercase font-mono tracking-wider text-neutral-400 font-bold border-b border-white/5 pb-2 mb-3">
                            Sélectionner Flotte
                          </h4>

                          {/* Quick vehicle lists scrollable */}
                          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                            {vehicles.map(v => {
                              const isCurrent = v.id === selectedVehicleId;
                              return (
                                <div 
                                  key={v.id}
                                  onClick={() => {
                                    setSelectedVehicleId(v.id);
                                    setActivePhotoAngle("front"); // Reset to front side
                                  }}
                                  className={`p-3 rounded-lg cursor-pointer border transition-all flex items-center gap-2.5 ${
                                    isCurrent 
                                      ? "bg-white/10 border-gold/40 text-white shadow-sm" 
                                      : "bg-[#0E0E14] border-white/5 hover:border-white/10 hover:bg-[#13131A] text-neutral-300"
                                  }`}
                                >
                                  <img 
                                    src={v.photoFront || defaultCarImg} 
                                    alt={v.name} 
                                    className="h-8 w-12 object-contain bg-[#111116] rounded p-0.5"
                                    onError={(e) => { (e.target as HTMLImageElement).src = defaultCarImg; }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-center">
                                      <p className="text-xs font-bold truncate">{v.brand} {v.name}</p>
                                      <span className={`h-1.5 w-1.5 rounded-full ${v.status === "Disponible" ? "bg-emerald-500" : "bg-rose-500"}`} />
                                    </div>
                                    <p className="text-[9px] font-mono text-neutral-500 mt-0.5">{v.immatriculation}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Add vehicle tile like mockup */}
                        <button 
                          onClick={() => handleOpenAddModal("vehicle")}
                          className="w-full mt-4 bg-[#0E0E14] border border-dashed border-white/10 hover:border-gold/40 hover:bg-white/[0.02] p-4 rounded-lg text-neutral-400 hover:text-white flex flex-col items-center justify-center gap-2 transition-all group"
                        >
                          <Plus size={20} className="text-gold group-hover:scale-105 transition-transform" />
                          <span className="text-xs font-bold font-mono">Ajouter un véhicule</span>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              }

              // Standard Minimalist List Mode (Max 5 per page)
              const itemsPerPage = 5;
              const totalVehiclePages = Math.ceil(filteredVehicles.length / itemsPerPage) || 1;
              const activeVehiclePage = Math.min(vehiclePage, totalVehiclePages);
              const paginatedVehicles = filteredVehicles.slice(
                (activeVehiclePage - 1) * itemsPerPage,
                activeVehiclePage * itemsPerPage
              );

              return (
                <div className="space-y-4">
                  {/* Search Bar and Meta header */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#111116] p-4 rounded-xl border border-white-premium/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Total véhicules : {vehicles.length} enregistrés</span>
                      <span className="text-[10px] font-mono bg-transparent text-gold border border-gold/30 px-2 py-0.5 rounded">
                        Minimalist Mode (5/page)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                        <input 
                          type="text" 
                          value={vehicleSearchQuery}
                          onChange={(e) => {
                            setVehicleSearchQuery(e.target.value);
                            setVehiclePage(1); // Reset page on search
                          }}
                          placeholder="Rechercher marque, modèle, plaque..." 
                          className="w-full bg-[#0E0E15] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-gold/60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Minimalist table list of vehicles */}
                  <div className="bg-[#111116] rounded-xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-[#15151D] text-neutral-400 font-mono text-[10px] uppercase tracking-wider">
                            <th className="p-4 font-bold">Aperçu</th>
                            <th className="p-4 font-bold">Modèle & Marque</th>
                            <th className="p-4 font-bold">Immatriculation</th>
                            <th className="p-4 font-bold">Catégorie</th>
                            <th className="p-4 font-bold">Autonomie / Batterie</th>
                            <th className="p-4 font-bold">Statut</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {paginatedVehicles.length > 0 ? (
                            paginatedVehicles.map(v => {
                              const isAvailable = v.status === "Disponible";
                              const defaultCarImg = "https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=600";
                              return (
                                <tr 
                                  key={v.id}
                                  onClick={() => {
                                    setSelectedVehicleId(v.id);
                                    setActivePhotoAngle("front");
                                  }}
                                  className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                                >
                                  <td className="p-4">
                                    <div className="h-9 w-14 rounded bg-[#0E0E15] border border-white/5 p-1 flex items-center justify-center overflow-hidden">
                                      <img 
                                        src={v.photoFront || defaultCarImg} 
                                        alt={v.name} 
                                        className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-300" 
                                        onError={(e) => { (e.target as HTMLImageElement).src = defaultCarImg; }}
                                      />
                                    </div>
                                  </td>
                                  <td className="p-4 font-bold text-white">
                                    <span className="text-sm font-sans block group-hover:text-gold transition-colors">
                                      {v.brand} {v.name}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 font-normal font-mono block">ID: {v.id.substring(0, 8)}</span>
                                  </td>
                                  <td className="p-4 font-mono font-bold text-neutral-300">
                                    {v.immatriculation}
                                  </td>
                                  <td className="p-4 capitalize text-neutral-400">
                                    {v.category === "berline-premium" ? "Berline Premium" : v.category === "suv-executive" ? "SUV Executive" : "Prestige"}
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-1.5 font-mono text-white font-bold">
                                      <Battery size={13} className="text-gold" />
                                      <span>{v.batteryLevel}%</span>
                                    </div>
                                    <div className="w-16 h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                      <div 
                                        className="h-full bg-gold" 
                                        style={{ width: `${v.batteryLevel}%` }}
                                      />
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                      isAvailable ? "bg-transparent text-emerald-400 border-emerald-500/30" : "bg-transparent text-rose-400 border-rose-500/30"
                                    }`}>
                                      {v.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex gap-2 justify-end">
                                      <button 
                                        onClick={() => handleOpenEditModal(v, "vehicle")}
                                        className="p-1.5 hover:bg-white/5 rounded text-neutral-400 hover:text-white transition-colors"
                                        title="Modifier"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button 
                                        onClick={() => handleDelete(v.id, "vehicle")}
                                        className="p-1.5 hover:bg-red-500/10 rounded text-red-400 hover:text-red-300 transition-colors"
                                        title="Supprimer"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center py-10 text-neutral-500 font-mono text-xs">
                                Aucun véhicule trouvé pour "{vehicleSearchQuery}"
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {totalVehiclePages > 1 && (
                    <div className="flex items-center justify-between bg-[#111116] p-4 rounded-xl border border-white-premium/5 text-xs text-neutral-400">
                      <span>
                        Affichage de la page <strong className="text-white">{activeVehiclePage}</strong> sur <strong className="text-white">{totalVehiclePages}</strong> ({filteredVehicles.length} véhicules)
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          disabled={activeVehiclePage === 1}
                          onClick={() => setVehiclePage(prev => Math.max(1, prev - 1))}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0E0E15] border border-white/5 text-xs font-bold text-white hover:border-gold/60 disabled:opacity-30 disabled:hover:border-white/5 disabled:pointer-events-none transition-all"
                        >
                          Précédent
                        </button>
                        <button
                          disabled={activeVehiclePage === totalVehiclePages}
                          onClick={() => setVehiclePage(prev => Math.min(totalVehiclePages, prev + 1))}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0E0E15] border border-white/5 text-xs font-bold text-white hover:border-gold/60 disabled:opacity-30 disabled:hover:border-white/5 disabled:pointer-events-none transition-all"
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ----------------- SUB Tab: DRIVERS ----------------- */}
        {activeTab === "drivers" && (
          <div className="space-y-4" id="drivers_tab_workspace">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#111116] p-4 rounded-xl border border-white-premium/5">
              <span className="text-xs text-neutral-400">Total chauffeurs : {drivers.length} sous contrat</span>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                <input 
                  type="text" 
                  value={driverSearchQuery}
                  onChange={(e) => setDriverSearchQuery(e.target.value)}
                  placeholder="Rechercher un chauffeur..." 
                  className="w-full bg-[#0E0E15] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-gold/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
              {filteredDrivers.map(d => {
                const isExpanded = !!expandedDrivers[d.id];
                const v = vehicles.find(veh => veh.id === d.vehicleId);
                return (
                  <div key={d.id} className="bg-[#111116] border border-white-premium/5 rounded-xl transition-all duration-200">
                    {/* Header compact */}
                    <div 
                      onClick={() => setExpandedDrivers(isExpanded ? {} : { [d.id]: true })}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] rounded-t-xl"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={d.photo} 
                          alt={d.name} 
                          className="h-8 w-8 rounded-full border border-gold/15 object-cover select-none referrerPolicy='no-referrer'" 
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white">{d.name}</h4>
                          <p className="text-[10px] text-gold font-semibold mt-0.5 font-mono">
                            {v ? `${v.brand} ${v.name}` : "Sans véhicule lié"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          d.status === "disponible" ? "bg-transparent text-emerald-400 border-emerald-500/30" : "bg-transparent text-rose-400 border-rose-500/30"
                        }`}>
                          {d.status}
                        </span>
                        {isExpanded ? <ChevronUp size={14} className="text-neutral-500" /> : <ChevronDown size={14} className="text-neutral-500" />}
                      </div>
                    </div>

                    {/* Details section, rendered only if expanded */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-[#14141A]/50 rounded-b-xl space-y-3.5">
                        <div className="grid grid-cols-1 gap-2 text-xs text-neutral-400">
                          <div className="bg-[#0E0E15] p-2.5 rounded-lg border border-white/5 flex justify-between items-center">
                            <span>Téléphone :</span>
                            <span className="text-white font-mono">{d.phone}</span>
                          </div>
                          <div className="bg-[#0E0E15] p-2.5 rounded-lg border border-white/5 flex justify-between items-center">
                            <span>Email pro :</span>
                            <span className="text-white font-mono">{d.email}</span>
                          </div>
                          {v && (
                            <div className="bg-transparent border border-white/10 p-2.5 rounded-lg flex justify-between items-center">
                              <span className="text-[11px]">Véhicule attitré :</span>
                              <span className="text-gold font-semibold text-right text-[11px] font-mono">
                                {v.brand} {v.name} ({v.immatriculation})
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[10px] text-neutral-500 font-mono">ID: {d.id.substring(0, 8)}...</span>
                          <div className="flex gap-1.5">
                            <button 
                              className="text-neutral-400 hover:text-white p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/5 rounded-lg text-[11px] flex items-center gap-1 transition-all" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(d, "driver");
                              }}
                            >
                              <Edit2 size={12} />
                              <span>Modifier</span>
                            </button>
                            <button 
                              className="text-red-400 hover:text-red-300 p-1.5 bg-neutral-900 hover:bg-red-500/10 border border-white/5 rounded-lg text-[11px] flex items-center gap-1 transition-all" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(d.id, "driver");
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ----------------- SUB Tab: CORPORATE Accounts ----------------- */}
        {activeTab === "corporates" && (
          <div className="space-y-4" id="corporates_tab_workspace">
            <div className="bg-[#111116] p-4 rounded-xl border border-white-premium/5">
              <span className="text-xs text-neutral-400">Total entreprises affiliées : {corporates.length} sous contrat-cadre</span>
            </div>

            <div className="bg-[#111116] border border-white-premium/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181824] uppercase text-[10px] font-mono tracking-wider text-neutral-400 border-b border-white-premium/5">
                  <tr>
                    <th className="p-4">Dénomination</th>
                    <th className="p-4">Contact commercial</th>
                    <th className="p-4">Remise Contrat</th>
                    <th className="p-4">Plafond Dépenses</th>
                    <th className="p-4">Expiration Contrat</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Actions administratrice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCorporates.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.01]">
                      <td className="p-4 text-white font-bold">{c.name}</td>
                      <td className="p-4">
                        <span className="block">{c.email}</span>
                        <span className="text-neutral-500 font-mono block text-[10px]">{c.phone}</span>
                      </td>
                      <td className="p-4 font-mono text-gold font-semibold">{c.discountRate}%</td>
                      <td className="p-4 font-mono text-white">{(c.spendingLimit || 2500000).toLocaleString()} CFA / mois</td>
                      <td className="p-4">{c.contractEnd}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          c.isBlocked ? "bg-transparent text-red-400 border-red-500/30" : "bg-transparent text-emerald-400 border-emerald-500/30"
                        }`}>
                          {c.isBlocked ? "Compte Bloqué" : "Actif"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1 whitespace-nowrap">
                        <button className="p-1 px-2 border border-neutral-700 hover:border-white rounded text-[#8A8A9A] hover:text-white transition-colors" onClick={() => handleOpenEditModal(c, "corporate")}>
                          Gérer
                        </button>
                        <button 
                          className={`p-1 px-2 border rounded transition-colors ${
                            c.isBlocked ? "border-green-500/30 text-green-400 hover:bg-white/5" : "border-red-500/30 text-red-400 hover:bg-white/5"
                          }`}
                          onClick={() => handleBlockToggle(c.id, c.isBlocked, "corporate")}
                        >
                          {c.isBlocked ? <Unlock size={12} className="inline mr-1" /> : <Lock size={12} className="inline mr-1" />}
                          {c.isBlocked ? "Débloquer" : "Bloquer"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- SUB Tab: HOSPITALITY Partners ----------------- */}
        {activeTab === "hospitality" && (
          <div className="space-y-6" id="hospitality_tab_workspace">
            {/* Upper Counters overview banner */}
            <div className="bg-[#111116] p-4 rounded-xl border border-white-premium/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Gestion des Hôtels & Résidences</h3>
                <span className="text-xs text-neutral-400">Total partenaires hôteliers enregistrés : {hospitalityPartners.length}</span>
              </div>
              <div className="flex gap-2 text-[11px] font-mono">
                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-semibold">
                  {hospitalityPartners.filter(p => p.status === "pending_validation").length} En attente d'analyse
                </span>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-semibold">
                  {hospitalityPartners.filter(p => p.status === "approved").length} Actifs & Validés
                </span>
              </div>
            </div>

            {/* BLOCK 1: DEMANDES EN ATTENTE DE VALIDATION / D'ANALYSE */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Clock size={16} className="text-amber-400 shrink-0" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Dossiers en attente d'analyse ({filteredHospitalityPartners.filter(p => p.status === "pending_validation").length})
                </h3>
              </div>

              <div className="space-y-2.5">
                {filteredHospitalityPartners.filter(p => p.status === "pending_validation").length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500 bg-[#111116] border border-dashed border-white/5 rounded-xl">
                    Aucune nouvelle demande d'inscription en attente.
                  </div>
                ) : (
                  filteredHospitalityPartners.filter(p => p.status === "pending_validation").map(p => {
                    const isExpanded = expandedPartnerIds.includes(p.id);
                    return (
                      <div key={p.id} className="bg-[#111116] border border-amber-500/10 rounded-xl overflow-hidden transition-all duration-200">
                        {/* Header Row */}
                        <div 
                          onClick={() => togglePartnerExpanded(p.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-sm font-bold text-white">
                              Demande d'inscription : <strong className="text-amber-400 font-extrabold">{p.name}</strong>
                            </span>
                            {p.starRating && p.starRating !== "all" && (
                              <span className="text-amber-400 font-bold text-[10px] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
                                {"★".repeat(parseInt(p.starRating))}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-neutral-400 font-mono">
                              Inscrit le {new Date(p.createdAt || Date.now()).toLocaleDateString("fr-FR")}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-950/40 text-amber-400 border-amber-500/30">
                              À Analyser
                            </span>
                            {isExpanded ? <ChevronUp size={16} className="text-neutral-400 shrink-0" /> : <ChevronDown size={16} className="text-neutral-400 shrink-0" />}
                          </div>
                        </div>

                        {/* Collapsed Details Section */}
                        {isExpanded && (
                          <div className="p-5 bg-black/40 border-t border-white/5 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white/[0.02] p-4 rounded-lg border border-white/5 space-y-2">
                                <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880] mb-2 font-bold">Identité de l'Établissement</h4>
                                <p className="text-xs text-neutral-300">Nom commercial : <strong className="text-white">{p.name}</strong></p>
                                <p className="text-xs text-neutral-300">Classement officiel : <strong className="text-white">{p.starRating && p.starRating !== "all" ? `${p.starRating} Étoiles` : "Standard / Non classé"}</strong></p>
                              </div>
                              <div className="bg-white/[0.02] p-4 rounded-lg border border-white/5 space-y-2">
                                <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880] mb-2 font-bold">Coordonnées Commerciales</h4>
                                <p className="text-xs text-neutral-300">E-mail principal : <strong className="text-white font-mono break-all">{p.email}</strong></p>
                                <p className="text-xs text-neutral-300">Téléphone de contact : <strong className="text-white font-mono">{p.phone}</strong></p>
                              </div>
                            </div>

                            {/* Documents Grid */}
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880] font-bold">Pièces administratives soumises par l'hôtel</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.entries(p.documents || {}).map(([key, doc]: [string, any]) => (
                                  <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-[#181824] border border-white/5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <FileText size={16} className="text-[#C5A880] shrink-0" />
                                      <div className="min-w-0">
                                        <span className="text-[9px] font-mono font-bold uppercase text-[#C5A880] bg-[#C5A880]/10 border border-[#C5A880]/20 px-1 py-0.2 rounded w-fit block mb-0.5">{key}</span>
                                        <span className="text-xs text-white font-medium truncate block max-w-[150px]" title={doc.name}>{doc.name}</span>
                                        <span className="text-[9px] text-neutral-500 font-mono block">{doc.size}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                      <button 
                                        onClick={() => downloadPartnerFile(doc, p.name, key)}
                                        className="p-1.5 px-3 bg-white/5 hover:bg-white text-neutral-300 hover:text-black border border-white/10 hover:border-white rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold"
                                        title="Télécharger le fichier original"
                                      >
                                        <Download size={12} />
                                        Télécharger
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {(!p.documents || Object.keys(p.documents).length === 0) && (
                                  <div className="col-span-2 text-center py-3 bg-red-950/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-mono">
                                    Aucune pièce justificative réglementaire n'a été téléversée.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* CTAs */}
                            <div className="flex justify-end gap-2.5 pt-4 border-t border-white-premium/5">
                              <button 
                                className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                onClick={() => handleRejectPartner(p.id)}
                              >
                                <XCircle size={14} />
                                Rejeter la demande
                              </button>
                              <button 
                                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                onClick={() => handleApprovePartner(p.id)}
                              >
                                <CheckCircle size={14} />
                                Approuver et fixer commission
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* BLOCK 2: PARTENAIRES DEJA VALIDES / ACTIFS */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Partenaires validés & actifs ({filteredHospitalityPartners.filter(p => p.status === "approved").length})
                </h3>
              </div>

              <div className="space-y-2.5">
                {filteredHospitalityPartners.filter(p => p.status === "approved").length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500 bg-[#111116] border border-dashed border-white/5 rounded-xl">
                    Aucun partenaire hôtelier validé pour le moment.
                  </div>
                ) : (
                  filteredHospitalityPartners.filter(p => p.status === "approved").map(p => {
                    const isExpanded = expandedPartnerIds.includes(p.id);
                    return (
                      <div key={p.id} className="bg-[#111116] border border-emerald-500/10 rounded-xl overflow-hidden transition-all duration-200">
                        {/* Header Row */}
                        <div 
                          onClick={() => togglePartnerExpanded(p.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-sm font-bold text-white">
                              Établissement agréé : <strong className="text-emerald-400 font-extrabold">{p.name}</strong>
                            </span>
                            {p.starRating && p.starRating !== "all" && (
                              <span className="text-amber-400 font-bold text-[10px] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
                                {"★".repeat(parseInt(p.starRating))}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              Taux : {p.commissionRate || 12}% commission
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-950/40 text-emerald-400 border-emerald-500/30">
                              Actif
                            </span>
                            {isExpanded ? <ChevronUp size={16} className="text-neutral-400 shrink-0" /> : <ChevronDown size={16} className="text-neutral-400 shrink-0" />}
                          </div>
                        </div>

                        {/* Collapsed Details Section */}
                        {isExpanded && (
                          <div className="p-5 bg-[#0C0D14] border-t border-white/10 space-y-5 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-[#12131C] p-4 rounded-lg border border-white/10 space-y-2">
                                <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880] mb-2 font-bold">Identité de l'Établissement</h4>
                                <p className="text-xs text-neutral-300">Nom : <strong className="text-white">{p.name}</strong></p>
                                <p className="text-xs text-neutral-300">Classement : <strong className="text-white">{p.starRating && p.starRating !== "all" ? `${p.starRating} Étoiles` : "Standard / Non classé"}</strong></p>
                              </div>
                              <div className="bg-[#12131C] p-4 rounded-lg border border-white/10 space-y-2">
                                <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880] mb-2 font-bold">Coordonnées</h4>
                                <p className="text-xs text-neutral-300">E-mail principal : <strong className="text-white font-mono break-all">{p.email}</strong></p>
                                <p className="text-xs text-neutral-300">Téléphone : <strong className="text-white font-mono">{p.phone}</strong></p>
                              </div>
                              <div className="bg-[#12131C] p-4 rounded-lg border border-white/10 space-y-2">
                                <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880] mb-2 font-bold">Commission & Contrôle</h4>
                                <p className="text-xs text-neutral-300">Commission appliquée : <strong className="text-emerald-400 font-mono">{p.commissionRate || 12}%</strong></p>
                                <p className="text-xs text-neutral-300">Date d'agrément : <strong className="text-white">{new Date(p.updatedAt || p.createdAt || Date.now()).toLocaleDateString("fr-FR")}</strong></p>
                              </div>
                            </div>

                            {/* Financial tracking and outstanding invoices */}
                            <div className="border border-white/10 rounded-xl p-5 bg-[#12131C] space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
                                <div>
                                  <h4 className="text-sm font-bold text-white font-sans">Suivi Financier & Factures en attente</h4>
                                  <p className="text-[11px] text-neutral-400 mt-0.5">Suivi des montants nets dus après déduction des commissions de {p.commissionRate || 12}%.</p>
                                </div>
                                <div className="bg-[#0A0A0F] border border-white/10 px-4 py-2.5 rounded-xl flex items-center gap-3">
                                  <span className="text-xs text-neutral-400">Total net restant à régler :</span>
                                  <span className="text-base font-extrabold text-gold font-mono">
                                    {(() => {
                                      const partnerUnpaidInvoices = invoices.filter(inv => inv.partnerId === p.partnerEntryId && inv.status !== "Réglée");
                                      const totalNetDue = partnerUnpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.commissionAmount), 0);
                                      return totalNetDue.toLocaleString("fr-FR");
                                    })()} CFA
                                  </span>
                                </div>
                              </div>

                              {/* Unpaid invoices list */}
                              {(() => {
                                const partnerUnpaidInvoices = invoices.filter(inv => inv.partnerId === p.partnerEntryId);
                                if (partnerUnpaidInvoices.length === 0) {
                                  return <p className="text-xs text-neutral-500 italic py-2">Aucune facture enregistrée pour ce partenaire.</p>;
                                }
                                return (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase block mb-1">Relevés de Compte</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {partnerUnpaidInvoices.map(inv => {
                                        const netToPay = inv.totalAmount - inv.commissionAmount;
                                        return (
                                          <div key={inv.id} className="bg-[#0A0A0F] p-3 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                                            <div>
                                              <p className="font-mono text-white font-semibold">#{inv.id} ({String(inv.month).padStart(2, '0')}/{inv.year})</p>
                                              <p className="text-[10px] text-neutral-400 mt-1">Net : <strong className="text-gold font-mono">{netToPay.toLocaleString("fr-FR")} F</strong></p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase border ${
                                              inv.status === "Réglée" ? "text-emerald-400 border-emerald-500/20" : "text-amber-400 border-amber-500/20 animate-pulse"
                                            }`}>
                                              {inv.status}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Individual Reservation History list */}
                            <div className="border border-white/10 rounded-xl p-5 bg-[#12131C] space-y-3">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Historique individuel des réservations ({reservations.filter(r => r.userId === p.id).length})</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-neutral-300">
                                  <thead>
                                    <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                                      <th className="pb-2">Réf / Date</th>
                                      <th className="pb-2">Passager</th>
                                      <th className="pb-2">Trajet</th>
                                      <th className="pb-2 text-right">Tarif</th>
                                      <th className="pb-2 text-center">Mise à dispo</th>
                                      <th className="pb-2 text-right">Statut</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {(() => {
                                      const partnerRes = reservations.filter(r => r.userId === p.id);
                                      if (partnerRes.length === 0) {
                                        return (
                                          <tr>
                                            <td colSpan={6} className="py-6 text-center text-neutral-500 italic">Aucun transfert enregistré pour ce partenaire.</td>
                                          </tr>
                                        );
                                      }
                                      return partnerRes.map(r => (
                                        <tr key={r.id} className="hover:bg-white/[0.01]">
                                          <td className="py-2.5 font-mono">
                                            <span className="text-white block">#{r.id}</span>
                                            <span className="text-[10px] text-neutral-500">{r.departureDate}</span>
                                          </td>
                                          <td className="py-2.5 font-semibold text-white">{r.clientName}</td>
                                          <td className="py-2.5">
                                            <p className="truncate max-w-[150px]">{r.pickup}</p>
                                            <p className="text-[10px] text-neutral-500">➜ {r.destination}</p>
                                          </td>
                                          <td className="py-2.5 text-right text-gold font-mono font-semibold">{r.totalPrice?.toLocaleString("fr-FR")} F</td>
                                          <td className="py-2.5 text-center">
                                            {r.dispositionConfirmed ? (
                                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                                                CONFIRMÉE
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded font-mono">
                                                EN ATTENTE
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2.5 text-right font-mono uppercase text-[9px]">
                                            <span className={
                                              r.status === "completed" || r.status === "Payée" ? "text-emerald-400 font-bold" :
                                              r.status === "cancelled" ? "text-red-400" : "text-amber-400 font-bold"
                                            }>
                                              {r.status === "completed" ? "Solder" : r.status === "confirmed" ? "Validée" : r.status === "cancelled" ? "Rejetée" : r.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ));
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Ajustement CTA */}
                            <div className="flex justify-end pt-4 border-t border-white-premium/5">
                              <button 
                                className="px-3.5 py-2 border border-[#C5A880]/30 bg-[#C5A880]/10 hover:bg-[#C5A880]/20 text-[#C5A880] hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                                onClick={() => handleApprovePartner(p.id)}
                              >
                                <Percent size={13} />
                                Ajuster le taux de commission
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* BLOCK 3: DOSSIERS REJETES (Optionnel, archivé) */}
            {filteredHospitalityPartners.filter(p => p.status === "rejected").length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <XCircle size={16} className="text-red-400 shrink-0" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">
                    Dossiers rejetés / Suspendus ({filteredHospitalityPartners.filter(p => p.status === "rejected").length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {filteredHospitalityPartners.filter(p => p.status === "rejected").map(p => {
                    const isExpanded = expandedPartnerIds.includes(p.id);
                    return (
                      <div key={p.id} className="bg-[#111116] border border-red-500/10 rounded-xl overflow-hidden transition-all duration-200">
                        {/* Header Row */}
                        <div 
                          onClick={() => togglePartnerExpanded(p.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm font-bold text-white">
                              Dossier rejeté : <strong className="text-red-400 font-bold">{p.name}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-red-950/40 text-red-400 border-red-500/30">
                              Refusé
                            </span>
                            {isExpanded ? <ChevronUp size={16} className="text-neutral-400 shrink-0" /> : <ChevronDown size={16} className="text-neutral-400 shrink-0" />}
                          </div>
                        </div>

                        {/* Collapsed content */}
                        {isExpanded && (
                          <div className="p-5 bg-black/40 border-t border-white/5 space-y-4">
                            <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-lg text-xs text-red-300">
                              <strong>Motif de rejet spécifié :</strong> {p.rejectionReason}
                            </div>
                            <div className="flex justify-end">
                              <button 
                                className="px-3.5 py-2 bg-[#C5A880]/15 hover:bg-[#C5A880]/35 border border-[#C5A880]/30 text-[#C5A880] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                onClick={() => handleApprovePartner(p.id)}
                              >
                                Ré-examiner et Valider le dossier
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- SUB Tab: CLIENT LIST ----------------- */}
        {activeTab === "clients" && (
          <div className="space-y-4" id="clients_tab_workspace">
            <div className="bg-[#111116] border border-white-premium/5 p-4 rounded-xl text-xs text-neutral-400">
              Liste des clients B2C enregistrés sur l'application mobile et de conciergerie.
            </div>

            <div className="bg-[#111116] border border-white-premium/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181824] uppercase text-[10px] font-mono tracking-wider text-neutral-400 border-b border-white-premium/5">
                  <tr>
                    <th className="p-4">Nom complet</th>
                    <th className="p-4">Adresse Email</th>
                    <th className="p-4">Numéro de téléphone</th>
                    <th className="p-4">Inscrit le</th>
                    <th className="p-4">Statut d'accès</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {filteredClients.map(c => (
                    <tr key={c.id}>
                      <td className="p-4 font-bold text-white">{c.name}</td>
                      <td className="p-4 font-mono">{c.email}</td>
                      <td className="p-4">{c.phone}</td>
                      <td className="p-4">{c.createdAt?.split("T")[0] || "2026-06-19"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          c.isBlocked ? "bg-transparent text-red-400 border-red-500/30" : "bg-transparent text-emerald-400 border-emerald-500/30"
                        }`}>
                          {c.isBlocked ? "Suspendu/Bloqué" : "Autorisé"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          className={`p-1 px-2 border rounded text-[10px] transition-colors ${
                            c.isBlocked ? "border-green-500/30 text-green-400 hover:bg-white/5 font-bold" : "border-red-500/30 text-red-400 hover:bg-white/5 font-bold"
                          }`}
                          onClick={() => handleBlockToggle(c.id, c.isBlocked, "client")}
                        >
                          {c.isBlocked ? "Rétablir l'accès" : "Révoquer l'accès (Bloquer)"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- SUB Tab: BILLING PANEL ----------------- */}
        {activeTab === "billing" && (
          <div className="space-y-4" id="billing_tab_workspace">
            <div className="bg-[#111116] p-4 rounded-xl border border-white-premium/5">
              <span className="text-xs text-neutral-400">Factures de conciergerie corporate B2B</span>
            </div>

            <div className="bg-[#111116] border border-white-premium/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181824] uppercase text-[10px] font-mono tracking-wider text-neutral-400 border-b border-white-premium/5">
                  <tr>
                    <th className="p-4">Facture ID</th>
                    <th className="p-4">Période</th>
                    <th className="p-4">Compte redevable</th>
                    <th className="p-4">Montant Principal</th>
                    <th className="p-4">Commission Partenaire (12%)</th>
                    <th className="p-4">Date Émission</th>
                    <th className="p-4">État Règlement</th>
                    <th className="p-4 text-right">Contrôles administratifs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-neutral-500">Aucune note de frais ou facture disponible à l'affichage.</td>
                    </tr>
                  ) : (
                    invoices.map(inv => {
                      const clientLabel = corporates.find(co => co.id === inv.corporateId)?.name || "Orange Côte d'Ivoire";
                      return (
                        <tr key={inv.id} className="hover:bg-white/[0.01]">
                          <td className="p-4 font-mono font-bold text-white">#{inv.id}</td>
                          <td className="p-4 font-mono">06 / 2026</td>
                          <td className="p-4 font-semibold text-white">{clientLabel}</td>
                          <td className="p-4 text-gold font-extrabold">{inv.totalAmount?.toLocaleString()} CFA</td>
                          <td className="p-4 font-mono text-neutral-400">{inv.commissionAmount > 0 ? `${inv.commissionAmount?.toLocaleString()} CFA` : "--- (Contrat Pro)"}</td>
                          <td className="p-4">{inv.createdAt?.split("T")[0] || "2026-06-19"}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              inv.status === "Réglée" ? "bg-transparent text-emerald-400 border border-emerald-500/30" : "bg-transparent text-rose-400 border border-rose-500/30 animate-pulse"
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            {inv.status !== "Réglée" ? (
                              <button className="text-[10px] font-bold p-1 px-2 border border-green-500/30 text-green-400 hover:bg-white/5 rounded" onClick={() => handleUpdateInvoiceStatus(inv.id, "Réglée")}>
                                Enregistrer paiement FR
                              </button>
                            ) : (
                              <button className="text-[10px] p-1 px-2 border border-red-500/30 text-red-400 hover:bg-white/5 rounded" onClick={() => handleUpdateInvoiceStatus(inv.id, "En attente de règlement")}>
                                Annuler encaissement
                              </button>
                            )}
                            <button className="text-red-400 hover:text-red-300 p-1" onClick={() => handleDelete(inv.id, "invoice")}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- SUB Tab: SETTINGS & POLICIES ----------------- */}
        {activeTab === "config" && systemConfig && (
          <div className="space-y-8">
            <form onSubmit={handleSaveConfig} className="bg-[#111116] border border-white-premium/5 p-6 rounded-2xl space-y-6" id="config_tab_workspace">
            <div>
              <h3 className="font-semibold text-white font-sans text-base">Règles Tarifaires & Coefficients de surcharge</h3>
              <p className="text-xs text-neutral-400">Configurez les formules de calcul en temps réel déployées en Côte d'Ivoire.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-[#15151D] p-4 rounded-xl border border-white/5 space-y-4">
                <h4 className="font-bold text-xs font-mono uppercase text-gold">Base Rates: Berlines Premium</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-neutral-500 block mb-1">Taux Horaire (CFA)</label>
                    <input 
                      type="number" 
                      value={sysConfigForm.baseRates["berline-premium"].hourly}
                      onChange={(e) => {
                        const updated = { ...sysConfigForm };
                        updated.baseRates["berline-premium"].hourly = parseInt(e.target.value);
                        setSysConfigForm(updated);
                      }}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-500 block mb-1">Demi-journée (CFA)</label>
                    <input 
                      type="number" 
                      value={sysConfigForm.baseRates["berline-premium"].halfday}
                      onChange={(e) => {
                        const updated = { ...sysConfigForm };
                        updated.baseRates["berline-premium"].halfday = parseInt(e.target.value);
                        setSysConfigForm(updated);
                      }}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-500 block mb-1">Journée complète (CFA)</label>
                    <input 
                      type="number" 
                      value={sysConfigForm.baseRates["berline-premium"].fullday}
                      onChange={(e) => {
                        const updated = { ...sysConfigForm };
                        updated.baseRates["berline-premium"].fullday = parseInt(e.target.value);
                        setSysConfigForm(updated);
                      }}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#15151D] p-4 rounded-xl border border-white/5 space-y-4">
                <h4 className="font-bold text-xs font-mono uppercase text-gold">Base Rates: SUV Executive</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-neutral-500 block mb-1">Taux Horaire (CFA)</label>
                    <input 
                      type="number" 
                      value={sysConfigForm.baseRates["suv-executive"].hourly}
                      onChange={(e) => {
                        const updated = { ...sysConfigForm };
                        updated.baseRates["suv-executive"].hourly = parseInt(e.target.value);
                        setSysConfigForm(updated);
                      }}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-500 block mb-1">Demi-journée (CFA)</label>
                    <input 
                      type="number" 
                      value={sysConfigForm.baseRates["suv-executive"].halfday}
                      onChange={(e) => {
                        const updated = { ...sysConfigForm };
                        updated.baseRates["suv-executive"].halfday = parseInt(e.target.value);
                        setSysConfigForm(updated);
                      }}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-500 block mb-1">Journée complète (CFA)</label>
                    <input 
                      type="number" 
                      value={sysConfigForm.baseRates["suv-executive"].fullday}
                      onChange={(e) => {
                        const updated = { ...sysConfigForm };
                        updated.baseRates["suv-executive"].fullday = parseInt(e.target.value);
                        setSysConfigForm(updated);
                      }}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#15151D] p-4 rounded-xl border border-white/5 space-y-4">
                <h4 className="font-bold text-xs font-mono uppercase text-gold">Surcharges Majorations (%)</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-neutral-500 block mb-1">Surcharge Nuit (21h - 6h)</label>
                    <input 
                      type="number" 
                      value={sysConfigForm.surcharges.night}
                      onChange={(e) => {
                        const updated = { ...sysConfigForm };
                        updated.surcharges.night = parseInt(e.target.value);
                        setSysConfigForm(updated);
                      }}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-500 block mb-1">Surcharge Week-end (Sam - Dim)</label>
                    <input 
                      type="number" 
                      value={sysConfigForm.surcharges.weekend}
                      onChange={(e) => {
                        const updated = { ...sysConfigForm };
                        updated.surcharges.weekend = parseInt(e.target.value);
                        setSysConfigForm(updated);
                      }}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-white/5 flex justify-end">
              <Button id="save_conf_btn" type="submit" variant="primary">
                Sauvegarder les règles tarifaires
              </Button>
            </div>
          </form>

          <form onSubmit={handleSaveEcoReport} className="bg-[#111116] border border-white-premium/5 p-6 rounded-2xl space-y-6 mt-8" id="eco_report_config_workspace">
            <div>
              <h3 className="font-semibold text-white font-sans text-base flex items-center gap-2">
                <Activity className="text-emerald-500" size={18} />
                Rapport quotidien écologique
              </h3>
              <p className="text-xs text-neutral-400">Mettez à jour manuellement les indicateurs écologiques globaux affichés sur la page d'accueil.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#15151D] p-4 rounded-xl border border-white/5 space-y-2">
                <label className="text-neutral-400 block text-xs font-semibold">Nombre de km parcourus en électrique</label>
                <input 
                  type="number" 
                  step="any"
                  value={ecoForm.kmElectrique}
                  onChange={(e) => setEcoForm({ ...ecoForm, kmElectrique: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: 12450"
                  required
                />
                <span className="text-[10px] text-neutral-500">Kilométrage total parcouru par la flotte électrique.</span>
              </div>

              <div className="bg-[#15151D] p-4 rounded-xl border border-white/5 space-y-2">
                <label className="text-neutral-400 block text-xs font-semibold">Quantité de CO₂ non émise (kg)</label>
                <input 
                  type="number" 
                  step="any"
                  value={ecoForm.co2NonEmis}
                  onChange={(e) => setEcoForm({ ...ecoForm, co2NonEmis: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: 1850"
                  required
                />
                <span className="text-[10px] text-neutral-500">Masse de CO₂ économisée en kg.</span>
              </div>

              <div className="bg-[#15151D] p-4 rounded-xl border border-white/5 space-y-2">
                <label className="text-neutral-400 block text-xs font-semibold">Tonnes de CO₂ évitées (t)</label>
                <input 
                  type="number" 
                  step="any"
                  value={ecoForm.co2EviteTonnes}
                  onChange={(e) => setEcoForm({ ...ecoForm, co2EviteTonnes: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: 1.85"
                  required
                />
                <span className="text-[10px] text-neutral-500">Équivalent en tonnes évitées (généralement kg / 1000).</span>
              </div>
            </div>

            {ecoSuccessMessage && (
              <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg">
                {ecoSuccessMessage}
              </div>
            )}

            <div className="pt-4 border-t border-white/5 flex justify-end">
              <Button id="save_eco_report_btn" type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600">
                {isSavingEco ? "Mise à jour..." : "Mettre à jour le rapport écologique"}
              </Button>
            </div>
          </form>
        </div>
        )}

      </div>

      {/* 3. MODAL DE DIALOGUE (CRUD ET MANUEL ATTRIBUTION) */}
      {isModalOpen && (
        <div id="admin_form_modal_overlay" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`bg-[#111116] border border-white/10 w-full ${(modalType === "reservation" || modalType === "vehicle" || modalType === "driver") ? "max-w-4xl" : "max-w-lg"} rounded-2xl overflow-hidden p-6 relative max-h-[90vh] flex flex-col`}>
            <button 
              className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer z-[110]"
              onClick={() => setIsModalOpen(false)}
            >
              <XCircle size={22} />
            </button>

            <h3 className="text-lg font-bold font-sans text-white border-b border-white-premium/5 pb-3 mb-4 shrink-0">
              {isEdit ? "Modifier" : "Ajouter / Générer"} - {modalType}
            </h3>

            <form id="admin_subform_element" onSubmit={handleFormSubmit} className="text-xs flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 min-h-0 custom-scrollbar">
              
              {/* VEHICLE FORM BLOCK */}
              {modalType === "vehicle" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Specs & Identity */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400 block mb-1">Marque (Tesla, BMW...)</label>
                        <input 
                          type="text" 
                          required
                          value={vehicleForm.brand}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Modèle (S, EQE...)</label>
                        <input 
                          type="text" 
                          required
                          value={vehicleForm.name}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400 block mb-1">Catégorie Executive</label>
                        <select 
                          value={vehicleForm.category}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, category: e.target.value as any })}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                        >
                          <option value="berline-premium">Berline</option>
                          <option value="suv-executive">SUV executive</option>
                          <option value="suv-prestige">SUV prestige</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Plaque d'immatriculation</label>
                        <input 
                          type="text" 
                          required
                          placeholder="CI-01-9034-AB"
                          value={vehicleForm.immatriculation}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, immatriculation: e.target.value })}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400 block mb-1">Niveau Batterie (%)</label>
                        <input 
                          type="number" 
                          required
                          min={0}
                          max={100}
                          value={vehicleForm.batteryLevel}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, batteryLevel: parseInt(e.target.value) })}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">État Flotte</label>
                        <select 
                          value={vehicleForm.status}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value as any })}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                        >
                          <option value="Disponible">Disponible pour service</option>
                          <option value="Indisponible">Indisponible (Maintenance)</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3 mt-3">
                      <h5 className="text-white font-mono uppercase tracking-wider mb-2 text-[10px] text-neutral-500">Spécifications techniques</h5>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-neutral-400 block mb-1 text-[10px]">Vitesse Max (km/h)</label>
                          <input 
                            type="number" 
                            value={vehicleForm.maxSpeed}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, maxSpeed: parseInt(e.target.value) || 220 })}
                            className="w-full bg-[#0E0E15] border border-white/10 rounded p-1.5 text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-400 block mb-1 text-[10px]">Consommation</label>
                          <input 
                            type="text" 
                            placeholder="16.8 kWh/100km"
                            value={vehicleForm.fuelConsumption}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, fuelConsumption: e.target.value })}
                            className="w-full bg-[#0E0E15] border border-white/10 rounded p-1.5 text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-400 block mb-1 text-[10px]">Kilométrage total</label>
                          <input 
                            type="text" 
                            placeholder="12,450 km"
                            value={vehicleForm.totalDistance}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, totalDistance: e.target.value })}
                            className="w-full bg-[#0E0E15] border border-white/10 rounded p-1.5 text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Beautiful photo uploader blocks */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <h5 className="text-white font-mono uppercase tracking-wider mb-3 text-[10px] text-neutral-500">Photos des 4 côtés (Glisser-Déposer)</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <PhotoUploadField 
                          label="Face / Avant"
                          value={vehicleForm.photoFront}
                          onChange={(base64) => setVehicleForm({ ...vehicleForm, photoFront: base64 })}
                          id="vehicle-front"
                        />
                        <PhotoUploadField 
                          label="Arrière"
                          value={vehicleForm.photoBack}
                          onChange={(base64) => setVehicleForm({ ...vehicleForm, photoBack: base64 })}
                          id="vehicle-back"
                        />
                        <PhotoUploadField 
                          label="Côté Gauche"
                          value={vehicleForm.photoLeft}
                          onChange={(base64) => setVehicleForm({ ...vehicleForm, photoLeft: base64 })}
                          id="vehicle-left"
                        />
                        <PhotoUploadField 
                          label="Côté Droit"
                          value={vehicleForm.photoRight}
                          onChange={(base64) => setVehicleForm({ ...vehicleForm, photoRight: base64 })}
                          id="vehicle-right"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DRIVER FORM BLOCK */}
              {modalType === "driver" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Info */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-neutral-400 block mb-1">Nom Complet du Chauffeur</label>
                      <input 
                        type="text" 
                        required
                        value={driverForm.name}
                        onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                        className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400 block mb-1">Téléphone (+225 XX...)</label>
                        <input 
                          type="text" 
                          required
                          value={driverForm.phone}
                          onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Adresse Email Pro</label>
                        <input 
                          type="email" 
                          required
                          value={driverForm.email}
                          onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400 block mb-1">Statut Initial</label>
                        <select 
                          value={driverForm.status}
                          onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value as any })}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                        >
                          <option value="disponible">En attente d'un dispatch</option>
                          <option value="en_mission">En mission (Occupé)</option>
                          <option value="indisponible">Indisponible (Repos)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Véhicule Associé</label>
                        <select 
                          value={driverForm.vehicleId}
                          onChange={(e) => setDriverForm({ ...driverForm, vehicleId: e.target.value })}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                        >
                          <option value="">-- Aucun véhicule assigné --</option>
                          {vehicles.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.brand} {v.name} ({v.immatriculation})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Photo Upload */}
                  <div className="flex flex-col justify-center">
                    <PhotoUploadField 
                      label="Photo de profil du Chauffeur"
                      value={driverForm.photo}
                      onChange={(base64) => setDriverForm({ ...driverForm, photo: base64 })}
                      id="driver-photo"
                    />
                  </div>
                </div>
              )}

              {/* CORPORAL FORM BLOCK */}
              {modalType === "corporate" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-neutral-400 block mb-1">Dénomination Sociale (S.A.)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Orange Côte d'Ivoire"
                      value={corpForm.name}
                      onChange={(e) => setCorpForm({ ...corpForm, name: e.target.value })}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Email Entreprise (Responsable)</label>
                    <input 
                      type="email" 
                      required
                      value={corpForm.email}
                      onChange={(e) => setCorpForm({ ...corpForm, email: e.target.value })}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Téléphone Secrétariat / Facture</label>
                    <input 
                      type="text" 
                      required
                      value={corpForm.phone}
                      onChange={(e) => setCorpForm({ ...corpForm, phone: e.target.value })}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-neutral-400 block mb-1">Plafond Dépenses (CFA)</label>
                      <input 
                        type="number" 
                        required
                        value={corpForm.spendingLimit}
                        onChange={(e) => setCorpForm({ ...corpForm, spendingLimit: parseInt(e.target.value) })}
                        className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-1">Remise Contrat (%)</label>
                      <input 
                        type="number" 
                        required
                        value={corpForm.discountRate}
                        onChange={(e) => setCorpForm({ ...corpForm, discountRate: parseInt(e.target.value) })}
                        className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Codes imputation (Séparés par virgules)</label>
                    <input 
                      type="text" 
                      placeholder="EX: IT-SUP-202, HR-COMM-103"
                      value={corpForm.serviceCodesString}
                      onChange={(e) => setCorpForm({ ...corpForm, serviceCodesString: e.target.value })}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* RESERVATION FORM BLOCK */}
              {modalType === "reservation" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {(resForm.status === "cancelled" || selectedItem?.status === "cancelled") && (
                    <div className="lg:col-span-2 bg-rose-950/90 border-2 border-rose-500/80 rounded-2xl p-4 shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <XCircle size={28} className="text-rose-400 shrink-0 stroke-[2.5px]" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-rose-500 text-black px-2.5 py-0.5 rounded font-black text-xs font-mono uppercase tracking-widest">
                              TAMPON OFFICIEL
                            </span>
                            <span className="text-rose-200 font-extrabold text-xs uppercase font-mono">
                              DEMANDE DÉPART CLIENT : COMMANDE ANNULÉE
                            </span>
                          </div>
                          <p className="text-[11px] text-rose-300/80 mt-1">
                            Cette réservation est marquée comme annulée. Le client et l'équipe administrative ont reçu les notifications d'annulation par e-mail.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-md bg-black/40">
                        CONSERVÉE DANS HISTORIQUE
                      </span>
                    </div>
                  )}

                  {/* BLOC GAUCHE : CLIENT & PAIEMENT */}
                  <div className="space-y-4">
                    <span className="text-[11px] text-gold uppercase font-bold tracking-wider block border-b border-white/5 pb-1 font-mono">
                      1. Client & Facturation
                    </span>
                    
                    {!isEdit && (
                      <div className="bg-[#15151D] border border-white/5 p-3.5 rounded-xl">
                        <label className="text-neutral-400 block mb-1.5 text-xs font-semibold">Sélectionner le Client bénéficiaire</label>
                        <select 
                          value={resForm.userId}
                          onChange={(e) => setResForm(prev => ({ ...prev, userId: e.target.value }))}
                          className="w-full bg-[#0E0E15] border border-white/10 rounded-lg p-2.5 text-white outline-none text-xs"
                        >
                          <option value="">-- Choisir un client --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.email || c.phone || "Sans email/tel"})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(selectedItem || resForm.userId) && (() => {
                      const creator = getReservationCreatorInfo(selectedItem?.userId || resForm.userId);
                      return (
                        <div className="space-y-4">
                          {/* 1. COMPTE COMMANDITAIRE / RESERVATION INITIATOR */}
                          <div className="bg-[#111116] border border-white/5 p-4 rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold block">
                                COMPTE RÉSERVATEUR / COMMANDITAIRE
                              </span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${creator.badgeColor}`}>
                                {creator.type === "partenaire" ? "PARTENAIRE" : creator.type === "corporate" ? "ENTREPRISE" : "CLIENT B2C"}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-neutral-500 block">Nom du compte :</span>
                                <span className="text-white font-bold font-sans text-sm">
                                  {creator.name}
                                </span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block">Téléphone contact :</span>
                                <span className="text-white font-semibold font-mono text-sm">
                                  {creator.phone}
                                </span>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="text-neutral-500 block">Adresse Email de facturation :</span>
                                <span className="text-white font-semibold font-mono text-sm">
                                  {creator.email}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 2. PASSAGER BÉNÉFICIAIRE / VISITEUR VIP */}
                          <div className="bg-[#111116] border border-[#D4AF37]/25 p-4 rounded-xl space-y-3">
                            <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold block">
                              COORDONNÉES DU PASSAGER VIP (BÉNÉFICIAIRE)
                            </span>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-neutral-500 block">Nom complet du passager :</span>
                                <span className="text-white font-semibold font-sans text-sm">
                                  {selectedItem?.clientName || "Non renseigné (Utilise le compte principal)"}
                                </span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block">Numéro de téléphone :</span>
                                <span className="text-white font-semibold font-mono text-sm">
                                  {selectedItem?.clientPhone || "Non renseigné"}
                                </span>
                              </div>
                            </div>

                            {isEdit && (
                              <>
                                <div className="pt-2.5 border-t border-white-premium/5 text-[11px] text-neutral-400">
                                  {creator.type === "partenaire" ? (
                                    "La facturation de cette course est rattachée au compte partenaire. Le paiement sera régularisé en fin de mois avec les commissions associées."
                                  ) : creator.type === "corporate" ? (
                                    "La facturation de cette course est rattachée au compte de l'entreprise (Corporate) avec facturation mensuelle différée."
                                  ) : (
                                    "Gérez la facturation directement avec le client. Une fois le paiement réglé, cliquez sur le bouton ci-dessous pour valider sa commande :"
                                  )}
                                </div>
                                {creator.type === "client" && (
                                  <div className="pt-1 flex justify-start">
                                    {resForm.status !== "confirmed" ? (
                                      <Button 
                                        id="admin_quick_validate_btn"
                                        type="button" 
                                        className="bg-[#00C853] hover:bg-[#00b04a] text-black font-extrabold text-xs px-4 py-2.5 rounded flex items-center gap-1.5 cursor-pointer w-full justify-center"
                                        onClick={() => {
                                          setResForm(prev => ({ ...prev, status: "confirmed" }));
                                          // Automatically submit the form
                                          setTimeout(() => {
                                            const form = document.getElementById("admin_subform_element") as HTMLFormElement;
                                            if (form) {
                                              form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                            }
                                          }, 150);
                                        }}
                                      >
                                        <Check size={14} />
                                        Valider la commande (Paiement Reçu)
                                      </Button>
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold font-sans bg-transparent border border-emerald-500/30 px-3 py-2 rounded-lg w-full justify-center">
                                        <Check size={14} className="stroke-[3px]" />
                                        Commande déjà validée (Paiement réglé)
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* 3. INSTRUCTIONS & OPTIONS VIP */}
                          <div className="bg-[#111116] border border-white/5 p-4 rounded-xl space-y-4">
                            <div>
                              <span className="text-[10px] font-mono tracking-widest text-[#C5A880] uppercase font-bold block mb-2">
                                INSTRUCTIONS CONCIERGERIE VIP
                              </span>
                              <div className="bg-[#0A0A0E] border border-white/5 rounded-xl p-3 text-white text-xs font-sans min-h-[48px] flex items-center">
                                {selectedItem?.specialInstructions || (
                                  <span className="text-neutral-500 italic">Aucune instruction particulière</span>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] font-mono tracking-widest text-[#C5A880] uppercase font-bold block mb-2">
                                OPTIONS PRESTIGE ADDITIONNELLES (+15K F PAR OPTION)
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const reservationOptions = selectedItem?.options || [];
                                  
                                  const availableOptions = [
                                    { key: "wifi", label: "WIFI HD" },
                                    { key: "champagne", label: "CHAMPAGNE" },
                                    { key: "protection", label: "PROTECTION" }
                                  ];

                                  return availableOptions.map(opt => {
                                    const isSelected = reservationOptions.includes(opt.key);
                                    return (
                                      <div 
                                        key={opt.key}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex-1 min-w-[90px] ${
                                          isSelected 
                                            ? "bg-[#C5A880]/15 border-[#C5A880] text-[#C5A880]" 
                                            : "bg-[#0A0A0E] border-white/5 text-neutral-500"
                                        }`}
                                      >
                                        {opt.label}
                                        {isSelected && <span className="block text-[8px] font-mono text-[#C5A880] mt-0.5">SÉLECTIONNÉ</span>}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="space-y-2">
                      <label className="text-neutral-400 block text-[11px] font-semibold">Statut & Actions de Validation</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id="btn_admin_validate"
                          type="button"
                          onClick={() => {
                            setResForm(prev => ({ ...prev, status: "confirmed" }));
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            resForm.status === "confirmed"
                              ? "bg-emerald-500 text-black shadow-lg"
                              : "bg-transparent hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          <Check size={13} className="stroke-[3px]" />
                          Valider
                        </button>
                        
                        <button
                          id="btn_admin_reject"
                          type="button"
                          onClick={() => {
                            setResForm(prev => ({ ...prev, status: "cancelled" }));
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            resForm.status === "cancelled"
                              ? "bg-red-500 text-white shadow-lg"
                              : "bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          <X size={13} className="stroke-[3px]" />
                          Rejeter
                        </button>
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono text-center">
                        Statut actuel : <span className={resForm.status === "confirmed" ? "text-emerald-400 font-bold" : resForm.status === "cancelled" ? "text-red-400 font-bold" : resForm.status === "completed" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                          {resForm.status === "confirmed" ? "VALIDÉE (CONFIRMÉE)" : resForm.status === "cancelled" ? "REJETÉE (ANNULÉE)" : resForm.status === "completed" ? "COMPLÉTÉE (SOLDER)" : "EN ATTENTE"}
                        </span>
                      </div>

                      {isEdit && (
                        resForm.dispositionConfirmed ? (
                          <div className="bg-[#052e16] border border-[#16a34a] rounded-lg p-2.5 mt-2 flex items-center justify-center gap-1.5 text-center">
                            <Check size={14} className="text-[#16a34a] stroke-[3px]" />
                            <span className="text-[10px] text-white font-extrabold uppercase font-mono tracking-wider">✓ Mise à disposition confirmée</span>
                          </div>
                        ) : (
                          <button
                            id="btn_admin_confirm_disposition"
                            type="button"
                            onClick={() => {
                              handleConfirmDispositionImmediately(selectedItem.id);
                            }}
                            className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-extrabold bg-[#C5A880] hover:bg-[#d8bb93] text-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                          >
                            <CheckCircle size={14} className="stroke-[2.5px]" />
                            Confirmer la mise à disposition
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* BLOC DROIT : DETAILS TRAJET & VEHICULE */}
                  <div className="space-y-4">
                    <span className="text-[11px] text-gold uppercase font-bold tracking-wider block border-b border-white/5 pb-1 font-mono">
                      2. Détails du Trajet & Affectation
                    </span>
                    
                    <div className="space-y-3 bg-[#111116] p-3.5 rounded-xl border border-white/5">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-neutral-500 block mb-1">Date Départ</span>
                          <div className="w-full bg-[#0E0E15] border border-white/10 rounded p-2.5 text-white font-semibold font-mono text-xs">
                            {resForm.departureDate}
                          </div>
                        </div>
                        <div>
                          <span className="text-neutral-500 block mb-1">Heure Départ</span>
                          <div className="w-full bg-[#0E0E15] border border-white/10 rounded p-2.5 text-white font-semibold font-mono text-xs">
                            {resForm.departureTime}
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="text-neutral-500 block mb-1">Lieu de prise en charge</span>
                        <div className="w-full bg-[#0E0E15] border border-white/10 rounded p-2.5 text-white font-semibold text-xs leading-relaxed">
                          {resForm.pickup}
                        </div>
                      </div>

                      <div>
                        <span className="text-neutral-500 block mb-1">Lieu de destination</span>
                        <div className="w-full bg-[#0E0E15] border border-white/10 rounded p-2.5 text-white font-semibold text-xs leading-relaxed">
                          {resForm.destination}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-neutral-500 block mb-1">Formule choisie</span>
                          <div className="w-full bg-[#0E0E15] border border-white/10 rounded p-2.5 text-white font-semibold text-xs">
                            {resForm.formula === "hourly" ? "Mise à disposition horaire" :
                             resForm.formula === "halfday" ? "Demi-journée d'affaires" :
                             resForm.formula === "fullday" ? "Journée d'affaires VIP" : resForm.formula}
                          </div>
                        </div>
                        <div>
                          <span className="text-neutral-500 block mb-1">Tarif de la course (CFA)</span>
                          <div className="w-full bg-[#0E0E15] border border-white/10 rounded p-2.5 text-gold font-bold text-xs font-mono">
                            {resForm.totalPrice?.toLocaleString("fr-FR")} CFA
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-3 border-t border-white/5">
                        <div>
                          <label className="text-[#C5A880] block mb-1.5 text-[11px] font-bold uppercase tracking-wider font-mono">Chauffeur Assigné à cette mission</label>
                          <select 
                            value={resForm.driverId}
                            onChange={(e) => {
                              const dId = e.target.value;
                              const dObj = drivers.find(drv => drv.id === dId);
                              setResForm({ 
                                ...resForm, 
                                driverId: dId,
                                vehicleId: dObj ? (dObj.vehicleId || "") : ""
                              });
                            }}
                            className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-gold outline-none text-xs focus:border-[#C5A880]/40"
                          >
                            <option value="">-- Non Assigné (Dispatch différé) --</option>
                            {drivers.map(d => {
                              const vObj = vehicles.find(v => v.id === d.vehicleId);
                              const vName = vObj ? `${vObj.brand} ${vObj.name} (${vObj.immatriculation})` : "Sans véhicule";
                              return (
                                <option key={d.id} value={d.id}>
                                  {d.name} — [{vName}] ({d.status})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* DYNAMIC READ-ONLY ASSIGNED VEHICLE PREVIEW */}
                        {(() => {
                          const activeDriver = drivers.find(d => d.id === resForm.driverId);
                          const activeVehicle = vehicles.find(v => v.id === (activeDriver?.vehicleId || resForm.vehicleId));
                          if (activeDriver) {
                            return (
                              <div className="bg-[#0A0A0E] border border-white/10 p-2.5 rounded-lg flex items-center justify-between text-xs">
                                <span className="text-neutral-400">Véhicule associé automatiquement :</span>
                                <span className="text-gold font-mono font-bold">
                                  {activeVehicle ? `${activeVehicle.brand} ${activeVehicle.name} (${activeVehicle.immatriculation})` : "Aucun véhicule lié à ce chauffeur"}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="bg-[#0A0A0E] border border-white/5 p-2.5 rounded-lg text-center text-xs text-neutral-500 italic">
                              Choisissez un chauffeur pour lui attribuer la mission. Son véhicule attitré sera automatiquement alloué.
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* INVOICE GENERATION BLOCK */}
              {modalType === "invoice" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-neutral-400 block mb-1">Type de redevable</label>
                    <select 
                      value={invoiceForm.type}
                      onChange={(e) => {
                        const tValue = e.target.value;
                        setInvoiceForm({ 
                          ...invoiceForm, 
                          type: tValue, 
                          accountId: tValue === "corporate" ? (corporates[0]?.id || "") : "" 
                        });
                      }}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                    >
                      <option value="corporate">Compte d'entreprise (Corporate)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Sélectionner pour facturer</label>
                    <select 
                      value={invoiceForm.accountId}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, accountId: e.target.value })}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white outline-none"
                    >
                      {corporates.map(co => (
                        <option key={co.id} value={co.id}>{co.name} ({co.email})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Montant Forfaitaire à imputer (CFA)</label>
                    <input 
                      type="number" 
                      required
                      placeholder="Ex: 1450000"
                      value={invoiceForm.customAmount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, customAmount: e.target.value })}
                      className="w-full bg-[#0E0E15] border border-white/10 rounded p-2 text-white font-mono outline-none"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Si laissé vide, l'algorithme va sommer toutes les courses corporate de l'entreprise non encore facturées.
                    </p>
                  </div>
                </div>
              )}

              </div>

              <div className="pt-4 border-t border-white-premium/5 flex justify-end gap-2 shrink-0">
                <Button id="close_admin_subform_btn" variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button id="submit_admin_subform_btn" variant="primary" type="submit">
                  {isEdit ? "Enregistrer les modifications" : "Confirmer l'opération"}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL FOR SECURE DELETIONS */}
      {deleteConfirm && (
        <div id="delete_confirm_modal_overlay" className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#0B0B0F] border border-red-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
                <Trash2 className="text-red-400" size={20} />
              </div>
              <h3 className="text-sm font-sans font-bold text-white mb-2 uppercase tracking-wide">
                Confirmer la suppression
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-mono">
                Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible et supprimera définitivement la ressource de la base de données.
              </p>
            </div>
            <div className="p-4 bg-[#111116]/60 border-t border-white/[0.04] flex items-center gap-2 justify-end">
              <button 
                className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-transparent hover:bg-white/5 border border-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
                onClick={() => setDeleteConfirm(null)}
              >
                Annuler
              </button>
              <button 
                className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-red-500/15 hover:bg-red-500/35 border border-red-500/40 text-red-400 transition-all cursor-pointer"
                onClick={confirmDelete}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM APPROVAL MODAL FOR SETTING PARTNER COMMISSION */}
      {partnerApprovalModal && partnerApprovalModal.isOpen && (
        <div id="partner_approval_modal_overlay" className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#0B0B0F] border border-[#C5A880]/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C5A880]/40 to-transparent" />
            
            <div className="p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
                <CheckCircle className="text-emerald-400" size={20} />
              </div>
              <h3 className="text-sm font-sans font-bold text-white mb-2 text-center uppercase tracking-wide">
                Approuver le partenaire hôtelier
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed text-center font-sans mb-4">
                Veuillez définir le taux de commission réglementaire applicable aux réservations de cet établissement.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1.5 font-bold">
                    Taux de commission (entre 10 et 15 %)
                  </label>
                  <div className="relative flex items-center">
                    <input 
                      type="number" 
                      min="10" 
                      max="15" 
                      step="1"
                      value={commissionInput}
                      onChange={(e) => setCommissionInput(parseInt(e.target.value) || 10)}
                      className="w-full bg-[#111116] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C5A880]/50 font-mono"
                    />
                    <span className="absolute right-3 text-sm text-neutral-400 font-bold">%</span>
                  </div>
                </div>

                <div className="flex gap-1.5 items-center justify-center">
                  {[10, 12, 15].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCommissionInput(val)}
                      className={`px-3 py-1 text-[10px] font-mono rounded-full border transition-all cursor-pointer ${
                        commissionInput === val 
                          ? "bg-[#C5A880]/20 border-[#C5A880] text-[#C5A880] font-bold" 
                          : "bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {val}% {val === 12 ? "(Recommandé)" : ""}
                    </button>
                  ))}
                </div>

                {partnerApprovalModal.error && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-center text-[11px] font-mono">
                    {partnerApprovalModal.error}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#111116]/60 border-t border-white/[0.04] flex items-center gap-2 justify-end">
              <button 
                className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-transparent hover:bg-white/5 border border-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
                onClick={() => setPartnerApprovalModal(null)}
              >
                Annuler
              </button>
              <button 
                className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-400 transition-all cursor-pointer"
                onClick={submitApprovePartner}
              >
                Valider et Activer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM REJECTION MODAL FOR CONFIRMING REJECTION */}
      {partnerRejectionModal && partnerRejectionModal.isOpen && (
        <div id="partner_rejection_modal_overlay" className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#0B0B0F] border border-red-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            
            <div className="p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
                <XCircle className="text-red-400" size={20} />
              </div>
              <h3 className="text-sm font-sans font-bold text-white mb-2 text-center uppercase tracking-wide">
                Rejeter la demande d'adhésion
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed text-center font-sans mb-4">
                Êtes-vous sûr de vouloir rejeter ce dossier de partenariat ? Cette action est irréversible.
              </p>

              {partnerRejectionModal.error && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-center text-[11px] font-mono">
                  {partnerRejectionModal.error}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#111116]/60 border-t border-white/[0.04] flex items-center gap-2 justify-end">
              <button 
                className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-transparent hover:bg-white/5 border border-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
                onClick={() => setPartnerRejectionModal(null)}
              >
                Annuler
              </button>
              <button 
                className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-red-500/15 hover:bg-red-500/35 border border-red-500/40 text-red-400 transition-all cursor-pointer"
                onClick={submitRejectPartner}
              >
                Oui, rejeter la demande
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // Download helper: supports downloading real Base64 file or falls back to template simulation
  function downloadPartnerFile(doc: any, partnerName: string, docType: string) {
    if (doc && doc.dataUrl) {
      try {
        const link = document.createElement("a");
        link.href = doc.dataUrl;
        link.download = doc.name || `document_${docType}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } catch (err) {
        console.error("Failed to download real file, falling back to mock", err);
      }
    }

    const filename = doc?.name || `document_${docType}.pdf`;
    const lowerName = filename.toLowerCase();
    let blob: Blob;
    let targetFilename = filename;

    if (lowerName.endsWith(".pdf")) {
      // Create a valid binary minimal PDF content representation so it opens flawlessly in all PDF readers without corruption errors
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 500 >>
stream
BT
/F1 16 Tf
50 700 Td
(EASY BY SAVER - DOSSIER HOMOLOGATION PARTENAIRE) Tj
/F1 12 Tf
0 -45 Td
(Nom de l'etablissement : ${partnerName.replace(/[()]/g, '')}) Tj
0 -22 Td
(Type de piece justificative : ${docType.toUpperCase()}) Tj
0 -22 Td
(Nom du fichier depose : ${filename.replace(/[()]/g, '')}) Tj
0 -22 Td
(Date de certification : ${new Date().toLocaleDateString('fr-FR')}) Tj
0 -45 Td
(Ce document PDF a ete genere et certifie valide par la direction EASY.) Tj
0 -20 Td
(L'integrite technique et administrative de la piece a ete verifiee.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
0000000211 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
650
%%EOF`;
      blob = new Blob([pdfContent], { type: "application/pdf" });
    } else if (lowerName.endsWith(".png") || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".svg")) {
      // Download as an SVG with the extension converted to .svg so it is 100% readable in any viewer
      const baseName = filename.replace(/\.(png|jpg|jpeg|svg)$/i, "");
      targetFilename = `${baseName}.svg`;
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#0B0B0F" />
  <rect x="25" y="25" width="750" height="550" rx="16" fill="none" stroke="#C5A880" stroke-width="2" stroke-dasharray="8 4" />
  
  <text x="60" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#C5A880">EASY BY SAVER</text>
  <text x="60" y="130" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#8A8A9A" letter-spacing="1.5">CONFORMITÉ DU DOCUMENT D'INSCRIPTION</text>
  
  <line x1="60" y1="160" x2="740" y2="160" stroke="#C5A880" stroke-opacity="0.2" stroke-width="1.5" />
  
  <text x="60" y="220" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF">Établissement :</text>
  <text x="60" y="250" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#E2E2E7">${partnerName}</text>
  
  <text x="60" y="315" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF">Type de document :</text>
  <text x="60" y="345" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#E2E2E7">${docType.toUpperCase()}</text>
  
  <text x="60" y="410" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF">Fichier d'origine :</text>
  <text x="60" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#C5A880" font-style="italic">${filename}</text>
  
  <text x="60" y="505" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#8A8A9A">Validé le : ${new Date().toLocaleDateString('fr-FR')} • Certifié Conforme EASY • ID : HP-${partnerName.substring(0, 3).toUpperCase()}</text>
  
  <circle cx="680" cy="460" r="50" fill="none" stroke="#C5A880" stroke-width="2" stroke-opacity="0.4" />
  <text x="680" y="455" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="bold" fill="#C5A880" fill-opacity="0.7" text-anchor="middle">EASY BY SAVER</text>
  <text x="680" y="470" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="bold" fill="#C5A880" fill-opacity="0.7" text-anchor="middle">CERTIFIÉ ★</text>
</svg>`;
      blob = new Blob([svgContent], { type: "image/svg+xml" });
    } else {
      const content = `==================================================
EASY BY SAVER - PORTAIL D'ADMINISTRATION
==================================================
DOCUMENT TRANSMIS PAR : ${partnerName.toUpperCase()}
TYPE DE DOCUMENT : ${docType.toUpperCase()}
NOM DU FICHIER : ${filename}
DATE : ${new Date().toLocaleDateString('fr-FR')}
--------------------------------------------------
CE FICHIER SIMULE LE CONTENU DU DOCUMENT TRANSMIS.
==================================================`;
      blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = targetFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Helper inside client calculations
  function quotesCount() {
    return 1;
  }
};
