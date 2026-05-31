
import React, { useState } from 'react';
import './ChatInterno.css';

const ChatInterno: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState("chat_interno");

  // Link do seu site com o modo embed ativado
  const embedUrl = "https://vituali.github.io/ati/?mode=embed";

  const tools = [
    { id: 'chat_interno', label: 'Chat', icon: '💬' },
    { id: 'modelos_os', label: 'O.S.', icon: '📋' },
    { id: 'senhas', label: 'Senhas', icon: '🔑' },
    { id: 'anotacoes', label: 'Notas', icon: '📝' },
    { id: 'conversor', label: 'Conversor', icon: '🔄' },
    { id: 'respostas_rapidas', label: 'Respostas', icon: '🗨️' },
  ];

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

      {/* Janela do Chat (Iframe) */}
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
          {isOpen && (
            <iframe 
              src={`${embedUrl}&section=${activeTool}&v=${Date.now()}`} 
              className="ati-chat-iframe"
              title="Painel Auxiliar ATI Embed"
              allow="clipboard-read; clipboard-write; camera; microphone"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterno;
