import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { message } from 'antd'

import TodoHeader from "../components/TodoHeader"
import TodoTable from "../components/TodoTable"
import TimeUtils from "../utils"
import deviceApi from "../services/api"
import './detail.css'

function PublicDetail() {
    const params = useParams()
    const navigate = useNavigate()
    const username = params.username
    const date = params.date || TimeUtils.today()

    const ref = React.useRef(null)
    const [loading, setLoading] = React.useState(true)
    const [forbidden, setForbidden] = React.useState(false)
    const [data, setData] = React.useState({
        time: date,
        note: "",
        items: [],
    })

    const loadData = React.useCallback(async () => {
        setLoading(true)
        setForbidden(false)
        try {
            const resp = await deviceApi.getPublicDetail(username, date)
            setData({
                time: resp.time || date,
                note: resp.note || "",
                items: resp.items || [],
            })
        } catch (error) {
            if (error.code === 403) {
                setForbidden(true)
            } else {
                message.error(error.message || '加载失败')
            }
        } finally {
            setLoading(false)
        }
    }, [username, date])

    React.useEffect(() => {
        loadData()
    }, [loadData])

    // 渲染数据到DOM
    React.useEffect(() => {
        if (!loading && !forbidden && ref.current) {
            renderDataToDOM()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, loading, forbidden])

    const renderDataToDOM = () => {
        const container = ref.current
        if (!container) return

        const todoElement = container.querySelector('.container-todo')
        if (todoElement) {
            const todoContent = data.note || ''
            todoElement.innerHTML = `<div class="container-todo-content">${todoContent.replace(/\n/g, '<br>')}</div>`
        }

        const tableInner = container.querySelector('.ne-table')
        if (tableInner && data.items && data.items.length > 0) {
            const colgroup = tableInner.querySelector('colgroup')
            const header = tableInner.querySelector('thead.ne-tr')
            tableInner.innerHTML = ''
            if (colgroup) tableInner.appendChild(colgroup)
            if (header) tableInner.appendChild(header)
            data.items.forEach((item) => {
                const tbody = document.createElement('tbody')
                tbody.className = 'ne-table-inner'
                tbody.innerHTML = `
                    <tr class="ne-tr">
                        <td class="ne-td ne-td-middle" rowspan="3" data-col="0">
                            ${formatText(item.project || '')}
                        </td>
                        <td class="ne-td ne-td-middle ne-td-select" rowspan="3" data-col="1">
                            ${formatText(item.time || '')}
                        </td>
                        <td class="ne-td ne-td-middle ne-td-select" rowspan="3" data-col="2">
                            ${item.happy || 1}
                        </td>
                        <td class="ne-td ne-td-middle ne-td-select" rowspan="3" data-col="3">
                            ${item.meaningful || 1}
                        </td>
                        <td class="ne-td ne-td-middle" rowspan="3" data-col="4">
                            <ne-p class="score avg ne-td-select">${(item.happy * 0.5 + item.meaningful * 0.5).toFixed(1)}</ne-p>
                        </td>
                        <td class="ne-td" data-col="5">
                            ${formatText(item.extra?.happy || '')}
                        </td>
                    </tr>
                    <tr class="ne-tr">
                        <td class="ne-td" data-col="5">
                            ${formatText(item.extra?.meaningful || '')}
                        </td>
                    </tr>
                    <tr class="ne-tr">
                        <td class="ne-td" data-col="5">
                            ${formatText(item.extra?.better || '')}
                        </td>
                    </tr>
                `
                tableInner.appendChild(tbody)
            })
        }
    }

    const formatText = (text) => {
        if (!text || text.trim() === '') {
            return '<ne-p><br></ne-p>'
        }
        return text.split('\n').map(line => {
            const trimmedLine = line.trim()
            if (trimmedLine === '') {
                return '<ne-p><br></ne-p>'
            }
            if (trimmedLine.startsWith('http')) {
                return `<ne-p><a href="${trimmedLine}" target="_blank">${trimmedLine}</a></ne-p>`
            } else {
                return `<ne-p>${line}</ne-p>`
            }
        }).join('')
    }

    // 快捷键：左右切换日期
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return
            }
            if (e.key === 'a' || e.key === 'ArrowLeft') {
                e.preventDefault()
                navigate(`/${username}/detail/${TimeUtils.getPreviousDay(date)}`)
            }
            if (e.key === 'd' || e.key === 'ArrowRight') {
                e.preventDefault()
                navigate(`/${username}/detail/${TimeUtils.getNextDay(date)}`)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [date, navigate, username])

    if (loading) {
        return <div className="container">加载中...</div>
    }

    if (forbidden) {
        return <div style={{ textAlign: 'center', padding: 60 }}>该用户未公开记录</div>
    }

    return (
        <div className="container" ref={ref}>
            <TodoHeader time={data.time} note={data.note} />
            <TodoTable items={data.items} />
        </div>
    )
}

export default PublicDetail
