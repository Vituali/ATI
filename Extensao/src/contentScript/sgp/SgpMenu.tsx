import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './SgpMenu.css';
import { ensureFreshToken } from '../chatmix/auth/session';
import { showOSModal } from '../chatmix/os/osModal';
import { safeSendMessage, showToast } from '../chatmix/helpers';
import { ClientData } from './types';
import type { GetOsTemplatesRequest } from '../../background/types';
import { SGP_IP_35, SGP_IP_53 } from '../../background/sgp/constants';

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

  // Se o nome ainda for genérico 'Cliente', tenta buscar em links e breadcrumbs do DOM
  if (fullName === 'Cliente') {
    const allLinks = Array.from(document.querySelectorAll('a'));
    const clientLink = allLinks.find((link) => {
      const href = link.getAttribute('href') || '';
      return (href.includes('/admin/cliente/cliente/') || href.includes('/admin/cliente/')) &&
             !href.includes('/add/') &&
             !href.includes('/list/') &&
             !/^(alterar|excluir|histórico|historico|add|adicionar|limpar|voltar)$/i.test(link.textContent?.trim() || '');
    });

    if (clientLink) {
      const text = clientLink.textContent?.trim() || '';
      if (text) {
        const nameMatch = text.match(/^(?:\d+\s*-\s*)?(.+)$/);
        if (nameMatch) {
          fullName = nameMatch[1].trim();
        }
      }
      
      if (!clientSgpId) {
        const href = clientLink.getAttribute('href') || '';
        const idMatch = href.match(/\/cliente\/(?:cliente\/)?(\d+)/);
        if (idMatch) {
          clientSgpId = idMatch[1];
        }
      }
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

  // Outros fallbacks adicionais para nome do cliente se ainda estiver 'Cliente'
  if (fullName === 'Cliente') {
    const heading = document.querySelector('#content-main h1, #content h1, h1');
    if (heading && heading.textContent) {
      const headingText = heading.textContent.trim();
      if (headingText.includes('|')) {
        fullName = headingText.split('|').pop()?.trim() || 'Cliente';
      } else if (headingText.includes(' - ')) {
        fullName = headingText.split(' - ').pop()?.trim() || 'Cliente';
      } else if (headingText.includes(':')) {
        fullName = headingText.split(':').pop()?.trim() || 'Cliente';
      } else if (headingText.toLowerCase().includes('contrato') && headingText.toLowerCase().includes('cliente')) {
        const cleanName = headingText.replace(/contrato[s]?\s+do\s+cliente\s+/i, '').trim();
        if (cleanName && cleanName !== headingText) {
          fullName = cleanName;
        }
      } else if (!headingText.toLowerCase().includes('alterar') && !headingText.toLowerCase().includes('visualizar')) {
        fullName = headingText;
      }
    }
  }

  if (fullName === 'Cliente') {
    const breadcrumbEl = document.querySelector('.breadcrumbs, .breadcrumb');
    if (breadcrumbEl && breadcrumbEl.textContent) {
      const parts = breadcrumbEl.textContent.split(/[›>\/]/).map(p => p.trim());
      if (parts.length >= 4) {
        const candidate = parts[parts.length - 2];
        if (candidate && !/^(contrato|contratos|ocorrencia|ocorrencias|servico|servicos|adicionar|alterar|cliente|clientes)$/i.test(candidate)) {
          fullName = candidate;
        }
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

  const is53 = window.location.hostname.includes('201.158.20.53');

  const handleToggleServer = async () => {
    setIsOpen(false);
    
    const clientData = getSgpClientData();
    const targetOrigin = is53 ? SGP_IP_35 : SGP_IP_53;
    
    // Se estivermos na página de um cliente identificado e com nome válido
    if (clientData.clientSgpId && clientData.fullName && clientData.fullName !== 'Cliente') {
      showToast('Buscando cliente no outro servidor...', 'info', 3000);
      
      try {
        const response = await safeSendMessage({
          action: 'findClientOnSgp',
          baseUrl: targetOrigin,
          clientData: {
            fullName: clientData.fullName,
            phoneNumber: '',
            cpfCnpj: null
          }
        });
        
        if (response && response.success && response.clients && response.clients.length > 0) {
          const newClientId = response.clients[0].id;
          
          let targetPath = window.location.pathname;
          let targetSearch = window.location.search;
          
          // Verifica se o ID do cliente atual faz parte do path da URL
          if (clientData.clientSgpId && targetPath.includes(clientData.clientSgpId)) {
            // Substitui o ID antigo pelo ID do outro servidor no path e query string
            targetPath = targetPath.replace(new RegExp(`\\b${clientData.clientSgpId}\\b`, 'g'), newClientId);
            targetSearch = targetSearch.replace(new RegExp(`\\b${clientData.clientSgpId}\\b`, 'g'), newClientId);
          } else {
            // Se o ID do cliente não faz parte do path (ex: estamos em uma página de serviço como /admin/servicos/internet/124464/),
            // redirecionamos para a tela de contratos do cliente encontrado, para evitar erros de 404 de IDs incompatíveis.
            targetPath = `/admin/cliente/${newClientId}/contratos/`;
            targetSearch = '';
          }
          
          const targetUrl = targetOrigin + targetPath + targetSearch + window.location.hash;
          showToast(`Cliente encontrado! Redirecionando para SGP ${is53 ? '.35 (Antigo)' : '.53 (Novo)'}...`, 'success', 3000);
          window.location.href = targetUrl;
          return;
        } else {
          showToast('Cliente não encontrado no outro SGP. Redirecionando para a página inicial...', 'error', 4000);
          window.location.href = targetOrigin + '/admin/';
          return;
        }
      } catch (err) {
        console.error('Erro ao buscar cliente no outro SGP:', err);
      }
    }
    
    // Caso padrão (se não for página de cliente ou se falhar na busca)
    const targetUrl = targetOrigin + window.location.pathname + window.location.search + window.location.hash;
    showToast(`Redirecionando para SGP ${is53 ? '.35 (Antigo)' : '.53 (Novo)'}...`, 'success', 3000);
    window.location.href = targetUrl;
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
        <button className="ati-sgp-menu-item" onClick={handleToggleServer}>
          <span className="ati-sgp-menu-icon">🔄</span>
          <span className="ati-sgp-menu-text">
            {is53 ? 'Abrir no .35' : 'Abrir no .53'}
          </span>
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
