"""
Record 数据模型 - 双数据源支持
本地开发使用 SQLite，生产环境使用 Supabase
通过环境变量 DATABASE_MODE 控制：sqlite / supabase（默认 sqlite）
"""
import os


def _get_backend():
    mode = os.environ.get("DATABASE_MODE", "sqlite")
    if mode == "supabase":
        from api.models._supabase_backend import RecordSupabase, ExtraSupabase, UsersSupabase
        return RecordSupabase, ExtraSupabase, UsersSupabase
    else:
        from api.models._sqlite_backend import RecordSQLite, ExtraSQLite, UserSQLite
        return RecordSQLite, ExtraSQLite, UserSQLite


class Record:
    """统一接口，代理到具体后端"""

    @classmethod
    def one(cls, **kwargs):
        backend, _, _ = _get_backend()
        return backend.one(**kwargs)

    @classmethod
    def all(cls, **kwargs):
        backend, _, _ = _get_backend()
        return backend.all(**kwargs)

    @classmethod
    def search(cls, content, user_id=None):
        backend, _, _ = _get_backend()
        return backend.search(content, user_id=user_id)

    @classmethod
    def update_if_exist(cls, user_id, date, content):
        backend, _, _ = _get_backend()
        return backend.update_if_exist(user_id, date, content)


class Extra:
    """统一接口，代理到具体后端"""

    @classmethod
    def one(cls, **kwargs):
        _, backend, _ = _get_backend()
        return backend.one(**kwargs)

    @classmethod
    def update(cls, id, **kwargs):
        _, backend, _ = _get_backend()
        return backend.update(id, **kwargs)

    @classmethod
    def create(cls, data: dict):
        _, backend, _ = _get_backend()
        return backend.create(data)


class Users:
    """统一接口，代理到具体后端"""

    @classmethod
    def all(cls):
        _, _, backend = _get_backend()
        return backend.all()

    @classmethod
    def one(cls, **kwargs):
        _, _, backend = _get_backend()
        return backend.one(**kwargs)

    @classmethod
    def update(cls, id, **kwargs):
        _, _, backend = _get_backend()
        return backend.update(id, **kwargs)

    @classmethod
    def create(cls, data: dict):
        _, _, backend = _get_backend()
        return backend.create(data)
