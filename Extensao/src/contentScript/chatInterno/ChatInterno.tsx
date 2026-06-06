import React, { useState, useRef } from 'react';
import './ChatInterno.css';
import { safeSendMessage, showToast } from '../chatmix/helpers';

interface FeasibilityResult {
  id: string;
  name: string;
  address: string;
  status: string;
  system: string;
  cpfCnpj?: string;
  cadastro?: string;
}

function getStatusPriorityScore(statusStr: string): number {
  const lower = statusStr.toLowerCase().trim();
  if (lower.includes('inativo')) return 2;
  if (lower.includes('cancelado')) return 1;
  if (lower.includes('reduzida') || lower.includes('v. red') || lower.includes('vel. red')) return 4;
  if (lower.includes('ativo')) return 5;
  if (lower.includes('suspenso')) return 3;
  return 0; // Sem status ou outros
}

function parseSgpFeasibilityHtml(htmlStr: string, systemName: string): FeasibilityResult[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlStr, 'text/html');
  
  // Encontra linhas na listagem do Django Admin
  const rows = doc.querySelectorAll('#result_list tbody tr, table.contrato tbody tr, table.tablelist tbody tr, tr[role="row"]');
  const results: FeasibilityResult[] = [];
  
  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 3) return;
    
    // Extrai ID da célula 0
    let clientId = '';
    const idLink = cells[0].querySelector('a');
    if (idLink) {
      clientId = idLink.textContent?.trim() || '';
    } else {
      clientId = cells[0].textContent?.trim() || '';
    }
    
    // Extrai Nome, CPF/CNPJ e endereço da célula 1
    const cell1 = cells[1];
    if (!cell1) return;

    // Converte <br> em quebras de linha para garantir a separação correta dos dados em qualquer ambiente
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cell1.innerHTML;
    tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    const cell1Text = tempDiv.textContent || '';
    
    const lines = cell1Text.split('\n').map(l => l.trim()).filter(Boolean);
    
    const nameLink = cell1.querySelector('a');
    let clientName = nameLink ? nameLink.textContent?.trim() || '' : '';
    if (!clientName && lines.length > 0) {
      clientName = lines[0];
    }
    
    // Regex de CPF/CNPJ flexível sem \b boundaries (para contornar não quebras de espaço ou símbolos adjacentes)
    const cpfCnpjMatch = cell1Text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    const cpfCnpj = cpfCnpjMatch ? cpfCnpjMatch[0].trim() : '';
    
    // O endereço costuma ser a última linha após nome, cpf e telefones
    const address = lines.length > 1 ? lines[lines.length - 1] : (lines.length > 0 ? lines[0] : '');
    
    // Extrai Status da célula 2 (Serviços) usando as classes ss_bold do SGP
    let status = 'Sem status';
    const cell2 = cells[2];
    if (cell2) {
      const statusSpans = Array.from(cell2.querySelectorAll('span[class*="ss_bold"], span[class^="ss_bold"], .ss_bold1, .ss_bold2, .ss_bold3, .ss_bold4, .ss_bold5'));
      if (statusSpans.length > 0) {
        let bestSpan = statusSpans[0];
        let maxScore = getStatusPriorityScore(bestSpan.textContent || '');
        for (let i = 1; i < statusSpans.length; i++) {
          const score = getStatusPriorityScore(statusSpans[i].textContent || '');
          if (score > maxScore) {
            maxScore = score;
            bestSpan = statusSpans[i];
          }
        }
        status = bestSpan.textContent?.trim() || 'Sem status';
      } else {
        // Fallback sequencial de palavras-chave no texto bruto da célula 2
        const cell2Text = cell2.textContent || '';
        if (cell2Text.includes('Ativo V. Reduzida') || cell2Text.includes('Ativo V.Reduzida') || cell2Text.includes('V. Reduzida')) {
          status = 'Ativo V. Reduzida';
        } else if (cell2Text.includes('Inativo')) {
          status = 'Inativo';
        } else if (cell2Text.includes('Cancelado')) {
          status = 'Cancelado';
        } else if (cell2Text.includes('Ativo')) {
          status = 'Ativo';
        } else if (cell2Text.includes('Suspenso')) {
          status = 'Suspenso';
        }
      }
    }

    // Extrai data de Cadastro da célula 3 (se presente)
    const cadastro = cells.length >= 4 ? cells[3]?.textContent?.trim() || '' : '';
    
    // Ignora linhas de cabeçalho ou inválidas
    if (clientName && clientName !== clientId && clientName !== 'Nome') {
      results.push({
        id: clientId,
        name: clientName,
        address,
        status,
        system: systemName,
        cpfCnpj,
        cadastro
      });
    }
  });
  
  return results;
}

