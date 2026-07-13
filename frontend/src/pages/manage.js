import React, { useState, useEffect } from 'react'
import {
    Button,
    Card,
    Form,
    Input,
    Switch,
    message,
    Divider,
} from 'antd'
import deviceApi from '../services/api'
import { supabase } from '../services/supabase'
import './manage.css'

const { TextArea } = Input


function Manage() {
    // 用户信息
    const [profileForm] = Form.useForm()
    const [profileLoading, setProfileLoading] = useState(false)
    const [profileSaving, setProfileSaving] = useState(false)
    const [usernameStatus, setUsernameStatus] = useState('')
    const [usernameHelp, setUsernameHelp] = useState('')
    const [originalUsername, setOriginalUsername] = useState('')

    // 密码修改
    const [passwordForm] = Form.useForm()
    const [passwordSaving, setPasswordSaving] = useState(false)

    // 配置管理
    const [configForm] = Form.useForm()
    const [configLoading, setConfigLoading] = useState(false)
    const [configSaving, setConfigSaving] = useState(false)

    useEffect(() => {
        loadProfile()
        loadConfig()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // 加载用户信息
    const loadProfile = async () => {
        setProfileLoading(true)
        try {
            const data = await deviceApi.getMyProfile()
            setOriginalUsername(data.username || '')
            profileForm.setFieldsValue({
                username: data.username || '',
                name: data.name || '',
                bio: data.bio || '',
                is_public: data.is_public || false,
            })
        } catch (error) {
            message.error(`加载用户信息失败: ${error.message}`)
        } finally {
            setProfileLoading(false)
        }
    }

    // 加载配置
    const loadConfig = async () => {
        setConfigLoading(true)
        try {
            const data = await deviceApi.getConfig()
            configForm.setFieldsValue({
                extra1: data.extra1 || '',
                extra2: data.extra2 || '',
                extra3: data.extra3 || '',
            })
        } catch (error) {
            message.error(`加载配置失败: ${error.message}`)
        } finally {
            setConfigLoading(false)
        }
    }

    // 检查用户名唯一性
    const handleUsernameCheck = async (username) => {
        if (!username || username === originalUsername) {
            setUsernameStatus('')
            setUsernameHelp('')
            return
        }
        try {
            const res = await deviceApi.checkUsername(username)
            if (res.available) {
                setUsernameStatus('success')
                setUsernameHelp('用户名可用')
            } else {
                setUsernameStatus('error')
                setUsernameHelp('用户名已被占用')
            }
        } catch {
            setUsernameStatus('')
            setUsernameHelp('')
        }
    }

    // 保存用户信息
    const handleProfileSave = async () => {
        try {
            const values = await profileForm.validateFields()
            if (usernameStatus === 'error') {
                message.error('用户名已被占用，请更换')
                return
            }
            setProfileSaving(true)
            await deviceApi.updateProfile({
                username: values.username,
                name: values.name || '',
                bio: values.bio || '',
                is_public: values.is_public || false,
            })
            setOriginalUsername(values.username)
            message.success('用户信息保存成功')
        } catch (error) {
            if (error.errorFields) return
            message.error(`保存失败: ${error.message}`)
        } finally {
            setProfileSaving(false)
        }
    }

    // 修改密码
    const handlePasswordChange = async () => {
        try {
            const values = await passwordForm.validateFields()
            if (values.newPassword !== values.confirmPassword) {
                message.error('两次输入的密码不一致')
                return
            }
            setPasswordSaving(true)
            if (!supabase) {
                message.error('本地开发模式不支持修改密码')
                return
            }
            const { error } = await supabase.auth.updateUser({
                password: values.newPassword
            })
            if (error) {
                message.error(`修改密码失败: ${error.message}`)
            } else {
                message.success('密码修改成功')
                passwordForm.resetFields()
            }
        } catch (error) {
            if (error.errorFields) return
            message.error(`修改密码失败: ${error.message}`)
        } finally {
            setPasswordSaving(false)
        }
    }

    // 保存配置
    const handleConfigSave = async () => {
        try {
            const values = await configForm.validateFields()
            setConfigSaving(true)
            await deviceApi.saveConfig({
                extra1: values.extra1 || '',
                extra2: values.extra2 || '',
                extra3: values.extra3 || '',
            })
            message.success('配置保存成功')
        } catch (error) {
            if (error.errorFields) return
            message.error(`保存失败: ${error.message}`)
        } finally {
            setConfigSaving(false)
        }
    }

    return (
        <div className='manage-container'>
            <h1>个人设置</h1>

            {/* 用户信息区块 */}
            <Card title="用户信息" className="manage-section" loading={profileLoading}>
                <Form
                    form={profileForm}
                    layout="vertical"
                >
                    <Form.Item
                        label="用户名"
                        name="username"
                        validateStatus={usernameStatus}
                        help={usernameHelp}
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input
                            placeholder="输入用户名"
                            onChange={e => {
                                const val = e.target.value.trim()
                                handleUsernameCheck(val)
                            }}
                        />
                    </Form.Item>
                    <Form.Item label="姓名" name="name">
                        <Input placeholder="输入你的姓名或昵称" />
                    </Form.Item>
                    <Form.Item label="个人简介" name="bio">
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            placeholder="简单介绍一下自己..."
                        />
                    </Form.Item>
                    <Form.Item label="公开记录" name="is_public" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" onClick={handleProfileSave} loading={profileSaving}>
                            保存用户信息
                        </Button>
                    </Form.Item>
                </Form>

                <Divider />

                {/* 修改密码 */}
                <h3 style={{ marginBottom: 16 }}>修改密码</h3>
                <Form form={passwordForm} layout="vertical">
                    <Form.Item
                        label="新密码"
                        name="newPassword"
                        rules={[
                            { required: true, message: '请输入新密码' },
                            { min: 6, message: '密码至少6位' }
                        ]}
                    >
                        <Input.Password placeholder="输入新密码" />
                    </Form.Item>
                    <Form.Item
                        label="确认密码"
                        name="confirmPassword"
                        rules={[
                            { required: true, message: '请确认密码' },
                            { min: 6, message: '密码至少6位' }
                        ]}
                    >
                        <Input.Password placeholder="再次输入新密码" />
                    </Form.Item>
                    <Form.Item>
                        <Button onClick={handlePasswordChange} loading={passwordSaving}>
                            修改密码
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {/* 配置管理区块 */}
            <Card title="配置管理" className="manage-section" loading={configLoading}>
                <p style={{ color: '#666', marginBottom: 16 }}>
                    AI上下文用于AI生成计划时的参考，常驻文案和链接显示在编辑页面
                </p>
                <Form form={configForm} layout="vertical" onFinish={handleConfigSave}>
                    <Form.Item label="AI上下文" name="extra1">
                        <TextArea
                            autoSize={{ minRows: 6, maxRows: 15 }}
                            placeholder="输入用于AI生成计划时的上下文参考信息..."
                        />
                    </Form.Item>
                    <Form.Item label="常驻文案" name="extra2">
                        <TextArea
                            autoSize={{ minRows: 6, maxRows: 15 }}
                            placeholder="输入要在编辑页面顶部显示的常驻文案内容..."
                        />
                    </Form.Item>
                    <Form.Item label="常驻链接" name="extra3">
                        <TextArea
                            autoSize={{ minRows: 3, maxRows: 8 }}
                            placeholder="每行一个链接，格式：链接文本|链接地址"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={configSaving}>
                            保存配置
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    )
}

export default Manage