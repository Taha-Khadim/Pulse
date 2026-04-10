import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = () => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('pulse.db');
  }
  return dbInstance;
};

export const initDatabase = async () => {
  const db = getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS level_stats (
      level_id INTEGER PRIMARY KEY NOT NULL,
      status TEXT NOT NULL DEFAULT 'locked',
      attempts INTEGER NOT NULL DEFAULT 0,
      best_time_ms INTEGER,
      completed_at TEXT
    );
  `);
};

export const metaGet = async (key: string): Promise<string | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
};

export const metaSet = async (key: string, value: string) => {
  const db = getDb();
  await db.runAsync(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
};

export const verifySaveIntegrity = async (): Promise<boolean> => {
  try {
    const raw = await metaGet('progress_json');
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return typeof parsed.currentLevel === 'number';
  } catch {
    return false;
  }
};