const ChatInterno: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState('chat_interno');
  const versionRef = useRef(Date.now());

  // Consulta de Viabilidade
  const [streetQuery, setStreetQuery] = useState('');
  const [numberQuery, setNumberQuery] = useState('');
  const [sgpTarget, setSgpTarget] = useState('both');
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);
  const [feasibilityResults, setFeasibilityResults] = useState<FeasibilityResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [feasibilityType, setFeasibilityType] = useState<'active' | 'inactive' | 'none'>('none');
  const [localFilter, setLocalFilter] = useState('');

  // Link do seu site com o modo embed ativado
  const embedUrl = "https://vituali.github.io/ati/?mode=embed";

  const tools = [
    { id: 'chat_interno', label: 'Chat', icon: '💬' },
    { id: 'modelos_os', label: 'O.S.', icon: '📋' },
    { id: 'viabilidade', label: 'Viabilidade', icon: '🌐' },
    { id: 'senhas', label: 'Senhas', icon: '🔑' },
    { id: 'anotacoes', label: 'Notas', icon: '📝' },
    { id: 'conversor', label: 'Conversor', icon: '🔄' },
    { id: 'respostas_rapidas', label: 'Respostas', icon: '🗨️' },
  ];

  const handleSearchFeasibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streetQuery.trim()) {
      showToast('Por favor, digite o nome da rua.', 'error');
      return;
    }

    setFeasibilityLoading(true);
    setFeasibilityResults([]);
    setHasSearched(true);
    setLocalFilter('');

    try {
      const targets = [];
      if (sgpTarget === '35' || sgpTarget === 'both') {
        targets.push({ url: 'http://201.158.20.35:8000', name: 'SGP Antigo' });
      }
      if (sgpTarget === '53' || sgpTarget === 'both') {
        targets.push({ url: 'http://201.158.20.53:8000', name: 'SGP Novo' });
      }

      const searchPromises = targets.map(async (t) => {
        try {
          const res = await safeSendMessage({
            action: 'searchSgpFeasibility',
            baseUrl: t.url,
            logradouro: streetQuery.trim(),
            numero: numberQuery.trim() || undefined
          });
          if (res?.success && res.html) {
            return parseSgpFeasibilityHtml(res.html, t.name);
          }
          return [];
        } catch (err) {
          console.error(`Erro ao buscar viabilidade no ${t.name}:`, err);
          return [];
        }
      });

      const allResultsArray = await Promise.all(searchPromises);
      const combined = allResultsArray.flat();

      // --- REMOÇÃO DE DUPLICADOS ---
      const uniqMap = new Map<string, FeasibilityResult>();
      combined.forEach((item) => {
        // Normalização rigorosa do CPF/CNPJ (apenas dígitos)
        const cleanCpfCnpj = (item.cpfCnpj || '').replace(/\D/g, '');
        // Normalização rigorosa do nome (remover acentos, espaços extras, minúsculas)
        const cleanName = item.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .replace(/\s+/g, ' ');
          
        const key = cleanCpfCnpj || cleanName;
        if (!key) return;

        const existing = uniqMap.get(key);
        if (!existing) {
          uniqMap.set(key, item);
        } else {
          const existingScore = getStatusPriorityScore(existing.status);
          const itemScore = getStatusPriorityScore(item.status);

          if (itemScore > existingScore) {
            uniqMap.set(key, item);
          } else if (itemScore === existingScore) {
            // Se empatar a prioridade do status, prefere o SGP Novo (.53) ao SGP Antigo (.35)
            const isItemNovo = item.system.toLowerCase().includes('novo');
            const isExistingNovo = existing.system.toLowerCase().includes('novo');
            if (isItemNovo && !isExistingNovo) {
              uniqMap.set(key, item);
            }
          }
        }
      });

      const deduplicated = Array.from(uniqMap.values());

      // --- FILTRAGEM POR STATUS (ATIVOS vs OUTROS) ---
      // Ativos e Suspensos são considerados ativos operacionais
      const isClientActive = (statusStr: string) => {
        const lower = statusStr.toLowerCase().trim();
        if (lower.includes('inativo')) return false;
        if (lower.includes('cancelado')) return false;
        return lower.includes('ativo') || lower.includes('reduzida') || lower.includes('v. red') || lower.includes('vel. red') || lower.includes('suspenso');
      };

      const activeClients = deduplicated.filter((c) => isClientActive(c.status));
      const inactiveClients = deduplicated.filter((c) => !isClientActive(c.status));

      // --- ORDENAÇÃO E DEFINIÇÃO DOS RESULTADOS ---
      if (activeClients.length > 0) {
        const sortedActive = activeClients.sort((a, b) => {
          const scoreA = getStatusPriorityScore(a.status);
          const scoreB = getStatusPriorityScore(b.status);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.name.localeCompare(b.name);
        });
        setFeasibilityResults(sortedActive);
        setFeasibilityType('active');
      } else if (inactiveClients.length > 0) {
        const sortedInactive = inactiveClients.sort((a, b) => {
          const scoreA = getStatusPriorityScore(a.status);
          const scoreB = getStatusPriorityScore(b.status);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.name.localeCompare(b.name);
        });
        setFeasibilityResults(sortedInactive);
        setFeasibilityType('inactive');
      } else {
        setFeasibilityResults([]);
        setFeasibilityType('none');
      }
    } catch (error: any) {
      console.error('Erro na consulta de viabilidade:', error);
      showToast(`Erro na consulta: ${error.message || error}`, 'error');
    } finally {
      setFeasibilityLoading(false);
    }
  };

  const filteredResults = feasibilityResults.filter((client) => {
    if (!localFilter.trim()) return true;
    const filterLower = localFilter.toLowerCase().trim();
    return (
      client.name.toLowerCase().includes(filterLower) ||
      client.address.toLowerCase().includes(filterLower) ||
      client.id.toLowerCase().includes(filterLower) ||
      client.status.toLowerCase().includes(filterLower) ||
      (client.cpfCnpj && client.cpfCnpj.toLowerCase().includes(filterLower))
    );
  });

  return (
    <div className="ati-chat-container">
      {/* Botão Flutuante */}
      <button 
        className={`ati-chat-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Painel Auxiliar ATI"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
        )}
      </button>

      {/* Janela do Chat (Iframe ou Viabilidade) */}
      <div className={`ati-chat-window ${isOpen ? 'show' : ''}`}>
        <div className="ati-chat-header">
          <span>Painel Auxiliar ATI</span>
          <button onClick={() => setIsOpen(false)}>×</button>
        </div>

        {/* Barra de Navegação Nativa no Painel da Extensão */}
        <div className="ati-chat-navbar">
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`ati-chat-nav-item ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
            >
              <span className="ati-chat-nav-icon">{tool.icon}</span>
              <span className="ati-chat-nav-text">{tool.label}</span>
            </button>
          ))}
        </div>
        
        <div className="ati-chat-iframe-wrapper">
          {isOpen && activeTool === 'viabilidade' ? (
            <div className="ati-feasibility-container">
              <div className="ati-feasibility-title">Consultar Viabilidade</div>
              <div className="ati-feasibility-subtitle">Busque por clientes cadastrados em uma rua e número para verificar a cobertura.</div>
              
              <form onSubmit={handleSearchFeasibility} className="ati-feasibility-form">
                <div className="ati-feasibility-row">
                  <div className="ati-feasibility-input-wrapper flex-3">
                    <label className="ati-feasibility-label">Nome da Rua / Logradouro</label>
                    <input 
                      type="text" 
                      className="ati-feasibility-input" 
                      placeholder="Ex: Rua Guaicurus"
                      value={streetQuery}
                      onChange={(e) => setStreetQuery(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="ati-feasibility-input-wrapper flex-1">
                    <label className="ati-feasibility-label">Número</label>
                    <input 
                      type="text" 
                      className="ati-feasibility-input" 
                      placeholder="Ex: 525"
                      value={numberQuery}
                      onChange={(e) => setNumberQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="ati-feasibility-input-wrapper">
                  <label className="ati-feasibility-label">Buscar em qual SGP?</label>
                  <select 
                    className="ati-feasibility-select"
                    value={sgpTarget}
                    onChange={(e) => setSgpTarget(e.target.value)}
                  >
                    <option value="both">Ambos (Recomendado)</option>
                    <option value="53">SGP Novo (.53)</option>
                    <option value="35">SGP Antigo (.35)</option>
                  </select>
                </div>
                
                <button type="submit" className="ati-feasibility-btn" disabled={feasibilityLoading}>
                  {feasibilityLoading ? (
                    <>
                      <span className="ati-feasibility-spinner"></span>
                      <span>Consultando...</span>
                    </>
                  ) : (
                    <span>Consultar Rua</span>
                  )}
                </button>
              </form>
              
              {hasSearched && !feasibilityLoading && (
                <div className="ati-feasibility-results-list">
                  {feasibilityResults.length > 0 ? (
                    <>
                      <div className="ati-feasibility-local-search">
                        <input 
                          type="text" 
                          className="ati-feasibility-input" 
                          placeholder="🔍 Filtrar resultados (nome, apto, nº...)"
                          value={localFilter}
                          onChange={(e) => setLocalFilter(e.target.value)}
                        />
                      </div>

                      {feasibilityType === 'active' ? (
                        <div className="ati-feasibility-results-header ati-feasibility-results-header--active">
                          <span>✅ Viabilidade confirmada!</span>
                          <span>({filteredResults.length} de {feasibilityResults.length} cliente(s) ativo(s) encontrado(s))</span>
                        </div>
                      ) : (
                        <div className="ati-feasibility-results-header ati-feasibility-results-header--inactive">
                          <span>⚠️ Atenção: Nenhum cliente ativo no local.</span>
                          <span>Encontrado(s) {filteredResults.length} de {feasibilityResults.length} cadastro(s) com outro status:</span>
                        </div>
                      )}
                      {filteredResults.map((client, idx) => (
                        <div key={idx} className={`ati-feasibility-card ${feasibilityType === 'inactive' ? 'ati-feasibility-card--inactive' : ''}`}>
                          <div className="ati-feasibility-card-header">
                            <span className="ati-feasibility-client-name">{client.name}</span>
                            <span className={`ati-feasibility-badge ${client.system.includes('Novo') ? 'ati-feasibility-badge--53' : 'ati-feasibility-badge--35'}`}>
                              {client.system}
                            </span>
                          </div>
                          <div className="ati-feasibility-card-meta">
                            <span className="ati-feasibility-client-id">ID: {client.id}</span>
                            {client.cadastro && (
                              <span className="ati-feasibility-client-cadastro">{client.cadastro}</span>
                            )}
                          </div>
                          <span className="ati-feasibility-client-address">{client.address}</span>
                          <span className="ati-feasibility-client-status">Status: {client.status}</span>
                        </div>
                      ))}
                      {filteredResults.length === 0 && (
                        <div className="ati-feasibility-empty-filter">
                          Nenhum resultado corresponde ao filtro "{localFilter}".
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="ati-feasibility-empty">
                      <div className="ati-feasibility-empty-title">Nenhum cliente encontrado</div>
                      <div className="ati-feasibility-empty-desc">Nenhum cliente cadastrado foi encontrado nesta rua/número nos SGPs selecionados.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            isOpen && (
              <iframe 
                src={`${embedUrl}&section=${activeTool}&v=${versionRef.current}`} 
                className="ati-chat-iframe"
                title="Painel Auxiliar ATI Embed"
                allow="clipboard-read; clipboard-write; camera; microphone"
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterno;
