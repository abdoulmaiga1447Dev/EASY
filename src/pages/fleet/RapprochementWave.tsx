/**
 * Rapprochement GUIDÉ des paiements de recharge avec l'historique Wave de l'entreprise (Finance).
 * Wave ne permet pas d'exporter l'historique : la Finance compare chaque paiement déclaré avec
 * l'application, puis saisit les paiements Wave qui n'ont aucune demande dans EASY.
 */
import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Smartphone } from "lucide-react";
import { api, type ApiError } from "../../api/fleet";
import { Btn, Panel, Field, Input, Spinner, EmptyState, AuthImage } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
type Notify = (t: ToastState) => void;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const fcfa = (n: number | null | undefined) => (n ?? 0).toLocaleString("fr-FR") + " F";
const jour = (d: string | Date) => new Date(d).toLocaleDateString("fr-FR");
const dateHeure = (d: string | Date) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Dernier jour inclus (la fin stockée est exclue). */
const dernierJour = (fin: string) => new Date(new Date(fin).getTime() - 86400000);

const GREEN = "#22C55E", RED = "#EF4444", AMBER = "#F59E0B";
const VERDICT: Record<string, { label: string; color: string }> = {
  CONFORME: { label: "Conforme", color: GREEN },
  MONTANT_DIFFERENT: { label: "Montant différent", color: AMBER },
  ABSENT: { label: "Absent de Wave", color: RED },
  NON_DECLARE: { label: "Sans demande", color: RED },
};

export const RapprochementWave: React.FC<{ notify: Notify }> = ({ notify }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [debut, setDebut] = useState(() => iso(new Date(Date.now() - 6 * 86400000)));
  const [fin, setFin] = useState(() => iso(new Date()));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const l = (await api.get<{ rapprochements: any[] }>("/api/fleet/rapprochements")).rapprochements;
      setList(l);
      const enCours = l.find((x) => x.statut === "EN_COURS");
      if (enCours) setSelId((s) => s ?? enCours.id);
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  }, [notify]);
  useEffect(() => { load(); }, [load]);

  const ouvrir = async () => {
    setBusy(true);
    try {
      const r = await api.post<any>("/api/fleet/rapprochements", { debut, fin });
      notify({ message: `${r.lignes.length} paiement(s) à vérifier`, kind: "ok" });
      setSelId(r.id); load();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  if (selId) return <Detail id={selId} notify={notify} onRetour={() => { setSelId(null); load(); }} />;

  const enCours = list.find((x) => x.statut === "EN_COURS");
  return (
    <div className="space-y-5 max-w-3xl">
      <Panel className="p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-[#EDEDED]">Rapprochement avec le compte Wave</h2>
          <p className="text-sm text-[#8A8A8A] mt-1">
            Comparez les paiements de recharge déclarés par le Superviseur avec l'historique de l'application Wave de l'entreprise.
            Tout paiement absent, différent ou non déclaré est remonté à la Direction.
          </p>
        </div>
        {enCours ? (
          <Btn onClick={() => setSelId(enCours.id)}>Reprendre le rapprochement en cours</Btn>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <Field label="Du"><Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} /></Field>
            <Field label="Au"><Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></Field>
            <Btn onClick={ouvrir} disabled={busy || !debut || !fin}>Commencer</Btn>
          </div>
        )}
      </Panel>

      {!!list.length && (
        <Panel className="overflow-hidden">
          <div className="px-5 py-3 text-xs uppercase tracking-wide text-[#8A8A8A] border-b border-[#232327]">Rapprochements</div>
          {list.map((x) => {
            const r = x.resumeCourant || {};
            return (
              <button key={x.id} onClick={() => setSelId(x.id)}
                className="w-full text-left px-5 py-3 border-t border-[#232327] first:border-t-0 hover:bg-[#18181B] normal-case! font-sans! tracking-normal! flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-[#EDEDED]">{jour(x.debut)} → {jour(dernierJour(x.fin))}</span>
                <span className="text-xs" style={{ color: x.statut === "EN_COURS" ? AMBER : r.ecarts ? RED : GREEN }}>
                  {x.statut === "EN_COURS" ? `En cours · ${r.verifies ?? 0}/${r.paiementsDeclares ?? 0} vérifiés` : r.ecarts ? `${r.ecarts} écart(s) · ${fcfa(r.ecart)}` : "Aucun écart"}
                </span>
              </button>
            );
          })}
        </Panel>
      )}
    </div>
  );
};

