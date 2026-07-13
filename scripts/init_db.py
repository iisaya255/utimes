"""
UTimes 数据库初始化脚本
用法：
    python -m scripts.init_db              # 初始化本地 SQLite
    python -m scripts.init_db --migrate    # 从旧 index_db 迁移数据
"""
import argparse
import os
import sqlite3
import sys

# 项目根目录
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB_PATH = os.environ.get("SQLITE_DB_PATH", os.path.join(ROOT_DIR, "local.db"))


def init_sqlite(db_path=None):
    """创建 SQLite 数据库表"""
    path = db_path or DEFAULT_DB_PATH
    print(f"初始化数据库: {path}")

    conn = sqlite3.connect(path)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS device (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            date VARCHAR(30) NOT NULL,
            content TEXT DEFAULT '',
            user_id TEXT DEFAULT '0'
        )
    """)
    cur.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_device_date_user
        ON device(date, user_id)
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS extra (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            extra1 TEXT DEFAULT '',
            extra2 TEXT DEFAULT '',
            extra3 TEXT DEFAULT '',
            extra4 TEXT DEFAULT '',
            extra5 TEXT DEFAULT '',
            user_id TEXT DEFAULT '0'
        )
    """)
    cur.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_extra_user
        ON extra(user_id)
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT DEFAULT (datetime('now')),
            username VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(50) NOT NULL,
            avatar TEXT DEFAULT '',
            bio TEXT DEFAULT '',
            is_public INTEGER DEFAULT 0
        )
    """)

    conn.commit()
    conn.close()
    print("数据库初始化完成")


def migrate_from_old_db(old_db_path, new_db_path=None):
    """从旧的 index_db.db 迁移数据到新数据库"""
    new_path = new_db_path or DEFAULT_DB_PATH

    if not os.path.exists(old_db_path):
        print(f"错误: 旧数据库不存在: {old_db_path}")
        sys.exit(1)

    # 确保新数据库已初始化
    init_sqlite(new_path)

    old_conn = sqlite3.connect(old_db_path)
    old_conn.row_factory = sqlite3.Row
    new_conn = sqlite3.connect(new_path)

    # 迁移 device 表（表名保留为 device）
    old_cur = old_conn.execute("SELECT * FROM device")
    rows = old_cur.fetchall()
    migrated = 0
    for row in rows:
        try:
            new_conn.execute(
                "INSERT OR IGNORE INTO device (date, content, user_id, created_at, updated_at) VALUES (?, ?, ?, datetime(?, 'unixepoch'), datetime(?, 'unixepoch'))",
                [row['date'], row['content'], str(row['user_id']),
                 str(row['created_time']), str(row['updated_time'])]
            )
            migrated += 1
        except Exception as e:
            print(f"  跳过 record id={row['id']}: {e}")
    new_conn.commit()
    print(f"迁移 record 表: {migrated}/{len(rows)} 条记录")

    # 迁移 extra 表
    try:
        old_cur = old_conn.execute("SELECT * FROM extra")
        rows = old_cur.fetchall()
        migrated = 0
        for row in rows:
            try:
                new_conn.execute(
                    "INSERT OR IGNORE INTO extra (extra1, extra2, extra3, extra4, extra5, user_id) VALUES (?, ?, ?, ?, ?, ?)",
                    [row['extra1'], row['extra2'], row['extra3'],
                     row['extra4'], row['extra5'], str(row['user_id'])]
                )
                migrated += 1
            except Exception as e:
                print(f"  跳过 extra record id={row['id']}: {e}")
        new_conn.commit()
        print(f"迁移 extra 表: {migrated}/{len(rows)} 条记录")
    except Exception as e:
        print(f"跳过 extra 表迁移: {e}")

    old_conn.close()
    new_conn.close()
    print("数据迁移完成")


def main():
    parser = argparse.ArgumentParser(description="UTimes 数据库初始化与迁移")
    parser.add_argument("--migrate", metavar="OLD_DB_PATH",
                        help="从旧数据库迁移数据 (如 c:/index_db.db)")
    parser.add_argument("--db", metavar="DB_PATH",
                        help=f"目标数据库路径 (默认 {DEFAULT_DB_PATH})")
    args = parser.parse_args()

    if args.migrate:
        migrate_from_old_db(args.migrate, args.db)
    else:
        init_sqlite(args.db)


if __name__ == "__main__":
    main()
