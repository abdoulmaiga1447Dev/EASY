/**
 * Banc de test : lecture du % de batterie par Gemini sur un dossier de photos.
 *   npx tsx scripts/test-ia-batterie.ts <dossier>            (dossier/images/*.jpg + dossier/attendus.json)
 *   npx tsx scripts/test-ia-batterie.ts --modeles            (liste les modèles disponibles pour la clé)
 * Variables : GEMINI_API_KEY (obligatoire), GEMINI_MODEL (facultatif), PAUSE_MS (défaut 4500, quota gratuit).
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { lireBatterie, interpreterBatterie, listerModeles, iaConfiguree, MODELE_PAR_DEFAUT } from "../lib/ia";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!iaConfiguree()) { console.error("GEMINI_API_KEY absente du fichier .env"); process.exit(1); }
  if (process.argv[2] === "--modeles") { console.log((await listerModeles()).join("\n")); return; }

  const dossier = process.argv[2];
  if (!dossier) { console.error("Usage : npx tsx scripts/test-ia-batterie.ts <dossier>"); process.exit(1); }
  const attendus = JSON.parse(fs.readFileSync(path.join(dossier, "attendus.json"), "utf8"));
  const images = Object.keys(attendus).filter((k) => !k.startsWith("_"));
  const pauseMs = Number(process.env.PAUSE_MS || 4500);
  console.log(`Modèle : ${process.env.GEMINI_MODEL || MODELE_PAR_DEFAUT} — ${images.length} photos\n`);

  const resultats: any[] = [];
  let socJustes = 0, tableauJustes = 0, erreurs = 0;
  for (const [i, nom] of images.entries()) {
    const att = attendus[nom];
    const fichier = path.join(dossier, "images", nom);
    try {
      const { resultat: l, dureeMs, jetons, modele, essais } = await lireBatterie(fs.readFileSync(fichier), "image/jpeg");
      const d = interpreterBatterie(l);
      const socOk = att.soc === null ? (l.pourcentage_affiche === false || l.soc_pourcentage === null) : l.soc_pourcentage === att.soc;
      const tabOk = l.est_tableau_de_bord === att.tableau;
      socJustes += socOk ? 1 : 0; tableauJustes += tabOk ? 1 : 0;
      console.log(`${socOk ? "✔" : "✘"} ${nom.padEnd(28)} attendu ${String(att.soc ?? "—").padStart(4)} | lu ${String(l.soc_pourcentage ?? "—").padStart(4)}`
        + ` (barres ${l.soc_estime_barres ?? "—"}, conf ${l.confiance.toFixed(2)}) | tableau ${l.est_tableau_de_bord ? "oui" : "non"}${tabOk ? "" : " ✘"}`
        + ` | ${dureeMs} ms${jetons ? `, ${jetons} jetons` : ""} | ${modele}${essais > 1 ? ` (${essais} essais)` : ""}\n    → ${d.message}  [IA : ${l.remarque}]`);
      resultats.push({ nom, attendu: att, lecture: l, decision: d, dureeMs, modele, essais });
    } catch (e: any) {
      erreurs++;
      console.log(`! ${nom.padEnd(28)} ERREUR : ${e.message}`);
      resultats.push({ nom, attendu: att, erreur: e.message });
      // Modèle introuvable / clé refusée : inutile de continuer.
      if ([400, 401, 403, 404].includes(e?.statut)) { console.log("Arrêt : erreur de configuration (modèle ou clé)."); break; }
    }
    if (i < images.length - 1) await pause(pauseMs);
  }
  const n = images.length - erreurs;
  console.log(`\nNiveau de batterie correct : ${socJustes}/${n}   —   « est un tableau de bord » correct : ${tableauJustes}/${n}${erreurs ? `   —   erreurs : ${erreurs}` : ""}`);
  fs.writeFileSync(path.join(dossier, `resultats-${Date.now()}.json`), JSON.stringify(resultats, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
