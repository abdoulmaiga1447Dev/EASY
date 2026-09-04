/**
 * Client API — SAVER Fleet Ops (Partie A).
 * Ajoute automatiquement le jeton d'accès et normalise la gestion d'erreurs
 * (messages bilingues renvoyés par le serveur).
 */

export interface ApiError {
  status: number;
  fr: string;
  en: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("ev_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = data?.error;
    const apiErr: ApiError = {
      status: res.status,
      fr: err?.fr || err || "Erreur inattendue",
      en: err?.en || err || "Unexpected error",
    };
    throw apiErr;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => fetch(path, { headers: { ...authHeaders() } }).then((r) => handle<T>(r)),
  post: <T>(path: string, body?: unknown) =>
    fetch(path, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(body ?? {}) }).then((r) => handle<T>(r)),
  put: <T>(path: string, body?: unknown) =>
    fetch(path, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(body ?? {}) }).then((r) => handle<T>(r)),
  del: <T>(path: string) => fetch(path, { method: "DELETE", headers: { ...authHeaders() } }).then((r) => handle<T>(r)),
};

/** Upload d'un fichier (photo/document) → renvoie l'id du média. */
export async function uploadMedia(file: File): Promise<{ id: string; kind: string; mime: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/media", { method: "POST", headers: { ...authHeaders() }, body: fd });
  return handle(res);
}

// ---- Types partagés (Partie A) ----
export interface RbacContextDTO {
  userId: string;
  name: string;
  email: string;
  roleCode: string | null;
  secondaryRoleCode: string | null;
  permissions: string[];
  siteIds: string[];
  sites: { id: string; nom: string; ville: string }[];
  allSites: boolean;
  clientId: string | null;
}

export interface SiteDTO {
  id: string;
  nom: string;
  ville: string;
  timezone: string;
  waveAccountId: string | null;
  active: boolean;
  zones?: ZoneDTO[];
}

export interface ZoneDTO {
  id: string;
  siteId: string;
  nom: string;
}

export interface RoleDTO {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  isSystem: boolean;
  active: boolean;
  nbUtilisateurs: number;
  permissions: string[];
}

export interface PermissionDTO {
  id: string;
  code: string;
  libelle: string;
  categorie: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleCode: string | null;
  roleNom: string | null;
  secondaryRoleCode: string | null;
  active: boolean;
  clientId: string | null;
  siteIds: string[];
  createdAt: string;
}

export interface SettingsDTO {
  id: string;
  siteId: string;
  version: number;
  effectiveFrom: string;
  createdById: string | null;
  [key: string]: any;
}

export interface AuditEntryDTO {
  id: string;
  actorName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  siteId: string | null;
  createdAt: string;
}

// ---- Types véhicules (Bloc 2 — Flux 7) ----
export interface FleetVehicleDTO {
  id: string;
  immatriculation: string;
  vin: string;
  marque: string;
  modele: string;
  siteId: string;
  site?: { nom: string; ville?: string };
  client?: { raisonSociale: string } | null;
  autonomieNominale: number | null;
  capaciteBatterieKwh: number | null;
  statut: string;
  contractType: string;
  clientId: string | null;
  dureeContratMois: number | null;
  montantRemboursement: number | null;
  serviceType: string;
  classes: string[];
  kmActuel: number;
  gpsBoitierId: string | null;
  isDraft: boolean;
  prochainEntretienKm: number | null;
  prochainEntretienDate: string | null;
  photoAvant: string | null; photoArriere: string | null; photoGauche: string | null; photoDroite: string | null;
  photoInterieur: string | null; photoTableauBord: string | null; photoEcran: string | null; photoSieges: string | null;
  documents?: VehicleDocumentDTO[];
  phone?: DevicePhoneDTO | null;
  kmHistory?: { id: string; km: number; source: string; createdAt: string }[];
  alerts?: AlertDTO[];
}

export interface VehicleDocumentDTO {
  id: string; type: string; numero: string | null; proprietaire: string | null;
  dateDebut: string | null; dateFin: string | null; mediaId: string | null;
}

export interface DevicePhoneDTO {
  id: string; numero: string; imei: string | null; operateur: string | null;
  statut: string; vehicleId: string | null; siteId: string | null;
  vehicle?: { immatriculation: string } | null;
}

export interface AlertDTO {
  id: string; type: string; severity: string; status: string; message: string;
  dueDate: string | null; resourceId: string; siteId: string | null; createdAt: string;
}
