// Elementos do DOM
const ELEMENTS = {
    saudacao: document.getElementById("saudacao"),
    categoria: document.getElementById("categoria"),
    opcoes: document.getElementById("opcoes"),
    titulo: document.getElementById("titulo"),
    resposta: document.getElementById("resposta"),
    importarArquivo: document.getElementById("importarArquivo")
};

const CATEGORIAS = ["financeiro", "suporte", "geral"];
const DADOS_INICIAIS = {
    financeiro: {},
    suporte: {},
    geral: {}
};

const DB_NAME = "ChatAutomaticoDB";
const DB_VERSION = 1;
const STORE_NAME = "respostas";
let db;

// Funções de saudação
const getSaudacao = () => {
    const hora = new Date().getHours();
    return hora >= 5 && hora < 12 ? "Bom dia!" :
           hora >= 12 && hora < 18 ? "Boa tarde!" : 
           "Boa noite!";
};

const getDespedida = () => {
    const hora = new Date().getHours();
    return hora >= 5 && hora < 12 ? "Tenha uma excelente manhã!" :
           hora >= 12 && hora < 18 ? "Tenha uma excelente tarde!" : 
           "Tenha uma excelente noite!";
};

const substituirMarcadores = texto => 
    texto.replace("[SAUDACAO]", getSaudacao())
         .replace("[DESPEDIDA]", getDespedida());

// Banco de dados
const abrirBanco = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
            store.createIndex("categoria", "categoria", { unique: false });
        }
    };

    request.onsuccess = event => {
        db = event.target.result;
        resolve(db);
    };

    request.onerror = event => {
        console.error("Erro ao abrir o banco:", event.target.error);
        reject(event.target.error);
    };
});

const salvarNoBanco = (categoria, chave, texto) => new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const id = `${categoria}:${chave}`;
    const data = { id, categoria, chave, texto };
    
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => console.log(`Salvo: ${id}`);
    transaction.onerror = () => reject(transaction.error);
});

const carregarTodosDados = () => new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
        const dados = {};
        request.result.forEach(item => {
            if (!dados[item.categoria]) dados[item.categoria] = {};
            dados[item.categoria][item.chave] = item.texto;
        });
        resolve(dados);
    };
    request.onerror = () => reject(request.error);
});

const apagarDoBanco = id => new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => console.log(`Apagado: ${id}`);
});

// Funções principais
const inicializarDados = async () => {
    try {
        const dadosExistentes = await carregarTodosDados();
        if (Object.keys(dadosExistentes).length === 0) {
            for (const [categoria, respostas] of Object.entries(DADOS_INICIAIS)) {
                for (const [chave, texto] of Object.entries(respostas)) {
                    await salvarNoBanco(categoria, chave, texto);
                }
            }
            console.log("Dados iniciais salvos com sucesso.");
        }
    } catch (error) {
        console.error("Erro ao inicializar dados:", error);
    }
};

const atualizarSaudacao = () => {
    ELEMENTS.saudacao.textContent = getSaudacao();
    const opcao = ELEMENTS.opcoes.value;
    if (opcao) responder();
};

const atualizarOpcoes = async () => {
    try {
        const dados = await carregarTodosDados();
        ELEMENTS.opcoes.innerHTML = '<option value="">Selecione uma opção</option>';
        const categoriaSelecionada = ELEMENTS.categoria.value;
        
        Object.entries(dados).forEach(([categoria, respostas]) => {
            if (!categoriaSelecionada || categoria === categoriaSelecionada) {
                const optgroup = document.createElement("optgroup");
                optgroup.label = categoria.charAt(0).toUpperCase() + categoria.slice(1);
                
                Object.keys(respostas).sort().forEach(chave => {
                    const option = document.createElement("option");
                    option.value = `${categoria}:${chave}`;
                    option.textContent = chave.replace(/_/g, " ").toUpperCase();
                    optgroup.appendChild(option);
                });
                
                if (optgroup.children.length > 0) {
                    ELEMENTS.opcoes.appendChild(optgroup);
                }
            }
        });
    } catch (error) {
        console.error("Erro ao atualizar opções:", error);
    }
};

const responder = async () => {
    const opcao = ELEMENTS.opcoes.value;
    if (!opcao) {
        ELEMENTS.titulo.value = "";
        ELEMENTS.resposta.value = "Selecione uma opção para receber uma resposta automática.";
        ajustarAlturaTextarea();
        return;
    }
    
    try {
        const [categoria, chave] = opcao.split(":");
        const dados = await carregarTodosDados();
        ELEMENTS.titulo.value = chave.replace(/_/g, " ").toUpperCase();
        ELEMENTS.resposta.value = substituirMarcadores(dados[categoria][chave] || "Resposta não encontrada.");
        ajustarAlturaTextarea();
    } catch (error) {
        console.error("Erro ao responder:", error);
        ELEMENTS.resposta.value = "Erro ao carregar resposta.";
        ajustarAlturaTextarea();
    }
};

const salvarNovoTitulo = async () => {
    const opcaoAntiga = ELEMENTS.opcoes.value;
    if (!opcaoAntiga) return alert("Selecione uma opção primeiro!");

    const novoTitulo = ELEMENTS.titulo.value.trim().toLowerCase().replace(/ /g, "_");
    if (!novoTitulo) return alert("Digite um título válido!");

    const [categoria, oldChave] = opcaoAntiga.split(":");
    if (novoTitulo === oldChave) return;

    const dados = await carregarTodosDados();
    if (dados[categoria]?.[novoTitulo]) return alert("Este título já existe nesta categoria!");

    const texto = dados[categoria][oldChave];
    await salvarNoBanco(categoria, novoTitulo, texto);
    await apagarDoBanco(opcaoAntiga);
    await atualizarOpcoes();
    ELEMENTS.opcoes.value = `${categoria}:${novoTitulo}`;
    await responder();
    alert("Título alterado com sucesso!");
};

