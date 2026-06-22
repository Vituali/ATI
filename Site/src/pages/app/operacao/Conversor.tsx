// pages/Conversor.tsx
// ---------------------------------------------------------------
// Conversor de Aditivo — port fiel do conversor.js original.
// Extrai dados do PDF com pdfjs-dist e gera O.S. formatada.
// Google Maps removido por enquanto (será adicionado depois).
// ---------------------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react'
import { useUser } from '../../../hooks/useUser'
import './Conversor.css'
import LoadingOverlay from '../../../components/ui/LoadingOverlay'
import { FileText, FolderOpen, User, MapPin, Flag, Phone, Package, CreditCard, PartyPopper, Landmark, DollarSign, Pen, ArrowLeft, Check, ClipboardList } from 'lucide-react'

// ---------------------------------------------------------------
// pdfjs-dist v4 + worker CDN (jsdelivr)
// ---------------------------------------------------------------
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`

// ---------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------

interface PdfData {
  contrato: string
  nomeCompleto: string
  primeiroNome: string
  oldAddress: string
  newAddress: string
}

interface OsTextData {
  withdrawal: string
  installation: string
  os: string
}

type Periodo = 'Manhã' | 'Tarde'
type Equipamento = 'alcl' | 'nbel' | 'proprio' | 'huawei' | 'tp link'
type Assinatura = 'digital' | 'local'
type Taxa = '100' | '65' | '50' | 'isento'
type Portador = 'none' | 'ITAU AGT' | 'GERENCIANET AGT' | 'ITAU ATI' | 'GERENCIANET - BANDA LARGA'

// ---------------------------------------------------------------
// HELPERS — portados diretamente do conversor.js
// ---------------------------------------------------------------

function formatAddress(fullAddress: string): string {
  if (!fullAddress) return 'N/A'
  
  // Limpa quebras de linha, espaços duplos e a terminação '/ RJ.' de forma segura
  let clean = fullAddress
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/?\s*RJ\.?$/i, '')
    .trim()
    
  // Remove CEP (ex: 25956-360 ou 25956360)
  clean = clean.replace(/\b\d{5}-?\d{3}\b/g, '')
  
  // Divide por vírgulas, remove vazios e espaços
  const parts = clean
    .split(',')
    .map(p => p.trim())
    .filter(p => p && p.toUpperCase() !== 'RJ')
    
  if (parts.length >= 3) {
    const street = parts[0]
    const number = parts[1]
    const rest = parts.slice(2) // Bairro, Cidade, etc.
    
    // Une a rua e o número por vírgula
    const mainAddr = `${street}, ${number}`
    
    // Junta os demais com " - "
    return [mainAddr, ...rest].join(' - ').replace(/\s+-\s+-\s+/g, ' - ').trim()
  }
  
  return clean.replace(/,\s*/g, ' - ')
}

function formatPhone(phone: string): { formatted: string; isValid: boolean } {
  const cleaned = phone.replace(/\D/g, '')
  const isValid = /^[1-9]{2}(9?\d{8})$/.test(cleaned)
  let formatted = cleaned
  if (isValid) {
    if (cleaned.length === 10) formatted = `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    else if (cleaned.length === 11) formatted = `${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  return { formatted, isValid }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function getTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

async function copiar(texto: string): Promise<void> {
  await navigator.clipboard.writeText(texto)
}

// ---------------------------------------------------------------
// COMPONENTE
// ---------------------------------------------------------------

export default function Conversor() {
  const { user } = useUser()

  // Auxiliar para buscar valores salvos no localStorage
  const getSavedValue = <T,>(key: string, defaultValue: T): T => {
    const saved = localStorage.getItem('ati_conversor_state')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed[key] !== undefined ? parsed[key] : defaultValue
      } catch {
        return defaultValue
      }
    }
    return defaultValue
  }

  // Etapa: "upload" | "form"
  const [etapa, setEtapa] = useState<'upload' | 'form'>(() => getSavedValue('etapa', 'upload'))
  const [dragOver, setDragOver] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  // Dados extraídos do PDF
  const [pdfData, setPdfData] = useState<PdfData | null>(() => getSavedValue('pdfData', null))

  // Campos editáveis
  const [oldAddress, setOldAddress] = useState(() => getSavedValue('oldAddress', ''))
  const [newAddress, setNewAddress] = useState(() => getSavedValue('newAddress', ''))
  const [phone, setPhone] = useState(() => getSavedValue('phone', ''))
  const [phoneErro, setPhoneErro] = useState('')
  const [equipamento, setEquipamento] = useState<Equipamento>(() => getSavedValue('equipamento', 'alcl'))
  const [assinatura, setAssinatura] = useState<Assinatura>(() => getSavedValue('assinatura', 'digital'))
  const [taxa, setTaxa] = useState<Taxa>(() => getSavedValue('taxa', '100'))
  const [renovacao, setRenovacao] = useState(() => getSavedValue('renovacao', false))
  const [migracao, setMigracao] = useState(() => getSavedValue('migracao', false))
  const [portador, setPortador] = useState<Portador>(() => getSavedValue('portador', 'none'))
  const [clienteRetira, setClienteRetira] = useState(() => getSavedValue('clienteRetira', false))
  const [retiradaData, setRetiradaData] = useState(() => getSavedValue('retiradaData', ''))
  const [retiradaPeriodo, setRetiradaPeriodo] = useState<Periodo>(() => getSavedValue('retiradaPeriodo', 'Manhã'))
  const [instalacaoData, setInstalacaoData] = useState(() => getSavedValue('instalacaoData', ''))
  const [instalacaoPeriodo, setInstalacaoPeriodo] = useState<Periodo>(() => getSavedValue('instalacaoPeriodo', 'Manhã'))

  // Output gerado
  const [osGerada, setOsGerada] = useState(() => getSavedValue('osGerada', ''))
  const [osData, setOsData] = useState<OsTextData | null>(() => getSavedValue('osData', null))

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Efeito para salvar o estado do conversor sempre que um campo for alterado
  useEffect(() => {
    const state = {
      etapa,
      pdfData,
      oldAddress,
      newAddress,
      phone,
      equipamento,
      assinatura,
      taxa,
      renovacao,
      migracao,
      portador,
      clienteRetira,
      retiradaData,
      retiradaPeriodo,
      instalacaoData,
      instalacaoPeriodo,
      osGerada,
      osData,
    }
    localStorage.setItem('ati_conversor_state', JSON.stringify(state))
  }, [etapa, pdfData, oldAddress, newAddress, phone, equipamento, assinatura, taxa, renovacao, migracao, portador, clienteRetira, retiradaData, retiradaPeriodo, instalacaoData, instalacaoPeriodo, osGerada, osData])

  // ---------------------------------------------------------------
  // LÓGICA DE TAXA
  // ---------------------------------------------------------------

  const isento = renovacao || migracao

  function handleRenovacao(v: boolean) {
    setRenovacao(v)
    if (v) {
      setMigracao(false)
      setTaxa('isento')
    } else {
      setTaxa('100')
    }
  }

  function handleMigracao(v: boolean) {
    setMigracao(v)
    if (v) {
      setRenovacao(false)
      setTaxa('isento')
    } else {
      setPortador('none')
      setTaxa('100')
    }
  }

  // Data mínima de instalação: dia seguinte ao da retirada (ou amanhã)
  const minInstalacao = !clienteRetira && retiradaData ? retiradaData : getTomorrow()

  // ---------------------------------------------------------------
  // PROCESSAR PDF — lógica portada do conversor.js
  // ---------------------------------------------------------------

  const processarPdf = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setErro('Por favor, selecione um arquivo PDF válido.')
      return
    }

    setProcessando(true)
    setErro(null)

    try {
      const buffer = new Uint8Array(await file.arrayBuffer())
      const pdf = await getDocument(buffer).promise
      const page = await pdf.getPage(1)
      const content = await page.getTextContent()
      const text = content.items.map((i) => ('str' in i ? i.str : '')).join(' ')

      const normalizedText = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ')
      const contrato = normalizedText.match(/Aditivo do Contrato (\d+)/)?.[1] ?? 'N/A'
      const nomeCompleto = normalizedText.match(/CONTRATADA e (.*?), CPF\/CNPJ:/)?.[1].trim() ?? 'N/A'
      const primeiroNome = nomeCompleto.split(' ')[0].toUpperCase()

      const oldBlock = text.match(/2\s*-\s*Sobre o\(s\) antigo\(s\)[\s\S]*?instalação([\s\S]*?)3\s*-\s*Sobre/i)?.[1]
      const newBlock = text.match(/3\s*-\s*Sobre o\(s\) novo\(s\)[\s\S]*?instalação([\s\S]*?)4\s*-\s*Gerais/i)?.[1]
      const addrRegex = /([\s\S]+? \/ RJ\.)/g
      const oldAddrs = oldBlock?.match(addrRegex)
      const newAddrs = newBlock?.match(addrRegex)

      const oldAddr = formatAddress(oldAddrs?.[oldAddrs.length - 1]?.trim().toUpperCase() ?? '') || 'Endereço antigo não encontrado'
      const newAddr = formatAddress(newAddrs?.[newAddrs.length - 1]?.trim().toUpperCase() ?? '') || 'Endereço novo não encontrado'

      const dados: PdfData = {
        contrato,
        nomeCompleto,
        primeiroNome,
        oldAddress: oldAddr,
        newAddress: newAddr,
      }

      setPdfData(dados)
      setOldAddress(oldAddr)
      setNewAddress(newAddr)
      setEtapa('form')
    } catch (e) {
      console.error(e)
      setErro('Erro ao ler o arquivo PDF.')
    } finally {
      setProcessando(false)
    }
  }, [])

  // ---------------------------------------------------------------
  // DROP ZONE
  // ---------------------------------------------------------------

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processarPdf(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processarPdf(file)
  }

  // ---------------------------------------------------------------
  // GERAR O.S. — lógica portada do conversor.js
  // ---------------------------------------------------------------

  function handleGerarOS() {
    if (!pdfData || !user) return

    const tecnico = user.nomeCompleto.split(' ')[0].toUpperCase()
    const { formatted, isValid } = formatPhone(phone)

    if (!isValid) {
      setPhoneErro('Telefone inválido. Ex: 21 98765-4321')
      return
    }
    setPhoneErro('')

    if (!clienteRetira && !retiradaData) {
      setErro('Data de Retirada é obrigatória.')
      return
    }
    if (!instalacaoData) {
      setErro('Data de Instalação é obrigatória.')
      return
    }
    setErro(null)

    const retDia = formatDate(retiradaData)
    const instDia = formatDate(instalacaoData)
    const retPer = retiradaPeriodo.toUpperCase()
    const instPer = instalacaoPeriodo.toUpperCase()
    const sigText = assinatura === 'digital' ? 'ASSINATURA DIGITAL PENDENTE' : 'TITULAR NO LOCAL PARA ASSINATURA'

    let scheduleLines = ''

    const novaOsData: OsTextData = { withdrawal: '', installation: '', os: '' }
    const withdrawalText = !clienteRetira ? `RETIRAR EM ${oldAddress} DIA ${retDia} ${retPer}` : 'CLIENTE FEZ A RETIRADA'

    if (!clienteRetira) {
      novaOsData.withdrawal = `${retDia} - ${pdfData.contrato} - ${pdfData.primeiroNome} - ${oldAddress} - MUD ENDEREÇO - ${retPer} - ${tecnico}`
      scheduleLines += novaOsData.withdrawal + '\n'
    }

    novaOsData.installation = `${instDia} - ${pdfData.contrato} - ${pdfData.primeiroNome} - ${newAddress} - MUD ENDEREÇO - ${instPer} - ${tecnico}`
    scheduleLines += novaOsData.installation

    const taxaTexto = renovacao ? 'ISENTO DA TAXA POR RENOVAÇÃO.' : migracao ? 'ISENTO DA TAXA POR MIGRAÇÃO.' : taxa === 'isento' ? 'ISENTO DA TAXA.' : `TAXA DE R$${taxa}.`

    const portadorTexto = migracao && portador !== 'none' ? `** ANTIGO PORTADOR ${portador.toUpperCase()} **\n` : ''

    novaOsData.os = `${portadorTexto}${formatted} ${pdfData.primeiroNome} | ** ${equipamento.toUpperCase()} **\n${withdrawalText}.\nINSTALAR EM ${newAddress} DIA ${instDia} ${instPer}.\n${taxaTexto}\n${sigText}.`

    const textoFinal = `${scheduleLines}\n\n${novaOsData.os}`

    setOsData(novaOsData)
    setOsGerada(textoFinal)
  }

  // ---------------------------------------------------------------
  // COPIAR COM FEEDBACK
  // ---------------------------------------------------------------

  async function handleCopiar(tipo: 'retirada' | 'instalacao' | 'os') {
    if (!osData) return
    let texto = ''
    if (tipo === 'retirada') {
      texto = osData.withdrawal
    } else if (tipo === 'instalacao') {
      texto = osData.installation
    } else if (tipo === 'os') {
      texto = osData.os
    }
    if (!texto) return
    await copiar(texto)
    setCopiado(tipo)
    setTimeout(() => setCopiado(null), 2000)
  }

  function resetar() {
    setEtapa('upload')
    setPdfData(null)
    setOldAddress('')
    setNewAddress('')
    setPhone('')
    setPhoneErro('')
    setEquipamento('alcl')
    setAssinatura('digital')
    setTaxa('100')
    setRenovacao(false)
    setMigracao(false)
    setPortador('none')
    setClienteRetira(false)
    setRetiradaData('')
    setInstalacaoData('')
    setOsGerada('')
    setOsData(null)
    setErro(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ---------------------------------------------------------------
  // RENDER — UPLOAD
  // ---------------------------------------------------------------

  if (etapa === 'upload') {
    return (
      <div className="conv-page fade-in">
        <div className="conv-header">
          <h1 className="conv-titulo"><FileText size={20} strokeWidth={2} /> Conversor de Aditivo</h1>
          <p className="conv-subtitulo">Importe o documento PDF para gerar o agendamento da O.S.</p>
        </div>

        <div
          className={`conv-dropzone ${dragOver ? 'over' : ''} ${processando ? 'loading' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDragEnd={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="conv-drop-card-glow"></div>
          {processando ? (
            <div className="conv-loader-wrapper">
              <LoadingOverlay small message="Lendo o PDF do aditivo..." />
            </div>
          ) : (
            <div className="conv-drop-inner">
              <div className="conv-drop-icon-wrapper">
                <FolderOpen size={48} strokeWidth={1.5} />
              </div>
              <p className="conv-drop-texto">Arraste o PDF do aditivo para cá</p>
              <span className="conv-drop-ou">ou</span>
              <button
                type="button"
                className="conv-btn-escolher"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Procurar no Computador
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="application/pdf" className="conv-input-hidden" onChange={handleFileChange} />
        </div>

        {erro && <p className="conv-erro">{erro}</p>}
      </div>
    )
  }

  // ---------------------------------------------------------------
  // RENDER — FORMULÁRIO
  // ---------------------------------------------------------------

  return (
    <div className="conv-page fade-in">
      <div className="conv-header">
        <div>
          <h1 className="conv-titulo"><FileText size={20} strokeWidth={2} /> Conversor de Aditivo</h1>
          <p className="conv-subtitulo">
            Contrato em edição: <span className="highlight-tag">{pdfData?.contrato}</span>
          </p>
        </div>
        <button className="conv-btn-voltar" onClick={resetar}>
          <ArrowLeft size={16} strokeWidth={2} /> Carregar outro PDF
        </button>
      </div>

      {erro && <p className="conv-erro">{erro}</p>}

      <div className="conv-grid">
        {/* CARD 1: DADOS GERAIS */}
        <div className="conv-card conv-card-full">
          <h2 className="conv-card-titulo"><User size={18} strokeWidth={2} /> Informações do Assinante</h2>
          
          <div className="conv-client-hero">
            <div className="conv-hero-item">
              <span className="conv-hero-label">Nome Completo</span>
              <span className="conv-hero-value">{pdfData?.nomeCompleto}</span>
            </div>
            <div className="conv-hero-item flex-sh">
              <span className="conv-hero-label">Contrato</span>
              <span className="conv-hero-value highlight">{pdfData?.contrato}</span>
            </div>
          </div>

          <div className="conv-inline">
            <div className="conv-grupo">
              <label htmlFor="conv-old-address"><MapPin size={16} strokeWidth={2} /> Endereço Antigo (Origem)</label>
              <input 
                id="conv-old-address" 
                name="oldAddress" 
                type="text" 
                value={oldAddress} 
                onChange={(e) => setOldAddress(e.target.value)} 
              />
            </div>
            <div className="conv-grupo">
              <label htmlFor="conv-new-address"><Flag size={16} strokeWidth={2} /> Endereço Novo (Destino)</label>
              <input 
                id="conv-new-address" 
                name="newAddress" 
                type="text" 
                value={newAddress} 
                onChange={(e) => setNewAddress(e.target.value)} 
              />
            </div>
          </div>

          <div className="conv-inline">
            <div className="conv-grupo">
              <label htmlFor="conv-phone"><Phone size={16} strokeWidth={2} /> Telefone de Contato</label>
              <input
                id="conv-phone"
                name="phone"
                type="text"
                placeholder="21 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => {
                  const { formatted } = formatPhone(phone)
                  setPhone(formatted)
                }}
              />
              {phoneErro && <span className="conv-campo-erro">{phoneErro}</span>}
            </div>
            
            <div className="conv-grupo">
              <label><Package size={16} strokeWidth={2} /> Modelo do Comodato</label>
              <div className="conv-chips-group">
                {([
                  { val: 'alcl', label: 'ALCL' },
                  { val: 'nbel', label: 'NBEL' },
                  { val: 'proprio', label: 'Próprio' },
                  { val: 'huawei', label: 'Huawei' },
                  { val: 'tp link', label: 'TP-Link' }
                ]).map((item) => (
                  <button
                    type="button"
                    key={item.val}
                    className={`conv-chip-btn ${equipamento === item.val ? 'active' : ''}`}
                    onClick={() => setEquipamento(item.val as Equipamento)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: CONDIÇÕES COMERCIAIS */}
        <div className="conv-card">
          <h2 className="conv-card-titulo"><CreditCard size={18} strokeWidth={2} /> Condições Comerciais</h2>

          <div className="conv-checkboxes">
            <label className="conv-checkbox">
              <input 
                id="conv-renovacao" 
                name="renovacao" 
                type="checkbox" 
                checked={renovacao} 
                onChange={(e) => handleRenovacao(e.target.checked)} 
                disabled={migracao} 
              />
              <span className="checkbox-box"></span>
              <span>É Renovação? <small>(Isento de taxa)</small></span>
            </label>
            <label className="conv-checkbox">
              <input 
                id="conv-migracao" 
                name="migracao" 
                type="checkbox" 
                checked={migracao} 
                onChange={(e) => handleMigracao(e.target.checked)} 
                disabled={renovacao} 
              />
              <span className="checkbox-box"></span>
              <span>É Migração? <small>(Isento de taxa)</small></span>
            </label>
          </div>

          {renovacao && <p className="conv-aviso-isento"><PartyPopper size={16} strokeWidth={2} /> Taxa isenta por renovação contratual.</p>}
          {migracao && <p className="conv-aviso-isento"><PartyPopper size={16} strokeWidth={2} /> Taxa isenta por migração de tecnologia.</p>}

          {migracao && (
            <div className="conv-grupo">
              <label htmlFor="conv-portador"><Landmark size={16} strokeWidth={2} /> Antigo Portador</label>
              <select 
                id="conv-portador" 
                name="portador" 
                value={portador} 
                onChange={(e) => setPortador(e.target.value as Portador)}
              >
                <option value="none">Nenhum</option>
                <option value="ITAU AGT">BANCO ITAÚ - AGATANGELO</option>
                <option value="GERENCIANET AGT">GERENCIANET - AGATANGELO</option>
                <option value="ITAU ATI">BANCO ITAU - ATI</option>
                <option value="GERENCIANET - BANDA LARGA">GERENCIANET - ATI BANDA LARGA</option>
              </select>
            </div>
          )}

          <div className="conv-grupo">
            <label><DollarSign size={16} strokeWidth={2} /> Valor da Taxa</label>
            <div className="conv-chips-group">
              {([
                { val: '100', label: 'R$ 100' },
                { val: '65', label: 'R$ 65' },
                { val: '50', label: 'R$ 50' },
                { val: 'isento', label: 'Isento' }
              ]).map((item) => (
                <button
                  type="button"
                  key={item.val}
                  className={`conv-chip-btn ${taxa === item.val ? 'active' : ''}`}
                  onClick={() => setTaxa(item.val as Taxa)}
                  disabled={isento}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="conv-grupo">
            <label><Pen size={16} strokeWidth={2} /> Assinatura do Contrato</label>
            <div className="conv-segment-control">
              <button 
                type="button"
                className={`conv-segment-btn ${assinatura === 'digital' ? 'active' : ''}`}
                onClick={() => setAssinatura('digital')}
              >
                Digital (Pendente)
              </button>
              <button 
                type="button"
                className={`conv-segment-btn ${assinatura === 'local' ? 'active' : ''}`}
                onClick={() => setAssinatura('local')}
              >
                No Local (Física)
              </button>
            </div>
          </div>
        </div>

        {/* CARD 3: AGENDAMENTO DE ROTA */}
        <div className="conv-card">
          <h2 className="conv-card-titulo">Agendamento de Rota</h2>

          <div className="conv-section-subtitle">
            <h3>Retirada do Equipamento</h3>
            <label className="conv-checkbox inline-check">
              <input 
                id="conv-cliente-retira" 
                name="clienteRetira" 
                type="checkbox" 
                checked={clienteRetira} 
                onChange={(e) => setClienteRetira(e.target.checked)} 
              />
              <span className="checkbox-box"></span>
              <span>Cliente leva para o local!</span>
            </label>
          </div>

          {!clienteRetira ? (
            <div className="conv-inline">
              <div className="conv-grupo">
                <label htmlFor="conv-retirada-data">Data</label>
                <input 
                  id="conv-retirada-data" 
                  name="retiradaData" 
                  type="date" 
                  value={retiradaData} 
                  min={getTomorrow()} 
                  onChange={(e) => setRetiradaData(e.target.value)} 
                />
              </div>
              <div className="conv-grupo">
                <label>Período</label>
                <div className="conv-segment-control">
                  <button
                    type="button"
                    className={`conv-segment-btn ${retiradaPeriodo === 'Manhã' ? 'active' : ''}`}
                    onClick={() => setRetiradaPeriodo('Manhã')}
                  >
                    Manhã
                  </button>
                  <button
                    type="button"
                    className={`conv-segment-btn ${retiradaPeriodo === 'Tarde' ? 'active' : ''}`}
                    onClick={() => setRetiradaPeriodo('Tarde')}
                  >
                    Tarde
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="conv-retirada-loja-aviso">
              O cliente se comprometeu a levar o equipamento antigo para o local!
            </div>
          )}

          <div className="conv-section-subtitle margin-top">
            <h3>Instalação no Novo Endereço</h3>
          </div>

          <div className="conv-inline">
            <div className="conv-grupo">
              <label htmlFor="conv-instalacao-data">Data</label>
              <input 
                id="conv-instalacao-data" 
                name="instalacaoData" 
                type="date" 
                value={instalacaoData} 
                min={minInstalacao} 
                onChange={(e) => setInstalacaoData(e.target.value)} 
              />
            </div>
            <div className="conv-grupo">
              <label>Período</label>
              <div className="conv-segment-control">
                <button
                  type="button"
                  className={`conv-segment-btn ${instalacaoPeriodo === 'Manhã' ? 'active' : ''}`}
                  onClick={() => setInstalacaoPeriodo('Manhã')}
                >
                    Manhã
                  </button>
                  <button
                    type="button"
                    className={`conv-segment-btn ${instalacaoPeriodo === 'Tarde' ? 'active' : ''}`}
                    onClick={() => setInstalacaoPeriodo('Tarde')}
                  >
                    Tarde
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GERAR O.S. */}
      <div className="conv-card conv-card-full conv-result-area">
        <button className="conv-btn-gerar" onClick={handleGerarOS}>
          Gerar Ordem de Serviço
        </button>

        {osGerada && (
          <div className="conv-result-section fade-in">
            <div className="conv-output-window">
              <div className="conv-output-window-header">
                <div className="conv-window-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <span className="conv-window-title">TEXTO DA O.S. (REALTIME DATABASE / SGP)</span>
              </div>
              <div className="conv-output-body">
                <textarea 
                  id="conv-output" 
                  name="osGerada" 
                  className="conv-output-textarea" 
                  value={osGerada} 
                  onChange={(e) => setOsGerada(e.target.value)} 
                  rows={8} 
                />
              </div>
            </div>

            <div className="conv-action-cards-grid">
              {osData?.withdrawal && (
                <div className="conv-action-card">
                  <div className="conv-action-info">
                    <h4>Retirada</h4>
                    <p className="truncated-code">{osData.withdrawal}</p>
                  </div>
                  <button 
                    type="button"
                    className={`conv-btn-action-copy ${copiado === 'retirada' ? 'success' : ''}`} 
                    onClick={() => handleCopiar('retirada')}
                  >
                    {copiado === 'retirada' ? <><Check size={14} strokeWidth={2} /> Copiar</> : <><ClipboardList size={14} strokeWidth={2} /> Copiar</>}
                  </button>
                </div>
              )}

              {osData?.installation && (
                <div className="conv-action-card">
                  <div className="conv-action-info">
                    <h4>Instalação</h4>
                    <p className="truncated-code">{osData.installation}</p>
                  </div>
                  <button 
                    type="button"
                    className={`conv-btn-action-copy ${copiado === 'instalacao' ? 'success' : ''}`} 
                    onClick={() => handleCopiar('instalacao')}
                  >
                    {copiado === 'instalacao' ? <><Check size={14} strokeWidth={2} /> Copiar</> : <><ClipboardList size={14} strokeWidth={2} /> Copiar</>}
                  </button>
                </div>
              )}

              {osData?.os && (
                <div className="conv-action-card highlight-card">
                  <div className="conv-action-info">
                    <h4>Texto da O.S.</h4>
                    <p className="truncated-code">{osData.os.substring(0, 50)}...</p>
                  </div>
                  <button 
                    type="button"
                    className={`conv-btn-action-copy principal ${copiado === 'os' ? 'success' : ''}`} 
                    onClick={() => handleCopiar('os')}
                  >
                    {copiado === 'os' ? <><Check size={14} strokeWidth={2} /> Copiado!</> : <><ClipboardList size={14} strokeWidth={2} /> Copiar Tudo</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
