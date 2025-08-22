import { initializeUI, showSection, updateGreeting, showPopup } from './ui.js';
import {
    initializeFirebase,
    loadDataForAttendant,
    loadAtendentes,
    loginUser,
    logoutUser,
    checkAuthState,
    createUserAccount,
    updateUserPassword
} from './firebase.js';
import { initializeTheme } from './theme.js';
import { initializeChat } from './chat.js';
import { initializeConversor } from './conversor.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. INICIALIZAÇÃO DOS MÓDULOS E SELETORES ---
    initializeUI();
    initializeTheme();
    initializeConversor();
    initializeFirebase();
    const chatModule = initializeChat();

    // Seletores da interface
    const authOverlay = document.getElementById('auth-overlay');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const mainContent = document.querySelector('.chatbox');
    const sidebar = document.querySelector('.sidebar');
    const atendenteToggleBtn = document.getElementById('atendenteToggleBtn');
    const chatLoader = document.getElementById('chatLoader');
    const profileModal = document.getElementById('profileModal');
    const updatePasswordForm = document.getElementById('update-password-form');
    const modalLogoutBtn = document.getElementById('modalLogoutBtn');
    const modalCloseProfileBtn = document.getElementById('modalCloseProfileBtn');
    const adminLinkContainer = document.getElementById('admin-link-container');

    // --- 2. DEFINIÇÃO DAS FUNÇÕES PRINCIPAIS ---

    /**
     * Inicia a aplicação principal para um usuário autenticado.
     * @param {object} user - O objeto do usuário vindo do Firebase Auth.
     * @param {object} allAtendentes - O objeto com os dados de todos os atendentes (JÁ CARREGADO).
     */
    const startApp = async (user, allAtendentes) => {
        authOverlay.style.display = 'none';
        mainContent.style.display = 'flex';
        sidebar.style.display = 'flex';

        const attendantKey = Object.keys(allAtendentes).find(key => allAtendentes[key].uid === user.uid);

        if (attendantKey) {
            // Atualiza o tooltip e o texto do botão do perfil
            if (atendenteToggleBtn) {
                atendenteToggleBtn.dataset.tooltip = allAtendentes[attendantKey].nomeCompleto;
                const atendenteTextSpan = atendenteToggleBtn.querySelector('.text');
                if(atendenteTextSpan) {
                    atendenteTextSpan.textContent = allAtendentes[attendantKey].nomeCompleto.split(' ')[0];
                }
            }
            localStorage.setItem("atendenteAtual", attendantKey);

            // Mostra o link de admin se o usuário tiver a permissão
            const userRole = allAtendentes[attendantKey].role;
            adminLinkContainer.style.display = userRole === 'admin' ? 'block' : 'none';

            // Carrega os dados do chat
            chatLoader.style.display = 'flex';
            const data = await loadDataForAttendant(attendantKey);
            chatModule.setResponses(data);
            chatLoader.style.display = 'none';
        } else {
            showPopup("Seu usuário do login não foi encontrado na lista de atendentes.", 'error');
            await logoutUser();
        }

        updateGreeting();
        setInterval(updateGreeting, 60000);
    };

    /**
     * Mostra a tela de login e esconde a aplicação principal.
     */
    const showLoginScreen = () => {
        mainContent.style.display = 'none';
        sidebar.style.display = 'none';
        authOverlay.style.display = 'flex';
    };

    // --- 3. FLUXO DE EXECUÇÃO PRINCIPAL (A CORREÇÃO ESTÁ AQUI) ---

    try {
        // SÓ verifica o estado de autenticação.
        checkAuthState(async (user) => {
            if (user) {
                // Se o usuário está logado, AGORA SIM carregamos os dados dele.
                const allAtendentes = await loadAtendentes(); // <<< MUDANÇA 2: Mova esta linha para cá
                startApp(user, allAtendentes);
            } else {
                // Se não, mostra a tela de login.
                showLoginScreen();
            }
        });

    } catch (error) {
        console.error("Erro fatal na inicialização:", error);
        showPopup("Não foi possível iniciar a aplicação. Verifique o console.", "error");
        showLoginScreen();
    }

    // --- 4. EVENT LISTENERS DA INTERFACE ---

    if (atendenteToggleBtn) {
        atendenteToggleBtn.addEventListener('click', () => {
            profileModal.style.display = 'flex';
        });
    }
    if (modalCloseProfileBtn) {
        modalCloseProfileBtn.addEventListener('click', () => {
            profileModal.style.display = 'none';
        });
    }
    if (modalLogoutBtn) {
        modalLogoutBtn.addEventListener('click', async () => {
            try {
                await logoutUser();
                profileModal.style.display = 'none';
            } catch (error) {
                showPopup("Erro ao fazer logout: " + error.message, 'error');
            }
        });
    }
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            if (newPassword.length < 6) {
                return showPopup("A nova senha deve ter pelo menos 6 caracteres.", 'error');
            }
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

    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            try {
                await loginUser(email, password);
            } catch (error) {
                showPopup("Erro no login: " + error.message, 'error');
            }
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userDetails = {
                username: document.getElementById('registerUsername').value.toLowerCase(),
                fullName: document.getElementById('registerFullName').value,
                email: document.getElementById('registerEmail').value,
                password: document.getElementById('registerPassword').value,
            };
            if (!userDetails.username || !userDetails.fullName) {
                return showPopup("Todos os campos são obrigatórios.", 'error');
            }
            try {
                await createUserAccount(userDetails);
                showPopup("Registro bem-sucedido! Logando...", 'success');
            } catch (error) {
                let friendlyMessage = "Ocorreu um erro desconhecido.";
                if (error.code === 'auth/email-already-in-use') friendlyMessage = "Este e-mail já está cadastrado. Tente fazer o login.";
                else if (error.code === 'auth/weak-password') friendlyMessage = "A senha é muito fraca. Use pelo menos 6 caracteres.";
                else if (error.code === 'auth/invalid-email') friendlyMessage = "O formato do e-mail é inválido.";
                else if (error.message === 'Nome de usuário já está em uso') friendlyMessage = "Este nome de usuário já está em uso. Escolha outro.";
                else if (error.message === 'Erro ao verificar disponibilidade do nome de usuário') friendlyMessage = "Não foi possível verificar o nome de usuário. Tente novamente.";
                else if (error.message.includes('PERMISSION_DENIED')) friendlyMessage = "Erro ao registrar: permissão negada. O nome de usuário pode estar em uso ou o acesso foi bloqueado. Tente outro nome.";
                showPopup("Erro no registro: " + friendlyMessage, 'error');
                console.error("Erro no registro:", error);
            }
        });
    }

    document.querySelectorAll('.sidebar-button[data-section]').forEach(button => {
        button.addEventListener('click', () => {
            showSection(button.dataset.section);
        });
    });
    const showRegisterBtn = document.getElementById('show-register');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        });
    }
    const showLoginBtn = document.getElementById('show-login');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }

    document.addEventListener('click', (e) => {
        if (profileModal && atendenteToggleBtn && !atendenteToggleBtn.contains(e.target) && !profileModal.contains(e.target)) {
            profileModal.style.display = 'none';
        }
    });
});