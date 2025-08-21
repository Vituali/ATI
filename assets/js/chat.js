import { showPopup, adjustTextareaHeight, replacePlaceholders } from './ui.js';
import { saveDataForAttendant } from './firebase.js';

// Função auxiliar para validar títulos e categorias
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
        const selectedValue = elements.options.value; // Salva a seleção atual
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
        elements.options.value = selectedValue; // Tenta restaurar a seleção
    };
    
    const displaySelectedResponse = () => {
        const selectedValue = elements.options.value;
        if (!selectedValue) {
            elements.response.value = "Selecione uma opção para ver a mensagem.";
        } else {
            const [category, key] = selectedValue.split(":");
            const message = respostas[category]?.[key] || "Resposta não encontrada.";
            elements.response.value = replacePlaceholders(message);
        }
        adjustTextareaHeight(elements.response);
        elements.titleContainer.style.display = 'none'; // Esconde o editor de título ao trocar
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

    // --- LÓGICA CORRIGIDA E ADICIONADA ---

    const deleteResponse = () => {
        const attendant = getCurrentAttendant();
        const selectedValue = elements.options.value;
        if (!attendant || !selectedValue) {
            return showPopup("Selecione uma resposta para apagar.");
        }

        const modal = document.getElementById('confirmationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const confirmBtn = document.getElementById('modalConfirmBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');
        
        modalTitle.textContent = 'Apagar Resposta';
        modalMessage.textContent = 'Tem certeza que deseja apagar esta resposta permanentemente?';
        modal.style.display = 'flex';

        const onConfirm = () => {
            const [category, key] = selectedValue.split(":");
            delete respostas[category][key];
            if (Object.keys(respostas[category]).length === 0) {
                delete respostas[category];
            }
            saveDataForAttendant(attendant, respostas);
            
            updateResponseSelector();
            displaySelectedResponse();
            showPopup("Resposta apagada com sucesso!");
            cleanup();
        };

        const onCancel = () => cleanup();
        
        const cleanup = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };

        confirmBtn.addEventListener('click', onConfirm, { once: true });
        cancelBtn.addEventListener('click', onCancel, { once: true });
    };

    const changeCategory = () => {
        const attendant = getCurrentAttendant();
        const selectedValue = elements.options.value;
        if (!attendant || !selectedValue) {
            return showPopup("Selecione uma resposta para alterar.");
        }
        
        const [oldCategory, key] = selectedValue.split(":");
        const newCategory = (prompt(`Qual a nova categoria para "${key.replace(/_/g, ' ')}"?`, oldCategory) || oldCategory).toLowerCase();

        if (newCategory === oldCategory) return;
        if (!respostas[newCategory]) respostas[newCategory] = {};
        if (respostas[newCategory][key]) return showPopup("Este título já existe na categoria de destino!");

        respostas[newCategory][key] = respostas[oldCategory][key];
        delete respostas[oldCategory][key];
        if (Object.keys(respostas[oldCategory]).length === 0) {
            delete respostas[oldCategory];
        }

        saveDataForAttendant(attendant, respostas).then(() => {
            updateResponseSelector();
            elements.options.value = `${newCategory}:${key}`;
            displaySelectedResponse();
            showPopup("Categoria alterada com sucesso!");
        });
    };
    
    const editTitle = () => {
        const selectedValue = elements.options.value;
        if (!selectedValue) return showPopup("Selecione uma resposta para editar o título.");
        
        const [, key] = selectedValue.split(":");
        elements.title.value = key.replace(/_/g, ' ');
        elements.titleContainer.style.display = 'flex';
    };

    const saveNewTitle = () => {
        const attendant = getCurrentAttendant();
        const selectedValue = elements.options.value;
        const newTitleText = elements.title.value;
        
        const { isValid, sanitizedKey, message } = validateKey(newTitleText);
        if (!isValid) return showPopup(message);

        const [category, oldKey] = selectedValue.split(":");
        if (sanitizedKey === oldKey) {
            elements.titleContainer.style.display = 'none';
            return;
        }
        if (respostas[category][sanitizedKey]) return showPopup("Este título já existe na categoria!");
        
        respostas[category][sanitizedKey] = respostas[category][oldKey];
        delete respostas[category][oldKey];
        
        saveDataForAttendant(attendant, respostas).then(() => {
            updateResponseSelector();
            elements.options.value = `${category}:${sanitizedKey}`;
            displaySelectedResponse();
            showPopup("Título alterado com sucesso!");
        });
    };

    // --- EVENT LISTENERS COMPLETOS ---
    elements.options.addEventListener('change', displaySelectedResponse);
    elements.response.addEventListener('input', () => adjustTextareaHeight(elements.response));
    elements.copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(elements.response.value).then(() => showPopup('Texto copiado!'));
    });
    elements.saveEditBtn.addEventListener('click', saveChanges);
    elements.addBtn.addEventListener('click', addNewResponse);
    
    // Listeners que faltavam:
    elements.deleteBtn.addEventListener('click', deleteResponse);
    elements.changeCategoryBtn.addEventListener('click', changeCategory);
    elements.editTitleBtn.addEventListener('click', editTitle);
    elements.saveTitleBtn.addEventListener('click', saveNewTitle);

    // API do Módulo: permite que app.js atualize as respostas
    return {
        setResponses: (data) => {
            respostas = data || { suporte: {}, financeiro: {}, geral: {} };
            updateResponseSelector();
            displaySelectedResponse();
        }
    };
}