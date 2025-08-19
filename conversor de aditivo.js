document.addEventListener('DOMContentLoaded', () => {
    // Ensure pdf.js is loaded
    if (typeof pdfjsLib === 'undefined') {
        console.error('pdf.js library not loaded');
        showPopup('Erro ao carregar a biblioteca PDF.js. Tente novamente mais tarde.');
        return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const body = document.body;
    const darkModeToggle = document.getElementById('darkModeToggle');
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        body.classList.add('dark');
        darkModeToggle.innerText = '☀️';
    } else {
        darkModeToggle.innerText = '🌙';
    }

    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark');
        localStorage.setItem('darkMode', body.classList.contains('dark'));
        darkModeToggle.innerText = body.classList.contains('dark') ? '☀️' : '🌙';
    });

    const selfWithdrawal = document.getElementById('selfWithdrawal');
    const withdrawalSection = document.getElementById('withdrawalSection');
    const withdrawalDate = document.getElementById('withdrawalDate');
    const installationDate = document.getElementById('installationDate');
    const renewal = document.getElementById('renewal');
    const taxSection = document.getElementById('taxSection');
    const phoneInput = document.getElementById('phone');
    const technicianInput = document.getElementById('technician');
    const phoneError = document.getElementById('phoneError');
    const pdfUpload = document.getElementById('pdfUpload');
    const fileNameDisplay = document.getElementById('fileName');

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().slice(0, 10);
    withdrawalDate.min = minDate;
    installationDate.min = minDate;

    // Auto-abrir date picker
    [withdrawalDate, installationDate].forEach(dateInput => {
        dateInput.addEventListener('click', () => {
            try {
                dateInput.showPicker();
            } catch (e) {
                console.log('showPicker not supported, allowing manual input');
            }
        });
    });

    // Mostrar nome do arquivo selecionado
    pdfUpload.addEventListener('change', () => {
        const file = pdfUpload.files[0];
        fileNameDisplay.innerText = file ? file.name : 'Nenhum arquivo selecionado';
    });

    selfWithdrawal.addEventListener('change', () => {
        if (selfWithdrawal.checked) {
            withdrawalSection.style.display = 'none';
            withdrawalDate.required = false;
            document.getElementById('withdrawalPeriod').required = false;
        } else {
            withdrawalSection.style.display = 'block';
            withdrawalDate.required = true;
            document.getElementById('withdrawalPeriod').required = true;
        }
        updateInstallationMin();
    });

    renewal.addEventListener('change', () => {
        taxSection.style.display = renewal.checked ? 'none' : 'block';
    });

    // Inicializar visibilidade da seção de taxa
    taxSection.style.display = renewal.checked ? 'none' : 'block';

    withdrawalDate.addEventListener('change', updateInstallationMin);

    function updateInstallationMin() {
        if (!selfWithdrawal.checked && withdrawalDate.value) {
            installationDate.min = withdrawalDate.value;
        } else {
            installationDate.min = minDate;
        }
    }

    // Carregar técnico salvo
    const savedTechnician = localStorage.getItem('technician');
    if (savedTechnician) {
        technicianInput.value = savedTechnician;
    }

    // Salvar técnico ao mudar
    technicianInput.addEventListener('input', () => {
        localStorage.setItem('technician', technicianInput.value);
    });

    // Validar e formatar telefone ao perder foco
    phoneInput.addEventListener('blur', () => {
        const { formatted, isValid } = formatPhone(phoneInput.value);
        phoneInput.value = formatted;
        phoneError.textContent = isValid ? '' : 'Número de telefone inválido. Use 8 ou 9 dígitos após o DDD.';
    });
});

function showPopup(message) {
    const popup = document.getElementById('popup');
    popup.innerText = message;
    popup.classList.add('show');
    setTimeout(() => {
        popup.classList.remove('show');
    }, 1500);
}

