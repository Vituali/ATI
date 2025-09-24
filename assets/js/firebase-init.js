import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    updatePassword 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyB5wO0x-7NFmh6waMKzWzRew4ezfYOmYBI",
    authDomain: "site-ati-75d83.firebaseapp.com",
    databaseURL: "https://site-ati-75d83-default-rtdb.firebaseio.com/",
    projectId: "site-ati-75d83",
    storageBucket: "site-ati-75d83.appspot.com",
    messagingSenderId: "467986581951",
    appId: "1:467986581951:web:046a778a0c9b6967d5790a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// --- FUNÇÕES DE AUTENTICAÇÃO EXPORTADAS ---
export { db, auth };

export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const checkAuthState = (callback) => onAuthStateChanged(auth, callback);
export const updateUserPassword = (newPassword) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    return updatePassword(auth.currentUser, newPassword);
};

