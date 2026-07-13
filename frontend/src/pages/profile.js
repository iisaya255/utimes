import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Avatar, Typography, message, Button, Card } from 'antd'
import deviceApi from '../services/api'
import TimeUtils from '../utils'

const { Title, Paragraph } = Typography

function Profile() {
    const { username } = useParams()
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true)
            try {
                const data = await deviceApi.getProfile(username)
                setUser(data)
            } catch (error) {
                message.error(error.message || '用户不存在')
            } finally {
                setLoading(false)
            }
        }
        loadProfile()
    }, [username])

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 60 }}>加载中...</div>
    }

    if (!user) {
        return <div style={{ textAlign: 'center', padding: 60 }}>用户不存在</div>
    }

    return (
        <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px' }}>
            <Card>
                <div style={{ textAlign: 'center' }}>
                    <Avatar size={80} style={{ backgroundColor: '#1677ff', fontSize: 36 }}>
                        {user.name ? user.name[0] : '?'}
                    </Avatar>
                    <Title level={3} style={{ marginTop: 16, marginBottom: 4 }}>
                        {user.name}
                    </Title>
                    <Paragraph type="secondary">@{user.username}</Paragraph>
                    {user.bio && (
                        <Paragraph style={{ marginTop: 12 }}>{user.bio}</Paragraph>
                    )}
                </div>
                {user.is_public && (
                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                        <Button
                            type="primary"
                            onClick={() => navigate(`/${username}/detail/${TimeUtils.today()}`)}
                        >
                            查看今日记录
                        </Button>
                    </div>
                )}
                {!user.is_public && (
                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                        <Paragraph type="secondary">该用户未公开记录</Paragraph>
                    </div>
                )}
            </Card>
        </div>
    )
}

export default Profile
