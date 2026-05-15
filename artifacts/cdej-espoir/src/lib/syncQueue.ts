import { offlineDb } from './offlineDb';
import { apiClient } from './apiClient';

/**
 * Sauvegarde des présences localement (IndexedDB) en attendant la synchro.
 * On utilise `synced: 0` (entier) au lieu d'un booléen pour rester compatible
 * avec un index Dexie (les booléens ne sont pas indexables).
 */
export async function savePresencesOffline(
  session_id: number,
  presences: { eleve_id: number; eleve_nom: string; statut: 'P' | 'A' }[],
): Promise<void> {
  // Remove existing unsynced entries for this session
  await offlineDb.presences
    .where('session_id').equals(session_id)
    .and((p) => p.synced === 0)
    .delete();

  // Add new entries
  const now = Date.now();
  await offlineDb.presences.bulkAdd(
    presences.map((p) => ({
      session_id,
      eleve_id: p.eleve_id,
      eleve_nom: p.eleve_nom,
      statut: p.statut,
      saved_at: now,
      synced: 0 as const,
    })),
  );
}

/**
 * Tente d'envoyer toutes les présences non synchronisées au serveur, groupées
 * par `session_id`. Les entrées envoyées avec succès sont marquées `synced = 1`.
 */
export async function syncPendingPresences(): Promise<{ synced: number; errors: number }> {
  const unsynced = await offlineDb.presences
    .where('synced').equals(0)
    .toArray();

  // Group by session_id
  const bySession = new Map<number, typeof unsynced>();
  for (const p of unsynced) {
    if (!bySession.has(p.session_id)) bySession.set(p.session_id, []);
    bySession.get(p.session_id)!.push(p);
  }

  let synced = 0;
  let errors = 0;

  for (const [session_id, entries] of bySession) {
    try {
      const res = await apiClient('/api/presences/batch', {
        method: 'POST',
        body: JSON.stringify({
          session_id,
          presences: entries.map((e) => ({ eleve_id: e.eleve_id, statut: e.statut })),
        }),
      });
      if (res.ok) {
        const ids = entries
          .map((e) => e.id)
          .filter((id): id is number => typeof id === 'number');
        if (ids.length > 0) {
          await offlineDb.presences.bulkUpdate(
            ids.map((id) => ({ key: id, changes: { synced: 1 as const } })),
          );
        }
        synced += entries.length;
      } else {
        errors++;
      }
    } catch {
      errors++;
    }
  }
  return { synced, errors };
}

/** Nombre de présences en attente de synchronisation. */
export async function getPendingCount(): Promise<number> {
  return offlineDb.presences.where('synced').equals(0).count();
}

/**
 * Supprime définitivement les entrées déjà synchronisées (pour nettoyage périodique).
 */
export async function purgeSyncedPresences(): Promise<number> {
  return offlineDb.presences.where('synced').equals(1).delete();
}
