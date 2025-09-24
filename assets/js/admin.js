import { initializeFirebase, checkAuthState, loadAtendentes, updateUserRole, updateUserStatus } from './firebase-service.js';
import { showPopup } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- SELETORES GERAIS ---
    const userListBody = document.getElementById('userListBody');
    const loader = document.getElementById('adminLoader');
    const mainContent = document.getElementById('mainContent');
    let loadedAtendentes = {}; // Armazena os atendentes carregados para reutilização

    initializeFirebase();

    // --- LÓGICA DE GERENCIAMENTO DE USUÁRIOS ---
    const populateUserTable = (allAtendentes, currentAdminUid) => {
        userListBody.innerHTML = '';
        Object.entries(allAtendentes).forEach(([username, data]) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${username}</td>
                <td>${data.nomeCompleto || 'N/A'}</td>
                <td>
                    <select data-username="${username}" ${data.uid === currentAdminUid ? 'disabled' : ''}>
                        <option value="usuario" ${data.role === 'usuario' ? 'selected' : ''}>Usuário</option>
                        <option value="admin" ${data.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>
                    <button class="${data.status === 'inativo' ? 'button' : 'button back'}" data-username="${username}" data-current-status="${data.status || 'ativo'}" ${data.uid === currentAdminUid ? 'disabled' : ''}>
                        ${data.status === 'inativo' ? 'Ativar' : 'Desativar'}
                    </button>
                </td>
            `;
            
            if (data.status === 'inativo') {
                row.style.opacity = '0.5';
            }
            userListBody.appendChild(row);
        });
    };

    // --- FLUXO PRINCIPAL E EVENTOS DE GERENCIAMENTO ---
    loader.style.display = 'flex';
    mainContent.style.display = 'none';

    checkAuthState(async (user) => {
        if (user) {
            loadedAtendentes = await loadAtendentes(); // Carrega e armazena os atendentes
            const adminKey = Object.keys(loadedAtendentes).find(key => loadedAtendentes[key].uid === user.uid);
            
            if (adminKey && loadedAtendentes[adminKey].role === 'admin') {
                populateUserTable(loadedAtendentes, user.uid);
                loader.style.display = 'none';
                mainContent.style.display = 'block';
            } else {
                alert("Acesso negado. Você não tem permissão para ver esta página.");
                window.location.href = 'index.html';
            }
        } else {
            alert("Você precisa estar logado para acessar esta página.");
            window.location.href = 'index.html';
        }
    });

    userListBody.addEventListener('click', async (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.username) {
            const button = e.target;
            const username = button.dataset.username;
            const newStatus = button.dataset.currentStatus === 'ativo' ? 'inativo' : 'ativo';
            try {
                await updateUserStatus(username, newStatus);
                showPopup(`Usuário ${username} foi ${newStatus === 'ativo' ? 'ativado' : 'desativado'}.`, 'success');
                // Recarrega os dados para atualizar a UI de forma consistente
                loadedAtendentes = await loadAtendentes();
                const currentUser = auth.currentUser;
                populateUserTable(loadedAtendentes, currentUser.uid);
            } catch (error) {
                showPopup(`Erro ao atualizar status: ${error.message}`, 'error');
            }
        }
    });

    userListBody.addEventListener('change', async (e) => {
        if (e.target.tagName === 'SELECT') {
            const username = e.target.dataset.username;
            const newRole = e.target.value;
            try {
                await updateUserRole(username, newRole);
                showPopup(`Permissão de ${username} atualizada para ${newRole}.`, 'success');
            } catch (error) {
                showPopup(`Erro ao atualizar permissão: ${error.message}`, 'error');
            }
        }
    });


    // --- LÓGICA PARA O VERIFICADOR DE USUÁRIOS ÓRFÃOS ---
    const checkerStep1 = document.getElementById('checkerStep1');
    const checkerStep2 = document.getElementById('checkerStep2');
    const checkerResults = document.getElementById('checkerResults');
    const loadValidUsersBtn = document.getElementById('loadValidUsersBtn');
    const compareBtn = document.getElementById('compareBtn');
    const pasteArea = document.getElementById('authPasteArea');
    const orphanList = document.getElementById('orphanList');
    let validUIDs = new Set();

    loadValidUsersBtn.addEventListener('click', () => {
        // Reutiliza a lista de atendentes já carregada
        Object.values(loadedAtendentes).forEach(data => {
            if (data.uid) validUIDs.add(data.uid);
        });
        
        alert(`${validUIDs.size} usuários válidos encontrados no banco de dados.`);
        checkerStep1.classList.add('hidden');
        checkerStep2.classList.remove('hidden');
    });

    compareBtn.addEventListener('click', () => {
        const pastedText = pasteArea.value;
        if (!pastedText.trim()) return alert("Por favor, cole os dados do painel de autenticação.");

        const lineRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+([a-zA-Z0-9]{28})/g;
        let match;
        const orphans = [];

        while ((match = lineRegex.exec(pastedText)) !== null) {
            const email = match[1];
            const uid = match[2];
            if (!validUIDs.has(uid)) {
                orphans.push({ email, uid });
            }
        }

        orphanList.innerHTML = '';
        if (orphans.length > 0) {
            orphans.forEach(orphan => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="orphan">[ÓRFÃ]</span> Email: ${orphan.email} | UID: ${orphan.uid}`;
                orphanList.appendChild(li);
});
        } else {
            orphanList.innerHTML = '<li><span class="valid">[OK] Nenhuma conta órfã encontrada!</span></li>';
        }
        checkerResults.classList.remove('hidden');
    });
});