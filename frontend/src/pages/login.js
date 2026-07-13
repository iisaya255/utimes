import React, { useState, useEffect } from 'react'
import { Button, Input, Card, Typography, message, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

const { Title } = Typography

/**
 * 登录页面 - 使用 Supabase Email/Password 认证
 */
function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    // 检查登录态，已登录则跳转
    useEffect(() => {
        if (!supabase) return
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                navigate('/edit', { replace: true })
            }
        })
    }, [navigate])

    const handleSubmit = async () => {
        if (!email || !password) {
            message.warning('请输入邮箱和密码')
            return
        }

        setLoading(true)
        try {
            // let result
            // if (isSignUp) {
            //     result = await supabase.auth.signUp({ email, password })
            // } else {
            //     result = await supabase.auth.signInWithPassword({ email, password })
            // }
            const result = await supabase.auth.signInWithPassword({ email, password })

            if (result.error) {
                message.error(result.error.message)
            } else {
                // if (isSignUp) {
                //     message.success('注册成功，请检查邮箱确认')
                // } else {
                //     message.success('登录成功')
                //     window.location.href = '/edit'
                // }
                message.success('登录成功')
                navigate('/edit')
            }
        } catch (err) {
            message.error('操作失败: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit()
        }
    }

    return (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '40px',
        gap: '300px',
    }}>
        {/* 左侧介绍 */}
        <div style={{ maxWidth: 400 }}>
            <h1 style={{
                fontSize: 76,
                marginTop: -50,
                marginBottom: 40,
                color: '#19191a',
                
            }}>
                UTimes
            </h1>
            <p style={{
                fontSize: 18,
                color: '#19191a',

                opacity: 0.95,
            }}>
                一个用于记录个人日常生活的笔记网站
            </p>
        </div>

        {/* 右侧登录卡片 */}
        <Card style={{ 
            width: 360,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
            <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
                UTimes
            </Title>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Input
                    placeholder="邮箱"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    size="large"
                />
                <Input.Password
                    placeholder="密码"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    size="large"
                />
                <Button
                    type="primary"
                    block
                    size="large"
                    loading={loading}
                    onClick={handleSubmit}
                >
                    {/* {isSignUp ? '注册' : '登录'} */}
                    登录
                </Button>
                {/* <Text
                    style={{ display: 'block', textAlign: 'center', cursor: 'pointer', color: '#1677ff' }}
                    onClick={() => setIsSignUp(!isSignUp)}
                >
                    {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
                </Text> */}
            </Space>
        </Card>
    </div>
)
}

export default Login
