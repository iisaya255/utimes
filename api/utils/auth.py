"""
认证工具 - 支持两种模式：
- 本地开发 (DATABASE_MODE=sqlite)：跳过认证，使用 mock 用户
- 生产环境 (DATABASE_MODE=supabase)：验证 Supabase JWT token
"""
import functools
import os
from flask import request, jsonify


class MockUser:
    """本地开发用的 mock 用户"""
    def __init__(self):
        self.id = "0"
        self.email = "dev@localhost"


_auth_client = None


def _get_auth_client():
    """获取用于鉴权的 Supabase 客户端单例"""
    global _auth_client
    if _auth_client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_ANON_KEY", "")
        if not url or not key:
            return None
        from supabase import create_client
        _auth_client = create_client(url, key)
    return _auth_client


def get_user_from_token(token: str):
    """通过 Supabase 验证 JWT token 并返回用户信息"""
    client = _get_auth_client()
    if not client:
        return None
    try:
        user_response = client.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user
        return None
    except Exception:
        return None


def login_required(route_function):
    """验证请求中的认证信息，本地开发时自动通过"""
    @functools.wraps(route_function)
    def f(*args, **kwargs):
        database_mode = os.environ.get("DATABASE_MODE", "sqlite")

        # 本地开发模式：跳过认证
        if database_mode == "sqlite":
            request.user = MockUser()
            return route_function(*args, **kwargs)

        # 生产模式：验证 Supabase JWT
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({
                "success": False,
                "message": "未登录",
                "code": 401
            }), 401

        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user:
            return jsonify({
                "success": False,
                "message": "认证失败",
                "code": 401
            }), 401

        request.user = user
        return route_function(*args, **kwargs)
    return f
