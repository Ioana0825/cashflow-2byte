/*
 * Starting point of the React app: it finds <div id="root"> in index.html and
 * draws the <App /> component inside it.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Fonts are installed as npm packages (@fontsource) instead of loading them
// from Google Fonts. That way the browser never contacts another website,
// which is better for privacy and works offline.
import '@fontsource-variable/fraunces'
import '@fontsource-variable/manrope'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // StrictMode runs extra checks in development to warn about common bugs
  <StrictMode>
    <App />
  </StrictMode>,
)
