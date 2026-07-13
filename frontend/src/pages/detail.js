import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { message } from 'antd'

import TodoHeader from "../components/TodoHeader"
import TodoTable from "../components/TodoTable"
import TimeUtils from "../utils"
import deviceApi from "../services/api"
import './detail.css'

function Detail() {
    const params = useParams()
    const navigate = useNavigate()
    const date = params.date || TimeUtils.today()

    const ref = React.useRef(null)
    const [loading, setLoading] = React.useState(true)
    const [data, setData] = React.useState({
        time: date,
        blur: false,
        extraInfo: "tips",
        note: "",
        items: [],
    })

    const loadData = React.useCallback(async () => {
        setLoading(true)
        try {
            const resp = await deviceApi.getDetail(date)
            const blurState = resp.blur || false
            setData({
                time: resp.time || date,
                blur: blurState,
                extraInfo: resp.extraInfo || "tips",
                note: resp.note || "",
                items: resp.items || [],
            })
        } catch (error) {
            message.error(`加载数据失败: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }, [date])

    React.useEffect(() => {
        loadData()
    }, [loadData])

    // 渲染数据到DOM
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => {
        if (!loading && ref.current) {
            renderDataToDOM()
            // 如果blur状态为true，应用打码效果
            if (data.blur) {
                setTimeout(() => {
                    const blurElements = ref.current?.querySelectorAll('.container-todo, .container-limit, tbody.ne-table-inner')
                    blurElements?.forEach(el => {
                        el.classList.add('blur')
                    })
                }, 0)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, loading])

    const renderDataToDOM = () => {
        const container = ref.current
        if (!container) return

        // 渲染TODO内容
        const todoElement = container.querySelector('.container-todo')
        if (todoElement) {
            const todoContent = data.note || ''
            todoElement.innerHTML = `<div class="container-todo-content">${todoContent.replace(/\n/g, '<br>')}</div>`
        }

        // 渲染表格数据
        const tableInner = container.querySelector('.ne-table')
        if (tableInner && data.items && data.items.length > 0) {
            const colgroup = tableInner.querySelector('colgroup')
            const header = tableInner.querySelector('thead.ne-tr')
            tableInner.innerHTML = ''
            // 重绘表头和表头配置
            if (colgroup) {
                tableInner.appendChild(colgroup)
            }
            if (header) {
                tableInner.appendChild(header)
            }
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
        if (!text || text.trim() == '') {
            return '<ne-p><br></ne-p>'
        }
        return text.split('\n').map(line => {
            const trimmedLine = line.trim()
            // 处理空行：空行必须包含 <br> 才能正确显示换行
            if (trimmedLine === '') {
                return '<ne-p><br></ne-p>'
            }
            if (trimmedLine.startsWith('http')) {
                return `<ne-p><a href="${trimmedLine}" target="_blank">${trimmedLine}</a></ne-p>`
            } else if (trimmedLine.toLowerCase().startsWith('todo')) {
                return `<ne-p><todo>${line}</todo></ne-p>`
            } else {
                return `<ne-p>${line}</ne-p>`
            }
        }).join('')
    }

    // 快捷键支持
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            // 如果正在输入，不触发快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable || e.altKey) {
                return
            }

            // a键或左箭头：前一天
            if (e.key === 'a' || e.key === 'ArrowLeft') {
                e.preventDefault()
                const yesterday = TimeUtils.getPreviousDay(date)
                navigate(`/detail/${yesterday}`)
            }
            // d键或右箭头：后一天
            if (e.key === 'd' || e.key === 'ArrowRight') {
                e.preventDefault()
                const tomorrow = TimeUtils.getNextDay(date)
                navigate(`/detail/${tomorrow}`)
            }
            // e键：编辑
            if (e.key === 'e') {
                e.preventDefault()
                navigate(`/edit/${date}`)
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [date, navigate])

    if (loading) {
        return <div className="container">加载中...</div>
    }

    return (
        <div className="container" ref={ref}>
            <TodoHeader time={data.time} note={data.note} />
            <TodoTable items={data.items} />
        </div>
    )
}

export default Detail
