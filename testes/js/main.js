// js/main.js

import { initDarkMode } from './ui.js';
import { initChatAutomator } from './chat-automator.js';
import { initPdfConverter } from './pdf-converter.js';

// Garante que o DOM está totalmente carregado antes de executar os scripts
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initChatAutomator();
    initPdfConverter();
});