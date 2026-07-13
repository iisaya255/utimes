import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import reportWebVitals from './reportWebVitals'
import {
    createBrowserRouter,
} from "react-router-dom"

import Edit from './pages/edit'
import Detail from './pages/detail'
import ISearch from './pages/search'
import ICalendar from './pages/calendar'
import Manage from './pages/manage'
import Login from './pages/login'
import { getThemeFromStorage, applyTheme } from './utils/theme'
import App from './App'
import Users from './pages/users'
import Profile from './pages/profile'
import PublicDetail from './pages/publicDetail'

const router = createBrowserRouter([
    {
        path: "/",
        element: <Login />,
    },
    {
        path: "/edit",
        element: <Edit />,
    },
    {
        path: "/edit/:date",
        element: <Edit />,
    },
    {
        path:"/users",
        element:<Users />,
    },
    {
        path: "/detail/:date",
        element: <Detail />,
    },
    {
        path: "/search",
        element: <ISearch />
    },
    {
        path: "/manage",
        element: <Manage />,
    },
    {
        path: "/calendar",
        element: <ICalendar />,
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/:username",
        element: <Profile />,
    },
    {
        path: "/:username/detail/:date",
        element: <PublicDetail />,
    },
]);

// 初始化主题（仅从 localStorage）
const savedTheme = getThemeFromStorage()
applyTheme(savedTheme)

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <React.StrictMode>
        <App router={router} />
    </React.StrictMode>
)

reportWebVitals()
