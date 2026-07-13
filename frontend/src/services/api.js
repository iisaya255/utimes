/**
 * API服务层
 * 统一管理所有API请求，使用 Supabase JWT 认证
 */
import { getAccessToken } from './supabase'

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

class ApiError extends Error {
    constructor(message, code, data) {
        super(message);
        this.code = code;
        this.data = data;
    }
}

/**
 * 统一的API请求方法
 */
async function request(url, options = {}) {
    const token = await getAccessToken()

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`
    }

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, config);

        if (response.status === 401) {
            window.location.href = '/login'
            throw new ApiError('未登录', 401)
        }

        const data = await response.json();

        if (!data.success) {
            throw new ApiError(data.message || '请求失败', data.code || response.status, data.data);
        }

        return data.data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(error.message || '网络错误', 500);
    }
}

/**
 * GET请求
 */
function get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return request(fullUrl, { method: 'GET' });
}

/**
 * POST请求
 */
function post(url, data) {
    return request(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Device API
 */
export const deviceApi = {
    /**
     * 获取指定日期的数据
     */
    getData: (date) => get('/api/render', { date }),

    /**
     * 保存数据
     * @param {string} date - 日期
     * @param {object} data - 数据对象，格式：{ date, note, dataList } 或 { date, content: {...} }
     */
    save: (date, data) => {
        // 如果data已经有date字段，直接使用；否则使用传入的date
        const saveData = data.date ? data : { date, ...data }
        return post('/api/save', saveData)
    },

    /**
     * 获取详情数据
     */
    getDetail: (date) => get(`/api/detail/${date}`),

    /**
     * 获取编辑数据
     */
    getEdit: (date) => get(`/api/edit/${date}`),

    /**
     * 搜索
     */
    search: (query) => {
        if (typeof query === 'string') {
            return post('/api/search', { query });
        }
        return get('/api/search', query);
    },

    /**
     * 获取日历数据
     */
    getCalendar: () => get('/api/calendar'),

    migrate: (date, target) => post(`/api/migrate/${date}/${target}`, {}),

    /**
     * 获取配置
     */
    getConfig: () => get('/api/config'),

    /**
     * 保存配置
     */
    saveConfig: (config) => post('/api/config', config),

    /**
     * 总结最近一周的数据
     */
    summarizeWeek: () => post('/api/openai/summarize-week'),

    /**
     * 规划今天要做的事情
     */
    planToday: () => post('/api/openai/plan-today'),

    /**
     * 获取用户列表
     */
    getUsers:() => get('/api/users'),

    /**
     * 获取用户公开信息
     */
    getProfile: (username) => get(`/api/profile/${username}`),

    /**
     * 获取用户公开的某天记录
     */
    getPublicDetail: (username, date) => get(`/api/profile/${username}/detail/${date}`),

    /**
     * 更新公开设置
     */
    updateProfileSettings: (data) => post('/api/profile/settings', data),
};

export default deviceApi;
