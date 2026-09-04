import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { useSegment } from "../context/SegmentContext";
import { MessageCircle, MapPin, Mail, Phone, Clock } from "lucide-react";
import { Button } from "./Button";

const logoGreen = "/images/easy-logo-green.png";
const logoGold = "/images/easy-logo-gold.png";

interface FooterProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

export const Footer: React.FC<FooterProps> = ({
  setCurrentPage,
  id
}) => {
  const { t, translate } = useLanguage();
  const { segment } = useSegment();

  const handleNavigate = (pageId: string) => {
    setCurrentPage(pageId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer id={id} className="bg-dark text-muted-premium border-t border-gold/10 pt-16 pb-8 px-4 md:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {/* Branding Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate("home")}>
            <img
              src={segment === "public" ? logoGreen : logoGold}
              alt="EASY Logo"
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-xs leading-relaxed font-sans mt-2">
            {translate({
              fr: "EASY (Electric Automobile to Save You) est votre service de transport 100% électrique de prestige à Abidjan, opéré par SAVER. Zéro émission, silence total, raffinement et sécurité pour tous vos transferts.",
              en: "EASY (Electric Automobile to Save You) is Abidjan's boutique 100% electric chauffeur service, operated by SAVER. Zero emissions, total serenity, refinement and safety for all your executive transfers."
            })}
          </p>
          <div className="flex gap-2 mt-2">
            {/* WhatsApp CTA */}
            <a
              id="footer_wa_link"
              href="https://wa.me/2250700010203?text=Bonjour,%20je%20souhaite%20réserver%20un%20véhicule%20EASY"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg py-2 px-4 shadow-sm transition-all duration-150 font-medium active:translate-y-[1px]"
            >
              <MessageCircle size={14} />
              WhatsApp Business
            </a>
          </div>
        </div>

        {/* Quick Links Column */}
        <div>
          <h4 className="text-white-premium font-medium tracking-wide text-sm font-sans mb-4 uppercase">
            {t("navHome")} & Navigation
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                id="footer_link_home"
                onClick={() => handleNavigate("home")}
                className="hover:text-gold hover:underline cursor-pointer"
              >
                {t("navHome")}
              </button>
            </li>
            <li>
              <button
                id="footer_link_fleet"
                onClick={() => handleNavigate("vehicules")}
                className="hover:text-gold hover:underline cursor-pointer"
              >
                {t("navVehicles")}
              </button>
            </li>
            <li>
              <button
                id="footer_link_rates"
                onClick={() => handleNavigate("tarifs")}
                className="hover:text-gold hover:underline cursor-pointer"
              >
                {t("navRates")}
              </button>
            </li>
            <li>
              <button
                id="footer_link_contact"
                onClick={() => handleNavigate("contact")}
                className="hover:text-gold hover:underline cursor-pointer"
              >
                {t("navContact")}
              </button>
            </li>
          </ul>
        </div>

        {/* Segments Column */}
        <div>
          <h4 className="text-white-premium font-medium tracking-wide text-sm font-sans mb-4 uppercase">
            {translate({ fr: "Nos Segments Mobilité", en: "Our Mobility Segments" })}
          </h4>
          <ul className="space-y-2 text-xs">
            <li className="hover:text-white-premium">
              {translate({ fr: "Hôtels & Résidences (Consolidé)", en: "Hotels & Residences (Consolidated)" })}
            </li>
            <li className="hover:text-white-premium">
              {translate({ fr: "Corporate & Missions Diplomatiques", en: "Corporate & Diplomatic Missions" })}
            </li>
            <li className="hover:text-white-premium">
              {translate({ fr: "Campus, Écoles & Workers (Mobile Money)", en: "Campus, Schools & Workers (Mobile Money)" })}
            </li>
            <li className="text-[10px] text-gold-light uppercase font-mono mt-2">
              • {translate({ fr: "Chauffeurs Certifiés", en: "Certified Drivers" })} •
            </li>
          </ul>
        </div>

        {/* Direct Contact Corporate Desk */}
        <div className="flex flex-col gap-3 text-xs">
          <h4 className="text-white-premium font-medium tracking-wide text-sm font-sans mb-1 uppercase">
            Corporate Desk
          </h4>
          <div className="flex items-start gap-2.5">
            <MapPin size={14} className="text-gold mt-0.5" />
            <span className="leading-relaxed">
              Plateau, Avenue Chardy, Abidjan, Côte d'Ivoire
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone size={14} className="text-gold" />
            <span>+225 07 00 01 02 03</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Mail size={14} className="text-gold" />
            <span>office@easy-saver.ci</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock size={14} className="text-gold" />
            <span className="text-gold-light">
              {translate({ fr: "Service Continu 24h/7j", en: "Continuous 24/7 Service" })}
            </span>
          </div>
        </div>
      </div>

      <hr className="border-gold/10 my-8" />

      {/* Copyright notes */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-premium">
        <span>
          © {new Date().getFullYear()} EASY (Electric Automobile to Save You). {translate({ fr: "Une marque de SAVER. Tous droits réservés.", en: "A SAVER brand. All rights reserved." })}
        </span>
        <div className="flex gap-4">
          <span className="hover:text-gold cursor-pointer">
            {translate({ fr: "Conditions d'Utilisation", en: "Terms of Use" })}
          </span>
          <span className="hover:text-gold cursor-pointer">
            {translate({ fr: "Confidentialité", en: "Privacy Policy" })}
          </span>
        </div>
      </div>
    </footer>
  );
};
