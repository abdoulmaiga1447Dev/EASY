/**
 * Temps réel des espaces fleet (Socket.IO).
 * Le serveur Socket.IO est créé dans server.ts et exposé via global.ioInstance.
 * Chaque utilisateur authentifié rejoint la salle `user:<id>` (événement « fleet:auth »).
 * Hors serveur (tests), les émissions sont simplement ignorées.
 */
export function emitToUsers(userIds: Iterable<string>, event: string, payload: unknown): void {
  const io = (global as any).ioInstance;
  if (!io) return;
  for (const id of new Set(userIds)) io.to(`user:${id}`).emit(event, payload);
}
