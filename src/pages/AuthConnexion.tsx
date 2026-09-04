import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useSegment } from "../context/SegmentContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ShieldAlert, Mail, Lock, CheckCircle2, User, Eye, EyeOff } from "lucide-react";
import DotField from "../components/DotField";

// @ts-ignore
import loginBg from "../assets/videos/login_bg.mp4";

const logoGreen = "/images/easy-logo-green.png";
const logoGold = "/images/easy-logo-gold.png";

interface AuthConnexionProps {
  setCurrentPage: (page: string) => void;
  id: string;
}

export const AuthConnexion: React.FC<AuthConnexionProps> = ({
  setCurrentPage,
  id
}) => {
  const { t, language } = useLanguage();
  const { login } = useAuth();
  const { segment } = useSegment();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!email || !password) {
      setErrorLocal(t("authRequiredErr"));
      return;
    }

    setIsLoading(true);
    console.log("Requesting login for email:", email);

    // Call authentication login context method
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        const role = result.user?.role;
        if (role === "corporate") {
          setCurrentPage("corporate");
        } else if (role === "partenaire") {
          setCurrentPage("partenaire");
        } else if (role === "chauffeur") {
          setCurrentPage("chauffeur");
        } else {
          setCurrentPage("home");
        }
      }, 1500);
    } else {
      setErrorLocal(result.error || "Une erreur est survenue");
    }
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

      <Card id="connexion_box" className="w-full max-w-md p-8 z-10 backdrop-blur-xl bg-white/5 border border-gold-light/20 relative rounded-2xl shadow-2xl" glow={true}>
        
        {/* Branding header */}
        <div className="text-center mb-8">
          <img
            src={segment === "public" ? logoGreen : logoGold}
            alt="EASY Logo"
            className="h-16 w-auto object-contain mx-auto mb-3"
            referrerPolicy="no-referrer"
          />
          <h2 className="text-xl md:text-2xl font-sans font-bold text-white-premium leading-snug">
            {t("authSignInTitle")}
          </h2>
          <p className="text-xs text-[#8A8A9A] mt-1.5">
            {t("authWelcomeTitle")} (By Saver)
          </p>
        </div>

        {/* Success Alert Banner */}
        {isSuccess ? (
          <div id="login_success_alert" className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-5 text-center text-emerald-400">
            <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={28} />
            <p className="text-sm font-semibold">Connexion réussie !</p>
            <p className="text-xs text-emerald-400/80 mt-1">Démarrage de votre session premium ...</p>
          </div>
        ) : (
          <form id="login_actual_form" onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Error local state display */}
            {errorLocal && (
              <div id="login_error_alert" className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 flex items-start gap-2">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                <span>{errorLocal}</span>
              </div>
            )}

            {/* Email Input Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login_email" className="text-xs font-mono text-neutral-300 uppercase tracking-wider">
                {t("authEmailLabel")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  id="login_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 pl-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div className="flex flex-[#d-col] gap-1.5 flex-col">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="login_password" className="font-mono text-neutral-300 uppercase tracking-wider">
                  {t("authPasswordLabel")}
                </label>
                <button
                  id="forgot_pwd_anchor"
                  type="button"
                  onClick={() => setCurrentPage("forgot")}
                  className="text-gold-light hover:underline font-medium cursor-pointer"
                >
                  Oublié ?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="login_password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black/60 border border-gold-light/10 focus:border-gold-light rounded-xl p-3 pl-10 pr-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                  required
                />
                <button
                  type="button"
                  id="toggle_login_pwd_visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Button submits */}
            <Button
              id="login_submit_button"
              variant="primary"
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 rounded-xl py-3 text-xs tracking-wider uppercase font-bold"
            >
              {isLoading ? (language === "fr" ? "Vérification..." : "Verifying...") : t("authActionSignIn")}
            </Button>

            {/* Alternative Register */}
            <div className="text-center pt-4 border-t border-gold-light/10 mt-6">
              <p className="text-xs text-neutral-300">
                {t("authNoAccount")}{" "}
                <button
                  id="go_register_btn"
                  type="button"
                  onClick={() => setCurrentPage("inscription")}
                  className="text-gold-light bold hover:underline cursor-pointer font-semibold ml-1"
                >
                  {t("navRegister")}
                </button>
              </p>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
