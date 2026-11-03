/**
 * Page « Nos chauffeurs » — refonte UI/UX 2026.
 * Thème clair aligné sur l'accueil (charte vert/blanc), premium & moderne.
 * Vraies photos de l'équipe (badges SAVER recadrés) + vraies photos de la flotte.
 * Aucune donnée inventée : seuls nom + rôle réels sont affichés par chauffeur.
 */
import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { ShieldCheck, Gauge, UserCheck, BadgeCheck, MapPin, ArrowRight, PhoneCall, Leaf } from "lucide-react";
import { motion } from "motion/react";

import heroImg from "../assets/saver/fleet-09.jpg";
import showcaseImg from "../assets/saver/fleet-13.jpg";
import jacquesImg from "../assets/saver/chauffeur-jacques.jpg";
import yeoImg from "../assets/saver/chauffeur-yeo.jpg";
import traoreImg from "../assets/saver/chauffeur-traore.jpg";

const GREEN = "#00C853";
const INK = "#0B1F14";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6 },
};

interface Driver {
  id: string;
  name: string;
  photo: string;
}

export const NosChauffeurs: React.FC<{ id: string }> = ({ id }) => {
  const { translate } = useLanguage();

  const drivers: Driver[] = [
    { id: "drv_jacques", name: "Gbemonto Jacques", photo: jacquesImg },
    { id: "drv_yeo", name: "Yeo Navigue Abou", photo: yeoImg },
    { id: "drv_traore", name: "Traore Abdoul", photo: traoreImg },
  ];

  const values = [
    {
      icon: <UserCheck size={22} />,
      t: translate({ fr: "Chauffeurs vérifiés", en: "Verified chauffeurs" }),
      d: translate({
        fr: "Chaque chauffeur EASY est formé, identifié et porteur d'un badge officiel SAVER.",
        en: "Every EASY chauffeur is trained, identified and carries an official SAVER badge.",
      }),
    },
    {
      icon: <Gauge size={22} />,
      t: translate({ fr: "Suivi en temps réel", en: "Real-time tracking" }),
      d: translate({
        fr: "Position du chauffeur et état de la course suivis en direct, pour une sérénité totale.",
        en: "Driver location and ride status tracked live, for total peace of mind.",
      }),
    },
    {
      icon: <ShieldCheck size={22} />,
      t: translate({ fr: "Sécurité & discrétion", en: "Safety & discretion" }),
      d: translate({
        fr: "Conduite défensive, ponctualité et confidentialité à chaque trajet.",
        en: "Defensive driving, punctuality and confidentiality on every trip.",
      }),
    },
  ];

  return (
    <div id={id} className="bg-white text-[#0B1F14] font-sans -mt-[69px] lg:-mt-[81px]">
      {/* ====================== HERO ====================== */}
      <section className="relative min-h-[78vh] flex items-end overflow-hidden">
        <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(5,20,12,0.85) 0%, rgba(5,20,12,0.55) 45%, rgba(5,20,12,0.15) 100%)" }}
        />
        <div className="relative z-10 max-w-6xl mx-auto w-full px-6 lg:px-8 pb-16 pt-28">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-xl backdrop-saturate-150 px-4 py-1.5 ring-1 ring-white/20"
          >
            <ShieldCheck size={14} className="text-white" />
            <span className="text-[11px] font-semibold tracking-[0.15em] text-white uppercase">
              {translate({ fr: "Une équipe, pas des inconnus", en: "A team, not strangers" })}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-5 max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05]"
          >
            {translate({ fr: "Nos chauffeurs", en: "Our chauffeurs" })}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-4 max-w-2xl text-base sm:text-lg text-white/85 leading-relaxed"
          >
            {translate({
              fr: "Des professionnels formés et identifiés, au volant d'une flotte 100 % électrique. Ponctualité, sécurité et discrétion à chaque trajet dans Abidjan.",
              en: "Trained, identified professionals driving a 100% electric fleet. Punctuality, safety and discretion on every trip across Abidjan.",
            })}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-7 flex flex-col sm:flex-row gap-3"
          >
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-[#06140D] shadow-lg transition-transform active:scale-[0.98]"
              style={{ background: GREEN }}
            >
              <PhoneCall size={18} /> {translate({ fr: "Nous contacter", en: "Contact us" })}
            </a>
            <a
              href="#reservation"
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white ring-1 ring-white/40 hover:bg-white/10 transition-colors"
            >
              {translate({ fr: "Réserver une course", en: "Book a ride" })} <ArrowRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ====================== VALEURS ====================== */}
      <section className="bg-[#F4F8F5]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fade} className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {translate({ fr: "Une conduite à la hauteur de la marque.", en: "Driving worthy of the brand." })}
            </h2>
            <p className="mt-3 text-[#5B6B62] text-lg">
              {translate({ fr: "Formés, identifiés et suivis — pour que chaque course inspire confiance.", en: "Trained, identified and monitored — so every ride inspires trust." })}
            </p>
          </motion.div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {values.map((v, i) => (
              <motion.div
                key={v.t}
                {...fade}
                transition={{ ...fade.transition, delay: i * 0.08 }}
                className="rounded-2xl bg-white p-6 ring-1 ring-[#E6EBE8] shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:shadow-lg transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[#06140D]" style={{ background: GREEN }}>
                  {v.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold">{v.t}</h3>
                <p className="mt-2 text-sm text-[#5B6B62] leading-relaxed">{v.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== L'ÉQUIPE ====================== */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <motion.div {...fade} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: GREEN }}>
              <Leaf size={14} /> {translate({ fr: "L'ÉQUIPE EASY", en: "THE EASY TEAM" })}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              {translate({ fr: "Les visages au volant", en: "The faces behind the wheel" })}
            </h2>
            <p className="mt-3 text-[#5B6B62]">
              {translate({ fr: "Des chauffeurs de confiance, identifiés par un badge officiel SAVER.", en: "Trusted chauffeurs, identified by an official SAVER badge." })}
            </p>
          </motion.div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((d, i) => (
              <motion.div
                key={d.id}
                {...fade}
                transition={{ ...fade.transition, delay: i * 0.08 }}
                className="group rounded-3xl bg-white ring-1 ring-[#E6EBE8] overflow-hidden shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:shadow-xl transition-shadow"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-[#F4F8F5]">
                  <img
                    src={d.photo}
                    alt={d.name}
                    className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-[#06140D] ring-1 ring-black/5">
                    <BadgeCheck size={13} style={{ color: GREEN }} /> {translate({ fr: "Vérifié", en: "Verified" })}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold leading-tight">{d.name}</h3>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm text-[#5B6B62]">{translate({ fr: "Chauffeur", en: "Chauffeur" })}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#5B6B62]">
                      <MapPin size={13} style={{ color: GREEN }} /> Abidjan
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== SHOWCASE (sécurité / confort) ====================== */}
      <section className="bg-[#F4F8F5]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div {...fade} className="relative order-2 lg:order-1">
            <img src={showcaseImg} alt="" className="rounded-3xl w-full object-cover aspect-[4/3] shadow-xl" />
          </motion.div>
          <motion.div {...fade} className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: GREEN }}>
              <ShieldCheck size={14} /> {translate({ fr: "SÉRÉNITÉ GARANTIE", en: "GUARANTEED SERENITY" })}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              {translate({ fr: "Des trajets sûrs, silencieux et ponctuels.", en: "Safe, silent and punctual rides." })}
            </h2>
            <p className="mt-4 text-[#5B6B62] text-lg leading-relaxed">
              {translate({
                fr: "Nos chauffeurs maîtrisent les voies d'Abidjan et la conduite défensive. Au volant de véhicules 100 % électriques, ils vous offrent un confort absolu, sans bruit ni émission.",
                en: "Our chauffeurs master Abidjan's roads and defensive driving. Behind the wheel of 100% electric vehicles, they deliver absolute comfort, with no noise or emissions.",
              })}
            </p>
            <ul className="mt-6 space-y-3">
              {[
                translate({ fr: "Chauffeurs identifiés par badge officiel", en: "Chauffeurs identified by official badge" }),
                translate({ fr: "Suivi GPS et statut de course en direct", en: "Live GPS tracking and ride status" }),
                translate({ fr: "Discrétion et courtoisie garanties", en: "Guaranteed discretion and courtesy" }),
              ].map((x) => (
                <li key={x} className="flex items-center gap-3 text-[#0B1F14]">
                  <BadgeCheck size={18} style={{ color: GREEN }} className="shrink-0" />
                  <span className="text-sm">{x}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ====================== CTA ====================== */}
      <section style={{ background: INK }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-20 text-center">
          <motion.h2 {...fade} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {translate({ fr: "Besoin d'un chauffeur de confiance ?", en: "Need a trusted chauffeur?" })}
          </motion.h2>
          <motion.p {...fade} className="mt-3 text-white/70 text-lg">
            {translate({ fr: "Réservez votre course ou parlez-nous de vos besoins.", en: "Book your ride or tell us about your needs." })}
          </motion.p>
          <motion.div {...fade} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#reservation"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-[#06140D] shadow-lg transition-transform active:scale-[0.98]"
              style={{ background: GREEN }}
            >
              {translate({ fr: "Réserver une course", en: "Book a ride" })} <ArrowRight size={16} />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/10 transition-colors"
            >
              <PhoneCall size={18} /> {translate({ fr: "Nous contacter", en: "Contact us" })}
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
