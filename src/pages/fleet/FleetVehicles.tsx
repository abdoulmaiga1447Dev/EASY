/**
 * Écran Véhicules (Flux 7) — liste + filtres + export CSV, création multi-étapes
 * (brouillon possible, bouton d'enregistrement désactivé si un champ/photo obligatoire
 * manque), fiche détail (documents, photos, GPS, téléphone/SIM, historique, alertes),
 * plus les onglets Téléphones/SIM et Alertes.
 */
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "../../components/Button";
import { useRbac } from "../../context/RbacContext";
import { api, uploadMedia, type FleetVehicleDTO, type DevicePhoneDTO, type AlertDTO, type ApiError } from "../../api/fleet";
import { Field, Input, Select, StatusBadge, Toast, Spinner, EmptyState, Modal, AuthImage } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const notifyFactory = (set: (t: ToastState) => void) => (t: ToastState) => { set(t); if (t) setTimeout(() => set(null), 3500); };

const STATUT_LABEL: Record<string, string> = {
  Disponible: "Disponible", Attribue: "Attribué", EnCharge: "En charge",
  Immobilise: "Immobilisé", EnMaintenance: "En maintenance", HorsFlotte: "Hors flotte",
};
const CONTRAT_LABEL: Record<string, string> = { INTERNE_SAVER: "Interne SAVER", EXTERNE_CLIENT: "Externe client" };
const PHOTO_DEFS: { key: string; label: string }[] = [
  { key: "avant", label: "Avant" }, { key: "arriere", label: "Arrière" }, { key: "gauche", label: "Gauche" }, { key: "droite", label: "Droite" },
  { key: "interieur", label: "Intérieur" }, { key: "tableauBord", label: "Tableau de bord" }, { key: "ecran", label: "Écran" }, { key: "sieges", label: "Sièges" },
];

// ------------------------------------------------------------ Upload d'une photo
const PhotoField: React.FC<{ label: string; mediaId: string | null; onUploaded: (id: string) => void; notify: (t: ToastState) => void }> = ({ label, mediaId, onUploaded, notify }) => {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try { const m = await uploadMedia(file); onUploaded(m.id); }
    catch (err) { notify({ message: errMsg(err), kind: "err" }); setPreview(null); }
    finally { setBusy(false); }
  };
  return (
    <label className="flex flex-col gap-1 cursor-pointer">
      <span className="text-xs text-muted-premium">{label}{mediaId ? " ✓" : " *"}</span>
      <div className={`h-24 rounded-md border ${mediaId ? "border-gold/40" : "border-dashed border-gold/20"} overflow-hidden flex items-center justify-center bg-dark`}>
        {preview ? <img src={preview} className="w-full h-full object-cover" alt={label} />
          : busy ? <span className="text-xs text-muted-premium">…</span>
          : <span className="text-xs text-muted-premium">+ photo</span>}
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
  );
};

const DocFileField: React.FC<{ label: string; mediaId: string | null; onUploaded: (id: string) => void; notify: (t: ToastState) => void }> = ({ label, mediaId, onUploaded, notify }) => {
  const [busy, setBusy] = useState(false);
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true);
    try { const m = await uploadMedia(file); onUploaded(m.id); } catch (err) { notify({ message: errMsg(err), kind: "err" }); } finally { setBusy(false); }
  };
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <span className={`px-3 py-1.5 rounded-md border text-xs ${mediaId ? "border-gold/40 text-gold" : "border-dashed border-gold/20 text-muted-premium"}`}>
        {busy ? "…" : mediaId ? `${label} ✓` : `Joindre ${label} *`}
      </span>
      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
    </label>
  );
};

// ------------------------------------------------------------ Wizard de création
const STEPS = ["Identification", "Contrat", "Service", "Documents", "Photos", "Validation"];

