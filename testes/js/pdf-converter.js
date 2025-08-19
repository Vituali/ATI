// js/pdf-converter.js

import { showPopup } from './ui.js';

// Variáveis de estado do módulo
let pdfData = {
    contrato: '',
    shortNome: '',
    formattedOld: '',
    formattedNew: '',
    motivo: 'MUD ENDEREÇO',
    osText: '',
    withdrawalLine: '',
    installationLine: ''
};

const modal = document.getElementById("modalAditivo");
const uploadSection = document.getElementById('uploadSection');
const dataSection = document.getElementById('dataSection');
const pdfUpload = document.getElementById('pdfUpload');
const fileNameDisplay = document.getElementById('fileName');
const phoneInput = document.getElementById('phone');
const phoneError = document.getElementById('phoneError');
const technicianInput = document.getElementById('technician');
const selfWithdrawal = document.getElementById('selfWithdrawal');
const withdrawalSection = document.getElementById('withdrawalSection');
const withdrawalDate = document.getElementById('withdrawalDate');
const installationDate = document.getElementById('installationDate');
const renewal = document.getElementById('renewal');
const taxSection = document.getElementById('taxSection');


function abrirModal() {
    modal.classList.add('active');
    uploadSection.classList.add('active');
    dataSection.classList.remove('active');
}

function fecharModal() {
    modal.classList.remove('active');
    backToUpload();
}

function backToUpload() {
    pdfUpload.value = '';
    fileNameDisplay.innerText = 'Nenhum arquivo selecionado';
    dataSection.classList.remove('active');
    uploadSection.classList.add('active');
    
    const formElements = dataSection.querySelectorAll('input, select, textarea');
    formElements.forEach(el => {
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
    });
    
    document.getElementById('output').textContent = '';
    document.getElementById('copyButtons').style.display = 'none';
    phoneError.textContent = '';
}

async function loadPDF() {
    const file = pdfUpload.files[0];
    if (!file) {
        showPopup('Selecione um arquivo PDF.');
        return;
    }

    try {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded');
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            text += textContent.items.map(item => item.str).join(' ') + ' ';
        }

        const contratoMatch = text.match(/Aditivo do Contrato (\d+)/);
        const nameMatch = text.match(/CONTRATADA e ([\s\S]*?),\s*CPF\/CNPJ:/);
        const oldMatch = text.match(/2 - Sobre o\(s\) antigo\(s\) endereco\(s\) de cobrança e instalação\s+([\s\S]*? \/ RJ\.)\s+([\s\S]*? \/ RJ\.)/);
        const newMatch = text.match(/3 - Sobre o\(s\) novo\(s\) endereco\(s\) de cobrança e instalação\s+([\s\S]*? \/ RJ\.)\s+([\s\S]*? \/ RJ\.)/);

        const formatAddress = (addr) => addr ? addr.split(',').slice(0, 3).map(part => part.trim()).join(',').toUpperCase() : 'N/A';

        pdfData.contrato = contratoMatch ? contratoMatch[1] : 'N/A';
        const fullNome = nameMatch ? nameMatch[1].replace(/\s+/g, ' ').trim() : 'N/A';
        pdfData.shortNome = fullNome !== 'N/A' ? fullNome.split(' ')[0].toUpperCase() : 'N/A';
        pdfData.formattedOld = formatAddress(oldMatch ? oldMatch[2] : null);
        pdfData.formattedNew = formatAddress(newMatch ? newMatch[2] : null);

        if (pdfData.contrato === 'N/A' || fullNome === 'N/A') {
            showPopup('Não foi possível extrair dados do PDF.');
            return;
        }

        document.getElementById('contrato').textContent = pdfData.contrato;
        document.getElementById('nome').textContent = fullNome;
        document.getElementById('oldAddress').textContent = pdfData.formattedOld;
        document.getElementById('newAddress').textContent = pdfData.formattedNew;
        document.getElementById('contratoSpan').textContent = pdfData.contrato;
        document.getElementById('nomeSpan').textContent = pdfData.shortNome;

        uploadSection.classList.remove('active');
        dataSection.classList.add('active');

    } catch (error) {
        console.error('Erro ao processar PDF:', error);
        showPopup('Erro ao processar o PDF.');
    }
}

