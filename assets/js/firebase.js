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

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: fullName });

    const newAtendenteData = {
        nomeCompleto: fullName,
        role: "usuario",
        uid: user.uid
    };
    console.log("DEBUG: Objeto sendo enviado para o Firebase:", newAtendenteData);
    const atendenteRef = ref(db, `atendentes/${username}`);
    const respostaRef = ref(db, `respostas/${username}`);

    await set(atendenteRef, newAtendenteData);
    await set(respostaRef, []); 

    return userCredential;
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