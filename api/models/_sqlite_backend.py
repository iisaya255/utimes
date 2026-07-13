"""
SQLite 数据后端 - 用于本地开发和测试
返回 dict 格式，与 Supabase 后端保持一致的接口

使用前请先运行初始化脚本：python -m scripts.init_db
如果数据库不存在会自动创建表结构。
"""
import os
import sqlite3

# 数据库文件路径
DB_PATH = os.environ.get("SQLITE_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "local.db"))

_initialized = False

_SCHEMA_SQL = [
    """CREATE TABLE IF NOT EXISTS device (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        date VARCHAR(30) NOT NULL,
        content TEXT DEFAULT '',
        user_id TEXT DEFAULT '0'
    )""",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_device_date_user ON device(date, user_id)",
    """CREATE TABLE IF NOT EXISTS extra (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        extra1 TEXT DEFAULT '',
        extra2 TEXT DEFAULT '',
        extra3 TEXT DEFAULT '',
        extra4 TEXT DEFAULT '',
        extra5 TEXT DEFAULT '',
        user_id TEXT DEFAULT '0'
    )""",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_extra_user ON extra(user_id)",
    """CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(50) NOT NULL,
        avatar TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        is_public INTEGER DEFAULT 0
    )""",
]


def _get_db_path():
    """获取数据库绝对路径"""
    path = DB_PATH
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    return path


def _ensure_tables(conn):
    """确保表存在（仅首次连接时执行）"""
    global _initialized
    if _initialized:
        return
    cur = conn.cursor()
    for sql in _SCHEMA_SQL:
        cur.execute(sql)
    conn.commit()
    _initialized = True


def _get_conn():
    """获取数据库连接"""
    path = _get_db_path()
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    _ensure_tables(conn)
    return conn


def _row_to_dict(row):
    """将 sqlite3.Row 转为 dict"""
    if row is None:
        return None
    return dict(row)


# 允许的列名白名单
RECORD_COLUMNS = {"id", "date", "user_id", "content"}
EXTRA_COLUMNS = {"id", "user_id", "extra1", "extra2", "extra3", "extra4", "extra5"}
USER_COLUMNS = {"id", "username", "name", "avatar", "bio", "is_public"}


def _validate_columns(kwargs, allowed):
    for k in kwargs:
        if k not in allowed:
            raise ValueError(f"Invalid column: {k}")


class RecordSQLite:
    TABLE = "device"

    @classmethod
    def one(cls, **kwargs):
        _validate_columns(kwargs, RECORD_COLUMNS)
        conn = _get_conn()
        conditions = " AND ".join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values())
        cur = conn.execute(f"SELECT * FROM device WHERE {conditions} LIMIT 1", values)
        row = cur.fetchone()
        conn.close()
        return _row_to_dict(row)

    @classmethod
    def all(cls, **kwargs):
        _validate_columns(kwargs, RECORD_COLUMNS)
        conn = _get_conn()
        if kwargs:
            conditions = " AND ".join(f"{k} = ?" for k in kwargs)
            values = list(kwargs.values())
            cur = conn.execute(
                f"SELECT * FROM device WHERE {conditions} ORDER BY updated_at DESC", values
            )
        else:
            cur = conn.execute("SELECT * FROM device ORDER BY updated_at DESC")
        rows = cur.fetchall()
        conn.close()
        return [_row_to_dict(r) for r in rows]

    @classmethod
    def search(cls, content, user_id=None):
        if not content:
            return []
        conn = _get_conn()
        # 转义 LIKE 通配符
        escaped = content.replace("%", r"\%").replace("_", r"\_")
        if user_id is not None:
            cur = conn.execute(
                "SELECT * FROM device WHERE content LIKE ? ESCAPE '\\' AND user_id = ?",
                [f"%{escaped}%", str(user_id)]
            )
        else:
            cur = conn.execute(
                "SELECT * FROM device WHERE content LIKE ? ESCAPE '\\'",
                [f"%{escaped}%"]
            )
        rows = cur.fetchall()
        conn.close()
        return [_row_to_dict(r) for r in rows]

    @classmethod
    def update_if_exist(cls, user_id, date, content):
        conn = _get_conn()
        cur = conn.execute(
            "SELECT id FROM device WHERE date = ? AND user_id = ?", [date, str(user_id)]
        )
        existing = cur.fetchone()
        if existing:
            conn.execute(
                "UPDATE device SET content = ?, updated_at = datetime('now') WHERE id = ?",
                [content, existing['id']]
            )
        else:
            conn.execute(
                "INSERT INTO device (date, content, user_id) VALUES (?, ?, ?)",
                [date, content, str(user_id)]
            )
        conn.commit()
        conn.close()


class ExtraSQLite:
    TABLE = "extra"

    @classmethod
    def one(cls, **kwargs):
        _validate_columns(kwargs, EXTRA_COLUMNS)
        conn = _get_conn()
        conditions = " AND ".join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values())
        cur = conn.execute(f"SELECT * FROM extra WHERE {conditions} LIMIT 1", values)
        row = cur.fetchone()
        conn.close()
        return _row_to_dict(row)

    @classmethod
    def update(cls, id, **kwargs):
        _validate_columns(kwargs, EXTRA_COLUMNS)
        conn = _get_conn()
        sets = ", ".join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [id]
        conn.execute(f"UPDATE extra SET {sets}, updated_at = datetime('now') WHERE id = ?", values)
        conn.commit()
        conn.close()

    @classmethod
    def create(cls, data: dict):
        _validate_columns(data, EXTRA_COLUMNS | {"user_id"})
        conn = _get_conn()
        keys = ", ".join(data.keys())
        placeholders = ", ".join("?" for _ in data)
        values = list(data.values())
        conn.execute(f"INSERT INTO extra ({keys}) VALUES ({placeholders})", values)
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
