-- UTimes Supabase 数据库初始化 SQL
-- 在 Supabase SQL Editor 中执行

-- records 表：每日记录（原 device 表）
CREATE TABLE IF NOT EXISTS records (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    date VARCHAR(8) NOT NULL,
    note TEXT DEFAULT '',
    items JSONB DEFAULT '[]'::jsonb,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_records_date_user ON records(date, user_id);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);

-- user_settings 表：用户配置（原 extra 表）
CREATE TABLE IF NOT EXISTS user_settings (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ai_context TEXT DEFAULT '',
    daily_tips TEXT DEFAULT '',
    quick_links TEXT DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- users 表：用户公开信息
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) DEFAULT '',
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    is_public BOOLEAN DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- 启用 RLS
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- records RLS：用户只能访问自己的数据
CREATE POLICY "Users can view own records" ON records
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own records" ON records
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own records" ON records
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own records" ON records
    FOR DELETE USING (auth.uid() = user_id);

-- user_settings RLS：用户只能访问自己的配置
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- users RLS：公开信息任何人可读，自己可改
CREATE POLICY "Anyone can view users" ON users
    FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER records_updated_at
    BEFORE UPDATE ON records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 用户注册时自动创建 profile 和 settings
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_username VARCHAR(50);
BEGIN
    -- 从邮箱生成 username，处理冲突时追加随机后缀
    new_username := COALESCE(SPLIT_PART(NEW.email, '@', 1), 'user_' || LEFT(NEW.id::text, 8));

    -- 如果 username 已存在，追加随机后缀
    WHILE EXISTS (SELECT 1 FROM users WHERE username = new_username) LOOP
        new_username := SPLIT_PART(NEW.email, '@', 1) || '_' || FLOOR(RANDOM() * 10000)::text;
    END LOOP;

    INSERT INTO users (user_id, username, name)
    VALUES (NEW.id, new_username, '');

    INSERT INTO user_settings (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
