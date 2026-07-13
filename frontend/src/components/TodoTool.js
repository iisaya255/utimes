import IButton from '../base/Button'
import { Divider } from 'antd'

function TodoTool({eventInput}) {

    const handleClick = function(event) {
        // 链接分两种, 事件 / 跳转
        const openLink = (url) => {
            window.open(url)
        }
        const changeConfig = (config) => {
            console.log(config)
        }

        let target = event.target
        while(target.nodeName !== 'BUTTON') {
            target = target.parentNode
        }

        const eventName = target.id
        const exec = eventInput(eventName)
        if (!exec) {
            if (target.dataset.url) {
                openLink(target.dataset.url)
            }
            if (target.dataset.config) {
                changeConfig(target.dataset.config)
            }
        }
        event.preventDefault()
    }


    return (
        <div className="container-tools" onClick={handleClick}>
            <div className="tool-group">
                <IButton text="日历查询" href="/calendar" action="tool-calender"/>
                <IButton text="看看昨天" action="tool-yesterday"/>
                <IButton text="明天再说" action="tool-tomorrow"/>
            </div>
            
            <Divider className="tool-divider" />
            
            <div className="tool-group">
                <IButton text="深色模式" config='mode-theme' action="tool-theme"/>
                <IButton text="打码模式" config='mode-blur' action="tool-mosaic"/>
                <IButton text="配置页面" href='/manage' action="tool-manage"/>
                <IButton text="用户列表" href='/users' action="tool-users"/>
            </div>
            
            <Divider className="tool-divider" />

            <div className="tool-group">
                <IButton text="新增记录" action="tool-add"/>
                <IButton text="保存⌘+S" action="tool-save"/>
            </div>
        </div>
    )

}

export default TodoTool