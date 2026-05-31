// =================================================================
// MODAL DE LOGIN — UI injetada na sidebar do ChatMix
// =================================================================

import { loginWithEmail } from './login'
import { UserSession } from './session'
import './login.css'

// Callback chamado após login bem sucedido
type OnLoginSuccess = (session: UserSession) => void

export function injectLoginBanner(onLoginSuccess: OnLoginSuccess): void {
  // Remove banner anterior se existir
  document.getElementById('ati-login-banner')?.remove()
  document.getElementById('ati-login-modal-overlay')?.remove()

  const banner = document.createElement('div')
  banner.id = 'ati-login-banner'
  banner.innerHTML = `
    <div class="ati-login-banner-icon">🔒</div>
    <div class="ati-login-banner-text">
      <strong>Extensão ATI</strong>
      <span>Faça login para usar o sistema</span>
    </div>
    <button class="ati-login-banner-btn" id="ati-login-open-btn">Entrar</button>
  `

  // Insere no lugar dos botões de ação
  const actionsContainer = document.getElementById('actionsContainerV2')
  if (actionsContainer) {
    actionsContainer.replaceWith(banner)
  } else {
    // Fallback: appenda na sidebar
    const sidebar = document.querySelector('.chat_sidebar')
    sidebar?.appendChild(banner)
  }

  document.getElementById('ati-login-open-btn')?.addEventListener('click', () => {
    openLoginModal(onLoginSuccess)
  })
}

function openLoginModal(onLoginSuccess: OnLoginSuccess): void {
  // Remove modal anterior se existir
  document.getElementById('ati-login-modal-overlay')?.remove()

  const overlay = document.createElement('div')
  overlay.id = 'ati-login-modal-overlay'
  overlay.innerHTML = `
    <div class="ati-login-modal">
      <div class="ati-login-modal-header">
        <span>🔐 Login — Extensão ATI</span>
      </div>
      <div class="ati-login-modal-body">
        <div class="ati-login-field">
          <label for="ati-login-email">Email</label>
          <input type="email" id="ati-login-email" placeholder="seu@email.com" autocomplete="email" />
        </div>
        <div class="ati-login-field">
          <label for="ati-login-password">Senha</label>
          <input type="password" id="ati-login-password" placeholder="••••••••" autocomplete="current-password" />
        </div>
        <div id="ati-login-error" class="ati-login-error" style="display:none"></div>
      </div>
      <div class="ati-login-modal-footer">
        <button class="ati-login-btn-cancel" id="ati-login-cancel">Cancelar</button>
        <button class="ati-login-btn-submit" id="ati-login-submit">Entrar</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  const emailInput = document.getElementById('ati-login-email') as HTMLInputElement
  const passwordInput = document.getElementById('ati-login-password') as HTMLInputElement
  const errorDiv = document.getElementById('ati-login-error') as HTMLDivElement
  const submitBtn = document.getElementById('ati-login-submit') as HTMLButtonElement
  const cancelBtn = document.getElementById('ati-login-cancel') as HTMLButtonElement

  emailInput.focus()

  // Fecha ao clicar fora
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })

  cancelBtn.addEventListener('click', () => overlay.remove())

  // Submete com Enter
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click()
  })

  submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim()
    const password = passwordInput.value

    if (!email || !password) {
      showError('Preencha email e senha.')
      return
    }

    // Estado de carregamento
    submitBtn.disabled = true
    submitBtn.textContent = 'Entrando...'
    errorDiv.style.display = 'none'

    const result = await loginWithEmail(email, password)

    if (result.success) {
      overlay.remove()
      document.getElementById('ati-login-banner')?.remove()
      onLoginSuccess(result.session)
    } else {
      showError(result.error)
      submitBtn.disabled = false
      submitBtn.textContent = 'Entrar'
      passwordInput.value = ''
      passwordInput.focus()
    }
  })

  function showError(message: string): void {
    errorDiv.textContent = message
    errorDiv.style.display = 'block'
  }
}