function generateOS() {
    const phone = document.getElementById('phone').value;
    const technician = document.getElementById('technician').value;
    const equipmentType = document.getElementById('equipmentType').value;
    const withdrawalDateValue = document.getElementById('withdrawalDate').value;
    const withdrawalPeriod = document.getElementById('withdrawalPeriod').value;
    const installationDateValue = document.getElementById('installationDate').value;
    const installationPeriod = document.getElementById('installationPeriod').value;
    const signatureType = document.getElementById('signatureType').value;
    const isRenewal = renewal.checked;
    const taxValue = document.getElementById('taxValue').value;
    const isSelfWithdrawal = selfWithdrawal.checked;

    if (!phone || !technician || !equipmentType || (!isSelfWithdrawal && (!withdrawalDateValue || !withdrawalPeriod)) || !installationDateValue || !installationPeriod || !signatureType) {
        showPopup('Preencha todos os campos obrigatórios.');
        return;
    }

    const formatDate = (dateStr) => dateStr ? dateStr.split('-').reverse().slice(0, 2).join('/') : '';
    
    const taxLine = isRenewal ? '' : `Taxa: ${taxValue}R$\n`;
    pdfData.withdrawalLine = isSelfWithdrawal ? `RETIRADA DE EQUIPAMENTO\n\nCONTATO: ${phone}\nNOME: ${pdfData.shortNome}\nCONTRATO: ${pdfData.contrato}\nENDEREÇO: ${pdfData.formattedOld}\nOBS: CLIENTE FARA A RETIRADA DO EQUIPAMENTO NA EMPRESA.\n\n` :
        `RETIRADA DE EQUIPAMENTO\n\nCONTATO: ${phone}\nNOME: ${pdfData.shortNome}\nCONTRATO: ${pdfData.contrato}\nENDEREÇO: ${pdfData.formattedOld}\nDATA: ${formatDate(withdrawalDateValue)}\nPERIODO: ${withdrawalPeriod}\nTECNICO: ${technician}\n\n`;
    
    pdfData.installationLine = `INSTALAÇÃO DE EQUIPAMENTO\n\nCONTATO: ${phone}\nNOME: ${pdfData.shortNome}\nCONTRATO: ${pdfData.contrato}\nENDEREÇO: ${pdfData.formattedNew}\nDATA: ${formatDate(installationDateValue)}\nPERIODO: ${installationPeriod}\nTECNICO: ${technician}\nTIPO DE COMODATO: ${equipmentType.toUpperCase()}\n\n`;

    pdfData.osText = `${pdfData.withdrawalLine}${pdfData.installationLine}MOTIVO: MUDANÇA DE ENDEREÇO\n${taxLine}ASSINATURA: ${signatureType.toUpperCase()}\n\n[SAUDACAO]\n\nSEGUE O.S`;

    document.getElementById('output').textContent = pdfData.osText;
    document.getElementById('copyButtons').style.display = 'flex';
    showPopup('O.S Gerada com sucesso!');
}

function copyToClipboard(text, type) {
    if (text) {
        navigator.clipboard.writeText(text).then(() => showPopup(`${type} copiada!`));
    } else {
        showPopup(`Erro: Nenhuma ${type} para copiar.`);
    }
}

function formatPhone(input) {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('55')) digits = digits.slice(2);
    
    const match = digits.match(/^(\d{2})(\d{8,9})$/);
    if (!match) return { formatted: input, isValid: false };
    
    const number = match[2];
    const formattedNumber = number.length === 8 ? `${number.substring(0, 4)}-${number.substring(4)}` : `${number.substring(0, 5)}-${number.substring(5)}`;
    return { formatted: `(${match[1]}) ${formattedNumber}`, isValid: true };
}

function updateInstallationMin() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().slice(0, 10);

    if (!selfWithdrawal.checked && withdrawalDate.value) {
        installationDate.min = withdrawalDate.value;
    } else {
        installationDate.min = minDate;
    }
}


export function initPdfConverter() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().slice(0, 10);
    if (withdrawalDate) withdrawalDate.min = minDate;
    if (installationDate) installationDate.min = minDate;
    
    const savedTechnician = localStorage.getItem('technician');
    if (savedTechnician) technicianInput.value = savedTechnician;

    // Adiciona os event listeners
    document.getElementById('openModalBtn').addEventListener('click', abrirModal);
    document.getElementById('closeModalBtn').addEventListener('click', fecharModal);
    document.getElementById('backToUploadBtn').addEventListener('click', backToUpload);
    document.getElementById('loadPdfBtn').addEventListener('click', loadPDF);
    document.getElementById('generateOsBtn').addEventListener('click', generateOS);
    
    pdfUpload.addEventListener('change', () => {
        const file = pdfUpload.files[0];
        fileNameDisplay.innerText = file ? file.name : 'Nenhum arquivo selecionado';
    });

    selfWithdrawal.addEventListener('change', () => {
        withdrawalSection.style.display = selfWithdrawal.checked ? 'none' : 'block';
        updateInstallationMin();
    });

    renewal.addEventListener('change', () => {
        taxSection.style.display = renewal.checked ? 'none' : 'block';
    });

    withdrawalDate.addEventListener('change', updateInstallationMin);

    technicianInput.addEventListener('input', () => {
        localStorage.setItem('technician', technicianInput.value);
    });

    phoneInput.addEventListener('blur', () => {
        const { formatted, isValid } = formatPhone(phoneInput.value);
        phoneInput.value = formatted;
        phoneError.textContent = isValid ? '' : 'Número de telefone inválido.';
    });
    
    document.getElementById('copyWithdrawalBtn').addEventListener('click', () => copyToClipboard(pdfData.withdrawalLine, 'Retirada'));
    document.getElementById('copyInstallationBtn').addEventListener('click', () => copyToClipboard(pdfData.installationLine, 'Instalação'));
    document.getElementById('copyOsBtn').addEventListener('click', () => copyToClipboard(pdfData.osText, 'O.S'));
}