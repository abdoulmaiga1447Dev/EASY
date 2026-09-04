/**
 * Contexte RBAC front — charge le contexte d'autorisation du serveur (/api/context)
 * et expose `can(permission)` + les sites/roleCode pour piloter l'AFFICHAGE.
 *
 * Rappel : ce masquage n'est qu'un confort ; la sécurité réelle est appliquée côté
 * serveur, où chaque route vérifie la permission.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, type RbacContextDTO } from "../api/fleet";
import { useAuth } from "./AuthContext";

interface RbacContextValue {
  ctx: RbacContextDTO | null;
  loading: boolean;
  can: (...codes: string[]) => boolean;
  reload: () => void;
}

const RbacCtx = createContext<RbacContextValue | undefined>(undefined);

// Codes de rôle relevant de SAVER Fleet Ops (par opposition aux rôles legacy).
export const FLEET_ROLE_CODES = [
  "admin_direction",
  "superviseur_logistique",
  "responsable_terrain",
  "dispatcher",
  "finance",
  "maintenance",
  "chauffeur",
  "externe_banque",
  "externe_client",
];

export const RbacProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [ctx, setCtx] = useState<RbacContextDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setCtx(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<RbacContextDTO>("/api/context");
      setCtx(data);
    } catch {
      setCtx(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isLoading) load();
  }, [isLoading, load]);

  const can = useCallback(
    (...codes: string[]) => {
      if (!ctx) return false;
      return codes.some((c) => ctx.permissions.includes(c));
    },
    [ctx]
  );

  return <RbacCtx.Provider value={{ ctx, loading, can, reload: load }}>{children}</RbacCtx.Provider>;
};

export const useRbac = () => {
  const c = useContext(RbacCtx);
  if (!c) throw new Error("useRbac must be used within a RbacProvider");
  return c;
};
