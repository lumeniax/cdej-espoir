import Dexie, { type EntityTable } from 'dexie';

export interface OfflinePresence {
  id?: number;
  session_id: number;
  eleve_id: number;
  eleve_nom: string;
  statut: 'P' | 'A';
  saved_at: number;
  synced: boolean;
}

export class OfflineDB extends Dexie {
  presences!: EntityTable<OfflinePresence, 'id'>;
  constructor() {
    super('cdej_offline_v1');
    this.version(1).stores({ presences: '++id, session_id, eleve_id, synced, saved_at' });
  }
}

export const offlineDb = new OfflineDB();
