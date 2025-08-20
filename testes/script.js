import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getDatabase, ref, set, onValue } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';

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
    const darkModeToggle = document.getElementById("darkModeToggle");
    let originalCustomization = {};

    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getDatabase(app);
        signInAnonymously(auth).then(() => {
            console.log("✅ Usuário autenticado anonimamente:", auth.currentUser.uid);
            if (atendenteSelect && atendenteAtual) {
                atendenteSelect.value = atendenteAtual;
                updateAtendenteToggleText();
                window.carregarDoFirebase();
            }
            loadCustomization();
        }).catch(error => {
            console.error("❌ Erro ao autenticar anonimamente:", error);
            alert("Erro de autenticação: " + error.message);
        });
        console.log("✅ Firebase inicializado com sucesso");
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
        alert("Erro ao conectar com o banco de dados: " + error.message);
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
        if (atendenteAtual && auth.currentUser) {
            window.carregarDoFirebase();
        } else {
            document.getElementById("opcoes").innerHTML = '<option value="">Selecione um atendente primeiro</option>';
            document.getElementById("resposta").value = "";
            document.getElementById("titulo").value = "";
            window.ajustarAlturaTextarea();
        }
        closeAtendentePopup();
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
            alert("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const dbRef = ref(db, `respostas/${atendenteAtual}`);
        set(dbRef, respostas)
            .then(() => console.log(`🔥 Dados salvos no Firebase para ${atendenteAtual}`))
            .catch(error => {
                console.error("❌ Erro ao salvar no Firebase:", error);
                alert("Erro ao salvar: " + error.message);
            });
    };

    window.carregarDoFirebase = function() {
        if (!atendenteAtual || !auth.currentUser) {
            console.log("⚠️ Selecione um atendente e autentique-se primeiro");
            return;
        }
        const dbRef = ref(db, `respostas/${atendenteAtual}`);
        onValue(dbRef, (snapshot) => {
            try {
                const data = snapshot.val();
                respostas = data || { suporte: {}, financeiro: {}, geral: {} };
                console.log("📥 Dados carregados do Firebase para " + atendenteAtual + ":", respostas);
                window.atualizarSeletorOpcoes();
            } catch (error) {
                console.error("❌ Erro ao carregar dados do Firebase:", error);
                alert("Erro ao carregar dados: " + error.message);
            }
        }, (error) => {
            console.error("❌ Erro na conexão com Firebase:", error);
            alert("Erro de conexão com o Firebase: " + error.message);
        });
    };

    window.atualizarSeletorOpcoes = function() {
        const seletor = document.getElementById("opcoes");
        if (!seletor) {
            console.error("❌ Elemento 'opcoes' não encontrado");
            alert("Erro: elemento de opções não encontrado.");
            return;
        }
        seletor.innerHTML = atendenteAtual ? '<option value="">Selecione uma opção</option>' : '<option value="">Selecione um atendente primeiro</option>';
        if (!atendenteAtual) return;
        Object.keys(respostas).sort().forEach(categoria => {
            const optgroup = document.createElement("optgroup");
            optgroup.label = categoria.charAt(0).toUpperCase() + categoria.slice(1);
            Object.keys(respostas[categoria]).sort().forEach(chave => {
                const opt = document.createElement("option");
                opt.value = `${categoria}:${chave}`;
                opt.innerText = chave.replace(/_/g, " ").toUpperCase();
                optgroup.appendChild(opt);
            });
            if (optgroup.children.length > 0) {
                seletor.appendChild(optgroup);
            }
        });
        window.responder();
    };

    window.responder = function() {
        const opcao = document.getElementById("opcoes").value;
        const resposta = document.getElementById("resposta");
        const titulo = document.getElementById("titulo");
        if (!opcao || !atendenteAtual) {
            if (!resposta.value && atendenteAtual) {
                resposta.value = "Selecione uma opção para receber uma resposta automática.";
            } else if (!atendenteAtual) {
                resposta.value = "Selecione um atendente primeiro.";
            }
            titulo.value = "";
            window.ajustarAlturaTextarea();
            return;
        }
        const [categoria, chave] = opcao.split(":");
        resposta.value = window.substituirMarcadores(respostas[categoria]?.[chave] || "Resposta não encontrada.");
        titulo.value = chave.replace(/_/g, " ");
        window.ajustarAlturaTextarea();
    };

    window.salvarEdicao = function() {
        if (!atendenteAtual || !auth.currentUser) {
            alert("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const opcao = document.getElementById("opcoes").value;
        if (!opcao) {
            alert("Selecione uma opção primeiro!");
            return;
        }
        const [categoria, chave] = opcao.split(":");
        const texto = document.getElementById("resposta").value.trim();
        respostas[categoria][chave] = texto;
        window.salvarNoFirebase();
        alert("Resposta salva com sucesso!");
    };

    window.copiarTexto = function() {
        const texto = document.getElementById("resposta");
        if (!texto) {
            console.error("❌ Elemento 'resposta' não encontrado");
            alert("Erro: campo de texto não encontrado.");
            return;
        }
        navigator.clipboard.writeText(texto.value).then(() => {
            showPopup('Texto copiado!');
        }).catch(error => {
            console.error("❌ Erro ao copiar texto:", error);
            alert("Erro ao copiar a mensagem.");
        });
    };

    window.apagarTexto = function() {
        if (!atendenteAtual || !auth.currentUser) {
            alert("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const opcao = document.getElementById("opcoes").value;
        if (!opcao || !confirm("Tem certeza que deseja apagar?")) return;
        const [categoria, chave] = opcao.split(":");
        delete respostas[categoria][chave];
        if (Object.keys(respostas[categoria]).length === 0) {
            delete respostas[categoria];
        }
        window.salvarNoFirebase();
        window.atualizarSeletorOpcoes();
        document.getElementById("resposta").value = "";
        document.getElementById("titulo").value = "";
        alert("Resposta apagada com sucesso!");
    };

    window.mostrarPopupAdicionar = function() {
        if (!atendenteAtual || !auth.currentUser) {
            alert("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const novoTitulo = prompt("Digite o título da nova resposta:");
        if (!novoTitulo) {
            console.log("⚠️ Adição cancelada: título vazio");
            return;
        }
        const validacao = window.validarChave(novoTitulo);
        if (!validacao.valido) {
            alert(validacao.mensagem);
            console.error("❌ Validação do título falhou:", validacao.mensagem);
            return;
        }
        const chave = validacao.chaveSanitizada;
        const categoriaPrompt = prompt("Digite a categoria (ex.: suporte, financeiro, geral):", "geral");
        if (!categoriaPrompt) {
            console.log("⚠️ Adição cancelada: categoria vazia");
            return;
        }
        const validacaoCategoria = window.validarChave(categoriaPrompt);
        if (!validacaoCategoria.valido) {
            alert(validacaoCategoria.mensagem);
            console.error("❌ Validação da categoria falhou:", validacaoCategoria.mensagem);
            return;
        }
        const categoria = validacaoCategoria.chaveSanitizada;
        if (!respostas[categoria]) {
            respostas[categoria] = {};
        }
        respostas[categoria][chave] = "";
        document.getElementById("opcoes").value = `${categoria}:${chave}`;
        document.getElementById("resposta").value = "";
        document.getElementById("titulo").value = chave.replace(/_/g, " ");
        window.atualizarSeletorOpcoes();
        window.ajustarAlturaTextarea();
    };

    window.editarTitulo = function() {
        const titleContainer = document.getElementById("titleContainer");
        const opcao = document.getElementById("opcoes").value;
        if (!opcao) {
            alert("Selecione uma opção primeiro!");
            console.warn("⚠️ Nenhuma opção selecionada para edição de título");
            return;
        }
        const [categoria, chave] = opcao.split(":");
        if (!respostas[categoria]?.[chave]) {
            alert("Erro: resposta não encontrada!");
            console.error(`❌ Resposta não encontrada: ${categoria}:${chave}`);
            return;
        }
        titleContainer.style.display = titleContainer.style.display === "flex" ? "none" : "flex";
        if (titleContainer.style.display === "flex") {
            document.getElementById("titulo").value = chave.replace(/_/g, " ");
            console.log(`📝 Abrindo edição de título para ${categoria}:${chave}`);
        }
    };

    window.salvarNovoTitulo = function() {
        if (!atendenteAtual || !auth.currentUser) {
            alert("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const opcaoAntiga = document.getElementById("opcoes").value;
        if (!opcaoAntiga) {
            alert("Selecione uma opção primeiro!");
            console.warn("⚠️ Nenhuma opção selecionada para salvar título");
            return;
        }
        const novoTitulo = document.getElementById("titulo").value.trim();
        const validacao = window.validarChave(novoTitulo);
        if (!validacao.valido) {
            alert(validacao.mensagem);
            console.error("❌ Validação do novo título falhou:", validacao.mensagem);
            return;
        }
        const novoChave = validacao.chaveSanitizada;
        const [categoria, oldChave] = opcaoAntiga.split(":");
        if (!respostas[categoria]?.[oldChave]) {
            alert("Erro: resposta não encontrada!");
            console.error(`❌ Resposta não encontrada: ${categoria}:${oldChave}`);
            return;
        }
        if (novoChave === oldChave) {
            console.log("⚠️ Mesmo título, nenhuma alteração feita");
            document.getElementById("titleContainer").style.display = "none";
            return;
        }
        if (respostas[categoria][novoChave]) {
            alert("Este título já existe nesta categoria!");
            console.warn(`⚠️ Título duplicado: ${novoChave} em ${categoria}`);
            return;
        }
        respostas[categoria][novoChave] = respostas[categoria][oldChave];
        delete respostas[categoria][oldChave];
        console.log(`🔄 Renomeando ${categoria}:${oldChave} para ${categoria}:${novoChave}`);
        window.salvarNoFirebase();
        window.atualizarSeletorOpcoes();
        document.getElementById("opcoes").value = `${categoria}:${novoChave}`;
        window.responder();
        document.getElementById("titleContainer").style.display = "none";
        alert("Título alterado com sucesso!");
    };

    window.ajustarAlturaTextarea = function() {
        const textarea = document.getElementById("resposta");
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    window.substituirMarcadores = function(texto) {
        const hora = new Date().getHours();
        const saudacao = hora >= 5 && hora < 12 ? "bom dia" :
                         hora >= 12 && hora < 18 ? "boa tarde" : 
                         "boa noite";
        const despedida = hora >= 5 && hora < 12 ? "tenha uma excelente manhã" :
                         hora >= 12 && hora < 18 ? "tenha uma excelente tarde" : 
                         "tenha uma excelente noite";
        return texto.replace(/\[saudacao\]/gi, saudacao).replace(/\[despedida\]/gi, despedida);
    };

    window.atualizarSaudacao = function() {
        const saudacaoElements = document.querySelectorAll("#saudacao");
        const saudacaoSpan = document.getElementById("saudacaoSpan");
        const despedidaSpan = document.getElementById("despedidaSpan");
        const saudacaoDespedidaText = document.getElementById("saudacaoDespedidaText");
        const hora = new Date().getHours();
        const saudacaoText = hora >= 5 && hora < 12 ? "bom dia" :
                             hora >= 12 && hora < 18 ? "boa tarde" : 
                             "boa noite";
        const despedidaText = hora >= 5 && hora < 12 ? "tenha uma excelente manhã" :
                              hora >= 12 && hora < 18 ? "tenha uma excelente tarde" : 
                              "tenha uma excelente noite";
        saudacaoElements.forEach(element => {
            element.textContent = saudacaoText;
        });
        if (saudacaoSpan) {
            saudacaoSpan.textContent = saudacaoText;
        }
        if (despedidaSpan) {
            despedidaSpan.textContent = despedidaText;
        }
        if (saudacaoDespedidaText) {
            saudacaoDespedidaText.textContent = saudacaoText;
        }
    };

    window.loadCustomization = function() {
        const themeToggle = document.getElementById("themeToggle");
        const neonBorders = document.getElementById("neonBorders");
        const iconColor = document.getElementById("iconColor");
        const borderColor = document.getElementById("borderColor");

        const savedTheme = localStorage.getItem("darkMode") === "true" ? "dark" : "light";
        const savedNeon = localStorage.getItem("neonBorders") === "true";
        const savedIconColor = localStorage.getItem("iconColor") || "#002640";
        const savedBorderColor = localStorage.getItem("borderColor") || "#002640";

        if (themeToggle) themeToggle.checked = savedTheme === "dark";
        if (neonBorders) neonBorders.checked = savedNeon;
        if (iconColor) iconColor.value = savedIconColor;
        if (borderColor) borderColor.value = savedBorderColor;

        applyCustomization(savedTheme, savedNeon, savedIconColor, savedBorderColor);
    };

    window.applyCustomization = function(theme, neon, iconColor, borderColor) {
        document.body.classList.remove("light-mode", "dark-mode", "no-neon");
        document.body.classList.add(theme === "dark" ? "dark-mode" : "light-mode");
        if (!neon) {
            document.body.classList.add("no-neon");
        }

        const style = document.createElement("style");
        style.id = "custom-styles";
        const isLight = getLuminance(iconColor) > 0.5;
        const outlineColor = isLight ? "#000000" : "#FFFFFF";
        const sidebarBorderColor = lightenColor(borderColor, 20);

        style.textContent = `
            .sidebar-button, .toggle-sidebar, .bottom-toggle, .dark-mode-toggle {
                color: ${iconColor} !important;
            }
            .dark-mode .sidebar-button, .dark-mode .toggle-sidebar, .dark-mode .bottom-toggle, .dark-mode .dark-mode-toggle {
                color: ${iconColor} !important;
            }
            .sidebar-button:hover, .bottom-toggle:hover, .dark-mode-toggle:hover {
                color: ${lightenColor(iconColor, 20)} !important;
            }
            .dark-mode .sidebar-button:hover, .dark-mode .bottom-toggle:hover, .dark-mode .dark-mode-toggle:hover {
                color: ${lightenColor(iconColor, 20)} !important;
            }
            .sidebar-button.active {
                background: ${iconColor} !important;
                color: ${outlineColor} !important;
            }
            .dark-mode .sidebar-button.active {
                background: ${iconColor} !important;
                color: ${outlineColor} !important;
            }
            .sidebar {
                border-right: 1px solid ${sidebarBorderColor} !important;
            }
            .dark-mode .sidebar {
                border-right: 1px solid ${sidebarBorderColor} !important;
            }
            .card, .upload-card, .popup, .customization-popup, .output {
                border: 1px solid ${borderColor} !important;
            }
            .dark-mode .card, .dark-mode .upload-card, .dark-mode .popup, .dark-mode .customization-popup, .dark-mode .output {
                border: 1px solid ${borderColor} !important;
            }
            input, select, textarea {
                border: 1px solid ${borderColor} !important;
            }
            .dark-mode input, .dark-mode select, .dark-mode textarea {
                border: 1px solid ${borderColor} !important;
            }
            .button, .copy-btn, .file-label {
                background: ${borderColor} !important;
                box-shadow: ${neon ? `0 0 10px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .dark-mode .button, .dark-mode .copy-btn, .dark-mode .file-label {
                background: ${borderColor} !important;
                box-shadow: ${neon ? `0 0 10px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .button:hover, .copy-btn:hover, .file-label:hover {
                background: ${lightenColor(borderColor, 20)} !important;
                box-shadow: ${neon ? `0 0 15px ${hexToRgba(borderColor, 0.7)}` : "none"} !important;
            }
            .dark-mode .button:hover, .dark-mode .copy-btn:hover, .dark-mode .file-label:hover {
                background: ${lightenColor(borderColor, 20)} !important;
                box-shadow: ${neon ? `0 0 15px ${hexToRgba(borderColor, 0.7)}` : "none"} !important;
            }
            .card, .upload-card {
                box-shadow: ${neon ? `0 0 15px ${hexToRgba(borderColor, 0.3)}` : "none"} !important;
            }
            .dark-mode .card, .dark-mode .upload-card {
                box-shadow: ${neon ? `0 0 15px ${hexToRgba(borderColor, 0.3)}` : "none"} !important;
            }
            input:focus, select:focus, textarea:focus {
                box-shadow: ${neon ? `0 0 10px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .dark-mode input:focus, .dark-mode select:focus, .dark-mode textarea:focus {
                box-shadow: ${neon ? `0 0 10px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .customization-popup, .popup, #atendentePopup {
                box-shadow: ${neon ? `0 0 15px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .dark-mode .customization-popup, .dark-mode .popup, .dark-mode #atendentePopup {
                box-shadow: ${neon ? `0 0 15px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            h1, h2, h3 {
                color: ${iconColor} !important;
            }
            .dark-mode h1, .dark-mode h2, .dark-mode h3 {
                color: ${iconColor} !important;
            }
        `;
        const existingStyle = document.getElementById("custom-styles");
        if (existingStyle) existingStyle.remove();
        document.head.appendChild(style);
    };

    function lightenColor(hex, percent) {
        hex = hex.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const increase = percent / 100;
        return `#${Math.min(255, Math.round(r + (255 - r) * increase)).toString(16).padStart(2, "0")}${Math.min(255, Math.round(g + (255 - g) * increase)).toString(16).padStart(2, "0")}${Math.min(255, Math.round(b + (255 - b) * increase)).toString(16).padStart(2, "0")}`;
    }

    function hexToRgba(hex, alpha) {
        hex = hex.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function getLuminance(hex) {
        hex = hex.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }

    window.openCustomizationPopup = function() {
        originalCustomization = {
            theme: localStorage.getItem("darkMode") === "true" ? "dark" : "light",
            neonBorders: localStorage.getItem("neonBorders") === "true",
            iconColor: localStorage.getItem("iconColor") || "#002640",
            borderColor: localStorage.getItem("borderColor") || "#002640"
        };
        document.getElementById("customizationPopup").style.display = "block";

        const themeToggle = document.getElementById("themeToggle");
        const neonBorders = document.getElementById("neonBorders");
        const iconColor = document.getElementById("iconColor");
        const borderColor = document.getElementById("borderColor");

        themeToggle.checked = originalCustomization.theme === "dark";
        neonBorders.checked = originalCustomization.neonBorders;
        iconColor.value = originalCustomization.iconColor;
        borderColor.value = originalCustomization.borderColor;

        themeToggle.removeEventListener("change", applyInRealTime);
        neonBorders.removeEventListener("change", applyInRealTime);
        iconColor.removeEventListener("input", applyInRealTime);
        borderColor.removeEventListener("input", applyInRealTime);

        themeToggle.addEventListener("change", applyInRealTime);
        neonBorders.addEventListener("change", applyInRealTime);
        iconColor.addEventListener("input", applyInRealTime);
        borderColor.addEventListener("input", applyInRealTime);

        function applyInRealTime() {
            window.applyCustomization(
                themeToggle.checked ? "dark" : "light",
                neonBorders.checked,
                iconColor.value,
                borderColor.value
            );
        }
    };

    window.saveCustomization = function() {
        const themeToggle = document.getElementById("themeToggle");
        const neonBorders = document.getElementById("neonBorders");
        const iconColor = document.getElementById("iconColor");
        const borderColor = document.getElementById("borderColor");

        localStorage.setItem("darkMode", themeToggle.checked);
        localStorage.setItem("neonBorders", neonBorders.checked);
        localStorage.setItem("iconColor", iconColor.value);
        localStorage.setItem("borderColor", borderColor.value);

        window.applyCustomization(
            themeToggle.checked ? "dark" : "light",
            neonBorders.checked,
            iconColor.value,
            borderColor.value
        );

        document.getElementById("customizationPopup").style.display = "none";
        window.showPopup("Personalização salva com sucesso!");
    };

    window.closeCustomizationPopup = function() {
        document.getElementById("customizationPopup").style.display = "none";
        window.applyCustomization(
            originalCustomization.theme,
            originalCustomization.neonBorders,
            originalCustomization.iconColor,
            originalCustomization.borderColor
        );

        const themeToggle = document.getElementById("themeToggle");
        const neonBorders = document.getElementById("neonBorders");
        const iconColor = document.getElementById("iconColor");
        const borderColor = document.getElementById("borderColor");

        themeToggle.checked = originalCustomization.theme === "dark";
        neonBorders.checked = originalCustomization.neonBorders;
        iconColor.value = originalCustomization.iconColor;
        borderColor.value = originalCustomization.borderColor;
    };

    window.openAtendentePopup = function() {
        document.getElementById("atendentePopup").style.display = "block";
    };

    window.closeAtendentePopup = function() {
        document.getElementById("atendentePopup").style.display = "none";
    };

    window.showPopup = function(message) {
        const popup = document.getElementById("popup");
        if (popup) {
            popup.innerText = message;
            popup.classList.add("show");
            setTimeout(() => {
                popup.classList.remove("show");
            }, 1500);
        }
    };

    if (darkModeToggle) {
        darkModeToggle.addEventListener("click", () => {
            window.openCustomizationPopup();
        });
    }

    window.atualizarSaudacao();
    setInterval(window.atualizarSaudacao, 600000);
});