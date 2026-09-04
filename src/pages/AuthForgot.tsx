import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useSegment } from "../context/SegmentContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import DotField from "../components/DotField";

// @ts-ignore
import loginBg from "../assets/videos/login_bg.mp4";

const logoGreen = "/images/easy-logo-green.png";
const logoGold = "/images/easy-logo-gold.png";

interface AuthForgotProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

export const AuthForgot: React.FC<AuthForgotProps> = ({
  setCurrentPage,
  id
}) => {
  const { t, language } = useLanguage();
  const { segment } = useSegment();
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);
    if (!email) {
      setErrorLocal(language === "fr" ? "Votre adresse email est requise." : "Your email address is required.");
      return;
    }

    setIsLoading(true);
    console.log("Requesting password reset link for email:", email);

    // Simulated dispatch delay
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1200);
  };

  return (
    <div id={id} className="relative min-h-screen bg-black flex items-center justify-center py-24 px-4 overflow-hidden">
      
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
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      </div>

      <Card id="forgot_box" className="w-full max-w-md p-8 z-10 backdrop-blur-xl bg-white/5 border border-gold-light/20 relative rounded-2xl shadow-2xl" glow={true}>
        
        {/* Back control */}
        <button
          id="forgot_back_control"
          onClick={() => setCurrentPage("connexion")}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-gold-light mb-6 cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} />
          {t("authBackToLogin")}
        </button>

        {/* Header content */}
        <div className="mb-6 text-center">
          <img
            src={segment === "public" ? logoGreen : logoGold}
            alt="EASY Logo"
            className="h-16 w-auto object-contain mx-auto mb-4"
            referrerPolicy="no-referrer"
          />
          <h2 className="text-xl md:text-2xl font-sans font-bold text-white leading-tight">
            {t("authForgotTitle")}
          </h2>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            {t("authForgotDesc")} (By Saver)
          </p>
        </div>

        {isSuccess ? (
          <div id="forgot_success_alert" className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-5 text-center text-emerald-400">
            <CheckCircle2 className="mx-auto mb-3" size={32} />
            <p className="text-sm font-semibold">{t("authForgotSuccess")}</p>
            <p className="text-xs text-emerald-400/80 mt-2 leading-relaxed">
              Veuillez vérifier vos messages indésirables (Spams) si le message n'apparaît pas sous 2 minutes. Un lien d'expiration de 60 minutes y est associé.
            </p>
          </div>
        ) : (
          <form id="forgot_actual_form" onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Error display */}
            {errorLocal && (
              <div id="forgot_error_banner" className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
                {errorLocal}
              </div>
            )}
            
            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="forgot_email" className="text-xs font-mono text-neutral-300 uppercase tracking-wider">
                {t("authEmailLabel")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  id="forgot_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 pl-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Submission action */}
            <Button
              id="forgot_submit_button"
              variant="primary"
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 rounded-xl py-3 text-xs tracking-wider uppercase font-bold"
            >
              {isLoading ? (language === "fr" ? "Envoi du lien..." : "Sending link...") : t("authForgotBtn")}
            </Button>

          </form>
        )}
      </Card>
    </div>
  );
};