const VehicleWizard: React.FC<{ onDone: () => void; onCancel: () => void; notify: (t: ToastState) => void }> = ({ onDone, onCancel, notify }) => {
  const { ctx } = useRbac();
  const [step, setStep] = useState(0);
  const [clients, setClients] = useState<{ id: string; raisonSociale: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    immatriculation: "", vin: "", marque: "", modele: "", siteId: ctx?.sites[0]?.id || "",
    autonomieNominale: "", capaciteBatterieKwh: "", contractType: "INTERNE_SAVER", clientId: "",
    dureeContratMois: "", montantRemboursement: "", serviceType: "VTC", classes: [] as string[], kmActuel: 0, gpsBoitierId: "",
    photos: {} as Record<string, string>,
    documents: { carteGrise: { numero: "", proprietaire: "", date: "", mediaId: "" }, visiteTechnique: { dateExpiration: "", mediaId: "" }, assurance: { numero: "", dateDebut: "", dateFin: "", mediaId: "" } },
  });
  const set = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));
  const setDoc = (doc: string, patch: any) => setForm((f: any) => ({ ...f, documents: { ...f.documents, [doc]: { ...f.documents[doc], ...patch } } }));

  useEffect(() => { api.get<{ clients: { id: string; raisonSociale: string }[] }>("/api/clients").then((d) => setClients(d.clients)).catch(() => {}); }, []);

  const missing = useMemo(() => {
    const m: string[] = [];
    for (const f of ["immatriculation", "vin", "marque", "modele", "siteId", "autonomieNominale", "capaciteBatterieKwh"]) if (!form[f]) m.push(f);
    if (form.contractType === "EXTERNE_CLIENT" && !form.clientId) m.push("clientId");
    for (const p of PHOTO_DEFS) if (!form.photos[p.key]) m.push(`photo.${p.key}`);
    if (!form.documents.carteGrise.numero || !form.documents.carteGrise.mediaId) m.push("carteGrise");
    if (!form.documents.visiteTechnique.dateExpiration || !form.documents.visiteTechnique.mediaId) m.push("visiteTechnique");
    const a = form.documents.assurance; if (!a.numero || !a.dateDebut || !a.dateFin || !a.mediaId) m.push("assurance");
    return m;
  }, [form]);

  const submit = async (isDraft: boolean) => {
    setSaving(true);
    try {
      await api.post("/api/fleet/vehicles", { ...form, isDraft, autonomieNominale: Number(form.autonomieNominale) || null, capaciteBatterieKwh: Number(form.capaciteBatterieKwh) || null });
      notify({ message: isDraft ? "Brouillon enregistré" : "Véhicule enregistré", kind: "ok" });
      onDone();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };

  const toggleClass = (c: string) => set({ classes: form.classes.includes(c) ? form.classes.filter((x: string) => x !== c) : [...form.classes, c] });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <button onClick={() => setStep(i)} className={`text-xs px-2 py-1 rounded ${i === step ? "bg-gold text-dark" : "text-muted-premium"}`}>{i + 1}. {s}</button>
            {i < STEPS.length - 1 && <span className="text-muted-premium/40">›</span>}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Immatriculation *"><Input value={form.immatriculation} onChange={(e) => set({ immatriculation: e.target.value })} /></Field>
          <Field label="N° VIN *"><Input value={form.vin} onChange={(e) => set({ vin: e.target.value })} /></Field>
          <Field label="Marque *"><Input value={form.marque} onChange={(e) => set({ marque: e.target.value })} /></Field>
          <Field label="Modèle *"><Input value={form.modele} onChange={(e) => set({ modele: e.target.value })} /></Field>
          <Field label="Site *"><Select value={form.siteId} onChange={(e) => set({ siteId: e.target.value })}>{(ctx?.sites || []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></Field>
          <Field label="Autonomie nominale (km) *"><Input type="number" value={form.autonomieNominale} onChange={(e) => set({ autonomieNominale: e.target.value })} /></Field>
          <Field label="Capacité batterie (kWh) *"><Input type="number" value={form.capaciteBatterieKwh} onChange={(e) => set({ capaciteBatterieKwh: e.target.value })} /></Field>
          <Field label="Kilométrage actuel"><Input type="number" value={form.kmActuel} onChange={(e) => set({ kmActuel: Number(e.target.value) })} /></Field>
        </div>
      )}

      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Type de contrat"><Select value={form.contractType} onChange={(e) => set({ contractType: e.target.value })}><option value="INTERNE_SAVER">Interne SAVER</option><option value="EXTERNE_CLIENT">Externe client géré</option></Select></Field>
          {form.contractType === "EXTERNE_CLIENT" && <>
            <Field label="Client propriétaire *"><Select value={form.clientId} onChange={(e) => set({ clientId: e.target.value })}><option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.raisonSociale}</option>)}</Select></Field>
            <Field label="Durée du contrat (mois)"><Input type="number" value={form.dureeContratMois} onChange={(e) => set({ dureeContratMois: e.target.value })} /></Field>
            <Field label="Montant de remboursement (FCFA)"><Input type="number" value={form.montantRemboursement} onChange={(e) => set({ montantRemboursement: e.target.value })} /></Field>
          </>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="Type de service"><Select value={form.serviceType} onChange={(e) => set({ serviceType: e.target.value })}><option value="VTC">VTC</option><option value="LOCATION_B2B">Location B2B</option><option value="B2C">B2C</option></Select></Field>
          <div>
            <span className="text-sm text-muted-premium">Classes activables</span>
            <div className="flex gap-2 mt-2">
              {["Eco", "Confort", "VIP"].map((c) => <button key={c} type="button" onClick={() => toggleClass(c)} className={`text-xs px-3 py-1.5 rounded-full border ${form.classes.includes(c) ? "bg-gold text-dark border-gold" : "border-gold/20 text-muted-premium"}`}>{c}</button>)}
            </div>
          </div>
          <Field label="Boîtier GPS LUOGU (optionnel)"><Input value={form.gpsBoitierId} onChange={(e) => set({ gpsBoitierId: e.target.value })} placeholder="Peut être associé plus tard" /></Field>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-surface border border-gold/10 rounded-lg p-4">
            <h4 className="font-medium text-white-premium mb-3">Carte grise</h4>
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <Field label="Numéro *"><Input value={form.documents.carteGrise.numero} onChange={(e) => setDoc("carteGrise", { numero: e.target.value })} /></Field>
              <Field label="Propriétaire"><Input value={form.documents.carteGrise.proprietaire} onChange={(e) => setDoc("carteGrise", { proprietaire: e.target.value })} /></Field>
              <Field label="Date"><Input type="date" value={form.documents.carteGrise.date} onChange={(e) => setDoc("carteGrise", { date: e.target.value })} /></Field>
              <DocFileField label="photo carte grise" mediaId={form.documents.carteGrise.mediaId} onUploaded={(id) => setDoc("carteGrise", { mediaId: id })} notify={notify} />
            </div>
          </div>
          <div className="bg-surface border border-gold/10 rounded-lg p-4">
            <h4 className="font-medium text-white-premium mb-3">Visite technique</h4>
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <Field label="Date d'expiration *"><Input type="date" value={form.documents.visiteTechnique.dateExpiration} onChange={(e) => setDoc("visiteTechnique", { dateExpiration: e.target.value })} /></Field>
              <DocFileField label="photo VT" mediaId={form.documents.visiteTechnique.mediaId} onUploaded={(id) => setDoc("visiteTechnique", { mediaId: id })} notify={notify} />
            </div>
          </div>
          <div className="bg-surface border border-gold/10 rounded-lg p-4">
            <h4 className="font-medium text-white-premium mb-3">Assurance</h4>
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <Field label="Numéro *"><Input value={form.documents.assurance.numero} onChange={(e) => setDoc("assurance", { numero: e.target.value })} /></Field>
              <Field label="Début *"><Input type="date" value={form.documents.assurance.dateDebut} onChange={(e) => setDoc("assurance", { dateDebut: e.target.value })} /></Field>
              <Field label="Fin *"><Input type="date" value={form.documents.assurance.dateFin} onChange={(e) => setDoc("assurance", { dateFin: e.target.value })} /></Field>
              <DocFileField label="photo assurance" mediaId={form.documents.assurance.mediaId} onUploaded={(id) => setDoc("assurance", { mediaId: id })} notify={notify} />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <p className="text-sm text-muted-premium mb-3">Les 8 photos sont obligatoires (4 angles extérieurs, intérieur, tableau de bord, écran, sièges).</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PHOTO_DEFS.map((p) => <PhotoField key={p.key} label={p.label} mediaId={form.photos[p.key] || null} onUploaded={(id) => set({ photos: { ...form.photos, [p.key]: id } })} notify={notify} />)}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <p className="text-sm text-white-premium">Récapitulatif : {form.marque} {form.modele} — {form.immatriculation}</p>
          {missing.length > 0 ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">
              Enregistrement impossible : {missing.length} élément(s) obligatoire(s) manquant(s). Complétez les étapes précédentes (ou enregistrez un brouillon).
            </div>
          ) : (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 text-sm text-gold">Tout est complet : vous pouvez enregistrer le véhicule.</div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mt-8">
        <Button id="wiz-cancel" variant="ghost" onClick={onCancel}>Annuler</Button>
        <div className="flex gap-2">
          {step > 0 && <Button id="wiz-prev" variant="outline" onClick={() => setStep(step - 1)}>Précédent</Button>}
          {step < STEPS.length - 1 && <Button id="wiz-next" onClick={() => setStep(step + 1)}>Suivant</Button>}
          {step === STEPS.length - 1 && <>
            <Button id="wiz-draft" variant="outline" onClick={() => submit(true)} disabled={saving}>Enregistrer le brouillon</Button>
            <Button id="wiz-save" onClick={() => submit(false)} disabled={saving || missing.length > 0}>Enregistrer le véhicule</Button>
          </>}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------ Fiche détail
const VehicleDetail: React.FC<{ id: string; onBack: () => void; notify: (t: ToastState) => void }> = ({ id, onBack, notify }) => {
  const { can } = useRbac();
  const [v, setV] = useState<FleetVehicleDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setV(await api.get<FleetVehicleDTO>(`/api/fleet/vehicles/${id}`)); } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [id]);

  const changeStatus = async (statut: string) => {
    try { await api.post(`/api/fleet/vehicles/${id}/status`, { statut }); notify({ message: "Statut mis à jour", kind: "ok" }); load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  if (loading) return <Spinner />;
  if (!v) return <EmptyState>Véhicule introuvable.</EmptyState>;
  const photoCols: [string, string | null][] = [["Avant", v.photoAvant], ["Arrière", v.photoArriere], ["Gauche", v.photoGauche], ["Droite", v.photoDroite], ["Intérieur", v.photoInterieur], ["Tableau de bord", v.photoTableauBord], ["Écran", v.photoEcran], ["Sièges", v.photoSieges]];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gold hover:underline">← Retour à la liste</button>
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white-premium">{v.marque} {v.modele}</h2>
          <p className="text-muted-premium">{v.immatriculation} · VIN {v.vin} · {v.site?.nom}</p>
        </div>
        <div className="text-right">
          <span className="text-xs px-2 py-1 rounded-full bg-gold/15 text-gold">{STATUT_LABEL[v.statut] || v.statut}</span>
          {v.isDraft && <span className="ml-2 text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-400">Brouillon</span>}
        </div>
      </div>

      {(v.alerts?.length ?? 0) > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="text-sm font-medium text-red-300 mb-1">Alertes</div>
          {v.alerts!.map((a) => <div key={a.id} className="text-sm text-red-200">• {a.message}</div>)}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-surface border border-gold/10 rounded-lg p-4 text-sm space-y-1">
          <div className="text-muted-premium">Contrat</div>
          <div className="text-white-premium">{CONTRAT_LABEL[v.contractType]}{v.client ? ` · ${v.client.raisonSociale}` : ""}</div>
          <div className="text-muted-premium mt-2">Service</div>
          <div className="text-white-premium">{v.serviceType} · {(v.classes || []).join(", ") || "—"}</div>
        </div>
        <div className="bg-surface border border-gold/10 rounded-lg p-4 text-sm space-y-1">
          <div className="text-muted-premium">Autonomie / Batterie</div>
          <div className="text-white-premium">{v.autonomieNominale ?? "—"} km · {v.capaciteBatterieKwh ?? "—"} kWh</div>
          <div className="text-muted-premium mt-2">Kilométrage</div>
          <div className="text-white-premium">{v.kmActuel.toLocaleString("fr-FR")} km</div>
          <div className="text-muted-premium mt-2">GPS LUOGU</div>
          <div className="text-white-premium">{v.gpsBoitierId || "Non associé"}</div>
        </div>
        <div className="bg-surface border border-gold/10 rounded-lg p-4 text-sm space-y-1">
          <div className="text-muted-premium">Maintenance préventive</div>
          <div className="text-white-premium">à {v.prochainEntretienKm?.toLocaleString("fr-FR") ?? "—"} km</div>
          <div className="text-white-premium">ou le {v.prochainEntretienDate ? new Date(v.prochainEntretienDate).toLocaleDateString("fr-FR") : "—"}</div>
          <div className="text-muted-premium mt-2">Téléphone/SIM</div>
          <div className="text-white-premium">{v.phone ? `${v.phone.numero} (${v.phone.operateur || "?"})` : "Aucun"}</div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-white-premium mb-2">Documents</h4>
        <div className="flex flex-wrap gap-2 text-sm">
          {(v.documents || []).map((d) => (
            <span key={d.id} className="px-3 py-1.5 rounded bg-dark border border-gold/10 text-muted-premium">
              {d.type === "CARTE_GRISE" ? "Carte grise" : d.type === "VISITE_TECHNIQUE" ? "Visite technique" : "Assurance"}
              {d.dateFin ? ` · exp. ${new Date(d.dateFin).toLocaleDateString("fr-FR")}` : ""}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-white-premium mb-2">Photos</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {photoCols.map(([label, mid]) => (
            <div key={label}>
              <AuthImage mediaId={mid} className="w-full h-28 rounded-md" alt={label} />
              <div className="text-xs text-muted-premium mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {(can("vehicule.modifier") || can("vehicule.reactiver")) && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-premium self-center mr-2">Changer le statut :</span>
          {["Disponible", "EnMaintenance", "Immobilise", "HorsFlotte"].map((s) => (
            <button key={s} onClick={() => changeStatus(s)} className="text-xs px-3 py-1.5 rounded border border-gold/20 text-muted-premium hover:text-white-premium hover:border-gold/40">{STATUT_LABEL[s]}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------ Liste
const VehiclesList: React.FC<{ onOpen: (id: string) => void; onCreate: () => void; notify: (t: ToastState) => void }> = ({ onOpen, onCreate, notify }) => {
  const { can } = useRbac();
  const [vehicles, setVehicles] = useState<FleetVehicleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", statut: "", contractType: "", echeance: "" });

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.q) qs.set("q", filters.q);
      if (filters.statut) qs.set("statut", filters.statut);
      if (filters.contractType) qs.set("contractType", filters.contractType);
      if (filters.echeance) qs.set("echeance", filters.echeance);
      setVehicles((await api.get<{ vehicles: FleetVehicleDTO[] }>(`/api/fleet/vehicles?${qs}`)).vehicles);
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filters]);

  const exportCsv = async () => {
    const token = localStorage.getItem("ev_access_token");
    const res = await fetch("/api/fleet/vehicles/export", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "vehicules.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Rechercher (immat, marque, VIN…)" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })}><option value="">Tous statuts</option>{Object.entries(STATUT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select value={filters.contractType} onChange={(e) => setFilters({ ...filters, contractType: e.target.value })}><option value="">Tous contrats</option><option value="INTERNE_SAVER">Interne SAVER</option><option value="EXTERNE_CLIENT">Externe client</option></Select>
          <Select value={filters.echeance} onChange={(e) => setFilters({ ...filters, echeance: e.target.value })}><option value="">Toutes échéances</option><option value="proche">Échéances proches</option></Select>
        </div>
        <div className="flex gap-2">
          <Button id="veh-export" variant="outline" onClick={exportCsv}>Export CSV</Button>
          {can("vehicule.creer") && <Button id="veh-new" onClick={onCreate}>+ Ajouter un véhicule</Button>}
        </div>
      </div>
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto border border-gold/10 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-dark text-muted-premium"><tr>
              <th className="text-left px-4 py-3">Immatriculation</th><th className="text-left px-4 py-3">Véhicule</th><th className="text-left px-4 py-3">Site</th><th className="text-left px-4 py-3">Contrat</th><th className="text-left px-4 py-3">Statut</th><th className="text-left px-4 py-3">km</th>
            </tr></thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-t border-gold/5 hover:bg-white/5 cursor-pointer" onClick={() => onOpen(v.id)}>
                  <td className="px-4 py-3 text-white-premium">{v.immatriculation}{v.isDraft && <span className="ml-1 text-xs text-yellow-400">(brouillon)</span>}</td>
                  <td className="px-4 py-3 text-muted-premium">{v.marque} {v.modele}</td>
                  <td className="px-4 py-3 text-muted-premium">{v.site?.nom}</td>
                  <td className="px-4 py-3 text-muted-premium">{CONTRAT_LABEL[v.contractType]}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold">{STATUT_LABEL[v.statut] || v.statut}</span></td>
                  <td className="px-4 py-3 text-muted-premium">{v.kmActuel.toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vehicles.length === 0 && <EmptyState>Aucun véhicule.</EmptyState>}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------ Téléphones/SIM
const PhonesTab: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const { ctx } = useRbac();
  const [phones, setPhones] = useState<DevicePhoneDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ numero: "", imei: "", operateur: "", siteId: ctx?.sites[0]?.id || "" });
  const load = async () => { setLoading(true); try { setPhones((await api.get<{ phones: DevicePhoneDTO[] }>("/api/fleet/phones")).phones); } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const create = async () => { if (!form.numero) return notify({ message: "Numéro obligatoire", kind: "err" }); try { await api.post("/api/fleet/phones", form); setForm({ numero: "", imei: "", operateur: "", siteId: form.siteId }); notify({ message: "Téléphone ajouté", kind: "ok" }); load(); } catch (e) { notify({ message: errMsg(e), kind: "err" }); } };
  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="bg-surface border border-gold/10 rounded-lg p-4 grid md:grid-cols-5 gap-3 items-end">
        <Field label="Numéro"><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></Field>
        <Field label="IMEI"><Input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} /></Field>
        <Field label="Opérateur"><Input value={form.operateur} onChange={(e) => setForm({ ...form, operateur: e.target.value })} /></Field>
        <Field label="Site"><Select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}>{(ctx?.sites || []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></Field>
        <Button id="phone-add" onClick={create}>Ajouter</Button>
      </div>
      <div className="overflow-x-auto border border-gold/10 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-dark text-muted-premium"><tr><th className="text-left px-4 py-3">Numéro</th><th className="text-left px-4 py-3">IMEI</th><th className="text-left px-4 py-3">Opérateur</th><th className="text-left px-4 py-3">Statut</th><th className="text-left px-4 py-3">Véhicule</th></tr></thead>
          <tbody>{phones.map((p) => <tr key={p.id} className="border-t border-gold/5"><td className="px-4 py-3 text-white-premium">{p.numero}</td><td className="px-4 py-3 text-muted-premium">{p.imei || "—"}</td><td className="px-4 py-3 text-muted-premium">{p.operateur || "—"}</td><td className="px-4 py-3 text-muted-premium">{p.statut}</td><td className="px-4 py-3 text-muted-premium">{p.vehicle?.immatriculation || "Non affecté"}</td></tr>)}</tbody>
        </table>
        {phones.length === 0 && <EmptyState>Aucun téléphone enregistré.</EmptyState>}
      </div>
    </div>
  );
};

// ------------------------------------------------------------ Alertes
const AlertsTab: React.FC<{ notify: (t: ToastState) => void }> = ({ notify }) => {
  const [alerts, setAlerts] = useState<AlertDTO[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { setAlerts((await api.get<{ alerts: AlertDTO[] }>("/api/fleet/alerts")).alerts); } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); } })(); }, []);
  if (loading) return <Spinner />;
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div key={a.id} className={`flex items-center gap-3 rounded-lg p-3 border ${a.severity === "critical" ? "bg-red-500/10 border-red-500/30" : "bg-yellow-500/10 border-yellow-500/25"}`}>
          <span className={`w-2 h-2 rounded-full ${a.severity === "critical" ? "bg-red-400" : "bg-yellow-400"}`} />
          <span className="text-sm text-white-premium flex-1">{a.message}</span>
          <span className="text-xs text-muted-premium">{a.type}</span>
        </div>
      ))}
      {alerts.length === 0 && <EmptyState>Aucune alerte en cours.</EmptyState>}
    </div>
  );
};

