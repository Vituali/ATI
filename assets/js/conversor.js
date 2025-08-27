import { showPopup, replacePlaceholders } from './ui.js';

// Define o worker do PDF.js para o módulo
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// --- Funções Auxiliares do Módulo ---

function formatAddress(fullAddress) {
    if (!fullAddress || typeof fullAddress !== 'string') return 'N/A';
    // Exemplo de entrada: "RUA YEDA,781, TIJUCA, 25975-560, TERESOPOLIS/RJ."
    const parts = fullAddress.split(','); // ["RUA YEDA", "781", " TIJUCA", ...]
    if (parts.length < 3) return fullAddress; // Retorna o original se o formato for inesperado

    // 1. Pega as 3 primeiras partes: "RUA YEDA,781, TIJUCA"
    let address = parts.slice(0, 3).join(',');
    // 2. Substitui a primeira vírgula por um espaço: "RUA YEDA 781, TIJUCA"
    address = address.replace(',', ' ');
    return address.trim();
}

function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const isValid = /^[1-9]{2}(9?\d{8})$/.test(cleaned);
    let formatted = cleaned;
    if (isValid) {
        if (cleaned.length === 10) { // Fixo
            formatted = `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        } else if (cleaned.length === 11) { // Celular
            formatted = `${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        }
    }
    return { formatted, isValid };
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
}

// --- Função Principal de Inicialização ---

