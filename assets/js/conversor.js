import { showPopup, replacePlaceholders } from './ui.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// --- Variáveis Globais do Módulo ---
let elements = {};
let pdfData = {};
let osTextData = { withdrawal: '', installation: '', os: '' };
let oldPlaceDetails = null;
let newPlaceDetails = null;
let isApiReady = false; // Flag para controlar o estado da API do Google
let hasPdfData = false; // Flag para controlar se os dados do PDF já foram lidos

// --- Funções Auxiliares ---
function formatAddress(fullAddress) {
    if (!fullAddress || typeof fullAddress !== 'string') return 'N/A';
    const parts = fullAddress.split(',');
    if (parts.length < 3) return fullAddress;
    let address = parts.slice(0, 3).join(',');
    return address.replace(',', ' ').trim();
}

function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const isValid = /^[1-9]{2}(9?\d{8})$/.test(cleaned);
    let formatted = cleaned;
    if (isValid) {
        if (cleaned.length === 10) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        else if (cleaned.length === 11) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return { formatted, isValid };
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
}

// --- Lógica da API do Google Maps ---

/**
 * Função central que só é executada quando AMBOS o PDF foi lido E a API do Google está pronta.
 */
function attemptApiDependentTasks() {
    // CORREÇÃO: Usa um setTimeout para garantir que os componentes do Google estejam prontos.
    if (isApiReady && hasPdfData) {
        setTimeout(() => {
            // 1. É seguro preencher os campos de endereço do Google
            elements.oldAddressInput.value = pdfData.oldAddress;
            elements.newAddressInput.value = pdfData.newAddress;

            // 2. É seguro tentar calcular a distância
            triggerDistanceCalculation();
        }, 0); // O delay de 0ms adia a execução para o próximo ciclo de eventos.
    }
}

function triggerDistanceCalculation() {
    if (!isApiReady) return; 

    let origin, destination;

    if (oldPlaceDetails && oldPlaceDetails.geometry) {
        origin = oldPlaceDetails.geometry.location;
    } else {
        const originAddress = elements.oldAddressInput.value;
        if (!originAddress || originAddress.includes('não encontrado')) return;
        origin = originAddress + ", Teresópolis, RJ";
    }

    if (newPlaceDetails && newPlaceDetails.geometry) {
        destination = newPlaceDetails.geometry.location;
    } else {
        const destinationAddress = elements.newAddressInput.value;
        if (!destinationAddress || destinationAddress.includes('não encontrado')) return;
        destination = destinationAddress + ", Teresópolis, RJ";
    }
    
    const directionsService = new google.maps.DirectionsService();
    directionsService.route({ origin, destination, travelMode: 'DRIVING' }, handleRouteResponse);
}

function handleRouteResponse(result, status) {
    if (status === 'OK') {
        const route = result.routes[0].legs[0];
        elements.distanceResult.innerHTML = `Distância: <strong>${route.distance.text}</strong>`;
        elements.distanceResult.style.display = 'block';
    } else {
        console.warn('Cálculo de rota automático falhou:', status);
        elements.distanceResult.style.display = 'none';
    }
}

function initAndHandleGoogleMaps() {
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error("API do Google Maps não está pronta.");
        return;
    }
    isApiReady = true; // A API está pronta!

    elements.oldAddressInput.addEventListener('gmp-placechange', (event) => {
        oldPlaceDetails = event.detail.place;
        if (oldPlaceDetails) {
            elements.oldAddressInput.value = oldPlaceDetails.formattedAddress;
        }
    });

    elements.newAddressInput.addEventListener('gmp-placechange', (event) => {
        newPlaceDetails = event.detail.place;
        if (newPlaceDetails) {
            elements.newAddressInput.value = newPlaceDetails.formattedAddress;
        }
    });

    elements.calculateDistanceBtn.addEventListener('click', () => {
        triggerDistanceCalculation();
    });
    
    attemptApiDependentTasks();
}


