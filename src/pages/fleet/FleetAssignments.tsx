/**
 * Écran Attribution quotidienne (Flux 8) — Dispatcher.
 * Planning du jour (2 shifts) et de la semaine, assistant d'attribution avec
 * suggestions (zone + rotation), véhicules déjà pris grisés, avertissements non
 * bloquants (handover, double shift, rythme), remplacement et annulation tracés.
 */
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "../../components/Button";
import { useRbac } from "../../context/RbacContext";
import { api, type ApiError } from "../../api/fleet";
import { Field, Input, Select, Spinner, EmptyState, Modal, Toast } from "./ui";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";
const todayISO = () => new Date().toISOString().slice(0, 10);

interface DayPlanning {
  date: string;
  shifts: { A: any[]; B: any[] };
  chauffeurs: { id: string; name: string; zoneId: string | null; zoneNom: string | null; affecteA: boolean; affecteB: boolean }[];
  vehicules: { id: string; immatriculation: string; marque: string; modele: string; statut: string; prisA: boolean; prisB: boolean }[];
}

// ------------------------------------------------------------ Assistant d'attribution
const AssignModal: React.FC<{ date: string; siteId: string; planning: DayPlanning; onDone: () => void; onClose: () => void; notify: (t: ToastState) => void }> = ({ date, siteId, planning, onDone, onClose, notify }) => {
  const [shift, setShift] = useState<"A" | "B">("A");
  const [driverId, setDriverId] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [loadingSug, setLoadingSug] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!driverId) { setSuggestions([]); return; }
    setLoadingSug(true);
    api.get<{ suggestions: any[] }>(`/api/fleet/assignments/suggestions?siteId=${siteId}&date=${date}&shift=${shift}&driverId=${driverId}`)
      .then((d) => setSuggestions(d.suggestions)).catch((e) => notify({ message: errMsg(e), kind: "err" })).finally(() => setLoadingSug(false));
  }, [driverId, shift, siteId, date]);

  const confirm = async () => {
    if (!driverId || !vehicleId) return notify({ message: "Choisissez un chauffeur et un véhicule", kind: "err" });
    setSaving(true);
    try {
      const res = await api.post<{ warnings: string[] }>("/api/fleet/assignments", { siteId, date, shift, driverId, vehicleId });
      if (res.warnings?.length) notify({ message: `Attribué, avec avertissement : ${res.warnings[0]}`, kind: "ok" });
      else notify({ message: "Attribution confirmée", kind: "ok" });
      onDone();
    } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setSaving(false); }
  };

  return (
    <Modal title="Attribuer un véhicule" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Shift">
          <Select value={shift} onChange={(e) => { setShift(e.target.value as "A" | "B"); setVehicleId(""); }}>
            <option value="A">Shift A (6h-14h)</option>
            <option value="B">Shift B (15h-23h)</option>
          </Select>
        </Field>
        <Field label="Chauffeur">
          <Select value={driverId} onChange={(e) => { setDriverId(e.target.value); setVehicleId(""); }}>
            <option value="">— Choisir —</option>
            {planning.chauffeurs.map((c) => <option key={c.id} value={c.id}>{c.name}{c.zoneNom ? ` (${c.zoneNom})` : ""}{(shift === "A" ? c.affecteA : c.affecteB) ? " — déjà affecté" : ""}</option>)}
          </Select>
        </Field>
        <div>
          <span className="text-sm text-muted-premium">Véhicules suggérés (zone puis rotation) — les véhicules déjà pris sont grisés</span>
          {loadingSug ? <Spinner /> : (
            <div className="mt-2 grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
              {suggestions.map((v, i) => (
                <button key={v.id} type="button" onClick={() => setVehicleId(v.id)}
                  className={`text-left px-3 py-2 rounded-md border text-sm ${vehicleId === v.id ? "border-gold bg-gold/15 text-gold" : "border-gold/15 text-white-premium hover:border-gold/30"}`}>
                  <div className="font-medium">{v.immatriculation}{i === 0 && <span className="ml-1 text-[10px] text-gold">★ suggéré</span>}</div>
                  <div className="text-xs text-muted-premium">{v.marque} {v.modele}</div>
                </button>
              ))}
              {driverId && suggestions.length === 0 && <div className="col-span-2 text-sm text-muted-premium">Aucun véhicule disponible pour ce créneau.</div>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button id="assign-cancel" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button id="assign-confirm" onClick={confirm} disabled={saving || !driverId || !vehicleId}>Confirmer l'attribution</Button>
        </div>
      </div>
    </Modal>
  );
};

// ------------------------------------------------------------ Remplacement
const ReplaceModal: React.FC<{ assignment: any; drivers: any[]; onDone: () => void; onClose: () => void; notify: (t: ToastState) => void }> = ({ assignment, drivers, onDone, onClose, notify }) => {
  const [nouveauDriverId, setNouveau] = useState("");
  const [motif, setMotif] = useState("");
  const submit = async () => {
    if (!nouveauDriverId || !motif) return notify({ message: "Nouveau chauffeur et motif obligatoires", kind: "err" });
    try { await api.post(`/api/fleet/assignments/${assignment.id}/replace`, { nouveauDriverId, motif }); notify({ message: "Remplacement effectué", kind: "ok" }); onDone(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };
  return (
    <Modal title="Remplacer le chauffeur" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nouveau chauffeur"><Select value={nouveauDriverId} onChange={(e) => setNouveau(e.target.value)}><option value="">— Choisir —</option>{drivers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Motif (obligatoire)"><Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. chauffeur souffrant" /></Field>
        <div className="flex justify-end gap-2 pt-2"><Button id="rep-cancel" variant="ghost" onClick={onClose}>Annuler</Button><Button id="rep-ok" onClick={submit}>Valider le remplacement</Button></div>
      </div>
    </Modal>
  );
};

// ------------------------------------------------------------ Vue jour
const DayView: React.FC<{ siteId: string; notify: (t: ToastState) => void }> = ({ siteId, notify }) => {
  const { can } = useRbac();
  const [date, setDate] = useState(todayISO());
  const [planning, setPlanning] = useState<DayPlanning | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [replace, setReplace] = useState<any | null>(null);

  const load = async () => { setLoading(true); try { setPlanning(await api.get<DayPlanning>(`/api/fleet/assignments?siteId=${siteId}&date=${date}`)); } catch (e) { notify({ message: errMsg(e), kind: "err" }); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [siteId, date]);

  const cancel = async (a: any) => {
    if (!confirm("Annuler cette attribution ?")) return;
    try { await api.del(`/api/fleet/assignments/${a.id}`); notify({ message: "Attribution annulée", kind: "ok" }); load(); }
    catch (e) { notify({ message: errMsg(e), kind: "err" }); }
  };

  const ShiftColumn: React.FC<{ shift: "A" | "B"; label: string; list: any[] }> = ({ label, list }) => (
    <div className="bg-surface border border-gold/10 rounded-lg p-4">
      <h4 className="font-medium text-white-premium mb-3">{label} <span className="text-xs text-muted-premium">({list.length})</span></h4>
      <div className="space-y-2">
        {list.map((a) => (
          <div key={a.id} className="bg-dark rounded-md p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white-premium font-medium">{a.vehicle?.immatriculation}</span>
              <span className="text-muted-premium">{a.vehicle?.marque} {a.vehicle?.modele}</span>
            </div>
            <div className="text-gold text-xs mt-1">{a.driver?.name}</div>
            <div className="flex gap-3 mt-2">
              {can("remplacement.valider") && <button className="text-xs text-muted-premium hover:text-gold" onClick={() => setReplace(a)}>Remplacer</button>}
              {(can("attribution.creer") || can("operation.annuler")) && <button className="text-xs text-red-400 hover:underline" onClick={() => cancel(a)}>Annuler</button>}
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="text-xs text-muted-premium">Aucune attribution.</div>}
      </div>
    </div>
  );

  if (loading || !planning) return <Spinner />;
  const nonAffectes = planning.chauffeurs.filter((c) => !c.affecteA && !c.affecteB);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        {can("attribution.creer") && <Button id="new-assign" onClick={() => setShowAssign(true)}>+ Attribuer un véhicule</Button>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ShiftColumn shift="A" label="Shift A · 6h-14h" list={planning.shifts.A} />
        <ShiftColumn shift="B" label="Shift B · 15h-23h" list={planning.shifts.B} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-surface border border-gold/10 rounded-lg p-4">
          <h4 className="font-medium text-white-premium mb-2">Chauffeurs non affectés <span className="text-xs text-muted-premium">({nonAffectes.length})</span></h4>
          <div className="flex flex-wrap gap-1.5">{nonAffectes.map((c) => <span key={c.id} className="text-xs bg-dark border border-gold/10 rounded px-2 py-0.5 text-muted-premium">{c.name}</span>)}{nonAffectes.length === 0 && <span className="text-xs text-muted-premium">Tous affectés.</span>}</div>
        </div>
        <div className="bg-surface border border-gold/10 rounded-lg p-4">
          <h4 className="font-medium text-white-premium mb-2">Véhicules disponibles</h4>
          <div className="flex flex-wrap gap-1.5">{planning.vehicules.map((v) => <span key={v.id} className={`text-xs rounded px-2 py-0.5 border ${v.prisA && v.prisB ? "border-red-500/20 text-red-400/70 line-through" : "border-gold/10 text-muted-premium"}`}>{v.immatriculation}</span>)}</div>
        </div>
      </div>

      {showAssign && <AssignModal date={date} siteId={siteId} planning={planning} onDone={() => { setShowAssign(false); load(); }} onClose={() => setShowAssign(false)} notify={notify} />}
      {replace && <ReplaceModal assignment={replace} drivers={planning.chauffeurs} onDone={() => { setReplace(null); load(); }} onClose={() => setReplace(null)} notify={notify} />}
    </div>
  );
};

// ------------------------------------------------------------ Vue semaine
const WeekView: React.FC<{ siteId: string; notify: (t: ToastState) => void }> = ({ siteId, notify }) => {
  const [start, setStart] = useState(todayISO());
  const [days, setDays] = useState<{ date: string; A: any[]; B: any[] }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); api.get<{ days: any[] }>(`/api/fleet/assignments/week?siteId=${siteId}&date=${start}`).then((d) => setDays(d.days)).catch((e) => notify({ message: errMsg(e), kind: "err" })).finally(() => setLoading(false)); }, [siteId, start]);
  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <Field label="Semaine à partir du"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[900px]">
          {days.map((d) => (
            <div key={d.date} className="bg-surface border border-gold/10 rounded-lg p-3">
              <div className="text-xs text-gold font-medium mb-2">{new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</div>
              <div className="text-[11px] text-muted-premium">A : {d.A.length} · B : {d.B.length}</div>
              <div className="mt-2 space-y-1">
                {[...d.A, ...d.B].slice(0, 6).map((a) => <div key={a.id} className="text-[11px] text-white-premium truncate">{a.vehicle?.immatriculation} · {a.driver?.name?.split(" ")[0]}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------ Conteneur
export const FleetAssignments: React.FC = () => {
  const { ctx } = useRbac();
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useMemo(() => (t: ToastState) => { setToast(t); if (t) setTimeout(() => setToast(null), 3500); }, []);
  const [siteId, setSiteId] = useState(ctx?.sites[0]?.id || "");
  const [tab, setTab] = useState<"day" | "week">("day");

  if (!siteId && (ctx?.sites.length ?? 0) === 0) return <EmptyState>Aucun site rattaché à votre compte.</EmptyState>;
  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="flex gap-1 border-b border-gold/10">
          <button onClick={() => setTab("day")} className={`px-4 py-2.5 text-sm border-b-2 ${tab === "day" ? "border-gold text-gold" : "border-transparent text-muted-premium hover:text-white-premium"}`}>Jour</button>
          <button onClick={() => setTab("week")} className={`px-4 py-2.5 text-sm border-b-2 ${tab === "week" ? "border-gold text-gold" : "border-transparent text-muted-premium hover:text-white-premium"}`}>Semaine</button>
        </div>
        {(ctx?.sites.length ?? 0) > 1 && (
          <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>{(ctx?.sites || []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select>
        )}
      </div>
      {tab === "day" ? <DayView siteId={siteId} notify={notify} /> : <WeekView siteId={siteId} notify={notify} />}
      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
};
