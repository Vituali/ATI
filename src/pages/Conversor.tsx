// pages/Conversor.tsx
// ---------------------------------------------------------------
// Conversor de Aditivo — port fiel do conversor.js original.
// Extrai dados do PDF com pdfjs-dist e gera O.S. formatada.
// Google Maps removido por enquanto (será adicionado depois).
// ---------------------------------------------------------------

import { useState, useRef, useCallback } from "react";
import { useUser } from "../hooks/useUser";
import "./Conversor.css";

// ---------------------------------------------------------------
// INSTALA: npm install pdfjs-dist
// ---------------------------------------------------------------
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// ---------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------

interface PdfData {
  contrato: string;
  nomeCompleto: string;
  primeiroNome: string;
  oldAddress: string;
  newAddress: string;
}

interface OsTextData {
  withdrawal: string;
  installation: string;
  os: string;
}

type Periodo = "Manhã" | "Tarde";
type Equipamento = "alcl" | "nbel" | "proprio" | "huawei" | "tp link";
type Assinatura = "digital" | "local";
type Taxa = "100" | "65" | "50" | "isento";
type Portador =
  | "none"
  | "ITAU AGT"
  | "GERENCIANET AGT"
  | "ITAU ATI"
  | "GERENCIANET - BANDA LARGA";

// ---------------------------------------------------------------
// HELPERS — portados diretamente do conversor.js
// ---------------------------------------------------------------

function formatAddress(fullAddress: string): string {
  if (!fullAddress) return "N/A";
  const parts = fullAddress.split(",");
  if (parts.length < 3) return fullAddress;
  return parts.slice(0, 3).join(",").replace(",", " ").trim();
}

