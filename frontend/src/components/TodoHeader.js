import React from 'react'

function TodoHeader({time, note, extra2Text, extra3Links, extraInfo, inputMethod}) {
    // 解析链接字符串：每行格式为 "链接文本|链接地址" 或直接是链接地址
    const parseLinks = (linksStr) => {
        if (!linksStr || !linksStr.trim()) {
            return []
        }
        return linksStr.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                // 支持两种格式：1. "文本|链接"  2. 直接是链接
                const parts = line.split('|')
                if (parts.length >= 2) {
                    return {
                        text: parts[0].trim(),
                        url: parts.slice(1).join('|').trim()
                    }
                } else {
                    // 如果没有分隔符，尝试提取链接
                    const urlMatch = line.match(/https?:\/\/[^\s]+/)
                    if (urlMatch) {
                        return {
                            text: line.replace(urlMatch[0], '').trim() || urlMatch[0],
                            url: urlMatch[0]
                        }
                    }
                    // 如果都不是，作为文本处理，但如果没有 http:// 或 https://，不显示为链接
                    return null
                }
            })
            .filter(link => link && link.url && (link.url.startsWith('http://') || link.url.startsWith('https://')))
    }

    const links = parseLinks(extra3Links)
    // 使用 extra2Text，如果没有则使用 extraInfo（向后兼容）
    const displayText = extra2Text !== undefined ? extra2Text : (extraInfo || '')

    return (
        <div>
            <div className="container-header">
                <div>
                    <span id="today">{time} 时间消费记录</span>
                </div>
            </div>
            <div className="container-limit">
                {displayText && <pre>{displayText}</pre>}
                {links.map((link, index) => (
                    <span key={index}>
                        <a href={link.url} rel="noreferrer" target="_blank">{link.text}</a>
                    </span>
                ))}
            </div>

            <hr/>
            <p>🔥TODO记录</p>
            <hr/>
            <pre className="container-todo" onInput={inputMethod} suppressContentEditableWarning={true} contentEditable="plaintext-only">
                <div className="container-todo-content">{note}</div>
            </pre>
        </div>
    )
}


export default TodoHeader