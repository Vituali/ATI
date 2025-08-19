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

    // Initialize dark/light mode
    const modeToggle = document.getElementById("modeToggle");
    const isDark = localStorage.getItem("darkMode") === "true";
    if (isDark) {
        document.body.classList.add("dark");
        modeToggle.innerText = "☀️";
    } else {
        modeToggle.innerText = "🌙";
    }

    modeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        localStorage.setItem("darkMode", document.body.classList.contains("dark"));
        modeToggle.innerText = document.body.classList.contains("dark") ? "☀️" : "🌙";
        console.log("Mode toggled to:", document.body.classList.contains("dark") ? "dark" : "light");
    });

    // Inicializar Firebase e autenticação anônima
    try {
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.database(app);
        auth = firebase.auth(app);
        firebase.auth().signInAnonymously().then(() => {
            console.log("✅ Usuário autenticado anonimamente:", auth.currentUser.uid);
            if (atendenteSelect) {
                atendenteSelect.value = atendenteAtual.charAt(0).toUpperCase() + atendenteAtual.slice(1);
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
        atendenteAtual = atendenteSelect.value.toLowerCase();
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
            alert("Texto copiado com sucesso!");
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
        const novaResposta = prompt("Digite a nova resposta:");
        if (!novaResposta) {
            console.log("⚠️ Adição cancelada: resposta vazia");
            return;
        }
        if (!respostas[categoria]) {
            respostas[categoria] = {};
        }
        respostas[categoria][chave] = novaResposta;
        salvarNoFirebase();
        atualizarSeletorOpcoes();
        alert("Resposta adicionada com sucesso!");
    };

    window.toggleEditarTitulo = function() {
        const titleContainer = document.getElementById("titleContainer");
        if (titleContainer.style.display === "none" || !titleContainer.style.display) {
            titleContainer.style.display = "flex";
        } else {
            titleContainer.style.display = "none";
        }
    };

    window.salvarNovoTitulo = function() {
        if (!atendenteAtual || !auth.currentUser) {
            alert("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const opcao = document.getElementById("opcoes").value;
        if (!opcao) {
            alert("Selecione uma opção primeiro!");
            return;
        }
        const [categoria, chaveAntiga] = opcao.split(":");
        const novoTitulo = document.getElementById("titulo").value.trim();
        if (!novoTitulo) {
            alert("O título não pode estar em branco!");
            return;
        }
        const validacao = validarChave(novoTitulo);
        if (!validacao.valido) {
            alert(validacao.mensagem);
            return;
        }
        const novaChave = validacao.chaveSanitizada;
        if (respostas[categoria][novaChave] && novaChave !== chaveAntiga) {
            alert("Já existe uma resposta com este título!");
            return;
        }
        const texto = respostas[categoria][chaveAntiga];
        respostas[categoria][novaChave] = texto;
        if (novaChave !== chaveAntiga) {
            delete respostas[categoria][chaveAntiga];
        }
        salvarNoFirebase();
        atualizarSeletorOpcoes();
        document.getElementById("opcoes").value = `${categoria}:${novaChave}`;
        responder();
        alert("Título atualizado com sucesso!");
    };

    window.alterarCategoria = function() {
        if (!atendenteAtual || !auth.currentUser) {
            alert("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const opcao = document.getElementById("opcoes").value;
        if (!opcao) {
            alert("Selecione uma opção primeiro!");
            return;
        }
        const [categoriaAntiga, chave] = opcao.split(":");
        const novaCategoria = prompt("Digite a nova categoria (ex.: suporte, financeiro, geral):", categoriaAntiga);
        if (!novaCategoria) {
            console.log("⚠️ Alteração de categoria cancelada");
            return;
        }
        const validacao = validarChave(novaCategoria);
        if (!validacao.valido) {
            alert(validacao.mensagem);
            console.error("❌ Validação da nova categoria falhou:", validacao.mensagem);
            return;
        }
        const categoriaSanitizada = validacao.chaveSanitizada;
        if (categoriaSanitizada !== categoriaAntiga) {
            if (!respostas[categoriaSanitizada]) {
                respostas[categoriaSanitizada] = {};
            }
            respostas[categoriaSanitizada][chave] = respostas[categoriaAntiga][chave];
            delete respostas[categoriaAntiga][chave];
            if (Object.keys(respostas[categoriaAntiga]).length === 0) {
                delete respostas[categoriaAntiga];
            }
            salvarNoFirebase();
            atualizarSeletorOpcoes();
            document.getElementById("opcoes").value = `${categoriaSanitizada}:${chave}`;
            responder();
            alert("Categoria alterada com sucesso!");
        }
    };

    function substituirMarcadores(texto) {
        let saudacao = "";
        let despedida = "";
        if (atendenteAtual) {
            const saudacaoSalva = localStorage.getItem(`saudacao_${atendenteAtual}`);
            const despedidaSalva = localStorage.getItem(`despedida_${atendenteAtual}`);
            saudacao = saudacaoSalva || `Olá, aqui é ${atendenteAtual.charAt(0).toUpperCase() + atendenteAtual.slice(1)}! Como posso ajudar?`;
            despedida = despedidaSalva || `Atenciosamente, ${atendenteAtual.charAt(0).toUpperCase() + atendenteAtual.slice(1)}`;
        }
        return texto.replace(/\[SAUDACAO\]/g, saudacao).replace(/\[DESPEDIDA\]/g, despedida);
    }

    window.abrirModalAditivo = function() {
        const modal = document.getElementById("modalAditivo");
        modal.style.display = "block";
        console.log("Modal opened");
    };

    window.fecharModalAditivo = function() {
        const modal = document.getElementById("modalAditivo");
        modal.style.display = "none";
        backToUpload(); // Reset to upload section
        console.log("Modal closed");
    };

    function ajustarAlturaTextarea() {
        const textarea = document.getElementById("resposta");
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

    // Ajustar altura do textarea ao carregar
    const textarea = document.getElementById("resposta");
    textarea.addEventListener("input", ajustarAlturaTextarea);
    ajustarAlturaTextarea();
});