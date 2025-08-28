import { showPopup, adjustTextareaHeight, replacePlaceholders } from './ui.js';
import { saveDataForAttendant } from './firebase.js';

export function initializeChat() {
    // A estrutura de 'respostas' é um ARRAY para preservar a ordem
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

    const updateResponseSelector = () => {
        elements.selectItems.innerHTML = '';
        if (respostas.length === 0) {
            elements.selectDisplay.textContent = 'Nenhuma resposta encontrada';
            return;
        }

        const groupedByCategory = respostas.reduce((acc, template) => {
            const category = template.subCategory || 'Geral';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(template);
            return acc;
        }, {});

        sortableInstances.forEach(sortable => sortable.destroy());
        sortableInstances = [];

        for (const categoryName in groupedByCategory) {
            const categoryGroup = document.createElement("div");
            categoryGroup.className = 'category-group';
            const optgroup = document.createElement("div");
            optgroup.className = 'optgroup-label';
            optgroup.textContent = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
            categoryGroup.appendChild(optgroup);
            const optionsContainer = document.createElement("div");
            optionsContainer.className = 'options-container';
            optionsContainer.dataset.categoryName = categoryName;

            groupedByCategory[categoryName].forEach(template => {
                const opt = document.createElement("div");
                opt.className = 'option-item';
                opt.textContent = template.title;
                opt.dataset.value = respostas.indexOf(template);
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
        }

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
        const selectedIndex = currentSelection.value;
        if (selectedIndex === "") {
            elements.response.value = "Selecione uma opção para ver a mensagem.";
        } else {
            const template = respostas[parseInt(selectedIndex)];
            elements.response.value = template ? template.text : "Resposta não encontrada.";
        }
        adjustTextareaHeight(elements.response);
        elements.titleContainer.style.display = 'none';
    };

    const saveOrder = () => {
        const attendant = getCurrentAttendant();
        if (!attendant) return;

        const newOrderedRespostas = [];
        elements.selectItems.querySelectorAll('.option-item').forEach(item => {
            const originalIndex = parseInt(item.dataset.value);
            // Adiciona o template original na nova lista, na ordem correta
            if (respostas[originalIndex]) {
                 newOrderedRespostas.push(respostas[originalIndex]);
            }
        });
        
        // Substitui o array antigo pelo novo, agora ordenado
        respostas = newOrderedRespostas;
        
        saveDataForAttendant(attendant, respostas).then(() => {
            updateResponseSelector();
            showPopup("Ordem salva!", 'success');
        });
    };

    const saveChanges = () => {
        const attendant = getCurrentAttendant();
        const selectedIndex = currentSelection.value;
        if (!attendant || selectedIndex === "") return showPopup("Selecione uma resposta para salvar.");

        respostas[parseInt(selectedIndex)].text = elements.response.value.trim();
        saveDataForAttendant(attendant, respostas);
        showPopup("Resposta salva com sucesso!", 'success');
    };
     
    const deleteResponse = () => {
        const attendant = getCurrentAttendant();
        const selectedIndex = currentSelection.value;
        if (!attendant || selectedIndex === "") return showPopup("Selecione uma resposta para apagar.");

        const modal = document.getElementById('confirmationModal');
        document.getElementById('modalTitle').textContent = 'Apagar Resposta';
        document.getElementById('modalMessage').textContent = 'Tem certeza que deseja apagar esta resposta permanentemente?';
        const confirmBtn = document.getElementById('modalConfirmBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');
        
        modal.style.display = 'flex';

        const onConfirm = () => {
            respostas.splice(parseInt(selectedIndex), 1);
            saveDataForAttendant(attendant, respostas).then(() => {
                currentSelection = { value: "", text: "Selecione uma resposta" };
                updateResponseSelector();
                displaySelectedResponse();
                showPopup("Resposta apagada com sucesso!");
            });
            modal.style.display = 'none';
        };

        const onCancel = () => {
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
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
            const title = titleInput.value.trim();
            if (!title) return showPopup("O título não pode estar em branco.");

            let categoryName = categoryInput.value.trim() || 'Geral';

            const newTemplate = {
                title: title,
                text: "Nova resposta. Edite aqui e clique em Salvar.",
                category: "quick_reply",
                subCategory: categoryName,
                keywords: []
            };

            respostas.push(newTemplate);
            saveDataForAttendant(attendant, respostas).then(() => {
                currentSelection = { value: (respostas.length - 1).toString(), text: title };
                updateResponseSelector();
                displaySelectedResponse();
                showPopup("Nova resposta adicionada!");
                modal.style.display = 'none';
            });
        };

        const onCancel = () => {
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', onCancel);
            modal.style.display = 'none';
        };

        saveBtn.addEventListener('click', onSave, { once: true });
        cancelBtn.addEventListener('click', onCancel, { once: true });
    };

    const editTitle = () => {
        const selectedIndex = currentSelection.value;
        if (selectedIndex === "") return showPopup("Selecione uma resposta para editar o título.");
        
        const template = respostas[parseInt(selectedIndex)];
        if (template) {
            elements.title.value = template.title;
            elements.titleContainer.style.display = 'flex';
            elements.title.focus();
        }
    };

    const saveNewTitle = () => {
        const attendant = getCurrentAttendant();
        const selectedIndex = currentSelection.value;
        if (selectedIndex === "" || !attendant) return;

        const newTitle = elements.title.value.trim();
        if (!newTitle) return showPopup("O título não pode estar em branco.");

        respostas[parseInt(selectedIndex)].title = newTitle;

        saveDataForAttendant(attendant, respostas).then(() => {
            currentSelection.text = newTitle;
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
    elements.copyBtn.addEventListener('click', () => {
        const rawText = elements.response.value;
        const processedText = replacePlaceholders(rawText);
        navigator.clipboard.writeText(processedText).then(() => showPopup('Texto copiado!'));
    });    
    elements.saveEditBtn.addEventListener('click', saveChanges);
    elements.addBtn.addEventListener('click', addNewResponse);
    elements.deleteBtn.addEventListener('click', deleteResponse);
    elements.editTitleBtn.addEventListener('click', editTitle);
    elements.saveTitleBtn.addEventListener('click', saveNewTitle);

    // --- API PÚBLICA DO MÓDULO ---
    return {
        setResponses: (data) => {
            respostas = Array.isArray(data) ? data : [];
            currentSelection = { value: "", text: "Selecione uma resposta" };
            updateResponseSelector();
            displaySelectedResponse();
        }
    };
}