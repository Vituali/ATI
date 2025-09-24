import { getOsTemplates, saveAllOsTemplates, getSgpOccurrenceTypes, getMasterOsTemplates } from './firebase-service.js';
import { showPopup } from './ui.js';
import { db } from './firebase-init.js';
import { ref, push, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

let elements;
let templatesCache = {};
let allOccurrenceTypes = []; // Cache para os tipos de ocorrência
let currentUser = null;

/**
 * Carrega e popula os menus de tipo de ocorrência.
 */
async function loadOccurrenceTypes() {
    try {
        const types = await getSgpOccurrenceTypes();
        allOccurrenceTypes = types && Array.isArray(types) ? types.sort((a, b) => a.text.localeCompare(b.text)) : [];
        
        // Popula o menu de FILTRO
        const filterSelect = elements.typeFilter;
        filterSelect.innerHTML = '<option value="">-- Todos os Modelos --</option>';
        allOccurrenceTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.text;
            filterSelect.appendChild(option);
        });

        // Popula as opções do seletor com BUSCA no formulário
        const optionsContainer = elements.occurrenceTypeOptions;
        optionsContainer.innerHTML = '';
        allOccurrenceTypes.forEach(type => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'searchable-option';
            optionDiv.dataset.value = type.id;
            optionDiv.textContent = type.text;
            optionsContainer.appendChild(optionDiv);
        });

    } catch (error) {
        console.error("Falha ao carregar tipos de ocorrência:", error);
        elements.typeFilter.innerHTML = '<option value="">-- Erro --</option>';
    }
}

/**
 * Filtra a lista de modelos com base no tipo de ocorrência selecionado.
 */
function filterAndRenderList() {
    const filterId = elements.typeFilter.value;
    let filteredTemplates = Object.values(templatesCache);
    if (filterId) {
        filteredTemplates = filteredTemplates.filter(t => t.occurrenceTypeId === filterId);
    }
    renderTemplateList(filteredTemplates);
}

/**
 * Renderiza a lista de templates na tela.
 */
function renderTemplateList(templatesToRender) {
    elements.list.innerHTML = '';
    if (templatesToRender.length === 0) {
        elements.list.innerHTML = '<li>Nenhum modelo para este filtro.</li>';
        return;
    }
    templatesToRender.sort((a, b) => a.title.localeCompare(b.title)).forEach(template => {
        const li = document.createElement('li');
        li.className = 'os-list-item';
        li.dataset.id = template.id;
        li.innerHTML = `
            <span>${template.title}</span>
            <div class="template-actions">
                <button class="action-btn edit-btn" data-id="${template.id}" data-tooltip="Editar">✏️</button>
                <button class="action-btn delete-btn" data-id="${template.id}" data-tooltip="Apagar">🗑️</button>
            </div>
        `;
        elements.list.appendChild(li);
    });
}

async function loadAndRenderTemplates() {
    if (!currentUser) {
        templatesCache = {};
        filterAndRenderList();
        return;
    }
    try {
        const rawData = await getOsTemplates(currentUser);
        templatesCache = {}; // Limpa o cache antes de preencher
        if (Array.isArray(rawData)) { // Lida com o formato antigo de array
            rawData.forEach((template, index) => {
                if (template) {
                    const tempId = `old_${index}`;
                    template.id = tempId;
                    templatesCache[tempId] = template;
                }
            });
        } else if (rawData && typeof rawData === 'object') { // Lida com o formato novo de objeto
            Object.entries(rawData).forEach(([id, template]) => {
                template.id = id;
                templatesCache[id] = template;
            });
        }
        filterAndRenderList();
    } catch (error) {
        showPopup('Erro ao carregar modelos.', true);
    }
}

function fillFormForEdit(templateId) {
    const template = templatesCache[templateId];
    if (!template) return;
    elements.id.value = template.id;
    elements.title.value = template.title;
    elements.text.value = template.text;
    elements.category.value = template.category || '';
    elements.keywords.value = template.keywords ? template.keywords.join(', ') : '';
    
    // Preenche o seletor com busca
    const type = allOccurrenceTypes.find(t => t.id === template.occurrenceTypeId);
    elements.occurrenceTypeSearch.value = type ? type.text : '';
    elements.occurrenceTypeId.value = template.occurrenceTypeId || '';
    
    elements.formTitle.textContent = 'Editar Modelo de O.S.';
    
    document.querySelectorAll('.os-list-item.active').forEach(item => item.classList.remove('active'));
    const listItem = elements.list.querySelector(`[data-id="${templateId}"]`);
    if (listItem) listItem.classList.add('active');
}

function resetForm() {
    elements.form.reset();
    elements.id.value = '';
    elements.occurrenceTypeSearch.value = '';
    elements.occurrenceTypeId.value = '';
    elements.formTitle.textContent = 'Novo Modelo de O.S.';
    document.querySelectorAll('.os-list-item.active').forEach(item => item.classList.remove('active'));
}

async function handleFormSubmit(event) {
    event.preventDefault();
    if (!currentUser) return;

    const templateData = {
        title: elements.title.value.trim(),
        text: elements.text.value.trim(),
        category: elements.category.value.trim(),
        keywords: elements.keywords.value.split(',').map(k => k.trim()).filter(Boolean),
        occurrenceTypeId: elements.occurrenceTypeId.value
    };

    if (!templateData.title) return showPopup('O título é obrigatório.', 'error');

    let id = elements.id.value;

    if (id && id.startsWith('old_')) {
        delete templatesCache[id];
        id = null; 
    }
    
    if (!id) {
        id = push(child(ref(db), `modelos_os/${currentUser}`)).key;
    }
    
    templateData.id = id;
    templatesCache[id] = templateData;
    
    try {
        await saveAllOsTemplates(currentUser, templatesCache);
        await loadAndRenderTemplates();
        resetForm();
        showPopup('Modelo salvo com sucesso!');
    } catch (error) {
        showPopup('Erro ao salvar modelo.', true);
    }
}

