/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "client" | "partenaire" | "chauffeur" | "admin" | "corporate";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  image: string;
  capacity: number;
  autonomy: string; // e.g. "450 km WLTP"
  power: string; // e.g. "300 ch"
  chargeSpeed: string; // e.g. "30 min (10-80%)"
  hourlyRate: number;
  halfDayRate: number;
  fullDayRate: number;
  isDailyOnly?: boolean;
}

export type Language = "fr" | "en";