async function loadPDF() {
    try {
        const file = document.getElementById('pdfUpload').files[0];
        if (!file) {
            showPopup('Selecione um arquivo PDF.');
            return;
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        let text = textContent.items.map(item => item.str).join(' ');

        // Extrair dados
        const contratoMatch = text.match(/Aditivo do Contrato (\d+)/);
        const contrato = contratoMatch ? contratoMatch[1] : '';

        const nameMatch = text.match(/CONTRATADA e ([\s\S]*?),\s*CPF\/CNPJ: ([\d.-]+)/);
        let fullNome = nameMatch ? nameMatch[1].replace(/\s+/g, ' ').trim() : '';
        const cpf = nameMatch ? nameMatch[2] : '';
        const shortNome = fullNome.split(' ')[0].toUpperCase();

        const oldMatch = text.match(/2 - Sobre o\(s\) antigo\(s\) endereco\(s\) de cobrança e instalação\s+([\s\S]*? \/ RJ\.)\s+([\s\S]*? \/ RJ\.)/);
        const oldInstall = oldMatch ? oldMatch[2] : '';

        const newMatch = text.match(/3 - Sobre o\(s\) novo\(s\) endereco\(s\) de cobrança e instalação\s+([\s\S]*? \/ RJ\.)\s+([\s\S]*? \/ RJ\.)/);
        const newInstall = newMatch ? newMatch[2] : '';

        // Formatar endereços
        const formatAddress = (addr) => {
            const parts = addr.split(',').slice(0, 3).map(part => part.trim());
            return parts.join(',').toUpperCase();
        };

        const formattedOld = formatAddress(oldInstall);
        const formattedNew = formatAddress(newInstall);

        if (!contrato || !fullNome || !formattedOld || !formattedNew) {
            showPopup('Não foi possível extrair todos os dados do PDF. Verifique o formato.');
            return;
        }

        // Preencher spans
        document.getElementById('contratoSpan').innerText = contrato;
        document.getElementById('nomeSpan').innerText = fullNome;
        document.getElementById('contrato').innerText = contrato;
        document.getElementById('nome').innerText = fullNome;
        document.getElementById('oldAddress').innerText = formattedOld;
        document.getElementById('newAddress').innerText = formattedNew;

        // Mostrar seção
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('dataSection').style.display = 'block';
        document.getElementById('phoneError').textContent = '';

        window.contrato = contrato;
        window.shortNome = shortNome;
        window.formattedOld = formattedOld;
        window.formattedNew = formattedNew;
        window.motivo = 'MUD ENDEREÇO';
    } catch (error) {
        console.error('Erro ao processar PDF:', error);
        showPopup('Erro ao processar o PDF. Verifique o arquivo e tente novamente.');
    }
}

function backToUpload() {
    document.getElementById('dataSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('pdfUpload').value = '';
    document.getElementById('fileName').innerText = 'Nenhum arquivo selecionado';
    document.getElementById('output').innerText = '';
    document.getElementById('phone').value = '';
    document.getElementById('phoneError').textContent = '';
    document.getElementById('copyButtons').style.display = 'none';
}

function generateOS() {
    try {
        const phoneInput = document.getElementById('phone');
        const { formatted: phone, isValid } = formatPhone(phoneInput.value.trim());
        phoneInput.value = phone;
        if (!isValid) {
            document.getElementById('phoneError').textContent = 'Número de telefone inválido. Use 8 ou 9 dígitos após o DDD.';
            return;
        }

        const technician = document.getElementById('technician').value.trim().toUpperCase();
        const equipmentType = document.getElementById('equipmentType').value;
        const isSelfWithdrawal = document.getElementById('selfWithdrawal').checked;
        const isRenewal = document.getElementById('renewal').checked;
        const signatureType = document.getElementById('signature').value;
        const taxValue = isRenewal ? '' : document.getElementById('taxValue').value;
        const output = document.getElementById('output');

        if (!phone || !technician) {
            showPopup('Preencha o telefone e o nome do técnico.');
            return;
        }

        let equipment = equipmentType === 'alcl' ? 'ALCL' : `FIBERHOME + ${equipmentType.toUpperCase()}`;

        let withdrawalText = '';
        let scheduleLines = '';
        let withdrawalDay = '';
        let withdrawalPeriod = '';

        if (!isSelfWithdrawal) {
            withdrawalDay = formatDate(document.getElementById('withdrawalDate').value);
            withdrawalPeriod = document.getElementById('withdrawalPeriod').value;
            if (!withdrawalDay) {
                showPopup('Selecione a data de retirada.');
                return;
            }
            scheduleLines += `${withdrawalDay} - ${window.contrato} - ${window.shortNome} - ${window.formattedOld} - ${window.motivo} - ${withdrawalPeriod} - ${technician}\n`;
            withdrawalText = `RETIRAR NO ENDEREÇO ${window.formattedOld} NO DIA ${withdrawalDay} ${withdrawalPeriod}`;
        } else {
            withdrawalText = 'CLIENTE FAZ A RETIRADA POR CONTA PRÓPRIA';
        }

        const installationDay = formatDate(document.getElementById('installationDate').value);
        const installationPeriod = document.getElementById('installationPeriod').value;
        if (!installationDay) {
            showPopup('Selecione a data de instalação.');
            return;
        }

        if (!isSelfWithdrawal && new Date(document.getElementById('installationDate').value) < new Date(document.getElementById('withdrawalDate').value)) {
            showPopup('A data de instalação não pode ser antes da data de retirada.');
            return;
        }

        scheduleLines += `${installationDay} - ${window.contrato} - ${window.shortNome} - ${window.formattedNew} - ${window.motivo} - ${installationPeriod} - ${technician}\n`;

        let taxText = isRenewal ? 'ISENTO DA TAXA DEVIDO A RENOVAÇÃO.' : `TAXA DE R$${taxValue}.`;
        let signatureText = signatureType === 'local' ? 'TITULAR NO LOCAL PARA ASSINATURA.' : 'ASSINATURA DIGITAL PENDENTE (VERIFICAR).';

        const osText = `${phone} ${window.shortNome} | ** ${equipment} ** \n${withdrawalText}\nINSTALAR NO ENDEREÇO ${window.formattedNew} NO DIA ${installationDay} ${installationPeriod}. \n${taxText}\n${signatureText}`;

        output.innerText = `${scheduleLines}\n${osText}`;

        // Mostrar botões de cópia
        document.getElementById('copyButtons').style.display = 'flex';

        // Armazenar textos para cópia
        window.scheduleLines = scheduleLines;
        window.withdrawalLine = scheduleLines.split('\n')[0] || '';
        window.installationLine = scheduleLines.split('\n')[1] || '';
        window.osText = osText;
    } catch (error) {
        console.error('Erro ao gerar O.S:', error);
        showPopup('Erro ao gerar a O.S. Verifique os dados e tente novamente.');
    }
}

function copyWithdrawal() {
    navigator.clipboard.writeText(window.withdrawalLine).then(() => showPopup('Retirada copiada!'));
}

function copyInstallation() {
    navigator.clipboard.writeText(window.installationLine).then(() => showPopup('Instalação copiada!'));
}

function copyOS() {
    navigator.clipboard.writeText(window.osText).then(() => showPopup('O.S copiada!'));
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
}

function formatPhone(input) {
    // Remover não-dígitos
    let digits = input.replace(/\D/g, '');

    // Remover +55 ou 55 inicial
    if (digits.startsWith('55')) {
        digits = digits.slice(2);
    }

    // Validar com regex: DDD (2 dígitos) + 8 ou 9 dígitos
    const phoneRegex = /^(\d{2})(\d{8,9})$/;
    const match = digits.match(phoneRegex);

    if (!match) {
        return { formatted: input, isValid: false };
    }

    const ddd = match[1];
    const number = match[2];

    let formattedNumber;
    if (number.length === 9) {
        // Celular: XXXXX-XXXX
        formattedNumber = `${number.slice(0, 5)}-${number.slice(5)}`;
    } else {
        // Fixo: XXXX-XXXX
        formattedNumber = `${number.slice(0, 4)}-${number.slice(4)}`;
    }

    return { formatted: `${ddd} ${formattedNumber}`, isValid: true };
}