document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ conversor.js loaded");

    // Configure pdf.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log("✅ pdf.js worker configured");
    } else {
        console.error("❌ pdf.js not loaded");
        window.showPopup("Erro: Biblioteca pdf.js não carregada.");
        return;
    }

    const phoneInput = document.getElementById("phone");
    const pdfUpload = document.getElementById("pdfUpload");
    const fileName = document.getElementById("fileName");

    if (pdfUpload && fileName) {
        pdfUpload.addEventListener("change", () => {
            fileName.textContent = pdfUpload.files[0]?.name || "Nenhum arquivo selecionado";
        });
    }

    window.loadPDF = async function() {
        console.log("🖱️ Loading PDF");
        if (!pdfUpload.files[0]) {
            window.showPopup("Por favor, selecione um arquivo PDF.");
            return;
        }

        try {
            const file = pdfUpload.files[0];
            const fileReader = new FileReader();
            fileReader.onload = async function() {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let text = "";

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map(item => item.str).join(" ") + " ";
                }

                const contratoMatch = text.match(/Contrato\s*:\s*(\d+)/i);
                const nomeMatch = text.match(/Nome\s*:\s*([A-Za-z\s]+)/i);
                const oldAddressMatch = text.match(/Endereço Antigo\s*:\s*([A-Za-z0-9\s,.-]+)/i);
                const newAddressMatch = text.match(/Endereço Novo\s*:\s*([A-Za-z0-9\s,.-]+)/i);

                document.getElementById("contrato").textContent = contratoMatch ? contratoMatch[1] : "Não encontrado";
                document.getElementById("contratoSpan").textContent = contratoMatch ? contratoMatch[1] : "Não encontrado";
                document.getElementById("nome").textContent = nomeMatch ? nomeMatch[1].trim() : "Não encontrado";
                document.getElementById("oldAddress").textContent = oldAddressMatch ? oldAddressMatch[1].trim() : "Não encontrado";
                document.getElementById("newAddress").textContent = newAddressMatch ? newAddressMatch[1].trim() : "Não encontrado";

                document.getElementById("uploadSection").style.display = "none";
                document.getElementById("dataSection").style.display = "block";
                window.atualizarSaudacao();
            };
            fileReader.readAsArrayBuffer(file);
        } catch (error) {
            console.error("❌ Erro ao carregar PDF:", error);
            window.showPopup("Erro ao processar o PDF: " + error.message);
        }
    };

    window.backToUpload = function() {
        document.getElementById("uploadSection").style.display = "block";
        document.getElementById("dataSection").style.display = "none";
        document.getElementById("output").textContent = "";
        document.getElementById("copyButtons").style.display = "none";
        document.getElementById("phone").value = "";
        document.getElementById("fileName").textContent = "Nenhum arquivo selecionado";
        pdfUpload.value = "";
    };

    window.generateOS = function() {
        console.log("🖱️ Generating O.S");
        const contrato = document.getElementById("contrato").textContent;
        const nome = document.getElementById("nome").textContent;
        const oldAddress = document.getElementById("oldAddress").textContent;
        const newAddress = document.getElementById("newAddress").textContent;
        const phone = document.getElementById("phone").value;
        const equipmentType = document.getElementById("equipmentType").value;
        const selfWithdrawal = document.getElementById("selfWithdrawal").checked;
        const withdrawalDate = document.getElementById("withdrawalDate").value;
        const withdrawalPeriod = document.getElementById("withdrawalPeriod").value;
        const installationDate = document.getElementById("installationDate").value;
        const installationPeriod = document.getElementById("installationPeriod").value;
        const renewal = document.getElementById("renewal").checked;
        const migration = document.getElementById("migration").checked;
        const taxValue = document.getElementById("taxValue").value;
        const signature = document.getElementById("signature").value;

        if (!phone.match(/^\(\d{2}\)\s*\d{4,5}-\d{4}$/)) {
            document.getElementById("phoneError").textContent = "Por favor, insira um número de telefone válido (ex.: (XX) XXXXX-XXXX).";
            return;
        }
        document.getElementById("phoneError").textContent = "";

        const today = new Date();
        const withdrawalDateObj = new Date(withdrawalDate);
        if (withdrawalDateObj <= today) {
            window.showPopup("A data de retirada deve ser a partir de amanhã.");
            return;
        }
        if (installationDate < withdrawalDate) {
            window.showPopup("A data de instalação não pode ser anterior à data de retirada.");
            return;
        }

        const saudacao = document.getElementById("saudacaoDespedidaText").textContent;
        const output = document.getElementById("output");
        output.innerHTML = `
            <h4>Ordem de Serviço</h4>
            <p><strong>Contrato:</strong> ${contrato}</p>
            <p><strong>Nome:</strong> ${nome}</p>
            <p><strong>Telefone:</strong> ${phone}</p>
            <p><strong>Endereço Antigo:</strong> ${oldAddress}</p>
            <p><strong>Endereço Novo:</strong> ${newAddress}</p>
            <p><strong>Motivo:</strong> MUD ENDEREÇO</p>
            <p><strong>Tipo de Comodato:</strong> ${equipmentType}</p>
            <p><strong>Retirada:</strong> ${selfWithdrawal ? "Cliente faz a retirada por conta própria" : `Data: ${withdrawalDate}, Período: ${withdrawalPeriod}`}</p>
            <p><strong>Instalação:</strong> Data: ${installationDate}, Período: ${installationPeriod}</p>
            <p><strong>Taxa:</strong> ${renewal || migration ? "Isento" : taxValue}</p>
            <p><strong>Assinatura:</strong> ${signature}</p>
            <p>${saudacao}, ${nome}! Sua solicitação de mudança de endereço foi registrada.</p>
        `;
        document.getElementById("copyButtons").style.display = "flex";
    };

    window.copyWithdrawal = function() {
        const selfWithdrawal = document.getElementById("selfWithdrawal").checked;
        const withdrawalDate = document.getElementById("withdrawalDate").value;
        const withdrawalPeriod = document.getElementById("withdrawalPeriod").value;
        const text = selfWithdrawal ? "Cliente faz a retirada por conta própria" : `Retirada: Data: ${withdrawalDate}, Período: ${withdrawalPeriod}`;
        navigator.clipboard.writeText(text).then(() => {
            window.showPopup("Retirada copiada!");
        });
    };

    window.copyInstallation = function() {
        const installationDate = document.getElementById("installationDate").value;
        const installationPeriod = document.getElementById("installationPeriod").value;
        const text = `Instalação: Data: ${installationDate}, Período: ${installationPeriod}`;
        navigator.clipboard.writeText(text).then(() => {
            window.showPopup("Instalação copiada!");
        });
    };

    window.copyOS = function() {
        const output = document.getElementById("output").textContent;
        navigator.clipboard.writeText(output).then(() => {
            window.showPopup("O.S copiada!");
        });
    };

    if (phoneInput) {
        phoneInput.addEventListener("input", () => {
            phoneInput.value = formatPhoneNumber(phoneInput.value);
        });
    }
});

// Export formatPhoneNumber for use in script.js
export function formatPhoneNumber(value) {
    value = value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length <= 2) return value;
    if (value.length <= 7) return `(${value.slice(0, 2)}) ${value.slice(2)}`;
    return `(${value.slice(0, 2)}) ${value.slice(2, value.length - 4)}-${value.slice(-4)}`;
}