function formatPhone(phone: string): { formatted: string; isValid: boolean } {
  const cleaned = phone.replace(/\D/g, "");
  const isValid = /^[1-9]{2}(9?\d{8})$/.test(cleaned);
  let formatted = cleaned;
  if (isValid) {
    if (cleaned.length === 10)
      formatted = `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    else if (cleaned.length === 11)
      formatted = `${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return { formatted, isValid };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

async function copiar(texto: string): Promise<void> {
  await navigator.clipboard.writeText(texto);
}

// ---------------------------------------------------------------
// COMPONENTE
// ---------------------------------------------------------------

export default function Conversor() {
  const { user } = useUser();

  // Etapa: "upload" | "form"
  const [etapa, setEtapa] = useState<"upload" | "form">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  // Dados extraídos do PDF
  const [pdfData, setPdfData] = useState<PdfData | null>(null);

  // Campos editáveis
  const [oldAddress, setOldAddress] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneErro, setPhoneErro] = useState("");
  const [equipamento, setEquipamento] = useState<Equipamento>("alcl");
  const [assinatura, setAssinatura] = useState<Assinatura>("digital");
  const [taxa, setTaxa] = useState<Taxa>("100");
  const [renovacao, setRenovacao] = useState(false);
  const [migracao, setMigracao] = useState(false);
  const [portador, setPortador] = useState<Portador>("none");
  const [clienteRetira, setClienteRetira] = useState(false);
  const [retiradaData, setRetiradaData] = useState("");
  const [retiradaPeriodo, setRetiradaPeriodo] = useState<Periodo>("Manhã");
  const [instalacaoData, setInstalacaoData] = useState("");
  const [instalacaoPeriodo, setInstalacaoPeriodo] = useState<Periodo>("Manhã");

  // Output gerado
  const [osGerada, setOsGerada] = useState("");
  const [osData, setOsData] = useState<OsTextData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------
  // LÓGICA DE TAXA
  // ---------------------------------------------------------------

  const isento = renovacao || migracao;

  function handleRenovacao(v: boolean) {
    setRenovacao(v);
    if (v) {
      setMigracao(false);
      setTaxa("isento");
    } else {
      setTaxa("100");
    }
  }

  function handleMigracao(v: boolean) {
    setMigracao(v);
    if (v) {
      setRenovacao(false);
      setTaxa("isento");
    } else {
      setPortador("none");
      setTaxa("100");
    }
  }

  // Data mínima de instalação: dia seguinte ao da retirada (ou amanhã)
  const minInstalacao =
    !clienteRetira && retiradaData ? retiradaData : getTomorrow();

  // ---------------------------------------------------------------
  // PROCESSAR PDF — lógica portada do conversor.js
  // ---------------------------------------------------------------

  const processarPdf = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setErro("Por favor, selecione um arquivo PDF válido.");
      return;
    }

    setProcessando(true);
    setErro(null);

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(buffer).promise;
      const page = await pdf.getPage(1);
      const content = await page.getTextContent();
      const text = content.items.map((i: any) => i.str).join(" ");

      const contrato = text.match(/Aditivo do Contrato (\d+)/)?.[1] ?? "N/A";
      const nomeCompleto =
        text.match(/CONTRATADA e ([\s\S]*?),/)?.[1].trim() ?? "N/A";
      const primeiroNome = nomeCompleto.split(" ")[0].toUpperCase();

      const oldBlock = text.match(
        /2\s*-\s*Sobre o\(s\) antigo\(s\)[\s\S]*?instalação([\s\S]*?)3\s*-\s*Sobre/i,
      )?.[1];
      const newBlock = text.match(
        /3\s*-\s*Sobre o\(s\) novo\(s\)[\s\S]*?instalação([\s\S]*?)4\s*-\s*Gerais/i,
      )?.[1];
      const addrRegex = /([\s\S]+? \/ RJ\.)/g;
      const oldAddrs = oldBlock?.match(addrRegex);
      const newAddrs = newBlock?.match(addrRegex);

      const oldAddr =
        formatAddress(
          oldAddrs?.[oldAddrs.length - 1]?.trim().toUpperCase() ?? "",
        ) || "Endereço antigo não encontrado";
      const newAddr =
        formatAddress(
          newAddrs?.[newAddrs.length - 1]?.trim().toUpperCase() ?? "",
        ) || "Endereço novo não encontrado";

      const dados: PdfData = {
        contrato,
        nomeCompleto,
        primeiroNome,
        oldAddress: oldAddr,
        newAddress: newAddr,
      };

      setPdfData(dados);
      setOldAddress(oldAddr);
      setNewAddress(newAddr);
      setEtapa("form");
    } catch (e) {
      console.error(e);
      setErro("Erro ao ler o arquivo PDF.");
    } finally {
      setProcessando(false);
    }
  }, []);

  // ---------------------------------------------------------------
  // DROP ZONE
  // ---------------------------------------------------------------

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processarPdf(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processarPdf(file);
  }

  // ---------------------------------------------------------------
  // GERAR O.S. — lógica portada do conversor.js
  // ---------------------------------------------------------------

  function handleGerarOS() {
    if (!pdfData || !user) return;

    const tecnico = user.nomeCompleto.split(" ")[0].toUpperCase();
    const { formatted, isValid } = formatPhone(phone);

    if (!isValid) {
      setPhoneErro("Telefone inválido. Ex: 21 98765-4321");
      return;
    }
    setPhoneErro("");

    if (!clienteRetira && !retiradaData) {
      setErro("Data de Retirada é obrigatória.");
      return;
    }
    if (!instalacaoData) {
      setErro("Data de Instalação é obrigatória.");
      return;
    }
    setErro(null);

    const retDia = formatDate(retiradaData);
    const instDia = formatDate(instalacaoData);
    const retPer = retiradaPeriodo.toUpperCase();
    const instPer = instalacaoPeriodo.toUpperCase();
    const sigText =
      assinatura === "digital"
        ? "ASSINATURA DIGITAL PENDENTE"
        : "TITULAR NO LOCAL PARA ASSINATURA";

    let scheduleLines = "";
    let withdrawalText = "";

    const novaOsData: OsTextData = { withdrawal: "", installation: "", os: "" };

    if (!clienteRetira) {
      novaOsData.withdrawal = `${retDia} - ${pdfData.contrato} - ${pdfData.primeiroNome} - ${oldAddress} - MUD ENDEREÇO - ${retPer} - ${tecnico}`;
      scheduleLines += novaOsData.withdrawal + "\n";
      withdrawalText = `RETIRAR EM ${oldAddress} DIA ${retDia} ${retPer}`;
    } else {
      withdrawalText = "CLIENTE FEZ A RETIRADA";
    }

    novaOsData.installation = `${instDia} - ${pdfData.contrato} - ${pdfData.primeiroNome} - ${newAddress} - MUD ENDEREÇO - ${instPer} - ${tecnico}`;
    scheduleLines += novaOsData.installation;

    const taxaTexto = renovacao
      ? "ISENTO DA TAXA POR RENOVAÇÃO."
      : migracao
        ? "ISENTO DA TAXA POR MIGRAÇÃO."
        : taxa === "isento"
          ? "ISENTO DA TAXA."
          : `TAXA DE R$${taxa}.`;

    const portadorTexto =
      migracao && portador !== "none"
        ? `** ANTIGO PORTADOR ${portador.toUpperCase()} **\n`
        : "";

    novaOsData.os = `${portadorTexto}${formatted} ${pdfData.primeiroNome} | ** ${equipamento.toUpperCase()} **\n${withdrawalText}.\nINSTALAR EM ${newAddress} DIA ${instDia} ${instPer}.\n${taxaTexto}\n${sigText}.`;

    const textoFinal = `${scheduleLines}\n\n${novaOsData.os}`;

    setOsData(novaOsData);
    setOsGerada(textoFinal);
  }

  // ---------------------------------------------------------------
  // COPIAR COM FEEDBACK
  // ---------------------------------------------------------------

  async function handleCopiar(tipo: "retirada" | "instalacao" | "os") {
    if (!osData) return;
    const textos = {
      retirada: osData.withdrawal,
      instalacao: osData.installation,
      os: osData.os,
    };
    const texto = textos[tipo];
    if (!texto) return;
    await copiar(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
  }

  function resetar() {
    setEtapa("upload");
    setPdfData(null);
    setOldAddress("");
    setNewAddress("");
    setPhone("");
    setPhoneErro("");
    setEquipamento("alcl");
    setAssinatura("digital");
    setTaxa("100");
    setRenovacao(false);
    setMigracao(false);
    setPortador("none");
    setClienteRetira(false);
    setRetiradaData("");
    setInstalacaoData("");
    setOsGerada("");
    setOsData(null);
    setErro(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ---------------------------------------------------------------
  // RENDER — UPLOAD
  // ---------------------------------------------------------------

  if (etapa === "upload") {
    return (
      <div className="conv-page">
        <div className="conv-header">
          <h1 className="conv-titulo">📄 Conversor de Aditivo</h1>
          <p className="conv-subtitulo">
            Arraste e solte o PDF do aditivo para extrair os dados
            automaticamente.
          </p>
        </div>

        <div
          className={`conv-dropzone ${dragOver ? "over" : ""} ${processando ? "loading" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDragEnd={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="conv-drop-icon">{processando ? "⏳" : "📂"}</span>
          <p className="conv-drop-texto">
            {processando
              ? "Lendo o PDF..."
              : "Arraste e solte o arquivo PDF aqui"}
          </p>
          {!processando && <span className="conv-drop-ou">ou</span>}
          {!processando && (
            <button
              className="conv-btn-escolher"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Escolher Arquivo
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="conv-input-hidden"
            onChange={handleFileChange}
          />
        </div>

        {erro && <p className="conv-erro">{erro}</p>}
      </div>
    );
  }

  // ---------------------------------------------------------------
  // RENDER — FORMULÁRIO
  // ---------------------------------------------------------------

  return (
    <div className="conv-page">
      <div className="conv-header">
        <div>
          <h1 className="conv-titulo">📄 Conversor de Aditivo</h1>
          <p className="conv-subtitulo">
            Agendamento para Contrato — <strong>{pdfData?.contrato}</strong>
          </p>
        </div>
        <button className="conv-btn-voltar" onClick={resetar}>
          ← Novo PDF
        </button>
      </div>

      {erro && <p className="conv-erro">{erro}</p>}

      <div className="conv-grid">
        {/* DADOS GERAIS */}
        <div className="conv-card conv-card-full">
          <h2 className="conv-card-titulo">Dados Gerais</h2>

          <div className="conv-inline">
            <div
              className="conv-info-row"
              style={{ border: "none", padding: 0 }}
            >
              <span className="conv-info-label">Contrato</span>
              <span className="conv-info-valor">{pdfData?.contrato}</span>
            </div>
            <div
              className="conv-info-row"
              style={{ border: "none", padding: 0 }}
            >
              <span className="conv-info-label">Nome</span>
              <span className="conv-info-valor">{pdfData?.nomeCompleto}</span>
            </div>
          </div>

          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--border-subtle)",
              margin: "0",
            }}
          />

          <div className="conv-inline">
            <div className="conv-grupo">
              <label htmlFor="conv-old-address">Endereço Antigo (Origem)</label>
              <input
                id="conv-old-address"
                name="oldAddress"
                type="text"
                value={oldAddress}
                onChange={(e) => setOldAddress(e.target.value)}
              />
            </div>
            <div className="conv-grupo">
              <label htmlFor="conv-new-address">Endereço Novo (Destino)</label>
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
              <label htmlFor="conv-phone">Telefone</label>
              <input
                id="conv-phone"
                name="phone"
                type="text"
                placeholder="21 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => {
                  const { formatted } = formatPhone(phone);
                  setPhone(formatted);
                }}
              />
              {phoneErro && (
                <span className="conv-campo-erro">{phoneErro}</span>
              )}
            </div>
            <div className="conv-grupo">
              <label htmlFor="conv-equipamento">Comodato</label>
              <select
                id="conv-equipamento"
                name="equipamento"
                value={equipamento}
                onChange={(e) => setEquipamento(e.target.value as Equipamento)}
              >
                <option value="alcl">ALCL</option>
                <option value="nbel">NBEL</option>
                <option value="proprio">FIBERHOME + PROPRIO</option>
                <option value="huawei">FIBERHOME + HUAWEI</option>
                <option value="tp link">FIBERHOME + TP LINK</option>
              </select>
            </div>
          </div>
        </div>

        {/* DETALHES DO CONTRATO */}
        <div className="conv-card">
          <h2 className="conv-card-titulo">Detalhes do Contrato</h2>

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
              <span>É Renovação? (Isento)</span>
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
              <span>É Migração? (Isento)</span>
            </label>
          </div>

          {renovacao && (
            <p className="conv-aviso-isento">✅ Taxa isenta por renovação.</p>
          )}
          {migracao && (
            <p className="conv-aviso-isento">✅ Taxa isenta por migração.</p>
          )}

          {migracao && (
            <div className="conv-grupo">
              <label htmlFor="conv-portador">Antigo Portador</label>
              <select
                id="conv-portador"
                name="portador"
                value={portador}
                onChange={(e) => setPortador(e.target.value as Portador)}
              >
                <option value="none">Nenhum</option>
                <option value="ITAU AGT">BANCO ITAÚ - AGANTANGELO</option>
                <option value="GERENCIANET AGT">
                  GERENCIANET - AGATANGELO
                </option>
                <option value="ITAU ATI">BANCO ITAU - ATI</option>
                <option value="GERENCIANET - BANDA LARGA">
                  GERENCIANET - ATI BANDA LARGA
                </option>
              </select>
            </div>
          )}

          <div className="conv-inline">
            <div className="conv-grupo">
              <label htmlFor="conv-taxa">Valor da Taxa</label>
              <select
                id="conv-taxa"
                name="taxa"
                value={taxa}
                onChange={(e) => setTaxa(e.target.value as Taxa)}
                disabled={isento}
              >
                <option value="100">R$ 100</option>
                <option value="65">R$ 65</option>
                <option value="50">R$ 50</option>
                <option value="isento">Isento</option>
              </select>
            </div>
            <div className="conv-grupo">
              <label htmlFor="conv-assinatura">Assinatura</label>
              <select
                id="conv-assinatura"
                name="assinatura"
                value={assinatura}
                onChange={(e) => setAssinatura(e.target.value as Assinatura)}
              >
                <option value="digital">Assinatura Digital</option>
                <option value="local">Assinatura no Local</option>
              </select>
            </div>
          </div>
        </div>

        {/* RETIRADA E INSTALAÇÃO */}
        <div className="conv-card">
          <h2 className="conv-card-titulo">Retirada & Instalação</h2>

          <h3
            style={{
              fontSize: "14px",
              color: "var(--text-white)",
              margin: "4px 0 0 0",
              fontWeight: 600,
            }}
          >
            Retirada
          </h3>
          <label className="conv-checkbox">
            <input
              id="conv-cliente-retira"
              name="clienteRetira"
              type="checkbox"
              checked={clienteRetira}
              onChange={(e) => setClienteRetira(e.target.checked)}
            />
            <span>Cliente faz a retirada</span>
          </label>

          {!clienteRetira && (
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
                <label htmlFor="conv-retirada-periodo">Período</label>
                <select
                  id="conv-retirada-periodo"
                  name="retiradaPeriodo"
                  value={retiradaPeriodo}
                  onChange={(e) =>
                    setRetiradaPeriodo(e.target.value as Periodo)
                  }
                >
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                </select>
              </div>
            </div>
          )}

          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--border-subtle)",
              margin: "4px 0",
            }}
          />

          <h3
            style={{
              fontSize: "14px",
              color: "var(--text-white)",
              margin: "0",
              fontWeight: 600,
            }}
          >
            Instalação
          </h3>
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
              <label htmlFor="conv-instalacao-periodo">Período</label>
              <select
                id="conv-instalacao-periodo"
                name="instalacaoPeriodo"
                value={instalacaoPeriodo}
                onChange={(e) =>
                  setInstalacaoPeriodo(e.target.value as Periodo)
                }
              >
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* GERAR O.S. */}
      <div className="conv-card conv-card-full">
        <button className="conv-btn-gerar" onClick={handleGerarOS}>
          ⚙️ Gerar O.S.
        </button>

        {osGerada && (
          <>
            <textarea
              id="conv-output"
              name="osGerada"
              className="conv-output"
              value={osGerada}
              onChange={(e) => setOsGerada(e.target.value)}
              rows={10}
            />
            <div className="conv-copiar-acoes">
              {osData?.withdrawal && (
                <button
                  className="conv-btn-copiar"
                  onClick={() => handleCopiar("retirada")}
                >
                  {copiado === "retirada"
                    ? "✅ Copiado!"
                    : "📋 Copiar Retirada"}
                </button>
              )}
              <button
                className="conv-btn-copiar"
                onClick={() => handleCopiar("instalacao")}
              >
                {copiado === "instalacao"
                  ? "✅ Copiado!"
                  : "📋 Copiar Instalação"}
              </button>
              <button
                className="conv-btn-copiar principal"
                onClick={() => handleCopiar("os")}
              >
                {copiado === "os" ? "✅ Copiado!" : "📋 Copiar O.S."}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
