"""
UTimes API - Vercel Flask 入口
本地开发：DATABASE_MODE=sqlite（默认），无需 Supabase
生产环境：DATABASE_MODE=supabase
"""
import os
from flask import Flask
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "utimes-dev-secret")

# 本地开发时添加 CORS 支持
if os.environ.get("DATABASE_MODE", "sqlite") == "sqlite":
    try:
        from flask_cors import CORS
        CORS(app, resources={r"/api/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }})
    except ImportError:
        pass

# 注册路由
from api.routes.utimes_api import api as utimes_api_blueprint
app.register_blueprint(utimes_api_blueprint)

# Vercel 需要导出 app
# 本地开发时可以直接运行
if __name__ == "__main__":
    print(f"[UTimes] DATABASE_MODE={os.environ.get('DATABASE_MODE', 'sqlite')}")
    print(f"[UTimes] Running on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
