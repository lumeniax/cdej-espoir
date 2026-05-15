import { offlineDb } from './offlineDb';
import { apiClient } from './apiClient';

export async function savePresencesOffline(
  session_id: number,
  presences: { eleve_id: number; eleve_nom: string; statut: 'P' | 'A' }[]
): Promise<void> {
  // Remove existing unsynced entries for this session
  await offlineDb.presences.where({ session_id, synced: 0 as unknown as boolean }).delete();
  // Add new entries
  const now = Date.now();
  await offlineDb.presences.bulkAdd(
    presences.map(p => ({
      session_id,
      eleve_id: p.eleve_id,
      eleve_nom: p.eleve_nom,
      statut: p.statut,
      saved_at: now,
      synced: false,
    }))
  );
}

export async function syncPendingPresences(): Promise<{ synced: number; errors: number }> {
  const unsyncedSessions = await offlineDb.presences
    .where('synced').equals(0)
    .toArray();
  
  // Group by session_id
  const bySession = new Map<number, typeof unsyncedSessions>();
  for (const p of unsyncedSessions) {
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
          presences: entries.map(e => ({ eleve_id: e.eleve_id, statut: e.statut })),
        }),
      });
      if (res.ok) {
        const ids = entries.map(e => e.id).filter((id): id is number => id !== undefined);
        await offlineDb.presences.bulkUpdate(ids.map(id => ({ key: id, changes: { synced: true } })));
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

export async function getPendingCount(): Promise<number> {
  return offlineDb.presences.where('synced').equals(0).count();
}
