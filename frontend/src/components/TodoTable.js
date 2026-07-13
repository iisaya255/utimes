import Select from '../base/Select'
import './TodoTable.css'
import React from 'react'

function TableColumAttr() {
    return (
        <colgroup>
            <col width="150" />
            <col width="60" />
            <col width="60" />
            <col width="60" />
            <col width="60" />
            <col width="450" />
        </colgroup>
    )
}

function TableHeader() {
    return (
        <thead className="ne-tr">
            <tr>
                <td className="ne-td ne-td-middle" data-col="0">项目</td>
                <td className="ne-td ne-td-middle ne-td-select" data-col="1">时间</td>
                <td className="ne-td ne-td-middle ne-td-select" data-col="2">情绪</td>
                <td className="ne-td ne-td-middle ne-td-select" data-col="3">意义</td>
                <td className="ne-td ne-td-middle ne-td-select" data-col="4">得分</td>
                <td className="ne-td ne-td-middle" data-col="5">
                    要做的事/完成情况/个人总结
                    <span style={{ color: "white", background: "darkgreen" }}>&nbsp;链接&nbsp;</span>
                    <span style={{ color: "white", background: "#f04608" }}>&nbsp;TODO&nbsp;</span>
                </td>
            </tr>
        </thead>
    )
}

