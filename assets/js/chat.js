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
    // A estrutura de 'respostas' agora é um ARRAY para preservar a ordem
    let respostas = []; 
    let currentSelection = { value: "", text: "Selecione uma resposta" };
    let sortableInstances = [];

    const elements = {
        selectDisplay: document.getElementById('select-display'),
        selectItems: document.getElementById('select-items'),
        response: document.getElementById('resposta'),
        title: document.getElementById('titulo'),
        titleContainer: document.getElementById('titleContainer'),
        copyBtn: document.getElementById('copyBtn'),
        editTitleBtn: document.getElementById('editTitleBtn'),
        saveEditBtn: document.getElementById('saveEditBtn'),
        deleteBtn: document.getElementById('deleteBtn'),
        addBtn: document.getElementById('addBtn'),
        saveTitleBtn: document.getElementById('saveTitleBtn'),
    };

    const getCurrentAttendant = () => localStorage.getItem('atendenteAtual');

    const convertOldDataFormat = (data) => {
        if (Array.isArray(data)) return data;
        if (typeof data === 'object' && data !== null) {
            return Object.keys(data).map(categoryName => ({
                categoryName: categoryName,
                items: data[categoryName] || {}
            }));
        }
        return [];
    };

    const updateResponseSelector = () => {
        const attendant = getCurrentAttendant();
        elements.selectItems.innerHTML = '';
        if (!attendant || respostas.length === 0) {
            elements.selectDisplay.textContent = 'Nenhuma resposta encontrada';
            return;
        }
        sortableInstances.forEach(sortable => sortable.destroy());
        sortableInstances = [];
        respostas.forEach(categoryObject => {
            const categoryName = categoryObject.categoryName;
            const categoryGroup = document.createElement("div");
            categoryGroup.className = 'category-group';
            const optgroup = document.createElement("div");
            optgroup.className = 'optgroup-label';
            optgroup.textContent = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
            categoryGroup.appendChild(optgroup);
            const optionsContainer = document.createElement("div");
            optionsContainer.className = 'options-container';
            Object.keys(categoryObject.items).forEach(key => {
                const opt = document.createElement("div");
                opt.className = 'option-item';
                opt.textContent = key.replace(/_/g, " ").toUpperCase();
                opt.dataset.value = `${categoryName}:${key}`;
                opt.addEventListener('click', () => {
                    currentSelection = { value: opt.dataset.value, text: opt.textContent };
                    elements.selectDisplay.textContent = opt.textContent;
                    elements.selectItems.classList.add('select-hide');
                    displaySelectedResponse();
                });
                optionsContainer.appendChild(opt);
            });
            categoryGroup.appendChild(optionsContainer);
            elements.selectItems.appendChild(categoryGroup);
        });
        elements.selectItems.querySelectorAll('.options-container').forEach(container => {
            const sortable = Sortable.create(container, {
                group: 'shared-options',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: () => saveOrder(),
            });
            sortableInstances.push(sortable);
        });
        elements.selectDisplay.textContent = currentSelection.text;
    };
    
    const displaySelectedResponse = () => {
        const selectedValue = currentSelection.value;
        if (!selectedValue) {
            elements.response.value = "Selecione uma opção para ver a mensagem.";
        } else {
            const [categoryName, key] = selectedValue.split(":");
            const categoryObject = respostas.find(c => c.categoryName === categoryName);
            const message = categoryObject?.items[key] || "Resposta não encontrada.";
            elements.response.value = replacePlaceholders(message);
        }
        adjustTextareaHeight(elements.response);
        elements.titleContainer.style.display = 'none';
    };

    const saveOrder = () => {
        const attendant = getCurrentAttendant();
        if (!attendant) return;
        const newOrderedRespostas = [];
        elements.selectItems.querySelectorAll('.category-group').forEach(group => {
            const categoryName = group.querySelector('.optgroup-label').textContent.toLowerCase();
            const newCategoryObject = { categoryName: categoryName, items: {} };
            group.querySelectorAll('.option-item').forEach(item => {
                const [originalCategory, key] = item.dataset.value.split(':');
                const oldCategoryObject = respostas.find(c => c.categoryName === originalCategory);
                if (oldCategoryObject && oldCategoryObject.items[key] !== undefined) {
                    newCategoryObject.items[key] = oldCategoryObject.items[key];
                }
            });
            newOrderedRespostas.push(newCategoryObject);
        });
        respostas = newOrderedRespostas;
        saveDataForAttendant(attendant, respostas);
        updateResponseSelector();
        showPopup("Ordem salva!");
    };

    // --- FUNÇÕES COMPLETAS DOS BOTÕES ---

    const saveChanges = () => {
        const attendant = getCurrentAttendant();
        const selectedValue = currentSelection.value;
        if (!attendant || !selectedValue) return showPopup("Selecione uma resposta para salvar.");
        
        const [categoryName, key] = selectedValue.split(":");
        const categoryObject = respostas.find(c => c.categoryName === categoryName);
        if (categoryObject) {
            categoryObject.items[key] = elements.response.value.trim();
            saveDataForAttendant(attendant, respostas);
            showPopup("Resposta salva com sucesso!");
        }
    };
    
    const deleteResponse = () => {
        const attendant = getCurrentAttendant();
        const selectedValue = currentSelection.value;
        if (!attendant || !selectedValue) return showPopup("Selecione uma resposta para apagar.");

        const modal = document.getElementById('confirmationModal');
        document.getElementById('modalTitle').textContent = 'Apagar Resposta';
        document.getElementById('modalMessage').textContent = 'Tem certeza que deseja apagar esta resposta permanentemente?';
        const confirmBtn = document.getElementById('modalConfirmBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');
        
        modal.style.display = 'flex';

        const onConfirm = () => {
            const [categoryName, key] = selectedValue.split(":");
            const categoryIndex = respostas.findIndex(c => c.categoryName === categoryName);
            if (categoryIndex > -1) {
                delete respostas[categoryIndex].items[key];
                if (Object.keys(respostas[categoryIndex].items).length === 0) {
                    respostas.splice(categoryIndex, 1);
                }
            }
            saveDataForAttendant(attendant, respostas).then(() => {
                currentSelection = { value: "", text: "Selecione uma resposta" };
                updateResponseSelector();
                displaySelectedResponse();
                showPopup("Resposta apagada com sucesso!");
            });
            modal.style.display = 'none';
        };

        const onCancel = () => {
            modal.style.display = 'none';
        };

        confirmBtn.addEventListener('click', onConfirm, { once: true });
        cancelBtn.addEventListener('click', onCancel, { once: true });
    };

    const addNewResponse = () => {
        const attendant = getCurrentAttendant();
        if (!attendant) return showPopup("Selecione um atendente primeiro.");

        const modal = document.getElementById('addResponseModal');
        const titleInput = document.getElementById('newResponseTitle');
        const categoryInput = document.getElementById('newResponseCategory');
        const saveBtn = document.getElementById('modalSaveNewBtn');
        const cancelBtn = document.getElementById('modalCancelNewBtn');

        titleInput.value = '';
        categoryInput.value = '';
        modal.style.display = 'flex';
        titleInput.focus();

        const onSave = () => {
            const { isValid, sanitizedKey, message } = validateKey(titleInput.value);
            if (!isValid) return showPopup(message);
            
            let categoryName = categoryInput.value.trim().toLowerCase() || 'geral';
            if (validateKey(categoryName).isValid === false) return showPopup("Nome de categoria inválido.");
            
            let categoryObject = respostas.find(c => c.categoryName === categoryName);
            if (!categoryObject) {
                categoryObject = { categoryName: categoryName, items: {} };
                respostas.push(categoryObject);
            }
            
            if (categoryObject.items[sanitizedKey]) return showPopup("Esse título já existe nesta categoria!");

            categoryObject.items[sanitizedKey] = "Nova resposta. Edite aqui e clique em Salvar. [DESPEDIDA]";
            saveDataForAttendant(attendant, respostas).then(() => {
                currentSelection = { value: `${categoryName}:${sanitizedKey}`, text: titleInput.value.trim().toUpperCase() };
                updateResponseSelector();
                displaySelectedResponse();
                showPopup("Nova resposta adicionada!");
                modal.style.display = 'none';
            });
        };

        const onCancel = () => {
            modal.style.display = 'none';
        };

        saveBtn.addEventListener('click', onSave, { once: true });
        cancelBtn.addEventListener('click', onCancel, { once: true });
    };

    const editTitle = () => {
        const selectedValue = currentSelection.value;
        if (!selectedValue) return showPopup("Selecione uma resposta para editar o título.");
        const [, key] = selectedValue.split(":");
        elements.title.value = key.replace(/_/g, ' ');
        elements.titleContainer.style.display = 'flex';
        elements.title.focus();
    };

    const saveNewTitle = () => {
        const attendant = getCurrentAttendant();
        const selectedValue = currentSelection.value;
        if (!selectedValue || !attendant) return;

        const { isValid, sanitizedKey, message } = validateKey(elements.title.value);
        if (!isValid) return showPopup(message);

        const [categoryName, oldKey] = selectedValue.split(":");
        if (sanitizedKey === oldKey) {
            elements.titleContainer.style.display = 'none';
            return;
        }

        const categoryObject = respostas.find(c => c.categoryName === categoryName);
        if (categoryObject.items[sanitizedKey]) return showPopup("Este título já existe na categoria!");
        
        categoryObject.items[sanitizedKey] = categoryObject.items[oldKey];
        delete categoryObject.items[oldKey];
        
        saveDataForAttendant(attendant, respostas).then(() => {
            currentSelection = { value: `${categoryName}:${sanitizedKey}`, text: sanitizedKey.replace(/_/g, ' ').toUpperCase() };
            updateResponseSelector();
            displaySelectedResponse();
            showPopup("Título alterado com sucesso!");
        });
    };

    // --- INICIALIZAÇÃO E EVENTOS GERAIS ---
    Sortable.create(elements.selectItems, {
        handle: '.optgroup-label',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: () => saveOrder(),
    });

    elements.selectDisplay.addEventListener('click', () => elements.selectItems.classList.toggle('select-hide'));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) elements.selectItems.classList.add('select-hide');
    });
    
    elements.response.addEventListener('input', () => adjustTextareaHeight(elements.response));
    elements.copyBtn.addEventListener('click', () => navigator.clipboard.writeText(elements.response.value).then(() => showPopup('Texto copiado!')));
    
    elements.saveEditBtn.addEventListener('click', saveChanges);
    elements.addBtn.addEventListener('click', addNewResponse);
    elements.deleteBtn.addEventListener('click', deleteResponse);
    elements.editTitleBtn.addEventListener('click', editTitle);
    elements.saveTitleBtn.addEventListener('click', saveNewTitle);

    // --- API PÚBLICA DO MÓDULO ---
    return {
        setResponses: (data) => {
            respostas = convertOldDataFormat(data);
            currentSelection = { value: "", text: "Selecione uma resposta" };
            updateResponseSelector();
            displaySelectedResponse();
        }
    };
}