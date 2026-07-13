"""
Supabase 客户端初始化
"""
import os
from supabase import create_client, Client

_client = None


def get_supabase() -> Client:
    """获取 Supabase 客户端单例"""
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
        _client = create_client(url, key)
    return _client
