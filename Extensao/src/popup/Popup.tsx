import React, { useState, useEffect } from 'react'
import './Popup.css'
import { UserSession } from '../contentScript/chatmix/auth/session'

export const Popup = () => {
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [themeVersion, setThemeVersion] = useState<'modern' | 'legacy'>('modern')
  const [fontSize, setFontSize] = useState<number>(1)
  const [sgpLogin, setSgpLogin] = useState('')
  const [sgpPass, setSgpPass] = useState('')
  const [sgpLoginAlt, setSgpLoginAlt] = useState('')
  const [sgpPassAlt, setSgpPassAlt] = useState('')
  const [showSgpPass, setShowSgpPass] = useState(false)
  const [showSgpPassAlt, setShowSgpPassAlt] = useState(false)
  const [sgpSettingsOpen, setSgpSettingsOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [updateRequired, setUpdateRequired] = useState(false)
  const [latestVersion, setLatestVersion] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)
  const [hideWaitingNotif, setHideWaitingNotif] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [hideSgpOsPrompt, setHideSgpOsPrompt] = useState(false)
  const [hideSgpPromisePrompt, setHideSgpPromisePrompt] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(['ati_user_session', 'ati_theme_version', 'ati_font_size', 'sgp_credentials', 'sgp_credentials_alt', 'ati_update_required', 'ati_latest_version', 'hideWaitingNotifications', 'hideSgpOsPrompt', 'hideSgpPromisePrompt'], (result) => {
      setSession(result.ati_user_session ?? null)
      setUpdateRequired(!!result.ati_update_required)
      setLatestVersion(result.ati_latest_version || '')
      setHideWaitingNotif(!!result.hideWaitingNotifications)
      setHideSgpOsPrompt(!!result.hideSgpOsPrompt)
      setHideSgpPromisePrompt(!!result.hideSgpPromisePrompt)
      if (result.ati_theme_version) {
        setThemeVersion(result.ati_theme_version)
      }
      if (result.ati_font_size) {
        setFontSize(result.ati_font_size)
      }
      if (result.sgp_credentials) {
        setSgpLogin(result.sgp_credentials.login || '')
        setSgpPass(result.sgp_credentials.pass || '')
      }
      if (result.sgp_credentials_alt) {
        setSgpLoginAlt(result.sgp_credentials_alt.login || '')
        setSgpPassAlt(result.sgp_credentials_alt.pass || '')
      }
      setLoading(false)

      // Atualiza os dados do usuário a partir do Firebase de forma silenciosa
      if (result.ati_user_session) {
        chrome.runtime.sendMessage({ action: 'refreshUserSession' }, (response) => {
          if (response?.success && response.session) {
            setSession(response.session)
          }
        })
      }
    })
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleLogout = async () => {
    setLoggingOut(true)
    await chrome.storage.local.remove('ati_user_session')
    setSession(null)
    setLoggingOut(false)
  }

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as 'modern' | 'legacy'
    setThemeVersion(newTheme)
    chrome.storage.local.set({ ati_theme_version: newTheme })
  }

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseFloat(e.target.value)
    setFontSize(newSize)
    chrome.storage.local.set({ ati_font_size: newSize })
  }

  const handleHideWaitingNotifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked
    setHideWaitingNotif(newVal)
    chrome.storage.local.set({ hideWaitingNotifications: newVal })
  }

  const handleHideSgpOsPromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked
    setHideSgpOsPrompt(newVal)
    chrome.storage.local.set({ hideSgpOsPrompt: newVal })
  }

  const handleHideSgpPromisePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked
    setHideSgpPromisePrompt(newVal)
    chrome.storage.local.set({ hideSgpPromisePrompt: newVal })
  }

  const handleOpenSite = () => {
    const targetUrl = 'https://vituali.github.io/ati/'
    chrome.tabs.query({ url: 'https://vituali.github.io/ati/*' }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const tab = tabs[0]
        chrome.tabs.update(tab.id!, { active: true })
        if (tab.windowId) {
          chrome.windows.update(tab.windowId, { focused: true })
        }
      } else {
        chrome.tabs.create({ url: targetUrl })
      }
    })
  }

  const handleSaveSgp = () => {
    chrome.storage.local.set(
      {
        sgp_credentials: { login: sgpLogin, pass: sgpPass },
        sgp_credentials_alt: { login: sgpLoginAlt, pass: sgpPassAlt },
      },
      () => {
        setSgpSettingsOpen(false)
        setToast('Credenciais SGP salvas com sucesso!')
      },
    )
  }

  const handleClearSgp = () => {
    setConfirmModal({
      message: 'Deseja realmente remover as credenciais salvas do SGP?',
      onConfirm: () => {
        chrome.storage.local.remove(['sgp_credentials', 'sgp_credentials_alt'], () => {
          setSgpLogin('')
          setSgpPass('')
          setSgpLoginAlt('')
          setSgpPassAlt('')
          setSgpSettingsOpen(false)
          setToast('Credenciais removidas')
          setConfirmModal(null)
        })
      },
    })
  }

  const handleReleaseVersion = async () => {
    if (!session || session.role !== 'admin') return

    setLoading(true)
    try {
      const { firebaseConfig } = await import('../background/config')
      const currentVersion = chrome.runtime.getManifest().version
      const url = `${firebaseConfig.databaseURL}config/extension.json?auth=${session.idToken}`

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minVersion: currentVersion,
          updatedAt: new Date().toISOString(),
          releasedBy: session.username,
        }),
      })

      if (response.ok) {
        setToast('✅ Versão lançada com sucesso!')
        setUpdateRequired(false)
      } else {
        const error = await response.json()
        console.error('Erro no release:', error)
        setToast('❌ Erro ao lançar versão.')
      }
    } catch (err) {
      console.error('Erro de conexão:', err)
      setToast('❌ Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckUpdates = () => {
    setLoading(true)
    chrome.runtime.sendMessage({ action: 'checkVersion' }, (_response) => {
      setLoading(false)
      chrome.storage.local.get(['ati_update_required', 'ati_latest_version'], (result) => {
        const hasUpdate = !!result.ati_update_required
        setUpdateRequired(hasUpdate)
        setLatestVersion(result.ati_latest_version || '')
        if (hasUpdate) {
          setToast(`🚀 Nova versão disponível: ${result.ati_latest_version}`)
        } else {
          setToast('✨ Sua extensão está atualizada!')
        }
      })
    })
  }

  const currentManifestVersion = chrome.runtime.getManifest().version
  const canRelease = session?.role === 'admin' && currentManifestVersion !== latestVersion

  if (loading) {
    return (
      <div className="popup-container">
        <div className="popup-loading">
          <div className="popup-spinner" />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="popup-container">
        <div className="popup-header">
          <div className="popup-logo">ATI</div>
          <span className="popup-title">Extensão ATI</span>
        </div>
        <div className="popup-not-logged">
          <div className="popup-lock">🔒</div>
          <p>Nenhuma sessão ativa</p>
          <span>Acesse o ChatMix para fazer login</span>
        </div>
        <button className="popup-btn popup-btn--site" onClick={handleOpenSite}>
          ↗ Abrir Site ATI
        </button>
      </div>
    )
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="popup-logo">ATI</div>
        <span className="popup-title">Extensão ATI</span>
      </div>

      {updateRequired && (
        <div className="popup-update-banner">
          <div className="update-icon">🚀</div>
          <div className="update-content">
            <strong>Nova Versão Disponível ({latestVersion})</strong>
            <p>Sua extensão está desatualizada. O Chrome tentará atualizar automaticamente em breve.</p>
          </div>
        </div>
      )}

      {canRelease && (
        <div className="popup-admin-release">
          <button className="popup-btn popup-btn--release" onClick={handleReleaseVersion} disabled={loading}>
            🚀 Lançar Versão {currentManifestVersion}
          </button>
          <small>Sincroniza a versão mínima do Firebase com a sua versão atual.</small>
        </div>
      )}

      <div className="popup-user">
        <div className="popup-avatar">{(session.nomeCompleto || '?').charAt(0).toUpperCase()}</div>
        <div className="popup-user-info">
          <strong>{session.nomeCompleto}</strong>
          <span>@{session.username}</span>
        </div>
        <div className={`popup-role popup-role--${session.role}`}>{session.role === 'admin' ? '⭐ Admin' : session.role === 'supervisor' ? '🎖️ Superv.' : session.role === 'moderador' ? '🛡️ Moder.' : '👤 Usuário'}</div>
      </div>

      {/* Opções da Extensão */}
      <div className="popup-section">
        <button className={`popup-btn-toggle ${optionsOpen ? 'open' : ''}`} onClick={() => setOptionsOpen(!optionsOpen)}>
          {optionsOpen ? '▼' : '▶'} Opções da Extensão
        </button>

        {optionsOpen && (
          <div className="popup-sgp-settings">
            <div className="popup-theme-selector">
              <label htmlFor="theme-select">Estilo do Tema Escuro:</label>
              <select id="theme-select" value={themeVersion} onChange={handleThemeChange}>
                <option value="modern">Moderno (Azul, Neon e Bordas)</option>
                <option value="legacy">Clássico (Cinza e Simples)</option>
              </select>
              <small>*Só surte efeito se o próprio Chatmix estiver usando a "aparência escura" padrão.</small>
            </div>

            <div className="popup-theme-selector" style={{ marginTop: '0.5rem' }}>
              <label htmlFor="font-size-slider" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Tamanho da Fonte: <span>{Math.round(fontSize * 100)}%</span>
              </label>
              <input id="font-size-slider" type="range" min="0.8" max="1.8" step="0.05" value={fontSize} onChange={handleFontSizeChange} style={{ width: '100%', marginTop: '0.25rem' }} />
            </div>

            <div className="popup-divider" style={{ margin: '0.5rem 0' }} />

            <div className="popup-theme-selector" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <input id="hide-waiting-notif" type="checkbox" checked={hideWaitingNotif} onChange={handleHideWaitingNotifChange} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
              <label htmlFor="hide-waiting-notif" style={{ cursor: 'pointer', fontSize: '11px', userSelect: 'none', fontWeight: 600 }}>
                Ocultar alerta "Em espera" no ChatMix
              </label>
            </div>

            <div className="popup-theme-selector" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '0.25rem' }}>
              <input id="hide-os-prompt" type="checkbox" checked={hideSgpOsPrompt} onChange={handleHideSgpOsPromptChange} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
              <label htmlFor="hide-os-prompt" style={{ cursor: 'pointer', fontSize: '11px', userSelect: 'none', fontWeight: 600 }}>
                Ocultar aviso de O.S. (Auxiliar) no SGP
              </label>
            </div>

            <div className="popup-theme-selector" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '0.25rem' }}>
              <input id="hide-promise-prompt" type="checkbox" checked={hideSgpPromisePrompt} onChange={handleHideSgpPromisePromptChange} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
              <label htmlFor="hide-promise-prompt" style={{ cursor: 'pointer', fontSize: '11px', userSelect: 'none', fontWeight: 600 }}>
                Ocultar aviso de Promessa de Pagamento
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="popup-divider" />

      {/* SGP Automation Settings */}
      <div className="popup-section">
        <button className={`popup-btn-toggle ${sgpSettingsOpen ? 'open' : ''}`} onClick={() => setSgpSettingsOpen(!sgpSettingsOpen)}>
          {sgpSettingsOpen ? '▼' : '▶'} Automação de Login SGP
        </button>

        {sgpSettingsOpen && (
          <div className="popup-sgp-settings">
            <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '0.85rem' }}>Login Principal (DNS / Central)</h4>
            <div className="popup-field">
              <label>Usuário:</label>
              <input type="text" value={sgpLogin} onChange={(e) => setSgpLogin(e.target.value)} placeholder="Ex: joao.silva" />
            </div>
            <div className="popup-field">
              <label>Senha:</label>
              <div className="popup-pass-wrapper">
                <input type={showSgpPass ? 'text' : 'password'} value={sgpPass} onChange={(e) => setSgpPass(e.target.value)} placeholder="Sua senha do SGP" />
                <button className="popup-btn-icon" onClick={() => setShowSgpPass(!showSgpPass)}>
                  {showSgpPass ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            <div className="popup-divider" style={{ margin: '0.75rem 0' }} />

            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>Login Reserva (IP 201.158.20.53)</h4>
            <div className="popup-field">
              <label>Usuário:</label>
              <input type="text" value={sgpLoginAlt} onChange={(e) => setSgpLoginAlt(e.target.value)} placeholder="Usuário diferente?" />
            </div>
            <div className="popup-field">
              <label>Senha:</label>
              <div className="popup-pass-wrapper">
                <input type={showSgpPassAlt ? 'text' : 'password'} value={sgpPassAlt} onChange={(e) => setSgpPassAlt(e.target.value)} placeholder="Senha diferente?" />
                <button className="popup-btn-icon" onClick={() => setShowSgpPassAlt(!showSgpPassAlt)}>
                  {showSgpPassAlt ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            <div className="popup-sgp-actions">
              <button className="popup-btn popup-btn--save" onClick={handleSaveSgp}>
                Salvar
              </button>
              {(sgpPass || sgpPassAlt) && (
                <button className="popup-btn popup-btn--clear" onClick={handleClearSgp}>
                  Limpar
                </button>
              )}
            </div>
            <p className="popup-hint">* Suas credenciais são salvas apenas neste navegador.</p>
          </div>
        )}
      </div>

      <div className="popup-divider" />

      <div className="popup-actions">
        <button className="popup-btn popup-btn--check-updates" onClick={handleCheckUpdates} disabled={loading}>
          🔄 Verificar Atualizações
        </button>
        <button className="popup-btn popup-btn--site" onClick={handleOpenSite}>
          ↗ Abrir Site ATI
        </button>
        <button className="popup-btn popup-btn--logout" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Saindo...' : '⏻ Sair'}
        </button>
      </div>

      {toast && <div className="popup-toast">{toast}</div>}

      {confirmModal && (
        <div className="popup-modal-overlay">
          <div className="popup-modal">
            <p>{confirmModal.message}</p>
            <div className="popup-modal-actions">
              <button className="popup-modal-btn popup-modal-btn--cancel" onClick={() => setConfirmModal(null)}>
                Cancelar
              </button>
              <button className="popup-modal-btn popup-modal-btn--confirm" onClick={confirmModal.onConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Popup
