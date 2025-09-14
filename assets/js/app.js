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

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. INICIALIZAÇÃO E SELETORES ---
    initializeUI();
    initializeTheme();
    initializeOsEditor(); // <-- CHAMADA DE VOLTA AO LOCAL CORRETO
    initializeConversor();
    initializeFirebase();
    const chatModule = initializeChat();

    let currentUsername = null;

    // Seletores da interface
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

    // --- 2. DEFINIÇÃO DAS FUNÇÕES PRINCIPAIS ---
    const startApp = async (user, allAtendentes) => {
        const attendantKey = Object.keys(allAtendentes).find(key => allAtendentes[key].uid === user.uid);
        if (!attendantKey) {
            showPopup("Não foi possível carregar os dados do seu perfil. Por favor, faça o login novamente.", 'error');
            await logoutUser();
            return;
        }
        currentUsername = attendantKey;
        authOverlay.style.display = 'none';
        mainContent.style.display = 'flex';
        sidebar.style.display = 'flex';
        const attendantData = allAtendentes[attendantKey];
        if (attendantData.status === 'inativo') {
            showPopup("Sua conta foi desativada.", 'error');
            await logoutUser();
            return;
        }
        if (atendenteToggleBtn) {
            const atendenteTextSpan = atendenteToggleBtn.querySelector('.text');
            if (atendenteTextSpan) atendenteTextSpan.textContent = attendantKey.charAt(0).toUpperCase() + attendantKey.slice(1);
        }
        localStorage.setItem("atendenteAtual", attendantKey);
        if (newFullNameInput) newFullNameInput.value = attendantData.nomeCompleto;
        if (profileUsernameSpan) profileUsernameSpan.textContent = attendantKey;
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

    // --- 3. FLUXO DE EXECUÇÃO PRINCIPAL ---
    try {
        checkAuthState(async (user) => {
            if (user) {
                const allAtendentes = await loadAtendentes();
                await startApp(user, allAtendentes);
            } else {
                showLoginScreen();
            }
        });
    } catch (error) {
        console.error("Erro fatal na inicialização:", error);
        showPopup("Não foi possível iniciar a aplicação.", "error");
        showLoginScreen();
    }

    // --- 4. EVENT LISTENERS DA INTERFACE ---

    // Listener para os botões da barra lateral (versão simples e correta)
    document.querySelectorAll('.sidebar-button[data-section]').forEach(button => {
        button.addEventListener('click', () => {
            showSection(button.dataset.section, currentUsername);
        });
    });

    if (atendenteToggleBtn) atendenteToggleBtn.addEventListener('click', () => { profileModal.style.display = 'flex'; });
    if (modalCloseProfileBtn) modalCloseProfileBtn.addEventListener('click', () => { profileModal.style.display = 'none'; });
    if (modalLogoutBtn) modalLogoutBtn.addEventListener('click', async () => { try { await logoutUser(); profileModal.style.display = 'none'; } catch (error) { showPopup("Erro ao fazer logout: " + error.message, 'error'); } });
    if (updateFullNameForm) {
        updateFullNameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newFullName = newFullNameInput.value;
            if (!newFullName.trim()) return showPopup("O nome não pode estar em branco.", 'error');
            if (!currentUsername) return showPopup("Erro: Usuário não identificado.", 'error');
            try {
                await updateUserFullName(currentUsername, newFullName);
                showPopup("Nome alterado com sucesso!", 'success');
                profileModal.style.display = 'none';
            } catch (error) {
                showPopup("Erro ao alterar o nome: " + error.message, 'error');
            }
        });
    }
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            if (newPassword.length < 6) return showPopup("A nova senha deve ter pelo menos 6 caracteres.", 'error');
            try {
                await updateUserPassword(newPassword);
                showPopup("Senha alterada com sucesso!", 'success');
                document.getElementById('newPassword').value = '';
                profileModal.style.display = 'none';
            } catch (error) {
                showPopup("Erro ao alterar senha: " + error.message, 'error');
            }
        });
    }
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('loginIdentifier').value;
            const password = document.getElementById('loginPassword').value;
            try {
                if (identifier.includes('@')) {
                    await loginUser(identifier, password);
                } else {
                    await loginWithUsername(identifier, password);
                }
            } catch (error) {
                let friendlyMessage = "Ocorreu um erro.";
                if (error.code === 'auth/invalid-login-credentials') {
                    friendlyMessage = "Usuário, e-mail ou senha incorretos.";
                }
                showPopup(friendlyMessage, 'error');
            }
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userDetails = {
                username: document.getElementById('registerUsername').value,
                fullName: document.getElementById('registerFullName').value,
                email: document.getElementById('registerEmail').value,
                password: document.getElementById('registerPassword').value,
            };
            if (!userDetails.username || !userDetails.fullName) return showPopup("Todos os campos são obrigatórios.", 'error');
            try {
                const { userCredential, sanitizedUsername, newAtendenteData } = await createUserAccount(userDetails);
                const allAtendentes = await loadAtendentes();
                allAtendentes[sanitizedUsername] = newAtendenteData;
                await startApp(userCredential.user, allAtendentes);
            } catch (error) {
                let friendlyMessage = "Ocorreu um erro desconhecido.";
                if (error.code === 'auth/email-already-in-use') friendlyMessage = "Este e-mail já está cadastrado.";
                else if (error.code === 'auth/weak-password') friendlyMessage = "A senha é muito fraca.";
                else if (error.message.includes('Este nome de usuário já pode estar em uso')) friendlyMessage = "Este nome de usuário já está em uso.";
                showPopup("Erro no registro: " + friendlyMessage, 'error');
            }
        });
    }
    const showRegisterBtn = document.getElementById('show-register');
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; });
    const showLoginBtn = document.getElementById('show-login');
    if (showLoginBtn) showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; });
    document.addEventListener('click', (e) => {
        if (profileModal && atendenteToggleBtn && !atendenteToggleBtn.contains(e.target) && !profileModal.contains(e.target)) {
            profileModal.style.display = 'none';
        }
    });
    document.addEventListener('click', (e) => {
        const copiableElement = e.target.closest('.copiable');
        if (copiableElement) {
            navigator.clipboard.writeText(copiableElement.textContent).then(() => {
                showPopup(`'${copiableElement.textContent}' copiado!`, 'success');
            }).catch(err => {
                console.error('Erro ao copiar:', err);
                showPopup('Não foi possível copiar.', 'error');
            });
        }
    });
});