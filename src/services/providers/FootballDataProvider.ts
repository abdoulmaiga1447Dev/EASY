/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiFetch } from '../apiFootball';

export interface FootballDataMatchesResponse {
  source: string;
  matches: any[];
  error?: string;
  message?: string;
  diagnostic?: {
    fournisseurActif: string;
    cleDetectee: boolean;
    dernierTestApi: string;
    statutHttp: number;
    nombreMatchsRecuperes: number;
    competitionsCount?: number;
  };
}

export const FootballDataProvider = {
  /**
   * Récupère les matchs pour une date donnée (ou aujourd'hui) depuis le proxy Football-Data.org.
   */
  async fetchTodayMatches(date?: string): Promise<FootballDataMatchesResponse> {
    return apiFetch<FootballDataMatchesResponse>('scores/live', date ? { date } : {});
  },

  /**
   * Récupère les statistiques de match réelles.
   * Football-Data.org ne fournissant pas ces statistiques par défaut, cette méthode renvoie
   * une réponse vide ou un descriptif d'indisponibilité, sans simuler.
   */
  async fetchMatchStats(matchId: string): Promise<{ success: boolean; response: any[]; message?: string }> {
    return apiFetch<{ success: boolean; response: any[]; message?: string }>('football/statistics', { id: matchId });
  },

  /**
   * Récupère les compositions détaillées en direct pour un match précis.
   * Football-Data.org ne fournissant pas ces données par défaut, cette méthode renvoie
   * une réponse d'erreur ou d'indisponibilité propre.
   */
  async fetchMatchLineups(matchId: string): Promise<{ success: boolean; home: any; away: any; message?: string }> {
    return apiFetch<{ success: boolean; home: any; away: any; message?: string }>('football/lineups', { id: matchId });
  },

  /**
   * Récupère les détails enrichis d'un match (incluant les événements en temps réel).
   */
  async fetchMatchDetails(matchId: string): Promise<{ success: boolean; match: any; message?: string }> {
    return apiFetch<{ success: boolean; match: any; message?: string }>('football/match-details', { id: matchId });
  },

  /**
   * Interroge l'état du diagnostic d'intégration de Football-Data.org.
   */
  async fetchDiagnostic(): Promise<any> {
    return apiFetch<any>('football/diagnostic');
  }
};
