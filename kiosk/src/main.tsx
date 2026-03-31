// Deployment v3.2.7 - Kiosk Stable
import React from 'react'
import ReactDOM from 'react-dom/client'
import KioskHome from './components/KioskHome'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <main>
      <KioskHome />
    </main>
  </React.StrictMode>,
)
