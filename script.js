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
    const caracteresProibidos = "/[$#[]./]/";
    if (caracteresProibidos.test(chave)) {
      return { valido: false, mensagem: "A chave não pode conter $ # [ ] . ou /." };
    }
    return { valido: true, chaveSanitizada: chave.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") };
  }

  function salvarNoFirebase() {
    const dbRef = firebase.ref(db, "respostas");
    firebase.set(dbRef, respostas)
      .then(() => console.log("🔥 Dados salvos no Firebase"))
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

  window.atualizarSeletorOpcoes = function() {
    const seletor = document.getElementById("opcoes");
    if (!seletor) {
      console.error("❌ Elemento 'opcoes' não encontrado");
      alert("Erro: elemento de opções não encontrado.");
      return;
    }
    seletor.innerHTML = '<option value="">Selecione uma opção</option>';
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
    if (!opcao) {
      if (!resposta.value) {
        resposta.value = "Selecione uma opção para receber uma resposta automática.";
      }
      titulo.value = "";
      ajustarAlturaTextarea();
      return;
    }
    const [categoria, chave] = opcao.split(":");
    resposta.value = substituirMarcadores(respostas[categoria]?.[chave] || "Resposta não encontrada.");
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
    const novoTitulo = prompt("Digite o título da nova resposta:");
    if (!novoTitulo) return;
    const validacao = validarChave(novoTitulo);
    if (!validacao.valido) {
      alert(validacao.mensagem);
      return;
    }
    const chave = validacao.chaveSanitizada;
    const categoriaPrompt = prompt("Digite a categoria (ex.: suporte, financeiro, geral):", "geral");
    const validacaoCategoria = validarChave(categoriaPrompt);
    if (!validacaoCategoria.valido) {
      alert(validacaoCategoria.mensagem);
      return;
    }
    const categoria = validacaoCategoria.chaveSanitizada;
    if (!respostas[categoria]) {
      respostas[categoria] = {};
    }
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

  // Inicializar
  atualizarSaudacao();
  setInterval(atualizarSaudacao, 600000); // Atualiza saudação a cada 10 minutos
  carregarDoFirebase(() => {
    atualizarSeletorOpcoes();
    document.getElementById("resposta").value = "";
    responder();
  });
});