const Detail: React.FC<{ id: string; notify: Notify; onRetour: () => void }> = ({ id, notify, onRetour }) => {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [saisie, setSaisie] = useState<{ ligneId: string; verdict: string; valeur: string } | null>(null);
  const [ajout, setAjout] = useState<any | null>(null);

  const load = useCallback(async () => {
    try { setD(await api.get<any>(`/api/fleet/rapprochements/${id}`)); } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  }, [id, notify]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>, ok?: string) => {
    setBusy(true);
    try { setD(await fn()); if (ok) notify({ message: ok, kind: "ok" }); return true; }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); return false; } finally { setBusy(false); }
  };
  const verdict = (ligneId: string, body: any) => run(() => api.patch<any>(`/api/fleet/rapprochements/${id}/lignes/${ligneId}`, body)).then((ok) => ok && setSaisie(null));

  if (!d) return <Spinner />;
  const ouvert = d.statut === "EN_COURS";
  const r = ouvert ? d.resumeCourant : d.resume ?? d.resumeCourant;
  const declares = d.lignes.filter((l: any) => l.demandeId);
  const nonDeclares = d.lignes.filter((l: any) => !l.demandeId);

  return (
    <div className="space-y-4 max-w-4xl">
      <button onClick={onRetour} className="flex items-center gap-1 text-xs text-[#8A8A8A] hover:text-[#EDEDED] normal-case! font-sans! tracking-normal!"><ArrowLeft size={14} /> Rapprochements</button>

      <Panel className="p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-lg font-semibold text-[#EDEDED]">Rapprochement du {jour(d.debut)} au {jour(dernierJour(d.fin))}</div>
            <div className="text-sm text-[#8A8A8A]">
              {ouvert ? `Ouvert par ${d.creeParNom ?? "—"}` : `Clôturé par ${d.clotureParNom ?? "—"} le ${jour(d.clotureLe)}`}
            </div>
          </div>
          <div className="text-sm font-medium" style={{ color: ouvert ? AMBER : r.ecarts ? RED : GREEN }}>
            {ouvert ? `${r.verifies}/${r.paiementsDeclares} vérifiés` : r.ecarts ? `${r.ecarts} écart(s)` : "Aucun écart"}
          </div>
        </div>
        {ouvert && (
          <div className="border-l-2 border-[#F59E0B] bg-[#0F0F11] rounded-r-xl px-4 py-3 text-sm text-[#EDEDED] flex gap-3">
            <Smartphone size={18} className="text-[#F59E0B] shrink-0 mt-0.5" />
            <span>Ouvrez l'historique de l'application Wave de l'entreprise. Pour chaque paiement ci-dessous, retrouvez-le par son <b>ID de transaction</b> et indiquez ce que vous voyez. Ajoutez ensuite tout paiement Wave qui n'apparaît pas dans la liste.</span>
          </div>
        )}
      </Panel>

      {/* Paiements déclarés */}
      <Panel className="overflow-hidden">
        <div className="px-5 py-3 text-xs uppercase tracking-wide text-[#8A8A8A] border-b border-[#232327]">Paiements déclarés dans EASY ({declares.length})</div>
        {!declares.length ? <EmptyState>Aucun paiement déclaré sur cette période.</EmptyState> : declares.map((l: any) => {
          const p = l.paiement || {};
          const v = l.verdict ? VERDICT[l.verdict] : null;
          const enSaisie = saisie?.ligneId === l.id;
          return (
            <div key={l.id} className="px-5 py-4 border-t border-[#232327] first:border-t-0 border-l-2" style={{ borderLeftColor: v ? v.color : "transparent" }}>
              <div className="flex flex-col sm:flex-row gap-4">
                {p.preuvePaiementMediaId && <AuthImage mediaId={p.preuvePaiementMediaId} className="w-20 h-28 rounded-lg shrink-0" zoomable />}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-lg font-semibold text-[#EDEDED]">{fcfa(l.montantDeclare)}</span>
                    <span className="font-mono text-sm text-[#EDEDED] break-all">{p.refTransaction ?? "—"}</span>
                  </div>
                  <div className="text-xs text-[#8A8A8A]">{p.payeLe ? dateHeure(p.payeLe) : "—"} · {p.vehicule ?? "—"} · {p.chauffeurNom ?? "—"}</div>
                  <div className="text-xs text-[#8A8A8A]">{p.borne ? `${p.borne} · ` : ""}payé par {p.payeParNom ?? "—"}</div>
                  {v && (
                    <div className="text-sm pt-1" style={{ color: v.color }}>
                      {v.label}{l.verdict === "MONTANT_DIFFERENT" ? ` : ${fcfa(l.montantReel)} dans Wave` : ""}{l.note ? <span className="text-[#8A8A8A]"> — {l.note}</span> : null}
                    </div>
                  )}
                </div>
                {ouvert && (
                  <div className="sm:w-56 shrink-0 space-y-2">
                    {v && !enSaisie ? (
                      <button onClick={() => verdict(l.id, { verdict: null })} disabled={busy} className="text-xs text-[#8A8A8A] hover:text-[#EDEDED] normal-case! font-sans! tracking-normal!">Modifier</button>
                    ) : enSaisie ? (
                      <div className="space-y-2">
                        {saisie!.verdict === "MONTANT_DIFFERENT"
                          ? <Input type="number" inputMode="numeric" autoFocus value={saisie!.valeur} onChange={(e) => setSaisie({ ...saisie!, valeur: e.target.value })} placeholder="Montant lu dans Wave" className="w-full" />
                          : <Input autoFocus value={saisie!.valeur} onChange={(e) => setSaisie({ ...saisie!, valeur: e.target.value })} placeholder="Ce que vous avez constaté" className="w-full" />}
                        <div className="flex gap-2">
                          <Btn size="sm" variant="secondary" onClick={() => setSaisie(null)} disabled={busy}>Retour</Btn>
                          <Btn size="sm" className="flex-1" disabled={busy || !saisie!.valeur.trim()}
                            onClick={() => verdict(l.id, saisie!.verdict === "MONTANT_DIFFERENT" ? { verdict: "MONTANT_DIFFERENT", montantReel: Number(saisie!.valeur) } : { verdict: "ABSENT", note: saisie!.valeur })}>
                            Valider
                          </Btn>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Btn size="sm" className="w-full" onClick={() => verdict(l.id, { verdict: "CONFORME" })} disabled={busy}>Conforme</Btn>
                        <div className="flex gap-2">
                          <Btn size="sm" variant="secondary" className="flex-1" onClick={() => setSaisie({ ligneId: l.id, verdict: "MONTANT_DIFFERENT", valeur: "" })} disabled={busy}>Montant ≠</Btn>
                          <Btn size="sm" variant="secondary" className="flex-1" onClick={() => setSaisie({ ligneId: l.id, verdict: "ABSENT", valeur: "" })} disabled={busy}>Absent</Btn>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Panel>

      {/* Paiements Wave sans demande */}
      <Panel className="overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between gap-2 border-b border-[#232327]">
          <span className="text-xs uppercase tracking-wide text-[#8A8A8A]">Paiements dans Wave sans demande ({nonDeclares.length})</span>
          {ouvert && !ajout && <Btn size="sm" variant="secondary" onClick={() => setAjout({ date: "", montant: "", refTransaction: "", marchand: "", note: "" })}><Plus size={14} /> Ajouter</Btn>}
        </div>
        {ajout && (
          <div className="p-5 space-y-3 border-b border-[#232327]">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Date et heure *"><Input type="datetime-local" value={ajout.date} onChange={(e) => setAjout({ ...ajout, date: e.target.value })} /></Field>
              <Field label="Montant (FCFA) *"><Input type="number" inputMode="numeric" value={ajout.montant} onChange={(e) => setAjout({ ...ajout, montant: e.target.value })} placeholder="ex. 2000" /></Field>
              <Field label="ID de transaction"><Input value={ajout.refTransaction} onChange={(e) => setAjout({ ...ajout, refTransaction: e.target.value })} placeholder="ex. T_ABC123…" /></Field>
              <Field label="Marchand / bénéficiaire"><Input value={ajout.marchand} onChange={(e) => setAjout({ ...ajout, marchand: e.target.value })} placeholder="tel qu'affiché dans Wave" /></Field>
            </div>
            <Field label="Note"><Input value={ajout.note} onChange={(e) => setAjout({ ...ajout, note: e.target.value })} placeholder="facultatif" /></Field>
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={() => setAjout(null)} disabled={busy}>Annuler</Btn>
              <Btn disabled={busy || !ajout.date || !(Number(ajout.montant) > 0)}
                onClick={async () => { if (await run(() => api.post<any>(`/api/fleet/rapprochements/${id}/lignes`, { ...ajout, montant: Number(ajout.montant), date: new Date(ajout.date).toISOString() }), "Paiement ajouté")) setAjout(null); }}>
                Ajouter le paiement
              </Btn>
            </div>
          </div>
        )}
        {!nonDeclares.length ? <EmptyState>{ouvert ? "Aucun pour l'instant. Ajoutez tout paiement vu dans Wave qui n'est pas dans la liste ci-dessus." : "Aucun."}</EmptyState> : nonDeclares.map((l: any) => (
          <div key={l.id} className="px-5 py-3 border-t border-[#232327] first:border-t-0 border-l-2 border-l-[#EF4444] flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm text-[#EDEDED]"><b>{fcfa(l.montantReel)}</b> · {l.dateTransaction ? dateHeure(l.dateTransaction) : "—"}{l.marchand ? ` · ${l.marchand}` : ""}</div>
              <div className="text-xs text-[#8A8A8A]">{l.refTransaction ? <span className="font-mono">{l.refTransaction}</span> : "ID non renseigné"}{l.note ? ` — ${l.note}` : ""}</div>
            </div>
            {ouvert && (
              <button onClick={() => run(() => api.del<any>(`/api/fleet/rapprochements/${id}/lignes/${l.id}`), "Paiement retiré")} disabled={busy}
                className="text-[#8A8A8A] hover:text-[#EF4444] p-1" aria-label="Retirer"><Trash2 size={16} /></button>
            )}
          </div>
        ))}
      </Panel>

      {/* Bilan */}
      <Panel className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-[#8A8A8A]">Déclaré dans EASY</div><div className="text-[#EDEDED] font-semibold">{fcfa(r.totalDeclare)}</div></div>
          <div><div className="text-xs text-[#8A8A8A]">Vu dans Wave</div><div className="text-[#EDEDED] font-semibold">{fcfa(r.totalVuDansWave)}</div></div>
          <div><div className="text-xs text-[#8A8A8A]">Écart</div><div className="font-semibold" style={{ color: r.ecart ? RED : GREEN }}>{r.ecart > 0 ? "+" : ""}{fcfa(r.ecart)}</div></div>
          <div><div className="text-xs text-[#8A8A8A]">Lignes en écart</div><div className="font-semibold" style={{ color: r.ecarts ? RED : GREEN }}>{r.ecarts}</div></div>
        </div>
        <div className="text-xs text-[#8A8A8A]">
          {r.conformes} conforme(s) · {r.montantsDifferents} montant(s) différent(s) · {r.absents} absent(s) de Wave · {r.nonDeclares} sans demande
        </div>
        {ouvert && (
          <>
            <Btn className="w-full" size="lg" disabled={busy || r.verifies < r.paiementsDeclares}
              onClick={() => { if (window.confirm("Clôturer ce rapprochement ? Il ne sera plus modifiable et les écarts seront transmis à la Direction.")) run(() => api.post<any>(`/api/fleet/rapprochements/${id}/cloturer`, {}), "Rapprochement clôturé"); }}>
              Clôturer le rapprochement
            </Btn>
            {r.verifies < r.paiementsDeclares && <p className="text-xs text-[#8A8A8A] text-center">Encore {r.paiementsDeclares - r.verifies} paiement(s) à vérifier.</p>}
          </>
        )}
      </Panel>
    </div>
  );
};
