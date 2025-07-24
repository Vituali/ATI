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

  try {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase inicializado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
    alert("Erro ao conectar com o banco de dados.");
  }

  const db = firebase.database();
  let respostas = {};

  function salvarNoFirebase() {
    db.ref("respostas").set(respostas)
      .then(() => {
        console.log("🔥 Alterações salvas no Firebase");
      })
      .catch((error) => {
        console.error("❌ Erro ao salvar no Firebase:", error);
        alert("Erro ao salvar a nova opção. Verifique o console para mais detalhes.");
      });
  }

  function carregarDoFirebase(callback) {
    db.ref("respostas").on("value", (snapshot) => {
      try {
        const data = snapshot.val();
        respostas = data || {};
        console.log("📥 Dados carregados do Firebase:", respostas);
        callback();
      } catch (error) {
        console.error("❌ Erro ao carregar dados do Firebase:", error);
        alert("Erro ao carregar dados. Verifique o console para mais detalhes.");
      }
    }, (error) => {
      console.error("❌ Erro na conexão com Firebase:", error);
    });
  }

  function renderizarSelects() {
    const select = document.getElementById("seletor");
    if (!select) {
      console.error("❌ Elemento 'seletor' não encontrado no DOM");
      return;
    }
    select.innerHTML = '<option value="">Selecione uma opção</option>';
    for (let chave in respostas) {
      const opt = document.createElement("option");
      opt.value = chave;
      opt.innerText = chave.replace(/_/g, " ").toUpperCase();
      select.appendChild(opt);
    }
    mudarTextoSelecionado();
  }

  function mudarTextoSelecionado() {
    const seletor = document.getElementById("seletor");
    const texto = document.getElementById("texto");
    if (!seletor || !texto) {
      console.error("❌ Elementos 'seletor' ou 'texto' não encontrados no DOM");
      return;
    }
    const chave = seletor.value;
    texto.value = respostas[chave] || "Selecione uma opção para receber uma resposta automática.";
    ajustarAlturaTextarea();
  }

  function atualizarTextoSelecionado() {
    const seletor = document.getElementById("seletor");
    const texto = document.getElementById("texto");
    if (!seletor || !texto) {
      console.error("❌ Elementos 'seletor' ou 'texto' não encontrados no DOM");
      return;
    }
    const chave = seletor.value;
    if (chave) {
      respostas[chave] = texto.value;
      salvarNoFirebase();
    }
  }

  function adicionarOpcao() {
    const novaOpcaoInput = document.getElementById("novaOpcao");
    if (!novaOpcaoInput) {
      console.error("❌ Elemento 'novaOpcao' não encontrado no DOM");
      return;
    }
    const novaOpcao = novaOpcaoInput.value.trim().toLowerCase().replace(/ /g, "_");
    if (!novaOpcao) {
      alert("Por favor, digite uma nova opção válida.");
      return;
    }
    if (respostas[novaOpcao]) {
      alert("Essa opção já existe!");
      return;
    }
    respostas[novaOpcao] = "";
    console.log("➕ Nova opção adicionada localmente:", novaOpcao);
    salvarNoFirebase();
    renderizarSelects();
    novaOpcaoInput.value = "";
  }

  function copiarTexto() {
    const texto = document.getElementById("texto");
    if (!texto) {
      console.error("❌ Elemento 'texto' não encontrado no DOM");
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
  }

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

  // Initialize
  atualizarSaudacao();
  setInterval(atualizarSaudacao, 600000); // Update greeting every 10 minutes
  carregarDoFirebase(renderizarSelects);
});