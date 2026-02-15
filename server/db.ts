// @ts-nocheck
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { fir_files as firFiles } from '../drizzle/schema.ts'

const sqlite = new Database('local.db')
sqlite.exec(`CREATE TABLE IF NOT EXISTS fir (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT,
  data TEXT,
  xml_content TEXT,
  status TEXT
);`)

export const db = drizzle(sqlite)

export function lastInsertId(){
  const row = sqlite.prepare('SELECT last_insert_rowid() AS id').get() as { id: number }
  return Number(row?.id ?? 0)
}