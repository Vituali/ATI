// components/ExtensionModal.tsx
import Modal from "./Modal";
import "./ExtensionModal.css";

interface ExtensionModalProps {
  aberto: boolean;
  onFechar: () => void;
}

export default function ExtensionModal({
  aberto,
  onFechar,
}: ExtensionModalProps) {
  const extensionUrl =
    "https://chromewebstore.google.com/detail/ati-auxiliar-de-atendimen/mlgmmjacfbnkolflbankfiackpcnmckl";

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="🚀 Extensão ATI"
      largura="520px"
    >
      <div className="extension-modal-content">
        <div className="extension-preview-container">
          <img
            src="./extension_preview.png"
            alt="Preview da Extensão ATI"
            className="extension-preview-img"
          />
          <div className="extension-preview-overlay">
            <span className="extension-version">v2.0.5.3</span>
          </div>
        </div>

        <div className="extension-info">
          <h3>Leve o ATI com você!</h3>
          <p>
            A extensão <strong>ATI — Auxiliar de Atendimentos</strong>{" "}
            integra-se diretamente ao seu navegador para agilizar seus processos
            no SGP.
          </p>

          <ul className="extension-features">
            <li>
              ✨ <strong>Preenchimento Automático:</strong> Gere O.S. com um
              clique.
            </li>
            <li>
              🤖 <strong>Chat Integrado:</strong> Respostas rápidas em qualquer
              aba.
            </li>
            <li>
              ⚡ <strong>Produtividade:</strong> Atalhos exclusivos para o dia a
              dia.
            </li>
          </ul>
        </div>

        <div className="extension-footer">
          <p className="extension-disclaimer">
            Você será redirecionado para a Chrome Web Store.
          </p>
          <div className="extension-actions">
            <button className="btn-cancel" onClick={onFechar}>
              Agora não
            </button>
            <a
              href={extensionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-install"
              onClick={onFechar}
            >
              Instalar Extensão ↗
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
