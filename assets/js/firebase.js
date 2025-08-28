import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    updatePassword 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyB5wO0x-7NFmh6waMKzWzRew4ezfYOmYBI",
    authDomain: "site-ati-75d83.firebaseapp.com",
    databaseURL: "https://site-ati-75d83-default-rtdb.firebaseio.com/",
    projectId: "site-ati-75d83",
    storageBucket: "site-ati-75d83.appspot.com",
    messagingSenderId: "467986581951",
    appId: "1:467986581951:web:046a778a0c9b6967d5790a",
    measurementId: "G-22D5RNGGK6"
};

export let db;
let auth;

export function initializeFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        auth = getAuth(app);
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
    }
}

function capitalizeFullName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
}

export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const checkAuthState = (callback) => onAuthStateChanged(auth, callback);
export const updateUserPassword = (newPassword) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    return updatePassword(auth.currentUser, newPassword);
};

export async function loginWithUsername(username, password) {
    const sanitizedUsername = username.trim().toLowerCase();
    const userRef = ref(db, `atendentes/${sanitizedUsername}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists() || !snapshot.val().email) {
        const error = new Error("Credenciais inválidas.");
        error.code = 'auth/invalid-login-credentials';
        throw error;
    }

    const email = snapshot.val().email;
    return signInWithEmailAndPassword(auth, email, password);
}

export async function createUserAccount(details) {
    const { email, password, username, fullName } = details;
    const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
    if (/[.$#[\]/]/.test(sanitizedUsername)) {
        throw new Error('Nome de usuário inválido.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const formattedFullName = capitalizeFullName(fullName);

    await updateProfile(user, { displayName: formattedFullName });

    const newAtendenteData = {
        nomeCompleto: formattedFullName,
        role: "usuario",
        status: "ativo",
        uid: user.uid,
        email: email
    };

    try {
        const atendenteRef = ref(db, `atendentes/${sanitizedUsername}`);
        await set(atendenteRef, newAtendenteData);
        // Retorna tudo que o app.js precisa para iniciar o app imediatamente
        return { userCredential, sanitizedUsername, newAtendenteData };
    } catch (error) {
        await user.delete();
        console.error("Erro ao gravar no banco de dados, usuário de autenticação foi revertido:", error);
        throw new Error('Este nome de usuário já pode estar em uso ou ocorreu um erro de permissão.');
    }
}

export async function loadAtendentes() {
    const dbRef = ref(db, 'atendentes');
    const snapshot = await get(dbRef);
    return snapshot.exists() ? snapshot.val() : {};
}

export async function loadDataForAttendant(attendant) {
    if (!attendant || !auth.currentUser) return [];
    const dbRef = ref(db, `respostas/${attendant}`);
    const snapshot = await get(dbRef);
    // Lógica simplificada: Apenas lê. Se não existir, retorna vazio.
    return snapshot.exists() ? snapshot.val() : [];
}

export async function saveDataForAttendant(attendant, data) {
    if (!attendant || !auth.currentUser) {
        console.error("Tentativa de salvar dados sem um atendente definido.");
        return;
    }
    const dbRef = ref(db, `respostas/${attendant}`);
    await set(dbRef, data);
}

export async function updateUserFullName(username, newFullName) {
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    const formattedName = capitalizeFullName(newFullName);
    const dbRef = ref(db, `atendentes/${username}/nomeCompleto`);
    await set(dbRef, formattedName);
    await updateProfile(auth.currentUser, { displayName: formattedName });
}

async function updateUserData(username, field, value) {
    if (!auth.currentUser) throw new Error("Ação não permitida.");
    const userFieldRef = ref(db, `atendentes/${username}/${field}`);
    return set(userFieldRef, value);
}

export const updateUserRole = (username, newRole) => updateUserData(username, 'role', newRole);
export const updateUserStatus = (username, newStatus) => updateUserData(username, 'status', newStatus);
