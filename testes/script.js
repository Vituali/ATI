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
    let originalCustomization = {};

    try {
        const app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth(app);
        db = firebase.database(app);
        if (!firebase.database) {
            console.error("❌ Módulo do Firebase Realtime Database não carregado");
            alert("Erro: Módulo do banco de dados Firebase não carregado.");
            return;
        }
        auth.signInAnonymously().then(() => {
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
        const dbRef = db.ref(`respostas/${atendenteAtual}`);
        dbRef.set(respostas)
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
        const dbRef = db.ref(`respostas/${atendenteAtual}`);
        dbRef.on('value', function(snapshot) {
            try {
                const data = snapshot.val();
                respostas = data || { suporte: {}, financeiro: {}, geral: {} };
                console.log("📥 Dados carregados do Firebase para " + atendenteAtual + ":", respostas);
                window.atualizarSeletorOpcoes();
            } catch (error) {
                console.error("❌ Erro ao carregar dados do Firebase:", error);
                alert("Erro ao carregar dados: " + error.message);
            }
        }, function(error) {
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
        if (respostas[categoria][chave]) {
            alert("Esse título já existe nesta categoria!");
            console.warn(`⚠️ Título duplicado: ${chave} em ${categoria}`);
            return;
        }
        respostas[categoria][chave] = "Beleza! 🎉 Nova resposta adicionada! 🎉 Precisando de algo mais, estamos à disposição. [despedida]";
        console.log(`📝 Adicionando: ${categoria}:${chave}`);
        window.salvarNoFirebase();
        window.atualizarSeletorOpcoes();
        document.getElementById("opcoes").value = `${categoria}:${chave}`;
        window.responder();
        alert("Nova resposta adicionada com sucesso!");
    };

    window.alterarCategoria = function() {
        if (!atendenteAtual || !auth.currentUser) {
            alert("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const opcao = document.getElementById("opcoes").value;
        if (!opcao) {
            alert("Selecione uma resposta primeiro!");
            console.warn("⚠️ Nenhuma opção selecionada para alterar categoria");
            return;
        }
        const [oldCategoria, chave] = opcao.split(":");
        const novaCategoria = prompt("Digite a nova categoria (ex.: suporte, financeiro, geral):", oldCategoria);
        if (!novaCategoria) {
            console.log("⚠️ Alteração cancelada: categoria vazia");
            return;
        }
        const validacao = window.validarChave(novaCategoria);
        if (!validacao.valido) {
            alert(validacao.mensagem);
            console.error("❌ Validação da nova categoria falhou:", validacao.mensagem);
            return;
        }
        const novaCategoriaKey = validacao.chaveSanitizada;
        if (novaCategoriaKey === oldCategoria) {
            console.log("⚠️ Mesma categoria selecionada, nenhuma alteração feita");
            return;
        }
        if (!respostas[oldCategoria] || !respostas[oldCategoria][chave]) {
            alert("Erro: resposta não encontrada na categoria atual!");
            console.error(`❌ Resposta não encontrada: ${oldCategoria}:${chave}`);
            return;
        }
        if (respostas[novaCategoriaKey]?.[chave]) {
            alert("Este título já existe na categoria selecionada!");
            console.warn(`⚠️ Título duplicado: ${chave} em ${novaCategoriaKey}`);
            return;
        }
        if (!respostas[novaCategoriaKey]) {
            respostas[novaCategoriaKey] = {};
        }
        respostas[novaCategoriaKey][chave] = respostas[oldCategoria][chave];
        delete respostas[oldCategoria][chave];
        if (Object.keys(respostas[oldCategoria]).length === 0) {
            delete respostas[oldCategoria];
        }
        console.log(`🔄 Movendo ${chave} de ${oldCategoria} para ${novaCategoriaKey}`);
        window.salvarNoFirebase();
        window.atualizarSeletorOpcoes();
        document.getElementById("opcoes").value = `${novaCategoriaKey}:${chave}`;
        window.responder();
        alert("Categoria alterada com sucesso!");
    };

    window.toggleEditarTitulo = function() {
        if (!atendenteAtual || !auth.currentUser) {
            alert("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const titleContainer = document.getElementById("titleContainer");
        const opcao = document.getElementById("opcoes").value;
        if (!opcao) {
            alert("Selecione uma opção primeiro!");
            console.warn("⚠️ Nenhuma opção selecionada para editar título");
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
    };

    window.loadCustomization = function() {
        const themeToggle = document.getElementById("themeToggle");
        const neonBorders = document.getElementById("neonBorders");
        const iconColor = document.getElementById("iconColor");
        const borderColor = document.getElementById("borderColor");

        const savedTheme = localStorage.getItem("theme") || "light";
        const savedNeon = localStorage.getItem("neonBorders") === "true";
        const savedIconColor = localStorage.getItem("iconColor") || "#002640";
        const savedBorderColor = localStorage.getItem("borderColor") || "#002640";

        themeToggle.checked = savedTheme === "dark";
        neonBorders.checked = savedNeon;
        iconColor.value = savedIconColor;
        borderColor.value = savedBorderColor;

        applyCustomization(savedTheme, savedNeon, savedIconColor, savedBorderColor);
    };

    window.applyCustomization = function(theme, neon, iconColor, borderColor) {
        document.body.classList.remove("light-mode", "dark-mode", "no-neon");
        document.body.classList.add(theme === "dark" ? "dark-mode" : "light-mode");
        if (!neon) {
            document.body.classList.add("no-neon");
        }
        document.querySelectorAll(".sidebar-button .icon").forEach(icon => {
            icon.style.color = iconColor;
        });
        document.querySelectorAll(".card, .upload-card, input, select, textarea").forEach(el => {
            el.style.borderColor = borderColor;
        });
    };

    window.openCustomizationPopup = function() {
        originalCustomization = {
            theme: localStorage.getItem("theme") || "light",
            neonBorders: localStorage.getItem("neonBorders") === "true",
            iconColor: localStorage.getItem("iconColor") || "#002640",
            borderColor: localStorage.getItem("borderColor") || "#002640"
        };
        document.getElementById("customizationPopup").style.display = "block";

        const themeToggle = document.getElementById("themeToggle");
        const neonBorders = document.getElementById("neonBorders");
        const iconColor = document.getElementById("iconColor");
        const borderColor = document.getElementById("borderColor");

        themeToggle.addEventListener("change", () => {
            window.applyCustomization(themeToggle.checked ? "dark" : "light", neonBorders.checked, iconColor.value, borderColor.value);
        });
        neonBorders.addEventListener("change", () => {
            window.applyCustomization(themeToggle.checked ? "dark" : "light", neonBorders.checked, iconColor.value, borderColor.value);
        });
        iconColor.addEventListener("input", () => {
            window.applyCustomization(themeToggle.checked ? "dark" : "light", neonBorders.checked, iconColor.value, borderColor.value);
        });
        borderColor.addEventListener("input", () => {
            window.applyCustomization(themeToggle.checked ? "dark" : "light", neonBorders.checked, iconColor.value, borderColor.value);
        });
    };

    window.saveCustomization = function() {
        const themeToggle = document.getElementById("themeToggle");
        const neonBorders = document.getElementById("neonBorders");
        const iconColor = document.getElementById("iconColor");
        const borderColor = document.getElementById("borderColor");

        localStorage.setItem("theme", themeToggle.checked ? "dark" : "light");
        localStorage.setItem("neonBorders", neonBorders.checked);
        localStorage.setItem("iconColor", iconColor.value);
        localStorage.setItem("borderColor", borderColor.value);

        document.getElementById("customizationPopup").style.display = "none";
    };

    window.closeCustomizationPopup = function() {
        document.getElementById("customizationPopup").style.display = "none";
        window.applyCustomization(originalCustomization.theme, originalCustomization.neonBorders, originalCustomization.iconColor, originalCustomization.borderColor);

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

    window.atualizarSaudacao();
    setInterval(window.atualizarSaudacao, 600000);
});