// Módulo para interagir com o Firebase.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { showPopup } from './ui.js';

// --- ATENÇÃO: RISCO DE SEGURANÇA ---
// Manter as chaves de API no código do cliente é arriscado.
// Para um ambiente de produção, é crucial:
// 1. Usar as Regras de Segurança do Firebase para proteger seus dados.
// 2. Mover lógicas sensíveis para o backend (ex: Firebase Functions).
// 3. Configurar restrições de chave de API no console do Google Cloud.
const firebaseConfig = {
    apiKey: "AIzaSyB5wO0x-7NFmh6waMKzWzRew4ezfYOmYBI",
    authDomain: "site-ati-75d83.firebaseapp.com",
    databaseURL: "https://site-ati-75d83-default-rtdb.firebaseio.com",
    projectId: "site-ati-75d83",
    storageBucket: "site-ati-75d83.firebasestorage.app",
    messagingSenderId: "467986581951",
    appId: "1:467986581951:web:046a778a0c9b6967d5790a",
    measurementId: "G-22D5RNGGK6"
};

let db;
let auth;

export function initializeFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getDatabase(app);

        signInAnonymously(auth).catch(error => {
            console.error("Erro ao autenticar anonimamente:", error);
            showPopup("Erro de autenticação: " + error.message);
        });
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
        showPopup("Erro ao conectar com o banco de dados.");
    }
}

export async function saveDataForAttendant(attendant, data) {
    if (!attendant || !auth.currentUser) {
        showPopup("Selecione um atendente para salvar.");
        return false;
    }
    try {
        const dbRef = ref(db, `respostas/${attendant}`);
        await set(dbRef, data);
        return true;
    } catch (error) {
        console.error("Erro ao salvar no Firebase:", error);
        showPopup("Erro ao salvar: " + error.message);
        return false;
    }
}

export async function loadDataForAttendant(attendant) {
    if (!attendant || !auth.currentUser) {
        console.warn("Atendente não selecionado ou não autenticado.");
        return null;
    }
    try {
        const dbRef = ref(db, `respostas/${attendant}`);
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null; // Retorna nulo se não houver dados
    } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
        showPopup("Erro ao carregar dados: " + error.message);
        return null;
    }
}

export function validateKey(key) {
    if (!key || !key.trim()) {
        return { isValid: false, message: "A chave não pode estar em branco." };
    }
    const forbiddenChars = /[\\$#\\[\\]\\/\\.]/g;
    if (forbiddenChars.test(key)) {
        return { isValid: false, message: "A chave não pode conter $ # [ ] . ou /." };
    }
    const sanitizedKey = key.trim().toLowerCase().replace(/[\s/]/g, "_").replace(forbiddenChars, '');
    return { isValid: true, sanitizedKey };
}