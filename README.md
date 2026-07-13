# UTimes

日常记录与规划工具，支持 AI 辅助总结和任务规划。

## 技术栈

- **后端**：Flask (Python) - Vercel Serverless
- **前端**：React 18 + Ant Design + React Router
- **数据库**：本地 SQLite / 生产 Supabase (PostgreSQL)
- **认证**：本地跳过 / 生产 Supabase Auth
- **AI**：阿里云 DashScope (qwen3-max)

## 环境要求

| 工具 | 版本 |
|------|------|
| Python | 3.12（3.14 暂不支持 pydantic-core） |
| Node.js | >= 18 |
| npm | >= 9 |

## 本地开发

### 启动后端

```bash
cd utimes-project

# 创建 .env 文件（可选，默认即 sqlite 模式）
cp .env.example .env

# 安装依赖
pip install -r requirements.txt

# 初始化数据库（首次使用）
python -m scripts.init_db

# 如需从旧项目迁移数据
python -m scripts.init_db --migrate c:/index_db.db

# 启动（默认 sqlite 模式，无需配置）
python -m api.index
```

后端运行在 http://localhost:5000

如需使用旧项目的 SQLite 数据库：

```bash
# Windows
set SQLITE_DB_PATH=c:/index_db.db
python -m api.index

# Linux/Mac
SQLITE_DB_PATH=./index_db.db python -m api.index
```

### 启动前端

```bash
cd utimes-project/frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

前端运行在 http://localhost:3000

### 本地模式说明

- `DATABASE_MODE=sqlite`（默认）：使用本地 SQLite，自动创建 `local.db`
- 认证自动跳过，使用 mock 用户
- 无需配置 Supabase 或任何外部服务
- AI 功能需要设置 `DASHSCOPE_API_KEY` 环境变量

## 生产部署 (Vercel + Supabase)

### 1. Supabase 配置

在 Supabase 控制台创建项目后，执行 `supabase_init.sql` 中的 SQL 建表。

### 2. Vercel 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_MODE` | 设为 `supabase` |
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `DASHSCOPE_API_KEY` | 阿里云 DashScope API key |

### 3. 前端环境变量

在 `frontend/.env` 中配置：

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 部署

```bash
vercel deploy
```

## API 接口

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/render?date=YYYYMMDD` | GET | 获取指定日期数据 |
| `/api/save` | POST | 保存日期数据 |
| `/api/detail/<date>` | GET | 获取详情 |
| `/api/edit/<date>` | GET | 获取编辑数据（含配置） |
| `/api/search` | GET/POST | 搜索 |
| `/api/calendar` | GET | 日历数据 |
| `/api/migrate/<date>/<target>` | GET/POST | 迁移未完成项 |
| `/api/config` | GET/POST | 用户配置 |
| `/api/openai/summarize-week` | POST | AI 周总结 |
| `/api/openai/plan-today` | POST | AI 今日规划 |

## 数据迁移

从旧项目 SQLite 迁移到 Supabase：

```bash
# 导出旧数据为 CSV
sqlite3 c:/index_db.db ".mode csv" ".headers on" ".output device.csv" "SELECT * FROM device;"
sqlite3 c:/index_db.db ".mode csv" ".headers on" ".output extra.csv" "SELECT * FROM extra;"

# 通过 Supabase Dashboard 导入 CSV，或使用 psql
```

注意：迁移时 `user_id` 字段需要从整数 `0` 映射为 Supabase Auth 的 UUID。
