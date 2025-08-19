// js/chat-automator.js

import { db, auth } from './firebase.js';
import { showPopup } from './ui.js';

let respostas = { suporte: {}, financeiro: {}, geral: {} };
let atendenteAtual = localStorage.getItem("atendenteAtual") || "";

const atendenteSelect = document.getElementById("atendente");
const opcoesSelect = document.getElementById("opcoes");
const respostaTextarea = document.getElementById("resposta");
const tituloInput = document.getElementById("titulo");
const titleContainer = document.getElementById("titleContainer");

function ajustarAlturaTextarea() {
    if (respostaTextarea) {
        respostaTextarea.style.height = "auto";
        respostaTextarea.style.height = `${respostaTextarea.scrollHeight}px`;
    }
}

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

function responder() {
    const opcao = opcoesSelect.value;
    if (!opcao || !atendenteAtual) {
        if (!respostaTextarea.value && atendenteAtual) {
            respostaTextarea.value = "Selecione uma opção para receber uma resposta automática.";
        } else if (!atendenteAtual) {
            respostaTextarea.value = "Selecione um atendente primeiro.";
        }
        tituloInput.value = "";
        respostaTextarea.readOnly = true; // MUDANÇA: Bloqueia a edição
        ajustarAlturaTextarea();
        return;
    }
    const [categoria, chave] = opcao.split(":");
    respostaTextarea.value = substituirMarcadores(respostas[categoria]?.[chave] || "Resposta não encontrada.");
    tituloInput.value = chave.replace(/_/g, " ");
    respostaTextarea.readOnly = false; // MUDANÇA: Permite a edição
    ajustarAlturaTextarea();
}

function atualizarSeletorOpcoes() {
    if (!opcoesSelect) return;
    opcoesSelect.innerHTML = atendenteAtual ? '<option value="">Selecione uma opção</option>' : '<option value="">Selecione um atendente primeiro</option>';
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
            opcoesSelect.appendChild(optgroup);
        }
    });
    responder();
}

function carregarDoFirebase() {
    if (!atendenteAtual || !auth.currentUser) return;
    const dbRef = firebase.database().ref(`respostas/${atendenteAtual}`);
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        respostas = data || { suporte: {}, financeiro: {}, geral: {} };
        console.log("📥 Dados carregados do Firebase para " + atendenteAtual);
        atualizarSeletorOpcoes();
    }, (error) => {
        console.error("❌ Erro na conexão com Firebase:", error);
        showPopup("Erro de conexão com o Firebase.");
    });
}

function salvarNoFirebase() {
    if (!atendenteAtual || !auth.currentUser) {
        showPopup("Selecione um atendente primeiro!");
        return;
    }
    const dbRef = firebase.database().ref(`respostas/${atendenteAtual}`);
    dbRef.set(respostas)
        .then(() => console.log(`🔥 Dados salvos no Firebase para ${atendenteAtual}`))
        .catch(error => {
            console.error("❌ Erro ao salvar no Firebase:", error);
            showPopup("Erro ao salvar.");
        });
}

function selecionarAtendente() {
    atendenteAtual = atendenteSelect.value.toLowerCase();
    localStorage.setItem("atendenteAtual", atendenteAtual);
    if (atendenteAtual && auth.currentUser) {
        carregarDoFirebase();
    } else {
        opcoesSelect.innerHTML = '<option value="">Selecione um atendente primeiro</option>';
        respostaTextarea.value = "";
        tituloInput.value = "";
        ajustarAlturaTextarea();
    }
}

