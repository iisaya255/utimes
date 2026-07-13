import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { message } from 'antd'

import TodoHeader from "../components/TodoHeader"
import TodoTable from "../components/TodoTable"
import TodoTool from "../components/TodoTool"
import OpenAIAssistant from "../components/OpenAIAssistant"
import TimeUtils from "../utils"
import deviceApi from "../services/api"
import { setTheme as setThemeUtil, getCurrentTheme } from "../utils/theme"
import './edit.css'

function Edit() {
    const params = useParams()
    const navigate = useNavigate()
    const date = params.date || TimeUtils.today()

    const ref = React.useRef(null)
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false) // eslint-disable-line no-unused-vars
    const [data, setData] = React.useState({
        time: date,
        blur: false,
        extra2Text: "",
        extra3Links: "",
        extraInfo: "tips",  // 向后兼容
        note: "",
        items: [],
    })

    // 加载数据
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => {
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date])

    const loadData = async () => {
        setLoading(true)
        try {
            const currentDate = params.date || TimeUtils.today()
            const resp = await deviceApi.getEdit(currentDate)
            // 如果没有数据，初始化一个空项，这样用户可以直接编辑
            const items = resp.items && resp.items.length > 0 
                ? resp.items 
                : [{ id: 1, project: '', time: '', happy: 1, meaningful: 1, extra: { happy: '', meaningful: '', better: '' } }]
            const blurState = resp.blur || false
            setData({
                time: resp.time || currentDate,
                blur: blurState,
                extra2Text: resp.extra2Text || "",
                extra3Links: resp.extra3Links || "",
                extraInfo: resp.extraInfo || resp.extra2Text || "tips",  // 向后兼容
                note: resp.note || "",
                items: items,
            })
            // 如果返回的blur状态为true，应用打码效果
            if (blurState) {
                // 使用setTimeout确保DOM已更新
                setTimeout(() => {
                    const blurElements = ref.current?.querySelectorAll('.ne-table-inner-wrap, .container-todo, .container-limit, tbody.ne-table-inner')
                    blurElements?.forEach(el => {
                        el.classList.add('blur')
                    })
                }, 0)
            }
        } catch (error) {
            message.error(`加载数据失败: ${error.message}`)
            // 即使加载失败，也初始化一个空项
            setData({
                time: date,
                blur: false,
                extra2Text: "",
                extra3Links: "",
                extraInfo: "tips",
                note: "",
                items: [{ id: 1, project: '', time: '', happy: 1, meaningful: 1, extra: { happy: '', meaningful: '', better: '' } }],
            })
        } finally {
            setLoading(false)
        }
    }

    // 处理输入变化
    const inputMethod = () => {
        const container = ref.current
        if (!container) return

        // 处理 note 数据
        const todoElement = container.querySelector('.container-todo')
        let noteContent = ''
        if (todoElement) {
            noteContent = todoElement.innerText || todoElement.textContent || ''
        }

        // 处理表格数据 - 查找所有tbody（每个ItemList是一个tbody）
        // 注意：表头在thead中，数据行在tbody中
        const tbodyList = container.querySelectorAll("tbody.ne-table-inner")
        const total = []

        tbodyList.forEach(tbody => {
            // 跳过表头（表头在thead中，不在tbody中）
            // 检查是否有ne-edit类，表头没有这个类
            const firstEditCell = tbody.querySelector('.ne-edit')
            if (!firstEditCell) return

            const rows = tbody.querySelectorAll('.ne-tr')
            if (rows.length < 3) {
                return
            }

            // 第一行包含项目、时间、快乐、有意义、得分和第一个extra字段
            const firstRow = rows[0]
            const projectCell = firstRow.querySelector('[data-col="0"]')
            const timeCell = firstRow.querySelector('[data-col="1"]')
            const happySelect = firstRow.querySelector('.score.happy')
            const meaningfulSelect = firstRow.querySelector('.score.meaningful')
            
            // 三个extra字段分别在三个行的data-col="5"中
            const extraCells = [
                firstRow.querySelector('[data-col="5"]'),
                rows[1]?.querySelector('[data-col="5"]'),
                rows[2]?.querySelector('[data-col="5"]'),
            ]

            // 提取文本内容，去除HTML标签
            const getTextContent = (element) => {
                if (!element) return ''
                // 获取直接子元素 ne-p 的内容（使用 :scope > 防止选中嵌套的 ne-p）
                const nePList = element.querySelectorAll(':scope > ne-p')
                if (nePList.length > 0) {
                    const result = Array.from(nePList).map(p => {
                        const link = p.querySelector('a')
                        if (link) return link.textContent || link.href
                        const todo = p.querySelector('todo')
                        if (todo) return todo.textContent
                        return p.textContent
                    }).join('\n').trim()
                    return result
                }
                const result = element.textContent?.trim() || ''
                return result
            }

            const project = getTextContent(projectCell)
            const time = getTextContent(timeCell)
            const happy = parseInt(happySelect?.value) || 0
            const meaningful = parseInt(meaningfulSelect?.value) || 0
            const extraHappy = getTextContent(extraCells[0])
            const extraMeaningful = getTextContent(extraCells[1])
            const extraBetter = getTextContent(extraCells[2])

            // 只有当happy或meaningful不为0时才保存
            if (happy !== 0 || meaningful !== 0) {
                const item = {
                    project,
                    time,
                    happy,
                    meaningful,
                    extra: {
                        happy: extraHappy,
                        meaningful: extraMeaningful,
                        better: extraBetter,
                    },
                }
                total.push(item)
            }
        })

        // 更新得分
        updateScores()

        return {
            date: data.time,
            note: noteContent,
            dataList: total,
        }
    }

    // 更新得分
    const updateScores = () => {
        const container = ref.current
        if (!container) return

        const scoreHappy = container.querySelectorAll(".score.happy")
        const scoreMeaningful = container.querySelectorAll(".score.meaningful")
        const scoreAvg = container.querySelectorAll(".score.avg")

        for (let i = 0; i < scoreHappy.length; i++) {
            const happy = parseFloat(scoreHappy[i].value) || 0
            const meaningful = parseFloat(scoreMeaningful[i].value) || 0
            const avg = (happy * 0.5 + meaningful * 0.5).toFixed(1)
            if (scoreAvg[i]) {
                scoreAvg[i].textContent = avg
            }
        }
    }

    // 监听得分变化
    React.useEffect(() => {
        const container = ref.current
        if (!container) return

        const handleScoreChange = () => {
            updateScores()
        }

        const scoreSelects = container.querySelectorAll(".score.happy, .score.meaningful")
        scoreSelects.forEach(select => {
            select.addEventListener('change', handleScoreChange)
        })

        return () => {
            scoreSelects.forEach(select => {
                select.removeEventListener('change', handleScoreChange)
            })
        }
    }, [data])

    // 保存数据
    const handleSave = async () => {
        const saveData = inputMethod()
        console.log('保存数据:', saveData) // 调试用
        setSaving(true)
        try {
            // 后端期望的格式：{ date, note, dataList } 或 { date, content: {...} }
            await deviceApi.save(data.time, {
                date: saveData.date,
                note: saveData.note,
                dataList: saveData.dataList
            })
            message.success('保存成功')
        } catch (error) {
            console.error('保存失败:', error) // 调试用
            message.error(`保存失败: ${error.message}`)
        } finally {
            setSaving(false)
        }
    }

    // 按钮事件处理
    const buttonAction = (eventName) => {
        const event = {
            "tool-add": () => {
                // 计算新的id，确保唯一性（使用现有items中的最大id + 1）
                const maxId = data.items.length > 0 
                    ? Math.max(...data.items.map(item => item.id || 0))
                    : 0
                const newItem = {
                    id: maxId + 1,
                    project: '',
                    time: '',
                    happy: 1,
                    meaningful: 1,
                    extra: { happy: '', meaningful: '', better: '' }
                }
                setData(prev => ({
                    ...prev,
                    items: [...prev.items, newItem]
                }))
            },

            "tool-save": () => {
                handleSave()
            },

            "tool-yesterday": () => {
                // 基于当前查看的日期计算前一天，跳转到详情页
                const yesterday = TimeUtils.getPreviousDay(data.time)
                navigate(`/detail/${yesterday}`)
            },

            "tool-tomorrow": async () => {
                try {
                    const today = data.time
                    // 基于当前查看的日期计算后一天
                    const tomorrow = TimeUtils.getNextDay(today)
                    await deviceApi.migrate(today, tomorrow)
                    message.success('数据迁移成功')
                    navigate(`/edit/${tomorrow}`)
                } catch (error) {
                    message.error(`迁移失败: ${error.message}`)
                }
            },

            "tool-theme": async () => {
                try {
                    const currentTheme = getCurrentTheme()
                    const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
                    await setThemeUtil(newTheme, deviceApi)
                    message.success('主题切换成功')
                } catch (error) {
                    message.error(`主题切换失败: ${error.message}`)
                }
            },

            "tool-mosaic": async () => {
                try {
                    const result = await deviceApi.toggleBlur()
                    const blurElements = ref.current?.querySelectorAll('.ne-table-inner-wrap, .container-todo, .container-limit, tbody.ne-table-inner')
                    blurElements?.forEach(el => {
                        if (result.blur) {
                            el.classList.add('blur')
                        } else {
                            el.classList.remove('blur')
                        }
                    })
                    message.success('打码模式切换成功')
                } catch (error) {
                    message.error(`打码模式切换失败: ${error.message}`)
                }
            },

            "tool-calender": () => {
                navigate('/calendar')
            },

            "tool-manage": () => {
                navigate('/manage')
            },

            "tool-users": () => {
                navigate('/users')
            },
        }

        const hasEvent = event.hasOwnProperty(eventName)
        if (hasEvent) {
            event[eventName]()
        }
        return hasEvent
    }

    // 快捷键支持
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+S / Cmd+S 保存
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
            }
            // ESC 打码模式
            if (e.key === 'Escape') {
                buttonAction('tool-mosaic')
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])

    if (loading) {
        return <div className="container">加载中...</div>
    }

    // 处理AI助手填充表格
    const handleFillTable = (items) => {
        if (!items || items.length === 0) {
            message.warning('没有可填充的数据')
            return
        }

        // 计算新的id，确保唯一性
        const maxId = data.items.length > 0 
            ? Math.max(...data.items.map(item => item.id || 0))
            : 0

        // 将AI生成的任务转换为表格格式
        const newItems = items.map((item, index) => ({
            id: maxId + index + 1,
            project: item.project || '',
            time: item.time || '',
            happy: item.happy || 3,
            meaningful: item.meaningful || 3,
            extra: {
                happy: item.extra?.happy || '',
                meaningful: item.extra?.meaningful || '',
                better: item.extra?.better || ''
            }
        }))

        // 合并到现有items中
        setData(prev => ({
            ...prev,
            items: [...prev.items, ...newItems]
        }))

        // 等待DOM更新后，手动填充表格内容
        setTimeout(() => {
            const container = ref.current
            if (!container) return

            const tbodyList = container.querySelectorAll("tbody.ne-table-inner")
            const dataRows = Array.from(tbodyList).filter(tbody => {
                const firstEditCell = tbody.querySelector('.ne-edit')
                return firstEditCell !== null
            })

            // 找到新添加的行（从最后开始）
            newItems.forEach((newItem, itemIndex) => {
                const tbodyIndex = dataRows.length - newItems.length + itemIndex
                if (tbodyIndex < 0 || tbodyIndex >= dataRows.length) return

                const tbody = dataRows[tbodyIndex]
                const rows = tbody.querySelectorAll('.ne-tr')
                if (rows.length < 3) return

                // 填充项目名称
                const projectCell = rows[0].querySelector('[data-col="0"]')
                if (projectCell) {
                    projectCell.innerHTML = formatTextForCell(newItem.project)
                }

                // 填充时间
                const timeCell = rows[0].querySelector('[data-col="1"]')
                if (timeCell) {
                    timeCell.innerHTML = formatTextForCell(newItem.time)
                }

                // 设置快乐值
                const happySelect = rows[0].querySelector('.score.happy')
                if (happySelect) {
                    happySelect.value = newItem.happy
                    happySelect.dispatchEvent(new Event('change', { bubbles: true }))
                }

                // 设置意义值
                const meaningfulSelect = rows[0].querySelector('.score.meaningful')
                if (meaningfulSelect) {
                    meaningfulSelect.value = newItem.meaningful
                    meaningfulSelect.dispatchEvent(new Event('change', { bubbles: true }))
                }

                // 填充extra字段
                const extraCells = [
                    rows[0].querySelector('[data-col="5"]'),
                    rows[1]?.querySelector('[data-col="5"]'),
                    rows[2]?.querySelector('[data-col="5"]'),
                ]

                if (extraCells[0]) {
                    extraCells[0].innerHTML = formatTextForCell(newItem.extra.happy)
                }
                if (extraCells[1]) {
                    extraCells[1].innerHTML = formatTextForCell(newItem.extra.meaningful)
                }
                if (extraCells[2]) {
                    extraCells[2].innerHTML = formatTextForCell(newItem.extra.better)
                }
            })

            // 更新得分
            updateScores()
        }, 100)
    }

    // 格式化文本为单元格HTML
    const formatTextForCell = (text) => {
        if (!text || text.trim() === '') {
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

    return (
        <div className="container" onInput={inputMethod} ref={ref}>
            <TodoHeader time={data.time} note={data.note} extra2Text={data.extra2Text} extra3Links={data.extra3Links} extraInfo={data.extraInfo} inputMethod={inputMethod} />
            <TodoTable items={data.items} inputMethod={inputMethod} />
            <TodoTool eventInput={buttonAction} />
            <OpenAIAssistant onFillTable={handleFillTable} />
        </div>
    )
}

export default Edit
