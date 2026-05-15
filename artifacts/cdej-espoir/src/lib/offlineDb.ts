import Dexie, { type EntityTable } from 'dexie';

/**
 * Représente une présence enregistrée localement en attendant la synchro serveur.
 *
 * NOTE IMPORTANTE : Dexie / IndexedDB n'indexe pas les booléens nativement.
 * Pour pouvoir filtrer par `synced` via un index, on stocke un entier 0 ou 1
 * au lieu d'un `boolean`. Cela évite le bug où `.where('synced').equals(0)` ne
 * retournait jamais les entrées créées avec `synced: false`.
 */
export interface OfflinePresence {
  id?: number;
  session_id: number;
  eleve_id: number;
  eleve_nom: string;
  statut: 'P' | 'A';
  saved_at: number;
  /** 0 = en attente de synchro, 1 = synchronisé */
  synced: 0 | 1;
}

export class OfflineDB extends Dexie {
  presences!: EntityTable<OfflinePresence, 'id'>;
  constructor() {
    super('cdej_offline_v1');
    this.version(1).stores({
      presences: '++id, session_id, eleve_id, synced, saved_at',
    });
  }
}

export const offlineDb = new OfflineDB();
