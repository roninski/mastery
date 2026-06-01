import sqlite3
import os
import sys
import threading


def _get_db_path():
    if hasattr(sys, 'getandroidapilevel'):
        data_dir = os.environ.get('ANDROID_PRIVATE', '.')
    else:
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    return os.path.join(data_dir, 'mastery.db')


DB_PATH = _get_db_path()
_lock = threading.RLock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS skills (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    emoji      TEXT    NOT NULL DEFAULT '⭐',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id         INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    start_time       TEXT    NOT NULL,
    end_time         TEXT    NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    note             TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_skill_id ON sessions(skill_id);
"""


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    with _lock:
        conn = get_connection()
        try:
            conn.executescript(SCHEMA)
            _migrate(conn)
            conn.commit()
        finally:
            conn.close()


def _migrate(conn):
    cols = {row[1] for row in conn.execute("PRAGMA table_info(sessions)").fetchall()}
    if 'duration_seconds' not in cols:
        conn.execute("ALTER TABLE sessions ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0")
        conn.execute("""
            UPDATE sessions
            SET duration_seconds = CAST((julianday(end_time) - julianday(start_time)) * 86400 AS INTEGER)
        """)


def compute_total_hours(conn, skill_id: int) -> float:
    row = conn.execute("""
        SELECT COALESCE(SUM(duration_seconds), 0) AS total_secs
        FROM sessions WHERE skill_id = ?
    """, (skill_id,)).fetchone()
    return float(row['total_secs'] or 0.0) / 3600.0
