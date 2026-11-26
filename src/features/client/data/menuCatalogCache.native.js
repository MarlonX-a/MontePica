import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'montepica-menu.db';
const CACHE_ID = 'public-menu';
let databasePromise;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then(async (database) => {
        await database.execAsync(
          'CREATE TABLE IF NOT EXISTS menu_cache (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)',
        );
        return database;
      })
      .catch((error) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}

export async function saveMenuCatalog({ products, categories, updatedAt }) {
  const database = await getDatabase();
  const payload = JSON.stringify({ products, categories });
  await database.runAsync(
    'INSERT INTO menu_cache (id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at',
    CACHE_ID,
    payload,
    updatedAt,
  );
}

export async function getMenuCatalog() {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT payload, updated_at FROM menu_cache WHERE id = ?',
    CACHE_ID,
  );
  if (!row) return null;

  try {
    const catalog = JSON.parse(row.payload);
    if (!Array.isArray(catalog.products) || !Array.isArray(catalog.categories)) {
      return null;
    }
    return { ...catalog, updatedAt: row.updated_at };
  } catch {
    return null;
  }
}
