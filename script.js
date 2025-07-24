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

// Objeto local para armazenar os dados em memória
let DADOS = { ...DADOS_INICIAIS };

// URL do arquivo JSON no GitHub Pages
const JSON_URL = 'https://vituali.github.io/ATI/api/dados.json';

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

// Carregar dados do GitHub Pages
const carregarTodosDados = async () => {
    try {
        const response = await fetch(JSON_URL);
        if (!response.ok) {
            if (response.status === 404) {
                console.log("Arquivo dados.json não encontrado, usando dados iniciais.");
                return DADOS;
            }
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const dados = await response.json();
        DADOS = { ...DADOS_INICIAIS, ...dados };
        return DADOS;
    } catch (error) {
        console.error("Erro ao carregar dados do GitHub:", error);
        return DADOS;
    }
};

// Salvar dados localmente (em memória)
const salvarNoBanco = (categoria, chave, texto) => {
    DADOS[categoria] = DADOS[categoria] || {};
    DADOS[categoria][chave] = texto;
    console.log(`Salvo localmente: ${categoria}:${chave}`);
};

/* 
 * Exemplo de escrita no GitHub usando a API (requer backend para segurança)
const salvarNoBanco = async (categoria, chave, texto) => {
    try {
        DADOS[categoria] = DADOS[categoria] || {};
        DADOS[categoria][chave] = texto;

        const content = JSON.stringify(DADOS, null, 2);
        const contentBase64 = btoa(unescape(encodeURIComponent(content)));

        const octokit = new Octokit({ auth: 'seu-token-aqui' }); // NÃO USE NO CLIENTE
        let sha;
        try {
            const { data } = await octokit.repos.getContent({
                owner: '<seu-usuario>',
                repo: '<repositório>',
                path: 'api/dados.json'
            });
            sha = data.sha;
        } catch (error) {
            if (error.status === 404) console.log("Arquivo não existe, será criado.");
        }

        await octokit.repos.createOrUpdateFileContents({
            owner: '<seu-usuario>',
            repo: '<repositório>',
            path: 'api/dados.json',
            message: `Atualizar dados ${categoria}:${chave}`,
            content: contentBase64,
            sha
        });

        console.log(`Salvo no GitHub: ${categoria}:${chave}`);
    } catch (error) {
        console.error("Erro ao salvar no GitHub:", error);
        throw error;
    }
};
*/

// Apagar dados localmente
const apagarDoBanco = (id) => {
    const [categoria, chave] = id.split(":");
    if (DADOS[categoria] && DADOS[categoria][chave]) {
        delete DADOS[categoria][chave];
        console.log(`Apagado localmente: ${id}`);
    }
};

// Funções principais
const inicializarDados = async () => {
    try {
        await carregarTodosDados();
        if (Object.keys(DADOS).length === Object.keys(DADOS_INICIAIS).length) {
            console.log("Nenhum dado encontrado, usando dados iniciais.");
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
        await carregarTodosDados();
        ELEMENTS.opcoes.innerHTML = '<option value="">Selecione uma opção</option>';
        const categoriaSelecionada = ELEMENTS.categoria.value;
        
        Object.entries(DADOS).forEach(([categoria, respostas]) => {
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
        ELEMENTS.titulo.value = chave.replace(/_/g, " ").toUpperCase();
        ELEMENTS.resposta.value = substituirMarcadores(DADOS[categoria]?.[chave] || "Resposta não encontrada.");
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

    if (DADOS[categoria]?.[novoTitulo]) return alert("Este título já existe nesta categoria!");

    const texto = DADOS[categoria][oldChave];
    salvarNoBanco(categoria, novoTitulo, texto);
    apagarDoBanco(opcaoAntiga);
    await atualizarOpcoes();
    ELEMENTS.opcoes.value = `${categoria}:${novoTitulo}`;
    await responder();
    alert("Título alterado com sucesso! Exporte para salvar no GitHub.");
};

const salvarEdicao = async () => {
    const opcao = ELEMENTS.opcoes.value;
    if (!opcao) return alert("Selecione uma opção primeiro!");
    
    const [categoria, chave] = opcao.split(":");
    const textoOriginal = ELEMENTS.resposta.value.trim();
    try {
        salvarNoBanco(categoria, chave, textoOriginal);
        alert("Resposta salva com sucesso! Exporte para salvar no GitHub.");
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
    
    apagarDoBanco(opcao);
    ELEMENTS.resposta.value = "";
    ELEMENTS.titulo.value = "";
    await atualizarOpcoes();
    alert("Resposta apagada com sucesso! Exporte para salvar no GitHub.");
};

const mostrarPopupAdicionar = async () => {
    const novoTitulo = prompt("Digite o título da nova resposta:");
    if (!novoTitulo) return;
    
    const chave = novoTitulo.trim().toLowerCase().replace(/ /g, "_");
    if (!chave) return alert("Título inválido!");
    
    const categoriaPrompt = prompt("Escolha a categoria (financeiro, suporte, geral):", "geral");
    const categoria = CATEGORIAS.includes(categoriaPrompt?.toLowerCase()) ? categoriaPrompt.toLowerCase() : "geral";
    
    if (DADOS[categoria]?.[chave]) return alert("Esse título já existe nesta categoria!");

    const textoPadrao = "[SAUDACAO] Nova resposta aqui... [DESPEDIDA]";
    salvarNoBanco(categoria, chave, textoPadrao);
    await atualizarOpcoes();
    ELEMENTS.opcoes.value = `${categoria}:${chave}`;
    await responder();
    alert("Nova resposta adicionada com sucesso! Exporte para salvar no GitHub.");
};

const alterarCategoria = async () => {
    const opcao = ELEMENTS.opcoes.value;
    if (!opcao) return alert("Selecione uma resposta primeiro!");

    const [oldCategoria, chave] = opcao.split(":");
    const novaCategoriaPrompt = prompt("Digite a nova categoria (financeiro, suporte, geral):", oldCategoria);
    const novaCategoria = CATEGORIAS.includes(novaCategoriaPrompt?.toLowerCase()) ? novaCategoriaPrompt.toLowerCase() : oldCategoria;

    if (novaCategoria === oldCategoria) return;

    if (DADOS[novaCategoria]?.[chave]) return alert("Este título já existe na categoria selecionada!");

    const texto = DADOS[oldCategoria][chave];
    salvarNoBanco(novaCategoria, chave, texto);
    apagarDoBanco(opcao);
    await atualizarOpcoes();
    ELEMENTS.opcoes.value = `${novaCategoria}:${chave}`;
    await responder();
    alert("Categoria alterada com sucesso! Exporte para salvar no GitHub.");
};

const exportarDados = async () => {
    try {
        const json = JSON.stringify(DADOS, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dados_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert("Dados exportados com sucesso! Faça o commit manual do arquivo no GitHub como 'api/dados.json'.");
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
            DADOS = { ...DADOS_INICIAIS, ...dadosImportados };
            await atualizarOpcoes();
            await responder();
            alert("Dados importados com sucesso! Considere atualizar o JSON no GitHub.");
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