// ------------------------------------------------------------ Conteneur
export const FleetVehicles: React.FC = () => {
  const { can } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => notifyFactory(setToast), []);
  const [view, setView] = useState<{ mode: "list" | "create" | "detail"; id?: string }>({ mode: "list" });
  const [tab, setTab] = useState<"vehicles" | "phones" | "alerts">("vehicles");

  const tabs = [
    { key: "vehicles" as const, label: "Véhicules", show: true },
    { key: "phones" as const, label: "Téléphones / SIM", show: can("telephone.gerer") },
    { key: "alerts" as const, label: "Alertes", show: can("alerte.voir") },
  ].filter((t) => t.show);

  return (
    <div>
      {view.mode === "list" && (
        <>
          <div className="flex gap-1 border-b border-gold/10 mb-6">
            {tabs.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2.5 text-sm border-b-2 transition ${tab === t.key ? "border-gold text-gold" : "border-transparent text-muted-premium hover:text-white-premium"}`}>{t.label}</button>)}
          </div>
          {tab === "vehicles" && <VehiclesList onOpen={(id) => setView({ mode: "detail", id })} onCreate={() => setView({ mode: "create" })} notify={notify} />}
          {tab === "phones" && <PhonesTab notify={notify} />}
          {tab === "alerts" && <AlertsTab notify={notify} />}
        </>
      )}
      {view.mode === "create" && (
        <div>
          <h2 className="text-xl font-semibold text-white-premium mb-6">Ajouter un véhicule</h2>
          <VehicleWizard onDone={() => setView({ mode: "list" })} onCancel={() => setView({ mode: "list" })} notify={notify} />
        </div>
      )}
      {view.mode === "detail" && view.id && <VehicleDetail id={view.id} onBack={() => setView({ mode: "list" })} notify={notify} />}
      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
};
