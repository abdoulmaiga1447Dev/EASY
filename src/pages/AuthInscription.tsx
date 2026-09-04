import React, { useState, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useSegment } from "../context/SegmentContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { 
  ShieldAlert, User, Mail, Phone, Lock, CheckCircle2, 
  UploadCloud, FileText, CheckCircle, Trash2, ArrowRight, Star, Eye, EyeOff
} from "lucide-react";
import { UserRole } from "../types";
import DotField from "../components/DotField";

const logoGreen = "/images/easy-logo-green.png";
const logoGold = "/images/easy-logo-gold.png";

interface AuthInscriptionProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

export const AuthInscription: React.FC<AuthInscriptionProps> = ({
  setCurrentPage,
  id
}) => {
  const { t, language } = useLanguage();
  const { register } = useAuth();
  const { segment } = useSegment();

  // Standard user credentials
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("client"); // client, partenaire, corporate
  const [companyName, setCompanyName] = useState("");

  // Hospitality partner / Corporate additional states
  const [starRating, setStarRating] = useState("all");
  const [uploadedDocs, setUploadedDocs] = useState<{
    [key: string]: { name: string; size: string; progress: number; completed: boolean; dataUrl?: string }
  }>({});

  // Submission & presentation states
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPendingReview, setIsPendingReview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // References for file inputs to trigger clicks
  const fileInputsRef = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const docFieldsPartenaire = [
    { key: "rccm", label: "RCCM (Registre du Commerce et du Crédit Mobilier) (Facultatif)", required: false },
    { key: "licence", label: "Licence d'exploitation délivrée par le Ministère du Tourisme (Facultatif)", required: false },
    { key: "etoiles", label: "Certificat de classement étoiles (Facultatif)", required: false },
    { key: "dfe", label: "Déclaration Fiscale d'Existence (DFE) (Facultatif)", required: false },
    { key: "cni", label: "CNI ou passeport du dirigeant / directeur général (Facultatif)", required: false },
  ];

  const docFieldsCorporate = [
    { key: "rccm", label: "RCCM (Registre du Commerce et du Crédit Mobilier) (Facultatif)", required: false },
    { key: "dfe", label: "Déclaration Fiscale d'Existence (DFE) (Facultatif)", required: false },
    { key: "cni", label: "CNI ou passeport du dirigeant / directeur général (Facultatif)", required: false },
  ];

  const activeDocFields = role === "partenaire" 
    ? docFieldsPartenaire 
    : role === "corporate" 
      ? docFieldsCorporate 
      : [];

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      simulateUpload(key, file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      simulateUpload(key, file);
    }
  };

  // Simulated upload with smooth incremental progress bar & reading file to base64
  const simulateUpload = (key: string, file: File) => {
    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    setUploadedDocs(prev => ({
      ...prev,
      [key]: { name: file.name, size: sizeStr, progress: 10, completed: false }
    }));

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      let progress = 10;
      const interval = setInterval(() => {
        progress += 25;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadedDocs(prev => ({
            ...prev,
            [key]: { name: file.name, size: sizeStr, progress: 100, completed: true, dataUrl }
          }));
        } else {
          setUploadedDocs(prev => ({
            ...prev,
            [key]: { name: file.name, size: sizeStr, progress, completed: false }
          }));
        }
      }, 150);
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (key: string) => {
    setUploadedDocs(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const isClient = role === "client";
    if (!name || !email || (!isClient && !phone) || !password) {
      setErrorLocal(t("authRequiredErr"));
      return;
    }

    const isHospitality = role === "partenaire";
    const isCorporate = role === "corporate";

    if (isCorporate && !companyName) {
      setErrorLocal("Veuillez saisir le nom de la société.");
      return;
    }

    // Validate documents
    if (isHospitality || isCorporate) {
      for (const field of activeDocFields) {
        if (field.required && (!uploadedDocs[field.key] || !uploadedDocs[field.key].completed)) {
          setErrorLocal(`Veuillez charger le document obligatoire suivant : ${field.label.replace(" *", "")}`);
          return;
        }
      }
    }

    setIsLoading(true);

    const extraPayload: any = {};
    if (isHospitality) {
      extraPayload.partnerType = "hospitality";
      extraPayload.starRating = starRating;
      extraPayload.documents = Object.keys(uploadedDocs).reduce((acc, key) => {
        if (uploadedDocs[key]) {
          acc[key] = {
            name: uploadedDocs[key].name,
            size: uploadedDocs[key].size,
            dataUrl: uploadedDocs[key].dataUrl,
            uploadedAt: new Date().toISOString()
          };
        }
        return acc;
      }, {} as any);
    } else if (isCorporate) {
      extraPayload.companyName = companyName;
      extraPayload.documents = Object.keys(uploadedDocs).reduce((acc, key) => {
        if (uploadedDocs[key]) {
          acc[key] = {
            name: uploadedDocs[key].name,
            size: uploadedDocs[key].size,
            dataUrl: uploadedDocs[key].dataUrl,
            uploadedAt: new Date().toISOString()
          };
        }
        return acc;
      }, {} as any);
    }

    console.log("Registering user profile with extra payload:", { name, email, phone, role, extraPayload });
    const result = await register(name, email, phone, password, role, extraPayload);
    setIsLoading(false);

    if (result.success) {
      if (result.status === "pending_validation") {
        setIsPendingReview(true);
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setCurrentPage("home");
        }, 1500);
      }
    } else {
      setErrorLocal(result.error || "Une erreur est survenue lors de l'enregistrement");
    }
  };

  return (
    <div id={id} className="relative min-h-screen bg-black flex items-center justify-center py-24 px-4 overflow-y-auto">
      
      {/* Interactive DotField background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          bulgeStrength={67}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
          cursorRadius={500}
          cursorForce={0.1}
          bulgeOnly
          gradientFrom="#C5A880"
          gradientTo="#B497CF"
          glowColor="#120F17"
        />
        {/* Soft vignette to blend content legibility */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      </div>

      {isPendingReview ? (
        <Card id="hospitality_pending_card" className="w-full max-w-2xl p-10 z-10 backdrop-blur-xl bg-black/70 border border-[#C5A880]/30 rounded-2xl shadow-2xl relative" glow={true}>
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#C5A880]/10 text-[#C5A880] border border-[#C5A880]/20 rounded-full mx-auto flex items-center justify-center mb-4">
              <UploadCloud size={40} className="animate-pulse" />
            </div>
            <h2 className="text-2xl md:text-3xl font-sans font-bold text-white-premium leading-snug tracking-tight">
              Dossier En Cours d'Examen
            </h2>
            <p className="text-xs text-[#8A8A9A] mt-2 tracking-wide uppercase font-mono">
              {role === "partenaire" ? "EASY Hospitality Partner • Programme Agréé" : "EASY Corporate Account • Programme Agréé"}
            </p>
          </div>

          <div className="space-y-6 text-neutral-300">
            <div className="bg-[#1C1A17] border-l-4 border-[#C5A880] p-5 rounded-r-xl">
              <p className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#C5A880]" />
                Demande d'inscription enregistrée avec succès !
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Un email automatique de confirmation a été émis à l'adresse <strong className="text-white">{email}</strong> : 
                <span className="block mt-1 italic text-[#C5A880] font-sans">« Votre compte est en cours de validation »</span>
              </p>
            </div>

            <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-5 text-center">
              <ShieldAlert className="mx-auto mb-2 text-red-400" size={24} />
              <p className="text-xs text-red-300 font-semibold uppercase tracking-wider">RESTRICTION D'ACCÈS TEMPORAIRE</p>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Conformément aux directives de sécurité EASY, <strong className="text-red-200">aucun accès à la plateforme</strong> n'est autorisé à ce stade tant que l'administrateur EASY n'a pas validé physiquement vos documents réglementaires.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-mono tracking-wider uppercase text-neutral-400 mb-3">
                Récapitulatif des pièces réglementaires fournies :
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeDocFields.map((field) => {
                  const hasDoc = uploadedDocs[field.key];
                  return (
                    <div key={field.key} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileText size={15} className="text-neutral-400 shrink-0" />
                        <span className="font-sans text-neutral-300 font-medium truncate max-w-xs">{field.label.replace(" *", "")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#00C853] font-mono text-[10px] uppercase font-bold shrink-0">
                        <CheckCircle size={12} />
                        {hasDoc ? "Transmis" : field.required ? "Manquant" : "Non fourni"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-4">
            <Button
              id="back_to_home_pending"
              variant="outline"
              onClick={() => setCurrentPage("home")}
              className="flex-1 rounded-xl py-3 text-xs tracking-wider uppercase font-bold"
            >
              Retourner à l'Accueil
            </Button>
            <Button
              id="go_to_connexion_pending"
              variant="primary"
              onClick={() => setCurrentPage("connexion")}
              className="flex-1 rounded-xl py-3 text-xs tracking-wider uppercase font-bold flex items-center justify-center gap-2"
            >
              Aller à la Connexion
              <ArrowRight size={14} />
            </Button>
          </div>
        </Card>
      ) : (
        <Card id="inscription_box" className={`w-full ${(role === 'partenaire' || role === 'corporate') ? 'max-w-2xl' : 'max-w-md'} p-8 z-10 backdrop-blur-xl bg-white/5 border border-gold-light/20 relative rounded-2xl shadow-2xl transition-all duration-300`} glow={true}>
          
          {/* Header branding */}
          <div className="text-center mb-6">
            <img
              src={segment === "public" ? logoGreen : logoGold}
              alt="EASY Logo"
              className="h-16 w-auto object-contain mx-auto mb-2"
              referrerPolicy="no-referrer"
            />
            <h2 className="text-xl md:text-2xl font-sans font-bold text-white-premium leading-snug">
              {t("authSignUpTitle")}
            </h2>
            <p className="text-xs text-[#8A8A9A] mt-1">
              Zéro émission • Chauffeurs certifiés • EASY (By Saver)
            </p>
          </div>

          {isSuccess ? (
            <div id="register_success_alert" className="bg-transparent border border-emerald-500/30 rounded-lg p-5 text-center text-emerald-400">
              <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={28} />
              <p className="text-sm font-semibold">Compte créé avec succès !</p>
              <p className="text-xs text-emerald-400/80 mt-1">Génération des clés d'accès sécurisées ...</p>
            </div>
          ) : (
            <form id="register_actual_form" onSubmit={handleSubmit} className="space-y-4" noValidate>
              
              {/* Error state helper alerts */}
              {errorLocal && (
                <div id="register_error_alert" className="bg-transparent border border-red-500/30 rounded-lg p-3 text-xs text-red-400 flex items-start gap-2">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <span>{errorLocal}</span>
                </div>
              )}

              {/* Grid wrapper for responsive larger forms */}
              <div className={`grid grid-cols-1 ${(role === 'partenaire' || role === 'corporate') ? 'md:grid-cols-2 gap-x-6' : ''} gap-y-4`}>
                
                <div className="space-y-4">
                  {/* Account type Select options */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg_role" className="text-xs font-mono text-neutral-300 uppercase tracking-wider">
                      {t("authAccountTypeLabel")}
                    </label>
                    <select
                      id="reg_role"
                      value={role}
                      onChange={(e) => {
                        const nextRole = e.target.value as UserRole;
                        setRole(nextRole);
                      }}
                      className="w-full bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors cursor-pointer"
                    >
                      <option value="client" className="bg-black text-white">Client (Particulier)</option>
                      <option value="partenaire" className="bg-black text-white">Partenaire Hôtel & Résidence</option>
                      <option value="corporate" className="bg-black text-white">Corporate / Entreprise</option>
                    </select>
                  </div>

                  {/* Name Input field */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg_name" className="text-xs font-mono text-neutral-300 uppercase tracking-wider">
                      {role === "partenaire" 
                        ? "Nom de l'établissement / hôtel *" 
                        : role === "corporate" 
                          ? "Nom complet du dirigeant / directeur général *" 
                          : `${t("authNameLabel")} *`}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                        <User size={15} />
                      </span>
                      <input
                        type="text"
                        id="reg_name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={
                          role === "partenaire" 
                            ? "Ex: Hôtel Pullman Abidjan" 
                            : role === "corporate" 
                              ? "Ex: Jean Koffi" 
                              : "Ex: Jean Koffi"
                        }
                        className="w-full bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 pl-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Company Name (Corporate only) */}
                  {role === "corporate" && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="reg_company" className="text-xs font-mono text-neutral-300 uppercase tracking-wider">
                        Nom de la société / entreprise *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                          <FileText size={15} />
                        </span>
                        <input
                          type="text"
                          id="reg_company"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Ex: Sifca SA"
                          className="w-full bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 pl-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Input field */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg_email" className="text-xs font-mono text-neutral-300 uppercase tracking-wider">
                      {t("authEmailLabel")} *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                        <Mail size={15} />
                      </span>
                      <input
                        type="email"
                        id="reg_email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex: jean.koffi@exemple.com"
                        className="w-full bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 pl-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Input field */}
                  {role !== "client" && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="reg_phone" className="text-xs font-mono text-neutral-300 uppercase tracking-wider">
                        {t("authPhoneLabel")} *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                          <Phone size={15} />
                        </span>
                        <input
                          type="tel"
                          id="reg_phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ex: +225 0707070707"
                          className="w-full bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 pl-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Password Input field */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg_password" className="text-xs font-mono text-neutral-300 uppercase tracking-wider">
                      {t("authPasswordLabel")} *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                        <Lock size={15} />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="reg_password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 caractères"
                        minLength={6}
                        className="w-full bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 pl-10 pr-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                        required
                      />
                      <button
                        type="button"
                        id="toggle_register_pwd_visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Hospitality Classification rating */}
                  {role === "partenaire" && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="reg_stars" className="text-xs font-mono text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Star size={13} className="text-gold" />
                        Classement étoiles de l'établissement
                      </label>
                      <select
                        id="reg_stars"
                        value={starRating}
                        onChange={(e) => setStarRating(e.target.value)}
                        className="w-full bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors cursor-pointer"
                      >
                        <option value="all" className="bg-black text-white">Non classé / Autre</option>
                        <option value="1" className="bg-black text-white">⭐ 1 Étoile</option>
                        <option value="2" className="bg-black text-white">⭐⭐ 2 Étoiles</option>
                        <option value="3" className="bg-black text-white">⭐⭐⭐ 3 Étoiles</option>
                        <option value="4" className="bg-black text-white">⭐⭐⭐⭐ 4 Étoiles</option>
                        <option value="5" className="bg-black text-white">⭐⭐⭐⭐⭐ 5 Étoiles (Palace/Luxe)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Hospitality or Corporate Document Upload Column */}
                {(role === "partenaire" || role === "corporate") && (
                  <div className="space-y-4 mt-4 md:mt-0 md:border-l md:border-white/10 md:pl-6 max-h-[500px] overflow-y-auto pr-1">
                    <h3 className="text-xs font-mono tracking-wider uppercase text-gold-light border-b border-gold-light/10 pb-1.5 flex items-center justify-between">
                      <span>Pièces justificatives (Facultatives)</span>
                      <span className="text-[10px] text-neutral-400 font-sans font-normal lowercase">(optionnel)</span>
                    </h3>
                    
                    <div className="space-y-4">
                      {activeDocFields.map((field) => {
                        const hasDoc = uploadedDocs[field.key];
                        return (
                          <div key={field.key} className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-sans text-neutral-300 font-semibold leading-tight">
                              {field.label}
                            </span>
                            
                            {!hasDoc ? (
                              <div
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, field.key)}
                                onClick={() => {
                                  const input = fileInputsRef.current[field.key];
                                  if (input) input.click();
                                }}
                                className="border border-dashed border-neutral-600/50 hover:border-gold-light/40 bg-black/20 hover:bg-white/[0.02] rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 text-center"
                              >
                                <input
                                  type="file"
                                  ref={(el) => { fileInputsRef.current[field.key] = el; }}
                                  onChange={(e) => handleFileChange(e, field.key)}
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  className="hidden"
                                />
                                <UploadCloud size={18} className="text-neutral-400" />
                                <div className="text-[10px] text-neutral-400">
                                  Glisser-déposer ou <span className="text-gold-light underline font-medium">cliquer pour choisir</span>
                                </div>
                                <span className="text-[8px] text-neutral-500">PDF, PNG, JPG (Max. 5Mo)</span>
                              </div>
                            ) : (
                              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2 relative">
                                <div className="flex items-start justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText size={15} className="text-[#C5A880] shrink-0" />
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-medium text-white truncate text-[11px]">{hasDoc.name}</span>
                                      <span className="text-[9px] text-neutral-500">{hasDoc.size}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeDoc(field.key)}
                                    className="text-neutral-500 hover:text-red-400 p-1 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400">
                                    <span>{hasDoc.completed ? "Importé avec succès" : "Téléchargement..."}</span>
                                    <span>{hasDoc.progress}%</span>
                                  </div>
                                  <div className="w-full bg-neutral-800 rounded-full h-1 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${hasDoc.completed ? "bg-[#00C853]" : "bg-[#C5A880]"}`}
                                      style={{ width: `${hasDoc.progress}%` }}
                                    />
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
              </div>

              {/* Submission CTA */}
              <Button
                id="register_submit_button"
                variant="primary"
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 rounded-xl py-3 text-xs tracking-wider uppercase font-bold"
              >
                {isLoading ? (language === "fr" ? "Vérification en cours..." : "Validating...") : t("authActionSignUp")}
              </Button>

              {/* Back to Login option */}
              <div className="text-center pt-4 border-t border-gold-light/10 mt-6">
                <p className="text-xs text-neutral-300">
                  {t("authHaveAccount")}{" "}
                  <button
                    id="go_login_btn"
                    type="button"
                    onClick={() => setCurrentPage("connexion")}
                    className="text-gold-light bold hover:underline cursor-pointer font-semibold ml-1"
                  >
                    {t("navLogin")}
                  </button>
                </p>
              </div>

            </form>
          )}
        </Card>
      )}
    </div>
  );
};
