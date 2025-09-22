import { initializeUI, showSection, updateGreeting, showPopup } from './ui.js';
import {
    initializeFirebase,
    loadDataForAttendant,
    loadOsTemplatesForAttendant,
    loadAtendentes,
    loginUser,
    loginWithUsername,
    logoutUser,
    checkAuthState,
    createUserAccount,
    updateUserPassword,
    updateUserFullName
} from './firebase.js';
import { initializeTheme } from './theme.js';
import { initializeChat } from './chat.js';
import { osEditorModule, initializeOsEditor } from './os-editor.js';
import { initializeConversor } from './conversor.js';

// A execução principal agora espera o DOM estar completamente carregado.
document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. INICIALIZAÇÃO DOS MÓDULOS ---
    initializeUI();
    initializeTheme();
    initializeOsEditor();
    initializeConversor();
    initializeFirebase();
    const chatModule = initializeChat();

    let currentUsername = null;

    // --- 2. SELETORES DE ELEMENTOS DA INTERFACE ---
    const authOverlay = document.getElementById('auth-overlay');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const mainContent = document.querySelector('.chatbox');
    const sidebar = document.querySelector('.sidebar');
    const atendenteToggleBtn = document.getElementById('atendenteToggleBtn');
    const chatLoader = document.getElementById('chatLoader');
    const profileModal = document.getElementById('profileModal');
    const updateFullNameForm = document.getElementById('update-fullname-form');
    const updatePasswordForm = document.getElementById('update-password-form');
    const modalLogoutBtn = document.getElementById('modalLogoutBtn');
    const modalCloseProfileBtn = document.getElementById('modalCloseProfileBtn');
    const adminLinkContainer = document.getElementById('admin-link-container');
    const newFullNameInput = document.getElementById('newFullName');
    const profileUsernameSpan = document.getElementById('profileUsername');

    // --- 3. FUNÇÕES PRINCIPAIS DA APLICAÇÃO ---
    const startApp = async (user, allAtendentes) => {
        const attendantKey = Object.keys(allAtendentes).find(key => allAtendentes[key].uid === user.uid);
        if (!attendantKey) {
            showPopup("Não foi possível carregar os dados do seu perfil. Tente fazer o login novamente.", 'error');
            await logoutUser();
            return;
        }
        currentUsername = attendantKey;
        const attendantData = allAtendentes[attendantKey];
        if (attendantData.status === 'inativo') {
            showPopup("Sua conta foi desativada.", 'error');
            await logoutUser();
            return;
        }

        // Atualiza a UI
        authOverlay.style.display = 'none';
        mainContent.style.display = 'flex';
        sidebar.style.display = 'flex';
        localStorage.setItem("atendenteAtual", attendantKey);
        
        // Atualiza UI do perfil
        if (profileUsernameSpan) profileUsernameSpan.textContent = attendantKey;
        if (newFullNameInput) newFullNameInput.value = attendantData.nomeCompleto;
        if (adminLinkContainer) adminLinkContainer.style.display = attendantData.role === 'admin' ? 'block' : 'none';

        chatLoader.style.display = 'flex';
        try {
            const chatData = await loadDataForAttendant(attendantKey);
            const osData = await loadOsTemplatesForAttendant(attendantKey);
            chatModule.setResponses(chatData);
            osEditorModule.setTemplates(osData, attendantKey);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            showPopup("Não foi possível carregar suas respostas.", "error");
        } finally {
            chatLoader.style.display = 'none';
        }
        
        updateGreeting(attendantKey);
        setInterval(() => updateGreeting(currentUsername), 60000);
    };

    const showLoginScreen = () => {
        mainContent.style.display = 'none';
        sidebar.style.display = 'none';
        authOverlay.style.display = 'flex';
        currentUsername = null;
    };

    // --- 4. FLUXO DE AUTENTICAÇÃO INICIAL ---
    checkAuthState(async (user) => {
        if (user) {
            try {
                const allAtendentes = await loadAtendentes();
                await startApp(user, allAtendentes);
            } catch (error) {
                console.error("Erro ao carregar atendentes ou iniciar o app:", error);
                showLoginScreen();
            }
        } else {
            showLoginScreen();
        }
    });

    // --- 5. EVENT LISTENERS ---
    document.querySelectorAll('.sidebar-button[data-section]').forEach(button => {
        button.addEventListener('click', () => showSection(button.dataset.section, currentUsername));
    });

    atendenteToggleBtn.addEventListener('click', () => { profileModal.style.display = 'flex'; });
    modalCloseProfileBtn.addEventListener('click', () => { profileModal.style.display = 'none'; });
    modalLogoutBtn.addEventListener('click', async () => { await logoutUser(); profileModal.style.display = 'none'; });

    updateFullNameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newFullName = newFullNameInput.value;
        if (!newFullName.trim() || !currentUsername) return;
        try {
            await updateUserFullName(currentUsername, newFullName);
            showPopup("Nome alterado com sucesso!", 'success');
            profileModal.style.display = 'none';
        } catch (error) { showPopup("Erro ao alterar o nome: " + error.message, 'error'); }
    });

    updatePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        if (newPassword.length < 6) return showPopup("A nova senha deve ter pelo menos 6 caracteres.", 'error');
        try {
            await updateUserPassword(newPassword);
            showPopup("Senha alterada com sucesso!", 'success');
            e.target.reset();
            profileModal.style.display = 'none';
        } catch (error) { showPopup("Erro ao alterar senha: " + error.message, 'error'); }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('loginIdentifier').value;
        const password = document.getElementById('loginPassword').value;
        try {
            await (identifier.includes('@') ? loginUser(identifier, password) : loginWithUsername(identifier, password));
        } catch (error) {
            showPopup("Usuário, e-mail ou senha incorretos.", 'error');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userDetails = {
            username: document.getElementById('registerUsername').value,
            fullName: document.getElementById('registerFullName').value,
            email: document.getElementById('registerEmail').value,
            password: document.getElementById('registerPassword').value,
        };
        try {
            await createUserAccount(userDetails);
        } catch (error) {
            let msg = error.code === 'auth/email-already-in-use' ? "Este e-mail já está cadastrado." :
                      error.code === 'auth/weak-password' ? "A senha é muito fraca." :
                      error.message.includes('Este nome de usuário já pode estar em uso') ? "Este nome de usuário já está em uso." :
                      "Erro no registro.";
            showPopup(msg, 'error');
        }
    });

    document.getElementById('show-register').addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; });
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; });
    
    document.addEventListener('click', (e) => {
        const copiableElement = e.target.closest('.copiable');
        if (copiableElement) {
            navigator.clipboard.writeText(copiableElement.textContent).then(() => showPopup(`'${copiableElement.textContent}' copiado!`, 'success'));
        }
    });
});
