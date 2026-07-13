"""
Supabase 数据后端
"""
import json
from datetime import datetime, timezone
from api.services.supabase_client import get_supabase


class RecordSupabase:
    TABLE = "records"

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
    def search(cls, query, user_id=None):
        if not query:
            return []
        client = get_supabase()
        # Search in note field using ilike
        q = client.table(cls.TABLE).select("*").ilike("note", f"%{query}%")
        if user_id is not None:
            q = q.eq("user_id", user_id)
        note_results = q.execute().data or []

        # Also search in items JSONB (cast to text for LIKE search)
        q2 = client.table(cls.TABLE).select("*").ilike("items::text", f"%{query}%")
        if user_id is not None:
            q2 = q2.eq("user_id", user_id)
        items_results = q2.execute().data or []

        # Merge and deduplicate by id
        seen = set()
        merged = []
        for r in note_results + items_results:
            if r['id'] not in seen:
                seen.add(r['id'])
                merged.append(r)
        return merged

    @classmethod
    def update_if_exist(cls, user_id, date, note, items):
        client = get_supabase()
        items_json = items if isinstance(items, list) else json.loads(items)
        existing = cls.one(date=date, user_id=user_id)
        now = datetime.now(timezone.utc).isoformat()
        if existing:
            client.table(cls.TABLE).update({
                "note": note,
                "items": items_json,
                "updated_at": now,
            }).eq("id", existing["id"]).execute()
        else:
            client.table(cls.TABLE).insert({
                "date": date,
                "note": note,
                "items": items_json,
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


class UserSettingsSupabase:
    TABLE = "user_settings"

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
