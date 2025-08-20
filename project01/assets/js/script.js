import { getDatabase, ref, set, onValue } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

document.addEventListener("DOMContentLoaded", function () {
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
    let respostas = { suporte: {}, financeiro: {}, geral: {} };
    let atendenteAtual = localStorage.getItem("atendenteAtual") || "";
    const atendenteSelect = document.getElementById("atendente");
    const atendenteToggle = document.getElementById("atendenteToggle");

    try {
        const app = window.firebaseApp(firebaseConfig);
        auth = window.firebaseAuth(app);
        db = window.firebaseDatabase(app);
        if (!getDatabase) {
            console.error("❌ Módulo do Firebase Realtime Database não carregado");
            window.showPopup("Erro: Módulo do banco de dados Firebase não carregado.");
            return;
        }
        window.firebaseSignInAnonymously(auth).then(() => {
            console.log("✅ Usuário autenticado anonimamente:", auth.currentUser.uid);
            if (atendenteSelect && atendenteAtual) {
                atendenteSelect.value = atendenteAtual;
                updateAtendenteToggleText();
                window.carregarDoFirebase();
            }
        }).catch(error => {
            console.error("❌ Erro ao autenticar anonimamente:", error);
            window.showPopup("Erro de autenticação: " + error.message);
        });
        console.log("✅ Firebase inicializado com sucesso");
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
        window.showPopup("Erro ao conectar com o banco de dados: " + error.message);
        return;
    }

    function updateAtendenteToggleText() {
        if (atendenteToggle) {
            const textSpan = atendenteToggle.querySelector('.text');
            textSpan.textContent = atendenteAtual ? atendenteAtual.charAt(0).toUpperCase() + atendenteAtual.slice(1) : 'Selecionar Atendente';
        }
    }

    window.selecionarAtendente = function() {
        if (!atendenteSelect) return;
        atendenteAtual = atendenteSelect.value.toLowerCase();
        localStorage.setItem("atendenteAtual", atendenteAtual);
        updateAtendenteToggleText();
        window.closeAtendentePopup();
        if (atendenteAtual && auth.currentUser) {
            window.carregarDoFirebase();
        } else {
            document.getElementById("opcoes").innerHTML = '<option value="">Selecione um atendente primeiro</option>';
            document.getElementById("resposta").value = "";
            document.getElementById("titulo").value = "";
            window.ajustarAlturaTextarea();
        }
    };

    window.validarChave = function(chave) {
        if (!chave || !chave.trim()) {
            console.error("❌ Chave inválida: vazia ou nula");
            return { valido: false, mensagem: "A chave não pode estar em branco." };
        }
        const caracteresProibidos = new RegExp("[\\$#\\[\\]\\/\\.]", "g");
        if (caracteresProibidos.test(chave)) {
            console.warn(`⚠️ Chave contém caracteres proibidos: ${chave}`);
            return { valido: false, mensagem: "A chave não pode conter $ # [ ] . ou /." };
        }
        const chaveSanitizada = chave.trim().toLowerCase().replace(/[\$#\[\]\.\/]/g, "_");
        console.log(`✅ Chave válida: ${chave} -> ${chaveSanitizada}`);
        return { valido: true, chaveSanitizada };
    };

    window.salvarNoFirebase = function() {
        if (!atendenteAtual || !auth.currentUser) {
            window.showPopup("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const dbRef = ref(db, `respostas/${atendenteAtual}`);
        set(dbRef, respostas)
            .then(() => console.log(`🔥 Dados salvos no Firebase para ${atendenteAtual}`))
            .catch(error => {
                console.error("❌ Erro ao salvar no Firebase:", error);
                window.showPopup("Erro ao salvar: " + error.message);
            });
    };

    window.carregarDoFirebase = function() {
        if (!atendenteAtual || !auth.currentUser) {
            console.log("⚠️ Selecione um atendente e autentique-se primeiro");
            return;
        }
        const dbRef = ref(db, `respostas/${atendenteAtual}`);
        onValue(dbRef, function(snapshot) {
            try {
                const data = snapshot.val();
                respostas = data || { suporte: {}, financeiro: {}, geral: {} };
                console.log("📥 Dados carregados do Firebase para " + atendenteAtual + ":", respostas);
                window.atualizarSeletorOpcoes();
            } catch (error) {
                console.error("❌ Erro ao carregar dados do Firebase:", error);
                window.showPopup("Erro ao carregar dados: " + error.message);
            }
        }, function(error) {
            console.error("❌ Erro na conexão com Firebase:", error);
            window.showPopup("Erro de conexão com o Firebase: " + error.message);
        });
    };
});