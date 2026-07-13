import React, { useState, useEffect } from 'react'
import {
    Button,
    Form,
    Input,
    Switch,
    message,
} from 'antd'
import deviceApi from '../services/api'
import './manage.css'

const { TextArea } = Input


function Manage() {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form] = Form.useForm()
    const [, setConfig] = useState({
        extra1: '',
        extra2: '',
        extra3: '',
        theme: 'light',
        blur: false,
    })
    const [isPublic, setIsPublic] = useState(false)
    const [publicSaving, setPublicSaving] = useState(false)

    // 加载配置
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        loadConfig()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadConfig = async () => {
        setLoading(true)
        try {
            const data = await deviceApi.getConfig()
            setConfig(data)
            form.setFieldsValue({
                extra1: data.extra1 || '',
                extra2: data.extra2 || '',
                extra3: data.extra3 || '',
            })
        } catch (error) {
            message.error(`加载配置失败: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    // 保存配置
    const handleSave = async () => {
        try {
            const values = await form.validateFields()
            setSaving(true)
            await deviceApi.saveConfig({
                extra1: values.extra1 || '',
                extra2: values.extra2 || '',
                extra3: values.extra3 || '',
            })
            message.success('配置保存成功')
            // 重新加载配置
            await loadConfig()
        } catch (error) {
            if (error.errorFields) {
                // 表单验证错误
                return
            }
            message.error(`保存失败: ${error.message}`)
        } finally {
            setSaving(false)
        }
    }

    // 切换公开设置
    const handlePublicToggle = async (checked) => {
        setPublicSaving(true)
        try {
            await deviceApi.updateProfileSettings({ is_public: checked })
            setIsPublic(checked)
            message.success(checked ? '已公开个人记录' : '已隐藏个人记录')
        } catch (error) {
            message.error(`设置失败: ${error.message}`)
        } finally {
            setPublicSaving(false)
        }
    }

    return (
        <div className='manage-container'>
            <h1>配置管理</h1>
            <p style={{ color: '#666', marginBottom: '20px' }}>
                配置三个字段：AI上下文（用于AI生成计划时的参考）、常驻文案（显示在编辑页面）、常驻链接（显示在编辑页面）
            </p>
            <Form
                form={form}
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 14 }}
                layout="horizontal"
                style={{ maxWidth: 900 }}
                onFinish={handleSave}
            >
                <Form.Item
                    label="AI上下文"
                    name="extra1"
                    rules={[
                        { required: false, message: '请输入AI上下文' }
                    ]}
                >
                    <TextArea
                        autoSize={{ minRows: 10, maxRows: 20 }}
                        style={{ fontSize: "15px" }}
                        placeholder="输入用于AI生成计划时的上下文参考信息（不在编辑页面显示）..."
                    />
                </Form.Item>
                <Form.Item
                    label="常驻文案"
                    name="extra2"
                    rules={[
                        { required: false, message: '请输入常驻文案' }
                    ]}
                >
                    <TextArea
                        autoSize={{ minRows: 10, maxRows: 20 }}
                        style={{ fontSize: "15px" }}
                        placeholder="输入要在编辑页面顶部显示的常驻文案内容..."
                    />
                </Form.Item>
                <Form.Item
                    label="常驻链接"
                    name="extra3"
                    rules={[
                        { required: false, message: '请输入常驻链接' }
                    ]}
                >
                    <TextArea
                        autoSize={{ minRows: 3, maxRows: 10 }}
                        style={{ fontSize: "15px" }}
                        placeholder="输入要在编辑页面显示的链接，每行一个链接，格式：链接文本|链接地址（例如：临时记录|https://example.com）..."
                    />
                </Form.Item>
                <Form.Item wrapperCol={{ offset: 4, span: 14 }}>
                    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Switch
                            checked={isPublic}
                            onChange={handlePublicToggle}
                            loading={publicSaving}
                        />
                        <span>公开个人记录（允许其他用户查看你的日常记录）</span>
                    </div>
                    <Button
                        type='primary'
                        htmlType="submit"
                        loading={saving}
                    >
                        保存配置
                    </Button>
                    <Button
                        style={{ marginLeft: 8 }}
                        onClick={loadConfig}
                        loading={loading}
                    >
                        重新加载
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default Manage
