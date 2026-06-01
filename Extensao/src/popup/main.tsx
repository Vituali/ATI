import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Popup from './Popup'

const root = createRoot(document.getElementById('root')!)

if (import.meta.env.MODE === 'development') {
  root.render(
    <StrictMode>
      <Popup />
    </StrictMode>,
  )
} else {
  root.render(<Popup />)
}