// --- Funções Principais da UI do Conversor ---
async function handlePdfLoad() {
    const file = elements.pdfUpload.files[0];
    if (!file) return showPopup('Por favor, selecione um arquivo PDF.');

    try {
        const fileBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(fileBuffer).promise;
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');

        pdfData.contrato = text.match(/Aditivo do Contrato (\d+)/)?.[1] || 'N/A';
        pdfData.nomeCompleto = text.match(/CONTRATADA e ([\s\S]*?),/)?.[1].trim() || 'N/A';
        pdfData.primeiroNome = pdfData.nomeCompleto.split(' ')[0].toUpperCase();

        const oldBlockText = text.match(/2\s*-\s*Sobre o\(s\) antigo\(s\)[\s\S]*?instalação([\s\S]*?)3\s*-\s*Sobre/i)?.[1];
        const newBlockText = text.match(/3\s*-\s*Sobre o\(s\) novo\(s\)[\s\S]*?instalação([\s\S]*?)4\s*-\s*Gerais/i)?.[1];
        const addressRegex = /([\s\S]+? \/ RJ\.)/g;
        const oldAddresses = oldBlockText?.match(addressRegex);
        const newAddresses = newBlockText?.match(addressRegex);
        const rawOld = oldAddresses ? oldAddresses[oldAddresses.length - 1] : null;
        const rawNew = newAddresses ? newAddresses[newAddresses.length - 1] : null;
        pdfData.oldAddress = formatAddress(rawOld?.trim().toUpperCase()) || 'Endereço antigo não encontrado';
        pdfData.newAddress = formatAddress(rawNew?.trim().toUpperCase()) || 'Endereço novo não encontrado';
        
        elements.contratoSpan.textContent = pdfData.contrato;
        elements.contrato.textContent = pdfData.contrato;
        elements.nome.textContent = pdfData.nomeCompleto;

        elements.uploadSection.style.display = 'none';
        elements.dataSection.style.display = 'block';
        
        oldPlaceDetails = null;
        newPlaceDetails = null;
        hasPdfData = true; // Define que os dados do PDF foram lidos
        
        attemptApiDependentTasks();

    } catch (error) {
        console.error('Erro ao processar PDF:', error);
        showPopup('Erro ao ler o arquivo PDF.', 'error');
    }
}


function handleGenerateOS() {
    const technician = localStorage.getItem('atendenteAtual')?.toUpperCase();
    if (!technician) return showPopup('Selecione um atendente para gerar a OS.');
    const { formatted, isValid } = formatPhone(elements.phone.value);
    if (!isValid) return showPopup('Telefone inválido. Ex: (21) 98765-4321', 'error');
    
    const isSelfWithdrawal = elements.selfWithdrawal.checked;
    const withdrawalDay = formatDate(elements.withdrawalDate.value);
    const installationDay = formatDate(elements.installationDate.value);
    
    if (!isSelfWithdrawal && !withdrawalDay) return showPopup('Data de Retirada é obrigatória.', 'error');
    if (!installationDay) return showPopup('Data de Instalação é obrigatória.', 'error');
    
    const withdrawalPeriod = elements.withdrawalPeriod.value.toUpperCase();
    const installationPeriod = elements.installationPeriod.value.toUpperCase();
    const signature = elements.signature.value === 'digital' ? 'ASSINATURA DIGITAL PENDENTE' : 'TITULAR NO LOCAL PARA ASSINATURA';

    let scheduleLines = '';
    if (!isSelfWithdrawal) {
        osTextData.withdrawal = `${withdrawalDay} - ${pdfData.contrato} - ${pdfData.primeiroNome} - ${elements.oldAddressInput.value} - MUD ENDEREÇO - ${withdrawalPeriod} - ${technician}`;
        scheduleLines += osTextData.withdrawal + '\n';
    } else {
        osTextData.withdrawal = '';
    }

    osTextData.installation = `${installationDay} - ${pdfData.contrato} - ${pdfData.primeiroNome} - ${elements.newAddressInput.value} - MUD ENDEREÇO - ${installationPeriod} - ${technician}`;
    scheduleLines += osTextData.installation;
    
    const withdrawalText = isSelfWithdrawal ? 'CLIENTE FAZ A RETIRADA' : `RETIRAR EM ${elements.oldAddressInput.value} DIA ${withdrawalDay} ${withdrawalPeriod}`;
    const taxValue = elements.taxValue.value;
    const taxText = elements.renewal.checked ? 'ISENTO DA TAXA POR RENOVAÇÃO.' :
                    elements.migration.checked ? 'ISENTO DA TAXA POR MIGRAÇÃO.' :
                    taxValue === 'isento' ? 'ISENTO DA TAXA.' : `TAXA DE R$${taxValue}.`;
    const carrierText = elements.migration.checked && elements.oldCarrier.value !== 'none' ? `** ANTIGO PORTADOR ${elements.oldCarrier.value.toUpperCase()} **\n` : '';

    osTextData.os = `${carrierText}${formatted} ${pdfData.primeiroNome} | ** ${elements.equipmentType.value.toUpperCase()} **\n${withdrawalText}.\nINSTALAR EM ${elements.newAddressInput.value} DIA ${installationDay} ${installationPeriod}.\n${taxText}\n${signature}.`;
    
    elements.output.value = `${scheduleLines}\n\n${replacePlaceholders(osTextData.os)}`;
    elements.copyButtons.style.display = 'flex';
}

