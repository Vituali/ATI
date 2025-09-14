// assets/js/os-editor.js - VERSÃO CORRIGIDA E FINAL

import { showPopup } from './ui.js';
import { saveOsTemplatesForAttendant, db } from './firebase.js'; 
import { ref, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

let elements = {};
let allUserTemplates = []; 
let currentUsername = '';

function renderList() {
    // Como agora só temos modelos de O.S., não precisamos mais filtrar.
    const osTemplates = allUserTemplates;
    elements.list.innerHTML = '';
    if (osTemplates.length === 0) {
        elements.list.innerHTML = '<p>Nenhum modelo de O.S. encontrado.</p>';
        return;
    }

    const groupedByCategory = osTemplates.reduce((acc, template) => {
        const category = template.category || 'Geral';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(template);
        return acc;
    }, {});

    for (const category in groupedByCategory) {
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'os-category-header';
        categoryHeader.textContent = category;
        elements.list.appendChild(categoryHeader);

        groupedByCategory[category].forEach(template => {
            const originalIndex = allUserTemplates.indexOf(template);
            const item = document.createElement('div');
            item.className = 'os-list-item';
            item.textContent = template.title;
            item.dataset.index = originalIndex;
            
            item.addEventListener('click', () => {
                document.querySelectorAll('.os-list-item.active').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                fillFormForEdit(originalIndex);
            });

            elements.list.appendChild(item);
        });
    }
}

function fillFormForEdit(index) {
    const template = allUserTemplates[index];
    if (!template) return;

    elements.formTitle.textContent = `Editando: ${template.title}`;
    elements.editIndex.value = index;
    elements.title.value = template.title;
    elements.text.value = template.text;
    elements.category.value = template.category;
    elements.keywords.value = (template.keywords || []).join(', ');
    elements.deleteBtn.style.display = 'inline-block';
}

function resetForm() {
    // --- CORREÇÃO FINAL: Reset manual e explícito dos campos ---
    elements.title.value = '';
    elements.text.value = '';
    elements.keywords.value = '';
    elements.category.selectedIndex = 0;

    elements.formTitle.textContent = 'Crie um Novo Modelo';
    elements.editIndex.value = '';
    elements.deleteBtn.style.display = 'none';
    document.querySelectorAll('.os-list-item.active').forEach(i => i.classList.remove('active'));
}

async function saveAllTemplates() {
    if (!currentUsername) return;
    // Chama a função dedicada para salvar os modelos de O.S.
    await saveOsTemplatesForAttendant(currentUsername, allUserTemplates);
    renderList();
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const data = {
        title: elements.title.value.trim(),
        text: elements.text.value.trim(),
        category: elements.category.value,
        keywords: elements.keywords.value.split(',').map(k => k.trim()).filter(Boolean),
    };

    if (!data.title) {
        showPopup('O título é obrigatório.', 'error');
        return;
    }

    const editIndex = elements.editIndex.value;

    try {
        if (editIndex !== '') { // Editando
            const template = allUserTemplates[parseInt(editIndex)];
            Object.assign(template, data);
        } else { // Criando um novo (com a correção de imutabilidade)
            allUserTemplates = [...allUserTemplates, data];
        }

        await saveAllTemplates();
        showPopup('Modelo salvo com sucesso!', 'success');

    } catch (error) {
        showPopup('Erro ao salvar o modelo.', 'error');
        console.error("Falha em handleFormSubmit:", error);

    } finally {
        // O finally garante que o formulário sempre será limpo.
        resetForm();
    }
}

async function handleDelete() {
    const editIndex = elements.editIndex.value;
    if (editIndex === '') return;

    if (confirm('Tem certeza que deseja apagar este modelo?')) {
        allUserTemplates.splice(parseInt(editIndex), 1);
        await saveAllTemplates();
        showPopup('Modelo apagado.', 'info');
        resetForm();
    }
}

async function resetToDefaults() {
    if (!confirm('Isso substituirá TODOS os seus modelos de O.S. pelos modelos padrão. Deseja continuar?')) {
        return;
    }

    try {
        const masterRef = ref(db, 'os_templates_master');
        const snapshot = await get(masterRef);
        if (snapshot.exists()) {
            allUserTemplates = snapshot.val(); 
            await saveAllTemplates();
            showPopup('Modelos de O.S. resetados para o padrão!', 'success');
        } else {
            showPopup('Nenhum modelo padrão encontrado no banco de dados.', 'error');
        }
    } catch (error) {
        showPopup('Erro ao buscar modelos padrão.', 'error');
        console.error("Erro ao resetar:", error);
    }
}

export function initializeOsEditor() {
    // A CORREÇÃO PRINCIPAL: Preenchemos 'elements' aqui, depois que a página carregou.
    elements = {
        list: document.getElementById('os-list'),
        form: document.getElementById('os-form'),
        formTitle: document.getElementById('os-form-title'),
        editIndex: document.getElementById('os-edit-index'),
        title: document.getElementById('os-title'),
        text: document.getElementById('os-text'),
        category: document.getElementById('os-category'),
        keywords: document.getElementById('os-keywords'),
        saveBtn: document.getElementById('os-save-btn'),
        newBtn: document.getElementById('os-new-btn'),
        deleteBtn: document.getElementById('os-delete-btn'),
        resetBtn: document.getElementById('os-reset-btn'),
    };

    // E então adicionamos os eventos
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.newBtn.addEventListener('click', resetForm);
    elements.deleteBtn.addEventListener('click', handleDelete);
    elements.resetBtn.addEventListener('click', resetToDefaults);
}

export const osEditorModule = {
    setTemplates: (templates, username) => {
        allUserTemplates = templates || []; // Garante que seja um array
        currentUsername = username;
        renderList();
        resetForm();
    }
};