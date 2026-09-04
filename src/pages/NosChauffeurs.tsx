import React from "react";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { useLanguage } from "../context/LanguageContext";
import { 
  Star, 
  Shield, 
  Award, 
  Sparkles, 
  Navigation, 
  UserCheck, 
  ShieldCheck, 
  CheckCircle2, 
  Coins, 
  ChevronRight 
} from "lucide-react";
import { motion } from "motion/react";

// Import generated images
import chauffeurHeroImg from "../assets/images/chauffeur_hero_1782312254137.jpg";
import chauffeurPassengerImg from "../assets/images/chauffeur_passenger_1782312271700.jpg";

interface DriverProfile {
  id: string;
  name: string;
  photo: string;
  role: string;
  rating: number;
  skills: string[];
  bio: string;
  review: {
    text: string;
    author: string;
    company?: string;
  };
}

export const NosChauffeurs: React.FC<{ id: string }> = ({ id }) => {
  const { translate } = useLanguage();

  const drivers: DriverProfile[] = [
    {
      id: "drv_1",
      name: "Jean Koffi",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop",
      role: translate({ fr: "Chauffeur d'Élite Privé", en: "Elite Private Chauffeur" }),
      rating: 5.0,
      skills: [
        translate({ fr: "Conduite Défensive", en: "Defensive Driving" }),
        translate({ fr: "Secourisme", en: "First Aid" }),
        translate({ fr: "Anglais de Protocole", en: "Protocol English" })
      ],
      bio: translate({
        fr: "Ancien conducteur de délégations officielles, Jean totalise 12 ans d'expérience. Reconnu pour sa parfaite maîtrise des voies d'Abidjan et son calme imperturbable.",
        en: "Former driver for official delegations, Jean has 12 years of experience. Known for his perfect mastery of Abidjan roads and imperturbable calm."
      }),
      review: {
        text: translate({
          fr: "Un service irréprochable sous la pluie torrentielle de la saison humide d'Abidjan. Jean a fait preuve d’une conduite préventive exceptionnelle. Une sérénité totale.",
          en: "Impeccable service under the torrential rain of Abidjan's wet season. Jean demonstrated exceptional preventive driving. Total peace of mind."
        }),
        author: translate({ fr: "M. Roland K. (Directeur d'Investissements)", en: "Mr. Roland K. (Investment Director)" })
      }
    },
    {
      id: "drv_2",
      name: "Ibrahim Coulibaly",
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&auto=format&fit=crop",
      role: translate({ fr: "Chauffeur Premium", en: "Premium Chauffeur" }),
      rating: 4.9,
      skills: [
        translate({ fr: "Gestion de Convoi", en: "Convoy Management" }),
        translate({ fr: "Conduite en Saison des Pluies", en: "Wet Season Driving" }),
        translate({ fr: "Protocole VIP", en: "VIP Protocol" })
      ],
      bio: translate({
        fr: "Spécialiste de la sécurité routière et breveté en conduite préventive avancée, Ibrahim assure des liaisons fluides et discrètes pour les comités d'administration.",
        en: "Road safety specialist and certified in advanced preventive driving, Ibrahim ensures smooth and discrete transit for corporate boards."
      }),
      review: {
        text: translate({
          fr: "Ibrahim incarne la discrétion et le professionnalisme. Sa capacité à anticiper les points de congestion et sa courtoisie font de chaque trajet un plaisir absolu.",
          en: "Ibrahim embodies discretion and professionalism. His ability to anticipate congestion points and his courtesy make every trip an absolute pleasure."
        }),
        author: translate({ fr: "Mme Sarah D. (Directrice Générale, Cabinet Conseil)", en: "Mrs. Sarah D. (Managing Director, Consulting Firm)" })
      }
    },
    {
      id: "drv_3",
      name: "Marc Yao",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop",
      role: translate({ fr: "Chauffeur Prestige Executive", en: "Prestige Executive Chauffeur" }),
      rating: 4.8,
      skills: [
        translate({ fr: "Chauffeur Protocolaire", en: "Protocol Chauffeur" }),
        translate({ fr: "Régulation Éco-Conduite", en: "Eco-Drive Regulation" }),
        translate({ fr: "Discrétion Absolue", en: "Absolute Discretion" })
      ],
      bio: translate({
        fr: "Marc Yao possède une formation d'excellence en accueil VIP de haut rang. Sa spécialité réside dans l'intégration silencieuse des trajets d'affaires d'élite.",
        en: "Marc Yao has top-tier training in high-ranking VIP hospitality. His specialty lies in the silent execution of elite business commutes."
      }),
      review: {
        text: translate({
          fr: "Marc a été d'un tact parfait lors de notre trajet vers Assinie. Costume impeccable, accueil chaleureux, et aucun bruit dans la berline électrique.",
          en: "Marc had perfect tact during our journey to Assinie. Impeccable suit, warm welcome, and no noise in the electric sedan."
        }),
        author: translate({ fr: "Dr. Armand B. (Président de Fondation)", en: "Dr. Armand B. (Foundation President)" })
      }
    }
  ];

  return (
    <div id={id} className="min-h-screen bg-black text-white relative">
      
      {/* 1. LARGE HERO COVER SECTION */}
      <section className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={chauffeurHeroImg} 
            alt="Executive Chauffeur" 
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 border border-gold-light/20 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full"
          >
            <ShieldCheck size={14} className="text-gold-light" />
            <span className="text-[10px] tracking-widest text-gold-light uppercase font-mono">
              {translate({ fr: "EASY VIP CHAUFFEURS ✦ L'EXCELLENCE SUR MESURE", en: "EASY VIP CHAUFFEURS ✦ TAILORED EXCELLENCE" })}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl md:text-6xl font-sans font-light tracking-tight text-white leading-tight"
          >
            {translate({ fr: "Services de Chauffeur de Prestige", en: "Executive Chauffeur Services" })} <br className="hidden md:inline" />
            <span className="text-gold-light font-normal">{translate({ fr: "pour Affaires & Loisirs", en: "for Business & Leisure" })}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-sm md:text-base text-neutral-300 font-light max-w-3xl mx-auto leading-relaxed"
          >
            {translate({
              fr: "Profitez des meilleurs services de chauffeur avec notre équipe de conducteurs chevronnés, dévoués à vous offrir un service exceptionnel, de la sécurité et une fiabilité absolue. Découvrez une sérénité totale à chaque trajet.",
              en: "Enjoy the finest chauffeur services with our team of experienced drivers, committed to delivering exceptional service, security, and absolute reliability. Experience total peace of mind on every journey."
            })}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="pt-4"
          >
            <a 
              href="#reservation" 
              className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-black font-extrabold text-xs uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg shadow-gold/10 transition-all duration-200"
            >
              {translate({ fr: "Contactez-Nous / Réserver", en: "Contact Us / Book Now" })}
              <ChevronRight size={14} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* 2. CHAUFFEUR CORE BENEFITS SECTION */}
      <section className="py-20 px-6 max-w-7xl mx-auto relative z-10 -mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-8 border border-neutral-800 bg-[#0A0A0F] rounded-2xl space-y-4 shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-gold-light/10 flex items-center justify-center text-gold-light border border-gold-light/20">
                <UserCheck size={20} />
              </div>
              <h3 className="font-sans font-bold text-white text-base tracking-wide">
                {translate({ fr: "Chauffeurs professionnels", en: "Professional Chauffeurs" })}
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                {translate({
                  fr: "Voyagez en toute confiance avec nos chauffeurs expérimentés qui vous offrent des services alliant qualité, fiabilité, discrétion, et bien plus encore.",
                  en: "Travel in complete confidence with our highly trained drivers who provide exceptional quality, absolute reliability, discretion, and more."
                })}
              </p>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="p-8 border border-neutral-800 bg-[#0A0A0F] rounded-2xl space-y-4 shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-gold-light/10 flex items-center justify-center text-gold-light border border-gold-light/20">
                <CheckCircle2 size={20} />
              </div>
              <h3 className="font-sans font-bold text-white text-base tracking-wide">
                {translate({ fr: "Fiabilité", en: "Reliability" })}
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                {translate({
                  fr: "Réservez avec certitude, puis restez informé grâce aux mises à jour en temps réel de l'état de la course et au suivi de la localisation du chauffeur.",
                  en: "Book with certainty, and stay updated with real-time status notifications and live driver location tracking."
                })}
              </p>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-8 border border-neutral-800 bg-[#0A0A0F] rounded-2xl space-y-4 shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-gold-light/10 flex items-center justify-center text-gold-light border border-gold-light/20">
                <Coins size={20} />
              </div>
              <h3 className="font-sans font-bold text-white text-base tracking-wide">
                {translate({ fr: "Prix compétitifs", en: "Competitive Prices" })}
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                {translate({
                  fr: "Accédez à un service haut de gamme à des prix basés sur la distance qui sont équitables pour vous et nos chauffeurs.",
                  en: "Access a high-end service at distance-based rates that are fair for both you and our drivers."
                })}
              </p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 3. SIDE BY SIDE INTRO SHOWCASE SECTION */}
      <section className="py-16 px-6 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl"
          >
            <img 
              src={chauffeurPassengerImg} 
              alt="Luxury Passenger Experience" 
              className="w-full h-full object-cover object-center max-h-[450px]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </motion.div>

          {/* Right: Text */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-1.5 border border-gold-light/10 bg-gold-light/5 px-3 py-1 rounded-full">
              <Award size={12} className="text-gold-light" />
              <span className="text-[9px] tracking-wider text-gold-light uppercase font-mono">
                {translate({ fr: "SÉCURITÉ & CONFIDENTIALITÉ", en: "SAFETY & PRIVACY" })}
              </span>
            </div>

            <h2 className="text-2xl md:text-4xl font-sans font-light tracking-tight text-white leading-snug">
              {translate({ fr: "Des trajets sûrs, privés, à la demande, ", en: "Safe, private rides on demand, " })}
              <span className="text-gold-light font-normal">{translate({ fr: "en quelques minutes", en: "in just minutes" })}</span>
            </h2>

            <p className="text-sm text-neutral-400 font-light leading-relaxed">
              {translate({
                fr: "À la recherche d'un moyen sûr pour vous déplacer en ville ? Essayez EASY, avec son service de chauffeur privé à la demande. Vous pouvez réserver notre service de transport premium, pour un pick-up immédiat ou planifié.",
                en: "Looking for a safe way to move around town? Try EASY, with its private on-demand chauffeur service. You can reserve our premium transport service for an immediate or planned pickup."
              })}
            </p>

            <p className="text-xs text-neutral-500 font-light leading-relaxed">
              {translate({
                fr: "Nos chauffeurs d'élite maîtrisent parfaitement les protocoles d'accueil et la conduite défensive avancée pour assurer une quiétude parfaite à chaque déplacement.",
                en: "Our elite drivers have perfect mastery of welcoming protocols and advanced defensive driving to ensure absolute tranquility on every trip."
              })}
            </p>

            <div className="pt-2">
              <a 
                href="#devis" 
                className="inline-flex items-center gap-1 text-xs font-mono text-gold-light hover:text-white transition-colors duration-200 uppercase tracking-wider"
              >
                {translate({ fr: "Estimer un tarif en ligne", en: "Estimate a rate online" })}
                <ChevronRight size={14} />
              </a>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 4. CHAUFFEURS PROFILES GRID */}
      <section className="py-20 px-6 max-w-7xl mx-auto relative z-10 border-t border-neutral-900">
        <div className="space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-[10px] tracking-[0.25em] text-gold-light uppercase font-mono block">
              {translate({ fr: "NOTRE ÉQUIPAGE D'ÉLITE", en: "OUR ELITE CREW" })}
            </span>
            <h2 className="text-3xl font-sans font-light text-white tracking-tight">
              {translate({ fr: "Découvrez la signature ", en: "Discover the signature " })}
              <span className="text-gold-light font-normal">{translate({ fr: "de nos chauffeurs", en: "of our chauffeurs" })}</span>
            </h2>
            <div className="w-16 h-0.5 bg-gold-light mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {drivers.map((drv) => (
              <Card 
                key={drv.id} 
                id={`driver_profile_card_${drv.id}`}
                className="border border-neutral-800 bg-[#07070B] rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between hover:border-neutral-700 transition-all duration-300"
              >
                <div>
                  {/* Driver Header Showcase photo */}
                  <div className="relative h-48 bg-neutral-950 overflow-hidden">
                    <img 
                      src={drv.photo} 
                      alt={drv.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07070B] via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                      <span className="text-[10px] font-mono text-gold-light uppercase tracking-wider block">
                        {translate({ fr: "CERTIFICATION EASY VIP", en: "EASY VIP CERTIFICATION" })}
                      </span>
                      <h3 className="text-lg font-bold text-white">{drv.name}</h3>
                    </div>
                  </div>

                  {/* Rating / Meta indicators */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-neutral-400">{drv.role}</span>
                      <div className="flex items-center gap-1 text-gold-light">
                        <Star size={12} className="fill-gold-light text-gold-light" />
                        <span className="text-xs font-mono font-bold">{drv.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 font-light leading-relaxed">
                      {drv.bio}
                    </p>

                    {/* Skill Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {drv.skills.map((skill) => (
                        <Badge id={`badge_skill_${drv.id}_${skill.replace(/\s+/g, '_')}`} key={skill} variant="slate" className="bg-neutral-900 border border-neutral-800 text-[9px] text-neutral-400 py-0.5 px-2">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Outstanding Client review block */}
                <div className="p-6 bg-black/60 border-t border-neutral-850 mt-auto">
                  <span className="text-[9px] font-mono tracking-widest text-gold-light block uppercase mb-1.5">
                    {translate({ fr: "AVIS CLIENT ACCRÉDITÉ", en: "ACCREDITED CLIENT REVIEW" })}
                  </span>
                  <p className="text-[11px] text-neutral-300 italic font-light leading-relaxed mb-2">
                    "{drv.review.text}"
                  </p>
                  <span className="text-[10px] font-mono text-neutral-500 block">
                    — {drv.review.author}
                  </span>
                </div>
              </Card>
            ))}
          </div>

        </div>
      </section>

    </div>
  );
};
