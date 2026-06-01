import threading
from datetime import datetime, timezone
import db
from levels import get_skill_info

_lock = threading.RLock()


def _parse_iso(s: str) -> datetime:
    s = s.strip().replace('Z', '+00:00')
    return datetime.fromisoformat(s)


def _skill_to_dict(row, conn) -> dict:
    total_hours = db.compute_total_hours(conn, row['id'])
    info = get_skill_info(total_hours)
    return {
        'id': row['id'],
        'name': row['name'],
        'emoji': row['emoji'],
        'created_at': row['created_at'],
        'total_hours': round(total_hours, 4),
        **info,
    }


class MasteryAPI:

    def get_all_skills(self):
        with _lock:
            conn = db.get_connection()
            try:
                rows = conn.execute(
                    "SELECT * FROM skills ORDER BY created_at ASC"
                ).fetchall()
                return [_skill_to_dict(r, conn) for r in rows]
            finally:
                conn.close()

    def add_skill(self, name: str, emoji: str):
        name = (name or '').strip()
        if not name:
            return {'error': 'Name is required'}
        emoji = (emoji or '').strip() or '⭐'
        with _lock:
            conn = db.get_connection()
            try:
                cur = conn.execute(
                    "INSERT INTO skills (name, emoji) VALUES (?, ?)", (name, emoji)
                )
                conn.commit()
                row = conn.execute(
                    "SELECT * FROM skills WHERE id = ?", (cur.lastrowid,)
                ).fetchone()
                return _skill_to_dict(row, conn)
            finally:
                conn.close()

    def delete_skill(self, skill_id: int):
        with _lock:
            conn = db.get_connection()
            try:
                conn.execute("DELETE FROM skills WHERE id = ?", (int(skill_id),))
                conn.commit()
                return True
            finally:
                conn.close()

    def rename_skill(self, skill_id: int, name: str, emoji: str):
        name = (name or '').strip()
        if not name:
            return {'error': 'Name is required'}
        emoji = (emoji or '').strip() or '⭐'
        with _lock:
            conn = db.get_connection()
            try:
                conn.execute(
                    "UPDATE skills SET name=?, emoji=? WHERE id=?",
                    (name, emoji, int(skill_id))
                )
                conn.commit()
                row = conn.execute(
                    "SELECT * FROM skills WHERE id = ?", (int(skill_id),)
                ).fetchone()
                if not row:
                    return {'error': 'Skill not found'}
                return _skill_to_dict(row, conn)
            finally:
                conn.close()

    def get_sessions(self, skill_id: int):
        with _lock:
            conn = db.get_connection()
            try:
                rows = conn.execute(
                    "SELECT * FROM sessions WHERE skill_id = ? ORDER BY start_time DESC",
                    (int(skill_id),)
                ).fetchall()
                result = []
                for r in rows:
                    result.append({
                        'id': r['id'],
                        'skill_id': r['skill_id'],
                        'start_time': r['start_time'],
                        'end_time': r['end_time'],
                        'duration_seconds': r['duration_seconds'],
                        'note': r['note'] or '',
                    })
                return result
            finally:
                conn.close()

    def add_session(self, skill_id: int, start_iso: str, end_iso: str, note: str = '', duration_seconds: int = None):
        try:
            start = _parse_iso(start_iso)
            end = _parse_iso(end_iso)
        except Exception as e:
            return {'error': f'Invalid datetime format: {e}'}
        if end <= start:
            return {'error': 'End time must be after start time'}
        if duration_seconds is None:
            duration_seconds = int((end - start).total_seconds())
        if duration_seconds <= 0:
            return {'error': 'Session duration must be positive'}
        with _lock:
            conn = db.get_connection()
            try:
                conn.execute(
                    "INSERT INTO sessions (skill_id, start_time, end_time, duration_seconds, note) VALUES (?, ?, ?, ?, ?)",
                    (int(skill_id), start_iso, end_iso, int(duration_seconds), note or None)
                )
                conn.commit()
                row = conn.execute(
                    "SELECT * FROM skills WHERE id = ?", (int(skill_id),)
                ).fetchone()
                if not row:
                    return {'error': 'Skill not found'}
                return _skill_to_dict(row, conn)
            finally:
                conn.close()

    def update_session(self, session_id: int, start_iso: str, end_iso: str, duration_seconds: int, note: str = ''):
        try:
            start = _parse_iso(start_iso)
            end = _parse_iso(end_iso)
        except Exception as e:
            return {'error': f'Invalid datetime format: {e}'}
        if end <= start:
            return {'error': 'End time must be after start time'}
        if int(duration_seconds) <= 0:
            return {'error': 'Duration must be positive'}
        with _lock:
            conn = db.get_connection()
            try:
                row = conn.execute(
                    "SELECT skill_id FROM sessions WHERE id = ?", (int(session_id),)
                ).fetchone()
                if not row:
                    return {'error': 'Session not found'}
                skill_id = row['skill_id']
                conn.execute(
                    "UPDATE sessions SET start_time=?, end_time=?, duration_seconds=?, note=? WHERE id=?",
                    (start_iso, end_iso, int(duration_seconds), note or None, int(session_id))
                )
                conn.commit()
                skill_row = conn.execute(
                    "SELECT * FROM skills WHERE id = ?", (skill_id,)
                ).fetchone()
                return _skill_to_dict(skill_row, conn)
            finally:
                conn.close()

    def delete_session(self, session_id: int):
        with _lock:
            conn = db.get_connection()
            try:
                row = conn.execute(
                    "SELECT skill_id FROM sessions WHERE id = ?", (int(session_id),)
                ).fetchone()
                if not row:
                    return {'error': 'Session not found'}
                skill_id = row['skill_id']
                conn.execute("DELETE FROM sessions WHERE id = ?", (int(session_id),))
                conn.commit()
                skill_row = conn.execute(
                    "SELECT * FROM skills WHERE id = ?", (skill_id,)
                ).fetchone()
                if not skill_row:
                    return {'error': 'Skill not found'}
                return _skill_to_dict(skill_row, conn)
            finally:
                conn.close()

    def get_skill_summary(self, skill_id: int):
        with _lock:
            conn = db.get_connection()
            try:
                row = conn.execute(
                    "SELECT * FROM skills WHERE id = ?", (int(skill_id),)
                ).fetchone()
                if not row:
                    return {'error': 'Skill not found'}
                return _skill_to_dict(row, conn)
            finally:
                conn.close()
