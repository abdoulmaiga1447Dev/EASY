import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, CheckCircle } from "lucide-react";
import DotField from "../components/DotField";

interface ContactProps {
  id: string;
}

export const Contact: React.FC<ContactProps> = ({ id }) => {
  const { t, translate } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
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

    // Dynamic mock api send
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setFormData({ name: "", email: "", message: "" });
    }, 1200);
  };

  return (
    <div id={id} className="min-h-screen bg-black py-20 px-4 relative overflow-hidden">
      
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
          gradientFrom="#84CC16"
          gradientTo="#B497CF"
          glowColor="#120F17"
        />
        {/* Soft vignette to blend content legibility */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Underlines */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-gold-light text-center">
            {translate({ fr: "RÉSERVATION & ASSISTANCE", en: "RESERVATIONS & ASSISTANCE" })}
          </span>
          <h1 className="text-3xl md:text-5xl font-sans font-bold text-white-premium tracking-tight mt-3">
            {t("contactTitle")}
          </h1>
          <p className="text-sm text-muted-premium mt-4">
            {t("contactSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* 1. CONTACT INFORMATIONS & CORPORATE ADDRESS */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card id="info_card_top" className="flex flex-col gap-6 bg-white/5 backdrop-blur-xl border-gold-light/20 shadow-2xl p-8 rounded-2xl" glow={true}>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-gold-light block mb-3">
                  {translate({ fr: "SIÈGE SOCIAL & ADRESSE", en: "REGISTERED OFFICE & ADDRESS" })}
                </span>
                <h3 className="text-xl font-sans font-semibold text-white">
                  EASY — By Saver
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5 text-xs">
                  <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold-light/20 flex items-center justify-center text-gold-light mt-1 shrink-0">
                    <MapPin size={15} />
                  </div>
                  <div>
                    <span className="text-white font-semibold block">{t("contactAddressTitle")}</span>
                    <span className="text-neutral-300 block mt-1 leading-relaxed">
                      Immeuble Trade Center, CC02 Avenue Chardy, Plateau, Abidjan, Côte d'Ivoire
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 text-xs">
                  <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold-light/20 flex items-center justify-center text-gold-light mt-1 shrink-0">
                    <Phone size={15} />
                  </div>
                  <div>
                    <span className="text-white font-semibold block">
                      {translate({ fr: "Contact Téléphonique Office", en: "Office Hotline Contact" })}
                    </span>
                    <span className="text-neutral-300 block mt-1">+225 07 00 01 02 03</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 text-xs">
                  <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold-light/20 flex items-center justify-center text-gold-light mt-1 shrink-0">
                    <Mail size={15} />
                  </div>
                  <div>
                    <span className="text-white font-semibold block">
                      {translate({ fr: "Courriel Officiel", en: "Official Direct Email" })}
                    </span>
                    <span className="text-neutral-300 block mt-1">booking@easy-saver.ci</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 text-xs">
                  <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold-light/20 flex items-center justify-center text-gold-light mt-1 shrink-0">
                    <Clock size={15} />
                  </div>
                  <div>
                    <span className="text-white font-semibold block">{t("contactScheduleTitle")}</span>
                    <span className="text-neutral-300 block mt-1">{t("contactScheduleDesc")}</span>
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp Call */}
              <div className="pt-4 border-t border-gold-light/10">
                <p className="text-[11px] text-neutral-300 mb-3">
                  {translate({
                    fr: "Besoin d'une réponse instantanée d'un de nos conseillers ?",
                    en: "Need an immediate answer from our chat specialists?"
                  })}
                </p>
                
                {/* Standard WhatsApp dynamic anchor link */}
                <a
                  id="direct_whatsapp_accent"
                  href="https://wa.me/2250700010203?text=Bonjour,%20je%20souhaite%20réserver%20un%20véhicule%20EASY"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white bg-emerald-600 font-medium hover:bg-emerald-700 shadow-sm transition-all duration-150 text-xs active:translate-y-[1px]"
                >
                  <MessageCircle size={16} />
                  {t("contactWhatsAppBtn")}
                </a>
              </div>
            </Card>
          </div>

          {/* 2. CONTACT REQUEST FORM */}
          <div className="lg:col-span-7">
            <Card id="form_card" className="p-8 bg-white/5 backdrop-blur-xl border-gold-light/20 shadow-2xl rounded-2xl">
              <h3 className="text-xl font-sans font-semibold text-white mb-6">
                {translate({ fr: "Envoyer une demande d'informations", en: "Submit an Information Request" })}
              </h3>

              {isSuccess ? (
                <div id="contact_success_banner" className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center text-emerald-400">
                  <CheckCircle size={36} className="mx-auto mb-3" />
                  <p className="text-sm font-semibold">{t("contactSuccess")}</p>
                  <Button
                    id="contact_send_again_btn"
                    variant="outline"
                    onClick={() => setIsSuccess(false)}
                    className="mt-4 px-4 py-2 text-xs"
                  >
                    {translate({ fr: "Nouveau message", en: "New message" })}
                  </Button>
                </div>
              ) : (
                <form id="contact_actual_form" onSubmit={handleSubmit} className="space-y-5" noValidate>
                  
                  {/* Local error banner */}
                  {errorLocal && (
                    <div id="contact_error_banner" className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
                      {errorLocal}
                    </div>
                  )}
                  
                  {/* Name field */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="contact_name" className="text-xs font-mono text-neutral-300 uppercase">
                      {t("contactLabelName")} *
                    </label>
                    <input
                      type="text"
                      id="contact_name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder={translate({ fr: "Ex: Jean Koffi", en: "e.g., John Doe" })}
                      className="bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                    />
                  </div>

                  {/* Email field */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="contact_email" className="text-xs font-mono text-neutral-300 uppercase">
                      {t("contactLabelEmail")} *
                    </label>
                    <input
                      type="email"
                      id="contact_email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder={translate({ fr: "Ex: jean.koffi@gmail.com", en: "e.g., john.doe@example.com" })}
                      className="bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                    />
                  </div>

                  {/* Message field */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="contact_message" className="text-xs font-mono text-neutral-300 uppercase">
                      {t("contactLabelMessage")} *
                    </label>
                    <textarea
                      id="contact_message"
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder={translate({
                        fr: "Ex : Transfert hebdomadaire à l'Aéroport FHB pour nos cadres, majoritairement de nuit...",
                        en: "e.g., Weekly pickup at FHB Airport for our corporate travelers, mostly late night..."
                      })}
                      className="bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors resize-none"
                    ></textarea>
                  </div>

                  {/* Button Submission */}
                  <Button
                    id="contact_submit_btn"
                    variant="primary"
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 rounded-xl py-3 text-xs tracking-wider uppercase font-bold"
                  >
                    {isLoading ? translate({ fr: "Envoi en cours...", en: "Sending message..." }) : t("contactSendBtn")}
                    <Send size={15} />
                  </Button>
                </form>
              )}
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
};