export function initializeConversor() {
    let pdfData = {};
    let osTextData = { withdrawal: '', installation: '', os: '' };

    const elements = {
        uploadSection: document.getElementById('uploadSection'),
        dataSection: document.getElementById('dataSection'),
        withdrawalSection: document.getElementById('withdrawalSection'),
        copyButtons: document.getElementById('copyButtons'),
        contratoSpan: document.getElementById('contratoSpan'),
        contrato: document.getElementById('contrato'),
        nome: document.getElementById('nome'),
        oldAddress: document.getElementById('oldAddress'),
        newAddress: document.getElementById('newAddress'),
        fileName: document.getElementById('fileName'),
        phoneError: document.getElementById('phoneError'),
        renewalMessage: document.getElementById('renewalMessage'),
        migrationMessage: document.getElementById('migrationMessage'),
        output: document.getElementById('output'),
        pdfUpload: document.getElementById('pdfUpload'),
        phone: document.getElementById('phone'),
        equipmentType: document.getElementById('equipmentType'),
        withdrawalDate: document.getElementById('withdrawalDate'),
        withdrawalPeriod: document.getElementById('withdrawalPeriod'),
        installationDate: document.getElementById('installationDate'),
        installationPeriod: document.getElementById('installationPeriod'),
        taxValue: document.getElementById('taxValue'),
        signature: document.getElementById('signature'),
        selfWithdrawal: document.getElementById('selfWithdrawal'),
        renewal: document.getElementById('renewal'),
        migration: document.getElementById('migration'),
        carrierSection: document.getElementById('carrierSection'), // ADICIONAR
        oldCarrier: document.getElementById('oldCarrier'), 
        loadPdfBtn: document.getElementById('loadPdfBtn'),
        generateOsBtn: document.getElementById('generateOsBtn'),
        backToUploadBtn: document.getElementById('backToUploadBtn'),
        copyWithdrawalBtn: document.getElementById('copyWithdrawalBtn'),
        copyInstallationBtn: document.getElementById('copyInstallationBtn'),
        copyOsBtn: document.getElementById('copyOsBtn'),
    };

    const setMinDates = () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        elements.withdrawalDate.min = minDate;
        elements.installationDate.min = minDate;
    };

    const updateInstallationMinDate = () => {
        if (!elements.selfWithdrawal.checked && elements.withdrawalDate.value) {
            elements.installationDate.min = elements.withdrawalDate.value;
        } else {
            setMinDates();
        }
    };

    const updateTaxLogic = () => {
        const isExempt = elements.renewal.checked || elements.migration.checked;
        elements.taxValue.disabled = isExempt;
        elements.renewalMessage.style.display = elements.renewal.checked ? 'block' : 'none';
        elements.migrationMessage.style.display = elements.migration.checked ? 'block' : 'none';
        elements.carrierSection.style.display = elements.migration.checked ? 'block' : 'none';
        elements.taxValue.value = isExempt ? 'isento' : '100';
    };
    
    const handleCheckboxExclusion = (event) => {
        const { id, checked } = event.target;
        if (id === 'renewal') {
            elements.migration.disabled = checked;
        } else if (id === 'migration') {
            elements.renewal.disabled = checked;
        }
    };

    const resetForm = () => {
        pdfData = {};
        osTextData = { withdrawal: '', installation: '', os: '' };
        elements.dataSection.style.display = 'none';
        elements.uploadSection.style.display = 'block';
        elements.pdfUpload.value = '';
        elements.fileName.textContent = 'Nenhum arquivo selecionado';
        elements.output.textContent = '';
        elements.phone.value = '';
        elements.phoneError.textContent = '';
        elements.copyButtons.style.display = 'none';
        elements.renewal.checked = false;
        elements.carrierSection.style.display = 'none';
        elements.oldCarrier.value = 'none';
        elements.migration.checked = false;
        elements.selfWithdrawal.checked = false;
        elements.migration.disabled = false;
        elements.renewal.disabled = false;
        updateTaxLogic();
    };

    async function handlePdfLoad() {
        const file = elements.pdfUpload.files[0];
        if (!file) return showPopup('Por favor, selecione um arquivo PDF.');
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const text = (await (await pdf.getPage(1)).getTextContent()).items.map(item => item.str).join(' ');

            // --- LÓGICA DE EXTRAÇÃO CORRIGIDA USANDO SUA REGEX ORIGINAL E FUNCIONAL ---

            // Esta é a expressão regular correta do seu código original, que busca duas linhas de endereço.
            const oldAddressRegex = /2 - Sobre o\(s\) antigo\(s\) endereco\(s\) de cobrança e instalação\s+([\s\S]*? \/ RJ\.)\s+([\s\S]*? \/ RJ\.)/;
            const newAddressRegex = /3 - Sobre o\(s\) novo\(s\) endereco\(s\) de cobrança e instalação\s+([\s\S]*? \/ RJ\.)\s+([\s\S]*? \/ RJ\.)/;

            pdfData.contrato = text.match(/Aditivo do Contrato (\d+)/)?.[1] || 'N/A';
            pdfData.nomeCompleto = text.match(/CONTRATADA e ([\s\S]*?),/)?.[1].trim() || 'N/A';
            pdfData.primeiroNome = pdfData.nomeCompleto.split(' ')[0].toUpperCase();
            
            // Acessamos o grupo [2], que é o segundo endereço capturado, exatamente como no seu código.
            const rawOldAddress = oldAddressRegex.exec(text)?.[2].trim().toUpperCase();
            const rawNewAddress = newAddressRegex.exec(text)?.[2].trim().toUpperCase();

            pdfData.oldAddress = formatAddress(rawOldAddress) || 'Endereço antigo não encontrado';
            pdfData.newAddress = formatAddress(rawNewAddress) || 'Endereço novo não encontrado';

            // Preenche a UI com os dados
            elements.contratoSpan.textContent = pdfData.contrato;
            elements.contrato.textContent = pdfData.contrato;
            elements.nome.textContent = pdfData.nomeCompleto;
            elements.oldAddress.textContent = pdfData.oldAddress;
            elements.newAddress.textContent = pdfData.newAddress;

            elements.uploadSection.style.display = 'none';
            elements.dataSection.style.display = 'block';

        } catch (error) {
            console.error('Erro ao processar PDF:', error);
            showPopup('Erro ao ler o arquivo PDF.');
            resetForm();
        }
    }

    function handleGenerateOS() {
        const technician = localStorage.getItem('atendenteAtual')?.toUpperCase();
        if (!technician) return showPopup('Selecione um atendente antes de gerar a OS.');

        const { formatted: phone, isValid } = formatPhone(elements.phone.value);
        if (!isValid) {
            elements.phoneError.textContent = 'Telefone inválido. Ex: (21) 98765-4321';
            return;
        }
        elements.phoneError.textContent = '';
        
        const isSelfWithdrawal = elements.selfWithdrawal.checked;
        const withdrawalDay = formatDate(elements.withdrawalDate.value);
        const installationDay = formatDate(elements.installationDate.value);
        
        if (!isSelfWithdrawal && !withdrawalDay) return showPopup('Data de Retirada é obrigatória.');
        if (!installationDay) return showPopup('Data de Instalação é obrigatória.');
        if (!isSelfWithdrawal && elements.installationDate.value && elements.withdrawalDate.value && new Date(elements.installationDate.value) < new Date(elements.withdrawalDate.value)) {
            return showPopup('Instalação não pode ser antes da Retirada.');
        }

        const withdrawalPeriod = elements.withdrawalPeriod.value.toUpperCase();
        const installationPeriod = elements.installationPeriod.value.toUpperCase();
        
        const signature = elements.signature.value === 'digital' ? 'ASSINATURA DIGITAL PENDENTE' : 'TITULAR NO LOCAL PARA ASSINATURA';
        
        let scheduleLines = '';
        if (!isSelfWithdrawal) {
            osTextData.withdrawal = `${withdrawalDay} - ${pdfData.contrato} - ${pdfData.primeiroNome} - ${pdfData.oldAddress} - MUD ENDEREÇO - ${withdrawalPeriod} - ${technician}`;
            scheduleLines += osTextData.withdrawal + '\n';
        } else {
            osTextData.withdrawal = '';
        }
        
        osTextData.installation = `${installationDay} - ${pdfData.contrato} - ${pdfData.primeiroNome} - ${pdfData.newAddress} - MUD ENDEREÇO - ${installationPeriod} - ${technician}`;
        scheduleLines += osTextData.installation;
        
        // ✅ LINHA CORRIGIDA / READICIONADA ABAIXO
        const withdrawalText = isSelfWithdrawal ? 'CLIENTE FAZ A RETIRADA POR CONTA PRÓPRIA' : `RETIRAR EM ${pdfData.oldAddress} DIA ${withdrawalDay} ${withdrawalPeriod}`;
        
        const taxValue = elements.taxValue.value;
        let taxText;
        if (elements.renewal.checked) {
            taxText = 'ISENTO DA TAXA POR RENOVAÇÃO.';
        } else if (elements.migration.checked) {
            taxText = 'ISENTO DA TAXA POR MIGRAÇÃO.';
        } else if (taxValue === 'isento') {
            taxText = 'ISENTO DA TAXA.';
        } else {
            taxText = `TAXA DE R$${taxValue}.`;
        }

        // --- INÍCIO DA NOVA LÓGICA DO PORTADOR ---
        let carrierText = '';
        if (elements.migration.checked) {
            const selectedCarrier = elements.oldCarrier.value;
            if (selectedCarrier !== 'none') {
                carrierText = `** ANTIGO PORTADOR ${selectedCarrier.toUpperCase()} **\n`;
            }
        }
        // --- FIM DA NOVA LÓGICA ---

        // Adiciona a variável 'carrierText' no início da O.S.
        osTextData.os = `${carrierText}${phone} ${pdfData.primeiroNome} | ** ${elements.equipmentType.value.toUpperCase()} **\n${withdrawalText}.\nINSTALAR EM ${pdfData.newAddress} DIA ${installationDay} ${installationPeriod}.\n${taxText}\n${signature}.`;
        
        const fullOutput = `${scheduleLines}\n\n${osTextData.os}`;
        elements.output.textContent = replacePlaceholders(fullOutput);
        elements.copyButtons.style.display = 'flex';
    }

    // --- Configuração Inicial e Event Listeners ---
    setMinDates();

    elements.loadPdfBtn.addEventListener('click', handlePdfLoad);
    elements.generateOsBtn.addEventListener('click', handleGenerateOS);
    elements.backToUploadBtn.addEventListener('click', resetForm);
    elements.copyWithdrawalBtn.addEventListener('click', () => {
        if(osTextData.withdrawal) navigator.clipboard.writeText(osTextData.withdrawal).then(() => showPopup('Agendamento de Retirada copiado!'));
        else showPopup('Não há agendamento de retirada para copiar.');
    });
    elements.copyInstallationBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(osTextData.installation).then(() => showPopup('Agendamento de Instalação copiado!'));
    });
    elements.copyOsBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(replacePlaceholders(osTextData.os)).then(() => showPopup('Texto da O.S. copiado!'));
    });
    elements.pdfUpload.addEventListener('change', () => {
        elements.fileName.textContent = elements.pdfUpload.files[0]?.name || 'Nenhum arquivo selecionado';
    });
    elements.phone.addEventListener('blur', () => {
        const { formatted, isValid } = formatPhone(elements.phone.value);
        elements.phone.value = formatted;
        elements.phoneError.textContent = isValid ? '' : 'Telefone inválido.';
    });
    elements.selfWithdrawal.addEventListener('change', () => {
        elements.withdrawalSection.style.display = elements.selfWithdrawal.checked ? 'none' : 'block';
        updateInstallationMinDate();
    });
    elements.withdrawalDate.addEventListener('change', updateInstallationMinDate);
    elements.renewal.addEventListener('change', updateTaxLogic);
    elements.migration.addEventListener('change', updateTaxLogic);
    elements.renewal.addEventListener('change', handleCheckboxExclusion);
    elements.migration.addEventListener('change', handleCheckboxExclusion);
}