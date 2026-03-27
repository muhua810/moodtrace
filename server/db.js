import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'mood_calendar.db'))

// 开启 WAL 模式提升性能
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 初始化表结构
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    text TEXT NOT NULL,
    mood TEXT NOT NULL,
    intensity INTEGER DEFAULT 3,
    mood_label TEXT DEFAULT '',
    suggestion TEXT DEFAULT '',
    keywords TEXT DEFAULT '[]',
    analysis TEXT DEFAULT '',
    confidence REAL DEFAULT 0.5,
    method TEXT DEFAULT 'keyword',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_records_user_date ON records(user_id, date);
`)

export default db