async function handleListClick(event) {
    const target = event.target;
    const listItem = target.closest('.os-list-item');
    const editButton = target.closest('.edit-btn');
    const deleteButton = target.closest('.delete-btn');

    if (editButton) {
        fillFormForEdit(editButton.dataset.id);
    } else if (deleteButton) {
        const templateId = deleteButton.dataset.id;
        if (confirm('Tem certeza que deseja excluir este modelo?')) {
            delete templatesCache[templateId];
            await saveAllOsTemplates(currentUser, templatesCache);
            filterAndRenderList();
            resetForm();
            showPopup('Modelo excluído.');
        }
    } else if (listItem) {
        fillFormForEdit(listItem.dataset.id);
    }
}

async function loadDefaultTemplates() {
    if (!currentUser) return;
    try {
        // A função getMasterOsTemplates agora retorna um array.
        const defaultTemplates = await getMasterOsTemplates();
        
        // CORREÇÃO: Verifica se o array é válido e não está vazio.
        if (!Array.isArray(defaultTemplates) || defaultTemplates.length === 0) {
            return showPopup("Nenhum modelo padrão encontrado para carregar.", "info");
        }

        let newTemplatesCount = 0;
        
        // CORREÇÃO: Itera diretamente sobre o array de modelos.
        defaultTemplates.forEach(defaultTemplate => {
            if (!defaultTemplate) return; // Pula itens nulos/inválidos no array
            
            // Verifica se um modelo com o mesmo título já existe no cache do usuário
            const exists = Object.values(templatesCache).some(userTemplate => userTemplate.title === defaultTemplate.title);
            if (!exists) {
                // Se não existir, adiciona como um novo modelo
                const newId = push(child(ref(db), `modelos_os/${currentUser}`)).key;
                templatesCache[newId] = { ...defaultTemplate, id: newId };
                newTemplatesCount++;
            }
        });

        if (newTemplatesCount > 0) {
            await saveAllOsTemplates(currentUser, templatesCache);
            await loadAndRenderTemplates();
            showPopup(`${newTemplatesCount} novo(s) modelo(s) padrão foram adicionados!`, "success");
        } else {
            showPopup("Seus modelos já estão atualizados com os padrões.", "info");
        }

    } catch (error) {
        showPopup("Erro ao carregar modelos padrão.", "error");
        console.error("Erro ao carregar modelos padrão:", error);
    }
}


export function initializeOsEditor() {
    const osSection = document.getElementById('osSection');
    if (!osSection || osSection.dataset.initialized) return;

    elements = {
        form: osSection.querySelector('#os-form'),
        formTitle: osSection.querySelector('#os-form-title'),
        id: osSection.querySelector('#os-id'),
        title: osSection.querySelector('#os-title'),
        text: osSection.querySelector('#os-text'),
        category: osSection.querySelector('#os-category'),
        keywords: osSection.querySelector('#os-keywords'),
        list: osSection.querySelector('#os-templates-list'),
        cancelBtn: osSection.querySelector('#os-cancel-btn'),
        loadDefaultsBtn: osSection.querySelector('#os-load-defaults-btn'), // Pega o novo botão
        typeFilter: osSection.querySelector('#os-type-filter'),
        occurrenceTypeSearch: osSection.querySelector('#os-occurrence-type-search'),
        occurrenceTypeId: osSection.querySelector('#os-occurrence-type-id'),
        occurrenceTypeOptions: osSection.querySelector('#os-occurrence-type-options'),
    };

    if (!elements.form) return;

    currentUser = localStorage.getItem('atendenteAtual');
    loadAndRenderTemplates();
    loadOccurrenceTypes();

    // Event Listeners
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.cancelBtn.addEventListener('click', resetForm);
    elements.list.addEventListener('click', handleListClick);
    elements.typeFilter.addEventListener('change', filterAndRenderList);
    elements.loadDefaultsBtn.addEventListener('click', loadDefaultTemplates); // Adiciona o evento ao botão

    // Lógica do seletor com busca
    const searchInput = elements.occurrenceTypeSearch;
    const hiddenInput = elements.occurrenceTypeId;
    const optionsContainer = elements.occurrenceTypeOptions;

    searchInput.addEventListener('focus', () => { optionsContainer.style.display = 'block'; });
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !optionsContainer.contains(e.target)) {
             optionsContainer.style.display = 'none';
        }
    });

    searchInput.addEventListener('input', () => {
        const filter = searchInput.value.toUpperCase();
        hiddenInput.value = '';
        optionsContainer.querySelectorAll('.searchable-option').forEach(option => {
            const txtValue = option.textContent || option.innerText;
            option.style.display = txtValue.toUpperCase().indexOf(filter) > -1 ? "" : "none";
        });
    });

    optionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('searchable-option')) {
            hiddenInput.value = e.target.dataset.value;
            searchInput.value = e.target.innerText;
            optionsContainer.style.display = 'none';
        }
    });

    window.addEventListener('atendenteAtualChanged', (event) => {
        currentUser = event.detail.newUser;
        loadAndRenderTemplates();
        resetForm();
    });

    osSection.dataset.initialized = 'true';
}