const salvarEdicao = async () => {
    const opcao = ELEMENTS.opcoes.value;
    if (!opcao) return alert("Selecione uma opção primeiro!");
    
    const [categoria, chave] = opcao.split(":");
    const textoOriginal = ELEMENTS.resposta.value.trim();
    try {
        await salvarNoBanco(categoria, chave, textoOriginal);
        alert("Resposta salva com sucesso!");
        await responder();
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar a resposta!");
    }
};

const copiarTexto = async () => {
    try {
        const texto = substituirMarcadores(ELEMENTS.resposta.value);
        await navigator.clipboard.writeText(texto);
    } catch (err) {
        console.error("Erro ao copiar:", err);
        alert("Erro ao copiar texto!");
    }
};

const apagarTexto = async () => {
    const opcao = ELEMENTS.opcoes.value;
    if (!opcao || !confirm("Tem certeza que deseja apagar?")) return;
    
    await apagarDoBanco(opcao);
    ELEMENTS.resposta.value = "";
    ELEMENTS.titulo.value = "";
    await atualizarOpcoes();
    alert("Resposta apagada com sucesso!");
};

const mostrarPopupAdicionar = async () => {
    const novoTitulo = prompt("Digite o título da nova resposta:");
    if (!novoTitulo) return;
    
    const chave = novoTitulo.trim().toLowerCase().replace(/ /g, "_");
    if (!chave) return alert("Título inválido!");
    
    const categoriaPrompt = prompt("Escolha a categoria (financeiro, suporte, geral):", "geral");
    const categoria = CATEGORIAS.includes(categoriaPrompt?.toLowerCase()) ? categoriaPrompt.toLowerCase() : "geral";
    
    const dados = await carregarTodosDados();
    if (dados[categoria]?.[chave]) return alert("Esse título já existe nesta categoria!");

    const textoPadrao = "[SAUDACAO] Nova resposta aqui... [DESPEDIDA]";
    await salvarNoBanco(categoria, chave, textoPadrao);
    await atualizarOpcoes();
    ELEMENTS.opcoes.value = `${categoria}:${chave}`;
    await responder();
    alert("Nova resposta adicionada com sucesso!");
};

const alterarCategoria = async () => {
    const opcao = ELEMENTS.opcoes.value;
    if (!opcao) return alert("Selecione uma resposta primeiro!");

    const [oldCategoria, chave] = opcao.split(":");
    const novaCategoriaPrompt = prompt("Digite a nova categoria (financeiro, suporte, geral):", oldCategoria);
    const novaCategoria = CATEGORIAS.includes(novaCategoriaPrompt?.toLowerCase()) ? novaCategoriaPrompt.toLowerCase() : oldCategoria;

    if (novaCategoria === oldCategoria) return;

    const dados = await carregarTodosDados();
    if (dados[novaCategoria]?.[chave]) return alert("Este título já existe na categoria selecionada!");

    const texto = dados[oldCategoria][chave];
    await salvarNoBanco(novaCategoria, chave, texto);
    await apagarDoBanco(opcao);
    await atualizarOpcoes();
    ELEMENTS.opcoes.value = `${novaCategoria}:${chave}`;
    await responder();
    alert("Categoria alterada com sucesso!");
};

const exportarDados = async () => {
    try {
        const dados = await carregarTodosDados();
        const json = JSON.stringify(dados, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_dados_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert("Dados exportados com sucesso!");
    } catch (error) {
        console.error("Erro ao exportar:", error);
        alert("Erro ao exportar dados!");
    }
};

const importarDados = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        reader.onload = async e => {
            const dadosImportados = JSON.parse(e.target.result);
            for (const [categoria, respostas] of Object.entries(dadosImportados)) {
                for (const [chave, texto] of Object.entries(respostas)) {
                    await salvarNoBanco(categoria, chave, texto);
                }
            }
            await atualizarOpcoes();
            await responder();
            alert("Dados importados com sucesso!");
        };
        reader.readAsText(file);
    } catch (error) {
        console.error("Erro ao importar dados:", error);
        alert("Erro ao importar os dados. Verifique o arquivo JSON.");
    } finally {
        ELEMENTS.importarArquivo.value = "";
    }
};

const toggleEditarTitulo = () => {
    const titleContainer = document.getElementById("titleContainer");
    const isVisible = titleContainer.style.display === "flex";
    
    if (ELEMENTS.opcoes.value === "") {
        alert("Selecione uma opção primeiro!");
        return;
    }
    
    titleContainer.style.display = isVisible ? "none" : "flex";
};

const ajustarAlturaTextarea = () => {
    const textarea = ELEMENTS.resposta;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
};

const executarAcaoEditar = async (acao) => {
    switch (acao) {
        case "salvar":
            await salvarEdicao();
            break;
        case "alterarCategoria":
            await alterarCategoria();
            break;
        case "apagar":
            await apagarTexto();
            break;
        case "adicionar":
            await mostrarPopupAdicionar();
            break;
        case "editarTitulo":
            toggleEditarTitulo();
            break;
        default:
            console.log("Nenhuma ação de edição selecionada.");
    }
    document.getElementById("editarAcoes").value = "";
};

const inicializar = async () => {
    try {
        db = await abrirBanco();
        await inicializarDados();
        await atualizarOpcoes();
        await responder();
        atualizarSaudacao();
        ajustarAlturaTextarea();
        setInterval(atualizarSaudacao, 600000);
    } catch (error) {
        console.error("Erro na inicialização:", error);
        ELEMENTS.resposta.value = "Erro ao inicializar o chat.";
        ajustarAlturaTextarea();
    }
};

inicializar();