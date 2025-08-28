// assets/js/os-editor.js

import { showPopup } from './ui.js';
import { saveDataForAttendant, db } from './firebase.js'; // Precisaremos do 'db' para buscar o modelo mestre
import { ref, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Variável para guardar todos os templates do usuário (O.S. e Quick Replies)
let allUserTemplates = []; 
let currentUsername = '';

const elements = {
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

function getOsTemplates() {
    return allUserTemplates.filter(t => t.category !== 'quick_reply');
}

function renderList() {
    const osTemplates = getOsTemplates();
    elements.list.innerHTML = '';
    if (osTemplates.length === 0) {
        elements.list.innerHTML = '<p>Nenhum modelo de O.S. encontrado.</p>';
        return;
    }

    // 1. Agrupa os templates por categoria usando reduce
    const groupedByCategory = osTemplates.reduce((acc, template) => {
        const category = template.category || 'Geral'; // Usa 'Geral' se não houver categoria
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(template);
        return acc;
    }, {});

    // 2. Itera sobre as categorias agrupadas para criar a lista
    for (const category in groupedByCategory) {
        // Cria o título da categoria (ex: <h3>Financeiro</h3>)
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'os-category-header';
        categoryHeader.textContent = category;
        elements.list.appendChild(categoryHeader);

        // Itera sobre os templates dentro de cada categoria
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
    elements.form.reset();
    elements.formTitle.textContent = 'Crie um Novo Modelo';
    elements.editIndex.value = '';
    elements.deleteBtn.style.display = 'none';
    document.querySelectorAll('.os-list-item.active').forEach(i => i.classList.remove('active'));
}

async function saveAllTemplates() {
    if (!currentUsername) return;
    await saveDataForAttendant(currentUsername, allUserTemplates);
    renderList(); // Re-renderiza a lista para refletir as mudanças
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

    if (editIndex !== '') { // Editando um existente
        const template = allUserTemplates[parseInt(editIndex)];
        Object.assign(template, data);
    } else { // Criando um novo
        // Garante que não é confundido com uma resposta rápida
        if (data.category === 'quick_reply') data.category = 'Geral'; 
        allUserTemplates.push(data);
    }

    await saveAllTemplates();
    showPopup('Modelo salvo com sucesso!', 'success');
    resetForm();
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
            const masterTemplates = snapshot.val();
            // Remove todos os modelos de O.S. antigos
            const quickReplies = allUserTemplates.filter(t => t.category === 'quick_reply');
            // Cria a nova lista com as respostas rápidas + os modelos mestre
            allUserTemplates = [...quickReplies, ...masterTemplates];
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
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.newBtn.addEventListener('click', resetForm);
    elements.deleteBtn.addEventListener('click', handleDelete);
    elements.resetBtn.addEventListener('click', resetToDefaults);
}

// API pública para o app.js
export const osEditorModule = {
    setTemplates: (templates, username) => {
        allUserTemplates = templates;
        currentUsername = username;
        renderList();
        resetForm();
    }
};