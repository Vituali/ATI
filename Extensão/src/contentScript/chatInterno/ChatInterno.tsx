
import React, { useState } from 'react';
import './ChatInterno.css';

const ChatInterno: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Link do seu site com o modo embed ativado
  const embedUrl = "https://vituali.github.io/ATI/?mode=embed";

  return (
    <div className="ati-chat-container">
      {/* Botão Flutuante */}
      <button 
        className={`ati-chat-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Chat Interno ATI"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
        )}
      </button>

      {/* Janela do Chat (Iframe) */}
      <div className={`ati-chat-window ${isOpen ? 'show' : ''}`}>
        <div className="ati-chat-header">
          <span>Chat Interno ATI</span>
          <button onClick={() => setIsOpen(false)}>×</button>
        </div>
        
        <div className="ati-chat-iframe-wrapper">
          {isOpen && (
            <iframe 
              src={embedUrl} 
              className="ati-chat-iframe"
              title="Chat ATI Embed"
              allow="clipboard-read; clipboard-write; camera; microphone"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterno;
