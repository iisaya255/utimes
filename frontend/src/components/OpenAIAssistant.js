import React from 'react'
import { Card, Button, message, Typography, Space } from 'antd'
import { RobotOutlined, ThunderboltOutlined, FileTextOutlined } from '@ant-design/icons'
import deviceApi from '../services/api'
import './OpenAIAssistant.css'

const { Paragraph, Text } = Typography

function OpenAIAssistant({ onFillTable }) {
    const [loading, setLoading] = React.useState(false)
    const [summary, setSummary] = React.useState('')
    const [planning, setPlanning] = React.useState(false)

    const handleSummarizeWeek = async () => {
        setLoading(true)
        setSummary('')
        try {
            const result = await deviceApi.summarizeWeek()
            setSummary(result.summary || '')
            message.success('总结完成')
        } catch (error) {
            message.error(`总结失败: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handlePlanToday = async () => {
        setPlanning(true)
        try {
            const result = await deviceApi.planToday()
            if (result.items && result.items.length > 0) {
                // 调用父组件的填充函数
                if (onFillTable) {
                    onFillTable(result.items)
                    message.success(`已生成 ${result.items.length} 个任务，已自动填充到表格`)
                } else {
                    message.success(`已生成 ${result.items.length} 个任务`)
                }
            } else {
                message.warning('未生成任何任务')
            }
        } catch (error) {
            message.error(`规划失败: ${error.message}`)
        } finally {
            setPlanning(false)
        }
    }

    return (
        <div className="openai-assistant">
            <Card
                title={
                    <Space>
                        <RobotOutlined />
                        <span>AI 助手</span>
                    </Space>
                }
            >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Button
                            type="primary"
                            icon={<FileTextOutlined />}
                            onClick={handleSummarizeWeek}
                            loading={loading}
                            block
                            style={{ marginBottom: 12 }}
                        >
                            总结最近一周
                        </Button>
                        {summary && (
                            <Card size="small" style={{ marginTop: 12, background: '#f5f5f5' }}>
                                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {summary}
                                </Paragraph>
                            </Card>
                        )}
                    </div>

                    <div>
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            onClick={handlePlanToday}
                            loading={planning}
                            block
                            danger
                        >
                            规划今天要做的事情
                        </Button>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                            基于最近一周的活动记录，AI将为您规划今天的任务并自动填充到表格中
                        </Text>
                    </div>
                </Space>
            </Card>
        </div>
    )
}

export default OpenAIAssistant

