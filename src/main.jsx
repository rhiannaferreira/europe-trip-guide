import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/styles.css'
import Root from './Root.jsx'
import { setupPwa } from './lib/pwa.js'
import { setupAnalytics } from './lib/analytics.js'

setupPwa()
setupAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
