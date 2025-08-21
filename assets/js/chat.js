import { showPopup, adjustTextareaHeight, replacePlaceholders } from './ui.js';
import { saveDataForAttendant } from './firebase.js';

function validateKey(key) {
    if (!key || !key.trim()) {
        return { isValid: false, message: "O título não pode estar em branco." };
    }
    if (/[.$#[\]/]/g.test(key)) {
        return { isValid: false, message: "O título não pode conter ., $, #, [, ], ou /" };
    }
    const sanitizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
    return { isValid: true, sanitizedKey };
}

export function initializeChat() {
    let respostas = {}; // Estado local do módulo

    const elements = {
        options: document.getElementById('opcoes'),
        response: document.getElementById('resposta'),
        title: document.getElementById('titulo'),
        titleContainer: document.getElementById('titleContainer'),
        copyBtn: document.getElementById('copyBtn'),
        editTitleBtn: document.getElementById('editTitleBtn'),
        saveEditBtn: document.getElementById('saveEditBtn'),
        changeCategoryBtn: document.getElementById('changeCategoryBtn'),
        deleteBtn: document.getElementById('deleteBtn'),
        addBtn: document.getElementById('addBtn'),
        saveTitleBtn: document.getElementById('saveTitleBtn'),
    };

    const getCurrentAttendant = () => localStorage.getItem('atendenteAtual');

    const updateResponseSelector = () => {
        const attendant = getCurrentAttendant();
        elements.options.innerHTML = attendant ? '<option value="">Selecione uma resposta</option>' : '<option value="">Selecione um atendente</option>';
        if (!attendant || !respostas) return;

        Object.keys(respostas).sort().forEach(category => {
            const optgroup = document.createElement("optgroup");
            optgroup.label = category.charAt(0).toUpperCase() + category.slice(1);
            Object.keys(respostas[category]).sort().forEach(key => {
                const opt = document.createElement("option");
                opt.value = `${category}:${key}`;
                opt.innerText = key.replace(/_/g, " ").toUpperCase();
                optgroup.appendChild(opt);
            });
            if (optgroup.children.length > 0) {
                elements.options.appendChild(optgroup);
            }
        });
    };
    
    const displaySelectedResponse = () => {
        const selectedValue = elements.options.value;
        if (!selectedValue) {
            elements.response.value = "Selecione uma opção para ver a mensagem.";
            elements.title.value = "";
        } else {
            const [category, key] = selectedValue.split(":");
            const message = respostas[category]?.[key] || "Resposta não encontrada.";
            elements.response.value = replacePlaceholders(message);
        }
        adjustTextareaHeight(elements.response);
    };

    const saveChanges = () => {
        const attendant = getCurrentAttendant();
        const selectedValue = elements.options.value;
        if (!attendant || !selectedValue) {
            return showPopup("Selecione um atendente e uma resposta para salvar.");
        }
        const [category, key] = selectedValue.split(":");
        respostas[category][key] = elements.response.value.trim();
        saveDataForAttendant(attendant, respostas);
        showPopup("Resposta salva com sucesso!");
    };

    const addNewResponse = () => {
        const attendant = getCurrentAttendant();
        if (!attendant) return showPopup("Selecione um atendente primeiro.");

        const newTitle = prompt("Digite o título da nova resposta:");
        if (!newTitle) return;
        const { isValid, sanitizedKey, message } = validateKey(newTitle);
        if (!isValid) return showPopup(message);
        
        const category = (prompt("Digite a categoria (ex: suporte, financeiro, geral):", "geral") || 'geral').toLowerCase();
        if (!respostas[category]) respostas[category] = {};
        if (respostas[category][sanitizedKey]) return showPopup("Esse título já existe nesta categoria!");

        respostas[category][sanitizedKey] = "Nova resposta. Edite aqui e clique em Salvar. [DESPEDIDA]";
        saveDataForAttendant(attendant, respostas).then(() => {
            updateResponseSelector();
            elements.options.value = `${category}:${sanitizedKey}`;
            displaySelectedResponse();
            showPopup("Nova resposta adicionada!");
        });
    };

    // Event Listeners
    elements.options.addEventListener('change', displaySelectedResponse);
    elements.response.addEventListener('input', () => adjustTextareaHeight(elements.response));
    elements.copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(elements.response.value).then(() => showPopup('Texto copiado!'));
    });
    elements.saveEditBtn.addEventListener('click', saveChanges);
    elements.addBtn.addEventListener('click', addNewResponse);
    // Adicionar listeners para os outros botões (delete, changeCategory, etc.)...

    // API do Módulo: permite que app.js atualize as respostas
    return {
        setResponses: (data) => {
            respostas = data || { suporte: {}, financeiro: {}, geral: {} };
            updateResponseSelector();
            displaySelectedResponse();
        }
    };
}