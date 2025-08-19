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

    // Inicializar Firebase e autenticação anônima
    try {
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.database(app);
        auth = firebase.auth(app);
        firebase.auth().signInAnonymously().then(() => {
            console.log("✅ Usuário autenticado anonimamente:", auth.currentUser.uid);
            if (atendenteSelect) {
                atendenteSelect.value = atendenteAtual.charAt(0).toUpperCase() + atendenteAtual.slice(1); // Capitalize for UI
                if (atendenteAtual) {
                    carregarDoFirebase();
                }
            }
        }).catch(error => {
            console.error("❌ Erro ao autenticar anonimamente:", error);
            alert("Erro de autenticação: " + error.message);
        });
        console.log("✅ Firebase inicializado com sucesso");
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
        alert("Erro ao conectar com o banco de dados. Algumas funcionalidades podem estar indisponíveis.");
    }

    window.selecionarAtendente = function() {
        atendenteAtual = atendenteSelect.value.toLowerCase(); // Convert to lowercase for Firebase
        localStorage.setItem("atendenteAtual", atendenteAtual);
        if (atendenteAtual && auth.currentUser) {
            carregarDoFirebase();
        } else {
            document.getElementById("opcoes").innerHTML = '<option value="">Selecione um atendente primeiro</option>';
            document.getElementById("resposta").value = "";
            document.getElementById("titulo").value = "";
            ajustarAlturaTextarea();
        }
    };

    function validarChave(chave) {
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
    }

    function salvarNoFirebase() {
        if (!atendenteAtual || !auth.currentUser) {
            alert("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const dbRef = firebase.database().ref(`respostas/${atendenteAtual}`);
        dbRef.set(respostas)
            .then(() => console.log(`🔥 Dados salvos no Firebase para ${atendenteAtual}`))
            .catch(error => {
                console.error("❌ Erro ao salvar no Firebase:", error);
                alert("Erro ao salvar: " + error.message);
            });
    }

    function carregarDoFirebase() {
        if (!atendenteAtual || !auth.currentUser) {
            console.log("⚠️ Selecione um atendente e autentique-se primeiro");
            return;
        }
        const dbRef = firebase.database().ref(`respostas/${atendenteAtual}`);
        dbRef.on('value', function(snapshot) {
            try {
                const data = snapshot.val();
                respostas = data || { suporte: {}, financeiro: {}, geral: {} };
                console.log("📥 Dados carregados do Firebase para " + atendenteAtual + ":", respostas);
                atualizarSeletorOpcoes();
            } catch (error) {
                console.error("❌ Erro ao carregar dados do Firebase:", error);
                alert("Erro ao carregar dados: " + error.message);
            }
        }, function(error) {
            console.error("❌ Erro na conexão com Firebase:", error);
            alert("Erro de conexão com o Firebase: " + error.message);
        });
    }

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
        responder();
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
            ajustarAlturaTextarea();
            return;
        }
        const [categoria, chave] = opcao.split(":");
        resposta.value = substituirMarcadores(respostas[categoria]?.[chave] || "Resposta não encontrada.");
        titulo.value = chave.replace(/_/g, " ");
        ajustarAlturaTextarea();
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
        salvarNoFirebase();
        alert("Resposta salva com sucesso!");
    };

    window.copiarTexto = function() {
        const texto = document.getElementById("resposta");
        if (!texto) {
            console.error("❌ Elemento 'resposta' não encontrado");
            alert("Erro: campo de texto não encontrado.");
            return;
        }
        texto.select();
        try {
            document.execCommand("copy");
        } catch (error) {
            console.error("❌ Erro ao copiar texto:", error);
            alert("Erro ao copiar a mensagem.");
        }
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
        salvarNoFirebase();
        atualizarSeletorOpcoes();
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
        const validacao = validarChave(novoTitulo);
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
        const validacaoCategoria = validarChave(categoriaPrompt);
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
        respostas[categoria][chave] = "[SAUDACAO] Nova resposta aqui... [DESPEDIDA]";
        console.log(`📝 Adicionando: ${categoria}:${chave}`);
        salvarNoFirebase();
        atualizarSeletorOpcoes();
        document.getElementById("opcoes").value = `${categoria}:${chave}`;
        responder();
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
        const validacao = validarChave(novaCategoria);
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
        salvarNoFirebase();
        atualizarSeletorOpcoes();
        document.getElementById("opcoes").value = `${novaCategoriaKey}:${chave}`;
        responder();
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
        const validacao = validarChave(novoTitulo);
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
        salvarNoFirebase();
        atualizarSeletorOpcoes();
        document.getElementById("opcoes").value = `${categoria}:${novoChave}`;
        responder();
        document.getElementById("titleContainer").style.display = "none";
        alert("Título alterado com sucesso!");
    };

    window.abrirModalAditivo = function() {
        const modal = document.getElementById("modalAditivo");
        modal.style.display = "block";
    };

    window.fecharModalAditivo = function() {
        const modal = document.getElementById("modalAditivo");
        modal.style.display = "none";
        // Resetar o estado do conversor ao fechar
        backToUpload();
    };

    function ajustarAlturaTextarea() {
        const textarea = document.getElementById("resposta");
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }

    function substituirMarcadores(texto) {
        const hora = new Date().getHours();
        const saudacao = hora >= 5 && hora < 12 ? "Bom dia!" :
                         hora >= 12 && hora < 18 ? "Boa tarde!" : 
                         "Boa noite!";
        const despedida = hora >= 5 && hora < 12 ? "Tenha uma excelente manhã!" :
                         hora >= 12 && hora < 18 ? "Tenha uma excelente tarde!" : 
                         "Tenha uma excelente noite!";
        return texto.replace("[SAUDACAO]", saudacao).replace("[DESPEDIDA]", despedida);
    }

    function atualizarSaudacao() {
        const saudacao = document.getElementById("saudacao");
        if (saudacao) {
            const hora = new Date().getHours();
            saudacao.textContent = hora >= 5 && hora < 12 ? "Bom dia!" :
                                   hora >= 12 && hora < 18 ? "Boa tarde!" : 
                                   "Boa noite!";
        }
    }

    atualizarSaudacao();
    setInterval(atualizarSaudacao, 600000);
});