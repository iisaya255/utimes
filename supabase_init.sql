-- UTimes Supabase 数据库初始化 SQL
-- 在 Supabase SQL Editor 中执行

-- device 表：日常记录
CREATE TABLE IF NOT EXISTS device (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    date VARCHAR(30) NOT NULL,
    content TEXT DEFAULT '',
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 为 date + user_id 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_date_user ON device(date, user_id);

-- extra 表：用户配置
CREATE TABLE IF NOT EXISTS extra (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    extra1 TEXT DEFAULT '',
    extra2 TEXT DEFAULT '',
    extra3 TEXT DEFAULT '',
    extra4 TEXT DEFAULT '',
    extra5 TEXT DEFAULT '',
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 为 user_id 创建唯一索引（每个用户一条配置）
CREATE UNIQUE INDEX IF NOT EXISTS idx_extra_user ON extra(user_id);

-- 启用 RLS (Row Level Security)
ALTER TABLE device ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的数据
CREATE POLICY "Users can view own device data" ON device
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device data" ON device
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device data" ON device
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device data" ON device
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own extra data" ON extra
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own extra data" ON extra
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own extra data" ON extra
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own extra data" ON extra
    FOR DELETE USING (auth.uid() = user_id);

-- 允许 service_role 绕过 RLS（后端使用 service key 时）
-- 注意：使用 SUPABASE_SERVICE_KEY 的后端请求会自动绕过 RLS

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_updated_at
    BEFORE UPDATE ON device
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER extra_updated_at
    BEFORE UPDATE ON extra
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
