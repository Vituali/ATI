// pages/Senhas.tsx
// ---------------------------------------------------------------
// Senhas e acessos rápidos — dados estáticos do site original.
// Clique em qualquer valor para copiar para a área de transferência.
// ---------------------------------------------------------------

import { useState } from "react";
import "./Senhas.css";

// ---------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------

interface Credencial {
  label: string;
  valor: string;
  link?:  string; // se tiver link, o label vira âncora
}

interface GrupoSenha {
  titulo:      string;
  icon:        string;
  credenciais: Credencial[];
}

// ---------------------------------------------------------------
// DADOS — extraídos do site original
// ---------------------------------------------------------------

const GRUPOS: GrupoSenha[] = [
  {
    titulo: "ALCL OLT NOKIA",
    icon:   "🔴",
    credenciais: [
      { label: "LOGIN", valor: "ATI-GPON"           },
      { label: "SENHA", valor: "@adminATI26422001"   },
    ],
  },
  {
    titulo: "ALCL OLT FIBER",
    icon:   "🟠",
    credenciais: [
      { label: "LOGIN",             valor: "AdminGPON"   },
      { label: "SENHA",             valor: "adminati2001" },
      { label: "LOGIN (fábrica)",   valor: "AdminGPON"   },
      { label: "SENHA (fábrica)",   valor: "ALC#FGU"     },
    ],
  },
  {
    titulo: "NBEL",
    icon:   "🟡",
    credenciais: [
      { label: "ENDEREÇO",          valor: "IP/login.cgi"   },
      { label: "LOGIN",             valor: "atiinternet"    },
      { label: "SENHA",             valor: "@dminati2001"   },
      { label: "LOGIN (alt)",       valor: "telecomadmin"   },
      { label: "SENHA (alt)",       valor: "admintelecom"   },
    ],
  },
  {
    titulo: "HUAWEI & TP LINK",
    icon:   "🔵",
    credenciais: [
      { label: "IP HUAWEI",         valor: "192.168.3.1"    },
      { label: "IP TP LINK",        valor: "192.168.0.1"    },
      { label: "SENHA",             valor: "atiadmin258963" },
      { label: "SENHA (alt)",       valor: "ATIADMIN258963" },
    ],
  },
  {
    titulo: "URA",
    icon:   "📞",
    credenciais: [
      { label: "ACESSO", valor: "http://201.158.20.39:8022/login", link: "http://201.158.20.39:8022/login" },
      { label: "LOGIN",  valor: "christian"                        },
      { label: "SENHA",  valor: "@Ati26422001!10547580770"         },
    ],
  },
];

const SITES: Credencial[] = [
  { label: "Autentique",   valor: "https://painel.autentique.com.br/documentos/todos", link: "https://painel.autentique.com.br/documentos/todos" },
  { label: "ACS",          valor: "http://201.158.20.46:3000/",                        link: "http://201.158.20.46:3000/"                        },
  { label: "Curso",        valor: "https://atiinternet.cademi.com.br/area/vitrine",    link: "https://atiinternet.cademi.com.br/area/vitrine"    },
  { label: "SGP interno",  valor: "http://201.158.20.35:8000/",                        link: "http://201.158.20.35:8000/"                        },
  { label: "SGP externo",  valor: "https://sgp.atiinternet.com.br/admin/",             link: "https://sgp.atiinternet.com.br/admin/"             },
];

// ---------------------------------------------------------------
// COMPONENTE DE ITEM COPIÁVEL
// ---------------------------------------------------------------

interface ItemCopiavel {
  label: string;
  valor: string;
  link?:  string;
}

function ItemCopiavel({ label, valor, link }: ItemCopiavel) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback silencioso
    }
  }

  return (
    <div className="senha-item">
      <span className="senha-label">{label}</span>
      <div className="senha-valor-wrapper">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="senha-valor link"
          >
            {label}
          </a>
        ) : (
          <span
            className={`senha-valor copiavel ${copiado ? "copiado" : ""}`}
            onClick={handleCopiar}
            title="Clique para copiar"
          >
            {copiado ? "✅ Copiado!" : valor}
          </span>
        )}
        {!link && (
          <button
            className="senha-copiar-btn"
            onClick={handleCopiar}
            title="Copiar"
          >
            {copiado ? "✅" : "📋"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// PÁGINA PRINCIPAL
// ---------------------------------------------------------------

export default function Senhas() {
  return (
    <div className="senhas-page">

      <div className="senhas-header">
        <h1 className="senhas-titulo">🔑 Senhas de Equipamentos</h1>
        <p className="senhas-subtitulo">Acesso rápido aos logins e senhas. Clique para copiar.</p>
      </div>

      {/* Grid de equipamentos */}
      <div className="senhas-grid">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="senhas-card">
            <h3 className="senhas-card-titulo">
              <span>{grupo.icon}</span> {grupo.titulo}
            </h3>
            <div className="senhas-lista">
              {grupo.credenciais.map((cred, i) => (
                <ItemCopiavel
                  key={i}
                  label={cred.label}
                  valor={cred.valor}
                  link={cred.link}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Card de sites importantes */}
        <div className="senhas-card">
          <h3 className="senhas-card-titulo">
            <span>🌐</span> Sites Importantes
          </h3>
          <div className="senhas-lista">
            {SITES.map((site, i) => (
              <div key={i} className="senha-item">
                <a
                  href={site.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="senha-site-link"
                >
                  {site.label} ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
