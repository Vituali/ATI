import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './SgpMenu.css';
import { ensureFreshToken } from '../chatmix/auth/session';
import { showOSModal } from '../chatmix/os/osModal';
import { safeSendMessage, showToast } from '../chatmix/helpers';
import { ClientData } from './types';
import type { GetOsTemplatesRequest } from '../../background/types';

export function getSgpClientData(): ClientData {
  const title = document.title || '';
  // Exemplo: "SGP - MARLENE OLIVEIRA CORDEIRO (126441) - Adicionar ocorrência"
  const titleMatch = title.match(/SGP\s*-\s*([^(]+)(?:\((\d+)\))?/i);
  
  let fullName = 'Cliente';
  let clientSgpId: string | null = null;
  
  if (titleMatch) {
    fullName = titleMatch[1].trim();
    clientSgpId = titleMatch[2] ? titleMatch[2].trim() : null;
  }
  
  if (!clientSgpId) {
    const urlMatch = window.location.pathname.match(/\/(?:cliente|atendimento\/cliente)\/(\d+)/);
    if (urlMatch) {
      clientSgpId = urlMatch[1];
    }
  }
  
  if (fullName === 'Cliente') {
    const headerEl = document.querySelector('#content h1, .breadcrumbs');
    if (headerEl && headerEl.textContent) {
      const text = headerEl.textContent;
      const match = text.match(/cliente:\s*([^/]+)/i) || text.match(/ocorrencia\s+de\s+([^/]+)/i);
      if (match) {
        fullName = match[1].trim();
      }
    }
  }
  
  const firstName = fullName.split(' ')[0];
  
  return {
    fullName,
    firstName,
    phoneNumber: '',
    cpfCnpj: null,
    isIdentified: true,
    clientSgpId,
    clientSgpOrigin: window.location.origin,
  };
}

export async function handleOpenOS() {
  const isOccurrencePage = window.location.pathname.includes('/ocorrencia/add/');
  if (!isOccurrencePage) {
    showToast('⚠️ Para usar a O.S. (Auxiliar), acesse a página de "Adicionar ocorrência" do cliente no SGP.', 'error', 7000);
    return;
  }

  try {
    const session = await ensureFreshToken();
    if (!session) {
      showToast('Sessão expirada. Faça login novamente no ChatMix.', 'error');
      return;
    }

    showToast('Carregando templates da O.S...', 'info');

    // Busca templates do Firebase e atualiza o perfil em background
    const [templatesRes] = await Promise.all([
      safeSendMessage<GetOsTemplatesRequest>({
        action: 'getOsTemplates',
        username: session.username,
        idToken: session.idToken,
      }),
      safeSendMessage({ action: 'refreshUserSession' }).catch(() => null)
    ]);

    const templates = templatesRes?.templates ?? [];
    const clientData = getSgpClientData();
    
    await showOSModal(templates, () => [], clientData);
  } catch (error: any) {
    console.error('Extensão ATI: Erro ao abrir O.S. Auxiliar:', error);
    showToast(`Erro ao abrir O.S.: ${error.message || error}`, 'error');
  }
}

const SgpMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const onOpenOS = async () => {
    setIsOpen(false);
    await handleOpenOS();
  };

  const handlePromessaPagamento = () => {
    setIsOpen(false);
    const clientData = getSgpClientData();
    
    if (!clientData.clientSgpId) {
      showToast('⚠️ Não foi possível identificar o ID do cliente nesta página para abrir a promessa de pagamento.', 'error', 7000);
      return;
    }
    
    if (typeof (window as any).showPaymentPromiseMenuModal === 'function') {
      const contractSelect = document.querySelector('#id_clientecontrato, #id_cobranca') as HTMLSelectElement | null;
      const contractId = contractSelect ? contractSelect.value : null;
      (window as any).showPaymentPromiseMenuModal(clientData.clientSgpId, contractId);
    } else {
      showToast('Redirecionando para Promessa de Pagamento...', 'success', 3000);
      const promessaUrl = `${window.location.origin}/admin/financeiro/promessapagamento/cliente/${clientData.clientSgpId}/add/`;
      window.location.href = promessaUrl;
    }
  };

  return (
    <div className="ati-sgp-container">
      {/* Botão Flutuante */}
      <button 
        className={`ati-sgp-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Painel Auxiliar ATI SGP"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
        )}
      </button>

      {/* Menu Popover Nativo SGP */}
      <div className={`ati-sgp-menu ${isOpen ? 'show' : ''}`}>
        <div className="ati-sgp-menu-header">
          <span>Painel ATI SGP</span>
        </div>
        <button className="ati-sgp-menu-item" onClick={onOpenOS}>
          <span className="ati-sgp-menu-icon">📋</span>
          <span className="ati-sgp-menu-text">O.S. (Auxiliar)</span>
        </button>
        <button className="ati-sgp-menu-item" onClick={handlePromessaPagamento}>
          <span className="ati-sgp-menu-icon">🤝</span>
          <span className="ati-sgp-menu-text">Promessa de Pagamento</span>
        </button>
      </div>
    </div>
  );
};

export function injectSgpMenu() {
  if (document.getElementById('ati-sgp-menu-root')) return;

  const rootDiv = document.createElement('div');
  rootDiv.id = 'ati-sgp-menu-root';
  document.body.appendChild(rootDiv);

  const root = createRoot(rootDiv);
  root.render(<SgpMenu />);
}
