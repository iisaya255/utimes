/**
 * 主题管理工具
 * 纯前端 localStorage 管理
 */

const THEME_STORAGE_KEY = 'utimes_theme';

/**
 * 应用主题到body
 */
export function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.className = 'dark';
    } else {
        document.body.className = '';
    }
}

/**
 * 从localStorage获取主题
 */
export function getThemeFromStorage() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    } catch (e) {
        return 'light';
    }
}

/**
 * 保存主题到localStorage
 */
export function saveThemeToStorage(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
        console.error('Failed to save theme to localStorage:', e);
    }
}

/**
 * 获取当前主题
 */
export function getCurrentTheme() {
    return document.body.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * 设置主题（仅 localStorage + DOM）
 */
export function setTheme(theme) {
    saveThemeToStorage(theme);
    applyTheme(theme);
    return theme;
}
