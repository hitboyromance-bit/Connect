import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyThemePreference, getThemePreference, watchSystemTheme } from './utils/theme.ts'

applyThemePreference(getThemePreference())
watchSystemTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
