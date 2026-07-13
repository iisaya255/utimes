"""
Supabase 数据后端
"""
from datetime import datetime, timezone
from api.services.supabase_client import get_supabase


class RecordSupabase:
    TABLE = "device"

    @classmethod
    def one(cls, **kwargs):
        client = get_supabase()
        query = client.table(cls.TABLE).select("*")
        for key, value in kwargs.items():
            query = query.eq(key, value)
        result = query.limit(1).execute()
        if result.data:
            return result.data[0]
        return None

    @classmethod
    def all(cls, **kwargs):
        client = get_supabase()
        query = client.table(cls.TABLE).select("*")
        for key, value in kwargs.items():
            query = query.eq(key, value)
        result = query.order("updated_at", desc=True).execute()
        return result.data or []

    @classmethod
    def search(cls, content, user_id=None):
        if not content:
            return []
        client = get_supabase()
        query = client.table(cls.TABLE).select("*").ilike("content", f"%{content}%")
        if user_id is not None:
            query = query.eq("user_id", user_id)
        result = query.execute()
        return result.data or []

    @classmethod
    def update_if_exist(cls, user_id, date, content):
        client = get_supabase()
        existing = cls.one(date=date, user_id=user_id)
        now = datetime.now(timezone.utc).isoformat()
        if existing:
            client.table(cls.TABLE).update({
                "content": content,
                "updated_at": now,
            }).eq("id", existing["id"]).execute()
        else:
            client.table(cls.TABLE).insert({
                "date": date,
                "content": content,
                "user_id": user_id,
            }).execute()


class UsersSupabase:
    TABLE = "users"

    @classmethod
    def all(cls):
        client = get_supabase()
        result = client.table(cls.TABLE).select("*").order("id").execute()
        return result.data or []

    @classmethod
    def one(cls, **kwargs):
        client = get_supabase()
        query = client.table(cls.TABLE).select("*")
        for key, value in kwargs.items():
            query = query.eq(key, value)
        result = query.limit(1).execute()
        if result.data:
            return result.data[0]
        return None

    @classmethod
    def update(cls, id, **kwargs):
        client = get_supabase()
        client.table(cls.TABLE).update(kwargs).eq("id", id).execute()

    @classmethod
    def create(cls, data: dict):
        client = get_supabase()
        client.table(cls.TABLE).insert(data).execute()


class ExtraSupabase:
    TABLE = "extra"

    @classmethod
    def one(cls, **kwargs):
        client = get_supabase()
        query = client.table(cls.TABLE).select("*")
        for key, value in kwargs.items():
            query = query.eq(key, value)
        result = query.limit(1).execute()
        if result.data:
            return result.data[0]
        return None

    @classmethod
    def update(cls, id, **kwargs):
        client = get_supabase()
        client.table(cls.TABLE).update(kwargs).eq("id", id).execute()

    @classmethod
    def create(cls, data: dict):
        client = get_supabase()
        client.table(cls.TABLE).insert(data).execute()
