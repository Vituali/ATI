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
  try {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.getDatabase(app);
    console.log("✅ Firebase inicializado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
    alert("Erro ao conectar com o banco de dados. Verifique a configuração do Firebase e a conexão de rede.");
    return;
  }

  let respostas = { suporte: {}, financeiro: {}, geral: {} };

  function validarChave(chave) {
    if (!chave || !chave.trim()) {
      return { valido: false, mensagem: "A chave não pode estar em branco." };
    }
    const caracteresProibidos = /[$#[]./]/;
    if (caracteresProibidos.test(chave)) {
      return { valido: false, mensagem: "A chave não pode conter $ # [ ] . ou /." };
    }
    return { valido: true, chaveSanitizada: chave.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") };
  }

  function salvarNoFirebase() {
    const dbRef = firebase.ref(db, "respostas");
    firebase.set(dbRef, respostas)
      .then(() => {
        console.log("🔥 Dados salvos no Firebase");
      })
      .catch((error) => {
        console.error("❌ Erro ao salvar no Firebase:", error);
        alert(`Erro ao salvar: ${error.message}. Verifique as regras do banco de dados ou a conexão.`);
      });
  }

  function carregarDoFirebase(callback) {
    const dbRef = firebase.ref(db, "respostas");
    firebase.onValue(dbRef, (snapshot) => {
      try {
        const data = snapshot.val();
        respostas = data || { suporte: {}, financeiro: {}, geral: {} };
        console.log("📥 Dados carregados do Firebase:", respostas);
        callback();
      } catch (error) {
        console.error("❌ Erro ao carregar dados do Firebase:", error);
        alert(`Erro ao carregar dados: ${error.message}. Verifique o console.`);
      }
    }, (error) => {
      console.error("❌ Erro na conexão com Firebase:", error);
      alert(`Erro de conexão com o Firebase: ${error.message}.`);
    });
  }

  function atualizarSeletorCategorias() {
    const select = document.getElementById("categoria");
    if (!select) {
      console.error("❌ Elemento 'categoria' não encontrado");
      alert("Erro: elemento de categoria não encontrado.");
      return;
    }
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    for (let categoria in respostas) {
      const opt = document.createElement("option");
      opt.value = categoria;
      opt.innerText = categoria.charAt(0).toUpperCase() + categoria.slice(1);
      select.appendChild(opt);
    }
    atualizarSeletorOpcoes();
  }

  window.atualizarSeletorOpcoes = function() {
    const categoriaSelect = document.getElementById("categoria");
    const seletor = document.getElementById("opcoes");
    if (!categoriaSelect || !seletor) {
      console.error("❌ Elementos 'categoria' ou 'opcoes' não encontrados");
      alert("Erro: elementos de interface não encontrados.");
      return;
    }
    const categoria = categoriaSelect.value;
    seletor.innerHTML = '<option value="">Selecione uma opção</option>';
    if (categoria && respostas[categoria]) {
      Object.keys(respostas[categoria]).sort().forEach(chave => {
        const opt = document.createElement("option");
        opt.value = `${categoria}:${chave}`;
        opt.innerText = chave.replace(/_/g, " ").toUpperCase();
        seletor.appendChild(opt);
      });
    }
    responder();
  };

  window.responder = function() {
    const opcao = document.getElementById("opcoes").value;
    const resposta = document.getElementById("resposta");
    const titulo = document.getElementById("titulo");
    if (!opcao) {
      if (!resposta.value) {
        resposta.value = "Selecione uma categoria e uma opção para receber uma resposta automática.";
      }
      titulo.value = "";
      ajustarAlturaTextarea();
      return;
    }
    const [categoria, chave] = opcao.split(":");
    resposta.value = respostas[categoria]?.[chave] || "Resposta não encontrada.";
    titulo.value = chave.replace(/_/g, " ").toUpperCase();
    ajustarAlturaTextarea();
  };

  window.salvarEdicao = function() {
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
      alert("Mensagem copiada!");
    } catch (error) {
      console.error("❌ Erro ao copiar texto:", error);
      alert("Erro ao copiar a mensagem.");
    }
  };

  window.apagarTexto = function() {
    const opcao = document.getElementById("opcoes").value;
    if (!opcao || !confirm("Tem certeza que deseja apagar?")) return;
    const [categoria, chave] = opcao.split(":");
    delete respostas[categoria][chave];
    salvarNoFirebase();
    atualizarSeletorOpcoes();
    document.getElementById("resposta").value = "";
    document.getElementById("titulo").value = "";
    alert("Resposta apagada com sucesso!");
  };

  window.mostrarPopupAdicionar = function() {
    const categoriaSelect = document.getElementById("categoria");
    if (!categoriaSelect.value) {
      alert("Selecione uma categoria primeiro!");
      return;
    }
    const novoTitulo = prompt("Digite o título da nova resposta:");
    if (!novoTitulo) return;
    const validacao = validarChave(novoTitulo);
    if (!validacao.valido) {
      alert(validacao.mensagem);
      return;
    }
    const chave = validacao.chaveSanitizada;
    const categoria = categoriaSelect.value;
    if (respostas[categoria][chave]) {
      alert("Esse título já existe nesta categoria!");
      return;
    }
    respostas[categoria][chave] = "[SAUDACAO] Nova resposta aqui... [DESPEDIDA]";
    salvarNoFirebase();
    atualizarSeletorOpcoes();
    document.getElementById("opcoes").value = `${categoria}:${chave}`;
    responder();
    alert("Nova resposta adicionada com sucesso!");
  };

  window.alterarCategoria = function() {
    const opcao = document.getElementById("opcoes").value;
    if (!opcao) {
      alert("Selecione uma resposta primeiro!");
      return;
    }
    const [oldCategoria, chave] = opcao.split(":");
    const novaCategoria = prompt("Digite a nova categoria (ex.: suporte, financeiro, geral):", oldCategoria);
    const validacao = validarChave(novaCategoria);
    if (!validacao.valido) {
      alert(validacao.mensagem);
      return;
    }
    const novaCategoriaKey = validacao.chaveSanitizada;
    if (novaCategoriaKey === oldCategoria) return;
    if (respostas[novaCategoriaKey]?.[chave]) {
      alert("Este título já existe na categoria selecionada!");
      return;
    }
    if (!respostas[novaCategoriaKey]) {
      respostas[novaCategoriaKey] = {};
    }
    respostas[novaCategoriaKey][chave] = respostas[oldCategoria][chave];
    delete respostas[oldCategoria][chave];
    salvarNoFirebase();
    atualizarSeletorCategorias();
    document.getElementById("categoria").value = novaCategoriaKey;
    atualizarSeletorOpcoes();
    document.getElementById("opcoes").value = `${novaCategoriaKey}:${chave}`;
    responder();
    alert("Categoria alterada com sucesso!");
  };

  window.toggleEditarTitulo = function() {
    const titleContainer = document.getElementById("titleContainer");
    const opcao = document.getElementById("opcoes").value;
    if (!opcao) {
      alert("Selecione uma opção primeiro!");
      return;
    }
    titleContainer.style.display = titleContainer.style.display === "flex" ? "none" : "flex";
    if (titleContainer.style.display === "flex") {
      const [categoria, chave] = opcao.split(":");
      document.getElementById("titulo").value = chave.replace(/_/g, " ").toUpperCase();
    }
  };

  window.salvarNovoTitulo = function() {
    const opcaoAntiga = document.getElementById("opcoes").value;
    if (!opcaoAntiga) {
      alert("Selecione uma opção primeiro!");
      return;
    }
    const novoTitulo = document.getElementById("titulo").value.trim();
    const validacao = validarChave(novoTitulo);
    if (!validacao.valido) {
      alert(validacao.mensagem);
      return;
    }
    const novoChave = validacao.chaveSanitizada;
    const [categoria, oldChave] = opcaoAntiga.split(":");
    if (novoChave === oldChave) return;
    if (respostas[categoria][novoChave]) {
      alert("Este título já existe nesta categoria!");
      return;
    }
    respostas[categoria][novoChave] = respostas[categoria][oldChave];
    delete respostas[categoria][oldChave];
    salvarNoFirebase();
    atualizarSeletorOpcoes();
    document.getElementById("opcoes").value = `${categoria}:${novoChave}`;
    responder();
    document.getElementById("titleContainer").style.display = "none";
    alert("Título alterado com sucesso!");
  };

  function ajustarAlturaTextarea() {
    const textarea = document.getElementById("resposta");
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
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

  // Inicializar
  atualizarSaudacao();
  setInterval(atualizarSaudacao, 600000); // Atualiza saudação a cada 10 minutos
  carregarDoFirebase(atualizarSeletorCategorias);
});