function ItemList({ item, inputMethod }) {
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

    // 处理复制事件，用于调试
    const handleCopy = (e) => {
        const target = e.target
        console.log('=== 复制事件 ===')
        console.log('目标元素:', target)
        console.log('innerHTML:', target.innerHTML)
        console.log('textContent:', target.textContent)

        const selection = window.getSelection()
        console.log('当前选区:', selection.toString())
        console.log('选区范围数:', selection.rangeCount)

        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            console.log('选区起始:', range.startContainer, '偏移:', range.startOffset)
            console.log('选区结束:', range.endContainer, '偏移:', range.endOffset)
            console.log('选区内容:', range.toString())
        }
        console.log('================')
    }

    // 处理焦点事件，用于调试
    const handleFocus = (e) => {
        const target = e.target
        console.log('=== 焦点事件 ===')
        console.log('目标元素:', target)
        console.log('innerHTML:', target.innerHTML)
        console.log('textContent:', target.textContent)
        console.log('是否为空状态:', target.innerHTML === '<ne-p><br></ne-p>' || target.textContent.trim() === '')
        console.log('================')
    }

    // 处理粘贴事件，防止嵌套的 HTML 标签导致内容重复
    const handlePaste = (e) => {
        e.preventDefault()

        console.log('=== 粘贴事件 ===')
        // 尝试获取 HTML 内容
        const html = e.clipboardData?.getData('text/html') || ''
        let text = ''
        console.log('粘贴HTML:', html)

        if (html) {
            // 如果有 HTML 内容，解析提取文本（保留换行）
            const tempDiv = document.createElement('div')
            tempDiv.innerHTML = html

            // 提取所有 ne-p 元素的文本内容
            // 特别处理嵌套的 ne-p：只提取最内层的 ne-p（叶子节点）
            const allNePElements = tempDiv.querySelectorAll('ne-p')
            if (allNePElements.length > 0) {
                const lines = []
                allNePElements.forEach(p => {
                    // 检查这个 ne-p 是否还包含子 ne-p（如果不包含，说明是叶子节点）
                    const hasNestedNeP = p.querySelector('ne-p')
                    if (!hasNestedNeP) {
                        // 这是最内层的 ne-p，提取其文本
                        const line = p.textContent?.trim()
                        if (line) {
                            lines.push(line)
                        }
                    }
                })
                text = lines.join('\n')
            } else {
                // 如果没有 ne-p 元素，提取所有文本，保留块级元素的换行
                text = tempDiv.innerText || tempDiv.textContent || ''
            }
        }

        // 如果 HTML 解析失败或为空，使用纯文本
        if (!text) {
            text = e.clipboardData?.getData('text/plain') || ''
        }

        if (!text) {
            console.log('粘贴内容为空')
            return
        }

        console.log('粘贴文本:', text)
        // 将文本按格式重新插入
        const formattedHtml = formatText(text)
        console.log('格式化后HTML:', formattedHtml)

        // 获取目标元素（contenteditable 的单元格）
        // 使用 currentTarget 确保获取到 td 元素本身，而不是内部的 ne-p 子元素
        const target = e.currentTarget

        // 检查是否是初始空状态
        const isInitialEmpty = target.innerHTML === '<ne-p><br></ne-p>' ||
                               target.innerHTML === '<ne-p><br/></ne-p>' ||
                               target.textContent.trim() === ''

        // 获取当前选区
        const selection = window.getSelection()

        // 只有在完全空状态下才替换整个内容
        // 否则在光标位置插入或替换选中的文本
        if (isInitialEmpty) {
            target.innerHTML = formattedHtml
        } else if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)

            // 删除选中的内容（如果有选中内容）
            range.deleteContents()

            // 创建临时容器来解析格式化的 HTML
            const tempDiv = document.createElement('div')
            tempDiv.innerHTML = formattedHtml

            // 将格式化的内容插入到光标位置
            const fragment = document.createDocumentFragment()
            let node
            while ((node = tempDiv.firstChild)) {
                fragment.appendChild(node)
            }

            range.insertNode(fragment)

            // 将光标移到插入内容的末尾
            range.collapse(false)
            selection.removeAllRanges()
            selection.addRange(range)
        }

        // 触发 input 事件以更新状态
        if (inputMethod) {
            inputMethod()
        }
        console.log('粘贴完成，当前innerHTML:', target.innerHTML)
        console.log('================')
    }

    return (
        <tbody className="ne-table-inner">
            <tr className="ne-tr">
                <td
                    className="ne-td ne-td-middle ne-edit"
                    suppressContentEditableWarning={true}
                    contentEditable={true}
                    rowSpan="3"
                    data-col="0"
                    onPaste={handlePaste}
                    onCopy={handleCopy}
                    onFocus={handleFocus}
                    dangerouslySetInnerHTML={{ __html: formatText(item?.project || '') }}
                />
                <td
                    className="ne-td ne-td-middle ne-edit ne-td-select"
                    suppressContentEditableWarning={true}
                    contentEditable={true}
                    rowSpan="3"
                    data-col="1"
                    onPaste={handlePaste}
                    onCopy={handleCopy}
                    onFocus={handleFocus}
                    dangerouslySetInnerHTML={{ __html: formatText(item?.time || '') }}
                />
                <td className="ne-td ne-td-middle ne-td-select" rowSpan="3" data-col="2">
                    <Select name="happy" defaultValue={item?.happy || 1} onChange={inputMethod} />
                </td>
                <td className="ne-td ne-td-middle ne-td-select" rowSpan="3" data-col="3">
                    <Select name="meaningful" defaultValue={item?.meaningful || 1} onChange={inputMethod} />
                </td>
                <td className="ne-td ne-td-middle" rowSpan="3" data-col="4">
                    <ne-p className="score avg ne-td-select">
                        {((item?.happy || 0) * 0.5 + (item?.meaningful || 0) * 0.5).toFixed(1)}
                    </ne-p>
                </td>
                <td
                    className="ne-td ne-edit"
                    suppressContentEditableWarning={true}
                    contentEditable={true}
                    data-col="5"
                    onPaste={handlePaste}
                    onCopy={handleCopy}
                    onFocus={handleFocus}
                    dangerouslySetInnerHTML={{ __html: formatText(item?.extra?.happy || '') }}
                />
            </tr>
            <tr className="ne-tr">
                <td
                    className="ne-td ne-edit"
                    suppressContentEditableWarning={true}
                    contentEditable={true}
                    data-col="5"
                    onPaste={handlePaste}
                    onCopy={handleCopy}
                    onFocus={handleFocus}
                    dangerouslySetInnerHTML={{ __html: formatText(item?.extra?.meaningful || '') }}
                />
            </tr>
            <tr className="ne-tr">
                <td
                    className="ne-td ne-edit"
                    suppressContentEditableWarning={true}
                    contentEditable={true}
                    data-col="5"
                    onPaste={handlePaste}
                    onCopy={handleCopy}
                    onFocus={handleFocus}
                    dangerouslySetInnerHTML={{ __html: formatText(item?.extra?.better || '') }}
                />
            </tr>
        </tbody>
    )
}

function TodoTable({ items = [], inputMethod }) {
    // items 应该总是至少有一个元素（由父组件保证）
    // 如果为空，显示一个空行作为占位符
    const displayItems = items.length > 0 ? items : [{ id: 1 }]

    return (
        <ne-table-box onInput={inputMethod}>
            <table className="ne-table">
                <TableColumAttr />
                <TableHeader />
                {displayItems.map((item, index) => (
                    <ItemList key={item.id || index} item={item} inputMethod={inputMethod} />
                ))}
            </table>
        </ne-table-box>
    )
}

export default TodoTable
