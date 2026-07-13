import React, { useState, useEffect } from 'react'
import { ConfigProvider, theme } from 'antd'
import { RouterProvider } from 'react-router-dom'
import { getThemeFromStorage } from './utils/theme'

const { darkAlgorithm, defaultAlgorithm } = theme

function App({ router }) {
    const [antdTheme, setAntdTheme] = useState(() => {
        // 初始化时从localStorage读取主题
        const savedTheme = getThemeFromStorage()
        return savedTheme === 'dark' ? 'dark' : 'light'
    })

    useEffect(() => {
        // 监听body class的变化来同步Ant Design主题
        const observer = new MutationObserver(() => {
            const isDark = document.body.classList.contains('dark')
            setAntdTheme(isDark ? 'dark' : 'light')
        })

        // 观察body元素的class变化
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        })

        // 初始检查
        const isDark = document.body.classList.contains('dark')
        setAntdTheme(isDark ? 'dark' : 'light')

        return () => {
            observer.disconnect()
        }
    }, [])

    return (
        <ConfigProvider
            theme={{
                algorithm: antdTheme === 'dark' ? darkAlgorithm : defaultAlgorithm,
            }}
        >
            <RouterProvider router={router} />
        </ConfigProvider>
    )
}

export default App
