// CORREÇÃO: Removido "-compat" dos links para usar a versão modular correta.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// --- ATENÇÃO: RISCO DE SEGURANÇA ---
// Manter as chaves de API no código do cliente é arriscado.
// Para um ambiente de produção, é crucial proteger seus dados com as Regras de Segurança do Firebase.
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

export async function initializeFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        auth = getAuth(app);
        await signInAnonymously(auth);
        console.log("✅ Firebase conectado e autenticado.");
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
        alert("Erro fatal ao conectar com o banco de dados.");
    }
}

export async function loadDataForAttendant(attendant) {
    if (!attendant || !auth.currentUser) return null;
    const dbRef = ref(db, `respostas/${attendant}`);
    const snapshot = await get(dbRef);
    // Retorna os dados ou um objeto vazio para evitar erros
    return snapshot.exists() ? snapshot.val() : { suporte: {}, financeiro: {}, geral: {} };
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