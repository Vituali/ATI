// components/ExtensionModal.tsx
import { useState, useEffect } from 'react'
import { ref, get } from 'firebase/database'
import { db } from '../../services'
import Modal from '../../components/ui/Modal'
import './Extension.css'

interface ExtensionModalProps {
  aberto: boolean
  onFechar: () => void
}

export default function ExtensionModal({ aberto, onFechar }: ExtensionModalProps) {
  const extensionUrl = 'https://chromewebstore.google.com/detail/ati-auxiliar-de-atendimen/mlgmmjacfbnkolflbankfiackpcnmckl'

  const [version, setVersion] = useState('v2.2.0.1')

  useEffect(() => {
    if (!aberto) return

    get(ref(db, 'config/extension'))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val()
          if (data.minVersion) {
            setVersion(`v${data.minVersion}`)
          }
        }
      })
      .catch((err) => {
        console.warn('Erro ao buscar versão da extensão:', err)
      })
  }, [aberto])

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="🚀 Extensão ATI" largura="520px">
      <div className="extension-modal-content">
        <div className="extension-preview-container">
          <img src="./extension_preview.png" alt="Preview da Extensão ATI" className="extension-preview-img" />
          <div className="extension-preview-overlay">
            <span className="extension-version">{version}</span>
          </div>
        </div>

        <div className="extension-info">
          <h3>Leve o ATI com você!</h3>
          <p>
            A extensão <strong>ATI — Auxiliar de Atendimentos</strong> integra-se diretamente ao seu navegador para agilizar seus processos no SGP.
          </p>

          <ul className="extension-features">
            <li>
              ✨ <strong>Preenchimento Automático:</strong> Gere O.S. com um clique.
            </li>
            <li>
              🤖 <strong>Chat Integrado:</strong> Respostas rápidas em qualquer aba.
            </li>
            <li>
              ⚡ <strong>Produtividade:</strong> Atalhos exclusivos para o dia a dia.
            </li>
          </ul>
        </div>

        <div className="extension-footer">
          <p className="extension-disclaimer">Você será redirecionado para a Chrome Web Store.</p>
          <div className="extension-actions">
            <button className="btn-cancel" onClick={onFechar}>
              Agora não
            </button>
            <a href={extensionUrl} target="_blank" rel="noopener noreferrer" className="btn-install" onClick={onFechar}>
              Instalar Extensão ↗
            </a>
          </div>
        </div>
      </div>
    </Modal>
  )
}
