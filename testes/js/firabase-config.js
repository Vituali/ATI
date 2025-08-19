// js/firebase.js

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

let db, auth;

try {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database(app);
    auth = firebase.auth(app);
    
    firebase.auth().signInAnonymously().then(() => {
        console.log("✅ Usuário autenticado anonimamente:", auth.currentUser.uid);
    }).catch(error => {
        console.error("❌ Erro ao autenticar anonimamente:", error);
        alert("Erro de autenticação: " + error.message);
    });
    console.log("✅ Firebase inicializado com sucesso");
} catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
    alert("Erro ao conectar com o banco de dados. Algumas funcionalidades podem estar indisponíveis.");
}

// Exporta as instâncias para que outros módulos possam usá-las
export { db, auth };