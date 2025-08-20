document.addEventListener('DOMContentLoaded', () => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    if (document.getElementById('conversorSection').style.display === 'block') {
        initializeConversor();
    }

    window.showSection = (function(originalShowSection) {
        return function(section) {
            originalShowSection(section);
            if (section === 'conversor') {
                initializeConversor();
            }
        };
    })(window.showSection || function(section) {
        document.getElementById('chatSection').style.display = section === 'chat' ? 'block' : 'none';
        document.getElementById('conversorSection').style.display = section === 'conversor' ? 'block' : 'none';
        const buttons = document.querySelectorAll('.sidebar-button');
        buttons.forEach(button => {
            button.classList.toggle('active', button.getAttribute('onclick') === `showSection('${section}')`);
        });
    });

    function initializeConversor() {
        const elements = {
            selfWithdrawal: document.getElementById('selfWithdrawal'),
            withdrawalSection: document.getElementById('withdrawalSection'),
            withdrawalDate: document.getElementById('withdrawalDate'),
            installationDate: document.getElementById('installationDate'),
            renewal: document.getElementById('renewal'),
            migration: document.getElementById('migration'),
            renewalMessage: document.getElementById('renewalMessage'),
            migrationMessage: document.getElementById('migrationMessage'),
            phoneInput: document.getElementById('phone'),
            phoneError: document.getElementById('phoneError'),
            pdfUpload: document.getElementById('pdfUpload'),
            fileNameDisplay: document.getElementById('fileName'),
            taxValue: document.getElementById('taxValue')
        };

        for (const [key, element] of Object.entries(elements)) {
            if (!element) {
                console.error(`Elemento ${key} não encontrado.`);
                window.showPopup('Erro interno: elemento da página não encontrado.');
                return;
            }
        }

        const { selfWithdrawal, withdrawalSection, withdrawalDate, installationDate, renewal, migration, renewalMessage, migrationMessage, phoneInput, phoneError, pdfUpload, fileNameDisplay, taxValue } = elements;

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().slice(0, 10);
        withdrawalDate.min = minDate;
        installationDate.min = minDate;

        [withdrawalDate, installationDate].forEach(dateInput => {
            dateInput.addEventListener('click', () => {
                try {
                    dateInput.showPicker();
                } catch (e) {
                    console.log('showPicker not supported, allowing manual input:', e);
                }
            });
        });

        pdfUpload.addEventListener('change', () => {
            const file = pdfUpload.files[0];
            fileNameDisplay.textContent = file ? file.name : 'Nenhum arquivo selecionado';
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

        const updateTaxField = () => {
            const isExempt = renewal.checked || migration.checked;
            taxValue.disabled = isExempt;
            renewalMessage.style.display = renewal.checked ? 'block' : 'none';
            migrationMessage.style.display = migration.checked ? 'block' : 'none';
            if (isExempt) {
                taxValue.value = 'isento';
            }
            renewal.disabled = migration.checked;
            migration.disabled = renewal.checked;
        };

        renewal.addEventListener('change', updateTaxField);
        migration.addEventListener('change', updateTaxField);

        withdrawalDate.addEventListener('change', updateInstallationMin);

        function updateInstallationMin() {
            if (!selfWithdrawal.checked && withdrawalDate.value) {
                installationDate.min = withdrawalDate.value;
            } else {
                installationDate.min = minDate;
            }
        }

        phoneInput.addEventListener('blur', () => {
            const { formatted, isValid } = formatPhone(phoneInput.value);
            phoneInput.value = formatted;
            phoneError.textContent = isValid ? '' : 'Número de telefone inválido. Use 8 ou 9 dígitos após o DDD.';
        });

        phoneInput.value = '(21) 21212-1212';
        updateTaxField();
    }

    window.loadPDF = async function() {
        try {
            const file = document.getElementById('pdfUpload').files[0];
            if (!file) {
                window.showPopup('Selecione um arquivo PDF.');
                return;
            }

            const fileNameDisplay = document.getElementById('fileName');
            fileNameDisplay.textContent = file.name;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const page = await pdf.getPage(1);
            const textContent = await page.getTextContent();
            let text = textContent.items.map(item => item.str).join(' ');

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

            const formatAddress = (addr) => {
                if (!addr) return '';
                const parts = addr.split(',').slice(0, 3).map(part => part.trim());
                return parts.join(',').toUpperCase();
            };

            const formattedOld = formatAddress(oldInstall);
            const formattedNew = formatAddress(newInstall);

            if (!contrato || !fullNome || !formattedOld || !formattedNew) {
                window.showPopup('Não foi possível extrair todos os dados do PDF. Verifique o formato.');
                return;
            }

            const elements = {
                contratoSpan: document.getElementById('contratoSpan'),
                contrato: document.getElementById('contrato'),
                nome: document.getElementById('nome'),
                oldAddress: document.getElementById('oldAddress'),
                newAddress: document.getElementById('newAddress')
            };

            for (const [key, element] of Object.entries(elements)) {
                if (!element) {
                    console.error(`Elemento ${key} não encontrado.`);
                    window.showPopup('Erro interno: elemento da página não encontrado.');
                    return;
                }
            }

            elements.contratoSpan.innerText = contrato;
            elements.contrato.innerText = contrato;
            elements.nome.innerText = fullNome;
            elements.oldAddress.innerText = formattedOld;
            elements.newAddress.innerText = formattedNew;

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
            window.showPopup('Erro ao processar o PDF. Verifique o arquivo e tente novamente.');
        }
    };

    window.backToUpload = function() {
        const dataSection = document.getElementById('dataSection');
        const uploadSection = document.getElementById('uploadSection');
        const pdfUpload = document.getElementById('pdfUpload');
        const fileName = document.getElementById('fileName');
        const output = document.getElementById('output');
        const phone = document.getElementById('phone');
        const phoneError = document.getElementById('phoneError');
        const copyButtons = document.getElementById('copyButtons');

        if (dataSection && uploadSection && pdfUpload && fileName && output && phone && phoneError && copyButtons) {
            dataSection.style.display = 'none';
            uploadSection.style.display = 'block';
            pdfUpload.value = '';
            fileName.textContent = 'Nenhum arquivo selecionado';
            output.textContent = '';
            phone.value = '(21) 21212-1212';
            phoneError.textContent = '';
            copyButtons.style.display = 'none';
        } else {
            window.showPopup('Erro interno: elementos da página não encontrados.');
        }
    };

    window.generateOS = function() {
        try {
            const phoneInput = document.getElementById('phone');
            const { formatted: phone, isValid } = formatPhone(phoneInput.value.trim());
            phoneInput.value = phone;
            if (!isValid) {
                document.getElementById('phoneError').textContent = 'Número de telefone inválido. Use 8 ou 9 dígitos após o DDD.';
                return;
            }

            const technician = localStorage.getItem('atendenteAtual')?.toUpperCase() || '';
            const equipmentType = document.getElementById('equipmentType').value.toUpperCase();
            const isSelfWithdrawal = document.getElementById('selfWithdrawal').checked;
            const isRenewal = document.getElementById('renewal').checked;
            const isMigration = document.getElementById('migration').checked;
            const signatureType = document.getElementById('signature').value.toUpperCase();
            const taxValue = (isRenewal || isMigration) ? 'ISENTO' : document.getElementById('taxValue').value.toUpperCase();
            const output = document.getElementById('output');

            if (!phone || !technician) {
                window.showPopup('Preencha o telefone e selecione um atendente.');
                return;
            }

            let equipment = equipmentType === 'ALCL' ? 'ALCL' : `FIBERHOME + ${equipmentType}`;

            let withdrawalText = '';
            let scheduleLines = '';
            let withdrawalDay = '';
            let withdrawalPeriod = '';

            if (!isSelfWithdrawal) {
                withdrawalDay = formatDate(document.getElementById('withdrawalDate').value);
                withdrawalPeriod = document.getElementById('withdrawalPeriod').value.toUpperCase();
                if (!withdrawalDay) {
                    window.showPopup('Selecione a data de retirada.');
                    return;
                }
                scheduleLines += `${withdrawalDay} - ${window.contrato} - ${window.shortNome} - ${window.formattedOld} - ${window.motivo} - ${withdrawalPeriod} - ${technician}\n`;
                withdrawalText = `RETIRAR NO ENDEREÇO ${window.formattedOld} NO DIA ${withdrawalDay} ${withdrawalPeriod}`;
            } else {
                withdrawalText = 'CLIENTE FAZ A RETIRADA POR CONTA PRÓPRIA';
            }

            const installationDay = formatDate(document.getElementById('installationDate').value);
            const installationPeriod = document.getElementById('installationPeriod').value.toUpperCase();
            if (!installationDay) {
                window.showPopup('Selecione a data de instalação.');
                return;
            }

            if (!isSelfWithdrawal && new Date(document.getElementById('installationDate').value) < new Date(document.getElementById('withdrawalDate').value)) {
                window.showPopup('A data de instalação não pode ser antes da data de retirada.');
                return;
            }

            scheduleLines += `${installationDay} - ${window.contrato} - ${window.shortNome} - ${window.formattedNew} - ${window.motivo} - ${installationPeriod} - ${technician}\n`;

            let taxText = isRenewal ? 'ISENTO DA TAXA POR RENOVAÇÃO.' : isMigration ? 'ISENTO DA TAXA POR MIGRAÇÃO.' : `TAXA DE R$${taxValue}.`;
            let signatureText = signatureType === 'LOCAL' ? 'TITULAR NO LOCAL PARA ASSINATURA.' : 'ASSINATURA DIGITAL PENDENTE (VERIFICAR).';

            const osText = `${phone} ${window.shortNome} | ** ${equipment} ** \n${withdrawalText}\nINSTALAR NO ENDEREÇO ${window.formattedNew} NO DIA ${installationDay} ${installationPeriod}.\n${taxText}\n${signatureText}\n[despedida]`;

            output.innerText = window.substituirMarcadores(`${scheduleLines}\n${osText}`);

            document.getElementById('copyButtons').style.display = 'flex';

            window.scheduleLines = scheduleLines.toUpperCase();
            window.withdrawalLine = scheduleLines.split('\n')[0] || '';
            window.installationLine = scheduleLines.split('\n')[1] || '';
            window.osText = window.substituirMarcadores(osText);
        } catch (error) {
            console.error('Erro ao gerar O.S:', error);
            window.showPopup('Erro ao gerar a O.S. Verifique os dados e tente novamente.');
        }
    };

    window.copyWithdrawal = function() {
        if (!window.withdrawalLine) {
            window.showPopup('Nenhuma linha de retirada para copiar.');
            return;
        }
        navigator.clipboard.writeText(window.withdrawalLine).then(() => window.showPopup('Retirada copiada!')).catch(() => window.showPopup('Erro ao copiar retirada.'));
    };

    window.copyInstallation = function() {
        if (!window.installationLine) {
            window.showPopup('Nenhuma linha de instalação para copiar.');
            return;
        }
        navigator.clipboard.writeText(window.installationLine).then(() => window.showPopup('Instalação copiada!')).catch(() => window.showPopup('Erro ao copiar instalação.'));
    };

    window.copyOS = function() {
        if (!window.osText) {
            window.showPopup('Nenhuma O.S para copiar.');
            return;
        }
        navigator.clipboard.writeText(window.osText).then(() => window.showPopup('O.S copiada!')).catch(() => window.showPopup('Erro ao copiar O.S.'));
    };

    function formatPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        const isValid = /^[1-9]{2}(9?\d{8})$/.test(cleaned);
        let formatted = cleaned;
        if (cleaned.length === 10) {
            formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        } else if (cleaned.length === 11) {
            formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
        }
        return { formatted, isValid };
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
});