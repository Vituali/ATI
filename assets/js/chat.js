import { showPopup, adjustTextareaHeight, replacePlaceholders } from './ui.js';
import { saveQuickReplies } from './firebase-service.js';

export function initializeChat() {
    let allUserTemplates = [];
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
        const quickReplies = allUserTemplates.filter(r => r.category !== 'os_template');

        if (quickReplies.length === 0) {
            elements.selectDisplay.textContent = 'Nenhuma resposta encontrada';
            return;
        }

        const groupedByCategory = quickReplies.reduce((acc, template) => {
            const category = template.subCategory || 'Geral';
            (acc[category] = acc[category] || []).push(template);
            return acc;
        }, {});

        // Destrói instâncias antigas para evitar múltiplos listeners
        sortableInstances.forEach(sortable => sortable.destroy());
        sortableInstances = [];

        Object.keys(groupedByCategory).sort().forEach(categoryName => {
            const categoryGroup = document.createElement("div");
            categoryGroup.className = 'category-group';
            const optgroup = document.createElement("div");
            optgroup.className = 'optgroup-label';
            optgroup.textContent = categoryName;
            categoryGroup.appendChild(optgroup);
            const optionsContainer = document.createElement("div");
            optionsContainer.className = 'options-container';
            optionsContainer.dataset.categoryName = categoryName;

            groupedByCategory[categoryName].forEach(template => {
                const opt = document.createElement("div");
                opt.className = 'option-item';
                opt.textContent = template.title;
                opt.dataset.value = allUserTemplates.indexOf(template);
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

        // Inicializa o Sortable para os ITENS dentro de cada categoria
        elements.selectItems.querySelectorAll('.options-container').forEach(container => {
            sortableInstances.push(Sortable.create(container, {
                group: 'shared-options',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: () => saveOrderAndCategories(), // Salva ao mover um item
            }));
        });
        
        // CORREÇÃO: Inicializa o Sortable para as CATEGORIAS
        sortableInstances.push(Sortable.create(elements.selectItems, {
            handle: '.optgroup-label', // Define que o arrasto é pelo título da categoria
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: () => saveOrderAndCategories(), // Salva ao mover uma categoria
        }));
    };

    const saveOrderAndCategories = async () => {
        const attendant = getCurrentAttendant();
        if (!attendant) return;

        const newOrderedQuickReplies = [];
        // Lê a ordem visual do DOM para reconstruir os dados
        elements.selectItems.querySelectorAll('.category-group').forEach(group => {
            const categoryName = group.querySelector('.options-container').dataset.categoryName;
            group.querySelectorAll('.option-item').forEach(item => {
                const originalIndex = parseInt(item.dataset.value);
                const template = allUserTemplates[originalIndex];
                if (template) {
                    // Atualiza a categoria do template caso ele tenha sido movido
                    template.subCategory = categoryName;
                    newOrderedQuickReplies.push(template);
                }
            });
        });

        const osTemplates = allUserTemplates.filter(r => r.category === 'os_template');
        // Atualiza o array principal com a nova ordem
        allUserTemplates = [...newOrderedQuickReplies, ...osTemplates];

        try {
            await saveQuickReplies(attendant, allUserTemplates);
            // Não precisa recarregar a lista, apenas mostrar a notificação
            showPopup("Ordem e categorias salvas!", 'success');
        } catch (error) {
            showPopup("Erro ao salvar as alterações.", 'error');
        }
    };

    const displaySelectedResponse = () => {
        const selectedIndex = currentSelection.value;
        if (selectedIndex === "") {
            elements.response.value = "Selecione uma opção para ver a mensagem.";
        } else {
            const template = allUserTemplates[parseInt(selectedIndex)];
            elements.response.value = template ? template.text : "Resposta não encontrada.";
        }
        adjustTextareaHeight(elements.response);
        elements.titleContainer.style.display = 'none';
    };

    const saveChanges = async () => {
        const attendant = getCurrentAttendant();
        const selectedIndex = currentSelection.value;
        if (!attendant || selectedIndex === "") return showPopup("Selecione uma resposta para salvar.", 'error');
        allUserTemplates[parseInt(selectedIndex)].text = elements.response.value.trim();
        await saveQuickReplies(attendant, allUserTemplates);
        showPopup("Resposta salva com sucesso!", 'success');
    };

    const deleteResponse = () => {
        const attendant = getCurrentAttendant();
        const selectedIndex = currentSelection.value;
        if (!attendant || selectedIndex === "") return showPopup("Selecione uma resposta para apagar.", 'error');
        
        if (confirm('Tem certeza que deseja apagar esta resposta permanentemente?')) {
            allUserTemplates.splice(parseInt(selectedIndex), 1);
            saveQuickReplies(attendant, allUserTemplates).then(() => {
                currentSelection = { value: "", text: "Selecione uma resposta" };
                updateResponseSelector();
                displaySelectedResponse();
                showPopup("Resposta apagada com sucesso!");
            });
        }
    };

    const addNewResponse = () => {
        const attendant = getCurrentAttendant();
        if (!attendant) return showPopup("Selecione um atendente primeiro.", 'error');

        const modal = document.getElementById('addResponseModal');
        const titleInput = document.getElementById('newResponseTitle');
        const categorySelect = document.getElementById('newResponseCategorySelect');
        const categoryInput = document.getElementById('newResponseCategoryInput');
        const saveBtn = document.getElementById('modalSaveNewBtn');
        const cancelBtn = document.getElementById('modalCancelNewBtn');

        const existingCategories = [...new Set(allUserTemplates.filter(r => r.subCategory).map(r => r.subCategory))];
        categorySelect.innerHTML = '<option value="">-- Selecione ou crie uma --</option>';
        existingCategories.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
        categorySelect.innerHTML += '<option value="new_category">-- Nova Categoria --</option>';

        titleInput.value = '';
        categoryInput.value = '';
        categoryInput.style.display = 'none';
        categorySelect.selectedIndex = 0;
        
        modal.style.display = 'flex';
        titleInput.focus();

        const onCategoryChange = () => {
            categoryInput.style.display = categorySelect.value === 'new_category' ? 'block' : 'none';
            if (categorySelect.value === 'new_category') categoryInput.focus();
        };

        const onSave = async () => {
            const title = titleInput.value.trim();
            if (!title) return showPopup("O título não pode estar em branco.", 'error');

            let categoryName = '';
            if (categorySelect.value === 'new_category') {
                categoryName = categoryInput.value.trim();
                if (!categoryName) return showPopup("O nome da nova categoria é obrigatório.", 'error');
            } else {
                categoryName = categorySelect.value || 'Geral';
            }

            const newTemplate = {
                title: title,
                text: "Nova resposta. Edite aqui e clique em Salvar.",
                category: "quick_reply",
                subCategory: categoryName,
                keywords: []
            };

            allUserTemplates.push(newTemplate);
            await saveQuickReplies(attendant, allUserTemplates);

            currentSelection = { value: (allUserTemplates.length - 1).toString(), text: title };
            updateResponseSelector();
            displaySelectedResponse();
            showPopup("Nova resposta adicionada!");
            cleanup();
        };
        
        const cleanup = () => {
            modal.style.display = 'none';
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', cleanup);
            categorySelect.removeEventListener('change', onCategoryChange);
        };
        
        saveBtn.addEventListener('click', onSave);
        cancelBtn.addEventListener('click', cleanup);
        categorySelect.addEventListener('change', onCategoryChange);
    };

    const editTitle = () => {
        const selectedIndex = currentSelection.value;
        if (selectedIndex === "") return showPopup("Selecione uma resposta para editar.", 'error');
        const template = allUserTemplates[parseInt(selectedIndex)];
        elements.title.value = template.title;
        elements.titleContainer.style.display = 'flex';
        elements.title.focus();
    };

    const saveNewTitle = async () => {
        const attendant = getCurrentAttendant();
        const selectedIndex = currentSelection.value;
        if (!attendant || selectedIndex === "") return;
        const newTitle = elements.title.value.trim();
        if (!newTitle) return showPopup("O título não pode ser vazio.", 'error');
        allUserTemplates[parseInt(selectedIndex)].title = newTitle;
        await saveQuickReplies(attendant, allUserTemplates);
        currentSelection.text = newTitle;
        updateResponseSelector();
        displaySelectedResponse();
        showPopup("Título alterado com sucesso!");
    };

    elements.selectDisplay.addEventListener('click', () => elements.selectItems.classList.toggle('select-hide'));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) elements.selectItems.classList.add('select-hide');
    });
    elements.response.addEventListener('input', () => adjustTextareaHeight(elements.response));
    elements.copyBtn.addEventListener('click', () => {
        const processedText = replacePlaceholders(elements.response.value);
        navigator.clipboard.writeText(processedText).then(() => showPopup('Texto copiado!'));
    });
    elements.saveEditBtn.addEventListener('click', saveChanges);
    elements.addBtn.addEventListener('click', addNewResponse);
    elements.deleteBtn.addEventListener('click', deleteResponse);
    elements.editTitleBtn.addEventListener('click', editTitle);
    elements.saveTitleBtn.addEventListener('click', saveNewTitle);

    return {
        setResponses: (data) => {
            allUserTemplates = Array.isArray(data) ? data : [];
            currentSelection = { value: "", text: "Selecione uma resposta" };
            updateResponseSelector();
            displaySelectedResponse();
        }
    };
}

