import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useSegment } from "../context/SegmentContext";
import { Button } from "./Button";
import { Menu, X, Globe, User, LogOut, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const logoGreen = "/images/easy-logo-green.png";
const logoGold = "/images/easy-logo-gold.png";

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  id: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  setCurrentPage,
  id
}) => {
  const { language, toggleLanguage, t, translate } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const { segment, setSegment } = useSegment();
  const [isOpen, setIsOpen] = useState(false);

  const isProfessional = isAuthenticated && (user?.role === "corporate" || user?.role === "partenaire" || user?.role === "chauffeur" || user?.role === "admin");

  const menuItems = isProfessional
    ? [
        ...(user?.role === "chauffeur" ? [{ id: "chauffeur", label: translate({ fr: "Espace Chauffeur ✦", en: "Chauffeur Space ✦" }) }] : []),
        ...(user?.role === "partenaire" ? [{ id: "partenaire", label: translate({ fr: "Espace Partenaire ✦", en: "Partner Space ✦" }) }] : []),
        ...(user?.role === "corporate" ? [{ id: "corporate", label: translate({ fr: "Espace Corporate ✦", en: "Corporate Space ✦" }) }] : []),
        ...(user?.role === "admin" ? [{ id: "admin", label: translate({ fr: "Administration EASY ✦", en: "EASY Admin ✦" }) }] : [])
      ]
    : [
        { id: "home", label: t("navHome") },
        { id: "vehicules", label: t("navVehicles") },
        { id: "nos-chauffeurs", label: translate({ fr: "Nos Chauffeurs", en: "Our Chauffeurs" }) },
        { id: "tarifs", label: t("navRates") },
        { id: "devis", label: translate({ fr: "Devis Prestige", en: "Prestige Quote" }) },
        ...(isAuthenticated ? [{ id: "commandes", label: translate({ fr: "Mes Commandes", en: "My Orders" }) }] : []),
        { id: "contact", label: t("navContact") }
      ];

  const activeIndex = menuItems.findIndex(item => item.id === currentPage);

  const handleNavigate = (pageId: string) => {
    setCurrentPage(pageId);
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav id={id} className="fixed top-0 left-0 right-0 z-50 bg-dark/95 backdrop-blur-md border-b border-gold/10 px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo Branding */}
        <div
          id="nav_brand"
          onClick={() => handleNavigate("home")}
          className="flex items-center gap-3 cursor-pointer"
        >
          <img
            src={segment === "public" ? logoGreen : logoGold}
            alt="EASY Logo"
            className="h-11 md:h-14 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Desktop Links */}
        <div id="desktop_menu" className="hidden lg:flex items-center">
          <div className="liquid-group flex items-center relative overflow-hidden">
            {activeIndex !== -1 && (
              <div 
                className="liquid-slider"
                style={{
                  position: "absolute",
                  inset: "var(--gap)",
                  width: `calc((100% - ${(menuItems.length - 1) * 6}px) / ${menuItems.length})`,
                  transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 6}px))`,
                  transition: "transform var(--speed) var(--ease)",
                }}
              />
            )}
            {menuItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav_link_${item.id}`}
                  onClick={() => handleNavigate(item.id)}
                  className={`relative z-10 py-2 px-5 font-sans text-xs tracking-wider font-bold uppercase cursor-pointer transition-colors duration-300 ${
                    isActive
                      ? "text-white"
                      : "text-[#8e8e93] hover:text-white"
                  }`}
                  style={{
                    whiteSpace: "nowrap",
                    background: "none",
                    border: "none"
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls & Info */}
        <div id="nav_actions" className="hidden lg:flex items-center gap-4">
          {/* Language Switch */}
          <button
            id="lang_switch_desktop"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 text-xs font-mono font-medium text-muted-premium hover:text-gold uppercase px-2 py-1 rounded border border-white-premium/5 hover:border-gold/20 cursor-pointer"
            title="Toggle Language"
          >
            <Globe size={13} className="text-gold" />
            {language === "fr" ? "EN" : "FR"}
          </button>

          {/* Auth State */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 bg-surface p-1 px-3 rounded-md border border-white-premium/5">
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium text-white-premium">{user.name}</span>
                <span className="text-[9px] uppercase tracking-wider text-gold-light flex items-center gap-0.5">
                  <Shield size={8} /> {user.role}
                </span>
              </div>
              <button
                id="logout_btn_desktop"
                onClick={logout}
                className="text-muted-premium hover:text-red-400 p-1 cursor-pointer"
                title={t("navLogout")}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              id="login_btn_desktop"
              onClick={() => handleNavigate("connexion")}
              className="text-sm font-medium text-white-premium hover:text-gold flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer"
            >
              <User size={15} className="text-gold" />
              {t("navLogin")}
            </button>
          )}

          {/* Direct CTA */}
          {!isProfessional && (
            <Button
              id="nav_book_cta"
              variant="primary"
              onClick={() => handleNavigate(isAuthenticated ? "reservation" : "connexion")}
            >
              {t("navReserve")}
            </Button>
          )}
        </div>

        {/* Mobile menu controllers */}
        <div className="flex lg:hidden items-center gap-3">
          {/* Quick Lang Switch */}
          <button
            id="lang_switch_mobile"
            onClick={toggleLanguage}
            className="flex items-center gap-1 text-xs font-mono text-muted-premium hover:text-gold border border-white-premium/10 rounded px-2 py-1 cursor-pointer"
          >
            <Globe size={12} className="text-gold" />
            {language === "fr" ? "EN" : "FR"}
          </button>

          <button
            id="mobile_hamburger"
            onClick={() => {
              setIsOpen(!isOpen);
              console.log("Mobile navigation bar state toggled: " + !isOpen);
            }}
            className="text-white-premium p-1 hover:text-gold transition-colors cursor-pointer"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Drawer Menu overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile_drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden bg-surface mt-3 rounded-lg border border-gold/10 overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-3 bg-surface text-left">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  id={`nav_mobile_link_${item.id}`}
                  onClick={() => handleNavigate(item.id)}
                  className={`py-2 px-2.5 rounded-lg text-left font-sans text-sm font-medium transition-all ${
                    currentPage === item.id ? "text-gold bg-gold/5 font-bold" : "text-muted-premium hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <hr className="border-gold/10 my-1" />

              {/* No manual segment selector as it is now fully automatic according to route */}

              <div className="flex items-center justify-between py-2">
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white-premium">
                      {user.name} ({user.role})
                    </span>
                    <button
                      id="logout_btn_mobile"
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="text-xs text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut size={14} /> {t("navLogout")}
                    </button>
                  </div>
                ) : (
                  <button
                    id="login_btn_mobile"
                    onClick={() => handleNavigate("connexion")}
                    className="text-sm font-medium text-white-premium hover:text-gold flex items-center gap-1.5 cursor-pointer"
                  >
                    <User size={14} className="text-gold" />
                    {t("navLogin")}
                  </button>
                )}
              </div>

              {!isProfessional && (
                <Button
                  id="nav_book_mobile_cta"
                  variant="primary"
                  onClick={() => handleNavigate(isAuthenticated ? "reservation" : "connexion")}
                  className="w-full mt-2"
                >
                  {t("navReserve")}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
