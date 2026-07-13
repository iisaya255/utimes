"""
数据模型代理层 - 双数据源支持
本地开发使用 SQLite，生产环境使用 Supabase
通过环境变量 DATABASE_MODE 控制：sqlite / supabase（默认 sqlite）
"""
import os


def _get_backend():
    mode = os.environ.get("DATABASE_MODE", "sqlite")
    if mode == "supabase":
        from api.models._supabase_backend import RecordSupabase, UserSettingsSupabase, UsersSupabase
        return RecordSupabase, UserSettingsSupabase, UsersSupabase
    else:
        from api.models._sqlite_backend import RecordSQLite, UserSettingsSQLite, UserSQLite
        return RecordSQLite, UserSettingsSQLite, UserSQLite


class Record:
    """每日记录"""

    @classmethod
    def one(cls, **kwargs):
        backend, _, _ = _get_backend()
        return backend.one(**kwargs)

    @classmethod
    def all(cls, **kwargs):
        backend, _, _ = _get_backend()
        return backend.all(**kwargs)

    @classmethod
    def search(cls, query, user_id=None):
        backend, _, _ = _get_backend()
        return backend.search(query, user_id=user_id)

    @classmethod
    def update_if_exist(cls, user_id, date, note, items):
        backend, _, _ = _get_backend()
        return backend.update_if_exist(user_id, date, note, items)


class UserSettings:
    """用户配置"""

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
    """用户公开信息"""

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
