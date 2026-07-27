import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource-variable/jetbrains-mono'
import './styles/tokens.css'
import './styles/base.css'
import './styles/controls.css'
import './styles/readout.css'
import './styles/details.css'
import './styles/cockpit.css'
import './styles/sheet.css'
import './styles/chrome.css'
import './styles/widgets.css'

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
