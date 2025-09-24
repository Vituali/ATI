import { showPopup, adjustTextareaHeight, replacePlaceholders } from './ui.js';
// CORREÇÃO: Importa a função correta do arquivo de serviço do Firebase.
import { saveQuickReplies } from './firebase-service.js';

export function initializeChat() {
    // --- ESTADO DO MÓDULO ---
    let quickReplies = [];
    let osTemplates = [];
    let currentSelection = { index: null, text: "Selecione uma resposta" };
    let sortableInstances = [];

    // --- SELETORES DE ELEMENTOS ---
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

    /**
     * Salva a lista combinada de templates no Firebase.
     */
    const saveData = async () => {
        const attendant = getCurrentAttendant();
        if (!attendant) return;
        const fullDataToSave = [...quickReplies, ...osTemplates];
        try {
            // CORREÇÃO: Chama a função renomeada para salvar apenas as respostas rápidas.
            // A lógica de salvar modelos de O.S. está agora no os-editor.js
            await saveQuickReplies(attendant, quickReplies);
        } catch (error) {
            showPopup("Erro ao salvar as alterações.", 'error');
            console.error("Erro no Firebase:", error);
        }
    };

    /**
     * Atualiza a lista de respostas na tela com base no estado atual.
     */
    const updateResponseSelector = () => {
        elements.selectItems.innerHTML = '';
        if (quickReplies.length === 0) {
            elements.selectDisplay.textContent = 'Nenhuma resposta encontrada';
            return;
        }

        const groupedByCategory = quickReplies.reduce((acc, template) => {
            const category = template.subCategory || 'Geral';
            if (!acc[category]) acc[category] = [];
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
                opt.dataset.index = quickReplies.indexOf(template);
                opt.addEventListener('click', () => {
                    currentSelection = { index: opt.dataset.index, text: opt.textContent };
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
            sortableInstances.push(Sortable.create(container, {
                group: 'shared-options', animation: 150, ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const itemEl = evt.item;
                    const originalIndex = parseInt(itemEl.dataset.index, 10);
                    const newCategoryName = evt.to.dataset.categoryName;
                    if (quickReplies[originalIndex] && newCategoryName) {
                        quickReplies[originalIndex].subCategory = newCategoryName;
                    }
                    saveOrderAndCategories();
                },
            }));
        });

        sortableInstances.push(Sortable.create(elements.selectItems, {
            handle: '.optgroup-label', animation: 150, ghostClass: 'sortable-ghost',
            onEnd: saveOrderAndCategories,
        }));
    };
    
    const saveOrderAndCategories = async () => {
        const newOrderedQuickReplies = [];
        elements.selectItems.querySelectorAll('.option-item').forEach(item => {
            const originalIndex = parseInt(item.dataset.index, 10);
            if (quickReplies[originalIndex]) {
                newOrderedQuickReplies.push(quickReplies[originalIndex]);
            }
        });
        
        quickReplies = newOrderedQuickReplies;
        await saveData();
        
        updateResponseSelector();
        showPopup("Ordem e categoria salvas!", 'success');
    };

    const displaySelectedResponse = () => {
        const selectedIndex = currentSelection.index;
        if (selectedIndex === null) {
            elements.response.value = "Selecione uma opção para ver a mensagem.";
        } else {
            const template = quickReplies[parseInt(selectedIndex)];
            elements.response.value = template ? template.text : "Resposta não encontrada.";
        }
        adjustTextareaHeight(elements.response);
        elements.titleContainer.style.display = 'none';
    };

    const saveChanges = async () => {
        const selectedIndex = currentSelection.index;
        if (selectedIndex === null) return showPopup("Selecione uma resposta para salvar.");
        quickReplies[parseInt(selectedIndex)].text = elements.response.value.trim();
        await saveData();
        showPopup("Resposta salva com sucesso!", 'success');
    };
    
    const deleteResponse = () => {
        const selectedIndex = currentSelection.index;
        if (selectedIndex === null) return showPopup("Selecione uma resposta para apagar.");
        
        const modal = document.getElementById('confirmationModal');
        document.getElementById('modalTitle').textContent = 'Apagar Resposta';
        document.getElementById('modalMessage').textContent = 'Tem certeza que deseja apagar esta resposta permanentemente?';
        const confirmBtn = document.getElementById('modalConfirmBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');
        modal.style.display = 'flex';

        const onConfirm = async () => {
            quickReplies.splice(parseInt(selectedIndex), 1);
            await saveData();
            currentSelection = { index: null, text: "Selecione uma resposta" };
            elements.selectDisplay.textContent = currentSelection.text;
            updateResponseSelector();
            displaySelectedResponse();
            showPopup("Resposta apagada com sucesso!");
            closeModal();
        };
        
        const closeModal = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', closeModal);
        };
        
        confirmBtn.addEventListener('click', onConfirm, { once: true });
        cancelBtn.addEventListener('click', closeModal, { once: true });
    };

    const addNewResponse = () => {
        const modal = document.getElementById('addResponseModal');
        const titleInput = document.getElementById('newResponseTitle');
        const categorySelect = document.getElementById('newResponseCategorySelect');
        const newCategoryInput = document.getElementById('newResponseCategoryInput');
        const saveBtn = document.getElementById('modalSaveNewBtn');
        const cancelBtn = document.getElementById('modalCancelNewBtn');

        const existingCategories = [...new Set(quickReplies.map(r => r.subCategory || 'Geral'))];
        categorySelect.innerHTML = existingCategories.map(c => `<option value="${c}">${c}</option>`).join('');
        categorySelect.innerHTML += '<option value="new_category">-- Nova Categoria --</option>';
        newCategoryInput.style.display = 'none';
        newCategoryInput.value = '';
        titleInput.value = '';
        
        categorySelect.onchange = () => {
            newCategoryInput.style.display = categorySelect.value === 'new_category' ? 'block' : 'none';
        };

        modal.style.display = 'flex';
        titleInput.focus();

        const onSave = async () => {
            const title = titleInput.value.trim();
            if (!title) return showPopup("O título não pode estar em branco.");
            
            let categoryName = categorySelect.value;
            if (categoryName === 'new_category') {
                categoryName = newCategoryInput.value.trim();
                if (!categoryName) return showPopup("O nome da nova categoria não pode estar em branco.");
            }

            const newTemplate = {
                title: title,
                text: "Nova resposta. Edite aqui e clique em Salvar.",
                category: "quick_reply",
                subCategory: categoryName,
                keywords: []
            };
            
            quickReplies.push(newTemplate);
            await saveData();

            currentSelection = { index: (quickReplies.length - 1).toString(), text: title };
            elements.selectDisplay.textContent = title;
            updateResponseSelector();
            displaySelectedResponse();
            showPopup("Nova resposta adicionada!");
            closeModal();
        };
        
        const closeModal = () => {
            modal.style.display = 'none';
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', closeModal);
        };

        saveBtn.addEventListener('click', onSave, { once: true });
        cancelBtn.addEventListener('click', closeModal, { once: true });
    };
    
    const editTitle = () => {
        const selectedIndex = currentSelection.index;
        if (selectedIndex === null) return showPopup("Selecione uma resposta para editar o título.");
        const template = quickReplies[parseInt(selectedIndex)];
        if (template) {
            elements.title.value = template.title;
            elements.titleContainer.style.display = 'flex';
            elements.title.focus();
        }
    };
    
    const saveNewTitle = async () => {
        const selectedIndex = currentSelection.index;
        if (selectedIndex === null) return;
        const newTitle = elements.title.value.trim();
        if (!newTitle) return showPopup("O título não pode estar em branco.");
        
        quickReplies[parseInt(selectedIndex)].title = newTitle;
        await saveData();
        
        currentSelection.text = newTitle;
        elements.selectDisplay.textContent = newTitle;
        elements.titleContainer.style.display = 'none';
        updateResponseSelector();
        showPopup("Título alterado com sucesso!");
    };

    // --- Event Listeners ---
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
            const allData = Array.isArray(data) ? data : [];
            quickReplies = allData.filter(r => r.category === 'quick_reply');
            osTemplates = allData.filter(r => r.category !== 'quick_reply');
            
            currentSelection = { index: null, text: "Selecione uma resposta" };
            updateResponseSelector();
            displaySelectedResponse();
        }
    };
}

