import { initializeUI, showSection, updateGreeting, showPopup } from './ui.js';
import { 
    db, 
    auth,
    loginUser,
    logoutUser,
    checkAuthState,
    updateUserPassword
} from './firebase-init.js';
import { 
    getAllAtendentes, 
    getAtendenteByUsername, 
    getQuickReplies,
} from './firebase-service.js';
import { initializeTheme } from './theme.js';
import { initializeChat } from './chat.js';
import { initializeOsEditor } from './os-editor.js';
import { initializeConversor } from './conversor.js';
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { set, ref } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

async function loginWithUsername(username, password) {
    const attendantData = await getAtendenteByUsername(username.trim().toLowerCase());
    if (!attendantData || !attendantData.email) {
        throw new Error("Credenciais inválidas.");
    }
    return loginUser(attendantData.email, password);
}

async function createUserAccount(details) {
     const { email, password, username, fullName } = details;
    const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
    if (/[.$#[\]/]/.test(sanitizedUsername)) {
        throw new Error('Nome de usuário inválido.');
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: fullName });
    const newAtendenteData = {
        nomeCompleto: fullName, role: "usuario", status: "ativo", uid: user.uid, email: email
    };
    await set(ref(db, `atendentes/${sanitizedUsername}`), newAtendenteData);
}

async function updateUserFullName(username, newFullName) {
     if (!auth.currentUser) throw new Error("Usuário não autenticado.");
     await set(ref(db, `atendentes/${username}/nomeCompleto`), newFullName);
     await updateProfile(auth.currentUser, { displayName: newFullName });
}

function loadGoogleMapsScript() {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyB5wO0x-7NFmh6waMKzWzRew4ezfYOmYBI&libraries=places,routes&callback=initMap';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', async () => {
    
    initializeUI();
    initializeTheme();
    initializeOsEditor();
    initializeConversor();
    const chatModule = initializeChat();

    let currentUsername = null;

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

    const startApp = async (user, allAtendentes) => {
        const attendantKey = Object.keys(allAtendentes).find(key => allAtendentes[key].uid === user.uid);
        if (!attendantKey) {
            showPopup("Não foi possível carregar os dados do seu perfil.", 'error');
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

        authOverlay.style.display = 'none';
        mainContent.style.display = 'flex';
        sidebar.style.display = 'flex';
        localStorage.setItem("atendenteAtual", attendantKey);
        
        window.dispatchEvent(new CustomEvent('atendenteAtualChanged', { detail: { newUser: attendantKey } }));
        
        if (profileUsernameSpan) profileUsernameSpan.textContent = attendantKey;
        if (newFullNameInput) newFullNameInput.value = attendantData.nomeCompleto;
        if (adminLinkContainer) adminLinkContainer.style.display = attendantData.role === 'admin' ? 'block' : 'none';

        chatLoader.style.display = 'flex';
        try {
            const chatData = await getQuickReplies(attendantKey);
            chatModule.setResponses(chatData);
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
        localStorage.removeItem("atendenteAtual");
        window.dispatchEvent(new CustomEvent('atendenteAtualChanged', { detail: { newUser: null } }));
    };

    checkAuthState(async (user) => {
        if (user) {
            try {
                const allAtendentes = await getAllAtendentes();
                await startApp(user, allAtendentes);
            } catch (error) {
                console.error("Erro ao carregar atendentes ou iniciar o app:", error);
                showLoginScreen();
            }
        } else {
            showLoginScreen();
        }
    });

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

    loadGoogleMapsScript();
});

