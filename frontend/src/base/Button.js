import { Button } from 'antd'

function IButton({text, action, href='', config=''}) {
    return (
        <Button size="large" type="primary" data-config={config} data-url={href} id={action}>
            {text}
        </Button>
    )
}

export default IButton