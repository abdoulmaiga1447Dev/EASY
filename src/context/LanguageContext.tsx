import React, { createContext, useContext, useState, useEffect } from "react";
import { Language } from "../types";

interface LanguageContextProps {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
  translate: (keys: { fr: string; en: string }) => string;
}

const translations = {
  // Navigation
  navHome: { fr: "Accueil", en: "Home" },
  navVehicles: { fr: "Véhicules", en: "Fleet" },
  navRates: { fr: "Tarifs", en: "Rates" },
  navContact: { fr: "Contact", en: "Contact" },
  navReserve: { fr: "Réserver", en: "Book Now" },
  navLogin: { fr: "Connexion", en: "Log In" },
  navRegister: { fr: "Inscription", en: "Sign Up" },
  navLogout: { fr: "Déconnexion", en: "Log Out" },

  // Hero Section
  heroTitle: { 
    fr: "0 FCFA de carburant.\n100% de confort.", 
    en: "0 FCFA fuel cost.\n100% comfort." 
  },
  heroSubtitle: { 
    fr: "Louez votre chauffeur + véhicule électrique premium à l'heure, demi-journée 8h ou journée 16h.", 
    en: "Rent your chauffeur + premium electric vehicle by the hour, 8h half-day, or 16h full day." 
  },
  heroCTA: { fr: "Réserver maintenant", en: "Book Your Ride" },

  // Stats Section
  statVehiclesTitle: { fr: "Véhicules Premium", en: "Premium Vehicles" },
  statVehiclesDesc: { fr: "Flotte 100% électrique de dernière génération", en: "100% electric cutting-edge fleet" },
  statEcoTitle: { fr: "100% Éco-responsable", en: "100% Eco-friendly" },
  statEcoDesc: { fr: "Zéro émission de CO₂ dans les rues d'Abidjan", en: "Zero CO₂ emissions in the streets of Abidjan" },
  statHoursTitle: { fr: "Assistance 24h/7j", en: "24/7 Assistance" },
  statHoursDesc: { fr: "Notre équipe reste disponible pour vous", en: "Our team remains at your disposal" },

  // Segments Section
  segmentTitle: { fr: "Des Solutions Sur-Mesure", en: "Tailored Travel Segments" },
  segmentSubtitle: { fr: "Trois offres exclusives pour s'adapter à toutes vos exigences à Abidjan", en: "Three exclusive segments matching your specific standards in Abidjan" },
  segment1Name: { fr: "1. Hôtels, Lodges & Résidences", en: "1. Hotels & High-End Residencies" },
  segment1Desc: { fr: "Une prise en charge d'exception pour vos clients les plus prestigieux, avec un modèle de partenariat pensé pour générer un revenu récurrent pour votre établissement.", en: "Exceptional care for your most prestigious guests, with a partnership model designed to generate recurring revenue for your establishment." },
  segment2Name: { fr: "2. Corporate & Diplomatie", en: "2. Corporate & Diplomatic Protocol" },
  segment2Desc: { fr: "Des transferts officiels et voyages d'affaires sécurisés, pensés pour les exigences des entreprises et représentations diplomatiques.", en: "Secure official transfers and executive business travels, tailored to the requirements of companies and diplomatic missions." },
  segment3Name: { fr: "3. Campus & Travailleurs", en: "3. Campus, Schools & Executive Commuters" },
  segment3Desc: { fr: "Des trajets quotidiens fiables et sécurisés, avec un paiement simple par Mobile Money et une tranquillité d'esprit pour les familles.", en: "Reliable and secure daily commutes, with easy Mobile Money payment and peace of mind for families." },

  // Fleet Section
  fleetTitle: { fr: "Notre Flotte Électrique", en: "Our Electric Fleet" },
  fleetSubtitle: { fr: "Un confort technologique inégalé, sans bruit de moteur", en: "Unmatched high-tech comfort, beautifully silent" },
  fleetSeats: { fr: "Places", en: "Seats" },
  fleetAutonomy: { fr: "Autonomie", en: "Range" },
  fleetPower: { fr: "Puissance", en: "Power" },
  fleetCharge: { fr: "Charge rapide", en: "DC Supercharge" },
  fleetStartingFrom: { fr: "À partir de", en: "Starting from" },
  fleetOnQuote: { fr: "Sur devis", en: "Upon Request" },
  fleetSelect: { fr: "Choisir ce véhicule", en: "Select Vehicle" },

  // Rates Section
  ratesTitle: { fr: "Grille Tarifaire Transparente", en: "Transparent Invoicing & Rates" },
  ratesSubtitle: { fr: "Des prix forfaitaires, sans surprises ni frais cachés", en: "Flat rates, zero hidden costs, pure clarity" },
  ratesTableVehicle: { fr: "Véhicule", en: "Vehicle" },
  ratesTableHourly: { fr: "Tarif Horaire", en: "Hourly Rate" },
  ratesTableHalfDay: { fr: "Demi-journée (4h)", en: "Half-Day (4 hours)" },
  ratesTableFullDay: { fr: "Journée (8h)", en: "Full-Day (8 hours)" },
  ratesPremiumAdjustments: { fr: "Garanties & Majorations Spécifiques", en: "Surcharges & Extra Conditions" },
  ratesAdjustmentNight: { fr: "Tarif de Nuit (+20%)", en: "Night Shift Surcharge (+20%)" },
  ratesAdjustmentNightDesc: { fr: "Sécurisation renforcée appliquée entre 22h00 et 06h00.", en: "Enhanced security procedures applied from 10:00 PM to 06:00 AM." },
  ratesAdjustmentWeekend: { fr: "Weekend & Fériés (+20%)", en: "Weekend & Holidays (+20%)" },
  ratesAdjustmentWeekendDesc: { fr: "Disponibilité garantie avec majoration mineure les samedis, dimanches et jours fériés.", en: "Guaranteed scheduling for Saturdays, Sundays and official holidays." },
  ratesAdjustmentBilingual: { fr: "Chauffeur Bilingue (+15%)", en: "Bilingual English Marshall (+15%)" },
  ratesAdjustmentBilingualDesc: { fr: "Accueil officiel et conduite par un chauffeur certifié parlant couramment l'anglais.", en: "Official welcome protocol led by an executive chauffeur fluent in French & English." },

  // Contact Section
  contactTitle: { fr: "Contactez Notre Bureau", en: "Contact Our Desk" },
  contactSubtitle: { fr: "Une question ? Une demande spécifique ? N'hésitez pas.", en: "Have a question or specific request? Our team is active 24/7." },
  contactLabelName: { fr: "Nom complet", en: "Full name" },
  contactLabelEmail: { fr: "Adresse email", en: "Email address" },
  contactLabelMessage: { fr: "Message / Détails de votre besoin", en: "Message / Specific requirements" },
  contactSendBtn: { fr: "Envoyer le message", en: "Send Message" },
  contactSuccess: { fr: "Message envoyé avec succès ! Nous vous recontactons sous peu.", en: "Message successfully sent! We will reach out shortly." },
  contactWhatsAppBtn: { fr: "Discuter sur WhatsApp", en: "Chat on WhatsApp" },
  contactAddressTitle: { fr: "Adresse du Siège", en: "Head Office Address" },
  contactScheduleTitle: { fr: "Horaires d'ouverture", en: "Service Hours" },
  contactScheduleDesc: { fr: "Réservations, bureau et chauffeurs : 24h/24, 7j/7", en: "Reservations, office operations & drivers: 24/7 active" },

  // Auth Sections
  authWelcomeTitle: { fr: "Bienvenue chez EASY", en: "Welcome to EASY" },
  authSignInTitle: { fr: "Connexion Espace Membre", en: "Member Portal Log In" },
  authSignUpTitle: { fr: "Créer un Compte Premium", en: "Create Premium Account" },
  authForgotTitle: { fr: "Mot de passe oublié", en: "Recover Password" },
  authForgotDesc: { fr: "Saisissez votre email. Un lien de réinitialisation vous sera envoyé.", en: "Enter your email address. We will send you a secure resetting link." },
  authForgotBtn: { fr: "Envoyer le lien de récupération", en: "Send Recovery Link" },
  authForgotSuccess: { fr: "Un lien de réinitialisation a été envoyé à votre adresse email.", en: "A password recovery email has been sent to your inbox." },
  authEmailLabel: { fr: "Adresse email", en: "Email address" },
  authPasswordLabel: { fr: "Mot de passe", en: "Password" },
  authNameLabel: { fr: "Nom & Prénom", en: "Full Name" },
  authPhoneLabel: { fr: "Numéro de Téléphone (avec code pays)", en: "Phone Number (with country code)" },
  authAccountTypeLabel: { fr: "Type de compte", en: "Account Type" },
  authTypeClient: { fr: "Client (Particulier)", en: "Client (Individual)" },
  authTypePartenaire: { fr: "Partenaire Hôtel & Résidence", en: "Partner Hotel & Residence" },
  authNoAccount: { fr: "Vous n'avez pas de compte ?", en: "Don't have an account yet?" },
  authHaveAccount: { fr: "Vous avez déjà un compte ?", en: "Already have a premium member account?" },
  authBackToLogin: { fr: "Retour à la connexion", en: "Back to login screen" },
  authActionSignIn: { fr: "Se Connecter", en: "Sign In" },
  authActionSignUp: { fr: "S'enregistrer maintenant", en: "Register Now" },
  authRequiredErr: { fr: "Tous les champs marqués sont requis.", en: "All mandatory fields must be filled." }
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("ev_pref_lang");
    return (saved === "fr" || saved === "en") ? saved : "fr";
  });

  useEffect(() => {
    localStorage.setItem("ev_pref_lang", language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === "fr" ? "en" : "fr"));
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: keyof typeof translations): string => {
    const item = translations[key];
    if (!item) return String(key);
    return item[language] || item["fr"] || "";
  };

  const translate = (keys: { fr: string; en: string }): string => {
    return keys[language] || keys.fr || "";
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage, t, translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
