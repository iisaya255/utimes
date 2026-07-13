import React, { useEffect, useState } from "react";
import { Input, List, Avatar } from "antd";
import deviceApi from "../services/api";


/**
 * 用户列表页面
 */


function Users(){
    const [keyword, setkeyword] = useState('')
    const [users, setUsers] = useState([])
    const filtered = users.filter(u => u.name.includes(keyword))
    
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
                renderItem={user =>(
                    <List.Item>
                        <List.Item.Meta
                            avatar={<Avatar>{user.name[0]}</Avatar>}
                            title={user.name}
                        />
                    </List.Item>
                )}
            />

        </div>


    )
}

export default Users
