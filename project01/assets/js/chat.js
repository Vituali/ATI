document.addEventListener("DOMContentLoaded", function() {
    let respostas = { suporte: {}, financeiro: {}, geral: {} };
    let atendenteAtual = localStorage.getItem("atendenteAtual") || "";

    // Show section
    window.showSection = function(section) {
        document.getElementById("chatSection").style.display = section === "chat" ? "block" : "none";
        document.getElementById("conversorSection").style.display = section === "conversor" ? "block" : "none";
        const buttons = document.querySelectorAll(".sidebar-button");
        buttons.forEach(button => {
            button.classList.toggle("active", button.getAttribute("onclick") === `showSection('${section}')`);
        });
    };

    // Open atendente popup
    window.openAtendentePopup = function() {
        document.getElementById("atendentePopup").style.display = "block";
    };

    // Close atendente popup
    window.closeAtendentePopup = function() {
        document.getElementById("atendentePopup").style.display = "none";
    };

    // Update option selector
    window.atualizarSeletorOpcoes = function() {
        const seletor = document.getElementById("opcoes");
        if (!seletor) {
            console.error("❌ Elemento 'opcoes' não encontrado");
            window.showPopup("Erro: elemento de opções não encontrado.");
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

    // Respond to selected option
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

    // Save edited response
    window.salvarEdicao = function() {
        if (!atendenteAtual || !firebase.auth().currentUser) {
            window.showPopup("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const opcao = document.getElementById("opcoes").value;
        if (!opcao) {
            window.showPopup("Selecione uma opção primeiro!");
            return;
        }
        const [categoria, chave] = opcao.split(":");
        const texto = document.getElementById("resposta").value.trim();
        respostas[categoria][chave] = texto;
        window.salvarNoFirebase();
        window.showPopup("Resposta salva com sucesso!");
    };

    // Copy text
    window.copiarTexto = function() {
        const texto = document.getElementById("resposta");
        if (!texto) {
            console.error("❌ Elemento 'resposta' não encontrado");
            window.showPopup("Erro: campo de texto não encontrado.");
            return;
        }
        navigator.clipboard.writeText(texto.value).then(() => {
            window.showPopup('Texto copiado!');
        }).catch(error => {
            console.error("❌ Erro ao copiar texto:", error);
            window.showPopup("Erro ao copiar a mensagem.");
        });
    };

    // Delete text
    window.apagarTexto = function() {
        if (!atendenteAtual || !firebase.auth().currentUser) {
            window.showPopup("Selecione um atendente e autentique-se primeiro!");
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
        window.showPopup("Resposta apagada com sucesso!");
    };

    // Add new response
    window.mostrarPopupAdicionar = function() {
        if (!atendenteAtual || !firebase.auth().currentUser) {
            window.showPopup("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const novoTitulo = prompt("Digite o título da nova resposta:");
        if (!novoTitulo) {
            console.log("⚠️ Adição cancelada: título vazio");
            return;
        }
        const validacao = window.validarChave(novoTitulo);
        if (!validacao.valido) {
            window.showPopup(validacao.mensagem);
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
            window.showPopup(validacaoCategoria.mensagem);
            console.error("❌ Validação da categoria falhou:", validacaoCategoria.mensagem);
            return;
        }
        const categoria = validacaoCategoria.chaveSanitizada;
        if (!respostas[categoria]) {
            respostas[categoria] = {};
        }
        if (respostas[categoria][chave]) {
            window.showPopup("Esse título já existe nesta categoria!");
            console.warn(`⚠️ Título duplicado: ${chave} em ${categoria}`);
            return;
        }
        respostas[categoria][chave] = "Beleza! 🎉 Nova resposta adicionada! 🎉 Precisando de algo mais, estamos à disposição. [despedida]";
        console.log(`📝 Adicionando: ${categoria}:${chave}`);
        window.salvarNoFirebase();
        window.atualizarSeletorOpcoes();
        document.getElementById("opcoes").value = `${categoria}:${chave}`;
        window.responder();
        window.showPopup("Nova resposta adicionada com sucesso!");
    };

    // Change category
    window.alterarCategoria = function() {
        if (!atendenteAtual || !firebase.auth().currentUser) {
            window.showPopup("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const opcao = document.getElementById("opcoes").value;
        if (!opcao) {
            window.showPopup("Selecione uma resposta primeiro!");
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
            window.showPopup(validacao.mensagem);
            console.error("❌ Validação da nova categoria falhou:", validacao.mensagem);
            return;
        }
        const novaCategoriaKey = validacao.chaveSanitizada;
        if (novaCategoriaKey === oldCategoria) {
            console.log("⚠️ Mesma categoria selecionada, nenhuma alteração feita");
            return;
        }
        if (!respostas[oldCategoria] || !respostas[oldCategoria][chave]) {
            window.showPopup("Erro: resposta não encontrada na categoria atual!");
            console.error(`❌ Resposta não encontrada: ${oldCategoria}:${chave}`);
            return;
        }
        if (respostas[novaCategoriaKey]?.[chave]) {
            window.showPopup("Este título já existe na categoria selecionada!");
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
        window.showPopup("Categoria alterada com sucesso!");
    };

    // Toggle title edit
    window.toggleEditarTitulo = function() {
        if (!atendenteAtual || !firebase.auth().currentUser) {
            window.showPopup("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const titleContainer = document.getElementById("titleContainer");
        const opcao = document.getElementById("opcoes").value;
        if (!opcao) {
            window.showPopup("Selecione uma opção primeiro!");
            console.warn("⚠️ Nenhuma opção selecionada para editar título");
            return;
        }
        const [categoria, chave] = opcao.split(":");
        if (!respostas[categoria]?.[chave]) {
            window.showPopup("Erro: resposta não encontrada!");
            console.error(`❌ Resposta não encontrada: ${categoria}:${chave}`);
            return;
        }
        titleContainer.style.display = titleContainer.style.display === "flex" ? "none" : "flex";
        if (titleContainer.style.display === "flex") {
            document.getElementById("titulo").value = chave.replace(/_/g, " ");
            console.log(`📝 Abrindo edição de título para ${categoria}:${chave}`);
        }
    };

    // Save new title
    window.salvarNovoTitulo = function() {
        if (!atendenteAtual || !firebase.auth().currentUser) {
            window.showPopup("Selecione um atendente e autentique-se primeiro!");
            return;
        }
        const opcaoAntiga = document.getElementById("opcoes").value;
        if (!opcaoAntiga) {
            window.showPopup("Selecione uma opção primeiro!");
            console.warn("⚠️ Nenhuma opção selecionada para salvar título");
            return;
        }
        const novoTitulo = document.getElementById("titulo").value.trim();
        const validacao = window.validarChave(novoTitulo);
        if (!validacao.valido) {
            window.showPopup(validacao.mensagem);
            console.error("❌ Validação do novo título falhou:", validacao.mensagem);
            return;
        }
        const novoChave = validacao.chaveSanitizada;
        const [categoria, oldChave] = opcaoAntiga.split(":");
        if (!respostas[categoria]?.[oldChave]) {
            window.showPopup("Erro: resposta não encontrada!");
            console.error(`❌ Resposta não encontrada: ${categoria}:${oldChave}`);
            return;
        }
        if (novoChave === oldChave) {
            console.log("⚠️ Mesmo título, nenhuma alteração feita");
            document.getElementById("titleContainer").style.display = "none";
            return;
        }
        if (respostas[categoria][novoChave]) {
            window.showPopup("Este título já existe nesta categoria!");
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
        window.showPopup("Título alterado com sucesso!");
    };

    // Initialize chat section
    window.showSection("chat");
});