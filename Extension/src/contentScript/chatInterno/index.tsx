import { createRoot } from 'react-dom/client'
import FloatingChat from './ChatInterno'
import { UserSession } from '../chatmix/auth/session'

export function injectFloatingChat(_user: UserSession) {
  if (document.getElementById('ati-floating-chat-root')) return

  const rootDiv = document.createElement('div')
  rootDiv.id = 'ati-floating-chat-root'
  document.body.appendChild(rootDiv)

  const root = createRoot(rootDiv)
  root.render(<FloatingChat />)
}
