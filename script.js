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

  let respostas = { suporte: {}, financeiro: {}, geral: {} }; // Estrutura inicial com categorias

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
    const seletor = document.getElementById("seletor");
    if (!categoriaSelect || !seletor) {
      console.error("❌ Elementos 'categoria' ou 'seletor' não encontrados");
      alert("Erro: elementos de interface não encontrados.");
      return;
    }
    const categoria = categoriaSelect.value;
    seletor.innerHTML = '<option value="">Selecione uma opção</option>';
    if (categoria && respostas[categoria]) {
      for (let chave in respostas[categoria]) {
        const opt = document.createElement("option");
        opt.value = chave;
        opt.innerText = chave.replace(/_/g, " ").toUpperCase();
        seletor.appendChild(opt);
      }
    }
    mudarTextoSelecionado();
  };

  window.mudarTextoSelecionado = function() {
    const categoriaSelect = document.getElementById("categoria");
    const seletor = document.getElementById("seletor");
    const texto = document.getElementById("texto");
    if (!categoriaSelect || !seletor || !texto) {
      console.error("❌ Elementos 'categoria', 'seletor' ou 'texto' não encontrados");
      alert("Erro: elementos de interface não encontrados.");
      return;
    }
    const categoria = categoriaSelect.value;
    const chave = seletor.value;
    if (categoria && chave && respostas[categoria][chave]) {
      texto.value = respostas[categoria][chave];
    } else if (!texto.value) {
      texto.value = "Selecione uma categoria e uma opção para receber uma resposta automática.";
    }
    ajustarAlturaTextarea();
  };

  window.atualizarTextoSelecionado = function() {
    const categoriaSelect = document.getElementById("categoria");
    const seletor = document.getElementById("seletor");
    const texto = document.getElementById("texto");
    if (!categoriaSelect || !seletor || !texto) {
      console.error("❌ Elementos 'categoria', 'seletor' ou 'texto' não encontrados");
      return;
    }
    const categoria = categoriaSelect.value;
    const chave = seletor.value;
    if (categoria && chave) {
      respostas[categoria][chave] = texto.value;
      salvarNoFirebase();
    }
  };

  window.adicionarOpcao = function() {
    const categoriaSelect = document.getElementById("categoria");
    const novaOpcaoInput = document.getElementById("novaOpcao");
    if (!categoriaSelect || !novaOpcaoInput) {
      console.error("❌ Elementos 'categoria' ou 'novaOpcao' não encontrados");
      alert("Erro: campo de categoria ou nova opção não encontrado.");
      return;
    }
    const categoria = categoriaSelect.value;
    if (!categoria) {
      alert("Por favor, selecione uma categoria antes de adicionar uma opção.");
      return;
    }
    const novaOpcao = novaOpcaoInput.value.trim().toLowerCase().replace(/ /g, "_");
    if (!novaOpcao) {
      alert("Por favor, digite uma nova opção válida.");
      return;
    }
    if (respostas[categoria][novaOpcao]) {
      alert("Essa opção já existe nesta categoria!");
      return;
    }
    respostas[categoria][novaOpcao] = "";
    console.log(`➕ Nova opção adicionada em ${categoria}:`, novaOpcao);
    salvarNoFirebase();
    atualizarSeletorOpcoes();
    novaOpcaoInput.value = "";
  };

  window.adicionarCategoria = function() {
    const novaCategoria = prompt("Digite o nome da nova categoria:");
    if (!novaCategoria) {
      alert("Por favor, digite um nome válido para a categoria.");
      return;
    }
    const categoriaKey = novaCategoria.trim().toLowerCase().replace(/ /g, "_");
    if (respostas[categoriaKey]) {
      alert("Essa categoria já existe!");
      return;
    }
    respostas[categoriaKey] = {};
    console.log("➕ Nova categoria adicionada:", categoriaKey);
    salvarNoFirebase();
    atualizarSeletorCategorias();
  };

  window.copiarTexto = function() {
    const texto = document.getElementById("texto");
    if (!texto) {
      console.error("❌ Elemento 'texto' não encontrado");
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

  function ajustarAlturaTextarea() {
    const textarea = document.getElementById("texto");
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