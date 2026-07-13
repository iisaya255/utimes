"""
SQLite 数据后端 - 用于本地开发和测试
返回 dict 格式，与 Supabase 后端保持一致的接口
"""
import json
import os
import sqlite3

DB_PATH = os.environ.get("SQLITE_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "local.db"))

_initialized = False

_SCHEMA_SQL = [
    """CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        date VARCHAR(8) NOT NULL,
        note TEXT DEFAULT '',
        items TEXT DEFAULT '[]',
        user_id TEXT DEFAULT '0'
    )""",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_records_date_user ON records(date, user_id)",
    """CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        user_id TEXT DEFAULT '0',
        ai_context TEXT DEFAULT '',
        daily_tips TEXT DEFAULT '',
        quick_links TEXT DEFAULT ''
    )""",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id)",
    """CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        user_id TEXT DEFAULT '',
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) DEFAULT '',
        avatar TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        is_public INTEGER DEFAULT 0
    )""",
]


def _get_db_path():
    path = DB_PATH
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    return path


def _ensure_tables(conn):
    global _initialized
    if _initialized:
        return
    cur = conn.cursor()
    for sql in _SCHEMA_SQL:
        cur.execute(sql)
    conn.commit()
    _initialized = True


def _get_conn():
    path = _get_db_path()
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    _ensure_tables(conn)
    return conn


def _row_to_dict(row):
    if row is None:
        return None
    return dict(row)


RECORD_COLUMNS = {"id", "date", "user_id", "note", "items"}
SETTINGS_COLUMNS = {"id", "user_id", "ai_context", "daily_tips", "quick_links"}
USER_COLUMNS = {"id", "user_id", "username", "name", "avatar", "bio", "is_public"}


def _validate_columns(kwargs, allowed):
    for k in kwargs:
        if k not in allowed:
            raise ValueError(f"Invalid column: {k}")


class RecordSQLite:
    TABLE = "records"

    @classmethod
    def one(cls, **kwargs):
        _validate_columns(kwargs, RECORD_COLUMNS)
        conn = _get_conn()
        conditions = " AND ".join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values())
        cur = conn.execute(f"SELECT * FROM records WHERE {conditions} LIMIT 1", values)
        row = cur.fetchone()
        conn.close()
        result = _row_to_dict(row)
        if result and isinstance(result.get('items'), str):
            result['items'] = json.loads(result['items'])
        return result

    @classmethod
    def all(cls, **kwargs):
        _validate_columns(kwargs, RECORD_COLUMNS)
        conn = _get_conn()
        if kwargs:
            conditions = " AND ".join(f"{k} = ?" for k in kwargs)
            values = list(kwargs.values())
            cur = conn.execute(
                f"SELECT * FROM records WHERE {conditions} ORDER BY updated_at DESC", values
            )
        else:
            cur = conn.execute("SELECT * FROM records ORDER BY updated_at DESC")
        rows = cur.fetchall()
        conn.close()
        results = []
        for r in rows:
            d = _row_to_dict(r)
            if isinstance(d.get('items'), str):
                d['items'] = json.loads(d['items'])
            results.append(d)
        return results

    @classmethod
    def search(cls, query, user_id=None):
        if not query:
            return []
        conn = _get_conn()
        escaped = query.replace("%", r"\%").replace("_", r"\_")
        # Search in both note and items fields
        if user_id is not None:
            cur = conn.execute(
                "SELECT * FROM records WHERE (note LIKE ? ESCAPE '\\' OR items LIKE ? ESCAPE '\\') AND user_id = ?",
                [f"%{escaped}%", f"%{escaped}%", str(user_id)]
            )
        else:
            cur = conn.execute(
                "SELECT * FROM records WHERE (note LIKE ? ESCAPE '\\' OR items LIKE ? ESCAPE '\\')",
                [f"%{escaped}%", f"%{escaped}%"]
            )
        rows = cur.fetchall()
        conn.close()
        results = []
        for r in rows:
            d = _row_to_dict(r)
            if isinstance(d.get('items'), str):
                d['items'] = json.loads(d['items'])
            results.append(d)
        return results

    @classmethod
    def update_if_exist(cls, user_id, date, note, items):
        conn = _get_conn()
        items_str = json.dumps(items, ensure_ascii=False) if isinstance(items, list) else items
        cur = conn.execute(
            "SELECT id FROM records WHERE date = ? AND user_id = ?", [date, str(user_id)]
        )
        existing = cur.fetchone()
        if existing:
            conn.execute(
                "UPDATE records SET note = ?, items = ?, updated_at = datetime('now') WHERE id = ?",
                [note, items_str, existing['id']]
            )
        else:
            conn.execute(
                "INSERT INTO records (date, note, items, user_id) VALUES (?, ?, ?, ?)",
                [date, note, items_str, str(user_id)]
            )
        conn.commit()
        conn.close()


class UserSettingsSQLite:
    TABLE = "user_settings"

    @classmethod
    def one(cls, **kwargs):
        _validate_columns(kwargs, SETTINGS_COLUMNS)
        conn = _get_conn()
        conditions = " AND ".join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values())
        cur = conn.execute(f"SELECT * FROM user_settings WHERE {conditions} LIMIT 1", values)
        row = cur.fetchone()
        conn.close()
        return _row_to_dict(row)

    @classmethod
    def update(cls, id, **kwargs):
        _validate_columns(kwargs, SETTINGS_COLUMNS)
        conn = _get_conn()
        sets = ", ".join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [id]
        conn.execute(f"UPDATE user_settings SET {sets}, updated_at = datetime('now') WHERE id = ?", values)
        conn.commit()
        conn.close()

    @classmethod
    def create(cls, data: dict):
        _validate_columns(data, SETTINGS_COLUMNS | {"user_id"})
        conn = _get_conn()
        keys = ", ".join(data.keys())
        placeholders = ", ".join("?" for _ in data)
        values = list(data.values())
        conn.execute(f"INSERT INTO user_settings ({keys}) VALUES ({placeholders})", values)
        conn.commit()
        conn.close()


class UserSQLite:
    @classmethod
    def all(cls):
        conn = _get_conn()
        cur = conn.execute("SELECT * FROM users ORDER BY id")
        rows = cur.fetchall()
        conn.close()
        return [_row_to_dict(r) for r in rows]

    @classmethod
    def one(cls, **kwargs):
        _validate_columns(kwargs, USER_COLUMNS)
        conn = _get_conn()
        conditions = " AND ".join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values())
        cur = conn.execute(f"SELECT * FROM users WHERE {conditions} LIMIT 1", values)
        row = cur.fetchone()
        conn.close()
        return _row_to_dict(row)

    @classmethod
    def update(cls, id, **kwargs):
        _validate_columns(kwargs, USER_COLUMNS)
        conn = _get_conn()
        sets = ", ".join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [id]
        conn.execute(f"UPDATE users SET {sets} WHERE id = ?", values)
        conn.commit()
        conn.close()

    @classmethod
    def create(cls, data: dict):
        _validate_columns(data, USER_COLUMNS | {"username"})
        conn = _get_conn()
        keys = ", ".join(data.keys())
        placeholders = ", ".join("?" for _ in data)
        values = list(data.values())
        conn.execute(f"INSERT INTO users ({keys}) VALUES ({placeholders})", values)
        conn.commit()
        conn.close()
