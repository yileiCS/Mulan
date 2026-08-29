import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Draft } from '../types';

interface PoetryDB extends DBSchema {
  drafts: {
    key: string;
    value: Draft;
    indexes: { 'by-updatedAt': number; 'by-status': string };
  };
}

const DB_NAME = 'yanhuo-poetry-db';
const DB_VERSION = 1;
const STORE_DRAFTS = 'drafts';

let dbPromise: Promise<IDBPDatabase<PoetryDB>> | null = null;

function getDB(): Promise<IDBPDatabase<PoetryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PoetryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const draftStore = db.createObjectStore(STORE_DRAFTS, {
          keyPath: 'draftId',
        });
        draftStore.createIndex('by-updatedAt', 'updatedAt');
        draftStore.createIndex('by-status', 'status');
      },
    });
  }
  return dbPromise;
}

export async function createDraft(draft: Draft): Promise<void> {
  const db = await getDB();
  await db.add(STORE_DRAFTS, draft);
}

export async function getDraft(draftId: string): Promise<Draft | undefined> {
  const db = await getDB();
  return db.get(STORE_DRAFTS, draftId);
}

export async function updateDraft(draft: Draft): Promise<void> {
  const db = await getDB();
  draft.updatedAt = Date.now();
  await db.put(STORE_DRAFTS, draft);
}

export async function deleteDraft(draftId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_DRAFTS, draftId);
}

export async function getAllDrafts(): Promise<Draft[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(STORE_DRAFTS, 'by-updatedAt');
  return all.reverse();
}

export async function getDraftsByStatus(status: 'draft' | 'finished'): Promise<Draft[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(STORE_DRAFTS, 'by-status', status);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const drafts = await db.getAll(STORE_DRAFTS);
  return JSON.stringify({ version: DB_VERSION, drafts, exportedAt: Date.now() }, null, 2);
}

export async function importData(jsonStr: string): Promise<number> {
  const data = JSON.parse(jsonStr);
  if (!data.drafts || !Array.isArray(data.drafts)) {
    throw new Error('无效的备份文件格式');
  }
  const db = await getDB();
  const tx = db.transaction(STORE_DRAFTS, 'readwrite');
  let count = 0;
  for (const draft of data.drafts) {
    await tx.store.put(draft);
    count++;
  }
  await tx.done;
  return count;
}

export function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
