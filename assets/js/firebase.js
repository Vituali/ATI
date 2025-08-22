import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
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

let db;
let auth;

export function initializeFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        auth = getAuth(app);
        console.log("✅ Módulos do Firebase inicializados.");
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
        alert("Erro fatal ao conectar com o banco de dados.");
    }
}

// --- Funções de Autenticação ---
export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const checkAuthState = (callback) => onAuthStateChanged(auth, callback);
export const updateUserPassword = (newPassword) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    return updatePassword(auth.currentUser, newPassword);
};

/**
 * Registra um novo usuário na autenticação e cria suas entradas no Realtime Database.
 * @param {object} details - Contém email, password, username (chave) e fullName.
 * @returns {Promise<UserCredential>}
 */
export async function createUserAccount(details) {
    const { email, password, username, fullName } = details;

    // 1. Sanitiza o nome de usuário
    const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
    if (/[.$#[\]/]/.test(sanitizedUsername)) {
        throw new Error('Nome de usuário inválido: não pode conter ., $, #, [, ], ou /');
    }

    // 2. Cria o usuário na Autenticação primeiro
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 3. Força a atualização do token para evitar problemas de timing
    await user.getIdToken(true);
    await updateProfile(user, { displayName: fullName });

    // 4. Prepara os dados para salvar no banco de dados
    const newAtendenteData = {
        nomeCompleto: fullName,
        role: "usuario",
        uid: user.uid
    };

    // 5. Tenta escrever no banco de dados
    try {
        const atendenteRef = ref(db, `atendentes/${sanitizedUsername}`);
        const respostaRef = ref(db, `respostas/${sanitizedUsername}`);
        
        // A regra do Firebase ".write": "!data.exists()" vai impedir a criação se o username já existir.
        await set(atendenteRef, newAtendenteData);
        await set(respostaRef, []);

        return userCredential;

    } catch (error) {
        // Se a escrita falhar (seja por permissão ou outro motivo),
        // deletamos o usuário recém-criado para não deixar contas órfãs.
        await user.delete();
        console.error("Erro ao gravar no banco de dados, usuário de autenticação foi revertido:", error);
        // Lança um erro mais amigável
        throw new Error('Este nome de usuário já pode estar em uso ou ocorreu um erro de permissão.');
    }
}


// --- Funções de Dados ---

export async function loadAtendentes() {
    
    const dbRef = ref(db, 'atendentes');
    const snapshot = await get(dbRef);
    
    return snapshot.exists() ? snapshot.val() : {};
}

export async function loadDataForAttendant(attendant) {
    if (!attendant || !auth.currentUser) return []; // Retorna array vazio para evitar erros
    const dbRef = ref(db, `respostas/${attendant}`);
    const snapshot = await get(dbRef);
    return snapshot.exists() ? snapshot.val() : [];
}

export async function saveDataForAttendant(attendant, data) {
    if (!attendant || !auth.currentUser) {
        alert("Selecione um atendente para salvar.");
        return;
    }
    const dbRef = ref(db, `respostas/${attendant}`);
    await set(dbRef, data);
    console.log(`🔥 Dados salvos para ${attendant}`);
}