import React, { useEffect, useState } from "react";
import { Input, List, Avatar } from "antd";
import { useNavigate } from "react-router-dom";
import deviceApi from "../services/api";


/**
 * 用户列表页面
 */


function Users(){
    const navigate = useNavigate()
    const [keyword, setkeyword] = useState('')
    const [users, setUsers] = useState([])
    const filtered = users.filter(u => {
        const displayName = u.name || u.username || ''
        return displayName.toLowerCase().includes(keyword.toLowerCase())
    })
    
    useEffect(()=> {
        deviceApi.getUsers().then(res => {
            setUsers(res)
        })

    }, [])

    return(
        <div style={{maxWidth:1000, margin:'20px auto',padding:'0 100px',alignItems:'left'}}>
            <h1>用户列表</h1>
            {/*搜索框*/}
            <Input.Search 
                placeholder = "搜索用户"
                size = "large"
                allowClear
                onChange = {e => setkeyword(e.target.value)}
                style = {{ marginBottom: 20}}
            />

            {/*用户列表*/}
            <List
                dataSource={filtered}
                renderItem={user => {
                    const displayName = user.name || user.username || '未命名'
                    return (
                        <List.Item
                            style={{cursor: 'pointer'}}
                            onClick={() => navigate(`/user/${user.username}`)}
                        >
                            <List.Item.Meta
                                avatar={<Avatar>{displayName[0]}</Avatar>}
                                title={displayName}
                                description={`@${user.username}`}
                            />
                        </List.Item>
                    )
                }}
            />

        </div>


    )
}

export default Users
