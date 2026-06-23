import Modal from './Modal'
import { Share, Download, Monitor, Smartphone, MoreVertical } from 'lucide-react'
import './InstallModal.css'

interface InstallModalProps {
  aberto: boolean
  onFechar: () => void
  deferredPrompt: any
  onInstallClick: () => void
}

export default function InstallModal({ aberto, onFechar, deferredPrompt, onInstallClick }: InstallModalProps) {
  const isIOS = typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Instalar Aplicativo" largura="500px">
      <div className="install-modal-content">
        <p className="install-intro">
          Instale o <strong>ATI</strong> no seu dispositivo para ter acesso rápido direto da sua tela inicial, melhor performance e suporte offline.
        </p>

        {deferredPrompt && (
          <div className="install-prompt-section">
            <button className="install-main-btn" onClick={onInstallClick}>
              <Download size={18} /> Instalar Agora
            </button>
            <div className="install-divider">
              <span>ou siga as instruções abaixo</span>
            </div>
          </div>
        )}

        <div className="install-steps">
          {/* iOS Section */}
          {isIOS ? (
            <div className="install-step-card active-platform">
              <div className="install-platform-header">
                <Smartphone className="platform-icon" size={20} />
                <span>Instruções para iPhone / iPad (iOS)</span>
              </div>
              <ol className="install-instructions-list">
                <li>
                  Abra o site no navegador <strong>Safari</strong>.
                </li>
                <li>
                  Toque no botão de <strong>Compartilhar</strong> <Share size={16} className="inline-icon" /> (ícone de quadrado com uma seta para cima na barra inferior).
                </li>
                <li>
                  Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong>.
                </li>
                <li>
                  Toque em <strong>"Adicionar"</strong> no canto superior direito para confirmar.
                </li>
              </ol>
            </div>
          ) : (
            <>
              {/* Android/Chrome Section */}
              <div className="install-step-card">
                <div className="install-platform-header">
                  <Smartphone className="platform-icon" size={20} />
                  <span>Android (Chrome)</span>
                </div>
                <ol className="install-instructions-list">
                  <li>
                    Toque nos três pontinhos <MoreVertical size={14} className="inline-icon" /> no canto superior direito do navegador.
                  </li>
                  <li>
                    Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </li>
                  <li>
                    Confirme a instalação na tela.
                  </li>
                </ol>
              </div>

              {/* Desktop Section */}
              <div className="install-step-card">
                <div className="install-platform-header">
                  <Monitor className="platform-icon" size={20} />
                  <span>Computador (Chrome / Edge)</span>
                </div>
                <ol className="install-instructions-list">
                  <li>
                    Clique no ícone de instalação (computador com seta para baixo) na barra de endereços do navegador (ao lado da estrela de favoritos).
                  </li>
                  <li>
                    Ou clique nos três pontinhos no canto superior direito e selecione <strong>"Instalar ATI..."</strong>.
                  </li>
                </ol>
              </div>

              {/* iOS Manual fallback in case they are on iOS but userAgent check is not active */}
              <div className="install-step-card iOS-fallback">
                <div className="install-platform-header">
                  <Smartphone className="platform-icon" size={20} />
                  <span>iPhone / iPad (iOS)</span>
                </div>
                <p className="install-fallback-text">
                  Abra o Safari, toque em compartilhar <Share size={14} className="inline-icon" /> e escolha <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="install-footer">
          <button className="install-btn-close" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  )
}
