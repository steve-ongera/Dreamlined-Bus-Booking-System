
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'   // ← Bootstrap FIRST
import 'bootstrap-icons/font/bootstrap-icons.css'
import './global.css'                             // ← Your CSS LAST (wins!)
import App from './App.jsx'
import './admin/admin_style.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)