function validarChave(chave) {
    if (!chave || !chave.trim()) {
        return { valido: false, mensagem: "A chave não pode estar em branco." };
    }
    // CORREÇÃO AQUI: A expressão regular foi simplificada e corrigida.
    const caracteresProibidos = /[$#\[\]\/.]/g;
    if (caracteresProibidos.test(chave)) {
        return { valido: false, mensagem: "A chave não pode conter $ # [ ] . ou /." };
    }
    const chaveSanitizada = chave.trim().toLowerCase().replace(/[$#\[\]\/.]/g, "_");
    return { valido: true, chaveSanitizada };
}

function toggleEditarTitulo() {
    const isVisible = titleContainer.style.display !== "none";
    titleContainer.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
        tituloInput.focus();
    }
}

function salvarEdicao() {
    if (!atendenteAtual || !auth.currentUser) {
        showPopup("Selecione um atendente primeiro!");
        return;
    }
    const opcao = opcoesSelect.value;
    if (!opcao) {
        showPopup("Selecione uma opção primeiro!");
        return;
    }
    const [categoria, chave] = opcao.split(":");
    respostas[categoria][chave] = respostaTextarea.value.trim();
    salvarNoFirebase();
    showPopup("Resposta salva com sucesso!");
}

function salvarNovoTitulo() {
    const opcao = opcoesSelect.value;
    if (!opcao || !atendenteAtual || !auth.currentUser) {
        showPopup("Selecione uma opção e um atendente!");
        return;
    }
    const novoTitulo = tituloInput.value.trim();
    const { valido, mensagem, chaveSanitizada } = validarChave(novoTitulo);
    if (!valido) {
        showPopup(mensagem);
        return;
    }

    const [categoria, chaveAntiga] = opcao.split(":");
    if (chaveAntiga === chaveSanitizada) return;

    const texto = respostas[categoria][chaveAntiga];
    delete respostas[categoria][chaveAntiga];
    respostas[categoria][chaveSanitizada] = texto;
    salvarNoFirebase();
    showPopup("Título alterado com sucesso!");
    // A função `onValue` do Firebase recarregará automaticamente
}

function alterarCategoria() {
    const opcao = opcoesSelect.value;
    if (!opcao) {
        showPopup("Selecione uma opção primeiro!");
        return;
    }
    const [categoriaAntiga, chave] = opcao.split(":");
    const novaCategoria = prompt("Digite a nova categoria (suporte, financeiro, geral):")?.toLowerCase();
    
    if (novaCategoria && ["suporte", "financeiro", "geral"].includes(novaCategoria)) {
        if (!respostas[novaCategoria]) respostas[novaCategoria] = {};
        respostas[novaCategoria][chave] = respostas[categoriaAntiga][chave];
        delete respostas[categoriaAntiga][chave];
        salvarNoFirebase();
        showPopup("Categoria alterada com sucesso!");
    } else if (novaCategoria) {
        showPopup("Categoria inválida!");
    }
}

function apagarTexto() {
    const opcao = opcoesSelect.value;
    if (!opcao) {
        showPopup("Selecione uma opção para apagar!");
        return;
    }
    if (confirm("Tem certeza que deseja apagar esta resposta?")) {
        const [categoria, chave] = opcao.split(":");
        delete respostas[categoria][chave];
        salvarNoFirebase();
        showPopup("Resposta apagada com sucesso!");
    }
}

function mostrarPopupAdicionar() {
    const novaChave = prompt("Digite a chave (título) para a nova resposta:");
    if (novaChave) {
        const { valido, mensagem, chaveSanitizada } = validarChave(novaChave);
        if (!valido) {
            showPopup(mensagem);
            return;
        }
        const categoria = prompt("Digite a categoria (suporte, financeiro, geral):")?.toLowerCase();
        if (categoria && ["suporte", "financeiro", "geral"].includes(categoria)) {
            if (!respostas[categoria]) respostas[categoria] = {};
            respostas[categoria][chaveSanitizada] = "Nova resposta. Edite o texto e clique em 'Salvar'.";
            salvarNoFirebase();
            showPopup("Nova resposta adicionada!");
        } else if (categoria) {
            showPopup("Categoria inválida!");
        }
    }
}


// Função de inicialização do módulo
export function initChatAutomator() {
    atendenteSelect.value = atendenteAtual.charAt(0).toUpperCase() + atendenteAtual.slice(1);
    if (atendenteAtual) {
        carregarDoFirebase();
    }
    
    respostaTextarea.readOnly = true;

    // Adiciona os event listeners
    atendenteSelect.addEventListener('change', selecionarAtendente);
    opcoesSelect.addEventListener('change', responder);
    respostaTextarea.addEventListener('input', ajustarAlturaTextarea);
    document.getElementById('copyBtn').addEventListener('click', copiarTexto);
    document.getElementById('editTitleBtn').addEventListener('click', toggleEditarTitulo);
    document.getElementById('saveEditBtn').addEventListener('click', salvarEdicao);
    document.getElementById('saveTitleBtn').addEventListener('click', salvarNovoTitulo);
    document.getElementById('changeCategoryBtn').addEventListener('click', alterarCategoria);
    document.getElementById('deleteBtn').addEventListener('click', apagarTexto);
    document.getElementById('addBtn').addEventListener('click', mostrarPopupAdicionar);
}