// --- Função Principal de Inicialização do Módulo ---
export function initializeConversor() {
    elements = {
        uploadSection: document.getElementById('uploadSection'),
        dataSection: document.getElementById('dataSection'),
        withdrawalSection: document.getElementById('withdrawalSection'),
        copyButtons: document.getElementById('copyButtons'),
        contratoSpan: document.getElementById('contratoSpan'),
        contrato: document.getElementById('contrato'),
        nome: document.getElementById('nome'),
        oldAddressInput: document.getElementById('oldAddressInput'),
        newAddressInput: document.getElementById('newAddressInput'),
        calculateDistanceBtn: document.getElementById('calculateDistanceBtn'),
        distanceResult: document.getElementById('distanceResult'),
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
        carrierSection: document.getElementById('carrierSection'),
        oldCarrier: document.getElementById('oldCarrier'),
        loadPdfBtn: document.getElementById('loadPdfBtn'),
        generateOsBtn: document.getElementById('generateOsBtn'),
        backToUploadBtn: document.getElementById('backToUploadBtn'),
        copyWithdrawalBtn: document.getElementById('copyWithdrawalBtn'),
        copyInstallationBtn: document.getElementById('copyInstallationBtn'),
        copyOsBtn: document.getElementById('copyOsBtn'),
    };

    const setMinDates = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        elements.withdrawalDate.min = minDate;
        elements.installationDate.min = minDate;
    };

    const updateInstallationMinDate = () => {
        if (!elements.selfWithdrawal.checked && elements.withdrawalDate.value) {
            elements.installationDate.min = elements.withdrawalDate.value;
        } else { setMinDates(); }
    };

    const updateTaxLogic = () => {
        const isExempt = elements.renewal.checked || elements.migration.checked;
        elements.taxValue.disabled = isExempt;
        elements.renewalMessage.style.display = elements.renewal.checked ? 'block' : 'none';
        elements.migrationMessage.style.display = elements.migration.checked ? 'block' : 'none';
        elements.carrierSection.style.display = elements.migration.checked ? 'block' : 'none';
        if (isExempt) elements.taxValue.value = 'isento';
    };

    const handleCheckboxExclusion = (event) => {
        if (event.target.id === 'renewal') elements.migration.disabled = event.target.checked;
        if (event.target.id === 'migration') elements.renewal.disabled = event.target.checked;
    };
    
    const resetForm = () => {
        elements.dataSection.style.display = 'none';
        elements.uploadSection.style.display = 'block';
        elements.pdfUpload.value = '';
        elements.fileName.textContent = 'Nenhum arquivo';
        elements.output.value = '';
        elements.copyButtons.style.display = 'none';
        elements.distanceResult.style.display = 'none';
        oldPlaceDetails = null;
        newPlaceDetails = null;
        hasPdfData = false; // Reseta a flag do PDF
        pdfData = {}; // Limpa os dados do PDF
        updateTaxLogic();
    };
    
    window.addEventListener('google-maps-loaded', initAndHandleGoogleMaps);
    
    setMinDates();
    elements.loadPdfBtn.addEventListener('click', handlePdfLoad);
    elements.generateOsBtn.addEventListener('click', handleGenerateOS);
    elements.backToUploadBtn.addEventListener('click', resetForm);
    elements.copyWithdrawalBtn.addEventListener('click', () => osTextData.withdrawal ? navigator.clipboard.writeText(osTextData.withdrawal).then(() => showPopup('Retirada copiada!')) : showPopup('Não há retirada para copiar.'));
    elements.copyInstallationBtn.addEventListener('click', () => navigator.clipboard.writeText(osTextData.installation).then(() => showPopup('Instalação copiada!')));
    elements.copyOsBtn.addEventListener('click', () => navigator.clipboard.writeText(replacePlaceholders(osTextData.os)).then(() => showPopup('O.S. copiada!')));
    elements.pdfUpload.addEventListener('change', () => { elements.fileName.textContent = elements.pdfUpload.files[0]?.name || 'Nenhum arquivo'; });
    elements.phone.addEventListener('blur', () => { const { formatted } = formatPhone(elements.phone.value); elements.phone.value = formatted; });
    elements.selfWithdrawal.addEventListener('change', () => { elements.withdrawalSection.style.display = elements.selfWithdrawal.checked ? 'none' : 'block'; updateInstallationMinDate(); });
    elements.withdrawalDate.addEventListener('change', updateInstallationMinDate);
    elements.renewal.addEventListener('change', (e) => { updateTaxLogic(); handleCheckboxExclusion(e); });
    elements.migration.addEventListener('change', (e) => { updateTaxLogic(); handleCheckboxExclusion(e); });
}

