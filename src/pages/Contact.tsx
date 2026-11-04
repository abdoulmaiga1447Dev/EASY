/**
 * Page « Contact » — refonte UI/UX 2026.
 * Thème clair (charte vert/blanc), 2 colonnes : infos + actions + formulaire
 * à gauche, illustration à droite. Coordonnées et formulaire conservés.
 */
import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, CheckCircle, PhoneCall, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import illu from "../assets/saver/contact-illustration.jpg";

const GREEN = "#00C853";
const INK = "#0B1F14";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6 },
};

interface ContactProps {
  id: string;
}

export const Contact: React.FC<ContactProps> = ({ id }) => {
  const { t, translate } = useLanguage();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);
    if (!formData.name || !formData.email || !formData.message) {
      setErrorLocal(translate({ fr: "Tous les champs sont requis.", en: "All fields are required." }));
      return;
    }
    setIsLoading(true);
    console.log("Submitting contact requests payload:", formData);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setFormData({ name: "", email: "", message: "" });
    }, 1200);
  };

  const inputCls =
    "w-full rounded-xl bg-[#F4F8F5] border border-[#E6EBE8] focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/20 rounded-xl p-3 text-sm text-[#0B1F14] placeholder-[#9BA8A0] outline-none transition-colors";

  return (
    <div id={id} className="relative overflow-hidden bg-white text-[#0B1F14] font-sans">
      {/* décor doux */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(0,200,83,0.12), transparent)" }} />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(255,122,26,0.10), transparent)" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-start">
        {/* ====== COLONNE GAUCHE ====== */}
        <div>
          <motion.span {...fade} className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: GREEN }}>
            <MessageCircle size={14} /> {translate({ fr: "RÉSERVATION & ASSISTANCE", en: "RESERVATIONS & ASSISTANCE" })}
          </motion.span>
          <motion.h1 {...fade} className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
            {t("contactTitle")}
          </motion.h1>
          <motion.p {...fade} className="mt-4 text-[#5B6B62] text-lg leading-relaxed max-w-xl">
            {t("contactSubtitle")}
          </motion.p>

          {/* Actions rapides */}
          <motion.div {...fade} className="mt-7 grid sm:grid-cols-2 gap-3">
            <a
              href="https://wa.me/2250797139787?text=Bonjour,%20je%20souhaite%20réserver%20un%20véhicule%20EASY"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-[#06140D] shadow-sm transition-transform active:scale-[0.98]"
              style={{ background: GREEN }}
            >
              <MessageCircle size={17} /> {translate({ fr: "Via WhatsApp", en: "Via WhatsApp" })}
            </a>
            <a
              href="tel:+2250170083681"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
              style={{ background: INK }}
            >
              <PhoneCall size={17} /> {translate({ fr: "Via appel", en: "Via call" })}
            </a>
          </motion.div>
          <motion.a
            {...fade}
            href="#contact_form"
            onClick={() => document.getElementById("contact_form")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-[#0B1F14] ring-1 ring-[#D7E0DA] hover:bg-[#F4F8F5] transition-colors"
          >
            <Mail size={17} style={{ color: GREEN }} /> {translate({ fr: "Via formulaire e-mail", en: "Via email form" })}
          </motion.a>

          {/* Formulaire */}
          <motion.div {...fade} id="contact_form" className="mt-8 rounded-3xl bg-white ring-1 ring-[#E6EBE8] shadow-[0_1px_0_rgba(0,0,0,0.02)] p-6 sm:p-8">
            <h3 className="text-lg font-bold">{translate({ fr: "Envoyer une demande", en: "Send a request" })}</h3>

            {isSuccess ? (
              <div className="mt-5 rounded-2xl bg-[#00C853]/10 ring-1 ring-[#00C853]/30 p-6 text-center">
                <CheckCircle size={36} className="mx-auto mb-3" style={{ color: GREEN }} />
                <p className="text-sm font-semibold text-[#0B1F14]">{t("contactSuccess")}</p>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[#0B1F14] ring-1 ring-[#D7E0DA] hover:bg-[#F4F8F5]"
                >
                  {translate({ fr: "Nouveau message", en: "New message" })}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                {errorLocal && (
                  <div className="rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-xs text-red-600">{errorLocal}</div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact_name" className="text-xs font-semibold text-[#5B6B62] uppercase tracking-wide">{t("contactLabelName")} *</label>
                  <input id="contact_name" name="name" type="text" value={formData.name} onChange={handleChange} required
                    placeholder={translate({ fr: "Ex : Jean Koffi", en: "e.g., John Doe" })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact_email" className="text-xs font-semibold text-[#5B6B62] uppercase tracking-wide">{t("contactLabelEmail")} *</label>
                  <input id="contact_email" name="email" type="email" value={formData.email} onChange={handleChange} required
                    placeholder={translate({ fr: "Ex : jean.koffi@gmail.com", en: "e.g., john.doe@example.com" })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact_message" className="text-xs font-semibold text-[#5B6B62] uppercase tracking-wide">{t("contactLabelMessage")} *</label>
                  <textarea id="contact_message" name="message" rows={5} value={formData.message} onChange={handleChange} required
                    placeholder={translate({ fr: "Ex : Transfert hebdomadaire à l'Aéroport FHB pour nos cadres, majoritairement de nuit...", en: "e.g., Weekly pickup at FHB Airport for our corporate travelers, mostly late night..." })}
                    className={`${inputCls} resize-none`} />
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-[#06140D] shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
                  style={{ background: GREEN }}>
                  {isLoading ? translate({ fr: "Envoi en cours...", en: "Sending message..." }) : t("contactSendBtn")}
                  <Send size={15} />
                </button>
              </form>
            )}
          </motion.div>

          {/* Coordonnées */}
          <motion.div {...fade} className="mt-8 grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(0,200,83,0.12)" }}><MapPin size={16} style={{ color: GREEN }} /></span>
              <div>
                <div className="font-semibold">{t("contactAddressTitle")}</div>
                <div className="text-[#5B6B62]">Cocody Angré CNPS, Cité Star 12, Abidjan</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(0,200,83,0.12)" }}><Phone size={16} style={{ color: GREEN }} /></span>
              <div>
                <div className="font-semibold">+225 01 70 08 36 81</div>
                <div className="text-[#5B6B62]">+225 07 97 13 97 87 · WhatsApp</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(0,200,83,0.12)" }}><Mail size={16} style={{ color: GREEN }} /></span>
              <div>
                <div className="font-semibold">booking@easy-saver.ci</div>
                <div className="text-[#5B6B62]">{translate({ fr: "Courriel officiel", en: "Official email" })}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(0,200,83,0.12)" }}><Clock size={16} style={{ color: GREEN }} /></span>
              <div>
                <div className="font-semibold">{t("contactScheduleTitle")}</div>
                <div className="text-[#5B6B62]">{t("contactScheduleDesc")}</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ====== COLONNE DROITE (illustration) ====== */}
        <motion.div {...fade} className="hidden lg:block lg:sticky lg:top-28">
          <div className="relative rounded-3xl overflow-hidden bg-[#F4F8F5] ring-1 ring-[#E6EBE8]">
            <img src={illu} alt="Contactez l'équipe EASY" className="w-full h-auto object-cover" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#5B6B62]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F8F5] px-3 py-1.5 ring-1 ring-[#E6EBE8] font-semibold text-[#0B1F14]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} /> {translate({ fr: "Réponse rapide, 7j/7", en: "Fast reply, 7 days a week" })}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
