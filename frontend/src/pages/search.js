import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Input, Space, message } from 'antd'
import deviceApi from "../services/api"
import './search.css'

const { Search } = Input

function ISearch() {
    const location = useLocation()
    const navigate = useNavigate()
    const searchParams = new URLSearchParams(location.search)
    const initialQuery = searchParams.get('text') || ''

    const [query, setQuery] = useState(initialQuery)
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)

    React.useEffect(() => {
        if (initialQuery) {
            performSearch(initialQuery)
        }
    }, [initialQuery])

    const performSearch = async (searchText) => {
        if (!searchText.trim()) {
            setData([])
            return
        }

        setLoading(true)
        try {
            const results = await deviceApi.search(searchText)
            setData(results || [])
        } catch (error) {
            message.error(`搜索失败: ${error.message}`)
            setData([])
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (value) => {
        setQuery(value)
        navigate(`/search?text=${encodeURIComponent(value)}`)
        performSearch(value)
    }

    const renderList = () => {
        if (loading) {
            return (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <p style={{ fontSize: '18px', color: '#64748b' }}>搜索中...</p>
                </div>
            )
        }

        if (data.length === 0 && query) {
            return (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <p style={{ fontSize: '18px', color: '#64748b' }}>
                        <span>没有找到相关结果</span>
                    </p>
                </div>
            )
        } else {
            return data.map((item, index) => {
                return (
                    <div key={index} className="container-item">
                        <p>
                            <a className="item-comment" href={`./detail/${item.date}`}>
                                {item.date}
                            </a>
                        </p>
                        <pre>{item.content}</pre>
                    </div>
                )
            })
        }
    }

    return (
        <Space 
            direction="vertical" 
            style={{ width: '100%', padding: '40px', maxWidth: '1200px', margin: '0 auto' }} 
            size="large"
            className="search-container"
        >
            <div style={{ textAlign: 'center', marginBottom: '20px' }} className="search-header">
                <h2 style={{ fontSize: '28px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>搜索内容</h2>
                <p style={{ color: '#64748b', fontSize: '16px' }}>输入关键词搜索您的日常记录</p>
            </div>
            <Search
                placeholder="输入搜索关键词"
                allowClear
                enterButton="查询"
                size="large"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onSearch={handleSearch}
                loading={loading}
                style={{ maxWidth: '600px', margin: '0 auto', display: 'block' }}
                className="search-input"
            />
            {query && (
                <div style={{ textAlign: 'center', margin: '24px 0' }} className="search-results-header">
                    <p style={{ fontSize: '18px', color: '#475569' }}>
                        搜索 <span style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '20px' }}>{query}</span> 的结果:
                    </p>
                </div>
            )}
            <div style={{ width: '100%' }}>
                {renderList()}
            </div>
        </Space>
    )
}

export default ISearch
