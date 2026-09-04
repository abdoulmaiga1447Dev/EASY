/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SegmentProvider, useSegment } from "./context/SegmentContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Vehicules } from "./pages/Vehicules";
import { NosChauffeurs } from "./pages/NosChauffeurs";
import { Tarifs } from "./pages/Tarifs";
import { Contact } from "./pages/Contact";
import { AuthConnexion } from "./pages/AuthConnexion";
import { AuthInscription } from "./pages/AuthInscription";
import { AuthForgot } from "./pages/AuthForgot";
import { Reservation } from "./pages/Reservation";
import { Devis } from "./pages/Devis";
import { Chauffeur } from "./pages/Chauffeur";
import { Suivi } from "./pages/Suivi";
import { Partenaire } from "./pages/Partenaire";
import { Corporate } from "./pages/Corporate";
import { Admin } from "./pages/Admin";
import { RapportEcologique } from "./pages/RapportEcologique";
import { Commandes } from "./pages/Commandes";
import { RbacProvider, FLEET_ROLE_CODES } from "./context/RbacContext";
import { FleetWorkspace } from "./pages/fleet/FleetWorkspace";
import { motion, AnimatePresence } from "motion/react";

// Liste unique des pages publiques autorisées dans l'URL (hash).
// (Corrige l'incohérence #2 : l'état initial et le gestionnaire hashchange
//  utilisaient deux listes divergentes, ce qui cassait la navigation vers #admin.)
const ALLOWED_PAGES = ["home", "vehicules", "nos-chauffeurs", "tarifs", "contact", "connexion", "inscription", "forgot", "reservation", "devis", "chauffeur", "partenaire", "corporate", "admin", "rapport-ecologique", "commandes"];

function MainAppApplet() {
  const { setSegment } = useSegment();
  const { isAuthenticated, user, isLoading } = useAuth();
  // Simple responsive state router synced with URL hashes for deep linking and navigation
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const hash = window.location.hash.replace("#", "");
    if (ALLOWED_PAGES.includes(hash) || hash.startsWith("suivi")) {
      return hash;
    }
    return "home";
  });

  // Automatically update segment based on current page
  useEffect(() => {
    // Current pages are all public, premium pages (hotels, corporate, diplomatie, devis) will be built later.
    const premiumPages = ["hotels", "corporate", "diplomatie", "devis", "partenaire"];
    if (premiumPages.includes(currentPage)) {
      setSegment("premium");
    } else {
      setSegment("public");
    }
  }, [currentPage, setSegment]);

  // Sync hash state with window history changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (ALLOWED_PAGES.includes(hash) || hash.startsWith("suivi")) {
        setCurrentPage(hash);
      } else {
        setCurrentPage("home");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Update hash when page state changes
  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  // Automatically redirect authenticated professional users to their space if on generic entry points
  useEffect(() => {
    if (isLoading) return;

    // Les profils SAVER Fleet Ops ont leur propre espace : pas de redirection legacy.
    if (isAuthenticated && user && FLEET_ROLE_CODES.includes(user.role)) return;

    if (isAuthenticated && user) {
      const publicLandingPages = ["home", "connexion", "inscription", "forgot", "tarifs", "vehicules", "devis", "contact", "rapport-ecologique"];
      if (publicLandingPages.includes(currentPage)) {
        if (user.role === "corporate") {
          handlePageChange("corporate");
        } else if (user.role === "partenaire") {
          handlePageChange("partenaire");
        } else if (user.role === "chauffeur") {
          handlePageChange("chauffeur");
        } else if (user.role === "admin") {
          handlePageChange("admin");
        }
      }
    }
  }, [isAuthenticated, user, isLoading, currentPage]);

  // Render respective page
  const renderPage = () => {
    if (currentPage.startsWith("suivi")) {
      const resId = currentPage.split("/")[1] || "";
      return <Suivi setCurrentPage={handlePageChange} reservationId={resId} id="page_suivi_component" />;
    }

    switch (currentPage) {
      case "home":
        return <Home setCurrentPage={handlePageChange} id="page_home_component" />;
      case "vehicules":
        return <Vehicules setCurrentPage={handlePageChange} id="page_vehicules_component" />;
      case "nos-chauffeurs":
        return <NosChauffeurs id="page_nos_chauffeurs_component" />;
      case "tarifs":
        return <Tarifs setCurrentPage={handlePageChange} id="page_tarifs_component" />;
      case "contact":
        return <Contact id="page_contact_component" />;
      case "connexion":
        return <AuthConnexion setCurrentPage={handlePageChange} id="page_connexion_component" />;
      case "inscription":
        return <AuthInscription setCurrentPage={handlePageChange} id="page_inscription_component" />;
      case "forgot":
        return <AuthForgot setCurrentPage={handlePageChange} id="page_forgot_component" />;
      case "reservation":
        return <Reservation setCurrentPage={handlePageChange} id="page_reservation_component" />;
      case "commandes":
        return <Commandes setCurrentPage={handlePageChange} />;
      case "devis":
        return <Devis setCurrentPage={handlePageChange} id="page_devis_component" />;
      case "chauffeur":
        return <Chauffeur setCurrentPage={handlePageChange} id="page_chauffeur_component" />;
      case "partenaire":
        return <Partenaire setCurrentPage={handlePageChange} id="page_partenaire_component" />;
      case "corporate":
        return <Corporate setCurrentPage={handlePageChange} id="page_corporate_component" />;
      case "admin":
        return <Admin setCurrentPage={handlePageChange} />;
      case "rapport-ecologique":
        return <RapportEcologique setCurrentPage={handlePageChange} id="page_rapport_ecologique_component" />;
      default:
        return <Home setCurrentPage={handlePageChange} id="page_home_fallback" />;
    }
  };

  // Aiguillage SAVER Fleet Ops : les profils internes/externes ont leur propre espace.
  if (isAuthenticated && user && FLEET_ROLE_CODES.includes(user.role)) {
    return <FleetWorkspace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-dark text-white-premium font-sans overflow-x-hidden selection:bg-gold/30 selection:text-white-premium">
      {/* Navigation Header */}
      <Navbar currentPage={currentPage} setCurrentPage={handlePageChange} id="app_primary_navbar" />

      {/* Main Pages viewport with smooth fading slide transitions */}
      <main className="flex-grow pt-[69px] lg:pt-[81px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Primary Dispatch Center Info / Footer */}
      <Footer setCurrentPage={handlePageChange} id="app_primary_footer" />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <SegmentProvider>
        <AuthProvider>
          <RbacProvider>
            <MainAppApplet />
          </RbacProvider>
        </AuthProvider>
      </SegmentProvider>
    </LanguageProvider>
  );
}
