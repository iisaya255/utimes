import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Calendar, Flex, Input, message } from 'antd'
import deviceApi from "../services/api"
import './calendar.css'

const { Search } = Input

// 组件文档
// https://ant.design/components/calendar-cn

function ICalendar() {
    const navigate = useNavigate()
    const [calendarData, setCalendarData] = useState({})
    const [stats, setStats] = useState({ total: 0, fit: 0, code: 0 })
    const [loading, setLoading] = useState(true)

    React.useEffect(() => {
        loadCalendarData()
    }, [])

    const loadCalendarData = async () => {
        setLoading(true)
        try {
            const resp = await deviceApi.getCalendar()
            setCalendarData(resp.calendar || {})
            setStats(resp.stats || { total: 0, fit: 0, code: 0 })
        } catch (error) {
            message.error(`加载日历数据失败: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const dateCellRender = (value, {type, originNode}) => {
        // 不处理月份单元格
        if (type == 'month') {
            return originNode
        }
        // type = date
        const dateStr = value.format('YYYY-MM-DD')
        const listData = calendarData[dateStr] || []
        return (
            <ul className="events">
                {listData.map((item, index) => (
                    <li key={index}>
                        <Badge status={item.type} text={item.content} />
                    </li>
                ))}
            </ul>
        )
    }

    const onSelect = (value, {source}) => {
        const dateStr = value.format('YYYYMMDD')
        if (source == 'date') {
            navigate(`/detail/${dateStr}`)
        }
    }

    const onSearch = (text) => {
        if (text.trim()) {
            navigate(`/search?text=${encodeURIComponent(text)}`)
        }
    }

    return (
        <Flex gap="large" align="flex-start" vertical style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }} className="calendar-wrapper">
            <div className="calendar-stats">
                <div className="stats-item">
                    <div className="stats-label">累计使用</div>
                    <div className="stats-value">{stats.total}</div>
                    <div className="stats-unit">天</div>
                </div>
                <div className="stats-divider"></div>
                <div className="stats-item">
                    <div className="stats-label">累计运动</div>
                    <div className="stats-value">{stats.fit}</div>
                    <div className="stats-unit">天</div>
                </div>
                <div className="stats-divider"></div>
                <div className="stats-item">
                    <div className="stats-label">累计编程</div>
                    <div className="stats-value">{stats.code}</div>
                    <div className="stats-unit">天</div>
                </div>
            </div>
            <Search
                placeholder="输入搜索内容"
                allowClear
                enterButton="查询"
                size="large"
                onSearch={onSearch}
                style={{ width: "60%", margin: "0 auto", maxWidth: '500px' }}
                className="calendar-search"
            />
            <Calendar
                cellRender={dateCellRender}
                onSelect={onSelect}
                loading={loading}
            />
        </Flex>
    )
}

export default ICalendar
