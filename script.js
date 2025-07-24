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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let respostas = {};

function salvarNoFirebase() {
  db.ref("respostas").set(respostas)
    .then(() => console.log("🔥 Alterações salvas"))
    .catch((error) => console.error("❌ Erro ao salvar:", error));
}

function carregarDoFirebase(callback) {
  db.ref("respostas").on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
      respostas = data;
      callback();
    }
  });
}

function renderizarSelects() {
  const select = document.getElementById("seletor");
  select.innerHTML = "";
  for (let chave in respostas) {
    const opt = document.createElement("option");
    opt.value = chave;
    opt.innerText = chave;
    select.appendChild(opt);
  }
  mudarTextoSelecionado();
}

function mudarTextoSelecionado() {
  const seletor = document.getElementById("seletor");
  const texto = document.getElementById("texto");
  const chave = seletor.value;
  texto.value = respostas[chave] || "";
}

function atualizarTextoSelecionado() {
  const seletor = document.getElementById("seletor");
  const chave = seletor.value;
  const novoTexto = document.getElementById("texto").value;
  respostas[chave] = novoTexto;
  salvarNoFirebase();
}

function adicionarOpcao() {
  const novaOpcao = document.getElementById("novaOpcao").value.trim();
  if (novaOpcao && !respostas[novaOpcao]) {
    respostas[novaOpcao] = "";
    salvarNoFirebase();
    renderizarSelects();
    document.getElementById("novaOpcao").value = "";
  }
}

function copiarTexto() {
  const texto = document.getElementById("texto");
  texto.select();
  document.execCommand("copy");
  alert("Mensagem copiada!");
}

carregarDoFirebase(renderizarSelects);
