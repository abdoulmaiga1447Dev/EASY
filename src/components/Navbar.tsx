/**
 * Navbar — refonte UI 2026 : barre « pilule » flottante (style Uber/Yango),
 * charte vert/blanc. Logo à gauche, liens au centre, CTA vert à droite.
 */
import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { Menu, X, Globe, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const logoGreen = "/images/easy-logo-green.png";

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  id: string;
}

const GREEN = "#00C853";

export const Navbar: React.FC<NavbarProps> = ({ currentPage, setCurrentPage, id }) => {
  const { language, toggleLanguage, t, translate } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isProfessional = isAuthenticated && (user?.role === "corporate" || user?.role === "partenaire" || user?.role === "chauffeur" || user?.role === "admin");

  const menuItems = isProfessional
    ? [
        ...(user?.role === "chauffeur" ? [{ id: "chauffeur", label: translate({ fr: "Espace Chauffeur", en: "Chauffeur" }) }] : []),
        ...(user?.role === "partenaire" ? [{ id: "partenaire", label: translate({ fr: "Espace Partenaire", en: "Partner" }) }] : []),
        ...(user?.role === "corporate" ? [{ id: "corporate", label: translate({ fr: "Espace Corporate", en: "Corporate" }) }] : []),
        ...(user?.role === "admin" ? [{ id: "admin", label: translate({ fr: "Administration", en: "Admin" }) }] : []),
      ]
    : [
        { id: "home", label: t("navHome") },
        { id: "vehicules", label: t("navVehicles") },
        { id: "nos-chauffeurs", label: translate({ fr: "Chauffeurs", en: "Chauffeurs" }) },
        { id: "tarifs", label: t("navRates") },
        { id: "contact", label: t("navContact") },
      ];

  const go = (pageId: string) => {
    setCurrentPage(pageId);
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ctaLabel = isProfessional
    ? translate({ fr: "Mon espace", en: "My space" })
    : isAuthenticated
    ? translate({ fr: "Réserver", en: "Book" })
    : t("navLogin");
  const ctaTarget = isProfessional ? (user?.role || "home") : isAuthenticated ? "reservation" : "connexion";

  return (
    <nav id={id} className="fixed top-3 inset-x-0 z-50 px-3">
      <div className={`mx-auto max-w-5xl flex items-center justify-between gap-2 rounded-full bg-white/30 backdrop-blur-xl backdrop-saturate-150 py-2 pl-3 pr-2 ring-1 ring-white/40 transition-shadow ${scrolled ? "shadow-[0_10px_30px_rgba(0,0,0,0.18)]" : "shadow-[0_6px_20px_rgba(0,0,0,0.10)]"}`}>
        {/* Logo (badge noir arrondi, adapté au fond noir du logo) */}
        <button onClick={() => go("home")} className="flex items-center shrink-0" aria-label="Accueil">
          <span className="flex items-center justify-center rounded-2xl bg-black px-3 py-2">
            <img src={logoGreen} alt="EASY" className="h-6 w-auto object-contain" referrerPolicy="no-referrer" />
          </span>
        </button>

        {/* Liens (desktop) */}
        <div className="hidden lg:flex items-center gap-1">
          {menuItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-colors ${active ? "text-[#00A846] bg-[#00C853]/14" : "text-[#0B1F14] hover:text-white hover:bg-[#0B1F14]"}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button onClick={toggleLanguage} className="hidden sm:flex items-center gap-1 text-xs font-semibold text-[#5B6B62] hover:text-[#0B1F14] px-2 py-1.5 rounded-full" title="Langue">
            <Globe size={14} /> {language === "fr" ? "EN" : "FR"}
          </button>

          {isAuthenticated && user && (
            <button onClick={logout} className="hidden sm:flex items-center text-[#5B6B62] hover:text-[#EF4444] p-2 rounded-full" title={t("navLogout")}>
              <LogOut size={16} />
            </button>
          )}

          <button
            onClick={() => go(ctaTarget)}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#06140D] shadow-sm transition-transform active:scale-[0.98] whitespace-nowrap"
            style={{ background: GREEN }}
          >
            {ctaLabel}
          </button>

          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-[#0B1F14] p-2 rounded-full hover:bg-black/[0.05]" aria-label="Menu">
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden mx-auto max-w-5xl mt-2 rounded-3xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
          >
            <div className="flex flex-col p-3">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`text-left px-4 py-3 rounded-2xl text-sm font-semibold ${currentPage === item.id ? "text-[#00A846] bg-[#00C853]/14" : "text-[#0B1F14] hover:text-[#00A846] hover:bg-black/[0.06]"}`}
                >
                  {item.label}
                </button>
              ))}
              <div className="flex items-center justify-between px-2 pt-2 mt-1 border-t border-black/5">
                <button onClick={toggleLanguage} className="flex items-center gap-1 text-xs font-semibold text-[#5B6B62] py-2">
                  <Globe size={14} /> {language === "fr" ? "English" : "Français"}
                </button>
                {isAuthenticated && user && (
                  <button onClick={() => { logout(); setIsOpen(false); }} className="flex items-center gap-1 text-xs font-semibold text-[#EF4444] py-2">
                    <LogOut size={14} /> {t("navLogout")}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
