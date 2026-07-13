/**
 * Supabase 客户端初始化
 * 本地开发时 env 为空，不创建 client，API 请求不带 token
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

/**
 * 获取当前登录用户的 access token
 */
export async function getAccessToken() {
    if (!supabase) return null
    try {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token || null
    } catch {
        return null
    }
}

/**
 * 获取当前用户
 */
export async function getCurrentUser() {
    if (!supabase) return null
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

/**
 * 登出
 */
export async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
}
